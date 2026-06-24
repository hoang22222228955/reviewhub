package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.service.ReviewSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/partner")
@RequiredArgsConstructor
public class ReviewSyncController {

    private final ReviewSyncService reviewSyncService;

    /**
     * POST /api/partner/sync-reviews
     * Đồng bộ review từ file google_maps_reviews.txt vào Neon PostgreSQL
     * theo assignedOperatorCode của đối tác đang đăng nhập.
     */
    @PostMapping("/sync-reviews")
    public ResponseEntity<?> syncReviews(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();

        String operatorCode = currentUser.getAssignedOperatorCode();
        if (operatorCode == null || operatorCode.isBlank()) {
            return ResponseEntity.badRequest().body(
                    java.util.Map.of(
                            "success", false,
                            "message", "Tài khoản chưa được gán nhà xe. Vui lòng liên hệ admin để được cập nhật."
                    )
            );
        }

        ReviewSyncService.SyncResult result = reviewSyncService.syncReviewsForOperator(
                operatorCode,
                currentUser.getPartnerCode()
        );

        if (!result.success()) {
            return ResponseEntity.internalServerError().body(
                    java.util.Map.of("success", false, "message", result.message())
            );
        }

        return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "inserted", result.inserted(),
                "skipped", result.skipped(),
                "failed", result.failed(),
                "message", result.message()
        ));
    }
}
