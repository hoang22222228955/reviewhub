package com.doan.reviewhub.service;

import com.doan.reviewhub.entity.Plan;
import com.doan.reviewhub.entity.PurchaseHistory;
import com.doan.reviewhub.entity.Review;
import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.PlanRepository;
import com.doan.reviewhub.repository.PurchaseHistoryRepository;
import com.doan.reviewhub.repository.ReviewRepository;
import com.doan.reviewhub.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PartnerAIService {

    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final PurchaseHistoryRepository purchaseHistoryRepository;
    private final ReviewRepository reviewRepository;

    @Value("${ai.openai.api-key:DEMO}")
    private String apiKey;

    @Value("${ai.openai.model:gpt-4.1-mini}")
    private String model;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .readTimeout(90, TimeUnit.SECONDS)
            .build();

    public record PartnerAIAccess(
            boolean eligible,
            String planName,
            String message
    ) {}

    public PartnerAIAccess checkAccess(User authUser) {
        if (authUser == null) {
            return new PartnerAIAccess(false, "", "Bạn cần đăng nhập bằng tài khoản partner.");
        }

        User user = userRepository.findById(authUser.getId()).orElse(authUser);

        if (user.getRole() == null || !user.getRole().equalsIgnoreCase("partner")) {
            return new PartnerAIAccess(false, "", "Partner AI chỉ dành cho tài khoản partner.");
        }

        if (user.getPlanExpiresAt() != null && user.getPlanExpiresAt().isBefore(Instant.now())) {
            return new PartnerAIAccess(false, getCurrentPlanName(user), "Gói hiện tại đã hết hạn, cần gia hạn gói Doanh nghiệp để dùng Partner AI.");
        }

        String currentPlanName = getCurrentPlanName(user);

        if (isEligiblePlan(user.getCurrentPlanId(), currentPlanName) || isEligiblePlan("", user.getMembershipLabel())) {
            return new PartnerAIAccess(true, currentPlanName, "Tài khoản đủ điều kiện dùng Partner AI.");
        }

        List<PurchaseHistory> purchases = purchaseHistoryRepository.findByUserIdOrderByPurchasedAtDesc(user.getId());

        for (PurchaseHistory history : purchases) {
            if (!isPaid(history.getStatus())) continue;

            Plan plan = planRepository.findById(history.getPlanId()).orElse(null);
            String planName = plan != null ? plan.getName() : history.getPlanId();

            if (isEligiblePlan(history.getPlanId(), planName)) {
                return new PartnerAIAccess(true, planName, "Tài khoản đã từng mua gói đủ điều kiện dùng Partner AI.");
            }
        }

        return new PartnerAIAccess(
                false,
                currentPlanName,
                "Partner AI chỉ mở cho gói Doanh nghiệp hoặc Doanh nghiệp lớn."
        );
    }

    public String chat(
            User authUser,
            String message,
            String path,
            String pageTitle,
            String partnerContext
    ) throws Exception {
        User user = userRepository.findById(authUser.getId()).orElse(authUser);
        String text = message == null ? "" : message.trim();

        if (text.isBlank()) {
            return "Bạn hãy nhập nội dung cần Partner AI hỗ trợ.";
        }

        if (shouldUseLocalTool(text)) {
            return handlePartnerQuestion(user, text);
        }

        if (apiKey == null || apiKey.isBlank() || apiKey.equals("DEMO")) {
            return """
# 🤖 Partner AI Pro

Backend chưa cấu hình `OPENAI_API_KEY`.

Tôi vẫn có thể trả lời nhanh bằng dữ liệu nội bộ cho:
- Quota hiện tại
- Gói đang dùng
- SLA review riêng
- API key
- Cách tăng thêm review
- Bảo mật / chi phí gửi review
- Báo cáo review và sơ đồ thống kê

Bạn có thể hỏi: **"Tổng hợp review viết báo cáo cho tôi"**
""";
        }

        String prompt = """
Bạn là Partner AI Pro của hệ thống ReviewHub.

Bạn chỉ hỗ trợ partner đang đăng nhập, không hỗ trợ quyền admin.

Thông tin partner hiện tại:
%s

Ngữ cảnh frontend:
- URL: %s
- Tên trang: %s
- Context frontend gửi lên: %s

Phạm vi hỗ trợ:
1. Giải thích quota, gói dịch vụ, quyền lợi của partner.
2. Hướng dẫn dùng API key, lấy review, gửi review riêng cho admin.
3. Giải thích trạng thái SLA: chờ duyệt, đã duyệt, từ chối.
4. Gợi ý phản hồi khách hàng lịch sự, chuyên nghiệp.
5. Gợi ý cách cải thiện chất lượng dịch vụ dựa trên nội dung review partner cung cấp.
6. Trả lời rõ về bảo mật dữ liệu và chi phí theo quota/gói.

Quy tắc:
- Trả lời tiếng Việt.
- Trả lời gọn, rõ, đúng vai trò partner.
- Không bịa dữ liệu hệ thống nếu không có trong thông tin partner.
- Không được nói mình đã duyệt, từ chối, sửa, xóa dữ liệu.
- Không được tiết lộ dữ liệu của partner khác.
- Nếu partner hỏi việc vượt quyền admin, hãy nói thao tác đó chỉ admin thực hiện được.

Tin nhắn partner:
%s
""".formatted(buildPartnerContext(user), path, pageTitle, partnerContext, text);

        String jsonBody = """
        {
          "model": "%s",
          "input": %s
        }
        """.formatted(model, toJsonString(prompt));

        Request request = new Request.Builder()
                .url("https://api.openai.com/v1/responses")
                .addHeader("Authorization", "Bearer " + apiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(jsonBody, MediaType.get("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body() != null
                    ? response.body().string()
                    : "";

            if (!response.isSuccessful()) {
                return "OpenAI Error " + response.code() + ": " + responseBody;
            }

            return extractOpenAIText(responseBody);
        }
    }

    private String extractOpenAIText(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);

            JsonNode outputText = root.get("output_text");
            if (outputText != null && !outputText.asText().isBlank()) {
                return outputText.asText();
            }

            JsonNode output = root.get("output");
            if (output != null && output.isArray()) {
                for (JsonNode item : output) {
                    JsonNode content = item.get("content");
                    if (content != null && content.isArray()) {
                        for (JsonNode contentItem : content) {
                            JsonNode text = contentItem.get("text");
                            if (text != null && !text.asText().isBlank()) {
                                return text.asText();
                            }
                        }
                    }
                }
            }

            return responseBody;
        } catch (Exception e) {
            return responseBody;
        }
    }

    private boolean shouldUseLocalTool(String message) {
        String lower = normalize(message);

        return lower.contains("quota") ||
                lower.contains("goi") ||
                lower.contains("plan") ||
                lower.contains("sla") ||
                lower.contains("api key") ||
                lower.contains("apikey") ||
                lower.contains("api") ||
                lower.contains("lay review") ||
                lower.contains("them review") ||
                lower.contains("co them rv") ||
                lower.contains("muon co them") ||
                lower.contains("bao mat") ||
                lower.contains("an toan") ||
                lower.contains("chi phi") ||
                lower.contains("tinh phi") ||
                lower.contains("han su dung") ||
                lower.contains("con bao nhieu ngay") ||
                lower.contains("het han") ||
                lower.contains("uu dai") ||
                lower.contains("khach quen") ||
                lower.contains("mua nhieu") ||
                lower.contains("gia han") ||
                lower.contains("nang goi") ||
                lower.contains("cong dung") ||
                lower.contains("cac muc") ||
                lower.contains("bao cao") ||
                lower.contains("tong hop") ||
                lower.contains("ai phan tich") ||
                lower.contains("phan tich review") ||
                lower.contains("tom tat nhanh") ||
                lower.contains("thong ke") ||
                lower.contains("xuat bieu") ||
                lower.contains("so do") ||
                lower.contains("bieu do") ||
                lower.contains("phan hoi khach") ||
                lower.contains("tra loi khach") ||
                lower.contains("khach phan nan") ||
                lower.contains("review") ||
                lower.contains("xin chao") ||
                lower.equals("chao") ||
                lower.equals("hi") ||
                lower.equals("hello");
    }

    private String handlePartnerQuestion(User user, String message) {
        String lower = normalize(message);

        if (
                lower.contains("xin chao") ||
                lower.equals("chao") ||
                lower.equals("hi") ||
                lower.equals("hello")
        ) {
            return """
# 👋 Partner AI Pro

Xin chào, tôi là trợ lý AI riêng cho partner dùng gói Doanh nghiệp.

Bạn có thể hỏi tôi về:
- Quota còn lại
- Hạn sử dụng gói còn bao nhiêu ngày
- Ưu đãi khi mua nhiều / khách quen
- SLA review riêng
- API key
- Tổng hợp review / viết báo cáo
- Sơ đồ thống kê review
- Bảo mật và chi phí khi gửi review
- Cách phản hồi khách hàng
""";
        }

        if (
                lower.contains("quota") &&
                (
                        lower.contains("han su dung") ||
                        lower.contains("han goi") ||
                        lower.contains("con bao nhieu ngay") ||
                        lower.contains("het han")
                )
        ) {
            return buildPlanQuotaAnswer(user);
        }

        // API key đặt trước SLA/review để câu "API key để lấy review" không bị trả nhầm sang SLA.
        if (lower.contains("api key") || lower.contains("apikey") || lower.contains("api") || lower.contains("lay review")) {
            return """
# 🔑 Hướng dẫn dùng API key để lấy review

API key dùng để hệ thống ngoài truy cập dữ liệu review/quota của đúng partner.

## Cách dùng cơ bản

1. Vào mục **Khóa API** trong sidebar partner.
2. Sao chép API key đang hoạt động.
3. Khi gọi API, gửi key theo header mà backend quy định, thường là:

```http
Authorization: Bearer <API_KEY>
```

hoặc:

```http
x-api-key: <API_KEY>
```

## Lưu ý bảo mật

- Không gửi API key lên ảnh chụp màn hình công khai.
- Không đưa API key cho người ngoài hệ thống.
- Nếu nghi ngờ lộ key, liên hệ admin để cấp lại.
- API chỉ nên lấy dữ liệu thuộc dịch vụ/tài khoản partner của bạn.
""";
        }

        if (lower.contains("quota")) {
            int total = user.getQuotaTotal() == null ? 0 : user.getQuotaTotal();
            int used = user.getQuotaUsed() == null ? 0 : user.getQuotaUsed();
            int remaining = Math.max(total - used, 0);
            int percent = total > 0 ? Math.min(100, Math.round((used * 100f) / total)) : 0;

            return """
# 📊 Quota của bạn

| Chỉ số | Giá trị |
|---|---:|
| Tổng quota | %s |
| Đã dùng | %s |
| Còn lại | %s |
| Tỷ lệ đã dùng | %s%% |

Gợi ý: nếu quota gần hết, bạn nên gia hạn hoặc nâng gói để tránh gián đoạn việc lấy review/API.
""".formatted(formatNumber(total), formatNumber(used), formatNumber(remaining), percent);
        }

        if (
                lower.contains("han su dung") ||
                lower.contains("con bao nhieu ngay") ||
                lower.contains("het han") ||
                lower.contains("gia han")
        ) {
            return buildPlanExpiryAnswer(user);
        }

        if (
                lower.contains("uu dai") ||
                lower.contains("khach quen") ||
                lower.contains("mua nhieu") ||
                lower.contains("nang goi")
        ) {
            return """
# 🎁 Mua nhiều có ưu đãi cho khách hàng quen không?

Thông thường có thể áp dụng theo 3 hướng:

1. **Mua chu kỳ dài hơn**  
   Partner mua theo quý/năm thường dễ được chiết khấu tốt hơn so với mua từng tháng.

2. **Nâng lên gói cao hơn**  
   Nếu bạn dùng nhiều quota hoặc nhiều dịch vụ, gói Doanh nghiệp/Doanh nghiệp lớn sẽ tối ưu hơn.

3. **Ưu đãi khách hàng quen**  
   Nếu partner gia hạn đều, mua nhiều dịch vụ hoặc có nhu cầu quota lớn, bạn nên liên hệ admin để được báo giá riêng.

Gợi ý: bạn có thể hỏi admin trong mục **Hỗ trợ từ Admin** với nội dung:  
**“Tôi muốn mua thêm quota/gia hạn dài hạn, có ưu đãi khách hàng quen không?”**
""";
        }

        if (lower.contains("goi") || lower.contains("plan") || lower.contains("mua") || lower.contains("thanh toan")) {
            return """
# 💼 Gói partner hiện tại

| Mục | Thông tin |
|---|---|
| Gói | %s |
| Mã gói | %s |
| Ngày kích hoạt | %s |
| Ngày hết hạn | %s |
| Quyền Partner AI | Đã mở |

Partner AI chỉ dành cho gói **Doanh nghiệp / Doanh nghiệp lớn**.
""".formatted(
                    safe(getCurrentPlanName(user)),
                    safe(user.getCurrentPlanId()),
                    formatDate(user.getPlanActivatedAt()),
                    formatDate(user.getPlanExpiresAt())
            );
        }

        if (lower.contains("them review") || lower.contains("co them rv") || lower.contains("muon co them") || lower.contains("them rv")) {
            return """
# ⭐ Muốn có thêm review thì làm như nào?

Bạn nên tăng review thật theo 4 cách:

1. **Gửi link đánh giá sau khi khách dùng dịch vụ**  
   Gửi qua SMS/Zalo/email sau chuyến đi hoặc sau khi hoàn tất dịch vụ.

2. **Đặt QR đánh giá tại điểm chạm khách hàng**  
   Ví dụ: quầy vé, xe, khách sạn, email xác nhận, hóa đơn.

3. **Nhắc khách đúng thời điểm**  
   Nên nhắc sau khi trải nghiệm xong 15–60 phút, không nhắc quá nhiều lần.

4. **Phản hồi review cũ chuyên nghiệp**  
   Khách mới sẽ tin hơn khi thấy partner phản hồi rõ ràng và có trách nhiệm.

Không nên tự tạo review ảo hàng loạt vì dễ làm mất uy tín và có thể bị admin từ chối nếu nội dung không phù hợp.
""";
        }

        if (lower.contains("bao mat") || lower.contains("an toan") || lower.contains("chi phi") || lower.contains("tinh phi")) {
            return """
# 🔐 Gửi review có an toàn, bảo mật và có bị tính phí không?

## Bảo mật
- Review riêng partner gửi chỉ gắn với tài khoản/dịch vụ của partner.
- Review đang chờ duyệt không tự public.
- Review riêng chỉ hiển thị đúng tài khoản sau khi admin duyệt.
- Dữ liệu không được chia sẻ cho partner khác.

## Chi phí / quota
- Việc gửi và xử lý review có thể tính theo **quota/gói dịch vụ** tùy cấu hình hệ thống.
- Nếu gói còn quota, hệ thống xử lý trong phạm vi quota.
- Nếu hết quota, partner cần gia hạn hoặc nâng gói để tiếp tục sử dụng ổn định.

## Lời khuyên
Nên gửi review thật, có nội dung rõ ràng, tránh spam hoặc nội dung công kích để tăng tỷ lệ được duyệt.
""";
        }

        if (lower.contains("cong dung") || lower.contains("cac muc") || lower.contains("sidebar") || lower.contains("trang partner")) {
            return """
# 🧭 Công dụng các mục trong khu vực partner

| Mục | Công dụng |
|---|---|
| Tổng quan | Xem nhanh gói, quota, dữ liệu chính và trạng thái tài khoản |
| Khóa API | Lấy API key để tích hợp lấy review/quota từ hệ thống ngoài |
| Gửi review | Gửi review riêng lên admin kiểm duyệt |
| Lấy review | Tra cứu danh sách review đã được phép xem |
| Theo dõi SLA | Xem review riêng đang chờ duyệt, đã duyệt hoặc bị từ chối |
| Mở rộng Domain | Quản lý/tích hợp domain riêng nếu gói hỗ trợ |
| Đặc quyền đối tác | Xem quyền lợi theo gói đang mua |
| Lịch sử mua gói | Theo dõi giao dịch, trạng thái thanh toán và gói đã mua |
""";
        }

        if (
                lower.contains("ai phan tich") ||
                lower.contains("phan tich review") ||
                lower.contains("tom tat nhanh")
        ) {
            return buildShortReviewAnalysis(user);
        }

        if (lower.contains("bao cao") || lower.contains("tong hop")) {
            return buildReviewReport(user);
        }

        if (lower.contains("thong ke") || lower.contains("so do") || lower.contains("bieu do")) {
            return buildReviewChart(user);
        }

        if (lower.contains("phan hoi khach") || lower.contains("tra loi khach") || lower.contains("khach phan nan") || lower.contains("den tre") || lower.contains("tre gio")) {
            return """
# Mẫu phản hồi khách hàng

Chào anh/chị, cảm ơn anh/chị đã dành thời gian phản hồi về trải nghiệm vừa qua.

Chúng tôi rất tiếc vì việc xe đến trễ đã làm ảnh hưởng đến kế hoạch của anh/chị. Bộ phận vận hành sẽ kiểm tra lại lịch trình, khâu điều phối và thông tin thông báo cho khách để hạn chế tình trạng này trong các chuyến tiếp theo.

Mong anh/chị thông cảm và tiếp tục góp ý để chúng tôi cải thiện chất lượng dịch vụ tốt hơn.

Trân trọng.
""";
        }

        if (lower.contains("sla") || lower.contains("review")) {
            return """
# ⭐ SLA review riêng

Luồng xử lý review partner gửi:

1. **Partner gửi review**  
   Review xuất hiện trong SLA với trạng thái **Chờ duyệt**.

2. **Admin kiểm duyệt**  
   Admin duyệt hoặc từ chối trong trang kiểm duyệt.

3. **Partner xem kết quả**  
   SLA đổi sang **Đã duyệt** hoặc **Từ chối**. Nếu backend lưu lý do, partner sẽ thấy lý do từ chối.

Lưu ý: review riêng của partner chỉ hiển thị cho đúng tài khoản sau khi admin duyệt.
""";
        }

        return """
# Partner AI Pro

Tôi có thể hỗ trợ bạn về quota, gói dịch vụ, SLA review riêng, API key, bảo mật dữ liệu, chi phí, báo cáo review và cách phản hồi khách hàng.

Bạn có thể hỏi:
- "Tổng hợp review viết báo cáo cho tôi"
- "Xuất sơ đồ thống kê review"
- "Tôi muốn có thêm review thì làm như nào?"
- "Gửi review có an toàn và có bị tính phí không?"
""";
    }



    private String buildPlanQuotaAnswer(User user) {
        int total = user.getQuotaTotal() == null ? 0 : user.getQuotaTotal();
        int used = user.getQuotaUsed() == null ? 0 : user.getQuotaUsed();
        int remaining = Math.max(total - used, 0);
        int percent = total > 0 ? Math.min(100, Math.round((used * 100f) / total)) : 0;

        Instant expiresAt = user.getPlanExpiresAt();
        String remainText = "Chưa có dữ liệu";
        String note = "Bạn có thể kiểm tra thêm trong Hồ sơ hoặc Lịch sử mua gói.";

        if (expiresAt != null) {
            long days = ChronoUnit.DAYS.between(Instant.now(), expiresAt);
            long safeDays = Math.max(days, 0);
            remainText = safeDays + " ngày";

            if (days < 0) {
                note = "Gói có thể đã hết hạn, bạn nên gia hạn để tránh gián đoạn.";
            } else if (safeDays <= 7) {
                note = "Gói sắp hết hạn, bạn nên gia hạn sớm.";
            } else {
                note = "Gói vẫn còn thời gian sử dụng ổn định.";
            }
        }

        return """
# 📌 Hạn gói & quota

| Mục | Thông tin |
|---|---:|
| Gói hiện tại | %s |
| Hạn còn lại | %s |
| Tổng quota | %s |
| Đã dùng | %s |
| Còn lại | %s |
| Tỷ lệ đã dùng | %s%% |

%s
""".formatted(
                safe(getCurrentPlanName(user)),
                remainText,
                formatNumber(total),
                formatNumber(used),
                formatNumber(remaining),
                percent,
                note
        );
    }

    private String buildPlanExpiryAnswer(User user) {
        Instant expiresAt = user.getPlanExpiresAt();

        if (expiresAt == null) {
            return """
# ⏳ Hạn sử dụng gói

Hiện tài khoản chưa có ngày hết hạn gói rõ ràng trong hệ thống.

Bạn nên kiểm tra thêm ở:
- Trang **Hồ sơ / Gói dịch vụ**
- Trang **Lịch sử mua gói**
- Hoặc nhắn **Hỗ trợ từ Admin** để admin kiểm tra hạn gói chính xác.
""";
        }

        long days = ChronoUnit.DAYS.between(Instant.now(), expiresAt);
        long safeDays = Math.max(days, 0);

        String note = days < 0
                ? "Gói có thể đã hết hạn, bạn nên gia hạn để tránh gián đoạn."
                : safeDays <= 7
                    ? "Gói sắp hết hạn, bạn nên gia hạn sớm để không ảnh hưởng API/quota."
                    : "Gói vẫn còn thời gian sử dụng.";

        return """
# ⏳ Hạn sử dụng gói của bạn

| Mục | Thông tin |
|---|---|
| Gói hiện tại | %s |
| Ngày kích hoạt | %s |
| Ngày hết hạn | %s |
| Còn lại | %s ngày |

%s

Nếu muốn dùng nhiều hơn, bạn có thể:
- Gia hạn chu kỳ dài hơn.
- Nâng lên gói cao hơn để có thêm quota.
- Nhắn admin để hỏi ưu đãi khách hàng quen hoặc mua nhiều dịch vụ.
""".formatted(
                safe(getCurrentPlanName(user)),
                formatDate(user.getPlanActivatedAt()),
                formatDate(user.getPlanExpiresAt()),
                formatNumber(safeDays),
                note
        );
    }


    public Map<String, Object> buildReviewStats(User authUser) {
        User user = userRepository.findById(authUser.getId()).orElse(authUser);
        List<Review> reviews = getPartnerReviews(user);

        long total = reviews.size();
        long good = reviews.stream().filter(r -> rating(r) >= 4).count();
        long bad = reviews.stream().filter(r -> rating(r) <= 2).count();
        long neutral = Math.max(total - good - bad, 0);
        double average = reviews.stream().mapToDouble(this::rating).average().orElse(0);

        List<Map<String, Object>> ratingRows = new ArrayList<>();

        for (int star = 5; star >= 1; star--) {
            final int ratingValue = star;
            long count = reviews.stream()
                    .filter(r -> Math.round(rating(r)) == ratingValue)
                    .count();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("rating", star);
            row.put("count", count);
            row.put("percent", total > 0 ? Math.round((count * 100.0) / total) : 0);
            ratingRows.add(row);
        }

        List<String> goodTopics = topTopics(reviews.stream().filter(r -> rating(r) >= 4).toList());
        List<String> badTopics = topTopics(reviews.stream().filter(r -> rating(r) <= 2).toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", total);
        result.put("good", good);
        result.put("bad", bad);
        result.put("neutral", neutral);
        result.put("averageRating", Math.round(average * 10.0) / 10.0);
        result.put("ratingRows", ratingRows);
        result.put("goodTopics", goodTopics);
        result.put("badTopics", badTopics);
        result.put("suggestions", buildReviewSuggestions(good, bad, neutral, total, badTopics));


        return result;
    }

    /**
     * Dùng cho API nhúng ngoài website đối tác.
     * Chỉ trả dữ liệu tổng hợp, không trả danh sách raw review.
     */
    public Map<String, Object> buildEmbedReviewSummary(User authUser, String targetCode) {
        User user = userRepository.findById(authUser.getId()).orElse(authUser);
        String safeTargetCode = safe(targetCode).toUpperCase(Locale.ROOT);

        if (safeTargetCode.isBlank()) {
            throw new IllegalArgumentException("Vui lòng truyền targetCode.");
        }

        PartnerAIAccess access = checkAccess(user);

        if (!access.eligible()) {
            throw new SecurityException(access.message());
        }

        if (!canUseTargetCode(user, safeTargetCode)) {
            throw new SecurityException("API key không có quyền dùng AI Summary cho dịch vụ này.");
        }

        List<Review> reviews = reviewRepository.findAll()
                .stream()
                .filter(r -> isApproved(r.getModerationStatus()))
                .filter(this::isPublicApprovedReview)
                .filter(r -> reviewBelongsToTarget(r, safeTargetCode))
                .sorted(Comparator.comparing(Review::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(500)
                .toList();

        long total = reviews.size();
        long good = reviews.stream().filter(r -> rating(r) >= 4).count();
        long bad = reviews.stream().filter(r -> rating(r) <= 2).count();
        long neutral = Math.max(total - good - bad, 0);
        double average = reviews.stream().mapToDouble(this::rating).average().orElse(0);

        List<String> goodTopics = topTopics(reviews.stream().filter(r -> rating(r) >= 4).toList());
        List<String> badTopics = topTopics(reviews.stream().filter(r -> rating(r) <= 2).toList());
        List<String> suggestions = buildReviewSuggestions(good, bad, neutral, total, badTopics);

        String targetName = reviews.stream()
                .map(Review::getTargetName)
                .map(this::safe)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse(safeTargetCode);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("targetCode", safeTargetCode);
        result.put("targetName", targetName);
        result.put("totalReviews", total);
        result.put("averageRating", Math.round(average * 10.0) / 10.0);
        result.put("goodReviews", good);
        result.put("badReviews", bad);
        result.put("neutralReviews", neutral);
        result.put("goodPoints", goodTopics);
        result.put("badPoints", badTopics);
        result.put("suggestions", suggestions);
        result.put("source", "approved_public_reviews_summary");
        result.put("publicAnswerOnly", true);
        result.put("rawDataReturned", false);
        result.put("message", "AI Summary chỉ trả dữ liệu tổng hợp, không trả raw review.");

        return result;
    }

    private List<String> buildReviewSuggestions(long good, long bad, long neutral, long total, List<String> badTopics) {
        List<String> suggestions = new ArrayList<>();

        if (total <= 0) {
            suggestions.add("Chưa có đủ dữ liệu review để đưa ra khuyến nghị chính xác.");
            return suggestions;
        }

        double badRate = bad * 100.0 / total;

        if (badRate >= 35) {
            suggestions.add("Ưu tiên xử lý nhóm phản ánh tiêu cực vì tỷ lệ review cần theo dõi đang cao.");
        } else if (badRate >= 20) {
            suggestions.add("Theo dõi sát các phản ánh tiêu cực mới và xử lý sớm trước khi ảnh hưởng trải nghiệm chung.");
        } else {
            suggestions.add("Duy trì các điểm khách đang hài lòng và tiếp tục theo dõi review xấu mới.");
        }

        if (!badTopics.isEmpty()) {
            String mainTopic = cleanTopicName(badTopics.get(0));
            suggestions.add("Tập trung cải thiện nhóm: " + mainTopic + ".");
            suggestions.add(suggestionForTopic(mainTopic));
        }

        suggestions.add("Phản hồi review tiêu cực trong 24–48 giờ bằng giọng văn lịch sự, rõ trách nhiệm và có hướng xử lý.");

        return suggestions.stream()
                .filter(item -> item != null && !item.isBlank())
                .distinct()
                .limit(4)
                .toList();
    }

    private String cleanTopicName(String topic) {
        return safe(topic).replaceAll("\\s*\\(\\d+ review\\)$", "").trim();
    }

    private String suggestionForTopic(String topic) {
        String value = normalize(topic);

        if (value.contains("gio giac") || value.contains("dung gio")) {
            return "Rà soát lại lịch trình, giờ xuất phát/check-in và thông báo sớm cho khách khi có thay đổi.";
        }

        if (value.contains("phuc vu") || value.contains("nhan vien") || value.contains("tai xe")) {
            return "Tăng đào tạo thái độ phục vụ, quy trình giao tiếp và cách xử lý tình huống khi khách phản ánh.";
        }

        if (value.contains("gia") || value.contains("chi phi")) {
            return "Công khai giá, phụ phí và chính sách hoàn/hủy rõ ràng trước khi khách đặt dịch vụ.";
        }

        if (value.contains("ve sinh") || value.contains("sach")) {
            return "Tăng kiểm tra vệ sinh trước mỗi lượt phục vụ và ghi nhận nhanh các phản ánh về sạch sẽ.";
        }

        if (value.contains("trung chuyen") || value.contains("don tra")) {
            return "Rà soát điểm đón/trả, thời gian trung chuyển và chủ động cập nhật cho khách trước chuyến đi.";
        }

        if (value.contains("tien nghi") || value.contains("khong gian")) {
            return "Kiểm tra lại tiện nghi, ghế/giường/phòng và ưu tiên sửa các hạng mục khách nhắc nhiều.";
        }

        if (value.contains("an toan")) {
            return "Nhắc lại quy trình an toàn, kiểm tra phương tiện/thiết bị và giám sát chất lượng vận hành.";
        }

        if (value.contains("dat cho") || value.contains("ve") || value.contains("check")) {
            return "Đơn giản hóa quy trình đặt chỗ/check-in và gửi xác nhận rõ ràng cho khách.";
        }

        return "Xem lại nhóm phản ánh lặp lại nhiều lần để lập danh sách việc cần cải thiện theo mức độ ưu tiên.";
    }

    private String buildShortReviewAnalysis(User user) {
        Map<String, Object> stats = buildReviewStats(user);

        long total = Number.class.cast(stats.get("total")).longValue();
        long good = Number.class.cast(stats.get("good")).longValue();
        long bad = Number.class.cast(stats.get("bad")).longValue();
        long neutral = Number.class.cast(stats.get("neutral")).longValue();
        double average = Number.class.cast(stats.get("averageRating")).doubleValue();

        @SuppressWarnings("unchecked")
        List<String> goodTopics = (List<String>) stats.get("goodTopics");

        @SuppressWarnings("unchecked")
        List<String> badTopics = (List<String>) stats.get("badTopics");

        @SuppressWarnings("unchecked")
        List<String> suggestions = (List<String>) stats.get("suggestions");

        return """
# ✦ AI phân tích review

## Tổng quan nhanh

| Chỉ số | Giá trị |
|---|---:|
| Tổng review | %s |
| Điểm trung bình | %.1f/5 |
| Review tốt | %s |
| Review trung lập | %s |
| Review cần theo dõi | %s |

## Ưu điểm nổi bật

%s

## Nhược điểm cần cải thiện

%s

## Lời khuyên cho đối tác

%s
""".formatted(
                formatNumber(total),
                average,
                formatNumber(good),
                formatNumber(neutral),
                formatNumber(bad),
                formatTopicList(goodTopics),
                formatTopicList(badTopics),
                suggestions.stream().map(item -> "- " + item).collect(Collectors.joining("\n"))
        );
    }

    private String buildReviewReport(User user) {
        List<Review> reviews = getPartnerReviews(user);

        if (reviews.isEmpty()) {
            return """
# 📄 Báo cáo review

Hiện chưa có review phù hợp để tổng hợp báo cáo.

Bạn có thể:
- Vào mục **Lấy review** để kiểm tra dữ liệu đang được phép xem.
- Gửi thêm review thật từ khách hàng.
- Chờ admin duyệt các review đang ở trạng thái SLA.
""";
        }

        long total = reviews.size();
        long good = reviews.stream().filter(r -> rating(r) >= 4).count();
        long bad = reviews.stream().filter(r -> rating(r) <= 2).count();
        long neutral = Math.max(total - good - bad, 0);
        double avg = reviews.stream().mapToDouble(this::rating).average().orElse(0);

        List<String> goodTopics = topTopics(reviews.stream().filter(r -> rating(r) >= 4).toList());
        List<String> badTopics = topTopics(reviews.stream().filter(r -> rating(r) <= 2).toList());

        return """
# 📄 Báo cáo tổng hợp review

## 1. Tổng quan

| Chỉ số | Giá trị |
|---|---:|
| Tổng review | %s |
| Điểm trung bình | %.1f/5 |
| Review tốt | %s |
| Review trung lập | %s |
| Review xấu | %s |

## 2. Ưu điểm nổi bật

%s

## 3. Nhược điểm cần cải thiện

%s

## 4. Lời khuyên cho đối tác

- Ưu tiên xử lý các nhóm vấn đề bị phản ánh nhiều nhất.
- Phản hồi review tiêu cực bằng giọng văn lịch sự, nhận trách nhiệm và đưa hướng xử lý.
- Duy trì các điểm đang được khách khen để tăng tỷ lệ review tốt.
- Có thể dùng mục **Sơ đồ review** để xem nhanh tỷ lệ tốt/xấu/trung lập.
""".formatted(
                formatNumber(total),
                avg,
                formatNumber(good),
                formatNumber(neutral),
                formatNumber(bad),
                formatTopicList(goodTopics),
                formatTopicList(badTopics)
        );
    }

    private String buildReviewChart(User user) {
        List<Review> reviews = getPartnerReviews(user);

        if (reviews.isEmpty()) {
            return """
# 📊 Sơ đồ review tỷ lệ đánh giá

Chưa có dữ liệu review phù hợp để vẽ sơ đồ.
""";
        }

        long total = reviews.size();
        long good = reviews.stream().filter(r -> rating(r) >= 4).count();
        long bad = reviews.stream().filter(r -> rating(r) <= 2).count();
        long neutral = Math.max(total - good - bad, 0);
        double avg = reviews.stream().mapToDouble(this::rating).average().orElse(0);

        return """
# 📊 Sơ đồ review tỷ lệ đánh giá

Tổng review: **%s**  
Điểm trung bình: **%.1f/5**

```text
Tốt       %s  %s
Trung lập %s  %s
Xấu       %s  %s
```

## Tỷ lệ đánh giá

- Tốt: %s
- Trung lập: %s
- Xấu: %s

Nếu tỷ lệ xấu tăng, nên xem lại nhóm phản ánh chính và phản hồi khách trong vòng 24–48 giờ.
""".formatted(
                formatNumber(total),
                avg,
                bar(good, total),
                percent(good, total),
                bar(neutral, total),
                percent(neutral, total),
                bar(bad, total),
                percent(bad, total),
                formatNumber(good),
                formatNumber(neutral),
                formatNumber(bad)
        );
    }

    private List<Review> getPartnerReviews(User user) {
        List<String> allowedCodes = new ArrayList<>();
        allowedCodes.addAll(splitCodes(user.getAssignedOperatorCode()));
        allowedCodes.addAll(splitCodes(user.getPartnerCode()));

        List<String> ownerKeys = new ArrayList<>();
        ownerKeys.add(safe(user.getId()));
        ownerKeys.add(safe(user.getEmail()));
        ownerKeys.add(safe(user.getPartnerCode()));

        ownerKeys = ownerKeys.stream()
                .filter(value -> !value.isBlank())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .distinct()
                .toList();

        List<String> finalOwnerKeys = ownerKeys;

        return reviewRepository.findAll()
                .stream()
                .filter(r -> isApproved(r.getModerationStatus()))
                .filter(r -> {
                    String operatorCode = safe(r.getOperatorCode()).toUpperCase(Locale.ROOT);
                    String targetCode = safe(r.getTargetCode()).toUpperCase(Locale.ROOT);
                    String owner = safe(r.getOwnerPartnerCode()).toUpperCase(Locale.ROOT);

                    boolean byOperator = allowedCodes.stream()
                            .anyMatch(code -> code.equalsIgnoreCase(operatorCode) || code.equalsIgnoreCase(targetCode));

                    boolean byOwner = finalOwnerKeys.stream()
                            .anyMatch(key -> key.equalsIgnoreCase(owner));

                    return byOperator || byOwner;
                })
                .sorted(Comparator.comparing(Review::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(500)
                .toList();
    }

    private boolean isApproved(String status) {
        String value = normalize(status);
        return value.isBlank() || value.contains("approved") || value.contains("da duyet") || value.contains("duyet");
    }

    private double rating(Review review) {
        return review.getRating() == null ? 0 : review.getRating();
    }

    private List<String> topTopics(List<Review> reviews) {
        Map<String, Long> count = reviews.stream()
                .flatMap(r -> detectTopics(readReviewText(r)).stream())
                .collect(Collectors.groupingBy(x -> x, Collectors.counting()));

        return count.entrySet()
                .stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(4)
                .map(e -> e.getKey() + " (" + e.getValue() + " review)")
                .toList();
    }

    private String readReviewText(Review review) {
        if (review == null) return "";

        String comment = safe(review.getComment());

        if (!comment.isBlank()) {
            return comment;
        }

        String rawText = readRawText(review.getRawPayload(), 0);

        if (!rawText.isBlank()) {
            return rawText;
        }

        return "";
    }

    private String readRawText(Object value, int depth) {
        if (value == null || depth > 4) return "";

        if (value instanceof String text) {
            return text.trim();
        }

        if (value instanceof Map<?, ?> map) {
            String[] keys = {
                    "comment",
                    "content",
                    "reviewText",
                    "text",
                    "message",
                    "description",
                    "body",
                    "rawComment",
                    "rawText"
            };

            for (String key : keys) {
                Object direct = map.get(key);
                String directText = readRawText(direct, depth + 1);

                if (!directText.isBlank()) {
                    return directText;
                }
            }

            for (Object child : map.values()) {
                if (!(child instanceof Map<?, ?>) && !(child instanceof List<?>)) {
                    continue;
                }

                String childText = readRawText(child, depth + 1);

                if (!childText.isBlank()) {
                    return childText;
                }
            }
        }

        if (value instanceof List<?> list) {
            for (Object item : list) {
                if (!(item instanceof Map<?, ?>) && !(item instanceof List<?>) && !(item instanceof String)) {
                    continue;
                }

                String itemText = readRawText(item, depth + 1);

                if (!itemText.isBlank()) {
                    return itemText;
                }
            }
        }

        return "";
    }

    private List<String> detectTopics(String comment) {
        String text = normalize(comment);

        ArrayList<String> topics = new ArrayList<>();

        if (text.isBlank()) {
            topics.add("Trải nghiệm chung");
            return topics;
        }

        if (containsAny(text, "sach", "ve sinh", "ban", "mui", "hoi", "am moc", "ga goi", "chan ga", "nha ve sinh")) {
            topics.add("Vệ sinh / sạch sẽ");
        }

        if (containsAny(text, "tre", "cham", "muon", "dung gio", "sai gio", "doi lau", "cho lau", "delay", "hoan chuyen", "huy chuyen", "xuat phat", "check in", "check-in", "lich trinh")) {
            topics.add("Giờ giấc / đúng giờ");
        }

        if (containsAny(text, "tai xe", "nhan vien", "phuc vu", "thai do", "tong dai", "le tan", "huong dan vien", "nhiệt tinh", "nhiet tinh", "than thien", "cau gat", "thieu ton trong", "khong ho tro")) {
            topics.add("Thái độ phục vụ");
        }

        if (containsAny(text, "gia", "ve", "chi phi", "phu phi", "dat coc", "hoan tien", "thu them", "mac", "re", "gia cao")) {
            topics.add("Giá vé / chi phí");
        }

        if (containsAny(text, "trung chuyen", "don tra", "don khach", "tra khach", "diem don", "diem tra", "xe dua don", "pickup", "dropoff")) {
            topics.add("Đón trả / trung chuyển");
        }

        if (containsAny(text, "thoai mai", "giuong", "ghe", "phong", "tien nghi", "wifi", "dieu hoa", "may lanh", "nha hang", "ho boi", "view", "khong gian", "am thanh", "anh sang")) {
            topics.add("Không gian / tiện nghi");
        }

        if (containsAny(text, "an toan", "lai xe", "phong nhanh", "vuot au", "nguy hiem", "that day", "bao hiem", "ky thuat", "hong", "su co")) {
            topics.add("An toàn");
        }

        if (containsAny(text, "dat ve", "dat phong", "booking", "xac nhan", "ma ve", "doi ve", "huy ve", "checkin", "check-in", "thu tuc")) {
            topics.add("Đặt chỗ / thủ tục");
        }

        if (containsAny(text, "hanh ly", "vali", "do dac", "mat do", "that lac", "gui do", "gui hang")) {
            topics.add("Hành lý / đồ đạc");
        }

        if (containsAny(text, "an uong", "do an", "bua sang", "buffet", "nuoc uong", "com", "mon an", "nha hang")) {
            topics.add("Ăn uống / phục vụ kèm");
        }

        if (containsAny(text, "tour", "huong dan", "lich trinh", "diem tham quan", "tham quan", "trai nghiem", "sap xep")) {
            topics.add("Tour / lịch trình");
        }

        if (topics.isEmpty()) {
            topics.add("Trải nghiệm chung");
        }

        return topics.stream().distinct().toList();
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) {
                return true;
            }
        }

        return false;
    }

    private boolean canUseTargetCode(User user, String targetCode) {
        if (user == null || safe(targetCode).isBlank()) {
            return false;
        }

        if ("admin".equalsIgnoreCase(safe(user.getRole()))) {
            return true;
        }

        String safeTargetCode = safe(targetCode).toUpperCase(Locale.ROOT);

        return splitCodes(user.getAssignedOperatorCode()).stream()
                .anyMatch(code -> code.equalsIgnoreCase(safeTargetCode)) ||
                splitCodes(user.getPartnerCode()).stream()
                        .anyMatch(code -> code.equalsIgnoreCase(safeTargetCode));
    }

    private List<String> splitCodes(String value) {
        if (safe(value).isBlank()) return List.of();

        return java.util.Arrays.stream(value.split("[\\s,;|]+"))
                .map(item -> safe(item).toUpperCase(Locale.ROOT))
                .filter(item -> !item.isBlank())
                .distinct()
                .toList();
    }

    private boolean isPublicApprovedReview(Review review) {
        String visibility = normalize(review.getVisibility());
        String source = normalize(review.getSourceSystem());

        boolean publicVisibility = visibility.isBlank() || visibility.equals("public");
        boolean allowedSource =
                source.isBlank() ||
                source.equals("google") ||
                source.equals("google-maps") ||
                source.equals("public") ||
                source.equals("public-web") ||
                source.equals("partner-external") ||
                source.equals("website-doi-tac") ||
                source.equals("external");

        return publicVisibility && allowedSource;
    }

    private boolean reviewBelongsToTarget(Review review, String targetCode) {
        String safeTargetCode = safe(targetCode).toUpperCase(Locale.ROOT);
        String operatorCode = safe(review.getOperatorCode()).toUpperCase(Locale.ROOT);
        String reviewTargetCode = safe(review.getTargetCode()).toUpperCase(Locale.ROOT);

        return safeTargetCode.equals(operatorCode) || safeTargetCode.equals(reviewTargetCode);
    }

    private String formatTopicList(List<String> topics) {
        if (topics.isEmpty()) {
            return "- Chưa đủ dữ liệu để xác định nhóm nội dung nổi bật.";
        }

        return topics.stream()
                .map(item -> "- " + item)
                .collect(Collectors.joining("\n"));
    }

    private String bar(long value, long total) {
        int size = 18;
        int filled = total > 0 ? (int) Math.round((value * 1.0 / total) * size) : 0;
        filled = Math.max(0, Math.min(size, filled));

        return "█".repeat(filled) + "░".repeat(size - filled);
    }

    private String percent(long value, long total) {
        if (total <= 0) return "0%";
        return String.format(Locale.US, "%.1f%%", (value * 100.0) / total).replace(".", ",");
    }

    private String buildPartnerContext(User user) {
        return """
- ID tài khoản: %s
- Tên partner: %s
- Email: %s
- Đơn vị/Dịch vụ: %s
- Mã partner: %s
- Mã dịch vụ đang gán: %s
- Gói hiện tại: %s
- Mã gói hiện tại: %s
- Quota đã dùng / tổng: %s / %s
- Ngày kích hoạt gói: %s
- Ngày hết hạn gói: %s
""".formatted(
                safe(user.getId()),
                safe(user.getName()),
                safe(user.getEmail()),
                safe(user.getOrgName()),
                safe(user.getPartnerCode()),
                safe(user.getAssignedOperatorCode()),
                safe(getCurrentPlanName(user)),
                safe(user.getCurrentPlanId()),
                formatNumber(user.getQuotaUsed()),
                formatNumber(user.getQuotaTotal()),
                formatDate(user.getPlanActivatedAt()),
                formatDate(user.getPlanExpiresAt())
        );
    }

    private String getCurrentPlanName(User user) {
        if (user == null) return "";

        String membership = safe(user.getMembershipLabel());

        if (!membership.isBlank()) {
            return membership;
        }

        String planId = safe(user.getCurrentPlanId());

        if (planId.isBlank()) {
            return "Chưa có gói";
        }

        Plan plan = planRepository.findById(planId).orElse(null);

        if (plan != null && plan.getName() != null && !plan.getName().isBlank()) {
            return plan.getName();
        }

        return planId;
    }

    private boolean isEligiblePlan(String planId, String planName) {
        String value = normalize(safe(planId) + " " + safe(planName));

        return value.contains("enterprise") ||
                value.contains("doanhnghiep") ||
                value.contains("doanh nghiep") ||
                value.contains("business") ||
                value.contains("large") ||
                value.contains("big") ||
                value.contains("lon") ||
                value.contains("custom") ||
                value.contains("tuy chinh") ||
                value.contains("tuychinh");
    }

    private boolean isPaid(String status) {
        String value = normalize(status);

        return value.contains("da thanh toan") ||
                value.contains("paid") ||
                value.contains("success") ||
                value.contains("completed");
    }

    private String normalize(String value) {
        String noAccent = Normalizer
                .normalize(safe(value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return noAccent.toLowerCase(Locale.ROOT).trim();
    }

    private String formatNumber(Integer value) {
        return formatNumber(value == null ? 0 : value.longValue());
    }

    private String formatNumber(long value) {
        return String.format(Locale.US, "%,d", value).replace(",", ".");
    }

    private String formatDate(Instant value) {
        if (value == null) return "—";

        return DateTimeFormatter
                .ofPattern("dd/MM/yyyy HH:mm")
                .withZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(value);
    }

    private String safe(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String toJsonString(String text) {
        return "\""
                + text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                + "\"";
    }
}
