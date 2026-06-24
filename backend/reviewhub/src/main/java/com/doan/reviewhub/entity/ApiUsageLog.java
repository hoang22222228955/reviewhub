package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "api_usage_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID của partner (user.id) */
    @Column(name = "partner_id", nullable = false, length = 100)
    private String partnerId;

    /** Email partner để dễ query */
    @Column(name = "partner_email", nullable = false, length = 255)
    private String partnerEmail;

    /** Endpoint đã gọi, ví dụ: GET /api/v1/reviews */
    @Column(nullable = false, length = 100)
    private String endpoint;

    /** HTTP status code trả về */
    @Column(nullable = false)
    private Integer status;

    /** Số bản ghi trả về (totalElements) */
    @Column(name = "result_count")
    private Long resultCount;

    @Column(name = "called_at", nullable = false)
    private Instant calledAt;

    @PrePersist
    void onCreate() {
        if (calledAt == null) calledAt = Instant.now();
    }
}
