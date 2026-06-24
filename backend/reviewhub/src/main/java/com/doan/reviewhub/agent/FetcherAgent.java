package com.doan.reviewhub.agent;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Agent 1 — Fetcher
 * Nhận raw input từ partner, chuẩn hóa dữ liệu trước khi vào pipeline.
 * - Trim whitespace
 * - Clamp rating về [1.0, 5.0]
 * - Default các field null
 * - Rút gọn comment quá dài (> 2000 ký tự)
 */
@Slf4j
@Service
public class FetcherAgent {

    private static final int MAX_COMMENT_LENGTH = 2000;

    public ReviewPayload fetch(
            String targetCode, String targetName, String category,
            String reviewerName, Double rating, String comment,
            String visibility, String partnerCode, String sourceSystem) {

        log.info("[FetcherAgent] Normalizing review from partner={}", partnerCode);

        // Chuẩn hóa
        String normCategory   = normalize(category, "Nhà xe");
        String normTargetCode = normalize(targetCode, "UNKNOWN");
        String normTargetName = normalize(targetName, "Unknown");
        String normReviewer   = normalize(reviewerName, "Ẩn danh");
        String normVisibility = normalize(visibility, "public");
        String normComment    = normalizeComment(comment);
        Double normRating     = clampRating(rating);

        log.info("[FetcherAgent] Done: target={}, rating={}, commentLen={}",
                normTargetCode, normRating, normComment.length());

        return ReviewPayload.builder()
                .targetCode(normTargetCode)
                .targetName(normTargetName)
                .category(normCategory)
                .reviewerName(normReviewer)
                .rating(normRating)
                .comment(normComment)
                .visibility(normVisibility)
                .partnerCode(partnerCode)
                .sourceSystem(sourceSystem)
                .build();
    }

    private String normalize(String value, String defaultVal) {
        return (value != null && !value.isBlank()) ? value.trim() : defaultVal;
    }

    private String normalizeComment(String comment) {
        if (comment == null || comment.isBlank()) return "";
        String trimmed = comment.trim();
        return trimmed.length() > MAX_COMMENT_LENGTH
                ? trimmed.substring(0, MAX_COMMENT_LENGTH) + "..."
                : trimmed;
    }

    private Double clampRating(Double rating) {
        if (rating == null) return 3.0;
        return Math.max(1.0, Math.min(5.0, rating));
    }
}
