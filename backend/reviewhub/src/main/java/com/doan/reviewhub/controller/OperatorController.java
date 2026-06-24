package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.TransportOperator;
import com.doan.reviewhub.repository.TransportOperatorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/operators")
@RequiredArgsConstructor
public class OperatorController {

    private final TransportOperatorRepository operatorRepository;

    /**
     * Trả về danh sách tất cả nhà xe (dùng cho admin assign và partner chọn đăng ký).
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listOperators() {
        List<TransportOperator> operators = operatorRepository.findAll(
                Sort.by("operatorCode").ascending()
        );

        List<Map<String, Object>> result = operators.stream()
                .map(op -> Map.<String, Object>of(
                        "operatorCode", op.getOperatorCode(),
                        "operatorName", op.getOperatorName(),
                        "overallRating", op.getOverallRating() != null ? op.getOverallRating() : 0.0,
                        "totalReviews", op.getTotalReviews() != null ? op.getTotalReviews() : 0
                ))
                .toList();

        return ResponseEntity.ok(result);
    }
}
