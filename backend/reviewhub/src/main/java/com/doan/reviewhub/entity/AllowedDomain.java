package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "allowed_domains",
       uniqueConstraints = @UniqueConstraint(columnNames = {"partner_code", "domain"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AllowedDomain {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partner_code", nullable = false, length = 100)
    private String partnerCode;

    @Column(nullable = false, length = 255)
    private String domain;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
