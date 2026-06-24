package com.doan.reviewhub.agent;

import com.doan.reviewhub.entity.Review;
import com.doan.reviewhub.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Agent 3 — Storer
 * Lưu review vào DB kèm metadata từ AI pipeline:
 * - ai_confidence score
 * - moderation_status do Moderator gán
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StorerAgent {

    private final ReviewRepository reviewRepository;

    public Review store(ReviewPayload payload, AgentResult validationResult, String moderationStatus) {
        String id = payload.getPartnerCode() + "-"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();

        log.info("[StorerAgent] Saving review id={} status={} confidence={}",
                id, moderationStatus, validationResult.getConfidence());

        Map<String, Object> rawPayload = Map.of(
                "id", id,
                "category", payload.getCategory(),
                "targetCode", payload.getTargetCode(),
                "targetName", payload.getTargetName(),
                "reviewerName", payload.getReviewerName(),
                "rating", payload.getRating(),
                "comment", payload.getComment(),
                "sourceSystem", payload.getSourceSystem(),
                "ai_confidence", validationResult.getConfidence(),
                "ai_reason", validationResult.getReason()
        );

        Review review = Review.builder()
                .id(id)
                .operatorCode(payload.getPartnerCode())
                .category(payload.getCategory())
                .targetCode(payload.getTargetCode())
                .targetName(payload.getTargetName())
                .reviewerName(payload.getReviewerName())
                .rating(payload.getRating())
                .comment(payload.getComment())
                .visibility(payload.getVisibility())
                .sourceSystem(payload.getSourceSystem())
                .moderationStatus(moderationStatus)
                .createdAt(Instant.now())
                .ownerPartnerCode(payload.getPartnerCode())
                .rawPayload(rawPayload)
                .build();

        return reviewRepository.save(review);
    }
}
