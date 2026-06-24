import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://reviewhub-backend-ki8w.onrender.com";
import styles from "./AIAdvisorChat.module.css";

export default function AIAdvisorChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Xin chào! Tôi là AI tư vấn gói dịch vụ. Bạn cần quota bao nhiêu request/tháng hoặc có cần AI moderation không?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    const text = message.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/advisor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      const raw = await res.text();

      if (!res.ok) {
        throw new Error(raw || `HTTP ${res.status}`);
      }

      let aiText = raw;

      try {
        const data = JSON.parse(raw);
        aiText =
          data?.output?.[0]?.content?.[0]?.text ||
          raw;
      } catch {
        aiText = raw;
      }

      setMessages((prev) => [...prev, { role: "ai", text: aiText }]);
    } catch (err) {
      console.error("AI ERROR:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Lỗi kết nối AI: " + err.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  return (
    <section className={styles.chatBox}>
      <div className={styles.header}>
        <div className={styles.avatar}>AI</div>
        <div>
          <h2>AI tư vấn gói phù hợp</h2>
          <p>Online · Sẵn sàng hỗ trợ bạn chọn gói</p>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map((m, index) => (
          <div
            key={index}
            className={`${styles.messageRow} ${
              m.role === "user" ? styles.userRow : styles.aiRow
            }`}
          >
            {m.role === "ai" && <div className={styles.smallAvatar}>AI</div>}

            <div
              className={`${styles.bubble} ${
                m.role === "user" ? styles.userBubble : styles.aiBubble
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className={`${styles.messageRow} ${styles.aiRow}`}>
            <div className={styles.smallAvatar}>AI</div>
            <div className={`${styles.bubble} ${styles.aiBubble}`}>
              Đang suy nghĩ...
            </div>
          </div>
        )}
      </div>

      <div className={styles.quickReplies}>
        <button onClick={() => setMessage("Tôi cần AI moderation cho app review")}>
          Cần AI moderation
        </button>
        <button onClick={() => setMessage("Tôi cần khoảng 20000 request mỗi tháng")}>
          20.000 request/tháng
        </button>
        <button onClick={() => setMessage("Mua nhiều có được giảm giá không?")}>
          Hỏi ưu đãi
        </button>
      </div>

      <div className={styles.inputBar}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          rows={1}
        />

        <button onClick={handleAsk} disabled={loading || !message.trim()}>
          Gửi
        </button>
      </div>
    </section>
  );
}