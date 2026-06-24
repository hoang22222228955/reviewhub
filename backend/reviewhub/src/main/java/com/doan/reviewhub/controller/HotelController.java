package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.Hotel;
import com.doan.reviewhub.repository.HotelRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HotelController {

    private final HotelRepository hotelRepository;

    public HotelController(HotelRepository hotelRepository) {
        this.hotelRepository = hotelRepository;
    }

    /*
     * Public API cho frontend:
     * http://localhost:8080/api/public/hotels
     */
    @GetMapping("/public/hotels")
    public ResponseEntity<List<Hotel>> getPublicHotels(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String region
    ) {
        return ResponseEntity.ok(searchHotels(keyword, region));
    }

    /*
     * Internal/admin API:
     * http://localhost:8080/api/hotels
     */
    @GetMapping("/hotels")
    public ResponseEntity<List<Hotel>> getHotels(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String region
    ) {
        return ResponseEntity.ok(searchHotels(keyword, region));
    }

    @GetMapping("/public/hotels/{code}")
    public ResponseEntity<?> getPublicHotelByCode(@PathVariable String code) {
        return hotelRepository.findByHotelCode(code)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body(
                        Map.of(
                                "message", "Không tìm thấy khách sạn",
                                "code", code
                        )
                ));
    }

    @GetMapping("/hotels/{code}")
    public ResponseEntity<?> getHotelByCode(@PathVariable String code) {
        return hotelRepository.findByHotelCode(code)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body(
                        Map.of(
                                "message", "Không tìm thấy khách sạn",
                                "code", code
                        )
                ));
    }

    @PostMapping("/hotels")
    public ResponseEntity<?> createHotel(@RequestBody Hotel hotel) {
        if (hotel.getHotelCode() == null || hotel.getHotelCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "hotelCode không được để trống")
            );
        }

        if (hotel.getHotelName() == null || hotel.getHotelName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "hotelName không được để trống")
            );
        }

        if (hotelRepository.existsByHotelCode(hotel.getHotelCode())) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Mã khách sạn đã tồn tại: " + hotel.getHotelCode())
            );
        }

        if (hotel.getAvgRating() == null) {
            hotel.setAvgRating(0.0);
        }

        if (hotel.getTotalReviews() == null) {
            hotel.setTotalReviews(0);
        }

        LocalDateTime now = LocalDateTime.now();

        if (hotel.getCreatedAt() == null) {
            hotel.setCreatedAt(now);
        }

        hotel.setUpdatedAt(now);

        Hotel saved = hotelRepository.save(hotel);

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/hotels/{code}")
    public ResponseEntity<?> updateHotel(
            @PathVariable String code,
            @RequestBody Hotel payload
    ) {
        return hotelRepository.findByHotelCode(code)
                .<ResponseEntity<?>>map(existing -> {
                    if (payload.getHotelName() != null && !payload.getHotelName().trim().isEmpty()) {
                        existing.setHotelName(payload.getHotelName());
                    }

                    if (payload.getRegion() != null) {
                        existing.setRegion(payload.getRegion());
                    }

                    if (payload.getAddress() != null) {
                        existing.setAddress(payload.getAddress());
                    }

                    if (payload.getPhone() != null) {
                        existing.setPhone(payload.getPhone());
                    }

                    if (payload.getWebsite() != null) {
                        existing.setWebsite(payload.getWebsite());
                    }

                    if (payload.getType() != null) {
                        existing.setType(payload.getType());
                    }

                    if (payload.getDescription() != null) {
                        existing.setDescription(payload.getDescription());
                    }

                    if (payload.getImageUrl() != null) {
                        existing.setImageUrl(payload.getImageUrl());
                    }

                    if (payload.getAvgRating() != null) {
                        existing.setAvgRating(payload.getAvgRating());
                    }

                    if (payload.getTotalReviews() != null) {
                        existing.setTotalReviews(payload.getTotalReviews());
                    }

                    existing.setUpdatedAt(LocalDateTime.now());

                    return ResponseEntity.ok(hotelRepository.save(existing));
                })
                .orElseGet(() -> ResponseEntity.status(404).body(
                        Map.of(
                                "message", "Không tìm thấy khách sạn",
                                "code", code
                        )
                ));
    }

    @DeleteMapping("/hotels/{code}")
    public ResponseEntity<?> deleteHotel(@PathVariable String code) {
        return hotelRepository.findByHotelCode(code)
                .<ResponseEntity<?>>map(existing -> {
                    hotelRepository.delete(existing);

                    return ResponseEntity.ok(
                            Map.of(
                                    "message", "Đã xóa khách sạn",
                                    "code", code
                            )
                    );
                })
                .orElseGet(() -> ResponseEntity.status(404).body(
                        Map.of(
                                "message", "Không tìm thấy khách sạn",
                                "code", code
                        )
                ));
    }

    private List<Hotel> searchHotels(String keyword, String region) {
        List<Hotel> hotels;

        if (keyword != null && !keyword.trim().isEmpty()) {
            hotels = hotelRepository.findByHotelNameContainingIgnoreCase(keyword.trim());
        } else if (region != null && !region.trim().isEmpty()) {
            hotels = hotelRepository.findByRegionContainingIgnoreCase(region.trim());
        } else {
            hotels = hotelRepository.findAll();
        }

        return hotels.stream()
                .sorted(
                        Comparator
                                .comparing(Hotel::getTotalReviews, Comparator.nullsLast(Integer::compareTo))
                                .reversed()
                                .thenComparing(Hotel::getAvgRating, Comparator.nullsLast(Double::compareTo))
                                .reversed()
                )
                .toList();
    }
}