package com.doan.reviewhub.controller;

import com.doan.reviewhub.dto.ReviewDto;
import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @Value("${reviewhub.upload.frontend-public:frontend/public}")
    private String frontendPublicDir;

    @GetMapping
    public ResponseEntity<?> getReviews(
            Authentication authentication,
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "all") String category,
            @RequestParam(defaultValue = "all") String visibility,
            @RequestParam(defaultValue = "all") String sourceSystem,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size
    ) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn chưa đăng nhập."));
        }

        User currentUser = (User) authentication.getPrincipal();
        int safeSize = Math.max(1, Math.min(size, 1000));

        Page<ReviewDto> result = reviewService.getReviewsForPartner(
                currentUser.getPartnerCode(),
                currentUser.getAssignedOperatorCode(),
                currentUser.getId(),
                currentUser.getEmail(),
                keyword,
                category,
                visibility,
                sourceSystem,
                page,
                safeSize
        );

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReviewDto> getById(@PathVariable String id) {
        return reviewService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Gửi review mới.
     * - sourceSystem = public-web: khách ngoài trang public gửi, dữ liệu dùng chung theo mã dịch vụ.
     * - còn lại: partner gửi, dữ liệu riêng của đúng tài khoản partner.
     * Cả 2 đều vào AdminModerationPage trước, chưa hiện ngay.
     */
    @PostMapping
    public ResponseEntity<?> submitReview(
            Authentication authentication,
            @RequestBody Map<String, Object> body
    ) {
        String sourceSystem = readString(body, "sourceSystem", "source_system", "source");
        String dataScope = readString(body, "dataScope", "data_scope");
        String submitChannel = readString(body, "submitChannel", "submit_channel");
        String reviewScope = readString(body, "reviewScope", "review_scope");

        boolean isPublicSubmit = isPublicReviewSubmit(sourceSystem, dataScope, submitChannel, reviewScope);

        String targetCode = readString(body, "targetCode", "target_code", "operatorCode", "operator_code", "partnerCode", "partner_code");
        String targetName = readString(body, "targetName", "target_name", "operatorName", "operator_name", "partnerName", "partner_name");
        String category = readString(body, "category", "serviceCategory", "service_category");
        String reviewerName = readString(body, "reviewerName", "reviewer_name", "userName", "customerName", "authorName");
        Double rating = readDouble(body.get("rating"));
        String comment = readString(body, "comment", "content", "reviewText", "text");
        String visibility = readString(body, "visibility");

        if (isPublicSubmit) {
            ReviewDto created = reviewService.submitPublicReview(
                    targetCode,
                    targetName,
                    category,
                    reviewerName,
                    rating,
                    comment,
                    visibility,
                    submitChannel
            );

            return ResponseEntity.ok(created);
        }

        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn chưa đăng nhập."));
        }

        User currentUser = (User) authentication.getPrincipal();

        ReviewDto created = reviewService.submitReview(
                currentUser.getId(),
                currentUser.getEmail(),
                currentUser.getPartnerCode(),
                currentUser.getAssignedOperatorCode(),
                currentUser.getRole(),
                targetCode,
                targetName,
                category,
                reviewerName,
                rating,
                comment,
                visibility
        );

        return ResponseEntity.ok(created);
    }


    /**
     * Upload ảnh cho review partner vừa gửi.
     * Ảnh được lưu vào frontend/public/anhdanggia/<categoryFolder>/<operatorCode>/<imageFileName>
     * và đường dẫn ảnh được ghi vào raw_payload để AdminModerationPage hiển thị trước khi duyệt.
     */
    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadReviewImage(
            Authentication authentication,
            @PathVariable String id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String operatorCode,
            @RequestParam(required = false) String categoryFolder,
            @RequestParam(required = false) String imageFileName,
            @RequestParam(required = false) String publicPath
    ) {
        if (authentication == null || authentication.getPrincipal() == null) {
            // Khách public có thể upload ảnh cho review public-web vừa tạo.
            // Partner private vẫn cần token đăng nhập.
            if (!reviewService.isPublicWebReview(id)) {
                return ResponseEntity.status(401).body(Map.of("message", "Bạn chưa đăng nhập."));
            }
        }

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn ảnh đánh giá."));
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("message", "File upload phải là ảnh."));
        }

        try {
            String safeOperatorCode = sanitizeSegment(firstNonBlank(operatorCode, extractOperatorCodeFromReviewId(id), "UNKNOWN"));
            String safeCategoryFolder = sanitizeSegment(firstNonBlank(categoryFolder, "nhaxe")).toLowerCase();

            String tempImageFileName = sanitizeFileName(firstNonBlank(imageFileName, extractImageFileNameFromReviewId(id), id + ".webp"));
            if (!tempImageFileName.toLowerCase().endsWith(".webp")) {
                tempImageFileName = tempImageFileName.replaceAll("\\.[^.]+$", "") + ".webp";
            }
            final String safeImageFileName = tempImageFileName;

            Path uploadRoot = Paths.get(frontendPublicDir).toAbsolutePath().normalize();
            Path targetDir = uploadRoot.resolve(Paths.get("anhdanggia", safeCategoryFolder, safeOperatorCode)).normalize();

            if (!targetDir.startsWith(uploadRoot)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Đường dẫn ảnh không hợp lệ."));
            }

            Files.createDirectories(targetDir);
            Path targetFile = targetDir.resolve(safeImageFileName).normalize();
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);

            String finalPublicPath = firstNonBlank(
                    publicPath,
                    "/anhdanggia/" + safeCategoryFolder + "/" + safeOperatorCode + "/" + safeImageFileName
            );

            return reviewService.attachImageToReview(
                            id,
                            finalPublicPath,
                            safeImageFileName,
                            safeOperatorCode,
                            safeCategoryFolder,
                            file.getSize()
                    )
                    .<ResponseEntity<?>>map(dto -> ResponseEntity.ok(Map.of(
                            "success", true,
                            "review", dto,
                            "imageUrl", finalPublicPath,
                            "reviewImage", finalPublicPath,
                            "imageFileName", safeImageFileName,
                            "operatorCode", safeOperatorCode,
                            "categoryFolder", safeCategoryFolder
                    )))
                    .orElseGet(() -> ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy review để gắn ảnh.")));
        } catch (Exception error) {
            return ResponseEntity.status(500).body(Map.of(
                    "message", "Upload ảnh review thất bại.",
                    "detail", error.getMessage() == null ? "" : error.getMessage()
            ));
        }
    }

    private static String readString(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object value = body.get(key);
            if (value != null && !value.toString().isBlank()) return value.toString().trim();
        }
        return "";
    }

    private static Double readDouble(Object value) {
        if (value == null) return 0.0;
        try {
            return Double.parseDouble(value.toString());
        } catch (Exception ignored) {
            return 0.0;
        }
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "";
    }

    private static boolean isPublicReviewSubmit(String sourceSystem, String dataScope, String submitChannel, String reviewScope) {
        String source = normalizeKey(sourceSystem);
        String scope = normalizeKey(dataScope);
        String channel = normalizeKey(submitChannel);
        String review = normalizeKey(reviewScope);

        return source.equals("public-web")
                || source.equals("public")
                || source.equals("customer-web")
                || source.equals("user-web")
                || scope.equals("shared")
                || channel.equals("public-page")
                || review.equals("public-shared");
    }

    private static String normalizeKey(String value) {
        return value == null
                ? ""
                : value.trim().toLowerCase().replace("_", "-");
    }

    private static String extractOperatorCodeFromReviewId(String reviewId) {
        if (reviewId == null) return "";
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^([A-Za-z]{2}-\\d{3})-")
                .matcher(reviewId.trim());
        return matcher.find() ? matcher.group(1).toUpperCase() : "";
    }

    private static String extractImageFileNameFromReviewId(String reviewId) {
        if (reviewId == null) return "";
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^[A-Za-z]{2}-\\d{3}-(.+)$")
                .matcher(reviewId.trim());
        return matcher.find() ? matcher.group(1).replaceAll("\\.[^.]+$", "") + ".webp" : "";
    }

    private static String sanitizeSegment(String value) {
        String safe = value == null ? "" : value.trim();
        safe = safe.replaceAll("[^A-Za-z0-9_-]", "");
        return safe.isBlank() ? "UNKNOWN" : safe;
    }

    private static String sanitizeFileName(String value) {
        String safe = value == null ? "" : value.trim();
        safe = safe.replaceAll("[^A-Za-z0-9_.-]", "");
        return safe.isBlank() ? "review.webp" : safe;
    }

}
