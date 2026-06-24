package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "payment_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentHistory {

    @Id
    @Column(length = 100)
    private String id;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(nullable = false)
    private String method;

    @Column(nullable = false)
    private Integer amount;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
