package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "user_plan_subscriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserPlanSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "plan_id", nullable = false, length = 100)
    private String planId;

    @Column(name = "activated_at")
    private Instant activatedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Builder.Default
    @Column(name = "is_current", nullable = false)
    private Boolean isCurrent = true;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (isCurrent == null) isCurrent = true;
    }
}
