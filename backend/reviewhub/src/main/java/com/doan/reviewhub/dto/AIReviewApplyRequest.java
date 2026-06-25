package com.doan.reviewhub.dto;

import lombok.Data;
import java.util.List;

@Data
public class AIReviewApplyRequest {
    private List<String> approveIds;
    private List<String> rejectIds;
    private List<String> manualIds;
}
