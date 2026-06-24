package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    List<ChatMessage> findByRoomIdOrderBySentAtAsc(String roomId);

    /** Lấy tin nhắn mới nhất của mỗi room (PostgreSQL DISTINCT ON) */
    @Query(value = "SELECT DISTINCT ON (room_id) * FROM chat_messages ORDER BY room_id, sent_at DESC",
           nativeQuery = true)
    List<ChatMessage> findLatestMessagePerRoom();

    /** Đếm tin nhắn chưa đọc của room, loại trừ role đã gửi (để tránh tự đếm) */
    long countByRoomIdAndIsReadFalseAndSenderRoleNot(String roomId, String senderRole);

    /** Lấy tin nhắn chưa đọc để mark as read */
    List<ChatMessage> findByRoomIdAndIsReadFalseAndSenderRoleNot(String roomId, String senderRole);
}
