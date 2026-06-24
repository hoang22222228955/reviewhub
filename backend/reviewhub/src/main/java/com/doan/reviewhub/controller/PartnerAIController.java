package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.service.PartnerAIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/partner/ai")
@CrossOrigin(origins = "*")
public class PartnerAIController {

    private final PartnerAIService partnerAIService;

    private User requireUser(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }

        Object principal = auth.getPrincipal();

        if (principal instanceof User user) {
            return user;
        }

        return null;
    }

    @GetMapping("/access")
    public ResponseEntity<?> access(Authentication auth) {
        User user = requireUser(auth);

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "eligible", false,
                    "message", "Bạn cần đăng nhập bằng tài khoản partner."
            ));
        }

        PartnerAIService.PartnerAIAccess access = partnerAIService.checkAccess(user);

        return ResponseEntity.ok(Map.of(
                "eligible", access.eligible(),
                "planName", access.planName(),
                "message", access.message()
        ));
    }

    @GetMapping("/review-stats")
    public ResponseEntity<?> reviewStats(Authentication auth) {
        User user = requireUser(auth);

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "message", "Bạn cần đăng nhập bằng tài khoản partner."
            ));
        }

        PartnerAIService.PartnerAIAccess access = partnerAIService.checkAccess(user);

        if (!access.eligible()) {
            return ResponseEntity.status(403).body(Map.of(
                    "message", access.message(),
                    "planName", access.planName()
            ));
        }

        return ResponseEntity.ok(partnerAIService.buildReviewStats(user));
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        try {
            User user = requireUser(auth);

            if (user == null) {
                return ResponseEntity.status(401).body(Map.of(
                        "message", "Bạn cần đăng nhập bằng tài khoản partner."
                ));
            }

            PartnerAIService.PartnerAIAccess access = partnerAIService.checkAccess(user);

            if (!access.eligible()) {
                return ResponseEntity.status(403).body(Map.of(
                        "message", access.message(),
                        "planName", access.planName()
                ));
            }

            String message = body.getOrDefault("message", "");
            String path = body.getOrDefault("path", "");
            String pageTitle = body.getOrDefault("pageTitle", "");
            String partnerContext = body.getOrDefault("partnerContext", "");

            String result = partnerAIService.chat(
                    user,
                    message,
                    path,
                    pageTitle,
                    partnerContext
            );

            return ResponseEntity.ok(Map.of(
                    "reply", result
            ));
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity
                    .status(500)
                    .body(Map.of(
                            "message", "BACKEND ERROR: " + e.getMessage()
                    ));
        }
    }
}
