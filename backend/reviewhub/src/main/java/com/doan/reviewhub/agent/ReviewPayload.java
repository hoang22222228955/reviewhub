package com.doan.reviewhub.agent;

import lombok.Builder;
import lombok.Getter;

/**
 * Dữ liệu review đã được Fetcher chuẩn hóa, truyền qua pipeline.
 */
@Getter
@Builder
public class ReviewPayload {
    private String targetCode;
    private String targetName;
    private String category;
    private String reviewerName;
    private Double rating;
    private String comment;
    private String visibility;
    private String partnerCode;
    private String sourceSystem;
}
