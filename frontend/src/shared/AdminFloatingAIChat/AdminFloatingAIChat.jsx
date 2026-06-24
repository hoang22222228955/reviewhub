// src/shared/AdminFloatingAIChat/AdminFloatingAIChat.jsx

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../../services/api";
import styles from "./AdminFloatingAIChat.module.css";

function extractAIText(data) {

  if (typeof data === "object" && data !== null) {
    return (
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      JSON.stringify(data)
    );
  }

  if (typeof data !== "string") {
    return String(data);
  }

  try {

    const json = JSON.parse(data);

    return (
      json?.output?.[0]?.content?.[0]?.text ||
      json?.output_text ||
      data
    );

  } catch {

    return data;
  }
}

function getAdminContext() {

  const path = window.location.pathname;

  if (path.includes("doi-tac")) {
    return "Admin đang ở trang Quản lý đối tác.";
  }

  if (path.includes("mua-goi")) {
    return "Admin đang ở trang Lịch sử mua gói.";
  }

  if (path.includes("goi")) {
    return "Admin đang ở trang Quản lý gói.";
  }

  if (path.includes("review")) {
    return "Admin đang ở trang Kiểm duyệt review.";
  }

  if (path.includes("ngan-hang")) {
    return "Admin đang ở trang Cấu hình ngân hàng.";
  }

  return "Admin đang ở trang Tổng quan.";
}

export default function AdminFloatingAIChat() {

  const [open, setOpen] = useState(false);

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "ai",
      text:
`# 👋 Admin AI Pro

Tôi có thể hỗ trợ:

- 📊 Thống kê hệ thống
- 👥 Partner
- 💳 Giao dịch
- ⭐ Review moderation
- 📦 Quản lý gói
- 🐞 Debug frontend/backend

### Ví dụ nhanh

- "Có bao nhiêu đối tác?"
- "Danh sách partner"
- "Review: nhà xe phục vụ như cc"
- "Lỗi 401 là gì?"
`,
    },
  ]);

  const [loading, setLoading] = useState(false);

  async function sendMessage() {

    const text = message.trim();

    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {

      const res = await api.post("/api/admin/ai/chat", {
        message: text,
        path: window.location.pathname,
        pageTitle: document.title || "",
        adminContext: getAdminContext(),
      });

      const aiText = extractAIText(res.data);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: aiText,
        },
      ]);

    } catch (err) {

      console.error(err);

      const status = err.response?.status;

      const backendMsg =
        err.response?.data?.error ||
        err.response?.data;

      let errorText =
        backendMsg ||
        err.message ||
        "Không kết nối được Admin AI.";

      if (status) {
        errorText = `HTTP ${status}\n\n${errorText}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: String(errorText),
        },
      ]);

    } finally {

      setLoading(false);
    }
  }

  function handleKeyDown(e) {

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {!open && (
        <button
          className={styles.floatingButton}
          onClick={() => setOpen(true)}
        >
          AI
        </button>
      )}

      {open && (

        <div className={styles.chatPanel}>

          <div className={styles.chatHeader}>

            <div>
              <h3>Admin AI Pro</h3>
              <p>ReviewHub Internal Assistant</p>
            </div>

            <button
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
            >
              ×
            </button>

          </div>

          <div className={styles.chatBody}>

            {messages.map((m, index) => (

              <div
                key={index}
                className={`${styles.messageRow} ${
                  m.role === "user"
                    ? styles.userRow
                    : styles.aiRow
                }`}
              >

                <div
                  className={`${styles.bubble} ${
                    m.role === "user"
                      ? styles.userBubble
                      : styles.aiBubble
                  }`}
                >

                  {m.role === "user" ? (

                    m.text

                  ) : (

                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                    >
                      {m.text}
                    </ReactMarkdown>

                  )}

                </div>

              </div>
            ))}

            {loading && (
              <div
                className={`${styles.messageRow} ${styles.aiRow}`}
              >
                <div
                  className={`${styles.bubble} ${styles.aiBubble}`}
                >
                  Đang phân tích...
                </div>
              </div>
            )}

          </div>

          <div className={styles.quickReplies}>

            <button
              onClick={() =>
                setMessage("Có bao nhiêu đối tác?")
              }
            >
              Đối tác
            </button>

            <button
              onClick={() =>
                setMessage("Danh sách partner")
              }
            >
              Partner
            </button>

            <button
              onClick={() =>
                setMessage("Review: ")
              }
            >
              Phân tích review:
            </button>

            <button
              onClick={() =>
                setMessage("Lỗi 401 là gì?")
              }
            >
              Debug API
            </button>
            <button
              onClick={() =>
                setMessage("Lịch sử mua gói")
              }
>
              Doanh Thu
           </button>
          </div>

          <div className={styles.inputArea}>

            <textarea
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Hỏi Admin AI..."
              rows={1}
            />

            <button
              onClick={sendMessage}
              disabled={loading || !message.trim()}
            >
              Gửi
            </button>

          </div>

        </div>
      )}
    </>
  );
}