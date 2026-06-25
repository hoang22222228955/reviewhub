package com.doan.reviewhub.controller;

import com.doan.reviewhub.service.PublicReviewCacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/review-cache")
public class PublicReviewCacheController {

    private final PublicReviewCacheService publicReviewCacheService;

    /**
     * Mặc định chỉ đọc file JSON cache, không tự rebuild toàn DB.
     * Ví dụ:
     * GET /api/public/review-cache/khach-san/KS-018
     *
     * Muốn rebuild thủ công mới dùng:
     * GET /api/public/review-cache/khach-san/KS-018?force=true
     */
    @GetMapping("/{serviceSlug}/{targetCode}")
    public ResponseEntity<?> getReviewCache(
            @PathVariable String serviceSlug,
            @PathVariable String targetCode,
            @RequestParam(defaultValue = "false") boolean force
    ) {
        try {
            PublicReviewCacheService.ReviewCachePayload payload;

            if (force) {
                payload = publicReviewCacheService.rebuild(serviceSlug, targetCode);
            } else {
                payload = publicReviewCacheService.readCache(serviceSlug, targetCode);
            }

            return ResponseEntity.ok(payload);
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Không đọc được public review cache.",
                    "detail", e.getMessage() == null ? "" : e.getMessage()
            ));
        }
    }

    /**
     * Endpoint phụ cho frontend cũ gọi dạng query để tránh 404.
     */
    @GetMapping
    public ResponseEntity<?> getReviewCacheByQuery(
            @RequestParam(defaultValue = "nha-xe") String serviceSlug,
            @RequestParam(required = false) String targetCode,
            @RequestParam(required = false) String operatorCode,
            @RequestParam(defaultValue = "false") boolean force
    ) {
        String code = targetCode != null && !targetCode.isBlank() ? targetCode : operatorCode;

        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Thiếu targetCode hoặc operatorCode."
            ));
        }

        return getReviewCache(serviceSlug, code, force);
    }
}
