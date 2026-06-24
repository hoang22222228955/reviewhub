package com.doan.reviewhub.controller;

import com.doan.reviewhub.service.AdminAIService;
import com.doan.reviewhub.service.AdminModerationChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@RequestMapping("/api/admin/ai")
public class AdminAIController {

    private final AdminAIService adminAIService;
    private final AdminModerationChatService adminModerationChatService;

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> body) {

        try {

            String message =
                    body.getOrDefault("message", "").trim();

            String path =
                    body.getOrDefault("path", "");

            String pageTitle =
                    body.getOrDefault("pageTitle", "");

            String adminContext =
                    body.getOrDefault("adminContext", "");

            if (message.isBlank()) {

                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "error",
                                "Tin nhắn trống."
                        ));
            }

            /*
             * Bắt lệnh liên quan kiểm duyệt review trước.
             * Ví dụ:
             * - "AI tự đánh giá review pending"
             * - "Thống kê review pending"
             * - "đồng ý"
             * - "hủy"
             */
            if (adminModerationChatService.canHandle(message)) {
                String result = adminModerationChatService.handle(message);
                return ResponseEntity.ok(result);
            }

            String result = adminAIService.chat(
                    message,
                    path,
                    pageTitle,
                    adminContext
            );

            return ResponseEntity.ok(result);

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(500)
                    .body(
                            "ADMIN AI ERROR: " + e.getMessage()
                    );
        }
    }
}
