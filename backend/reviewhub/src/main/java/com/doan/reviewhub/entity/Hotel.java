package com.doan.reviewhub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import java.time.LocalDateTime;

@Entity
@Table(name = "hotels", schema = "public")
public class Hotel {

    @Id
    @Column(name = "hotel_code", nullable = false, unique = true, length = 50)
    private String hotelCode;

    @Column(name = "hotel_name", nullable = false, length = 255)
    private String hotelName;

    @Column(name = "region", length = 255)
    private String region;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "type", length = 100)
    private String type;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "avg_rating")
    private Double avgRating;

    @Column(name = "total_reviews")
    private Integer totalReviews;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Hotel() {
    }

    /*
     * Các field phụ để frontend đọc chung format với nhà xe.
     */

    @Transient
    public String getCode() {
        return hotelCode;
    }

    @Transient
    public String getName() {
        return hotelName;
    }

    @Transient
    public String getCategory() {
        return "Khách sạn";
    }

    @Transient
    public String getOperatorCode() {
        return hotelCode;
    }

    @Transient
    public String getOperatorName() {
        return hotelName;
    }

    @Transient
    public String getTargetCode() {
        return hotelCode;
    }

    @Transient
    public String getTargetName() {
        return hotelName;
    }

    @Transient
    public String getPhotoUrl() {
        return imageUrl;
    }

    @Transient
    public String getThumbnail() {
        return imageUrl;
    }

    @Transient
    public String getCoverImage() {
        return imageUrl;
    }

    @Transient
    public Integer getReviewCount() {
        return getTotalReviews();
    }

    @Transient
    public Integer getReviewsCount() {
        return getTotalReviews();
    }

    @Transient
    public Double getAverageRating() {
        return getAvgRating();
    }

    @Transient
    public Double getRating() {
        return getAvgRating();
    }

    public String getHotelCode() {
        return hotelCode;
    }

    public void setHotelCode(String hotelCode) {
        this.hotelCode = hotelCode;
    }

    public String getHotelName() {
        return hotelName;
    }

    public void setHotelName(String hotelName) {
        this.hotelName = hotelName;
    }

    public String getRegion() {
        return region == null || region.trim().isEmpty() ? "Đang cập nhật" : region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getAddress() {
        return address == null || address.trim().isEmpty() ? getRegion() : address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhone() {
        return phone == null ? "" : phone;
    }

    public String getHotline() {
        return getPhone();
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setHotline(String phone) {
        this.phone = phone;
    }

    public String getWebsite() {
        return website == null ? "" : website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public String getType() {
        return type == null || type.trim().isEmpty() ? "Khách sạn" : type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDescription() {
        if (description == null || description.trim().isEmpty()) {
            return "Khách sạn được đánh giá theo vị trí, tiện nghi, vệ sinh, chất lượng phục vụ và trải nghiệm lưu trú thực tế.";
        }

        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImageUrl() {
        return imageUrl == null ? "" : imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Double getAvgRating() {
        return avgRating == null ? 0.0 : avgRating;
    }

    public void setAvgRating(Double avgRating) {
        this.avgRating = avgRating;
    }

    public Integer getTotalReviews() {
        return totalReviews == null ? 0 : totalReviews;
    }

    public void setTotalReviews(Integer totalReviews) {
        this.totalReviews = totalReviews;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}