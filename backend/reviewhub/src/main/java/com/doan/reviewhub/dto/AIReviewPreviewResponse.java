package com.doan.reviewhub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIReviewPreviewResponse {

    private long total;

    private long approveCount;
    private long rejectCount;
    private long manualCount;

    private List<String> approveIds;
    private List<String> rejectIds;
    private List<String> manualIds;

    private List<AIReviewDecisionItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AIReviewDecisionItem {
        private String id;
        private String action;
        private double confidence;
        private String reason;
    }
}