package com.doan.reviewhub.controller;

import com.doan.reviewhub.entity.ChatMessage;
import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.ChatMessageRepository;
import com.doan.reviewhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    /**
     * Gửi tin nhắn.
     * POST /api/chat/send
     * Partner: body { "content": "..." }  — roomId tự động = sender.getId()
     * Admin:   body { "content": "...", "roomId": "<partnerId>" }
     */
    @PostMapping("/api/chat/send")
    public ResponseEntity<?> sendMessage(
            @RequestBody Map<String, String> body,
            Authentication auth) {

        User sender = (User) auth.getPrincipal();
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nội dung không được để trống."));
        }

        String roomId;
        if ("admin".equals(sender.getRole())) {
            roomId = body.get("roomId");
            if (roomId == null || roomId.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Admin phải cung cấp roomId."));
            }
        } else {
            roomId = sender.getId();
        }

        ChatMessage msg = ChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .roomId(roomId)
                .senderId(sender.getId())
                .senderRole(sender.getRole())
                .content(content.trim())
                .sentAt(Instant.now())
                .isRead(false)
                .build();

        chatMessageRepository.save(msg);
        return ResponseEntity.ok(toMap(msg, sender.getName()));
    }

    /**
     * Lấy tin nhắn của một room và đánh dấu đã đọc.
     * GET /api/chat/messages/{roomId}
     * Partner: chỉ được truy cập room của mình
     * Admin: truy cập được tất cả room
     */
    @GetMapping("/api/chat/messages/{roomId}")
    public ResponseEntity<?> getMessages(
            @PathVariable String roomId,
            Authentication auth) {

        User caller = (User) auth.getPrincipal();

        if (!"admin".equals(caller.getRole()) && !caller.getId().equals(roomId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Không có quyền truy cập room này."));
        }

        List<ChatMessage> messages = chatMessageRepository.findByRoomIdOrderBySentAtAsc(roomId);

        // Build map senderId -> name để tránh N+1 query
        Set<String> senderIds = messages.stream()
                .map(ChatMessage::getSenderId)
                .collect(Collectors.toSet());
        Map<String, String> nameMap = userRepository.findAllById(senderIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));

        List<Map<String, Object>> result = messages.stream()
                .map(m -> toMap(m, nameMap.getOrDefault(m.getSenderId(), "?")))
                .toList();

        return ResponseEntity.ok(result);
    }

    /**
     * Admin: lấy danh sách các room đang có tin nhắn.
     * GET /api/chat/rooms
     */
    @GetMapping("/api/chat/rooms")
    public ResponseEntity<?> getRooms(Authentication auth) {
        User caller = (User) auth.getPrincipal();
        if (!"admin".equals(caller.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Chỉ admin mới có quyền."));
        }

        List<ChatMessage> latest = chatMessageRepository.findLatestMessagePerRoom();

        List<Map<String, Object>> result = latest.stream().map(m -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("roomId", m.getRoomId());

            User partner = userRepository.findById(m.getRoomId()).orElse(null);
            item.put("partnerName", partner != null ? partner.getName() : m.getRoomId());
            item.put("orgName", partner != null ? (partner.getOrgName() != null ? partner.getOrgName() : "") : "");
            item.put("lastMessage", m.getContent());
            item.put("lastMessageAt", m.getSentAt());

            long unread = chatMessageRepository
                    .countByRoomIdAndIsReadFalseAndSenderRoleNot(m.getRoomId(), "admin");
            item.put("unreadCount", unread);

            return item;
        }).toList();

        return ResponseEntity.ok(result);
    }

    /**
     * Đánh dấu đã đọc toàn bộ tin nhắn trong room (chỉ tin của phía kia).
     * PUT /api/chat/read/{roomId}
     */
    @PutMapping("/api/chat/read/{roomId}")
    public ResponseEntity<?> markRead(
            @PathVariable String roomId,
            Authentication auth) {

        User caller = (User) auth.getPrincipal();

        if (!"admin".equals(caller.getRole()) && !caller.getId().equals(roomId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Không có quyền."));
        }

        // Đánh dấu những tin nhắn KHÔNG phải do mình gửi là đã đọc
        List<ChatMessage> unread = chatMessageRepository
                .findByRoomIdAndIsReadFalseAndSenderRoleNot(roomId, caller.getRole());
        unread.forEach(m -> m.setIsRead(true));
        chatMessageRepository.saveAll(unread);

        return ResponseEntity.ok(Map.of("success", true, "marked", unread.size()));
    }

    /**
     * Lấy số tin nhắn chưa đọc cho partner (polling nhẹ).
     * GET /api/chat/unread
     */
    @GetMapping("/api/chat/unread")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        User caller = (User) auth.getPrincipal();

        long count;
        if ("admin".equals(caller.getRole())) {
            // Tổng unread từ tất cả partner
            count = chatMessageRepository.findLatestMessagePerRoom().stream()
                    .mapToLong(m -> chatMessageRepository
                            .countByRoomIdAndIsReadFalseAndSenderRoleNot(m.getRoomId(), "admin"))
                    .sum();
        } else {
            count = chatMessageRepository
                    .countByRoomIdAndIsReadFalseAndSenderRoleNot(caller.getId(), caller.getRole());
        }

        return ResponseEntity.ok(Map.of("unread", count));
    }

    private Map<String, Object> toMap(ChatMessage m, String senderName) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("roomId", m.getRoomId());
        map.put("senderId", m.getSenderId());
        map.put("senderRole", m.getSenderRole());
        map.put("senderName", senderName);
        map.put("content", m.getContent());
        map.put("sentAt", m.getSentAt());
        map.put("isRead", m.getIsRead());
        return map;
    }
}
