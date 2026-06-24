package com.doan.reviewhub.service;

import com.doan.reviewhub.entity.TransportOperator;
import com.doan.reviewhub.repository.TransportOperatorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewSyncService {

    private final TransportOperatorRepository operatorRepository;

    @Value("${review.sync.scripts-dir:}")
    private String scriptsDir;

    @Value("${review.sync.python-path:python}")
    private String pythonPath;

    /**
     * Gọi từ partner (không có email).
     */
    public SyncResult syncReviewsForOperator(String operatorCode, String ownerPartnerCode) {
        return syncReviewsForOperator(operatorCode, ownerPartnerCode, null);
    }

    /**
     * Luồng đầy đủ:
     * 1. Tìm tên nhà xe theo operatorCode trong DB
     * 2. Chạy: python crawl_google_maps_reviews_to_txt.py "nhà xe <tên nhà xe>"
     * 3. Chạy: node import_reviews_from_txt.js
     * 4. (Tuỳ chọn) Chạy: node fix_account.js <partnerEmail> <operatorName>
     * 5. Trả về kết quả
     */
    public SyncResult syncReviewsForOperator(String operatorCode, String ownerPartnerCode, String partnerEmail) {
        if (operatorCode == null || operatorCode.isBlank()) {
            return SyncResult.error("Tài khoản chưa được gán nhà xe.");
        }

        File dir = resolveScriptsDir();
        if (dir == null || !dir.exists()) {
            return SyncResult.error("Không tìm thấy thư mục scripts. Kiểm tra cấu hình review.sync.scripts-dir.");
        }

        // Lấy tên nhà xe từ DB
        Optional<TransportOperator> opOpt = operatorRepository.findByOperatorCode(operatorCode);
        String operatorName = opOpt.map(TransportOperator::getOperatorName).orElse(operatorCode);

        log.info("[SyncReview] Bắt đầu crawl Google Maps cho: {} ({})", operatorName, operatorCode);

        // ── BƯỚC 1: Crawl Google Maps ──────────────────────────────────
        String crawlKeyword = "nhà xe " + operatorName;
        SyncResult crawlResult = runProcess(dir, pythonPath, "crawl_google_maps_reviews_to_txt.py", crawlKeyword);
        if (!crawlResult.success()) {
            return SyncResult.error("Lỗi crawl Google Maps: " + crawlResult.message());
        }
        log.info("[SyncReview] Crawl xong. Output:\n{}", crawlResult.message());

        // ── BƯỚC 2: Import vào Neon PostgreSQL ────────────────────────
        SyncResult importResult = runProcess(dir, "node", "import_reviews_from_txt.js");
        if (!importResult.success()) {
            return SyncResult.error("Lỗi import database: " + importResult.message());
        }
        log.info("[SyncReview] Import xong. Output:\n{}", importResult.message());

        // ── BƯỚC 3 (tuỳ chọn): Gán partner account vào nhà xe ────────
        if (partnerEmail != null && !partnerEmail.isBlank()) {
            log.info("[SyncReview] Gán account {} vào nhà xe {}", partnerEmail, operatorName);
            SyncResult fixResult = runProcess(dir, "node", "fix_account.js", partnerEmail, operatorName);
            if (!fixResult.success()) {
                log.warn("[SyncReview] fix_account.js lỗi: {}", fixResult.message());
                // Không return lỗi — crawl+import đã xong, chỉ cảnh báo
            } else {
                log.info("[SyncReview] fix_account.js xong. Output:\n{}", fixResult.message());
            }
        }

        // Đếm số dòng "Inserted" hoặc "Updated" trong output để báo cáo
        long count = importResult.message().lines()
                .filter(l -> l.contains("Inserted") || l.contains("Updated") || l.contains("✓"))
                .count();

        String msg = String.format(
                "Đồng bộ thành công %d review từ Google Maps cho nhà xe %s (%s).",
                count, operatorName, operatorCode
        );
        return SyncResult.ok((int) count, 0, 0, msg);
    }

    // ─── helpers ──────────────────────────────────────────────────────

    private SyncResult runProcess(File workDir, String... command) {
        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(workDir);
            pb.redirectErrorStream(true); // merge stderr vào stdout
            pb.environment().putIfAbsent("PATH",
                    System.getenv("PATH") + File.pathSeparator + "C:\\Python312" + File.pathSeparator +
                    "C:\\Python311" + File.pathSeparator + "C:\\Python310" + File.pathSeparator +
                    "C:\\Users\\" + System.getProperty("user.name") + "\\AppData\\Local\\Programs\\Python\\Python312" +
                    File.pathSeparator + "C:\\Program Files\\nodejs"
            );
            pb.environment().put("PYTHONIOENCODING", "utf-8");
            pb.environment().put("PYTHONLEGACYWINDOWSSTDIO", "0");

            Process process = pb.start();

            StringBuilder output = new StringBuilder();
            // Đọc output trong thread riêng để tránh deadlock khi buffer đầy
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), java.nio.charset.StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                    log.info("[SyncReview][{}] {}", command[0], line);
                }
            }

            boolean finished = process.waitFor(5, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                return SyncResult.error("Quá thời gian chờ (5 phút).");
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                return SyncResult.error("Tiến trình kết thúc với lỗi (exit " + exitCode + "):\n" + output);
            }

            return SyncResult.ok(0, 0, 0, output.toString());

        } catch (Exception e) {
            log.error("[SyncReview] Lỗi chạy lệnh {}: {}", command[0], e.getMessage());
            return SyncResult.error(e.getMessage());
        }
    }

    private File resolveScriptsDir() {
        if (scriptsDir != null && !scriptsDir.isBlank()) {
            return new File(scriptsDir);
        }
        // fallback relative paths
        String[] candidates = {
            "../../scripts",
            "../scripts",
            "scripts",
        };
        for (String c : candidates) {
            File f = new File(c);
            if (f.exists() && f.isDirectory()) return f;
        }
        return null;
    }

    // ─── result DTO ────────────────────────────────────────────────────

    public record SyncResult(boolean success, int inserted, int skipped, int failed, String message) {
        static SyncResult ok(int inserted, int skipped, int failed, String message) {
            return new SyncResult(true, inserted, skipped, failed, message);
        }
        static SyncResult error(String message) {
            return new SyncResult(false, 0, 0, 0, message);
        }
    }
}
