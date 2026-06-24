package com.doan.reviewhub.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    private String name;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 6)
    private String password;

    private String phone;

    /** Mã OTP đã được gửi về số điện thoại. */
    private String otp;
}
