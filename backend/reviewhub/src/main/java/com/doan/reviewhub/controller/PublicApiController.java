package com.doan.reviewhub.controller;

import com.doan.reviewhub.dto.ReviewDto;
import com.doan.reviewhub.entity.ApiUsageLog;
import com.doan.reviewhub.entity.Review;
import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.ApiUsageLogRepository;
import com.doan.reviewhub.repository.ReviewRepository;
import com.doan.reviewhub.repository.UserRepository;
import com.doan.reviewhub.service.ReviewService;
import com.doan.reviewhub.service.PartnerAIService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Locale;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.Map;

/**
 * Endpoint công khai – xác thực bằng X-Api-Key header thay vì JWT.
 * Mỗi lần gọi thành công sẽ trừ 1 quota của partner.
 *
 * Ví dụ:
 *   GET /api/v1/reviews?page=0&size=10&category=all&visibility=all&keyword=
 *   Header: X-Api-Key: rh_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PublicApiController {

    private final UserRepository        userRepository;
    private final ReviewRepository      reviewRepository;
    private final ReviewService         reviewService;
    private final PartnerAIService      partnerAIService;
    private final ApiUsageLogRepository apiUsageLogRepository;

    /* ─────────────────────────────────────────── helpers */

    private ResponseEntity<?> resolvePartner(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Thiếu X-Api-Key header."));
        }
        User partner = userRepository.findByApiKey(rawKey.trim()).orElse(null);
        if (partner == null) {
            return ResponseEntity.status(401).body(Map.of("error", "X-Api-Key không hợp lệ."));
        }
        if (!"partner".equals(partner.getRole()) && !"admin".equals(partner.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Tài khoản không phải partner."));
        }
        if (!"Đang hoạt động".equals(partner.getStatus())) {
            return ResponseEntity.status(403).body(Map.of("error", "Tài khoản đang bị khoá."));
        }
        return ResponseEntity.ok(partner); // trả partner object để caller dùng
    }


    private boolean canUseTargetCode(User partner, String targetCode) {
        if (partner == null || targetCode == null || targetCode.isBlank()) {
            return false;
        }

        if ("admin".equalsIgnoreCase(safe(partner.getRole()))) {
            return true;
        }

        List<String> allowedCodes = splitCodes(
                safe(partner.getAssignedOperatorCode()) + "," + safe(partner.getPartnerCode())
        );

        return allowedCodes.stream().anyMatch(code -> code.equalsIgnoreCase(targetCode));
    }

    private List<String> splitCodes(String value) {
        if (value == null || value.isBlank()) return List.of();

        return java.util.Arrays.stream(value.split("[\\s,;|]+"))
                .map(item -> item == null ? "" : item.trim().toUpperCase(Locale.ROOT))
                .filter(item -> !item.isBlank())
                .distinct()
                .toList();
    }

    private String safe(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String readText(Map<String, Object> map, String key, String fallback) {
        if (map == null) return fallback;
        Object value = map.get(key);
        String text = value == null ? "" : String.valueOf(value).trim();
        return text.isBlank() ? fallback : text;
    }

    private Double readRating(Map<String, Object> map) {
        if (map == null) return 0.0;

        Object value = map.get("rating");
        if (value == null) value = map.get("score");
        if (value == null) value = map.get("stars");

        try {
            double rating = Double.parseDouble(String.valueOf(value));
            return Math.max(0.0, Math.min(5.0, rating));
        } catch (Exception ignored) {
            return 0.0;
        }
    }


    private String makeExternalReviewId(String targetCode, String externalId) {
        String safeTarget = safe(targetCode).toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9-]", "");
        String safeExternal = safe(externalId).toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9-]", "");

        if (!safeExternal.isBlank()) {
            return safeTarget + "-EXT-" + safeExternal;
        }

        String randomPart = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);

        return safeTarget + "-EXT-" + randomPart;
    }

    private Instant readInstant(Map<String, Object> map) {
        if (map == null) return Instant.now();

        Object value = map.get("createdAt");
        if (value == null) value = map.get("created_at");

        try {
            String text = value == null ? "" : String.valueOf(value).trim();
            if (text.isBlank()) return Instant.now();
            return Instant.parse(text);
        } catch (Exception ignored) {
            return Instant.now();
        }
    }


    /* ─────────────────────────────────────────── GET /api/v1/reviews */

    @GetMapping("/reviews")
    @Transactional
    public ResponseEntity<?> getReviews(
            @RequestHeader(value = "X-Api-Key", required = false) String apiKey,
            @RequestParam(defaultValue = "")    String keyword,
            @RequestParam(defaultValue = "all") String category,
            @RequestParam(defaultValue = "all") String visibility,
            @RequestParam(defaultValue = "all") String sourceSystem,
            @RequestParam(defaultValue = "0")   int    page,
            @RequestParam(defaultValue = "10")  int    size
    ) {
        // 1. Xác thực API key
        ResponseEntity<?> check = resolvePartner(apiKey);
        if (!check.getStatusCode().is2xxSuccessful()) return check;
        User partner = (User) check.getBody();

        // 2. Kiểm tra quota
        int total = partner.getQuotaTotal() != null ? partner.getQuotaTotal() : 0;
        int used  = partner.getQuotaUsed()  != null ? partner.getQuotaUsed()  : 0;
        if (used >= total) {
            return ResponseEntity.status(429).body(Map.of(
                "error",      "Đã hết quota tháng này.",
                "quotaUsed",  used,
                "quotaTotal", total
            ));
        }

        // 3. Lấy dữ liệu
        Page<ReviewDto> result = reviewService.getReviewsForPartner(
                partner.getPartnerCode(),
                partner.getAssignedOperatorCode(),
                keyword, category, visibility, sourceSystem, page, size
        );

        // 4. Trừ 1 quota
        partner.setQuotaUsed(used + 1);
        partner.setUpdatedAt(Instant.now());
        userRepository.save(partner);

        // 4b. Lưu log
        apiUsageLogRepository.save(ApiUsageLog.builder()
                .partnerId(partner.getId())
                .partnerEmail(partner.getEmail())
                .endpoint("GET /api/v1/reviews")
                .status(200)
                .resultCount(result.getTotalElements())
                .calledAt(Instant.now())
                .build());

        // 5. Trả response kèm thông tin quota còn lại
        return ResponseEntity.ok(Map.of(
            "data",           result.getContent(),
            "totalElements",  result.getTotalElements(),
            "totalPages",     result.getTotalPages(),
            "page",           result.getNumber(),
            "size",           result.getSize(),
            "quotaUsed",      used + 1,
            "quotaTotal",     total,
            "quotaRemaining", total - used - 1
        ));
    }



    /* ───────────────────────────── POST /api/v1/external-reviews/import */

    /**
     * Nhận review từ website/CRM của đối tác.
     * Dùng khi đối tác muốn AI Summary đọc chính dữ liệu review của họ.
     */
    @PostMapping("/external-reviews/import")
    @Transactional
    public ResponseEntity<?> importExternalReviews(
            @RequestHeader(value = "X-Api-Key", required = false) String apiKey,
            @RequestBody Map<String, Object> body
    ) {
        ResponseEntity<?> check = resolvePartner(apiKey);
        if (!check.getStatusCode().is2xxSuccessful()) return check;

        User partner = (User) check.getBody();

        int total = partner.getQuotaTotal() != null ? partner.getQuotaTotal() : 0;
        int used = partner.getQuotaUsed() != null ? partner.getQuotaUsed() : 0;

        if (used >= total) {
            return ResponseEntity.status(429).body(Map.of(
                    "error", "Đã hết quota tháng này.",
                    "quotaUsed", used,
                    "quotaTotal", total
            ));
        }

        String targetCode = readText(body, "targetCode", "").toUpperCase(Locale.ROOT);
        String targetName = readText(body, "targetName", targetCode);
        String category = readText(body, "category", "Đối tác");
        String sourceName = readText(body, "sourceName", "website-doi-tac");

        if (targetCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng truyền targetCode."));
        }

        if (!canUseTargetCode(partner, targetCode)) {
            return ResponseEntity.status(403).body(Map.of(
                    "error", "Khóa API không có quyền gửi review cho mã dịch vụ này."
            ));
        }

        Object rawReviews = body.get("reviews");

        if (!(rawReviews instanceof List<?> reviews) || reviews.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Vui lòng gửi danh sách reviews."
            ));
        }

        int maxImport = Math.min(reviews.size(), 100);
        List<Review> records = new ArrayList<>();

        for (int index = 0; index < maxImport; index++) {
            Object item = reviews.get(index);
            if (!(item instanceof Map<?, ?> rawMap)) continue;

            Map<String, Object> reviewMap = new LinkedHashMap<>();
            rawMap.forEach((key, value) -> reviewMap.put(String.valueOf(key), value));

            String comment = readText(reviewMap, "comment", "");
            if (comment.isBlank()) {
                comment = readText(reviewMap, "content", "");
            }
            if (comment.isBlank()) {
                comment = readText(reviewMap, "reviewText", "");
            }

            String externalId = readText(reviewMap, "externalId", "");

            Map<String, Object> rawPayload = new LinkedHashMap<>();
            rawPayload.put("source", "partner-external");
            rawPayload.put("sourceSystem", "partner-external");
            rawPayload.put("sourceName", sourceName);
            rawPayload.put("externalReviewId", externalId);
            rawPayload.put("originalCreatedAt", readText(reviewMap, "createdAt", ""));

            records.add(Review.builder()
                    .id(makeExternalReviewId(targetCode, externalId))
                    .operatorCode(targetCode)
                    .targetCode(targetCode)
                    .targetName(targetName)
                    .category(category)
                    .reviewerName(readText(reviewMap, "reviewerName", "Khách hàng"))
                    .rating(readRating(reviewMap))
                    .comment(comment)
                    .visibility("public")
                    .sourceSystem("partner-external")
                    .moderationStatus("approved")
                    .ownerPartnerCode(partner.getId())
                    .rawPayload(rawPayload)
                    .createdAt(readInstant(reviewMap))
                    .build());
        }

        if (records.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Không có review hợp lệ để lưu."
            ));
        }

        List<Review> saved = reviewRepository.saveAll(records);

        partner.setQuotaUsed(used + 1);
        partner.setUpdatedAt(Instant.now());
        userRepository.save(partner);

        apiUsageLogRepository.save(ApiUsageLog.builder()
                .partnerId(partner.getId())
                .partnerEmail(partner.getEmail())
                .endpoint("POST /api/v1/external-reviews/import")
                .status(200)
                .resultCount((long) saved.size())
                .calledAt(Instant.now())
                .build());

        return ResponseEntity.ok(Map.of(
                "message", "Đã nhận review từ website đối tác.",
                "imported", saved.size(),
                "targetCode", targetCode,
                "targetName", targetName,
                "sourceSystem", "partner-external",
                "quotaUsed", used + 1,
                "quotaTotal", total,
                "quotaRemaining", total - used - 1
        ));
    }


    /* ───────────────────────────── GET /api/v1/ai/review-summary */

    /**
     * AI Summary API cho website đối tác / AI Embed.
     * Endpoint này không trả raw review, chỉ trả dữ liệu tổng hợp.
     */
    @GetMapping("/ai/review-summary")
    @Transactional
    public ResponseEntity<?> getAiReviewSummary(
            @RequestHeader(value = "X-Api-Key", required = false) String apiKey,
            @RequestParam(defaultValue = "") String targetCode
    ) {
        ResponseEntity<?> check = resolvePartner(apiKey);
        if (!check.getStatusCode().is2xxSuccessful()) return check;

        User partner = (User) check.getBody();

        int total = partner.getQuotaTotal() != null ? partner.getQuotaTotal() : 0;
        int used = partner.getQuotaUsed() != null ? partner.getQuotaUsed() : 0;

        if (used >= total) {
            return ResponseEntity.status(429).body(Map.of(
                    "error", "Đã hết quota tháng này.",
                    "quotaUsed", used,
                    "quotaTotal", total
            ));
        }

        try {
            Map<String, Object> summary = partnerAIService.buildEmbedReviewSummary(partner, targetCode);

            partner.setQuotaUsed(used + 1);
            partner.setUpdatedAt(Instant.now());
            userRepository.save(partner);

            Number count = summary.get("totalReviews") instanceof Number
                    ? (Number) summary.get("totalReviews")
                    : 0;

            apiUsageLogRepository.save(ApiUsageLog.builder()
                    .partnerId(partner.getId())
                    .partnerEmail(partner.getEmail())
                    .endpoint("GET /api/v1/ai/review-summary")
                    .status(200)
                    .resultCount(count.longValue())
                    .calledAt(Instant.now())
                    .build());

            return ResponseEntity.ok(Map.of(
                    "data", summary,
                    "quotaUsed", used + 1,
                    "quotaTotal", total,
                    "quotaRemaining", total - used - 1,
                    "publicAnswerOnly", true,
                    "rawDataReturned", false
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (SecurityException ex) {
            return ResponseEntity.status(403).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Không thể tạo AI Summary lúc này.",
                    "detail", ex.getMessage() == null ? "" : ex.getMessage()
            ));
        }
    }


    /* ───────────────────────────────────────────── GET /api/v1/usage-logs */

    @GetMapping("/usage-logs")
    public ResponseEntity<?> getUsageLogs(
            @RequestHeader(value = "X-Api-Key", required = false) String apiKey,
            @RequestParam(defaultValue = "20") int limit
    ) {
        ResponseEntity<?> check = resolvePartner(apiKey);
        if (!check.getStatusCode().is2xxSuccessful()) return check;
        User partner = (User) check.getBody();

        List<ApiUsageLog> logs = apiUsageLogRepository
                .findByPartnerIdOrderByCalledAtDesc(partner.getId(), PageRequest.of(0, Math.min(limit, 100)));

        List<Map<String, Object>> data = logs.stream().map(l -> Map.<String, Object>of(
                "id",          l.getId(),
                "calledAt",    l.getCalledAt().toString(),
                "endpoint",    l.getEndpoint(),
                "status",      l.getStatus(),
                "resultCount", l.getResultCount() != null ? l.getResultCount() : 0
        )).toList();

        return ResponseEntity.ok(Map.of("data", data, "total", data.size()));
    }
}
