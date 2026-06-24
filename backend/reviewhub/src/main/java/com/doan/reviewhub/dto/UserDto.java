package com.doan.reviewhub.dto;

import com.doan.reviewhub.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.Instant;

@Data @AllArgsConstructor
public class UserDto {
    private String id;
    private String name;
    private String email;
    private String phone;
    private String role;
    private String membershipLabel;
    private String partnerCode;
    private String orgName;
    private String businessType;
    private String domain;
    private String status;
    private String apiKey;
    private Integer quotaTotal;
    private Integer quotaUsed;
    private Instant createdAt;
    private String assignedOperatorCode;
    private String currentPlanId;
    private Instant planActivatedAt;
    private Instant planExpiresAt;
    private String logoUrl;

    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getMembershipLabel(),
                user.getPartnerCode(),
                user.getOrgName(),
                user.getBusinessType(),
                user.getDomain(),
                user.getStatus(),
                user.getApiKey(),
                user.getQuotaTotal(),
                user.getQuotaUsed(),
                user.getCreatedAt(),
                user.getAssignedOperatorCode(),
                user.getCurrentPlanId(),
                user.getPlanActivatedAt(),
                user.getPlanExpiresAt(),
                user.getLogoUrl()
        );
    }
}
