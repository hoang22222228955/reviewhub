package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.Review;
import com.doan.reviewhub.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/ai")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PublicReviewAIController {

    private final ReviewRepository reviewRepository;

    /*
     * Giới hạn số review AI public đọc từ DB để tránh OutOfMemory trên Render.
     * Không dùng reviewRepository.findAll() trực tiếp trong API public AI.
     */
    private static final int MAX_AI_REVIEW_SCAN = 1000;

    /*
     * Giới hạn review theo từng dịch vụ.
     * Ví dụ MB-009 có 82 review thì vẫn lấy đủ, nhưng không quét toàn DB.
     */
    private static final int MAX_AI_REVIEW_PER_SERVICE = 500;

    @GetMapping("/top-services")
    public ResponseEntity<?> topServices(
            @RequestParam(defaultValue = "nhaxe") String category,
            @RequestParam(defaultValue = "10") int limit
    ) {
        String safeCategory = safe(category);
        int safeLimit = Math.max(1, Math.min(limit, 20));

        List<Map<String, Object>> data = buildServiceStats()
                .stream()
                .filter(item -> matchCategory(item.category, item.code, safeCategory))
                .sorted(Comparator
                        .comparingDouble(ServiceStat::score).reversed()
                        .thenComparing(Comparator.comparingDouble((ServiceStat item) -> item.averageRating).reversed())
                        .thenComparing(Comparator.comparingLong((ServiceStat item) -> item.totalReviews).reversed()))
                .limit(safeLimit)
                .map(this::toRankingMap)
                .toList();

        return ResponseEntity.ok(Map.of(
                "category", safeCategory,
                "total", data.size(),
                "data", data
        ));
    }

    @GetMapping("/search-service")
    public ResponseEntity<?> searchService(@RequestParam(defaultValue = "") String q) {
        String keyword = safe(q);

        if (keyword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Vui lòng nhập tên dịch vụ cần tìm."
            ));
        }

        List<Map<String, Object>> matches = buildServiceStats()
                .stream()
                .map(item -> Map.entry(item, matchScore(item, keyword)))
                .filter(entry -> entry.getValue() >= 50)
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(entry -> {
                    ServiceStat item = entry.getKey();

                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("targetCode", item.code);
                    map.put("targetName", item.name);
                    map.put("category", item.category);
                    map.put("label", serviceLabel(item));
                    map.put("totalReviews", item.totalReviews);
                    map.put("averageRating", round1(item.averageRating));
                    map.put("matchScore", entry.getValue());
                    return map;
                })
                .toList();

        return ResponseEntity.ok(Map.of(
                "query", keyword,
                "total", matches.size(),
                "matches", matches
        ));
    }

    @GetMapping("/review-summary")
    public ResponseEntity<?> reviewSummary(@RequestParam(defaultValue = "") String targetCode) {
        String code = extractServiceCode(targetCode);

        if (code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Vui lòng truyền targetCode."
            ));
        }

        /*
         * Ưu tiên lấy review đúng theo mã dịch vụ.
         * Tránh quét toàn DB nhưng vẫn lấy đủ review của từng mã như MB-009, MB-019...
         */
        List<Review> allPublicReviews = loadPublicApprovedReviewsByCode(code);

        /*
         * Fallback nhẹ cho trường hợp dữ liệu cũ chỉ lưu mã trong rawPayload hoặc tên dịch vụ.
         * Không dùng findAll() toàn DB để tránh OOM.
         */
        if (allPublicReviews.isEmpty()) {
            allPublicReviews = loadPublicApprovedReviews();
        }

        /*
         * Không chỉ so sánh firstNonBlank(targetCode, operatorCode).
         * Lý do: dữ liệu crawl/import có thể lưu mã ở operatorCode, targetCode,
         * ownerPartnerCode hoặc rawPayload; một số dòng chỉ có tên nhà xe.
         */
        Set<String> nameHints = allPublicReviews.stream()
                .filter(review -> reviewHasCode(review, code))
                .flatMap(review -> reviewNameCandidates(review).stream())
                .map(this::normalize)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<Review> reviews = allPublicReviews.stream()
                .filter(review -> reviewBelongsToTarget(review, code, nameHints))
                .toList();

        if (reviews.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "message", "Chưa có dữ liệu review công khai cho dịch vụ này.",
                    "targetCode", code
            ));
        }

        Map<String, Object> summary = buildSummary(code, reviews);

        return ResponseEntity.ok(Map.of(
                "data", summary,
                "publicAnswerOnly", true,
                "rawDataReturned", false
        ));
    }

    private List<Review> loadPublicApprovedReviews() {
        return reviewRepository
                .findAll(PageRequest.of(0, MAX_AI_REVIEW_SCAN))
                .getContent()
                .stream()
                .filter(this::isPublicApproved)
                .toList();
    }

    private List<Review> loadPublicApprovedReviewsByCode(String targetCode) {
        String code = extractServiceCode(targetCode);

        if (code.isBlank()) {
            return List.of();
        }

        return reviewRepository
                .findPublicAiReviewsByCode(code, PageRequest.of(0, MAX_AI_REVIEW_PER_SERVICE))
                .getContent()
                .stream()
                .filter(this::isPublicApproved)
                .toList();
    }

    private String extractServiceCode(String value) {
        String text = safe(value).toUpperCase(Locale.ROOT);

        var matcher = Pattern
                .compile("\\b(PT|KS|MB|TH|TO|DV|BUS|HOTEL|AIR|TRAIN)-\\d+\\b")
                .matcher(text);

        if (matcher.find()) {
            return matcher.group();
        }

        return text.trim();
    }

    private Map<String, Object> buildSummary(String targetCode, List<Review> reviews) {
        long total = reviews.size();
        long good = reviews.stream().filter(r -> rating(r) >= 4).count();
        long bad = reviews.stream().filter(r -> rating(r) <= 2).count();
        long neutral = Math.max(total - good - bad, 0);
        double average = reviews.stream().mapToDouble(this::rating).average().orElse(0);

        List<String> goodTopics = topTopics(
                reviews.stream().filter(r -> rating(r) >= 4).toList()
        );

        List<String> badTopics = topTopics(
                reviews.stream().filter(r -> rating(r) <= 2).toList()
        );

        String targetName = reviews.stream()
                .map(Review::getTargetName)
                .map(this::safe)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse(targetCode);

        String category = reviews.stream()
                .map(Review::getCategory)
                .map(this::safe)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse(typeFromCode(targetCode));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("targetCode", targetCode);
        result.put("targetName", targetName);
        result.put("category", category);
        result.put("label", typeFromCode(targetCode) + " " + targetName);
        result.put("totalReviews", total);
        result.put("averageRating", round1(average));
        result.put("goodReviews", good);
        result.put("badReviews", bad);
        result.put("neutralReviews", neutral);
        result.put("goodPoints", goodTopics);
        result.put("badPoints", badTopics);
        result.put("suggestions", buildSuggestions(total, bad, badTopics));
        result.put("publicAnswerOnly", true);
        result.put("rawDataReturned", false);

        return result;
    }

    private List<ServiceStat> buildServiceStats() {
        Map<String, ServiceStat> grouped = new LinkedHashMap<>();

        for (Review review : loadPublicApprovedReviews()) {
            String code = firstReviewCode(review);
            if (code.isBlank()) continue;

            ServiceStat stat = grouped.computeIfAbsent(code, key -> {
                ServiceStat next = new ServiceStat();
                next.code = key;
                next.name = safe(firstNonBlank(firstReviewName(review), key));
                next.category = safe(firstNonBlank(review.getCategory(), typeFromCode(key)));
                return next;
            });

            String reviewName = firstReviewName(review);
            if (stat.name.isBlank() || stat.name.equalsIgnoreCase(code)) {
                stat.name = safe(firstNonBlank(reviewName, code));
            }

            if (stat.category.isBlank()) {
                stat.category = safe(firstNonBlank(review.getCategory(), typeFromCode(code)));
            }

            double rating = rating(review);
            stat.totalReviews++;
            stat.ratingSum += rating;

            if (rating >= 4) {
                stat.goodReviews++;
            } else if (rating <= 2) {
                stat.badReviews++;
            } else {
                stat.neutralReviews++;
            }
        }

        grouped.values().forEach(ServiceStat::finish);
        return new ArrayList<>(grouped.values());
    }

    private Map<String, Object> toRankingMap(ServiceStat item) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("targetCode", item.code);
        map.put("targetName", item.name);
        map.put("category", item.category);
        map.put("label", serviceLabel(item));
        map.put("totalReviews", item.totalReviews);
        map.put("averageRating", round1(item.averageRating));
        map.put("goodReviews", item.goodReviews);
        map.put("badReviews", item.badReviews);
        map.put("neutralReviews", item.neutralReviews);
        map.put("positiveRate", round1(item.positiveRate));
        map.put("score", round1(item.score()));
        return map;
    }

    private String serviceLabel(ServiceStat item) {
        String type = typeFromCode(item.code);
        String name = safe(item.name);

        if (name.isBlank()) return item.code + " · " + type;
        if (normalize(name).contains(normalize(type))) return item.code + " · " + name;

        return item.code + " · " + type + " " + name;
    }

    private boolean isPublicApproved(Review review) {
        if (review == null) return false;

        String status = normalize(review.getModerationStatus());
        String visibility = normalize(review.getVisibility());
        String source = normalize(review.getSourceSystem());

        boolean statusOk =
                status.isBlank() ||
                        status.equals("approved") ||
                        status.equals("approve") ||
                        status.equals("published") ||
                        status.equals("active") ||
                        status.equals("success") ||
                        status.equals("pending_review") ||
                        status.equals("pending") ||
                        status.equals("hidden");

        boolean publicVisible =
                visibility.isBlank() ||
                        visibility.equals("public") ||
                        visibility.equals("hidden");

        boolean allowedSource =
                source.isBlank() ||
                        source.equals("google") ||
                        source.equals("google-maps") ||
                        source.equals("public") ||
                        source.equals("public-web") ||
                        source.equals("partner-external") ||
                        source.equals("website-doi-tac") ||
                        source.equals("external");

        return statusOk && publicVisible && allowedSource;
    }

    private boolean reviewBelongsToTarget(Review review, String targetCode, Set<String> normalizedNameHints) {
        if (review == null) return false;

        String safeTargetCode = extractServiceCode(targetCode);

        if (reviewHasCode(review, safeTargetCode)) {
            return true;
        }

        if (normalizedNameHints == null || normalizedNameHints.isEmpty()) {
            return false;
        }

        List<String> names = reviewNameCandidates(review)
                .stream()
                .map(this::normalize)
                .filter(value -> !value.isBlank())
                .toList();

        for (String reviewName : names) {
            for (String hint : normalizedNameHints) {
                if (reviewName.equals(hint) ||
                        reviewName.contains(hint) ||
                        hint.contains(reviewName)) {
                    return true;
                }
            }
        }

        return false;
    }

    private boolean reviewHasCode(Review review, String targetCode) {
        String safeTargetCode = extractServiceCode(targetCode);
        if (safeTargetCode.isBlank()) return false;

        return reviewCodeCandidates(review)
                .stream()
                .anyMatch(candidate -> {
                    String code = extractServiceCode(candidate);
                    return code.equals(safeTargetCode) ||
                            code.startsWith(safeTargetCode + "-") ||
                            code.startsWith(safeTargetCode + "_");
                });
    }

    private String firstReviewCode(Review review) {
        return reviewCodeCandidates(review)
                .stream()
                .map(this::extractServiceCode)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse("");
    }

    private String firstReviewName(Review review) {
        return reviewNameCandidates(review)
                .stream()
                .map(this::safe)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse("");
    }

    private List<String> reviewCodeCandidates(Review review) {
        if (review == null) return List.of();

        List<String> values = new ArrayList<>();
        values.add(safe(review.getTargetCode()));
        values.add(safe(review.getOperatorCode()));
        values.add(safe(review.getOwnerPartnerCode()));

        Object rawPayload = review.getRawPayload();

        String[] keys = {
                "targetCode",
                "target_code",
                "operatorCode",
                "operator_code",
                "targetOperatorCode",
                "target_operator_code",
                "assignedOperatorCode",
                "assigned_operator_code",
                "ownerPartnerCode",
                "owner_partner_code",
                "partnerCode",
                "partner_code",
                "hotelCode",
                "hotel_code",
                "serviceCode",
                "service_code",
                "code"
        };

        for (String key : keys) {
            values.add(readRawTextByKey(rawPayload, key, 0));
        }

        return values.stream()
                .map(this::safe)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    private List<String> reviewNameCandidates(Review review) {
        if (review == null) return List.of();

        List<String> values = new ArrayList<>();
        values.add(safe(review.getTargetName()));

        Object rawPayload = review.getRawPayload();

        String[] keys = {
                "targetName",
                "target_name",
                "operatorName",
                "operator_name",
                "partnerName",
                "partner_name",
                "hotelName",
                "hotel_name",
                "serviceName",
                "service_name",
                "orgName",
                "businessName",
                "name",
                "title"
        };

        for (String key : keys) {
            values.add(readRawTextByKey(rawPayload, key, 0));
        }

        return values.stream()
                .map(this::safe)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    private String readRawTextByKey(Object value, String key, int depth) {
        if (value == null || key == null || key.isBlank() || depth > 5) return "";

        if (value instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (key.equalsIgnoreCase(safe(entry.getKey()))) {
                    Object found = entry.getValue();
                    if (found == null) return "";
                    if (found instanceof Map<?, ?> || found instanceof List<?>) {
                        return readRawText(found, depth + 1);
                    }
                    return safe(found);
                }
            }

            for (Object child : map.values()) {
                if (child instanceof Map<?, ?> || child instanceof List<?>) {
                    String found = readRawTextByKey(child, key, depth + 1);
                    if (!found.isBlank()) return found;
                }
            }
        }

        if (value instanceof List<?> list) {
            for (Object child : list) {
                String found = readRawTextByKey(child, key, depth + 1);
                if (!found.isBlank()) return found;
            }
        }

        return "";
    }

    private boolean matchCategory(String category, String code, String selected) {
        String value = normalize(selected);
        String cate = normalize(category);
        String safeCode = extractServiceCode(code);

        if (value.isBlank() || value.equals("all")) return true;

        if (value.contains("nhaxe") || value.contains("nha xe") || value.equals("bus")) {
            return cate.contains("nha xe") || safeCode.startsWith("PT-") || safeCode.startsWith("BUS-");
        }

        if (value.contains("khachsan") || value.contains("khach san") || value.equals("hotel")) {
            return cate.contains("khach san") || safeCode.startsWith("KS-") || safeCode.startsWith("HOTEL-");
        }

        if (value.contains("maybay") || value.contains("may bay") || value.equals("air")) {
            return cate.contains("may bay") || safeCode.startsWith("MB-") || safeCode.startsWith("AIR-");
        }

        if (value.contains("tauhoa") || value.contains("tau hoa") || value.equals("train")) {
            return cate.contains("tau hoa") || safeCode.startsWith("TH-") || safeCode.startsWith("TRAIN-");
        }

        if (value.contains("tour")) {
            return cate.contains("tour") || safeCode.startsWith("TO-");
        }

        if (value.contains("dichvu") || value.contains("dich vu") || value.contains("khac")) {
            return cate.contains("dich vu") || safeCode.startsWith("DV-");
        }

        return cate.contains(value);
    }

    private int matchScore(ServiceStat item, String keyword) {
        String q = normalize(keyword);
        String qCompact = compact(q);
        String name = normalize(item.name);
        String label = normalize(serviceLabel(item));
        String code = normalize(item.code);
        String compactName = compact(name);
        String compactLabel = compact(label);

        if (q.isBlank()) return 0;
        if (q.equals(code)) return 100;
        if (qCompact.equals(compactName) || qCompact.equals(compactLabel)) return 98;
        if (compactName.contains(qCompact) || compactLabel.contains(qCompact)) return 90;
        if (qCompact.contains(compactName) && compactName.length() >= 4) return 85;

        List<String> tokens = Arrays.stream(q.split("\\s+"))
                .filter(token -> token.length() >= 2)
                .toList();

        if (tokens.isEmpty()) return 0;

        long hit = tokens.stream()
                .filter(token -> name.contains(token) || label.contains(token) || code.contains(token))
                .count();

        if (hit == tokens.size()) return 78;
        if (hit > 0) return (int) (hit * 24);

        return 0;
    }

    private List<String> topTopics(List<Review> reviews) {
        Map<String, Long> count = reviews.stream()
                .flatMap(review -> detectTopics(readReviewText(review)).stream())
                .collect(Collectors.groupingBy(item -> item, Collectors.counting()));

        return count.entrySet()
                .stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(4)
                .map(entry -> entry.getKey() + " (" + entry.getValue() + " review)")
                .toList();
    }

    private String readReviewText(Review review) {
        String comment = safe(review.getComment());
        if (!comment.isBlank()) return comment;

        return readRawText(review.getRawPayload(), 0);
    }

    private String readRawText(Object value, int depth) {
        if (value == null || depth > 4) return "";

        if (value instanceof String text) {
            return safe(text);
        }

        if (value instanceof Map<?, ?> map) {
            String[] keys = {
                    "comment", "content", "reviewText", "text", "message",
                    "description", "body", "rawComment", "rawText"
            };

            for (String key : keys) {
                String text = readRawText(map.get(key), depth + 1);
                if (!text.isBlank()) return text;
            }

            for (Object child : map.values()) {
                if (child instanceof Map<?, ?> || child instanceof List<?>) {
                    String text = readRawText(child, depth + 1);
                    if (!text.isBlank()) return text;
                }
            }
        }

        if (value instanceof List<?> list) {
            for (Object item : list) {
                String text = readRawText(item, depth + 1);
                if (!text.isBlank()) return text;
            }
        }

        return "";
    }

    private List<String> detectTopics(String comment) {
        String text = normalize(comment);
        ArrayList<String> topics = new ArrayList<>();

        if (text.isBlank()) {
            topics.add("Trải nghiệm chung");
            return topics;
        }

        if (containsAny(text, "sach", "ve sinh", "ban", "mui", "hoi", "am moc", "nha ve sinh")) {
            topics.add("Vệ sinh / sạch sẽ");
        }

        if (containsAny(text, "tre", "cham", "muon", "dung gio", "sai gio", "doi lau", "delay", "xuat phat", "lich trinh")) {
            topics.add("Giờ giấc / đúng giờ");
        }

        if (containsAny(text, "tai xe", "nhan vien", "phuc vu", "thai do", "le tan", "huong dan vien", "nhiet tinh", "than thien", "cau gat", "khong ho tro")) {
            topics.add("Thái độ phục vụ");
        }

        if (containsAny(text, "gia", "ve", "chi phi", "phu phi", "dat coc", "hoan tien", "thu them", "mac", "re", "gia cao")) {
            topics.add("Giá vé / chi phí");
        }

        if (containsAny(text, "trung chuyen", "don tra", "diem don", "diem tra", "pickup", "dropoff")) {
            topics.add("Đón trả / trung chuyển");
        }

        if (containsAny(text, "thoai mai", "giuong", "ghe", "phong", "tien nghi", "wifi", "dieu hoa", "may lanh", "view", "khong gian")) {
            topics.add("Không gian / tiện nghi");
        }

        if (containsAny(text, "an toan", "lai xe", "phong nhanh", "vuot au", "nguy hiem", "hong", "su co")) {
            topics.add("An toàn");
        }

        if (containsAny(text, "dat ve", "dat phong", "booking", "xac nhan", "ma ve", "doi ve", "huy ve", "checkin", "check in")) {
            topics.add("Đặt chỗ / thủ tục");
        }

        if (containsAny(text, "hanh ly", "vali", "do dac", "mat do", "that lac", "gui do")) {
            topics.add("Hành lý / đồ đạc");
        }

        if (containsAny(text, "an uong", "do an", "bua sang", "buffet", "nuoc uong", "nha hang")) {
            topics.add("Ăn uống / phục vụ kèm");
        }

        if (containsAny(text, "tour", "tham quan", "diem tham quan", "sap xep")) {
            topics.add("Tour / lịch trình");
        }

        if (topics.isEmpty()) topics.add("Trải nghiệm chung");
        return topics.stream().distinct().toList();
    }

    private List<String> buildSuggestions(long total, long bad, List<String> badTopics) {
        List<String> suggestions = new ArrayList<>();

        if (total <= 0) {
            suggestions.add("Chưa đủ dữ liệu để kết luận chắc chắn. Nên chờ thêm review hoặc kiểm tra nguồn đánh giá khác.");
            return suggestions;
        }

        double badRate = bad * 100.0 / total;
        String mainBadTopic = badTopics.isEmpty() ? "" : cleanTopicName(badTopics.get(0));

        if (badRate >= 50) {
            suggestions.add("Không nên quyết định vội vì tỷ lệ phản ánh cần theo dõi đang chiếm hơn một nửa tổng review.");
        } else if (badRate >= 35) {
            suggestions.add("Nên so sánh thêm với dịch vụ cùng nhóm trước khi chọn vì phản ánh tiêu cực đang ở mức cao.");
        } else if (badRate >= 20) {
            suggestions.add("Có thể cân nhắc, nhưng nên đọc kỹ các review gần nhất để xem chất lượng hiện tại có ổn định không.");
        } else {
            suggestions.add("Có thể ưu tiên nếu dịch vụ phù hợp nhu cầu, vì tỷ lệ phản ánh tiêu cực hiện không quá cao.");
        }

        if (!mainBadTopic.isBlank()) {
            suggestions.add("Trước khi đặt, hãy kiểm tra riêng nhóm \"" + mainBadTopic + "\" vì đây là vấn đề bị nhắc lại nhiều nhất.");
            suggestions.add(actionByTopic(mainBadTopic));
        }

        suggestions.add("Nên xem thêm 1-2 dịch vụ khác cùng nhóm để so sánh điểm trung bình, số review và các phản ánh lặp lại.");

        return suggestions.stream().filter(item -> !item.isBlank()).distinct().limit(4).toList();
    }

    private String actionByTopic(String topic) {
        String text = normalize(topic);

        if (text.contains("gia ve") || text.contains("chi phi")) {
            return "Hỏi rõ giá cuối cùng, phụ phí, điều kiện hoàn/hủy và các khoản có thể phát sinh.";
        }

        if (text.contains("thai do") || text.contains("phuc vu")) {
            return "Ưu tiên đọc review mới nhất về cách nhân viên xử lý khi có đổi lịch, khiếu nại hoặc phát sinh.";
        }

        if (text.contains("an toan")) {
            return "Không nên chỉ so sánh theo giá; hãy kiểm tra kỹ phản ánh về an toàn, tài xế và chất lượng vận hành.";
        }

        if (text.contains("ve sinh") || text.contains("sach")) {
            return "Nên xem ảnh/review gần đây vì vệ sinh có thể thay đổi theo từng thời điểm vận hành.";
        }

        if (text.contains("gio giac") || text.contains("dung gio")) {
            return "Hỏi rõ giờ đón/trả, thời gian chờ và chính sách khi trễ chuyến trước khi đặt.";
        }

        if (text.contains("dat cho") || text.contains("thu tuc")) {
            return "Lưu lại xác nhận đặt chỗ, mã vé/mã phòng và điều kiện đổi hủy để tránh tranh chấp.";
        }

        return "Đọc kỹ các review chi tiết trong nhóm này để xem vấn đề có lặp lại gần đây hay chỉ là trường hợp riêng lẻ.";
    }

    private String cleanTopicName(String topic) {
        return safe(topic).replaceAll("\\s*\\(\\d+ review\\)$", "").trim();
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) return true;
        }

        return false;
    }

    private double rating(Review review) {
        return review.getRating() != null ? review.getRating() : 0;
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String typeFromCode(String code) {
        String value = extractServiceCode(code);

        if (value.startsWith("PT-") || value.startsWith("BUS-")) return "Nhà xe";
        if (value.startsWith("KS-") || value.startsWith("HOTEL-")) return "Khách sạn";
        if (value.startsWith("MB-") || value.startsWith("AIR-")) return "Máy bay";
        if (value.startsWith("TH-") || value.startsWith("TRAIN-")) return "Tàu hỏa";
        if (value.startsWith("TO-")) return "Tour";
        if (value.startsWith("DV-")) return "Dịch vụ";

        return "Dịch vụ";
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }

        return "";
    }

    private String safe(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String normalize(Object value) {
        String text = safe(value);

        if (text.isBlank()) return "";

        String nfd = Normalizer.normalize(text, Normalizer.Form.NFD);

        return Pattern.compile("\\p{M}")
                .matcher(nfd)
                .replaceAll("")
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd')
                .replaceAll("[^a-z0-9\\s-]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String compact(String value) {
        return normalize(value).replaceAll("[\\s-]+", "");
    }

    private static class ServiceStat {
        String code = "";
        String name = "";
        String category = "";
        long totalReviews = 0;
        long goodReviews = 0;
        long badReviews = 0;
        long neutralReviews = 0;
        double ratingSum = 0;
        double averageRating = 0;
        double positiveRate = 0;

        void finish() {
            averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;
            positiveRate = totalReviews > 0 ? (goodReviews * 100.0 / totalReviews) : 0;
        }

        double score() {
            double volumeBoost = Math.min(totalReviews, 300) / 300.0 * 12.0;
            double positiveBoost = positiveRate / 100.0 * 28.0;
            double ratingBoost = averageRating / 5.0 * 60.0;
            double penalty = totalReviews < 5 ? 12.0 : 0.0;

            return ratingBoost + positiveBoost + volumeBoost - penalty;
        }
    }
}