package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "transport_operators")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransportOperator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operator_code", nullable = false, unique = true, length = 100)
    private String operatorCode;

    @Column(name = "operator_name", nullable = false)
    private String operatorName;

    @Column(name = "google_place_id")
    private String googlePlaceId;

    @Column(name = "overall_rating")
    private Double overallRating;

    @Builder.Default
    @Column(name = "total_reviews")
    private Integer totalReviews = 0;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
