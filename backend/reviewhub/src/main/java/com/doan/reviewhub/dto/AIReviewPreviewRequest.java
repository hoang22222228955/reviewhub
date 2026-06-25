package com.doan.reviewhub.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class AIReviewPreviewRequest {
    private List<String> ids;

    // Frontend gửi kèm để backend/AI biết phải duyệt theo checklist nào.
    private String language;
    private String moderationPrompt;
    private List<Map<String, Object>> checklist;
    private Map<String, Object> responseFormat;
    private List<Map<String, Object>> decisionGuide;
    private List<Map<String, Object>> reviews;
}
