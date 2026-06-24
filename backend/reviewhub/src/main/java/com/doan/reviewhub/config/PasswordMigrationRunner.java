package com.doan.reviewhub.config;

import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Chạy một lần khi app khởi động: tìm các user có password chưa được hash BCrypt
 * (không bắt đầu bằng "$2") và hash lại tự động.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PasswordMigrationRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        try {
            List<User> users = userRepository.findAll();
            int migrated = 0;

            for (User user : users) {
                String pwd = user.getPassword();
                if (pwd != null && !pwd.startsWith("$2")) {
                    // Password đang là plain text — hash lại
                    user.setPassword(passwordEncoder.encode(pwd));
                    userRepository.save(user);
                    migrated++;
                    log.info("Migrated password for user: {}", user.getEmail());
                }
            }

            if (migrated > 0) {
                log.info("Password migration complete: {} user(s) updated.", migrated);
            }
        } catch (Exception e) {
            log.warn("Password migration skipped due to error: {}", e.getMessage());
        }
    }
}
