package com.doan.reviewhub.service;

import com.doan.reviewhub.entity.Review;
import com.doan.reviewhub.repository.ReviewRepository;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PublicReviewCacheService {

    private final ReviewRepository reviewRepository;

    /*
     * Không inject ObjectMapper bằng Spring nữa.
     * Không dùng JavaTimeModule để tránh lỗi thiếu thư viện jackson-datatype-jsr310.
     */
    private final ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules();

    /*
     * Cache sẽ tự tạo trong thư mục chạy backend:
     * data/public-review-cache/nha-xe/PT-013.json
     */
    private final Path cacheRoot = Path.of("data", "public-review-cache");

    public ReviewCachePayload readCache(String serviceSlug, String targetCode) {
        String safeSlug = normalizeServiceSlug(serviceSlug, targetCode);
        String safeCode = firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT);

        if (safeCode.isBlank()) {
            return emptyPayload(safeSlug, safeCode);
        }

        Path path = resolveExistingCachePath(safeSlug, safeCode);

        if (path != null && Files.exists(path)) {
            try {
                return objectMapper.readValue(path.toFile(), ReviewCachePayload.class);
            } catch (Exception ex) {
                ex.printStackTrace();
                return emptyPayload(safeSlug, safeCode);
            }
        }

        ReviewCachePayload classpathPayload = readClasspathCache(safeSlug, safeCode);

        if (classpathPayload != null) {
            return classpathPayload;
        }

        return emptyPayload(safeSlug, safeCode);
    }


    public boolean cacheExists(String serviceSlug, String targetCode) {
        String safeSlug = normalizeServiceSlug(serviceSlug, targetCode);
        String safeCode = firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT);

        if (safeCode.isBlank()) return false;

        return resolveExistingCachePath(safeSlug, safeCode) != null || classpathCacheExists(safeSlug, safeCode);
    }


    /*
     * Dùng khi admin duyệt review.
     * Admin duyệt xong gọi hàm này là review tự được ghi vào cache.
     * Không cần chạy rebuild cache thủ công.
     */
    public synchronized void upsertApprovedReview(Review review) {
        if (review == null) return;

        List<String> targetCodes = getAllPossibleCodes(review);

        if (targetCodes.isEmpty()) {
            System.err.println("UPSERT PUBLIC CACHE SKIPPED: cannot detect service code for review " + getStringValue(review, "getId"));
            return;
        }

        for (String targetCode : targetCodes) {
            upsertApprovedReviewForTargetCode(review, targetCode);
        }
    }

    public synchronized ReviewCachePayload upsertApprovedReviewForTargetCode(Review review, String forcedTargetCode) {
        if (review == null) {
            return emptyPayload(normalizeServiceSlug("", forcedTargetCode), forcedTargetCode);
        }

        String targetCode = extractMainServiceCode(forcedTargetCode);

        if (targetCode.isBlank()) {
            targetCode = firstNonBlank(forcedTargetCode, "").toUpperCase(Locale.ROOT);
        }

        if (targetCode.isBlank()) {
            throw new IllegalArgumentException("Không xác định được targetCode để ghi cache.");
        }

        String serviceSlug = normalizeServiceSlug(
                firstNonBlank(
                        getStringValue(review, "getServiceSlug"),
                        getStringValue(review, "getServiceType"),
                        getStringValue(review, "getTargetType"),
                        getStringValue(review, "getReviewTargetType")
                ),
                targetCode
        );

        ReviewCachePayload payload = readCache(serviceSlug, targetCode);
        ReviewCacheItem newItem = toCacheItem(review, serviceSlug, targetCode);

        List<ReviewCacheItem> nextReviews = new ArrayList<>();
        boolean replaced = false;

        for (ReviewCacheItem item : payload.getReviews()) {
            if (Objects.equals(String.valueOf(item.getId()), String.valueOf(newItem.getId()))) {
                nextReviews.add(newItem);
                replaced = true;
            } else {
                nextReviews.add(item);
            }
        }

        if (!replaced) {
            nextReviews.add(0, newItem);
        }

        nextReviews = nextReviews.stream()
                .filter(this::isApprovedVisibleCacheItem)
                .sorted(Comparator.comparing(ReviewCacheItem::getCreatedAtSafe).reversed())
                .toList();

        ReviewCachePayload nextPayload = new ReviewCachePayload();
        nextPayload.setServiceSlug(serviceSlug);
        nextPayload.setTargetCode(targetCode.toUpperCase(Locale.ROOT));
        nextPayload.setTotal(nextReviews.size());
        nextPayload.setUpdatedAt(Instant.now().toString());
        nextPayload.setReviews(nextReviews);

        writeCache(nextPayload);

        return nextPayload;
    }

    /*
     * Dùng khi admin từ chối review.
     * Nếu review từng có trong cache thì xóa ra.
     */
    public synchronized void removeReviewFromCache(String serviceSlug, String targetCode, String reviewId) {
        String safeCode = firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT);

        if (safeCode.isBlank() || reviewId == null || reviewId.isBlank()) return;

        String safeSlug = normalizeServiceSlug(serviceSlug, safeCode);
        ReviewCachePayload payload = readCache(safeSlug, safeCode);

        List<ReviewCacheItem> nextReviews = payload.getReviews()
                .stream()
                .filter(item -> !Objects.equals(String.valueOf(item.getId()), String.valueOf(reviewId)))
                .sorted(Comparator.comparing(ReviewCacheItem::getCreatedAtSafe).reversed())
                .toList();

        ReviewCachePayload nextPayload = new ReviewCachePayload();
        nextPayload.setServiceSlug(safeSlug);
        nextPayload.setTargetCode(safeCode);
        nextPayload.setTotal(nextReviews.size());
        nextPayload.setUpdatedAt(Instant.now().toString());
        nextPayload.setReviews(nextReviews);

        writeCache(nextPayload);
    }

    /*
     * Dùng 1 lần ban đầu nếu muốn tạo cache từ DB cũ.
     * Sau này admin duyệt review thì cache tự cập nhật bằng upsertApprovedReview().
     */
    public synchronized ReviewCachePayload rebuild(String serviceSlug, String targetCode) {
        String safeCode = firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT);
        String safeSlug = normalizeServiceSlug(serviceSlug, safeCode);

        if (safeCode.isBlank()) {
            return emptyPayload(safeSlug, safeCode);
        }

        List<Review> allReviews = reviewRepository.findAll();

        List<ReviewCacheItem> items = allReviews.stream()
                .filter(review -> reviewBelongsToCode(review, safeCode))
                .filter(this::isApprovedVisibleReview)
                .map(review -> toCacheItem(review, safeSlug, safeCode))
                .sorted(Comparator.comparing(ReviewCacheItem::getCreatedAtSafe).reversed())
                .toList();

        ReviewCachePayload payload = new ReviewCachePayload();
        payload.setServiceSlug(safeSlug);
        payload.setTargetCode(safeCode);
        payload.setTotal(items.size());
        payload.setUpdatedAt(Instant.now().toString());
        payload.setReviews(items);

        writeCache(payload);

        return payload;
    }

    /*
     * Nếu muốn build toàn bộ cache từ DB một lần.
     */
    public synchronized Map<String, Object> rebuildAll() {
        List<Review> allReviews = reviewRepository.findAll();
        Map<String, List<Review>> grouped = new LinkedHashMap<>();

        for (Review review : allReviews) {
            if (!isApprovedVisibleReview(review)) continue;

            String targetCode = pickMainServiceCode(review);

            if (targetCode.isBlank()) continue;

            String serviceSlug = normalizeServiceSlug(
                    firstNonBlank(
                            getStringValue(review, "getServiceSlug"),
                            getStringValue(review, "getServiceType"),
                            getStringValue(review, "getTargetType"),
                            getStringValue(review, "getReviewTargetType")
                    ),
                    targetCode
            );

            String key = serviceSlug + "__" + targetCode;
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(review);
        }

        int fileCount = 0;
        int reviewCount = 0;

        for (Map.Entry<String, List<Review>> entry : grouped.entrySet()) {
            String[] parts = entry.getKey().split("__", 2);
            String serviceSlug = parts[0];
            String targetCode = parts[1];

            List<ReviewCacheItem> items = entry.getValue()
                    .stream()
                    .map(review -> toCacheItem(review, serviceSlug, targetCode))
                    .sorted(Comparator.comparing(ReviewCacheItem::getCreatedAtSafe).reversed())
                    .toList();

            ReviewCachePayload payload = new ReviewCachePayload();
            payload.setServiceSlug(serviceSlug);
            payload.setTargetCode(targetCode);
            payload.setTotal(items.size());
            payload.setUpdatedAt(Instant.now().toString());
            payload.setReviews(items);

            writeCache(payload);

            fileCount++;
            reviewCount += items.size();
        }

        return Map.of(
                "success", true,
                "fileCount", fileCount,
                "reviewCount", reviewCount,
                "message", "Đã rebuild public review cache."
        );
    }

    private boolean reviewBelongsToCode(Review review, String targetCode) {
        String extractedCode = extractMainServiceCode(targetCode);
        final String code = extractedCode.isBlank()
                ? firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT)
                : extractedCode;

        return getAllPossibleCodes(review)
                .stream()
                .anyMatch(value -> value.equals(code));
    }

    private boolean isApprovedVisibleReview(Review review) {
        String status = firstNonBlank(
                getStringValue(review, "getModerationStatus"),
                getStringValue(review, "getStatus"),
                getStringValue(review, "getReviewStatus")
        ).toLowerCase(Locale.ROOT);

        String source = firstNonBlank(
                getStringValue(review, "getSourceSystem"),
                getStringValue(review, "getSource")
        ).toLowerCase(Locale.ROOT);

        if (status.contains("reject") || status.contains("decline") || status.contains("refuse")) {
            return false;
        }

        /*
         * Review khách public/partner gửi phải approved mới hiện.
         * Google review cũ thiếu status thì vẫn cho hiện để không mất data cũ.
         */
        if (source.contains("public") || source.contains("partner")) {
            return status.contains("approved") || status.contains("public");
        }

        return true;
    }

    private boolean isApprovedVisibleCacheItem(ReviewCacheItem item) {
        String status = firstNonBlank(item.getModerationStatus(), "").toLowerCase(Locale.ROOT);
        String source = firstNonBlank(item.getSourceSystem(), "").toLowerCase(Locale.ROOT);

        if (status.contains("reject") || status.contains("decline") || status.contains("refuse")) {
            return false;
        }

        if (source.contains("public") || source.contains("partner")) {
            return status.contains("approved") || status.contains("public");
        }

        return true;
    }

    private ReviewCacheItem toCacheItem(Review review, String serviceSlug, String targetCode) {
        ReviewCacheItem item = new ReviewCacheItem();

        String id = firstNonBlank(
                getStringValue(review, "getId"),
                getStringValue(review, "getReviewId")
        );

        String reviewTargetCode = firstNonBlank(
                pickMainServiceCode(review),
                extractMainServiceCode(targetCode),
                targetCode
        );

        String targetName = firstNonBlank(
                getStringValue(review, "getTargetName"),
                getStringValue(review, "getOperatorName"),
                getStringValue(review, "getPartnerName")
        );

        String reviewerName = firstNonBlank(
                getStringValue(review, "getReviewerName"),
                getStringValue(review, "getUserName"),
                getStringValue(review, "getAuthorName"),
                "Hành khách ẩn danh"
        );

        String comment = firstNonBlank(
                getStringValue(review, "getComment"),
                getStringValue(review, "getContent"),
                getStringValue(review, "getReviewText"),
                getStringValue(review, "getText")
        );

        String createdAt = firstNonBlank(
                getStringValue(review, "getCreatedAt"),
                getStringValue(review, "getCreated_at"),
                getStringValue(review, "getReviewedAt"),
                getStringValue(review, "getUpdatedAt"),
                Instant.now().toString()
        );

        String moderationStatus = firstNonBlank(
                getStringValue(review, "getModerationStatus"),
                getStringValue(review, "getStatus"),
                "approved"
        );

        String sourceSystem = firstNonBlank(
                getStringValue(review, "getSourceSystem"),
                getStringValue(review, "getSource"),
                "google-maps"
        );

        String imageUrl = firstNonBlank(
                getStringValue(review, "getImageUrl"),
                getStringValue(review, "getReviewImage"),
                getStringValue(review, "getPhotoUrl")
        );

        String imageFileName = firstNonBlank(
                getStringValue(review, "getImageFileName"),
                getStringValue(review, "getImageName")
        );

        String finalCode = firstNonBlank(extractMainServiceCode(targetCode), targetCode, reviewTargetCode).toUpperCase(Locale.ROOT);
        String finalServiceSlug = normalizeServiceSlug(serviceSlug, finalCode);

        item.setId(id);
        item.setServiceSlug(finalServiceSlug);
        item.setServiceCategory(serviceNameFromSlug(finalServiceSlug));
        item.setTargetCode(finalCode);
        item.setOperatorCode(finalCode);
        item.setPartnerCode(firstNonBlank(getStringValue(review, "getOwnerPartnerCode"), finalCode).toUpperCase(Locale.ROOT));
        item.setTargetName(targetName);
        item.setOperatorName(targetName);
        item.setReviewerName(reviewerName);
        item.setRating(getDoubleValue(review, "getRating"));
        item.setComment(comment);
        item.setCreatedAt(createdAt);
        item.setVisibility("public");
        item.setModerationStatus(moderationStatus);
        item.setSourceSystem(sourceSystem);
        item.setImageUrl(imageUrl);
        item.setReviewImage(imageUrl);
        item.setImageFileName(imageFileName);

        return item;
    }

    private ReviewCachePayload emptyPayload(String serviceSlug, String targetCode) {
        ReviewCachePayload payload = new ReviewCachePayload();
        payload.setServiceSlug(normalizeServiceSlug(serviceSlug, targetCode));
        payload.setTargetCode(firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT));
        payload.setTotal(0);
        payload.setUpdatedAt(Instant.now().toString());
        payload.setReviews(new ArrayList<>());
        return payload;
    }

    private void writeCache(ReviewCachePayload payload) {
        try {
            Path path = cachePath(payload.getServiceSlug(), payload.getTargetCode());
            Files.createDirectories(path.getParent());

            Path tmp = path.resolveSibling(path.getFileName().toString() + ".tmp");

            objectMapper.writeValue(tmp.toFile(), payload);
            Files.move(tmp, path, StandardCopyOption.REPLACE_EXISTING);

            System.out.println("====================================");
            System.out.println("PUBLIC REVIEW CACHE WRITTEN");
            System.out.println("file = " + path.toAbsolutePath());
            System.out.println("total = " + payload.getTotal());
            System.out.println("====================================");
        } catch (IOException ex) {
            throw new RuntimeException("Không ghi được public review cache: " + ex.getMessage(), ex);
        }
    }

    private Path cachePath(String serviceSlug, String targetCode) {
        String safeSlug = safeFileName(normalizeServiceSlug(serviceSlug, targetCode));
        String safeCode = safeFileName(firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT));

        return cacheRoot.resolve(safeSlug).resolve(safeCode + ".json");
    }

    private Path resolveExistingCachePath(String serviceSlug, String targetCode) {
        String safeSlug = safeFileName(normalizeServiceSlug(serviceSlug, targetCode));
        String safeCode = safeFileName(firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT));

        if (safeCode.isBlank() || "unknown".equals(safeCode)) {
            return null;
        }

        String fileName = safeCode + ".json";
        String userDir = System.getProperty("user.dir", "");

        List<Path> candidates = new ArrayList<>();

        /*
         * Cho phép cấu hình trực tiếp trên Render:
         * REVIEWHUB_PUBLIC_CACHE_DIR=backend/reviewhub/data/public-review-cache
         * hoặc REVIEWHUB_PUBLIC_CACHE_DIR=data/public-review-cache
         */
        String envCacheDir = firstNonBlank(
                System.getenv("REVIEWHUB_PUBLIC_CACHE_DIR"),
                System.getProperty("REVIEWHUB_PUBLIC_CACHE_DIR")
        );

        if (!envCacheDir.isBlank()) {
            Path envPath = Path.of(envCacheDir);
            candidates.add(envPath.resolve(safeSlug).resolve(fileName));

            if (!envPath.isAbsolute()) {
                candidates.add(Path.of(userDir).resolve(envPath).resolve(safeSlug).resolve(fileName));
            }
        }

        /*
         * Root chạy là backend/reviewhub:
         * data/public-review-cache/nha-xe/PT-034.json
         */
        candidates.add(cacheRoot.resolve(safeSlug).resolve(fileName));
        candidates.add(Path.of(userDir, "data", "public-review-cache", safeSlug, fileName));

        /*
         * Root chạy là thư mục repo:
         * backend/reviewhub/data/public-review-cache/nha-xe/PT-034.json
         */
        candidates.add(Path.of("backend", "reviewhub", "data", "public-review-cache", safeSlug, fileName));
        candidates.add(Path.of(userDir, "backend", "reviewhub", "data", "public-review-cache", safeSlug, fileName));

        /*
         * Nếu đã copy vào resources để đóng gói cùng jar thì local vẫn đọc được bằng file path.
         * Khi chạy jar, readClasspathCache() bên dưới sẽ đọc bằng classpath.
         */
        candidates.add(Path.of("src", "main", "resources", "public-review-cache", safeSlug, fileName));
        candidates.add(Path.of(userDir, "src", "main", "resources", "public-review-cache", safeSlug, fileName));
        candidates.add(Path.of("backend", "reviewhub", "src", "main", "resources", "public-review-cache", safeSlug, fileName));
        candidates.add(Path.of(userDir, "backend", "reviewhub", "src", "main", "resources", "public-review-cache", safeSlug, fileName));

        for (Path candidate : candidates) {
            if (candidate != null && Files.exists(candidate)) {
                return candidate;
            }
        }

        System.err.println("PUBLIC REVIEW CACHE MISS: " + safeSlug + "/" + fileName + " | user.dir=" + userDir);

        return null;
    }

    private boolean classpathCacheExists(String serviceSlug, String targetCode) {
        String resourcePath = classpathResourcePath(serviceSlug, targetCode);

        if (resourcePath.isBlank()) {
            return false;
        }

        try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream(resourcePath)) {
            return inputStream != null;
        } catch (Exception ignored) {
            return false;
        }
    }

    private ReviewCachePayload readClasspathCache(String serviceSlug, String targetCode) {
        String resourcePath = classpathResourcePath(serviceSlug, targetCode);

        if (resourcePath.isBlank()) {
            return null;
        }

        try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream(resourcePath)) {
            if (inputStream == null) {
                return null;
            }

            return objectMapper.readValue(inputStream, ReviewCachePayload.class);
        } catch (Exception ex) {
            ex.printStackTrace();
            return null;
        }
    }

    private String classpathResourcePath(String serviceSlug, String targetCode) {
        String safeSlug = safeFileName(normalizeServiceSlug(serviceSlug, targetCode));
        String safeCode = safeFileName(firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT));

        if (safeCode.isBlank() || "unknown".equals(safeCode)) {
            return "";
        }

        return "public-review-cache/" + safeSlug + "/" + safeCode + ".json";
    }



    private String pickMainServiceCode(Review review) {
        return getAllPossibleCodes(review)
                .stream()
                .findFirst()
                .orElse("");
    }

    private List<String> getAllPossibleCodes(Review review) {
        List<String> values = List.of(
                getStringValue(review, "getTargetCode"),
                getStringValue(review, "getOperatorCode"),
                getStringValue(review, "getOwnerPartnerCode"),
                getStringValue(review, "getPartnerCode"),
                getStringValue(review, "getAssignedOperatorCode"),
                getStringValue(review, "getServiceCode"),
                getStringValue(review, "getHotelCode"),
                getStringValue(review, "getId"),
                getStringValue(review, "getReviewId")
        );

        List<String> result = new ArrayList<>();

        for (String value : values) {
            String code = extractMainServiceCode(value);
            if (!code.isBlank() && !result.contains(code)) {
                result.add(code);
            }
        }

        return result;
    }

    private String extractMainServiceCode(String value) {
        String text = firstNonBlank(value, "").toUpperCase(Locale.ROOT);
        if (text.isBlank()) return "";

        Matcher matcher = Pattern
                .compile("\\b(PT|KS|MB|TH|TO|DV)-?(\\d{1,4})\\b")
                .matcher(text);

        if (!matcher.find()) return "";

        String prefix = matcher.group(1);
        String numberText = matcher.group(2);

        try {
            int number = Integer.parseInt(numberText);
            if (number <= 0) return "";
            return prefix + "-" + String.format(Locale.ROOT, "%03d", number);
        } catch (Exception ignored) {
            return "";
        }
    }

    private String normalizeServiceSlug(String serviceSlug, String targetCode) {
        String slug = firstNonBlank(serviceSlug, "").trim();

        if (!slug.isBlank()) {
            String normalized = normalizeText(slug).replace('_', '-');

            if (normalized.contains("khach-san") || normalized.contains("khach san") || normalized.contains("hotel")) {
                return "khach-san";
            }

            if (normalized.contains("may-bay") || normalized.contains("may bay") || normalized.contains("airline") || normalized.contains("flight")) {
                return "may-bay";
            }

            if (normalized.contains("tau-hoa") || normalized.contains("tau hoa") || normalized.contains("train") || normalized.contains("rail")) {
                return "tau-hoa";
            }

            if (normalized.contains("tour")) {
                return "tour";
            }

            if (normalized.contains("dich-vu-khac") || normalized.contains("dich vu khac") || normalized.contains("other")) {
                return "dich-vu-khac";
            }

            if (normalized.contains("nha-xe") || normalized.contains("nha xe") || normalized.contains("bus") || normalized.contains("transport")) {
                return "nha-xe";
            }
        }

        String code = firstNonBlank(targetCode, "").toUpperCase(Locale.ROOT);

        if (code.startsWith("KS-")) return "khach-san";
        if (code.startsWith("MB-")) return "may-bay";
        if (code.startsWith("TH-")) return "tau-hoa";
        if (code.startsWith("TO-")) return "tour";
        if (code.startsWith("DV-")) return "dich-vu-khac";

        return "nha-xe";
    }

    private String serviceNameFromSlug(String slug) {
        return switch (firstNonBlank(slug, "nha-xe")) {
            case "khach-san" -> "Khách sạn";
            case "may-bay" -> "Hãng bay";
            case "tau-hoa" -> "Tàu hỏa";
            case "tour" -> "Tour";
            case "dich-vu-khac" -> "Dịch vụ khác";
            default -> "Nhà xe";
        };
    }

    private String safeFileName(String value) {
        String text = firstNonBlank(value, "").trim();

        if (text.isBlank()) return "unknown";

        return text.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String normalizeText(String value) {
        return Normalizer.normalize(firstNonBlank(value, ""), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private String getStringValue(Object target, String methodName) {
        if (target == null || methodName == null || methodName.isBlank()) return "";

        try {
            Method method = target.getClass().getMethod(methodName);
            Object value = method.invoke(target);
            return value == null ? "" : String.valueOf(value);
        } catch (Exception ignored) {
            return "";
        }
    }

    private double getDoubleValue(Object target, String methodName) {
        if (target == null || methodName == null || methodName.isBlank()) return 0.0;

        try {
            Method method = target.getClass().getMethod(methodName);
            Object value = method.invoke(target);

            if (value instanceof Number number) {
                return number.doubleValue();
            }

            if (value != null) {
                return Double.parseDouble(String.valueOf(value));
            }
        } catch (Exception ignored) {
            // fallback
        }

        return 0.0;
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";

        for (String value : values) {
            if (value != null && !value.trim().isBlank()) {
                return value.trim();
            }
        }

        return "";
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ReviewCachePayload {
        private String serviceSlug;
        private String targetCode;
        private int total;
        private String updatedAt;
        private List<ReviewCacheItem> reviews = new ArrayList<>();

        public String getServiceSlug() {
            return serviceSlug;
        }

        public void setServiceSlug(String serviceSlug) {
            this.serviceSlug = serviceSlug;
        }

        public String getTargetCode() {
            return targetCode;
        }

        public void setTargetCode(String targetCode) {
            this.targetCode = targetCode;
        }

        public int getTotal() {
            return total;
        }

        public void setTotal(int total) {
            this.total = total;
        }

        public String getUpdatedAt() {
            return updatedAt;
        }

        public void setUpdatedAt(String updatedAt) {
            this.updatedAt = updatedAt;
        }

        public List<ReviewCacheItem> getReviews() {
            return reviews == null ? new ArrayList<>() : reviews;
        }

        public void setReviews(List<ReviewCacheItem> reviews) {
            this.reviews = reviews == null ? new ArrayList<>() : reviews;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ReviewCacheItem {
        private String id;
        private String serviceSlug;
        private String serviceCategory;
        private String targetCode;
        private String operatorCode;
        private String partnerCode;
        private String targetName;
        private String operatorName;
        private String reviewerName;
        private double rating;
        private String comment;
        private String createdAt;
        private String visibility;
        private String moderationStatus;
        private String sourceSystem;
        private String imageUrl;
        private String reviewImage;
        private String imageFileName;

        @JsonIgnore
        public Instant getCreatedAtSafe() {
            try {
                return Instant.parse(firstNonBlankStatic(createdAt, Instant.EPOCH.toString()));
            } catch (Exception ignored) {
                return Instant.EPOCH;
            }
        }

        private static String firstNonBlankStatic(String... values) {
            if (values == null) return "";

            for (String value : values) {
                if (value != null && !value.trim().isBlank()) {
                    return value.trim();
                }
            }

            return "";
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getServiceSlug() {
            return serviceSlug;
        }

        public void setServiceSlug(String serviceSlug) {
            this.serviceSlug = serviceSlug;
        }

        public String getServiceCategory() {
            return serviceCategory;
        }

        public void setServiceCategory(String serviceCategory) {
            this.serviceCategory = serviceCategory;
        }

        public String getTargetCode() {
            return targetCode;
        }

        public void setTargetCode(String targetCode) {
            this.targetCode = targetCode;
        }

        public String getOperatorCode() {
            return operatorCode;
        }

        public void setOperatorCode(String operatorCode) {
            this.operatorCode = operatorCode;
        }

        public String getPartnerCode() {
            return partnerCode;
        }

        public void setPartnerCode(String partnerCode) {
            this.partnerCode = partnerCode;
        }

        public String getTargetName() {
            return targetName;
        }

        public void setTargetName(String targetName) {
            this.targetName = targetName;
        }

        public String getOperatorName() {
            return operatorName;
        }

        public void setOperatorName(String operatorName) {
            this.operatorName = operatorName;
        }

        public String getReviewerName() {
            return reviewerName;
        }

        public void setReviewerName(String reviewerName) {
            this.reviewerName = reviewerName;
        }

        public double getRating() {
            return rating;
        }

        public void setRating(double rating) {
            this.rating = rating;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }

        public String getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(String createdAt) {
            this.createdAt = createdAt;
        }

        public String getVisibility() {
            return visibility;
        }

        public void setVisibility(String visibility) {
            this.visibility = visibility;
        }

        public String getModerationStatus() {
            return moderationStatus;
        }

        public void setModerationStatus(String moderationStatus) {
            this.moderationStatus = moderationStatus;
        }

        public String getSourceSystem() {
            return sourceSystem;
        }

        public void setSourceSystem(String sourceSystem) {
            this.sourceSystem = sourceSystem;
        }

        public String getImageUrl() {
            return imageUrl;
        }

        public void setImageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
        }

        public String getReviewImage() {
            return reviewImage;
        }

        public void setReviewImage(String reviewImage) {
            this.reviewImage = reviewImage;
        }

        public String getImageFileName() {
            return imageFileName;
        }

        public void setImageFileName(String imageFileName) {
            this.imageFileName = imageFileName;
        }
    }
}
