package com.doan.reviewhub.controller;

import com.doan.reviewhub.dto.UserDto;
import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/partner")
@RequiredArgsConstructor
public class ApiKeyController {

    private final UserRepository userRepository;

    /**
     * POST /api/partner/regenerate-key
     * Tạo lại API key mới cho partner đang đăng nhập.
     * Trả về UserDto mới nhất để frontend cập nhật cache.
     */
    @PostMapping("/regenerate-key")
    public ResponseEntity<?> regenerateKey(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();

        String rawKey = UUID.randomUUID().toString().replace("-", "");
        String newKey = "rh_live_" + rawKey;

        currentUser.setApiKey(newKey);
        currentUser.setUpdatedAt(Instant.now());
        userRepository.save(currentUser);

        return ResponseEntity.ok(UserDto.from(currentUser));
    }
}
