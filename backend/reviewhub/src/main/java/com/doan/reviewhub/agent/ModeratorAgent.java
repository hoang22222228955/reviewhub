package com.doan.reviewhub.agent;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Agent 4 — Moderator
 * Quyết định trạng thái cuối dựa trên confidence score:
 *   >= 0.9  → "approved"       (auto-approve)
 *   >= 0.5  → "pending_review" (chờ admin xem)
 *   <  0.5  → "rejected"       (tự động từ chối)
 */
@Slf4j
@Service
public class ModeratorAgent {

    private static final double AUTO_APPROVE_THRESHOLD = 0.9;
    private static final double PENDING_THRESHOLD      = 0.5;

    public AgentResult moderate(AgentResult validationResult) {
        double confidence = validationResult.getConfidence();

        log.info("[ModeratorAgent] Confidence={} → deciding moderation status", confidence);

        if (!validationResult.isPassed() || confidence < PENDING_THRESHOLD) {
            log.info("[ModeratorAgent] REJECTED (confidence too low or failed validation)");
            return AgentResult.builder()
                    .passed(false)
                    .confidence(confidence)
                    .reason(validationResult.getReason())
                    .moderationStatus("rejected")
                    .build();
        }

        if (confidence >= AUTO_APPROVE_THRESHOLD) {
            log.info("[ModeratorAgent] AUTO-APPROVED");
            return AgentResult.builder()
                    .passed(true)
                    .confidence(confidence)
                    .reason(validationResult.getReason())
                    .moderationStatus("approved")
                    .build();
        }

        // 0.5 <= confidence < 0.9
        log.info("[ModeratorAgent] PENDING_REVIEW (needs admin check)");
        return AgentResult.builder()
                .passed(true)
                .confidence(confidence)
                .reason(validationResult.getReason())
                .moderationStatus("pending_review")
                .build();
    }
}
