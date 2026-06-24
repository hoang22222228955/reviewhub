package com.doan.reviewhub.service;

import com.doan.reviewhub.agent.ReviewAgentPipeline;
import com.doan.reviewhub.dto.ReviewDto;
import com.doan.reviewhub.entity.Review;
import com.doan.reviewhub.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewAgentPipeline agentPipeline;

    private static final int MAX_PAGE_SIZE = 1000;

    /**
     * Bản cũ giữ lại để các controller khác không bị vỡ.
     */
    public Page<ReviewDto> getReviewsForPartner(
            String partnerCode,
            String assignedOperatorCode,
            String keyword,
            String category,
            String visibility,
            String sourceSystem,
            int page,
            int size
    ) {
        return getReviewsForPartner(
                partnerCode,
                assignedOperatorCode,
                partnerCode,
                null,
                keyword,
                category,
                visibility,
                sourceSystem,
                page,
                size
        );
    }

    /**
     * Lấy danh sách review cho partner.
     *
     * Luật hiển thị:
     * - google-maps: dữ liệu chung, partner thấy theo mã dịch vụ được gán/mua.
     * - partner-web: dữ liệu riêng, chỉ ownerUserId/partnerCode của tài khoản gửi mới thấy sau khi admin duyệt.
     */
    public Page<ReviewDto> getReviewsForPartner(
            String partnerCode,
            String assignedOperatorCode,
            String ownerUserId,
            String ownerEmail,
            String keyword,
            String category,
            String visibility,
            String sourceSystem,
            int page,
            int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size <= 0 ? MAX_PAGE_SIZE : size, MAX_PAGE_SIZE));

        PageRequest pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by("createdAt").descending()
        );

        List<String> operatorCodes = splitCodes(
                firstNonBlank(assignedOperatorCode, partnerCode)
        );

        List<String> ownerKeys = uniqueNonBlank(ownerUserId, partnerCode, ownerEmail);

        // JPQL IN () không thích list rỗng, dùng key không tồn tại để giữ query an toàn.
        if (operatorCodes.isEmpty()) operatorCodes = List.of("__NO_OPERATOR__");
        if (ownerKeys.isEmpty()) ownerKeys = List.of("__NO_OWNER__");

        return reviewRepository.searchForPartnerScope(
                operatorCodes,
                ownerKeys,
                clean(keyword),
                normalizeFilter(category),
                normalizeFilter(visibility),
                normalizeFilter(sourceSystem),
                pageable
        ).map(ReviewDto::from);
    }

    public Optional<ReviewDto> getById(String id) {
        return reviewRepository.findById(id).map(ReviewDto::from);
    }

    /**
     * Bản cũ giữ lại để không vỡ code cũ. Partner-web sẽ vào queue, chưa hiện ngay.
     */
    public ReviewDto submitReview(
            String partnerCode,
            String callerRole,
            String targetCode,
            String targetName,
            String category,
            String reviewerName,
            Double rating,
            String comment,
            String visibility
    ) {
        return submitReview(
                partnerCode,
                null,
                partnerCode,
                null,
                callerRole,
                targetCode,
                targetName,
                category,
                reviewerName,
                rating,
                comment,
                visibility
        );
    }

    /**
     * Partner gửi review mới.
     * Review này luôn vào hàng đợi admin:
     * - sourceSystem = partner-web
     * - moderationStatus = pending_review
     * - visibility = private
     * - ownerPartnerCode = ownerUserId để chỉ đúng tài khoản này thấy sau khi admin duyệt
     */
    public ReviewDto submitReview(
            String ownerUserId,
            String ownerEmail,
            String partnerCode,
            String assignedOperatorCode,
            String callerRole,
            String targetCode,
            String targetName,
            String category,
            String reviewerName,
            Double rating,
            String comment,
            String visibility
    ) {
        String serviceCode = firstNonBlank(targetCode, firstCode(assignedOperatorCode), partnerCode, "PT-000");
        String ownerKey = firstNonBlank(ownerUserId, partnerCode, ownerEmail, "UNKNOWN_OWNER");
        String safeTargetName = firstNonBlank(targetName, serviceCode);

        String randomPart = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 8)
                .toUpperCase();

        Map<String, Object> raw = new HashMap<>();
        raw.put("source", "partner-web");
        raw.put("requestedVisibility", visibility == null ? "" : visibility);
        raw.put("ownerUserId", ownerUserId == null ? "" : ownerUserId);
        raw.put("ownerEmail", ownerEmail == null ? "" : ownerEmail);
        raw.put("partnerCode", partnerCode == null ? "" : partnerCode);
        raw.put("assignedOperatorCode", assignedOperatorCode == null ? "" : assignedOperatorCode);
        raw.put("submittedByRole", callerRole == null ? "" : callerRole);

        Review review = Review.builder()
                .id(serviceCode + "-" + randomPart)
                .operatorCode(serviceCode)
                .targetCode(serviceCode)
                .targetName(safeTargetName)
                .category(firstNonBlank(category, "Nhà xe"))
                .reviewerName(firstNonBlank(reviewerName, "Khách hàng"))
                .rating(rating == null ? 0.0 : rating)
                .comment(comment == null ? "" : comment)
                .visibility("private")
                .sourceSystem("partner-web")
                .moderationStatus("pending_review")
                .ownerPartnerCode(ownerKey)
                .rawPayload(raw)
                .createdAt(Instant.now())
                .build();

        Review saved = reviewRepository.save(review);
        return ReviewDto.from(saved);
    }

    /**
     * Người dùng ngoài trang public gửi đánh giá.
     * Review này là dữ liệu dùng chung theo mã dịch vụ, nhưng vẫn phải chờ admin duyệt.
     * Sau khi approved, mọi partner đang được gán/mua đúng mã dịch vụ đều xem được.
     */
    public ReviewDto submitPublicReview(
            String targetCode,
            String targetName,
            String category,
            String reviewerName,
            Double rating,
            String comment,
            String visibility,
            String submitChannel
    ) {
        String serviceCode = firstNonBlank(targetCode, "PT-000");
        String safeTargetName = firstNonBlank(targetName, serviceCode);

        String randomPart = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 8)
                .toUpperCase();

        Map<String, Object> raw = new HashMap<>();
        raw.put("source", "public-web");
        raw.put("sourceSystem", "public-web");
        raw.put("dataScope", "shared");
        raw.put("data_scope", "shared");
        raw.put("reviewScope", "public-shared");
        raw.put("review_scope", "public-shared");
        raw.put("submitChannel", firstNonBlank(submitChannel, "public-page"));
        raw.put("submit_channel", firstNonBlank(submitChannel, "public-page"));
        raw.put("requestedVisibility", firstNonBlank(visibility, "public"));
        raw.put("ownerPartnerCode", serviceCode);

        Review review = Review.builder()
                .id(serviceCode + "-" + randomPart)
                .operatorCode(serviceCode)
                .targetCode(serviceCode)
                .targetName(safeTargetName)
                .category(firstNonBlank(category, "Nhà xe"))
                .reviewerName(firstNonBlank(reviewerName, "Khách hàng"))
                .rating(rating == null ? 0.0 : rating)
                .comment(comment == null ? "" : comment)
                .visibility("public")
                .sourceSystem("public-web")
                .moderationStatus("pending_review")
                .ownerPartnerCode(serviceCode)
                .rawPayload(raw)
                .createdAt(Instant.now())
                .build();

        Review saved = reviewRepository.save(review);
        return ReviewDto.from(saved);
    }

    public boolean isPublicWebReview(String reviewId) {
        if (reviewId == null || reviewId.isBlank()) return false;

        return reviewRepository.findById(reviewId)
                .map(review -> "public-web".equalsIgnoreCase(review.getSourceSystem()))
                .orElse(false);
    }


    /**
     * Gắn ảnh vào raw_payload của review để hàng chờ admin nhìn thấy ảnh trước khi duyệt.
     * Không thêm cột mới, chỉ dùng JSON raw_payload đang có sẵn.
     */
    @Transactional
    public Optional<ReviewDto> attachImageToReview(
            String reviewId,
            String imageUrl,
            String imageFileName,
            String operatorCode,
            String categoryFolder,
            Long fileSize
    ) {
        if (reviewId == null || reviewId.isBlank()) {
            return Optional.empty();
        }

        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null) {
            return Optional.empty();
        }

        Map<String, Object> raw = new HashMap<>();
        if (review.getRawPayload() != null) {
            raw.putAll(review.getRawPayload());
        }

        raw.put("imageUrl", imageUrl == null ? "" : imageUrl);
        raw.put("image_url", imageUrl == null ? "" : imageUrl);
        raw.put("reviewImage", imageUrl == null ? "" : imageUrl);
        raw.put("review_image", imageUrl == null ? "" : imageUrl);
        raw.put("imageFileName", imageFileName == null ? "" : imageFileName);
        raw.put("image_file_name", imageFileName == null ? "" : imageFileName);
        raw.put("operatorCodeForImage", operatorCode == null ? "" : operatorCode);
        raw.put("categoryFolder", categoryFolder == null ? "" : categoryFolder);
        raw.put("imageSize", fileSize == null ? 0L : fileSize);
        raw.put("hasImage", imageUrl != null && !imageUrl.isBlank());
        raw.put("imageUploadedAt", Instant.now().toString());

        review.setRawPayload(raw);

        Review saved = reviewRepository.save(review);
        return Optional.of(ReviewDto.from(saved));
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalizeFilter(String value) {
        String text = clean(value);
        return text.isBlank() ? "all" : text;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "";
    }

    private static String firstCode(String value) {
        List<String> codes = splitCodes(value);
        return codes.isEmpty() ? "" : codes.get(0);
    }

    private static List<String> uniqueNonBlank(String... values) {
        LinkedHashSet<String> set = new LinkedHashSet<>();
        for (String value : values) {
            if (value == null) continue;
            String text = value.trim();
            if (!text.isBlank()) set.add(text);
        }
        return new ArrayList<>(set);
    }

    private static List<String> splitCodes(String value) {
        LinkedHashSet<String> codes = new LinkedHashSet<>();
        if (value == null) return new ArrayList<>();

        for (String part : value.split("[\\s,;|]+")) {
            String code = part.trim().toUpperCase();
            if (!code.isBlank()) codes.add(code);
        }

        return new ArrayList<>(codes);
    }
}
