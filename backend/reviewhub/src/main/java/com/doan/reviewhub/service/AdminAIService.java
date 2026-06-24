package com.doan.reviewhub.service;

import lombok.RequiredArgsConstructor;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AdminAIService {

    private final AdminAIToolService toolService;

    @Value("${ai.openai.api-key:DEMO}")
    private String apiKey;

    @Value("${ai.openai.model:gpt-4.1-mini}")
    private String model;

    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .readTimeout(90, TimeUnit.SECONDS)
            .build();

    public String chat(
            String message,
            String path,
            String pageTitle,
            String adminContext
    ) throws Exception {

        String lower = message == null ? "" : message.toLowerCase();

        boolean useTool =
                lower.contains("bao nhiêu đối tác") ||
                lower.contains("bao đối tác") ||
                lower.contains("mấy đối tác") ||
                lower.contains("bao nhiêu partner") ||
                lower.contains("mấy partner") ||
                lower.contains("số lượng đối tác") ||
                lower.contains("số lượng partner") ||
                lower.contains("tổng đối tác") ||

                lower.contains("danh sách partner") ||
                lower.contains("danh sách đối tác") ||
                lower.contains("list partner") ||
                lower.contains("xem partner") ||

                lower.contains("lịch sử mua gói") ||
                lower.contains("giao dịch mua gói") ||
                lower.contains("thống kê mua gói") ||
                lower.contains("thống kê giao dịch") ||
                lower.contains("doanh thu") ||
                lower.contains("giao dịch") ||

                lower.contains("đổi giá gói") ||
                lower.contains("chỉnh giá gói") ||
                lower.contains("sửa giá gói") ||

                lower.startsWith("review:") ||
                lower.startsWith("đánh giá:") ||
                lower.contains("review này nên duyệt") ||
                lower.contains("nên duyệt review") ||
                lower.contains("đánh giá này nên duyệt") ||
                lower.contains("phân loại review") ||
                lower.contains("tự động duyệt") ||

                lower.contains("xin chào") ||
                lower.contains("chào bạn") ||
                lower.equals("chào") ||
                lower.equals("hello") ||
                lower.equals("hi") ||
                lower.contains("cảm ơn") ||
                lower.contains("cam on") ||
                lower.contains("thanks") ||
                lower.contains("thank you") ||
                lower.contains("tks") ||
                lower.contains("tạm biệt") ||
                lower.contains("bye") ||
                lower.contains("hẹn gặp lại");

        if (useTool) {
            return toolService.handleAdminQuestion(message);
        }

        if (apiKey == null || apiKey.isBlank() || apiKey.equals("DEMO")) {
            return """
# 🤖 Admin AI

Backend chưa có OPENAI_API_KEY.

Tôi vẫn có thể dùng tool nội bộ cho:
- Có bao nhiêu đối tác?
- Danh sách partner
- Lịch sử mua gói
- Thống kê giao dịch
- Chỉnh giá gói
- review: nội dung đánh giá
""";
        }

        String prompt = """
Bạn là Admin AI nội bộ thông minh của hệ thống ReviewHub.

Ngữ cảnh hiện tại:
- URL hiện tại: %s
- Tên trang hiện tại: %s
- Context frontend gửi lên: %s

Bạn hỗ trợ admin các mục:
1. Tổng quan
2. Quản lý gói
3. Quản lý đối tác
4. Lịch sử mua gói
5. Kiểm duyệt review
6. Cấu hình ngân hàng

Quy tắc:
- Trả lời tiếng Việt.
- Trả lời gọn nhưng đầy đủ.
- Nếu cần dữ liệu thật, không bịa dữ liệu.
- Không tự nhận đã sửa, duyệt, xóa nếu backend chưa thực hiện.
- Nếu admin hỏi lỗi, hướng dẫn kiểm tra Console, Network, status code, terminal backend.
- Nếu hỏi code, chỉ rõ file cần sửa.

Tin nhắn admin:
%s
""".formatted(path, pageTitle, adminContext, message);

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

            return responseBody;
        }
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