package com.doan.reviewhub.controller;

import com.doan.reviewhub.dto.UserDto;
import com.doan.reviewhub.entity.Plan;
import com.doan.reviewhub.entity.PurchaseHistory;
import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.PlanRepository;
import com.doan.reviewhub.repository.PurchaseHistoryRepository;
import com.doan.reviewhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class PurchaseController {

    private final PlanRepository planRepository;
    private final UserRepository userRepository;
    private final PurchaseHistoryRepository purchaseHistoryRepository;

    private ResponseEntity<?> requireLogin(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "Bạn chưa đăng nhập."
            ));
        }

        return null;
    }

    private ResponseEntity<?> requireAdmin(Authentication auth) {
        ResponseEntity<?> loginCheck = requireLogin(auth);

        if (loginCheck != null) {
            return loginCheck;
        }

        User caller = (User) auth.getPrincipal();

        if (!"admin".equals(caller.getRole())) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Chỉ admin mới được thực hiện thao tác này."
            ));
        }

        return null;
    }

    // BỔ SUNG NHẸ: đọc dữ liệu gói tự chọn mà không đổi bảng / không thêm cột DB.
    private String readString(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private int readInt(Object value, int fallback) {
        try {
            if (value instanceof Number n) return n.intValue();
            String text = readString(value);
            if (!text.isBlank()) return Integer.parseInt(text);
        } catch (Exception ignored) {
        }
        return fallback;
    }

    private List<String> readStringList(Object value) {
        List<String> result = new ArrayList<>();

        if (value instanceof Iterable<?> iterable) {
            for (Object item : iterable) {
                String text = readString(item);
                if (!text.isBlank()) result.add(text);
            }
            return result;
        }

        String raw = readString(value);
        if (raw.isBlank()) return result;

        for (String part : raw.split(",")) {
            String text = part.trim();
            if (!text.isBlank()) result.add(text);
        }

        return result;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "";
    }

    private boolean isCustomPlan(String planId) {
        return planId != null && planId.trim().equalsIgnoreCase("custom");
    }

    private String normalizeCustomLevel(String level) {
        String value = level == null ? "" : level.trim().toLowerCase();
        if (value.equals("growth") || value.equals("enterprise") || value.equals("starter")) return value;
        return "starter";
    }

    private String resolvePlanIdForLookup(String planId, String level) {
        return isCustomPlan(planId) ? normalizeCustomLevel(level) : planId;
    }

    private String readStatusField(String status, String key) {
        if (status == null || status.isBlank() || key == null || key.isBlank()) return "";
        String prefix = key + "=";
        for (String part : status.split("\\|")) {
            String text = part.trim();
            if (text.startsWith(prefix)) return text.substring(prefix.length()).trim();
        }
        return "";
    }

    private String cleanStatusLabel(String status) {
        if (status == null) return "";
        int pipe = status.indexOf('|');
        return pipe >= 0 ? status.substring(0, pipe) : status;
    }

    private String buildPendingStatus(String paymentMethod, int qty, List<String> selectedServiceCodes, List<String> categories, String level) {
        String method = paymentMethod == null || paymentMethod.isBlank() ? "banking" : paymentMethod.trim();
        String status = "pending:" + method + "|qty=" + Math.max(1, qty);

        if (!selectedServiceCodes.isEmpty()) {
            status += "|service=" + selectedServiceCodes.get(0);
            status += "|items=" + String.join(",", selectedServiceCodes);
        }

        if (!categories.isEmpty()) {
            status += "|categories=" + String.join(",", categories);
        }

        if (level != null && !level.isBlank()) {
            status += "|level=" + normalizeCustomLevel(level);
        }

        return status;
    }

    private String selectedServiceCode(PurchaseHistory history) {
        return readStatusField(history.getStatus(), "service");
    }

    private String selectedServiceCodes(PurchaseHistory history) {
        String items = readStatusField(history.getStatus(), "items");
        return !items.isBlank() ? items : selectedServiceCode(history);
    }

    private String selectedCategories(PurchaseHistory history) {
        return readStatusField(history.getStatus(), "categories");
    }

    private String customLevel(PurchaseHistory history) {
        return readStatusField(history.getStatus(), "level");
    }

    private int countSelectedServices(PurchaseHistory history) {
        List<String> codes = readStringList(selectedServiceCodes(history));
        return Math.max(1, codes.size());
    }

    private String getDisplayPlanName(String planId, Plan plan, String level) {
        if (isCustomPlan(planId)) {
            String safeLevel = normalizeCustomLevel(level);
            String levelName = plan != null && plan.getName() != null && !plan.getName().isBlank()
                    ? plan.getName()
                    : switch (safeLevel) {
                        case "growth" -> "Tăng trưởng";
                        case "enterprise" -> "Doanh nghiệp";
                        default -> "Khởi đầu";
                    };
            return "Tự chọn - " + levelName;
        }

        return plan != null && plan.getName() != null ? plan.getName() : planId;
    }

    /**
     * Partner mua gói và kích hoạt ngay.
     * POST /api/partner/purchase-plan
     * Body: { "planId": "starter" }
     */
    @PostMapping("/api/partner/purchase-plan")
    public ResponseEntity<?> purchasePlan(
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        ResponseEntity<?> loginCheck = requireLogin(auth);

        if (loginCheck != null) {
            return loginCheck;
        }

        User caller = (User) auth.getPrincipal();

        String planId = body.get("planId");

        if (planId == null || planId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Thiếu planId."
            ));
        }

        Plan plan = planRepository.findById(planId).orElse(null);

        if (plan == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "Không tìm thấy gói: " + planId
            ));
        }

        User user = userRepository.findById(caller.getId()).orElse(caller);

        Instant now = Instant.now();
        Instant expiresAt = now.plus(plan.getDurationDays(), ChronoUnit.DAYS);

        user.setCurrentPlanId(planId);
        user.setPlanActivatedAt(now);
        user.setPlanExpiresAt(expiresAt);
        user.setQuotaTotal(plan.getQuotaLimit());
        user.setQuotaUsed(0);
        user.setMembershipLabel(plan.getName());

        if (!"admin".equals(user.getRole())) {
            user.setRole("partner");
        }

        userRepository.save(user);

        PurchaseHistory history = PurchaseHistory.builder()
                .id(UUID.randomUUID().toString())
                .userId(user.getId())
                .planId(planId)
                .amount(plan.getPrice())
                .purchasedAt(now)
                .status("Đã thanh toán")
                .build();

        purchaseHistoryRepository.save(history);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "user", UserDto.from(user)
        ));
    }

    /**
     * Partner xem lịch sử mua hàng của chính mình.
     * GET /api/partner/my-purchases
     */
    @GetMapping("/api/partner/my-purchases")
    public ResponseEntity<?> myPurchases(Authentication auth) {
        ResponseEntity<?> loginCheck = requireLogin(auth);

        if (loginCheck != null) {
            return loginCheck;
        }

        User caller = (User) auth.getPrincipal();

        List<PurchaseHistory> list =
                purchaseHistoryRepository.findByUserIdOrderByPurchasedAtDesc(caller.getId());

        Map<String, Plan> planMap = planRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        Plan::getId,
                        Function.identity(),
                        (a, b) -> a
                ));

        List<Map<String, Object>> result = list.stream()
                .map(h -> {
                    String lookupPlanId = resolvePlanIdForLookup(h.getPlanId(), customLevel(h));
                    Plan p = planMap.get(lookupPlanId);

                    return Map.<String, Object>of(
                            "id", h.getId(),
                            "planId", h.getPlanId(),
                            "planName", getDisplayPlanName(h.getPlanId(), p, customLevel(h)),
                            "amount", h.getAmount(),
                            "purchasedAt", h.getPurchasedAt() != null ? h.getPurchasedAt().toString() : "",
                            "status", cleanStatusLabel(h.getStatus())
                    );
                })
                .toList();

        return ResponseEntity.ok(result);
    }

    /**
     * Admin xem lịch sử mua hàng của tất cả partners.
     * GET /api/admin/purchases
     */
    @GetMapping("/api/admin/purchases")
    public ResponseEntity<?> listPurchases(Authentication auth) {
        try {
            ResponseEntity<?> adminCheck = requireAdmin(auth);

            if (adminCheck != null) {
                return adminCheck;
            }

            List<PurchaseHistory> all = purchaseHistoryRepository.findAll();

            Map<String, User> userMap = userRepository.findAll()
                    .stream()
                    .collect(Collectors.toMap(
                            User::getId,
                            Function.identity(),
                            (a, b) -> a
                    ));

            Map<String, Plan> planMap = planRepository.findAll()
                    .stream()
                    .collect(Collectors.toMap(
                            Plan::getId,
                            Function.identity(),
                            (a, b) -> a
                    ));

            List<Map<String, Object>> result = all.stream()
                    .sorted(
                            Comparator.comparing(
                                            PurchaseHistory::getPurchasedAt,
                                            Comparator.nullsLast(Comparator.naturalOrder())
                                    )
                                    .reversed()
                    )
                    .map(h -> {
                        User u = userMap.get(h.getUserId());
                        String lookupPlanId = resolvePlanIdForLookup(h.getPlanId(), customLevel(h));
                        Plan p = planMap.get(lookupPlanId);

                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("id", h.getId());
                        row.put("userId", h.getUserId() != null ? h.getUserId() : "");
                        row.put("partnerName", u != null && u.getName() != null ? u.getName() : "—");
                        row.put("partnerCode", u != null && u.getPartnerCode() != null ? u.getPartnerCode() : "—");
                        row.put("orgName", u != null && u.getOrgName() != null ? u.getOrgName() : "—");
                        row.put("planId", h.getPlanId() != null ? h.getPlanId() : "");
                        row.put("planName", getDisplayPlanName(h.getPlanId(), p, customLevel(h)));
                        row.put("amount", h.getAmount());
                        row.put("purchasedAt", h.getPurchasedAt() != null ? h.getPurchasedAt().toString() : "");
                        row.put("status", cleanStatusLabel(h.getStatus()));
                        row.put("selectedServiceCode", selectedServiceCode(h));
                        row.put("selectedServiceCodes", selectedServiceCodes(h));
                        row.put("selectedCategories", selectedCategories(h));
                        row.put("customLevel", customLevel(h));
                        row.put("assignedOperatorCode", u != null && u.getAssignedOperatorCode() != null ? u.getAssignedOperatorCode() : "");
                        return row;
                    })
                    .toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Lỗi khi tải lịch sử mua gói.",
                    "error", e.getClass().getName(),
                    "detail", e.getMessage() == null ? "" : e.getMessage()
            ));
        }
    }

    /**
     * Partner gửi yêu cầu thanh toán — chỉ tạo đơn pending.
     * POST /api/partner/submit-payment
     * Body gói cũ: { "planId": "starter", "qty": 1, "paymentMethod": "banking" }
     * Body gói tự chọn: { "planId": "custom", "level": "starter", "price": 720000, "selectedServiceCodes": ["PT-001", "PT-002"] }
     */
    @PostMapping("/api/partner/submit-payment")
    public ResponseEntity<?> submitPayment(
            @RequestBody Map<String, Object> body,
            Authentication auth
    ) {
        ResponseEntity<?> loginCheck = requireLogin(auth);

        if (loginCheck != null) {
            return loginCheck;
        }

        User caller = (User) auth.getPrincipal();

        String planId = readString(body.get("planId"));
        int qty = readInt(body.get("qty"), 1);
        if (qty <= 0) qty = 1;

        String paymentMethod = firstNonBlank(readString(body.get("paymentMethod")), "banking");

        if (planId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Thiếu planId."
            ));
        }

        List<String> selectedServiceCodes = readStringList(
                body.containsKey("selectedServiceCodes") ? body.get("selectedServiceCodes") : body.get("items")
        );
        List<String> categories = readStringList(
                body.containsKey("categories") ? body.get("categories") : body.get("selectedCategories")
        );

        String level = firstNonBlank(readString(body.get("level")), readString(body.get("customLevel")));
        if (isCustomPlan(planId)) level = normalizeCustomLevel(level);

        String lookupPlanId = resolvePlanIdForLookup(planId, level);
        Plan plan = planRepository.findById(lookupPlanId).orElse(null);

        if (plan == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", isCustomPlan(planId)
                            ? "Không tìm thấy mức gói tự chọn: " + lookupPlanId
                            : "Không tìm thấy gói: " + planId
            ));
        }

        int selectedCount = Math.max(1, selectedServiceCodes.size());
        int amount;

        if (isCustomPlan(planId)) {
            int priceFromFrontend = readInt(body.get("price"), 0);
            int fallback = plan.getPrice() * selectedCount * qty;
            if (selectedCount >= 2) {
                fallback = (int) Math.round(fallback * 0.9);
            }
            amount = priceFromFrontend > 0 ? priceFromFrontend : fallback;
        } else {
            // Giữ nguyên logic cũ của 3 gói cố định: lấy giá từ DB.
            amount = plan.getPrice() * qty;
        }

        PurchaseHistory history = PurchaseHistory.builder()
                .id(UUID.randomUUID().toString())
                .userId(caller.getId())
                .planId(planId)
                .amount(amount)
                .purchasedAt(Instant.now())
                .status(buildPendingStatus(paymentMethod, qty, selectedServiceCodes, categories, level))
                .build();

        purchaseHistoryRepository.save(history);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đơn đặt hàng đã gửi. Vui lòng chờ admin duyệt.",
                "purchaseId", history.getId()
        ));
    }

    /**
     * Admin duyệt đơn thanh toán.
     * POST /api/admin/approve-purchase/{purchaseId}
     */
    @PostMapping("/api/admin/approve-purchase/{purchaseId}")
    public ResponseEntity<?> approvePurchase(
            @PathVariable String purchaseId,
            Authentication auth
    ) {
        ResponseEntity<?> adminCheck = requireAdmin(auth);

        if (adminCheck != null) {
            return adminCheck;
        }

        PurchaseHistory history = purchaseHistoryRepository.findById(purchaseId).orElse(null);

        if (history == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "Không tìm thấy đơn."
            ));
        }

        if (history.getStatus() == null || !history.getStatus().startsWith("pending")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Đơn này không ở trạng thái chờ duyệt."
            ));
        }

        String level = customLevel(history);
        String lookupPlanId = resolvePlanIdForLookup(history.getPlanId(), level);
        Plan plan = planRepository.findById(lookupPlanId).orElse(null);

        if (plan == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", isCustomPlan(history.getPlanId())
                            ? "Không tìm thấy mức gói tự chọn: " + lookupPlanId
                            : "Không tìm thấy gói."
            ));
        }

        User user = userRepository.findById(history.getUserId()).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "Không tìm thấy user."
            ));
        }

        Instant now = Instant.now();

        int qty = readInt(readStatusField(history.getStatus(), "qty"), 1);
        if (qty <= 0) qty = 1;

        Instant expiresAt = now.plus((long) plan.getDurationDays() * qty, ChronoUnit.DAYS);
        int serviceCount = isCustomPlan(history.getPlanId()) ? countSelectedServices(history) : 1;

        // Gói tự chọn dùng quyền của cấp bậc đã chọn: starter/growth/enterprise.
        user.setCurrentPlanId(lookupPlanId);
        user.setPlanActivatedAt(now);
        user.setPlanExpiresAt(expiresAt);
        user.setQuotaTotal(plan.getQuotaLimit() * qty * serviceCount);
        user.setQuotaUsed(0);
        user.setMembershipLabel(getDisplayPlanName(history.getPlanId(), plan, level));

        String selectedCodes = selectedServiceCodes(history);
        if (!selectedCodes.isBlank()) {
            user.setAssignedOperatorCode(selectedCodes);
        }

        if (!"admin".equals(user.getRole())) {
            user.setRole("partner");
        }

        userRepository.save(user);

        String oldStatus = history.getStatus() == null ? "" : history.getStatus();
        int metaIndex = oldStatus.indexOf('|');
        String metaSuffix = metaIndex >= 0 ? oldStatus.substring(metaIndex) : "";
        history.setStatus("Đã thanh toán" + metaSuffix);
        purchaseHistoryRepository.save(history);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã duyệt và kích hoạt gói."
        ));
    }

    /**
     * Admin từ chối đơn thanh toán.
     * POST /api/admin/reject-purchase/{purchaseId}
     */
    @PostMapping("/api/admin/reject-purchase/{purchaseId}")
    public ResponseEntity<?> rejectPurchase(
            @PathVariable String purchaseId,
            Authentication auth
    ) {
        ResponseEntity<?> adminCheck = requireAdmin(auth);

        if (adminCheck != null) {
            return adminCheck;
        }

        PurchaseHistory history = purchaseHistoryRepository.findById(purchaseId).orElse(null);

        if (history == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "Không tìm thấy đơn."
            ));
        }

        String oldStatus = history.getStatus() == null ? "" : history.getStatus();
        int metaIndex = oldStatus.indexOf('|');
        String metaSuffix = metaIndex >= 0 ? oldStatus.substring(metaIndex) : "";
        history.setStatus("Từ chối" + metaSuffix);
        purchaseHistoryRepository.save(history);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã từ chối đơn."
        ));
    }

    /**
     * Partner hủy gói hiện tại.
     * POST /api/partner/cancel-plan
     */
    @PostMapping("/api/partner/cancel-plan")
    public ResponseEntity<?> cancelPlan(Authentication auth) {
        ResponseEntity<?> loginCheck = requireLogin(auth);

        if (loginCheck != null) {
            return loginCheck;
        }

        User caller = (User) auth.getPrincipal();
        User user = userRepository.findById(caller.getId()).orElse(caller);

        if (user.getCurrentPlanId() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Bạn chưa có gói nào đang kích hoạt."
            ));
        }

        user.setCurrentPlanId(null);
        user.setPlanActivatedAt(null);
        user.setPlanExpiresAt(null);
        user.setQuotaTotal(0);
        user.setQuotaUsed(0);
        user.setMembershipLabel(null);

        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "user", UserDto.from(user)
        ));
    }

    /**
     * Partner upload logo base64.
     * POST /api/partner/upload-logo
     * Body: { "logoBase64": "data:image/png;base64,..." }
     */
    @PostMapping("/api/partner/upload-logo")
    public ResponseEntity<?> uploadLogo(
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        ResponseEntity<?> loginCheck = requireLogin(auth);

        if (loginCheck != null) {
            return loginCheck;
        }

        String logoBase64 = body.get("logoBase64");

        if (logoBase64 == null || logoBase64.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Thiếu dữ liệu logo."
            ));
        }

        if (logoBase64.length() > 2_800_000) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Logo không được vượt quá 2MB."
            ));
        }

        if (!logoBase64.startsWith("data:image/")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Định dạng không hợp lệ. Chỉ chấp nhận ảnh."
            ));
        }

        User caller = (User) auth.getPrincipal();
        User user = userRepository.findById(caller.getId()).orElse(caller);

        user.setLogoUrl(logoBase64);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "user", UserDto.from(user)
        ));
    }
}
