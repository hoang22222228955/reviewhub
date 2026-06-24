import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../../../auth/context/AuthContext'
import api from '../../../services/api'
import styles from './ChatWidget.module.css'

const AI_ROOM_ID = '__ADMIN_AI__'

function playTing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1046, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.06)

    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.55)
    osc.onended = () => ctx.close()
  } catch {}
}

function extractAIText(data) {
  if (typeof data === 'object' && data !== null) {
    return (
      data?.reply ||
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      JSON.stringify(data)
    )
  }

  if (typeof data !== 'string') {
    return String(data)
  }

  try {
    const json = JSON.parse(data)

    return (
      json?.reply ||
      json?.output?.[0]?.content?.[0]?.text ||
      json?.output_text ||
      data
    )
  } catch {
    return data
  }
}

function getAdminContext() {
  const path = window.location.pathname

  if (path.includes('doi-tac')) {
    return 'Admin đang ở trang Quản lý đối tác.'
  }

  if (path.includes('mua-goi')) {
    return 'Admin đang ở trang Lịch sử mua gói.'
  }

  if (path.includes('goi')) {
    return 'Admin đang ở trang Quản lý gói.'
  }

  if (path.includes('review')) {
    return 'Admin đang ở trang Kiểm duyệt review.'
  }

  if (path.includes('ngan-hang')) {
    return 'Admin đang ở trang Cấu hình ngân hàng.'
  }

  return 'Admin đang ở trang Tổng quan.'
}

export default function ChatWidget() {
  const { currentUser } = useAuth()

  const [open, setOpen] = useState(false)
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef(null)
  const openRef = useRef(open)
  const selectedRoomRef = useRef(selectedRoom)
  const prevMsgCountRef = useRef(0)

  const isAdmin = currentUser?.role === 'admin'
  const isAIRoom = selectedRoom === AI_ROOM_ID

  const aiRoom = {
    roomId: AI_ROOM_ID,
    partnerName: 'Admin AI Pro',
    orgName: 'ReviewHub Internal Assistant',
    lastMessage: 'Hỏi AI nội bộ, phân tích review, debug API...',
    unreadCount: 0,
    isAI: true
  }

  const displayRooms = isAdmin ? [aiRoom, ...rooms] : rooms

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    selectedRoomRef.current = selectedRoom
  }, [selectedRoom])

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const newMsgs = messages.slice(prevMsgCountRef.current)

      const hasNewFromOther = newMsgs.some(m => {
        if (isAIRoom) return m.senderRole === 'ai'
        return isAdmin ? m.senderRole !== 'admin' : m.senderId !== currentUser?.id
      })

      if (hasNewFromOther && prevMsgCountRef.current > 0) {
        playTing()
      }
    }

    prevMsgCountRef.current = messages.length
  }, [messages, isAdmin, isAIRoom, currentUser])

  const fetchMessages = useCallback(async (rid, markRead = false) => {
    if (!rid || rid === AI_ROOM_ID) return

    try {
      const res = await api.get(`/api/chat/messages/${rid}`)
      setMessages(res.data)

      if (markRead) {
        await api.put(`/api/chat/read/${rid}`)
      }
    } catch {}
  }, [])

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/api/chat/rooms')
      setRooms(res.data)

      const total = res.data.reduce((s, r) => s + (r.unreadCount || 0), 0)
      setUnreadTotal(total)
    } catch {}
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/api/chat/unread')
      setUnreadTotal(res.data.unread || 0)
    } catch {}
  }, [])

  useEffect(() => {
    if (!currentUser) return

    const tick = () => {
      if (isAdmin) {
        fetchRooms()

        const rid = selectedRoomRef.current

        if (openRef.current && rid && rid !== AI_ROOM_ID) {
          fetchMessages(rid, true)
        }
      } else {
        const rid = currentUser.id

        if (openRef.current) {
          fetchMessages(rid, true)
        } else {
          fetchUnread()
        }
      }
    }

    tick()

    const timer = setInterval(tick, 3000)

    return () => clearInterval(timer)
  }, [currentUser, isAdmin, fetchRooms, fetchMessages, fetchUnread])

  useEffect(() => {
    if (!selectedRoom) {
      setMessages([])
      return
    }

    prevMsgCountRef.current = 0

    if (selectedRoom === AI_ROOM_ID) {
      setMessages([
        {
          id: 'ai-welcome',
          content:
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
- "Review: nhập những đánh giá để phê duyệt"
- "Tự động duyệt review pending"
- "Lỗi 401 là gì?"`,
          senderRole: 'ai',
          senderName: 'Admin AI Pro',
          sentAt: new Date().toISOString()
        }
      ])
      return
    }

    fetchMessages(selectedRoom, true)
    fetchRooms()
  }, [selectedRoom, fetchMessages, fetchRooms])

  useEffect(() => {
    if (open && !isAdmin && currentUser?.id) {
      fetchMessages(currentUser.id, true)
      setUnreadTotal(0)
    }
  }, [open, isAdmin, currentUser, fetchMessages])

  const sendAIMessage = async content => {
    const userMsg = {
      id: crypto.randomUUID(),
      content,
      senderRole: 'admin',
      senderId: currentUser.id,
      senderName: 'Bạn',
      sentAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')

    const res = await api.post('/api/admin/ai/chat', {
      message: content,
      path: window.location.pathname,
      pageTitle: document.title || '',
      adminContext: getAdminContext()
    })

    const aiMsg = {
      id: crypto.randomUUID(),
      content: extractAIText(res.data),
      senderRole: 'ai',
      senderName: 'Admin AI Pro',
      sentAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, aiMsg])
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    if (isAdmin && !selectedRoom) return

    const content = input.trim()

    setSending(true)

    try {
      if (isAdmin && selectedRoom === AI_ROOM_ID) {
        await sendAIMessage(content)
        return
      }

      const body = { content }

      if (isAdmin) {
        body.roomId = selectedRoom
      }

      const res = await api.post('/api/chat/send', body)

      setMessages(prev => [...prev, res.data])
      setInput('')
    } catch (err) {
      const status = err.response?.status
      const backendMsg = err.response?.data?.error || err.response?.data
      let errorText = backendMsg || err.message || 'Không gửi được tin nhắn.'

      if (status) {
        errorText = `HTTP ${status}\n\n${errorText}`
      }

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          content: String(errorText),
          senderRole: 'ai',
          senderName: 'Admin AI Pro',
          sentAt: new Date().toISOString()
        }
      ])
    } finally {
      setSending(false)
    }
  }

  const handleQuickAI = text => {
    setInput(text)
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!currentUser) return null

  const selectedRoomInfo = rooms.find(r => r.roomId === selectedRoom)

  return (
    <div className={styles.wrapper}>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            {isAdmin && selectedRoom && (
              <button
                className={styles.backBtn}
                onClick={() => setSelectedRoom(null)}
                title="Quay lại"
              >
                ←
              </button>
            )}

            <span className={styles.headerTitle}>
              {isAdmin
                ? selectedRoom
                  ? selectedRoom === AI_ROOM_ID
                    ? 'Admin AI Pro'
                    : selectedRoomInfo?.partnerName || 'Chat'
                  : 'Tin nhắn'
                : 'Hỗ trợ từ Admin'}
            </span>

            {isAdmin && selectedRoom === AI_ROOM_ID && (
              <span className={styles.headerSub}>
                ReviewHub Internal Assistant
              </span>
            )}

            {isAdmin && selectedRoom !== AI_ROOM_ID && selectedRoomInfo?.orgName && (
              <span className={styles.headerSub}>
                {selectedRoomInfo.orgName}
              </span>
            )}

            <button
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              title="Đóng"
            >
              ✕
            </button>
          </div>

          {isAdmin && !selectedRoom && (
            <div className={styles.roomList}>
              {displayRooms.map(r => (
                <div
                  key={r.roomId}
                  className={`${styles.roomItem} ${r.isAI ? styles.aiRoomItem : ''}`}
                  onClick={() => setSelectedRoom(r.roomId)}
                >
                  <div className={styles.roomRow}>
                    <div className={styles.roomAvatar}>
                      {r.isAI ? '✦' : (r.partnerName || '?')[0].toUpperCase()}
                    </div>

                    <div className={styles.roomInfo}>
                      <div className={styles.roomName}>
                        {r.partnerName}

                        {r.isAI && (
                          <span className={styles.aiBadge}>AI</span>
                        )}

                        {r.unreadCount > 0 && (
                          <span className={styles.badge}>
                            {r.unreadCount}
                          </span>
                        )}
                      </div>

                      {r.orgName && (
                        <div className={styles.roomOrg}>
                          {r.orgName}
                        </div>
                      )}

                      <div className={styles.roomLast}>
                        {r.lastMessage}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {rooms.length === 0 && (
                <div className={styles.empty}>
                  Chưa có đối tác nào liên hệ.
                </div>
              )}
            </div>
          )}

          {(!isAdmin || selectedRoom) && (
            <>
              <div className={styles.messages}>
                {messages.length === 0 && (
                  <div className={styles.emptyChat}>
                    {isAdmin
                      ? 'Chưa có tin nhắn trong cuộc trò chuyện này.'
                      : 'Xin chào! Gửi tin nhắn để được hỗ trợ.'}
                  </div>
                )}

                {messages.map(m => {
                  const isMine = isAdmin
                    ? m.senderRole === 'admin'
                    : m.senderId === currentUser.id

                  return (
                    <div
                      key={m.id}
                      className={`
                        ${styles.msgRow}
                        ${isMine ? styles.mine : styles.theirs}
                        ${m.senderRole === 'ai' ? styles.aiMessage : ''}
                      `}
                    >
                      {!isMine && (
                        <div className={styles.avatar}>
                          {m.senderRole === 'ai'
                            ? '✦'
                            : (m.senderName || '?')[0].toUpperCase()}
                        </div>
                      )}

                      <div className={styles.bubbleWrap}>
                        <div
                          className={`${styles.bubble} ${
                            isMine ? styles.bubbleMine : styles.bubbleTheirs
                          }`}
                        >
                          {m.senderRole === 'ai' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.content}
                            </ReactMarkdown>
                          ) : (
                            m.content
                          )}
                        </div>

                        <div className={styles.time}>
                          {new Date(m.sentAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {sending && isAIRoom && (
                  <div className={`${styles.msgRow} ${styles.theirs} ${styles.aiMessage}`}>
                    <div className={styles.avatar}>✦</div>
                    <div className={styles.bubbleWrap}>
                      <div className={`${styles.bubble} ${styles.bubbleTheirs}`}>
                        Đang phân tích...
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {isAIRoom && (
                <div className={styles.quickReplies}>
                  <button onClick={() => handleQuickAI('Có bao nhiêu đối tác?')}>
                    Đối tác
                  </button>

                  <button onClick={() => handleQuickAI('Danh sách partner')}>
                    Partner
                  </button>

                  <button onClick={() => handleQuickAI('Review: ')}>
                    Phân tích review:
                  </button>

                  <button onClick={() => handleQuickAI('Tự động duyệt review pending')}>
                    AI duyệt review
                  </button>

                  <button onClick={() => handleQuickAI('Lỗi 401 là gì?')}>
                    Debug API
                  </button>

                  <button onClick={() => handleQuickAI('Lịch sử mua gói')}>
                    Doanh Thu
                  </button>
                </div>
              )}

              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isAIRoom
                      ? 'Hỏi Admin AI...'
                      : 'Nhập tin nhắn... (Enter để gửi)'
                  }
                  maxLength={1000}
                />

                <button
                  className={styles.sendBtn}
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                >
                  {sending ? '...' : 'Gửi'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Chat hỗ trợ"
      >
        {open ? (
          <span className={styles.closeIcon}>×</span>
        ) : (
          <>
            <span className={styles.botIcon}>AI</span>
            <span className={styles.pulse}></span>
          </>
        )}

        {!open && unreadTotal > 0 && (
          <span className={styles.fabBadge}>
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
      </button>
    </div>
  )
}