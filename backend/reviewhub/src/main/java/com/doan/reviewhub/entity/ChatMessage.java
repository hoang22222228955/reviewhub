package com.doan.reviewhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "chat_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessage {

    @Id
    @Column(length = 100)
    private String id;

    /** roomId = partner's userId — mỗi cuộc trò chuyện là giữa 1 partner và admin */
    @Column(name = "room_id", length = 100, nullable = false)
    private String roomId;

    @Column(name = "sender_id", length = 100, nullable = false)
    private String senderId;

    @Column(name = "sender_role", length = 50, nullable = false)
    private String senderRole;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Builder.Default
    @Column(name = "is_read")
    private Boolean isRead = false;
}
