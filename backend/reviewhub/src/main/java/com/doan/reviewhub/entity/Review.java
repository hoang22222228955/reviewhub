package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @Column(length = 100)
    private String id;

    @Column(name = "operator_code", nullable = false, length = 100)
    private String operatorCode;

    @Builder.Default
    @Column(nullable = false, length = 100)
    private String category = "Nhà xe";

    @Column(name = "target_code", nullable = false, length = 100)
    private String targetCode;

    @Column(name = "target_name", nullable = false)
    private String targetName;

    @Column(name = "reviewer_name")
    private String reviewerName;

    @Column(nullable = false)
    private Double rating;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "text")
    private String comment = "";

    @Builder.Default
    @Column(nullable = false, length = 20)
    private String visibility = "public";

    @Column(name = "source_system", nullable = false, length = 50)
    private String sourceSystem;

    // =========================
    // AI MODERATION
    // =========================

    @Builder.Default
    @Column(name = "moderation_status", nullable = false, length = 30)
    private String moderationStatus = "pending_review";

    @Column(name = "moderated_at")
    private Instant moderatedAt;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @Column(name = "ai_reason", columnDefinition = "TEXT")
    private String aiReason;

    // =========================

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "owner_partner_code", length = 100)
    private String ownerPartnerCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private Map<String, Object> rawPayload;

    // =========================
    // AUTO DEFAULT VALUES
    // =========================

    @PrePersist
    public void prePersist() {
        applyDefaults();

        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        applyDefaults();
    }

    private void applyDefaults() {
        if (moderationStatus == null || moderationStatus.isBlank()) {
            moderationStatus = "pending_review";
        }

        if (visibility == null || visibility.isBlank()) {
            visibility = "public";
        }

        if (comment == null) {
            comment = "";
        }

        if (category == null || category.isBlank()) {
            category = "Nhà xe";
        }
    }
}