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

import java.text.Normalizer;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

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
        ModerationDecision decision = moderate(review, 0);

        if ("REJECT".equals(decision.decision)) {
            return """
# 🚫 Kết quả phân tích Review

| Mục | Kết quả |
|---|---|
| Đề xuất | Không nên duyệt |
| Mức rủi ro | Cao |
| Lý do chính | %s |

## Vi phạm checklist
%s

## Khuyến nghị
- Từ chối review.
- Hoặc yêu cầu người dùng chỉnh sửa nội dung.
""".formatted(decision.reason, formatViolationMarkdown(decision.violations));
        }

        if ("NEED_REVIEW".equals(decision.decision)) {
            return """
# ⚠️ Kết quả phân tích Review

| Mục | Kết quả |
|---|---|
| Đề xuất | Cần admin xem lại |
| Mức rủi ro | Trung bình |
| Lý do chính | %s |

## Vi phạm / điểm cần kiểm tra
%s
""".formatted(decision.reason, formatViolationMarkdown(decision.violations));
        }

        return """
# ✅ Kết quả phân tích Review

| Mục | Kết quả |
|---|---|
| Đề xuất | Có thể duyệt |
| Mức rủi ro | Thấp |
| Lý do chính | %s |

## Khuyến nghị
- Có thể duyệt nếu nội dung đúng thực tế.
""".formatted(decision.reason);
    }

    // Giữ method cũ để các nơi khác trong project vẫn gọi được.
    public AIReviewPreviewResponse analyzeReviewBatch(List<Review> reviews) {
        return analyzeReviewBatch(reviews, null, null, null);
    }

    // Method mới: nhận checklist/prompt từ frontend. Hiện tại dùng rule-based tiếng Việt bám checklist.
    // Sau này nếu bạn nối OpenAI/Gemini thật, chỉ cần dùng moderationPrompt/checklist ở đây để build prompt.
    public AIReviewPreviewResponse analyzeReviewBatch(
            List<Review> reviews,
            String moderationPrompt,
            List<Map<String, Object>> checklist,
            List<Map<String, Object>> decisionGuide
    ) {
        List<String> approveIds = new ArrayList<>();
        List<String> rejectIds = new ArrayList<>();
        List<String> manualIds = new ArrayList<>();
        List<AIReviewPreviewResponse.AIReviewDecisionItem> items = new ArrayList<>();

        for (Review review : reviews) {
            String comment = review.getComment() == null ? "" : review.getComment().trim();
            double rating = review.getRating() == null ? 0 : review.getRating();

            ModerationDecision result = moderate(comment, rating);

            if ("APPROVE".equals(result.decision)) {
                approveIds.add(review.getId());
            } else if ("REJECT".equals(result.decision)) {
                rejectIds.add(review.getId());
            } else {
                manualIds.add(review.getId());
            }

            items.add(
                    AIReviewPreviewResponse.AIReviewDecisionItem.builder()
                            .id(review.getId())
                            .action(result.action)
                            .decision(result.decision)
                            .confidence(result.confidence)
                            .reason(result.reason)
                            .violations(result.violations)
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

Đã hỗ trợ backend AI moderation theo checklist.

## API đã dùng
- POST /api/admin/review-ai/ai-preview
- POST /api/admin/review-ai/ai-apply
- POST /api/admin/review-ai/bulk-approve
- POST /api/admin/review-ai/bulk-reject

## Luồng xử lý
1. AI đọc review đang pending.
2. AI phân loại: nên duyệt, nên từ chối, cần admin xem.
3. AI trả reason + violations bám checklist.
4. Admin xác nhận.
5. Hệ thống mới duyệt hoặc từ chối hàng loạt.
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

    private ModerationDecision moderate(String comment, double rating) {
        String original = comment == null ? "" : comment.trim();
        String text = normalizeVietnamese(original);
        List<String> violations = new ArrayList<>();

        if (original.isBlank()) {
            violations.add("C7 - Review chưa có nội dung rõ ràng để xác định trải nghiệm thật");
            return new ModerationDecision(
                    "NEED_REVIEW",
                    "manual",
                    60,
                    "Review chưa có nội dung rõ ràng nên cần admin xem lại theo C7.",
                    violations
            );
        }

        boolean toxic = hasProfanityOrToxicWords(original);

        boolean political = matches(text,
                "\\b(chinh tri|dang phai|tuyen truyen|cach mang|che do|phan dong|cong kich chinh tri|lanh dao nha nuoc)\\b"
        );

        boolean discrimination = matches(text,
                "\\b(bac ky|nam ky|trung ky|phan biet vung mien|dan toc|ton giao|quoc tich|gioi tinh)\\b",
                "\\b(nguoi mien bac|nguoi mien nam|dan bac|dan nam|dan .* deu)\\b"
        );

        boolean spam = matches(original.toLowerCase(Locale.ROOT),
                "https?://",
                "www\\.",
                "\\.com\\b",
                "\\.vn\\b",
                "zalo",
                "telegram",
                "facebook",
                "fb\\.com",
                "casino",
                "ca cuoc",
                "lien he",
                "inbox",
                "ib ngay",
                "khuyen mai",
                "giam gia"
        ) || Pattern.compile("\\b(0|\\+84)(\\d[\\s.-]?){8,10}\\b").matcher(original).find();

        boolean personalInfo = matches(text,
                "\\b(cccd|cmnd|can cuoc|so dien thoai rieng|dia chi nha|email ca nhan|bien so xe|stk|tai khoan ngan hang)\\b"
        ) || Pattern.compile("[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}").matcher(original).find();

        boolean seriousAccusation = matches(text,
                "\\b(lua dao|an cap|trom cap|hanh hung|danh khach|quay roi|sam so|de doa|bao hanh|vi pham phap luat|cuop|bat coc)\\b"
        );

        boolean meaningfulShortReview = isMeaningfulShortReview(original);
        boolean meaninglessReview = isMeaninglessReview(original);

        boolean hasSpecificExperience = matches(text,
                "\\b(tai xe|nhan vien|le tan|phong|xe|ghe|ve|chuyen|gio|don|tra|khach san|tour|tau|may bay|hanh ly|dat phong|dat ve|cabin|giuong|tv|rong rai|hong|bat tien|khong goi khach|phuc vu|cham|tre|sach|ban|on|dat|re)\\b"
        ) || original.length() >= 25;

        if (toxic) violations.add("C1 - Có từ ngữ thô tục, toxic hoặc xúc phạm cá nhân");
        if (political) violations.add("C2 - Có nội dung chính trị, tuyên truyền hoặc công kích chính trị");
        if (discrimination) violations.add("C3 - Có dấu hiệu phân biệt vùng miền, dân tộc, giới tính, tôn giáo, quốc tịch hoặc nhóm người");
        if (spam) violations.add("C4 - Có dấu hiệu spam, quảng cáo, link hoặc số điện thoại không phù hợp");
        if (personalInfo) violations.add("C5 - Có dấu hiệu tiết lộ thông tin cá nhân nhạy cảm");
        if (seriousAccusation) violations.add("C6 - Có cáo buộc nghiêm trọng cần kiểm tra bằng chứng/ngữ cảnh");

        boolean hasRejectViolation = violations.stream().anyMatch(v ->
                v.startsWith("C1") ||
                v.startsWith("C2") ||
                v.startsWith("C3") ||
                v.startsWith("C4") ||
                v.startsWith("C5")
        );

        if (hasRejectViolation) {
            String codes = joinViolationCodes(violations, false);
            return new ModerationDecision(
                    "REJECT",
                    "reject",
                    94,
                    "Review vi phạm checklist " + codes + " nên AI đề xuất từ chối.",
                    violations
            );
        }

        if (seriousAccusation) {
            return new ModerationDecision(
                    "NEED_REVIEW",
                    "manual",
                    76,
                    "Review có cáo buộc nghiêm trọng nhưng chưa đủ bằng chứng/ngữ cảnh, cần admin xem lại theo C6.",
                    violations
            );
        }

        // C7: review ngắn nhưng có nghĩa thật vẫn được duyệt, ví dụ: Tốt, Ổn, Ok, Không hài lòng, Phục vụ chậm...
        if (meaningfulShortReview) {
            return new ModerationDecision(
                    "APPROVE",
                    "approve",
                    88,
                    "Review ngắn nhưng có ý nghĩa rõ ràng, không vi phạm checklist C1-C6 và phù hợp quy tắc C7.",
                    List.of()
            );
        }

        // Nội dung vô nghĩa/rỗng/lặp ký tự thì giữ lại cho admin xem, không reject thẳng.
        if (meaninglessReview) {
            return new ModerationDecision(
                    "NEED_REVIEW",
                    "manual",
                    60,
                    "Review quá mơ hồ hoặc không có ý nghĩa rõ ràng nên cần admin xem lại theo C7.",
                    List.of("C7 - Review quá mơ hồ hoặc không có ý nghĩa rõ ràng")
            );
        }

        if (rating <= 2) {
            return new ModerationDecision(
                    "APPROVE",
                    "approve",
                    hasSpecificExperience ? 90 : 84,
                    hasSpecificExperience
                            ? "Review tiêu cực nhưng lịch sự, có trải nghiệm cụ thể và không vi phạm checklist C1-C6 nên được duyệt theo C7."
                            : "Review tiêu cực nhưng không vi phạm checklist C1-C6; nội dung vẫn có ý nghĩa nên được duyệt theo C7.",
                    List.of()
            );
        }

        if (rating >= 4) {
            return new ModerationDecision(
                    "APPROVE",
                    "approve",
                    92,
                    "Review tích cực, không phát hiện vi phạm checklist nên có thể duyệt.",
                    List.of()
            );
        }

        return new ModerationDecision(
                "APPROVE",
                "approve",
                88,
                "Review không vi phạm checklist; nếu có góp ý/chê dịch vụ thì vẫn ở mức lịch sự nên có thể duyệt theo C7.",
                List.of()
        );
    }

    private boolean hasProfanityOrToxicWords(String value) {
        if (value == null) return false;

        String originalLower = value.toLowerCase(Locale.ROOT);
        String text = normalizeVietnamese(value);
        if (text.isBlank()) return false;

        /*
         * C1 chỉ bắt từ chửi tục/xúc phạm thật.
         * Lưu ý quan trọng: KHÔNG check "cac" hoặc "lon" trên chuỗi đã bỏ dấu.
         * Vì "các" -> "cac" và "lớn/lộn/lòn..." -> "lon", sẽ làm AI từ chối nhầm review bình thường.
         * Ví dụ: "các chức năng trong cabin bị hỏng" là phàn nàn dịch vụ hợp lệ, không phải toxic.
         */
        boolean explicitVietnameseProfanity = Pattern.compile(
                "\\b(địt|đụ|đm|đmm|đcm|đéo|lồn|cặc|cút|mẹ mày|óc chó|súc vật|mất dạy|khốn nạn|rác rưởi)\\b",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
        ).matcher(originalLower).find();

        if (explicitVietnameseProfanity) return true;

        // Bản không dấu chỉ giữ các cụm/viết tắt ít gây nhầm với từ tiếng Việt thông thường.
        return matches(text,
                "\\b(dm|dmm|dcm|dcmn|vcl|vl|cc|cl|dit|du ma|me may|oc cho|suc vat|mat day|khon nan|bien di|rac ruoi)\\b",
                "\\b(cho chet|chet di|do rac|thang ngu|con ngu|ngu nhu|loai ngu)\\b"
        );
    }

    private boolean isMeaningfulShortReview(String value) {
        String text = normalizeVietnamese(value);
        if (text.isBlank()) return false;

        List<String> exactMeaningful = List.of(
                "ok",
                "oke",
                "okay",
                "on",
                "tam on",
                "tot",
                "rat tot",
                "duoc",
                "tam duoc",
                "hai long",
                "khong hai long",
                "dich vu tot",
                "xe sach",
                "khach san dep",
                "nhan vien tot",
                "nhan vien nhiet tinh",
                "phuc vu tot",
                "phuc vu cham",
                "di on",
                "te",
                "qua te",
                "kem",
                "cham",
                "tre",
                "dat",
                "re",
                "ban",
                "on ao",
                "bat tien",
                "khong tot"
        );

        if (exactMeaningful.contains(text)) return true;

        String[] words = text.split("\\s+");
        if (words.length <= 7) {
            return matches(text,
                    "\\b(ok|oke|okay|tot|on|duoc|hai long|khong hai long|sach|dep|cham|tre|dat|re|te|kem|ban|bat tien|phuc vu|nhiet tinh|than thien|khong tot|khong on)\\b"
            );
        }

        return false;
    }

    private boolean isMeaninglessReview(String value) {
        String raw = value == null ? "" : value.trim();
        String text = normalizeVietnamese(raw);

        if (text.isBlank()) return true;
        if (raw.matches("^[.\\-_,!?:;\\s]+$")) return true;
        if (text.matches("^\\d+$")) return true;

        List<String> meaningless = List.of(
                "test",
                "abc",
                "abcd",
                "aaa",
                "aaaa",
                "hhhh",
                "kkkk",
                "kkk",
                "asdf",
                "qwerty"
        );

        if (meaningless.contains(text)) return true;
        if (text.matches("^(.)\\1{3,}$")) return true;
        if (text.matches("^(ok\\s*){4,}$")) return true;

        return false;
    }

    private boolean matches(String text, String... regexes) {
        if (text == null || text.isBlank()) return false;

        for (String regex : regexes) {
            if (Pattern.compile(regex, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(text).find()) {
                return true;
            }
        }

        return false;
    }

    private String normalizeVietnamese(String value) {
        if (value == null) return "";

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);

        return normalized.replaceAll("[^a-z0-9@:/._+\\-\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String joinViolationCodes(List<String> violations, boolean includeC6) {
        List<String> codes = violations.stream()
                .map(v -> v == null ? "" : v.trim())
                .filter(v -> !v.isBlank())
                .filter(v -> includeC6 || !v.startsWith("C6"))
                .map(v -> v.length() >= 2 ? v.substring(0, 2) : v)
                .distinct()
                .toList();

        return codes.isEmpty() ? "" : String.join(", ", codes);
    }

    private String formatViolationMarkdown(List<String> violations) {
        if (violations == null || violations.isEmpty()) {
            return "- Không phát hiện lỗi trong checklist.";
        }

        StringBuilder sb = new StringBuilder();
        for (String violation : violations) {
            sb.append("- ").append(violation).append("\n");
        }
        return sb.toString().trim();
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

    private static class ModerationDecision {
        private final String decision;
        private final String action;
        private final double confidence;
        private final String reason;
        private final List<String> violations;

        private ModerationDecision(String decision, String action, double confidence, String reason, List<String> violations) {
            this.decision = decision;
            this.action = action;
            this.confidence = confidence;
            this.reason = reason;
            this.violations = violations == null ? List.of() : violations;
        }
    }
}
