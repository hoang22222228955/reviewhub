package com.doan.reviewhub.controller;

import com.doan.reviewhub.dto.AIReviewApplyRequest;
import com.doan.reviewhub.dto.AIReviewPreviewResponse;
import com.doan.reviewhub.dto.ReviewBulkRequest;
import com.doan.reviewhub.entity.Review;
import com.doan.reviewhub.repository.ReviewRepository;
import com.doan.reviewhub.service.AdminAIToolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@RequestMapping("/api/admin/review-ai")
public class AdminReviewAIController {

    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";

    private static final String VISIBILITY_PUBLIC = "public";
    private static final String VISIBILITY_PRIVATE = "private";

    private final ReviewRepository reviewRepository;
    private final AdminAIToolService adminAIToolService;

    private boolean isPendingReview(Review r) {
        String status = r.getModerationStatus();

        return status == null
                || status.isBlank()
                || status.equalsIgnoreCase(STATUS_PENDING_REVIEW);
    }

    /*
     * THÊM MỚI:
     * Lấy toàn bộ review trong database
     */
    @GetMapping("/all")
    public ResponseEntity<?> getAllReviews() {
        return ResponseEntity.ok(
                reviewRepository.findAll()
        );
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingReviews() {
        return ResponseEntity.ok(
                reviewRepository.findAll()
                        .stream()
                        .filter(this::isPendingReview)
                        .toList()
        );
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveReview(@PathVariable String id) {
        try {
            Review review = reviewRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy review: " + id));

            review.setModerationStatus(STATUS_APPROVED);
            review.setVisibility(VISIBILITY_PUBLIC);
            review.setModeratedAt(Instant.now());

            reviewRepository.save(review);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "id", id,
                    "action", "approve"
            ));
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Lỗi khi duyệt review",
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectReview(@PathVariable String id) {
        try {
            Review review = reviewRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy review: " + id));

            review.setModerationStatus(STATUS_REJECTED);

            // Không dùng "hidden" vì DB thường chỉ có public/private.
            review.setVisibility(VISIBILITY_PRIVATE);

            review.setModeratedAt(Instant.now());

            reviewRepository.save(review);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "id", id,
                    "action", "reject"
            ));
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Lỗi khi từ chối review",
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/bulk-approve")
    public ResponseEntity<?> bulkApprove(@RequestBody ReviewBulkRequest request) {
        try {
            List<String> ids = cleanIds(request.getIds());

            List<Review> reviews = reviewRepository.findAllById(ids)
                    .stream()
                    .filter(this::isPendingReview)
                    .toList();

            for (Review review : reviews) {
                review.setModerationStatus(STATUS_APPROVED);
                review.setVisibility(VISIBILITY_PUBLIC);
                review.setModeratedAt(Instant.now());
            }

            reviewRepository.saveAll(reviews);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "action", "bulk_approve",
                    "total", reviews.size()
            ));
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Lỗi khi duyệt hàng loạt",
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/bulk-reject")
    public ResponseEntity<?> bulkReject(@RequestBody ReviewBulkRequest request) {
        try {
            List<String> ids = cleanIds(request.getIds());

            List<Review> reviews = reviewRepository.findAllById(ids)
                    .stream()
                    .filter(this::isPendingReview)
                    .toList();

            for (Review review : reviews) {
                review.setModerationStatus(STATUS_REJECTED);

                // Không dùng "hidden".
                review.setVisibility(VISIBILITY_PRIVATE);

                review.setModeratedAt(Instant.now());
            }

            reviewRepository.saveAll(reviews);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "action", "bulk_reject",
                    "total", reviews.size()
            ));
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Lỗi khi từ chối hàng loạt",
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/ai-preview")
    public ResponseEntity<?> aiPreview(@RequestBody ReviewBulkRequest request) {
        try {
            List<String> ids = cleanIds(request.getIds());

            List<Review> reviews = reviewRepository.findAllById(ids)
                    .stream()
                    .filter(this::isPendingReview)
                    .toList();

            AIReviewPreviewResponse response =
                    adminAIToolService.analyzeReviewBatch(reviews);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Lỗi khi AI phân tích review",
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/ai-apply")
    public ResponseEntity<?> aiApply(@RequestBody AIReviewApplyRequest request) {
        try {
            List<String> approveIds = cleanIds(request.getApproveIds());
            List<String> rejectIds = cleanIds(request.getRejectIds());

            int approvedCount = 0;
            int rejectedCount = 0;

            if (!approveIds.isEmpty()) {
                List<Review> approveReviews = reviewRepository.findAllById(approveIds)
                        .stream()
                        .filter(this::isPendingReview)
                        .toList();

                for (Review review : approveReviews) {
                    review.setModerationStatus(STATUS_APPROVED);
                    review.setVisibility(VISIBILITY_PUBLIC);
                    review.setModeratedAt(Instant.now());
                }

                reviewRepository.saveAll(approveReviews);
                approvedCount = approveReviews.size();
            }

            if (!rejectIds.isEmpty()) {
                List<Review> rejectReviews = reviewRepository.findAllById(rejectIds)
                        .stream()
                        .filter(this::isPendingReview)
                        .toList();

                for (Review review : rejectReviews) {
                    review.setModerationStatus(STATUS_REJECTED);

                    // Không dùng "hidden".
                    review.setVisibility(VISIBILITY_PRIVATE);

                    review.setModeratedAt(Instant.now());
                }

                reviewRepository.saveAll(rejectReviews);
                rejectedCount = rejectReviews.size();
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "approved", approvedCount,
                    "rejected", rejectedCount
            ));
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Lỗi khi áp dụng đề xuất AI",
                    "error", e.getMessage()
            ));
        }
    }

    private List<String> cleanIds(List<String> ids) {
        if (ids == null) {
            return List.of();
        }

        return ids.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .distinct()
                .toList();
    }
}