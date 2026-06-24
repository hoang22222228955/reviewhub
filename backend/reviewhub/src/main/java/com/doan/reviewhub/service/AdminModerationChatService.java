package com.doan.reviewhub.service;

import com.doan.reviewhub.dto.AIReviewPreviewResponse;
import com.doan.reviewhub.entity.Review;
import com.doan.reviewhub.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminModerationChatService {

    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";

    private static final String VISIBILITY_PUBLIC = "public";
    private static final String VISIBILITY_PRIVATE = "private";

    private final ReviewRepository reviewRepository;
    private final AdminAIToolService adminAIToolService;

    /*
     * Lưu đề xuất AI gần nhất.
     * Với đồ án/local app dùng như này ổn.
     * Nếu production nhiều admin cùng dùng, nên lưu theo adminId/sessionId trong DB hoặc cache.
     */
    private List<String> lastApproveIds = new ArrayList<>();
    private List<String> lastRejectIds = new ArrayList<>();
    private long lastManualCount = 0;
    private long lastTotal = 0;

    public boolean canHandle(String message) {
        String text = normalize(message);

        return isPreviewCommand(text)
                || isApplyCommand(text)
                || isCancelCommand(text)
                || isStatsCommand(text);
    }

    public String handle(String message) {
        String text = normalize(message);

        if (isPreviewCommand(text)) {
            return previewPendingReviews();
        }

        if (isStatsCommand(text)) {
            return statPendingReviews();
        }

        if (isApplyCommand(text)) {
            return applyLastAIProposal();
        }

        if (isCancelCommand(text)) {
            clearLastProposal();
            return """
                    Đã hủy đề xuất AI gần nhất.

                    Bạn có thể nhập:
                    - "AI tự đánh giá review pending"
                    - "Thống kê review pending"
                    """;
        }

        return null;
    }

    public String previewPendingReviews() {
        List<Review> reviews = getPendingReviews();

        if (reviews.isEmpty()) {
            clearLastProposal();
            return """
                    🤖 AI Moderation Pipeline

                    Hiện không có review pending nào cần xử lý.
                    """;
        }

        AIReviewPreviewResponse result =
                adminAIToolService.analyzeReviewBatch(reviews);

        lastApproveIds = safeList(result.getApproveIds());
        lastRejectIds = safeList(result.getRejectIds());
        lastManualCount = Math.toIntExact(result.getManualCount());
        lastTotal = Math.toIntExact(result.getTotal());

        return """
                🤖 AI Moderation Pipeline

                Tôi đã phân tích %d review pending.

                📊 Bảng thống kê:
                - Nên duyệt: %d
                - Nên từ chối: %d
                - Cần admin xem tay: %d

                Trạng thái:
                - Chưa áp dụng vào database.
                - Admin cần xác nhận trước khi hệ thống duyệt/từ chối.

                Bạn có muốn tôi áp dụng đề xuất này không?
                Trả lời: "đồng ý", "ok", "xác nhận" hoặc "hủy".
                """.formatted(
                result.getTotal(),
                result.getApproveCount(),
                result.getRejectCount(),
                result.getManualCount()
        );
    }

    public String applyLastAIProposal() {
        if (lastApproveIds.isEmpty() && lastRejectIds.isEmpty()) {
            return """
                    Chưa có đề xuất AI nào để áp dụng.

                    Hãy nhập trước:
                    "AI tự đánh giá review pending"
                    """;
        }

        int approved = approveReviews(lastApproveIds);
        int rejected = rejectReviews(lastRejectIds);

        String response = """
                ✅ Đã áp dụng đề xuất AI.

                Kết quả xử lý:
                - Đã duyệt: %d
                - Đã từ chối: %d
                - Cần admin xem tay: %d
                - Tổng AI đã phân tích trước đó: %d

                Danh sách review pending đã được cập nhật.
                """.formatted(
                approved,
                rejected,
                lastManualCount,
                lastTotal
        );

        clearLastProposal();

        return response;
    }

    public String statPendingReviews() {
        List<Review> reviews = getPendingReviews();

        long total = reviews.size();

        long highRisk = reviews.stream()
                .filter(r -> safeNumber(r.getAiConfidence()) >= 0.9)
                .count();

        long mediumRisk = reviews.stream()
                .filter(r -> {
                    double score = safeNumber(r.getAiConfidence());
                    return score >= 0.5 && score < 0.9;
                })
                .count();

        long lowRisk = reviews.stream()
                .filter(r -> safeNumber(r.getAiConfidence()) < 0.5)
                .count();

        long carrierCount = reviews.stream()
                .map(r -> String.valueOf(r.getTargetCode()) + "_" + String.valueOf(r.getTargetName()))
                .distinct()
                .count();

        return """
                📊 Thống kê review pending

                - Tổng review cần xử lý: %d
                - Số nhà xe đang có review pending: %d
                - Rủi ro cao: %d
                - Cần xem lại: %d
                - Rủi ro thấp: %d

                Bạn có thể nhập:
                "AI tự đánh giá review pending"
                để tôi phân tích và đề xuất duyệt/từ chối.
                """.formatted(
                total,
                carrierCount,
                highRisk,
                mediumRisk,
                lowRisk
        );
    }

    private List<Review> getPendingReviews() {
        return reviewRepository.findAll()
                .stream()
                .filter(this::isPendingReview)
                .toList();
    }

    private boolean isPendingReview(Review review) {
        String status = review.getModerationStatus();

        return status == null
                || status.isBlank()
                || status.equalsIgnoreCase(STATUS_PENDING_REVIEW);
    }

    private int approveReviews(List<String> ids) {
        List<Review> reviews = reviewRepository.findAllById(ids)
                .stream()
                .filter(this::isPendingReview)
                .toList();

        for (Review review : reviews) {
            review.setModerationStatus(STATUS_APPROVED);
            review.setVisibility(VISIBILITY_PUBLIC);
            review.setModeratedAt(Instant.now());
        }

        reviewRepository.saveAll(reviews);

        return reviews.size();
    }

    private int rejectReviews(List<String> ids) {
        List<Review> reviews = reviewRepository.findAllById(ids)
                .stream()
                .filter(this::isPendingReview)
                .toList();

        for (Review review : reviews) {
            review.setModerationStatus(STATUS_REJECTED);

            /*
             * Không dùng "hidden" vì database của bạn đang dễ lỗi 500.
             * private an toàn hơn nếu visibility chỉ có public/private.
             */
            review.setVisibility(VISIBILITY_PRIVATE);

            review.setModeratedAt(Instant.now());
        }

        reviewRepository.saveAll(reviews);

        return reviews.size();
    }

    private boolean isPreviewCommand(String text) {
        return text.contains("tu dong duyet review")
                || text.contains("tự động duyệt review")
                || text.contains("ai tu danh gia")
                || text.contains("ai tự đánh giá")
                || text.contains("ai duyet")
                || text.contains("ai duyệt")
                || text.contains("duyet review pending")
                || text.contains("duyệt review pending")
                || text.contains("phan tich review pending")
                || text.contains("phân tích review pending");
    }

    private boolean isApplyCommand(String text) {
        return text.equals("ok")
                || text.equals("oke")
                || text.equals("okay")
                || text.equals("dong y")
                || text.equals("đồng ý")
                || text.equals("xac nhan")
                || text.equals("xác nhận")
                || text.contains("ap dung de xuat")
                || text.contains("áp dụng đề xuất")
                || text.contains("duyet di")
                || text.contains("duyệt đi");
    }

    private boolean isCancelCommand(String text) {
        return text.equals("huy")
                || text.equals("hủy")
                || text.equals("khong")
                || text.equals("không")
                || text.equals("cancel");
    }

    private boolean isStatsCommand(String text) {
        return text.contains("thong ke review")
                || text.contains("thống kê review")
                || text.contains("thong ke pending")
                || text.contains("thống kê pending")
                || text.contains("bao cao review")
                || text.contains("báo cáo review");
    }

    private String normalize(String value) {
        return String.valueOf(value == null ? "" : value)
                .trim()
                .toLowerCase();
    }

    private List<String> safeList(List<String> ids) {
        if (ids == null) {
            return new ArrayList<>();
        }

        return ids.stream()
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();
    }

    private double safeNumber(Double value) {
        return value == null ? 0.0 : value;
    }

    private void clearLastProposal() {
        lastApproveIds = new ArrayList<>();
        lastRejectIds = new ArrayList<>();
        lastManualCount = 0;
        lastTotal = 0;
    }
}
