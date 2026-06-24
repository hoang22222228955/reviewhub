package com.doan.reviewhub.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OTP service lưu mã xác thực trong bộ nhớ (in-memory).
 * Thời hạn mỗi mã: 5 phút.
 * Trong môi trường production thực tế sẽ tích hợp nhà cung cấp SMS.
 */
@Service
public class OtpService {

    private static final long OTP_TTL_SECONDS = 300; // 5 phút
    private static final int  OTP_LENGTH       = 6;

    private record OtpEntry(String code, Instant expiresAt) {}

    private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();
    private final Random random = new Random();

    /** Tạo OTP mới cho số điện thoại, ghi đè mã cũ nếu có. */
    public String generateAndStore(String phone) {
        String code = String.format("%0" + OTP_LENGTH + "d",
                random.nextInt((int) Math.pow(10, OTP_LENGTH)));
        store.put(normalize(phone), new OtpEntry(code, Instant.now().plusSeconds(OTP_TTL_SECONDS)));

        // TODO: Tích hợp SMS provider (Twilio / ESMS / Zalo OTP) ở đây.
        System.out.printf("[OTP] Gửi đến %s: %s (hết hạn sau 5 phút)%n", phone, code);
        return code; // Trả về để dùng trong môi trường dev/demo
    }

    /** Xác minh OTP. Trả true nếu đúng và còn hạn, đồng thời xoá mã khỏi store. */
    public boolean verify(String phone, String code) {
        OtpEntry entry = store.get(normalize(phone));
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiresAt())) {
            store.remove(normalize(phone));
            return false;
        }
        if (!entry.code().equals(code.trim())) return false;
        store.remove(normalize(phone)); // Mã dùng 1 lần
        return true;
    }

    /** Kiểm tra OTP còn hợp lệ mà không xoá (dùng khi bước verify tách với bước đăng ký). */
    public boolean isValid(String phone, String code) {
        OtpEntry entry = store.get(normalize(phone));
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiresAt())) {
            store.remove(normalize(phone));
            return false;
        }
        return entry.code().equals(code.trim());
    }

    /** Xoá OTP của số điện thoại (sau khi đăng ký thành công). */
    public void invalidate(String phone) {
        store.remove(normalize(phone));
    }

    private String normalize(String phone) {
        return phone == null ? "" : phone.trim().replaceAll("\\s+", "");
    }
}
