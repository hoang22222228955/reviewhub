package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "purchase_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseHistory {

    @Id
    @Column(length = 100)
    private String id;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "plan_id", nullable = false, length = 100)
    private String planId;

    @Column(nullable = false)
    private Integer amount;

    @Column(name = "purchased_at", nullable = false)
    private Instant purchasedAt;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
