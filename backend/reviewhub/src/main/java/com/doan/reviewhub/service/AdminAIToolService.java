package com.doan.reviewhub.service;

import com.doan.reviewhub.dto.AIReviewPreviewResponse;
import com.doan.reviewhub.entity.Plan;
import com.doan.reviewhub.entity.PurchaseHistory;
import com.doan.reviewhub.entity.Review;
import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.PlanRepository;
import com.doan.reviewhub.repository.PurchaseHistoryRepository;
import com.doan.reviewhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAIToolService {

    private final UserRepository userRepository;
    private final PurchaseHistoryRepository purchaseHistoryRepository;
    private final PlanRepository planRepository;

    public long countPartners() {
        return userRepository.findAll()
                .stream()
                .filter(u -> u.getRole() != null && u.getRole().equalsIgnoreCase("partner"))
                .count();
    }

    public String getPartnerList() {
        List<User> partners = userRepository.findAll()
                .stream()
                .filter(u -> u.getRole() != null && u.getRole().equalsIgnoreCase("partner"))
                .toList();

        if (partners.isEmpty()) {
            return """
# 📋 Danh sách Partner

Hiện chưa có partner nào trong hệ thống.
""";
        }

        StringBuilder sb = new StringBuilder();

        sb.append("# 📋 Danh sách Partner\n\n");
        sb.append("**Tổng số đối tác:** ").append(partners.size()).append("\n\n");

        sb.append("| Partner | Đơn vị | Mã | Nhà xe |\n");
        sb.append("|---|---|---|---|\n");

        for (User u : partners) {
            sb.append("| ")
                    .append(safe(u.getName()))
                    .append(" | ")
                    .append(safe(u.getOrgName()))
                    .append(" | ")
                    .append(safe(u.getPartnerCode()))
                    .append(" | ")
                    .append(safe(u.getAssignedOperatorCode()))
                    .append(" |\n");
        }

        return sb.toString();
    }

    public String getPurchaseHistorySummary() {
        List<PurchaseHistory> purchases = purchaseHistoryRepository.findAll()
                .stream()
                .sorted((a, b) -> b.getPurchasedAt().compareTo(a.getPurchasedAt()))
                .toList();

        if (purchases.isEmpty()) {
            return """
# 💳 Lịch sử mua gói

Chưa có giao dịch mua gói nào.
""";
        }

        long total = purchases.size();

        long paid = purchases.stream()
                .filter(p -> "Đã thanh toán".equalsIgnoreCase(safe(p.getStatus())))
                .count();

        long pending = purchases.stream()
                .filter(p -> p.getStatus() != null && p.getStatus().startsWith("pending"))
                .count();

        long rejected = purchases.stream()
                .filter(p -> "Từ chối".equalsIgnoreCase(safe(p.getStatus())))
                .count();

        long revenue = purchases.stream()
                .filter(p -> "Đã thanh toán".equalsIgnoreCase(safe(p.getStatus())))
                .mapToLong(PurchaseHistory::getAmount)
                .sum();

        StringBuilder sb = new StringBuilder();

        sb.append("# 💳 Lịch sử mua gói\n\n");

        sb.append("## 📊 Thống kê nhanh\n\n");
        sb.append("| Chỉ số | Giá trị |\n");
        sb.append("|---|---:|\n");
        sb.append("| Tổng giao dịch | ").append(total).append(" |\n");
        sb.append("| Đã thanh toán | ").append(paid).append(" |\n");
        sb.append("| Chờ duyệt | ").append(pending).append(" |\n");
        sb.append("| Từ chối | ").append(rejected).append(" |\n");
        sb.append("| Doanh thu đã thanh toán | ").append(formatMoney(revenue)).append(" |\n\n");

        sb.append("## 🧾 10 giao dịch mới nhất\n\n");
        sb.append("| Thời gian | Partner | Đơn vị | Gói | Số tiền | Trạng thái |\n");
        sb.append("|---|---|---|---|---:|---|\n");

        purchases.stream().limit(10).forEach(h -> {
            User u = userRepository.findById(h.getUserId()).orElse(null);
            Plan plan = planRepository.findById(h.getPlanId()).orElse(null);

            sb.append("| ")
                    .append(formatDate(h))
                    .append(" | ")
                    .append(u != null ? safe(u.getName()) : "-")
                    .append(" | ")
                    .append(u != null ? safe(u.getOrgName()) : "-")
                    .append(" | ")
                    .append(plan != null ? safe(plan.getName()) : safe(h.getPlanId()))
                    .append(" | ")
                    .append(formatMoney(h.getAmount()))
                    .append(" | ")
                    .append(formatStatus(h.getStatus()))
                    .append(" |\n");
        });

        sb.append("\n");

        return sb.toString();
    }

    public String analyzeReview(String review) {
        String lower = review == null ? "" : review.toLowerCase();

        boolean toxic =
                lower.contains("ngu") ||
                lower.contains("óc chó") ||
                lower.contains("lừa đảo") ||
                lower.contains("đcm") ||
                lower.contains("cc") ||
                lower.contains("dm");

        if (toxic) {
            return """
# 🚫 Kết quả phân tích Review

| Mục | Kết quả |
|---|---|
| Đề xuất | Không nên duyệt |
| Mức rủi ro | Cao |
| Lý do chính | Có dấu hiệu toxic / công kích |

## Khuyến nghị
- Từ chối review.
- Hoặc yêu cầu người dùng chỉnh sửa nội dung.
""";
        }

        return """
# ✅ Kết quả phân tích Review

| Mục | Kết quả |
|---|---|
| Đề xuất | Có thể duyệt |
| Mức rủi ro | Thấp |
| Lý do chính | Không phát hiện toxic nghiêm trọng |

## Khuyến nghị
- Có thể duyệt nếu nội dung đúng thực tế.
""";
    }

    public AIReviewPreviewResponse analyzeReviewBatch(List<Review> reviews) {
        List<String> approveIds = new ArrayList<>();
        List<String> rejectIds = new ArrayList<>();
        List<String> manualIds = new ArrayList<>();
        List<AIReviewPreviewResponse.AIReviewDecisionItem> items = new ArrayList<>();

        for (Review review : reviews) {
            String comment = review.getComment() == null ? "" : review.getComment().trim();
            String lower = comment.toLowerCase();

            double rating = review.getRating() == null ? 0 : review.getRating();

            String action = "manual";
            double confidence = 0.55;
            String reason = "Cần admin xem lại để đảm bảo nội dung đúng thực tế.";

            boolean toxic =
                    lower.contains("ngu") ||
                    lower.contains("óc chó") ||
                    lower.contains("lừa đảo") ||
                    lower.contains("đcm") ||
                    lower.contains("địt") ||
                    lower.contains("cc") ||
                    lower.contains("dm") ||
                    lower.contains("cặc") ||
                    lower.contains("chó") ||
                    lower.contains("rác");

            boolean spam =
                    lower.contains("http://") ||
                    lower.contains("https://") ||
                    lower.contains("zalo") ||
                    lower.contains("telegram") ||
                    lower.contains("casino") ||
                    lower.contains("cá cược");

            boolean tooShort = comment.length() < 8;

            boolean positive =
                    rating >= 4 &&
                    !toxic &&
                    !spam &&
                    comment.length() >= 8;

            boolean normalNegative =
                    rating <= 2 &&
                    !toxic &&
                    !spam &&
                    comment.length() >= 12;

            if (toxic) {
                action = "reject";
                confidence = 0.94;
                reason = "Review có dấu hiệu toxic / công kích / từ ngữ không phù hợp.";
            } else if (spam) {
                action = "reject";
                confidence = 0.92;
                reason = "Review có dấu hiệu spam hoặc chứa nội dung quảng cáo / liên hệ ngoài.";
            } else if (tooShort) {
                action = "manual";
                confidence = 0.60;
                reason = "Nội dung quá ngắn, cần admin xem lại.";
            } else if (positive) {
                action = "approve";
                confidence = 0.90;
                reason = "Review tích cực, không phát hiện nội dung độc hại.";
            } else if (normalNegative) {
                action = "approve";
                confidence = 0.78;
                reason = "Review tiêu cực nhưng có vẻ là phản hồi trải nghiệm thật, không có từ ngữ toxic.";
            }

            if ("approve".equals(action)) {
                approveIds.add(review.getId());
            } else if ("reject".equals(action)) {
                rejectIds.add(review.getId());
            } else {
                manualIds.add(review.getId());
            }

            items.add(
                    AIReviewPreviewResponse.AIReviewDecisionItem.builder()
                            .id(review.getId())
                            .action(action)
                            .confidence(confidence)
                            .reason(reason)
                            .build()
            );
        }

        return AIReviewPreviewResponse.builder()
                .total(reviews.size())
                .approveCount(approveIds.size())
                .rejectCount(rejectIds.size())
                .manualCount(manualIds.size())
                .approveIds(approveIds)
                .rejectIds(rejectIds)
                .manualIds(manualIds)
                .items(items)
                .build();
    }

    public String handleAdminQuestion(String message) {
        String lower = message == null ? "" : message.toLowerCase();

        if (
                lower.contains("xin chào") ||
                lower.contains("chào bạn") ||
                lower.equals("chào") ||
                lower.equals("hello") ||
                lower.equals("hi")
        ) {
            return """
# 👋 Xin chào!

Mình đây, bạn cần hỗ trợ gì hôm nay?

Bạn có thể hỏi mình:
- Có bao nhiêu đối tác?
- Danh sách partner
- Lịch sử mua gói
- Phân tích review
- Giải thích lỗi admin

Chúc bạn một ngày làm việc hiệu quả nhé!
""";
        }

        if (
                lower.contains("cảm ơn") ||
                lower.contains("cam on") ||
                lower.contains("thanks") ||
                lower.contains("thank you") ||
                lower.contains("tks")
        ) {
            return """
Vâng ạ! 😊

Nếu cần hỗ trợ thêm, cứ hỏi mình nhé.

Chúc bạn một ngày tốt lành!
""";
        }

        if (
                lower.contains("tạm biệt") ||
                lower.contains("bye") ||
                lower.contains("hẹn gặp lại")
        ) {
            return """
Tạm biệt bạn nhé! 👋

Chúc bạn một ngày tốt lành.
Khi cần hỗ trợ thêm, cứ quay lại hỏi mình.
""";
        }

        if (
                lower.contains("bạn là ai") ||
                lower.contains("ai vậy") ||
                lower.contains("bạn làm được gì")
        ) {
            return """
# 🤖 Mình là Admin AI

Mình có thể hỗ trợ bạn quản lý hệ thống ReviewHub.

## Mình có thể giúp:
- Đếm số lượng đối tác
- Xem danh sách partner
- Xem lịch sử mua gói
- Thống kê giao dịch
- Phân tích review
- Gợi ý xử lý lỗi admin

Bạn cứ hỏi, mình sẽ hỗ trợ nhé!
""";
        }

        if (
                lower.contains("câu hỏi khó") ||
                lower.contains("khó quá") ||
                lower.contains("giải thích giúp") ||
                lower.contains("tư vấn giúp")
        ) {
            return """
# 🤔 Mình sẽ hỗ trợ bạn từng bước

Bạn hãy gửi rõ hơn nội dung cần hỏi, mình sẽ cố gắng:

1. Đọc yêu cầu của bạn.
2. Tóm tắt vấn đề chính.
3. Đưa ra hướng xử lý dễ hiểu.
4. Nếu liên quan hệ thống, mình sẽ gợi ý cách kiểm tra hoặc sửa.

Bạn cứ gửi câu hỏi, mình sẽ hỗ trợ nhé!
""";
        }

        if (
                lower.contains("bao nhiêu đối tác") ||
                lower.contains("bao đối tác") ||
                lower.contains("mấy đối tác") ||
                lower.contains("bao nhiêu partner") ||
                lower.contains("mấy partner") ||
                lower.contains("số lượng đối tác") ||
                lower.contains("số lượng partner") ||
                lower.contains("tổng đối tác")
        ) {
            long count = countPartners();

            return """
# 👥 Thống kê Partner

Hiện có **%d đối tác** trong hệ thống.

Bạn có thể hỏi tiếp:
- Danh sách partner
- Lịch sử mua gói
- Thống kê giao dịch
""".formatted(count);
        }

        if (
                lower.contains("danh sách partner") ||
                lower.contains("danh sách đối tác") ||
                lower.contains("list partner") ||
                lower.contains("xem partner")
        ) {
            return getPartnerList();
        }

        if (
                lower.contains("lịch sử mua gói") ||
                lower.contains("giao dịch mua gói") ||
                lower.contains("thống kê mua gói") ||
                lower.contains("thống kê giao dịch") ||
                lower.contains("doanh thu") ||
                lower.contains("giao dịch")
        ) {
            return getPurchaseHistorySummary();
        }

        if (
                lower.startsWith("review:") ||
                lower.startsWith("đánh giá:")
        ) {
            String reviewContent = message
                    .replaceFirst("(?i)^review:", "")
                    .replaceFirst("(?i)^đánh giá:", "")
                    .trim();

            return analyzeReview(reviewContent);
        }

        if (
                lower.contains("review này nên duyệt") ||
                lower.contains("nên duyệt review") ||
                lower.contains("đánh giá này nên duyệt")
        ) {
            return """
# ⭐ Phân tích Review

Hãy gửi review theo cú pháp:

review: nội dung review

Ví dụ:

review: Nhà xe phục vụ tốt, tài xế lịch sự.
""";
        }

        if (
                lower.contains("đổi giá gói") ||
                lower.contains("chỉnh giá gói") ||
                lower.contains("sửa giá gói")
        ) {
            return """
# 💳 Chỉnh giá gói

Tôi hiểu bạn muốn thay đổi giá package.

Vì đây là thao tác ảnh hưởng database nên hệ thống cần xác nhận admin trước khi update.

## Luồng chuẩn
1. AI phân tích yêu cầu.
2. AI xác định package và giá mới.
3. Admin xác nhận.
4. Backend update database.

Ví dụ:

Đổi giá gói Tăng trưởng thành 2.900.000đ
""";
        }

        if (
                lower.contains("tự động duyệt") ||
                lower.contains("phân loại review") ||
                lower.contains("tự phân loại")
        ) {
            return """
# 🤖 AI Moderation Pipeline

Đã hỗ trợ backend AI moderation.

## API đã dùng
- POST /api/admin/reviews/ai-preview
- POST /api/admin/reviews/ai-apply
- POST /api/admin/reviews/bulk-approve
- POST /api/admin/reviews/bulk-reject

## Luồng xử lý
1. AI đọc review đang pending.
2. AI phân loại: nên duyệt, nên từ chối, cần admin xem.
3. Admin xác nhận.
4. Hệ thống mới duyệt hoặc từ chối hàng loạt.
""";
        }

        return """
# 🤖 Admin AI

Tôi chưa hiểu chính xác yêu cầu này.

## Tôi có thể hỗ trợ
- 👥 Đếm partner
- 📋 Danh sách partner
- 💳 Lịch sử mua gói
- 📊 Thống kê giao dịch
- ⭐ Phân tích review
- 🐞 Giải thích lỗi admin

## Ví dụ
Có bao nhiêu đối tác?

Danh sách partner

Lịch sử mua gói

Thống kê giao dịch

review: nhà xe phục vụ như cc
""";
    }

    private String safe(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }

        return value
                .replace("|", "/")
                .replace("\n", " ")
                .trim();
    }

    private String formatMoney(long amount) {
        return String.format("%,d đ", amount).replace(",", ".");
    }

    private String formatDate(PurchaseHistory h) {
        if (h.getPurchasedAt() == null) {
            return "-";
        }

        return DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")
                .withZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(h.getPurchasedAt());
    }

    private String formatStatus(String status) {
        if (status == null || status.isBlank()) {
            return "-";
        }

        if (status.startsWith("pending:")) {
            return "Chờ duyệt (" + status.substring("pending:".length()) + ")";
        }

        if ("pending".equalsIgnoreCase(status)) {
            return "Chờ duyệt";
        }

        return status;
    }
}