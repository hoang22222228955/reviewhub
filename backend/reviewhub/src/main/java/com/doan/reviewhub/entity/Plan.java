package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "plans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Plan {

    @Id
    @Column(length = 100)
    private String id;

    @Column(nullable = false)
    private String name;

    @Builder.Default
    @Column(nullable = false)
    private Integer price = 0;

    @Builder.Default
    @Column(name = "quota_limit", nullable = false)
    private Integer quotaLimit = 0;

    @Builder.Default
    @Column(name = "duration_days", nullable = false)
    private Integer durationDays = 30;

    @Builder.Default
    private String cycle = "tháng";

    @Builder.Default
    private String status = "Đang bán";

    @Builder.Default
    private Boolean featured = false;

    private String description;

    @Column(columnDefinition = "TEXT")
    private String features;   // JSON array lưu dạng string

    @Column(columnDefinition = "TEXT")
    private String privileges; // JSON array lưu dạng string

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
