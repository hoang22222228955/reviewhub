package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.Plan;
import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PlanController {

    private final PlanRepository planRepository;

    // ── PUBLIC ──────────────────────────────────────────────────────────────

    @GetMapping("/api/plans")
    public ResponseEntity<List<Map<String, Object>>> listPlans() {
        List<Plan> plans = planRepository.findAll();
        List<Map<String, Object>> result = plans.stream()
                .sorted((a, b) -> Integer.compare(a.getPrice(), b.getPrice()))
                .map(this::toMap)
                .toList();
        return ResponseEntity.ok(result);
    }

    // ── ADMIN ────────────────────────────────────────────────────────────────

    @PutMapping("/api/admin/plans/{id}")
    public ResponseEntity<?> updatePlan(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        User caller = (User) auth.getPrincipal();
        if (!"admin".equals(caller.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Chỉ admin mới được sửa gói."));
        }

        Plan plan = planRepository.findById(id).orElse(null);
        if (plan == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Không tìm thấy gói: " + id));
        }

        if (body.containsKey("name"))         plan.setName((String) body.get("name"));
        if (body.containsKey("price"))        plan.setPrice(toInt(body.get("price")));
        if (body.containsKey("quotaLimit"))   plan.setQuotaLimit(toInt(body.get("quotaLimit")));
        if (body.containsKey("durationDays")) plan.setDurationDays(toInt(body.get("durationDays")));
        if (body.containsKey("cycle"))        plan.setCycle((String) body.get("cycle"));
        if (body.containsKey("status"))       plan.setStatus((String) body.get("status"));
        if (body.containsKey("featured"))     plan.setFeatured((Boolean) body.get("featured"));
        if (body.containsKey("description"))  plan.setDescription((String) body.get("description"));
        if (body.containsKey("features"))     plan.setFeatures(toJsonArray(body.get("features")));
        if (body.containsKey("privileges"))   plan.setPrivileges(toJsonArray(body.get("privileges")));

        planRepository.save(plan);
        return ResponseEntity.ok(Map.of("success", true, "plan", toMap(plan)));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Map<String, Object> toMap(Plan p) {
        return Map.of(
                "id",           p.getId(),
                "name",         p.getName(),
                "price",        p.getPrice(),
                "quotaLimit",   p.getQuotaLimit(),
                "durationDays", p.getDurationDays(),
                "cycle",        p.getCycle() != null ? p.getCycle() : "tháng",
                "status",       p.getStatus() != null ? p.getStatus() : "Đang bán",
                "featured",     p.getFeatured() != null && p.getFeatured(),
                "features",     parseJsonArray(p.getFeatures()),
                "privileges",   parseJsonArray(p.getPrivileges())
        );
    }

    /** Parse chuỗi JSON array đơn giản: ["a","b","c"] → List<String> */
    @SuppressWarnings("unchecked")
    private List<String> parseJsonArray(String json) {
        if (json == null || json.isBlank()) return List.of();
        // Spring Boot dùng Jackson internally, body của @RequestBody List đã được parse
        // Với stored TEXT, tự parse thủ công
        String trimmed = json.trim();
        if (!trimmed.startsWith("[")) return List.of();
        trimmed = trimmed.substring(1, trimmed.length() - 1);
        List<String> result = new ArrayList<>();
        for (String part : trimmed.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)")) {
            String s = part.trim().replaceAll("^\"|\"$", "");
            if (!s.isBlank()) result.add(s);
        }
        return result;
    }

    /** Chuyển Object (List hoặc String JSON) sang chuỗi JSON để lưu DB */
    @SuppressWarnings("unchecked")
    private String toJsonArray(Object value) {
        if (value instanceof String s) return s;
        if (value instanceof List<?> list) {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append("\"").append(list.get(i).toString().replace("\"", "\\\"")).append("\"");
            }
            sb.append("]");
            return sb.toString();
        }
        return "[]";
    }

    private int toInt(Object value) {
        if (value instanceof Integer i) return i;
        if (value instanceof Number n) return n.intValue();
        return Integer.parseInt(value.toString());
    }
}
