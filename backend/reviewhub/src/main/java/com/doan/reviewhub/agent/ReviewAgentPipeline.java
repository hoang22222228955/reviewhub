package com.doan.reviewhub.agent;

import com.doan.reviewhub.dto.ReviewDto;
import com.doan.reviewhub.entity.Review;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * ReviewAgentPipeline — Orchestrator
 * Kết nối 4 agent theo thứ tự:
 *   Fetcher → Validator → Moderator → Storer
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewAgentPipeline {

    private final FetcherAgent   fetcherAgent;
    private final ValidatorAgent validatorAgent;
    private final ModeratorAgent moderatorAgent;
    private final StorerAgent    storerAgent;

    /**
     * Chạy toàn bộ pipeline và trả về ReviewDto đã lưu.
     */
    public ReviewDto run(
            String partnerCode, String callerRole,
            String targetCode, String targetName, String category,
            String reviewerName, Double rating, String comment, String visibility) {

        String sourceSystem = "admin".equals(callerRole) ? "admin" : "partner";

        log.info("[Pipeline] START partner={} target={}", partnerCode, targetCode);

        // ── Agent 1: Fetch & Normalize ──────────────────────────────────────
        ReviewPayload payload = fetcherAgent.fetch(
                targetCode, targetName, category,
                reviewerName, rating, comment,
                visibility, partnerCode, sourceSystem);

        // ── Agent 2: Validate ────────────────────────────────────────────────
        AgentResult validation = validatorAgent.validate(payload);
        log.info("[Pipeline] Validator: passed={} confidence={} reason={}",
                validation.isPassed(), validation.getConfidence(), validation.getReason());

        // ── Agent 3: Moderate ────────────────────────────────────────────────
        AgentResult moderation = moderatorAgent.moderate(validation);
        log.info("[Pipeline] Moderator: status={}", moderation.getModerationStatus());

        // ── Agent 4: Store ───────────────────────────────────────────────────
        Review saved = storerAgent.store(payload, moderation, moderation.getModerationStatus());
        log.info("[Pipeline] DONE id={} status={}", saved.getId(), saved.getModerationStatus());

        return ReviewDto.from(saved);
    }
}
