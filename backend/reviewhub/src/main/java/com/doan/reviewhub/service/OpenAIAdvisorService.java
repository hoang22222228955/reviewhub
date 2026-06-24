package com.doan.reviewhub.service;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class OpenAIAdvisorService {

    @Value("${ai.openai.api-key:DEMO}")
    private String apiKey;

    @Value("${ai.openai.model}")
    private String model;

    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(90, java.util.concurrent.TimeUnit.SECONDS)
            .build();

    public String advise(String message) throws Exception {

        if (apiKey == null || apiKey.isBlank() || apiKey.equals("DEMO")) {
            return "Lỗi: Backend chưa đọc được OPENAI_API_KEY.";
        }

        String plans = """
        [
          {
            "name": "Khởi đầu",
            "price": "790.000đ/tháng",
            "quota": "5.000 request/tháng",
            "features": [
              "1 khóa sandbox + 1 khóa live",
              "Đọc dữ liệu public",
              "Bộ lọc cơ bản",
              "Dashboard quota"
            ],
            "bestFor": "Người mới, sinh viên, đồ án, dự án nhỏ",
            "advantages": [
              "Giá thấp",
              "Dễ bắt đầu",
              "Phù hợp test API"
            ],
            "limitations": [
              "Quota thấp",
              "Không có AI moderation"
            ]
          },
          {
            "name": "Tăng trưởng",
            "price": "2.490.000đ/tháng",
            "quota": "50.000 request/tháng",
            "features": [
              "AI moderation",
              "Dữ liệu private",
              "Gửi review mới",
              "Báo cáo chất lượng dữ liệu"
            ],
            "bestFor": "Startup, app review thật, doanh nghiệp vừa",
            "advantages": [
              "Có AI moderation",
              "Quota lớn hơn",
              "Phù hợp app thật"
            ],
            "limitations": [
              "Chi phí cao hơn gói cơ bản"
            ]
          },
          {
            "name": "Doanh nghiệp",
            "price": "9.990.000đ/tháng",
            "quota": "300.000 request/tháng",
            "features": [
              "Quota lớn",
              "SLA",
              "Hỗ trợ riêng",
              "Mở rộng domain"
            ],
            "bestFor": "Doanh nghiệp lớn",
            "advantages": [
              "Quota rất lớn",
              "Có SLA",
              "Có hỗ trợ kỹ thuật riêng"
            ],
            "limitations": [
              "Chi phí cao"
            ]
          }
        ]
        """;

        String prompt = """
        Bạn là AI chăm sóc khách hàng và tư vấn bán hàng của Review Data Hub.

        Vai trò:
        - Trả lời như nhân viên tư vấn thật.
        - Tự nhiên, thông minh, lịch sự.
        - Không trả lời máy móc.
        - Tư vấn gói phù hợp.
        - Hỗ trợ khách về quota, AI moderation, thanh toán, nâng cấp gói, chuyển gói.

        Quy tắc:
        - Không dùng markdown kiểu ** hoặc ###.
        - Không trả lời quá dài.
        - Viết rõ ràng, đẹp mắt, dễ đọc.
        - Có thể dùng emoji nhẹ.
        - Không bịa thông tin.

        Luật tư vấn:
        - Khách mới, ngân sách thấp, test API => Khởi đầu.
        - Cần AI moderation hoặc app review thật => Tăng trưởng.
        - Cần quota lớn, SLA, hỗ trợ riêng => Doanh nghiệp.

        So sánh gói:
        - Nếu khách hỏi "so sánh", "ưu nhược điểm", "khác nhau":
          Trả lời theo dạng:

          Khởi đầu
          - Giá:
          - Quota:
          - Ưu điểm:
          - Nhược điểm:
          - Phù hợp với:

          Tăng trưởng
          - Giá:
          - Quota:
          - Ưu điểm:
          - Nhược điểm:
          - Phù hợp với:

          Doanh nghiệp
          - Giá:
          - Quota:
          - Ưu điểm:
          - Nhược điểm:
          - Phù hợp với:

          Sau đó kết luận nên chọn gói nào.

        Nếu khách:
        - chào => chào lại tự nhiên
        - cảm ơn => đáp lịch sự
        - hỏi yêu đương => trả lời vui vẻ rồi kéo lại chủ đề dịch vụ
        - hỏi xin Zalo/Facebook/số điện thoại => nói chưa có thông tin liên hệ trực tiếp
        - hỏi mua nhiều có giảm giá => nói có thể hỗ trợ ưu đãi riêng
        - hỏi gói năm => nói thường có ưu đãi tốt hơn
        - hỏi trả góp => nói cần kiểm tra chính sách hỗ trợ
        - hỏi nâng cấp gói => nói có thể nâng cấp khi nhu cầu tăng
        - hỏi chuyển gói sang tài khoản khác => yêu cầu cung cấp email và mã giao dịch để hỗ trợ kiểm tra
        - hỏi lỗi thanh toán => hướng dẫn kiểm tra đăng nhập, lịch sử thanh toán và thử lại

        Nếu khách hỏi ngoài lề:
        - Trả lời ngắn gọn, vui vẻ.
        - Sau đó kéo về tư vấn dịch vụ.

        Khi khách hỏi nên mua gói nào:
        - Nếu thiếu dữ liệu, hỏi:
          + Bạn cần khoảng bao nhiêu request/tháng?
          + Có cần AI moderation không?
          + Dùng để test hay chạy app thật?

        Danh sách gói:
        %s

        Tin nhắn khách:
        %s
        """.formatted(plans, message);

        String jsonBody = """
        {
          "model": "%s",
          "input": %s
        }
        """.formatted(
                model,
                convertToJsonString(prompt)
        );

        Request request = new Request.Builder()
                .url("https://api.openai.com/v1/responses")
                .addHeader("Authorization", "Bearer " + apiKey)
                .addHeader("Content-Type", "application/json")
                .post(
                        RequestBody.create(
                                jsonBody,
                                MediaType.get("application/json")
                        )
                )
                .build();

        try (Response response = client.newCall(request).execute()) {

            String responseBody = response.body() != null
                    ? response.body().string()
                    : "";

            if (!response.isSuccessful()) {
                return "OpenAI Error "
                        + response.code()
                        + ": "
                        + responseBody;
            }

            return responseBody;
        }
    }

    private String convertToJsonString(String text) {

        return "\""
                + text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                + "\"";
    }
}