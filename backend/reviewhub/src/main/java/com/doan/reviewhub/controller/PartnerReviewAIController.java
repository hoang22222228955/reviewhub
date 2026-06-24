package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partner/review-ai")
@RequiredArgsConstructor
public class PartnerReviewAIController {

    @Value("${ai.openai.api-key:}")
    private String openAiApiKey;

    @Value("${ai.openai.model:gpt-4.1-mini}")
    private String model;

    @Value("${ai.enabled:true}")
    private boolean aiEnabled;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/insight")
    public ResponseEntity<?> analyzePartnerReviews(
            @RequestBody PartnerReviewAIRequest request,
            Authentication auth
    ) {
        try {
            ResponseEntity<?> authCheck = requirePartner(auth);
            if (authCheck != null) {
                return authCheck;
            }

            if (!aiEnabled) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "AI đang bị tắt trong cấu hình ai.enabled=false."
                ));
            }

            if (openAiApiKey == null || openAiApiKey.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Chưa cấu hình ai.openai.api-key hoặc biến môi trường OPENAI_API_KEY."
                ));
            }

            List<PartnerReviewItem> reviews = request.reviews() == null
                    ? List.of()
                    : request.reviews();

            if (reviews.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Chưa có review để AI phân tích."
                ));
            }

            List<PartnerReviewItem> safeReviews = reviews.stream()
                    .filter(item -> item.comment() != null && !item.comment().isBlank())
                    .limit(500)
                    .toList();

            if (safeReviews.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Các review hiện tại chưa có nội dung bình luận để AI phân tích."
                ));
            }

            User currentUser = (User) auth.getPrincipal();

            int totalReviews = request.totalReviews() != null && request.totalReviews() > 0 ? request.totalReviews() : reviews.size();

            String prompt = buildPrompt(request, currentUser, safeReviews, totalReviews);
            String aiText = callOpenAI(prompt);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "report", aiText,
                    "totalInput", reviews.size(),
                    "totalAnalyzed", safeReviews.size(),
                    "model", model
            ));
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Lỗi khi AI phân tích review cho partner.",
                    "error", e.getClass().getName(),
                    "detail", e.getMessage() == null ? "" : e.getMessage()
            ));
        }
    }

    private ResponseEntity<?> requirePartner(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "Bạn chưa đăng nhập."
            ));
        }

        User caller = (User) auth.getPrincipal();
        boolean ok = "partner".equals(caller.getRole()) || "admin".equals(caller.getRole());

        if (!ok) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Chỉ partner hoặc admin mới được dùng AI phân tích review."
            ));
        }

        return null;
    }

    private String buildPrompt(
            PartnerReviewAIRequest request,
            User currentUser,
            List<PartnerReviewItem> reviews,
            int totalReviews
    ) {
        StringBuilder sb = new StringBuilder();

        sb.append("""
Bạn là AI phân tích review cho đối tác trên nền tảng ReviewHub.

Nhiệm vụ:
- Đọc danh sách review bên dưới.
- Viết báo cáo ngắn gọn, dễ hiểu cho partner.
- Thống kê review tốt / xấu / trung lập.
- Tìm chủ đề khách thường khen.
- Tìm chủ đề khách thường chê.
- Với mỗi vấn đề xấu, nêu rõ có khoảng bao nhiêu review nhắc tới.
- Gợi ý hành động cải thiện thực tế.
- Không bịa dữ liệu. Nếu không đủ dữ liệu thì nói rõ.
- Viết bằng tiếng Việt.
- Trình bày dạng Markdown đẹp, có tiêu đề và bullet.

Quy tắc phân loại:
- Rating 4-5: tốt.
- Rating 3: trung lập.
- Rating 1-2: xấu.
- Nếu nội dung review trái với rating thì ưu tiên nội dung bình luận.

Thông tin partner:
""");

        sb.append("- Tên tài khoản: ").append(nullToEmpty(currentUser.getName())).append("\n");
        sb.append("- Email: ").append(nullToEmpty(currentUser.getEmail())).append("\n");
        sb.append("- Mã nhà xe được gán: ").append(nullToEmpty(currentUser.getAssignedOperatorCode())).append("\n");
        sb.append("- Tên đơn vị: ").append(nullToEmpty(currentUser.getOrgName())).append("\n");

        sb.append("\nBộ lọc hiện tại trên giao diện:\n");
        sb.append("- Keyword: ").append(nullToEmpty(request.keyword())).append("\n");
        sb.append("- Category: ").append(nullToEmpty(request.category())).append("\n");
        sb.append("- Visibility: ").append(nullToEmpty(request.visibility())).append("\n");
        sb.append("- Source: ").append(nullToEmpty(request.sourceSystem())).append("\n");

        sb.append("\nTổng số review thật theo bộ lọc hiện tại: " ).append(totalReviews).append("\n");
        sb.append("Số review có nội dung được gửi sang AI để phân tích chi tiết: " ).append(reviews.size()).append("\n");
        sb.append("AI bắt buộc phải dùng đúng tổng số review là " ).append(totalReviews).append(" trong báo cáo, không được tự đổi sang số khác.\n");

        sb.append("\nDanh sách review cần phân tích:\n");

        int index = 1;
        for (PartnerReviewItem r : reviews) {
            sb.append("\n--- Review ").append(index).append(" ---\n");
            sb.append("Mã review: ").append(nullToEmpty(r.id())).append("\n");
            sb.append("Đối tượng: ").append(nullToEmpty(r.targetName())).append("\n");
            sb.append("Mã đối tượng: ").append(nullToEmpty(r.targetCode())).append("\n");
            sb.append("Nguồn: ").append(nullToEmpty(r.sourceSystem())).append("\n");
            sb.append("Rating: ").append(r.rating()).append("/5\n");
            sb.append("Người đánh giá: ").append(nullToEmpty(r.reviewerName())).append("\n");
            sb.append("Thời gian: ").append(nullToEmpty(r.createdAt())).append("\n");
            sb.append("Nội dung: ").append(cleanText(r.comment())).append("\n");
            index++;
        }

        sb.append("""

Yêu cầu output:
- Viết ngắn gọn, rõ ràng, không lan man.
- Không dùng số review khác với tổng số review đã cung cấp ở trên.
- Trình bày đúng cấu trúc Markdown sau, giữ nguyên các tiêu đề:

# Bản tóm tắt
## Khách khen nhiều về
- Viết đúng 3 bullet ngắn.
- Mỗi bullet BẮT BUỘC có số lượng review nhắc tới ở cuối câu theo dạng: (22 review)
- Ví dụ: Xe sạch sẽ, nội thất thoải mái (22 review)

## Khách phản ánh nhiều về
- Viết đúng 3 bullet ngắn.
- Mỗi bullet BẮT BUỘC có số lượng review nhắc tới ở cuối câu theo dạng: (15 review)
- Ví dụ: Giờ xuất phát trễ, trung chuyển lâu gây thất vọng khách (15 review)

## Gợi ý từ AI
- Viết 1-2 bullet ngắn hoặc 1 đoạn rất ngắn.
- Gợi ý phải ưu tiên xử lý các vấn đề có nhiều review nhắc tới nhất.

# Bản tóm tắt chi tiết
## Điểm mạnh
- Viết tối đa 4 bullet theo dạng: Chủ đề (22 review) | 35%
- Phần trăm là ước lượng hợp lý dựa trên review, viết kèm dấu %.
- Số review phải rõ ràng, không chỉ ghi phần trăm.

## Điểm cần cải thiện
- Viết tối đa 4 bullet theo dạng: Chủ đề (15 review) | 40%
- Phần trăm là ước lượng hợp lý dựa trên review, viết kèm dấu %.
- Số review phải rõ ràng, không chỉ ghi phần trăm.

## Gợi ý xử lý
- Viết tối đa 3 bullet, ngắn gọn, hành động cụ thể.
- Ưu tiên theo thứ tự vấn đề được nhiều review nhắc tới nhất.

Quy tắc quan trọng:
- Không viết thêm phần ngoài cấu trúc trên.
- Không thêm lời chào, kết luận dài dòng hoặc giải thích về mô hình.
- Không ghi chung chung kiểu “trễ giờ”, “xe sạch”, “tài xế tốt”; phải ghi rõ vấn đề/điểm khen + số review.
- Số review trong từng ý là số lượng ước tính dựa trên danh sách review, không được vượt quá tổng số review thật.
- Nếu dữ liệu ít, vẫn giữ đúng cấu trúc và ghi ngắn gọn.
- Nếu cần nhắc tổng số review, phải dùng đúng số: """ );
        sb.append(totalReviews);
        sb.append(".\n");

        return sb.toString();
    }

    private String callOpenAI(String prompt) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();

        Map<String, Object> body = Map.of(
                "model", model,
                "max_output_tokens", 1400,
                "input", List.of(
                        Map.of(
                                "role", "system",
                                "content", List.of(
                                        Map.of(
                                                "type", "input_text",
                                                "text", "Bạn là chuyên gia phân tích trải nghiệm khách hàng và review dịch vụ."
                                        )
                                )
                        ),
                        Map.of(
                                "role", "user",
                                "content", List.of(
                                        Map.of(
                                                "type", "input_text",
                                                "text", prompt
                                        )
                                )
                        )
                )
        );

        String json = objectMapper.writeValueAsString(body);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/responses"))
                .timeout(Duration.ofSeconds(120))
                .header("Authorization", "Bearer " + openAiApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());

        if (res.statusCode() < 200 || res.statusCode() >= 500) {
            throw new RuntimeException("OpenAI HTTP " + res.statusCode() + ": " + res.body());
        }

        return extractText(res.body());
    }

    private String extractText(String raw) throws Exception {
        JsonNode root = objectMapper.readTree(raw);

        JsonNode outputText = root.get("output_text");
        if (outputText != null && outputText.isTextual()) {
            return outputText.asText();
        }

        JsonNode output = root.get("output");
        if (output != null && output.isArray()) {
            List<String> parts = new ArrayList<>();

            for (JsonNode item : output) {
                JsonNode content = item.get("content");

                if (content != null && content.isArray()) {
                    for (JsonNode c : content) {
                        JsonNode text = c.get("text");

                        if (text != null && text.isTextual()) {
                            parts.add(text.asText());
                        }
                    }
                }
            }

            if (!parts.isEmpty()) {
                return String.join("\n", parts);
            }
        }

        return raw;
    }

    private String nullToEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String cleanText(String value) {
        if (value == null) {
            return "";
        }

        String text = value
                .replace("\r", " ")
                .replace("\n", " ")
                .replace("\t", " ")
                .trim();

        if (text.length() > 1200) {
            return text.substring(0, 1200) + "...";
        }

        return text;
    }

    public record PartnerReviewAIRequest(
            String keyword,
            String category,
            String visibility,
            String sourceSystem,
            Integer totalReviews,
            List<PartnerReviewItem> reviews
    ) {}

    public record PartnerReviewItem(
            String id,
            String targetName,
            String targetCode,
            String partnerName,
            String reviewerName,
            String comment,
            Double rating,
            String sourceSystem,
            String visibility,
            String moderationStatus,
            String createdAt
    ) {}
}
