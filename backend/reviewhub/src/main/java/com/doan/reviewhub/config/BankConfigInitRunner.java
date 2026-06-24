package com.doan.reviewhub.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Tự động tạo bảng bank_config nếu chưa tồn tại,
 * và chèn bản ghi mặc định (id=1) nếu bảng rỗng.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class BankConfigInitRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS bank_config (
                        id          BIGINT PRIMARY KEY,
                        bank_id     VARCHAR(20)  NOT NULL,
                        account_no  VARCHAR(50)  NOT NULL,
                        account_name VARCHAR(100) NOT NULL,
                        bank_name   VARCHAR(100) NOT NULL
                    )
                    """);

            jdbcTemplate.execute("""
                    INSERT INTO bank_config (id, bank_id, account_no, account_name, bank_name)
                    VALUES (1, 'MB', '0859693664', 'PHAM QUOC NHAT', 'MB Bank')
                    ON CONFLICT (id) DO NOTHING
                    """);

            log.info("BankConfig table ready.");
        } catch (Exception e) {
            log.warn("BankConfigInitRunner error (non-fatal): {}", e.getMessage());
        }
    }
}
