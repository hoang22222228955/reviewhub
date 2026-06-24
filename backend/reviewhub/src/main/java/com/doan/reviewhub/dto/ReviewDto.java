package com.doan.reviewhub.dto;

import com.doan.reviewhub.entity.Review;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
public class ReviewDto {

    private String id;
    private String operatorCode;
    private String category;
    private String targetCode;
    private String targetName;
    private String reviewerName;
    private Double rating;
    private String comment;
    private String visibility;
    private String sourceSystem;
    private String moderationStatus;
    private Instant createdAt;
    private String ownerPartnerCode;
    private Map<String, Object> rawPayload;

    public static ReviewDto from(Review r) {
        return ReviewDto.builder()
                .id(r.getId())
                .operatorCode(r.getOperatorCode())
                .category(r.getCategory())
                .targetCode(r.getTargetCode())
                .targetName(r.getTargetName())
                .reviewerName(r.getReviewerName())
                .rating(r.getRating())
                .comment(r.getComment())
                .visibility(r.getVisibility())
                .sourceSystem(r.getSourceSystem())
                .moderationStatus(r.getModerationStatus())
                .createdAt(r.getCreatedAt())
                .ownerPartnerCode(r.getOwnerPartnerCode())
                .rawPayload(r.getRawPayload())
                .build();
    }
}
