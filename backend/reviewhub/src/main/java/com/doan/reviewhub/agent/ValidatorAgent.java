package com.doan.reviewhub.agent;

import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.data.message.UserMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Agent 2 — Validator
 * Kiểm tra review bằng LLM (OpenAI) hoặc rule-based nếu không có API key.
 * Output: AgentResult với confidence score 0.0–1.0
 */
@Slf4j
@Service
public class ValidatorAgent {

    @Value("${ai.openai.api-key:DEMO}")
    private String apiKey;

    @Value("${ai.openai.model:gpt-4o-mini}")
    private String model;

    @Value("${ai.enabled:true}")
    private boolean aiEnabled;

    // Từ khóa spam/toxic đơn giản cho rule-based fallback
    private static final List<String> TOXIC_KEYWORDS = List.of(
            "chửi", "đm", "cmm", "đéo", "shit", "spam", "fake", "scam",
            "lừa đảo", "idiot", "stupid", "kill"
    );

    public AgentResult validate(ReviewPayload payload) {
        log.info("[ValidatorAgent] Validating review for target={}", payload.getTargetCode());

        // Validation cơ bản trước
        if (payload.getComment() == null || payload.getComment().isBlank()) {
            // Comment rỗng vẫn OK, confidence cao vì không có gì toxic
            return AgentResult.builder()
                    .passed(true)
                    .confidence(0.95)
                    .reason("Comment trống, không phát hiện nội dung vi phạm")
                    .moderationStatus("approved")
                    .build();
        }

        // Nếu có OpenAI key thật → dùng LLM
        if (aiEnabled && !"DEMO".equals(apiKey)) {
            return validateWithLLM(payload);
        }

        // Fallback: rule-based
        return validateWithRules(payload);
    }

    private AgentResult validateWithLLM(ReviewPayload payload) {
        try {
            OpenAiChatModel llm = OpenAiChatModel.builder()
                    .apiKey(apiKey)
                    .modelName(model)
                    .maxTokens(200)
                    .build();

            String prompt = """
                    Bạn là hệ thống kiểm duyệt review. Hãy phân tích review sau và trả lời CHÍNH XÁC theo format:
                    SCORE: [0.0-1.0]
                    REASON: [lý do ngắn gọn, tối đa 1 câu]
                    
                    Score 0.9-1.0 = nội dung tốt, không spam
                    Score 0.5-0.9 = cần xem xét thêm
                    Score 0.0-0.5 = spam/toxic/không hợp lệ
                    
                    Review:
                    Đánh giá: %s/5 sao
                    Nội dung: %s
                    """.formatted(payload.getRating(), payload.getComment());

            ChatRequest chatRequest = ChatRequest.builder()
                    .messages(UserMessage.from(prompt))
                    .build();
            String response = llm.chat(chatRequest).aiMessage().text();
            return parseLLMResponse(response);

        } catch (Exception e) {
            log.warn("[ValidatorAgent] LLM call failed, falling back to rules: {}", e.getMessage());
            return validateWithRules(payload);
        }
    }

    private AgentResult validateWithRules(ReviewPayload payload) {
        String commentLower = payload.getComment().toLowerCase();

        // Kiểm tra toxic keywords
        for (String keyword : TOXIC_KEYWORDS) {
            if (commentLower.contains(keyword)) {
                log.info("[ValidatorAgent] Toxic keyword found: '{}'", keyword);
                return AgentResult.builder()
                        .passed(false)
                        .confidence(0.15)
                        .reason("Phát hiện nội dung không phù hợp: '" + keyword + "'")
                        .moderationStatus("rejected")
                        .build();
            }
        }

        // Kiểm tra comment quá ngắn và rating cực đoan (có thể spam)
        boolean tooShort = payload.getComment().length() < 5;
        boolean extremeRating = payload.getRating() == 1.0 || payload.getRating() == 5.0;

        if (tooShort && extremeRating) {
            return AgentResult.builder()
                    .passed(true)
                    .confidence(0.6)
                    .reason("Comment ngắn với rating cực đoan, cần xem xét")
                    .moderationStatus("pending_review")
                    .build();
        }

        // Bình thường
        double confidence = 0.85 + (payload.getComment().length() > 20 ? 0.1 : 0.0);
        return AgentResult.builder()
                .passed(true)
                .confidence(confidence)
                .reason("Nội dung hợp lệ, không phát hiện vi phạm")
                .moderationStatus("approved")
                .build();
    }

    private AgentResult parseLLMResponse(String response) {
        try {
            double score = 0.75;
            String reason = "LLM validation";

            for (String line : response.split("\n")) {
                if (line.startsWith("SCORE:")) {
                    score = Double.parseDouble(line.replace("SCORE:", "").trim());
                } else if (line.startsWith("REASON:")) {
                    reason = line.replace("REASON:", "").trim();
                }
            }

            String status = score >= 0.9 ? "approved" : score >= 0.5 ? "pending_review" : "rejected";
            return AgentResult.builder()
                    .passed(score >= 0.5)
                    .confidence(score)
                    .reason(reason)
                    .moderationStatus(status)
                    .build();

        } catch (Exception e) {
            log.warn("[ValidatorAgent] Failed to parse LLM response, using default");
            return AgentResult.builder()
                    .passed(true).confidence(0.75)
                    .reason("LLM response parse error, default approve")
                    .moderationStatus("pending_review")
                    .build();
        }
    }
}
