package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/partner/sla")
@RequiredArgsConstructor
public class SlaController {

    private final ReviewRepository reviewRepository;

    /**
     * GET /api/partner/sla
     * Trả về số liệu SLA của partner đang đăng nhập.
     */
    @GetMapping
    public ResponseEntity<?> getSlaStats(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        String partnerCode = currentUser.getPartnerCode();

        if (partnerCode == null || partnerCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tài khoản chưa được gán partner code."));
        }

        long totalSubmitted = reviewRepository.countByOwnerPartnerCode(partnerCode);
        long approved       = reviewRepository.countByOwnerPartnerCodeAndModerationStatus(partnerCode, "approved");
        long rejected       = reviewRepository.countByOwnerPartnerCodeAndModerationStatus(partnerCode, "rejected");
        long pending        = reviewRepository.countByOwnerPartnerCodeAndModerationStatus(partnerCode, "pending_review");
        double avgConfidence = reviewRepository.avgAiConfidenceByPartnerCode(partnerCode);

        double approvalRate = totalSubmitted > 0 ? (double) approved / totalSubmitted * 100 : 0;

        // Quota thông tin từ user entity
        int quotaTotal = currentUser.getQuotaTotal() != null ? currentUser.getQuotaTotal() : 0;
        int quotaUsed  = currentUser.getQuotaUsed()  != null ? currentUser.getQuotaUsed()  : 0;
        double quotaRate = quotaTotal > 0 ? (double) quotaUsed / quotaTotal * 100 : 0;

        return ResponseEntity.ok(Map.of(
            "totalSubmitted", totalSubmitted,
            "approved",       approved,
            "rejected",       rejected,
            "pendingReview",  pending,
            "approvalRate",   Math.round(approvalRate * 10.0) / 10.0,
            "avgAiConfidence", Math.round(avgConfidence * 1000.0) / 10.0, // 0-100%
            "quotaTotal",     quotaTotal,
            "quotaUsed",      quotaUsed,
            "quotaRate",      Math.round(quotaRate * 10.0) / 10.0
        ));
    }
}
