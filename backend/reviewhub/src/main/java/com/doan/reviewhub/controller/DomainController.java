package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.AllowedDomain;
import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.AllowedDomainRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partner/domains")
@RequiredArgsConstructor
public class DomainController {

    private final AllowedDomainRepository domainRepository;

    /**
     * GET /api/partner/domains
     * Lấy danh sách domain của partner đang đăng nhập.
     */
    @GetMapping
    public ResponseEntity<?> listDomains(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        String partnerCode = currentUser.getPartnerCode();
        if (partnerCode == null || partnerCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tài khoản chưa được gán partner code."));
        }
        List<AllowedDomain> domains = domainRepository.findByPartnerCodeOrderByCreatedAtDesc(partnerCode);
        return ResponseEntity.ok(domains);
    }

    /**
     * POST /api/partner/domains
     * Body: { "domain": "example.com" }
     * Thêm domain mới cho partner.
     */
    @PostMapping
    public ResponseEntity<?> addDomain(Authentication authentication,
                                       @RequestBody Map<String, String> body) {
        User currentUser = (User) authentication.getPrincipal();
        String partnerCode = currentUser.getPartnerCode();
        if (partnerCode == null || partnerCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tài khoản chưa được gán partner code."));
        }

        String domain = body.getOrDefault("domain", "").trim().toLowerCase();
        if (domain.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Domain không được để trống."));
        }

        // Validate basic domain format
        if (!domain.matches("^[a-z0-9][a-z0-9\\-\\.]{0,253}[a-z0-9]$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Domain không hợp lệ."));
        }

        if (domainRepository.existsByPartnerCodeAndDomain(partnerCode, domain)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Domain này đã được thêm rồi."));
        }

        AllowedDomain saved = domainRepository.save(
            AllowedDomain.builder()
                .partnerCode(partnerCode)
                .domain(domain)
                .build()
        );
        return ResponseEntity.ok(saved);
    }

    /**
     * DELETE /api/partner/domains/{id}
     * Xóa domain theo id (chỉ xóa được domain của chính partner).
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteDomain(Authentication authentication,
                                          @PathVariable Long id) {
        User currentUser = (User) authentication.getPrincipal();
        String partnerCode = currentUser.getPartnerCode();
        if (partnerCode == null || partnerCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tài khoản chưa được gán partner code."));
        }
        domainRepository.deleteByIdAndPartnerCode(id, partnerCode);
        return ResponseEntity.ok(Map.of("message", "Đã xóa domain."));
    }
}
