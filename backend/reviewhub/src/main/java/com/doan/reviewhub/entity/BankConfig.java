package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bank_config")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankConfig {

    /** Luôn chỉ có 1 bản ghi với id = 1 */
    @Id
    private Long id;

    @Column(name = "bank_id", length = 20, nullable = false)
    private String bankId;

    @Column(name = "account_no", length = 50, nullable = false)
    private String accountNo;

    @Column(name = "account_name", length = 100, nullable = false)
    private String accountName;

    @Column(name = "bank_name", length = 100, nullable = false)
    private String bankName;
}
