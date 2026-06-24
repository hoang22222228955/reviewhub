package com.doan.reviewhub.controller;

import com.doan.reviewhub.service.AuthService;
import com.doan.reviewhub.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class OtpController {

    private final OtpService  otpService;
    private final AuthService authService;

    /**
     * POST /api/auth/send-otp
     * Body: { "phone": "0909888999" }
     * Tạo OTP và "gửi" về SĐT (log console + trả về trong field otpDemo cho môi trường dev).
     */
    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Số điện thoại không được để trống."));
        }
        String code = otpService.generateAndStore(phone);
        // otpDemo: chỉ dùng trong môi trường demo/dev khi chưa có SMS thật
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã gửi mã OTP.", "otpDemo", code));
    }

    /**
     * POST /api/auth/verify-otp
     * Body: { "phone": "0909888999", "otp": "123456" }
     * Xác minh OTP mà KHÔNG xoá khỏi store (để bước đăng ký/đổi mật khẩu vẫn có thể dùng).
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp   = body.get("otp");
        if (phone == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu thông tin."));
        }
        boolean ok = otpService.isValid(phone, otp);
        if (!ok) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Mã OTP không đúng hoặc đã hết hạn."));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Xác minh thành công."));
    }

    /**
     * POST /api/auth/forgot-password
     * Body: { "phone": "0909888999", "otp": "123456", "newPassword": "abc123" }
     * Xác minh OTP rồi đổi mật khẩu.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String phone       = body.get("phone");
        String otp         = body.get("otp");
        String newPassword = body.get("newPassword");

        if (phone == null || otp == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "Mật khẩu mới phải có ít nhất 6 ký tự."));
        }

        // Xác minh OTP (và xoá sau khi dùng)
        boolean verified = otpService.verify(phone, otp);
        if (!verified) {
            return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "Mã OTP không đúng hoặc đã hết hạn."));
        }

        boolean changed = authService.forgotPassword(phone, newPassword);
        if (!changed) {
            return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "Không tìm thấy tài khoản với số điện thoại này."));
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Đổi mật khẩu thành công."));
    }
}
