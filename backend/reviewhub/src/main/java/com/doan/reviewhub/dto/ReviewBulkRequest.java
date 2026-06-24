package com.doan.reviewhub.dto;

import lombok.Data;
import java.util.List;

@Data
public class ReviewBulkRequest {
    private List<String> ids;
}