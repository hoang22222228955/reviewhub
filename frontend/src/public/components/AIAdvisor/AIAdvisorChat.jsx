import { useState } from "react";
import styles from "./AIAdvisorChat.module.css";

export default function AIAdvisorChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Xin chÃ o! TÃ´i lÃ  AI tÆ° váº¥n gÃ³i dá»‹ch vá»¥. Báº¡n cáº§n quota bao nhiÃªu request/thÃ¡ng hoáº·c cÃ³ cáº§n AI moderation khÃ´ng?",
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
      const res = await fetch("https://reviewhub-backend-ki8w.onrender.com/api/ai/advisor", {
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
          text: "Lá»—i káº¿t ná»‘i AI: " + err.message,
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
          <h2>AI tÆ° váº¥n gÃ³i phÃ¹ há»£p</h2>
          <p>Online Â· Sáºµn sÃ ng há»— trá»£ báº¡n chá»n gÃ³i</p>
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
              Äang suy nghÄ©...
            </div>
          </div>
        )}
      </div>

      <div className={styles.quickReplies}>
        <button onClick={() => setMessage("TÃ´i cáº§n AI moderation cho app review")}>
          Cáº§n AI moderation
        </button>
        <button onClick={() => setMessage("TÃ´i cáº§n khoáº£ng 20000 request má»—i thÃ¡ng")}>
          20.000 request/thÃ¡ng
        </button>
        <button onClick={() => setMessage("Mua nhiá»u cÃ³ Ä‘Æ°á»£c giáº£m giÃ¡ khÃ´ng?")}>
          Há»i Æ°u Ä‘Ã£i
        </button>
      </div>

      <div className={styles.inputBar}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nháº­p tin nháº¯n..."
          rows={1}
        />

        <button onClick={handleAsk} disabled={loading || !message.trim()}>
          Gá»­i
        </button>
      </div>
    </section>
  );
}
