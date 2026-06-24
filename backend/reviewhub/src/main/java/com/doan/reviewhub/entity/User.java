package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @Column(length = 100)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String phone;

    @Column(nullable = false, columnDefinition = "varchar(50)")
    private String role; // admin, partner, member

    @Column(name = "membership_label")
    private String membershipLabel;

    @Column(name = "partner_code", unique = true)
    private String partnerCode;

    @Column(name = "org_name")
    private String orgName;

    @Column(name = "business_type")
    private String businessType;

    private String domain;

    @Column(nullable = false, columnDefinition = "varchar(100)")
    private String status;

    @Column(name = "api_key")
    private String apiKey;

    @Builder.Default
    @Column(name = "quota_total", nullable = false)
    private Integer quotaTotal = 0;

    @Builder.Default
    @Column(name = "quota_used", nullable = false)
    private Integer quotaUsed = 0;

    @Column(name = "assigned_operator_code", length = 100)
    private String assignedOperatorCode;

    @Column(name = "current_plan_id", length = 100)
    private String currentPlanId;

    @Column(name = "plan_activated_at")
    private Instant planActivatedAt;

    @Column(name = "plan_expires_at")
    private Instant planExpiresAt;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (role == null) role = "member";
        if (status == null) status = "Đang hoạt động";
        if (quotaTotal == null) quotaTotal = 0;
        if (quotaUsed == null) quotaUsed = 0;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
