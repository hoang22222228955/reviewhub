import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../../../auth/context/AuthContext'
import api from '../../../services/api'
import styles from './PartnerChatWidget.module.css'

const SUPPORT_ROOM_ID = '__PARTNER_SUPPORT__'
const AI_ROOM_ID = '__PARTNER_AI__'

function extractAIText(data) {
  const pickText = (value) => {
    if (typeof value === 'object' && value !== null) {
      return (
        value?.reply ||
        value?.message ||
        value?.output?.[0]?.content?.[0]?.text ||
        value?.output_text ||
        value?.choices?.[0]?.message?.content ||
        JSON.stringify(value)
      )
    }

    if (typeof value !== 'string') return String(value || '')

    const trimmed = value.trim()

    try {
      const json = JSON.parse(trimmed)

      return (
        json?.reply ||
        json?.message ||
        json?.output?.[0]?.content?.[0]?.text ||
        json?.output_text ||
        json?.choices?.[0]?.message?.content ||
        trimmed
      )
    } catch {
      return trimmed
    }
  }

  const first = pickText(data)

  // Backend có thể trả { reply: "<raw OpenAI JSON string>" }.
  // Parse thêm 1 lần để không hiện nguyên JSON dài trên giao diện.
  if (typeof first === 'string') {
    return pickText(first)
  }

  return String(first || '')
}

function getPartnerContext(currentUser) {
  const path = window.location.pathname

  if (path.includes('sla')) {
    return 'Partner đang ở trang SLA theo dõi review riêng đã gửi admin.'
  }

  if (path.includes('lay-review') || path.includes('truy-van') || path.includes('review-query')) {
    return 'Partner đang ở trang lấy review / tra cứu review.'
  }

  if (path.includes('gui-review') || path.includes('review-submit')) {
    return 'Partner đang ở trang gửi review riêng cho admin duyệt.'
  }

  if (path.includes('api-key') || path.includes('api')) {
    return 'Partner đang ở trang API key.'
  }

  if (path.includes('mua-goi') || path.includes('goi')) {
    return 'Partner đang ở trang mua gói / lịch sử gói.'
  }

  return `Partner đang ở khu vực quản lý riêng của ${
    currentUser?.orgName ||
    currentUser?.assignedOperatorCode ||
    currentUser?.partnerCode ||
    'dịch vụ đã đăng ký'
  }.`
}

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

    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
    osc.onended = () => ctx.close()
  } catch {}
}

export default function PartnerChatWidget() {
  const { currentUser } = useAuth()

  const [open, setOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [sending, setSending] = useState(false)
  const [aiAccess, setAiAccess] = useState({
    checked: false,
    eligible: false,
    planName: '',
    message: '',
  })

  const messagesEndRef = useRef(null)
  const openRef = useRef(open)
  const selectedRoomRef = useRef(selectedRoom)
  const prevMsgCountRef = useRef(0)

  const planName =
    aiAccess.planName ||
    currentUser?.membershipLabel ||
    currentUser?.currentPlanId ||
    'Gói hiện tại'

  const isAiRoom = selectedRoom === AI_ROOM_ID
  const isSupportRoom = selectedRoom === SUPPORT_ROOM_ID

  const rooms = useMemo(() => {
    const list = [
      {
        roomId: SUPPORT_ROOM_ID,
        title: 'Hỗ trợ từ Admin',
        sub: 'Nhắn trực tiếp với đội ngũ quản trị',
        last: unreadTotal > 0
          ? 'Bạn có tin nhắn mới từ admin.'
          : 'Gửi câu hỏi hoặc yêu cầu hỗ trợ cho admin.',
        avatar: 'AD',
        unread: unreadTotal,
        tone: 'support',
      },
    ]

    if (aiAccess.eligible) {
      list.push({
        roomId: AI_ROOM_ID,
        title: 'Partner AI Pro',
        sub: planName,
        last: 'Hỏi AI về quota, SLA, API, báo cáo review và chăm sóc khách hàng.',
        avatar: 'AI',
        unread: 0,
        tone: 'ai',
      })
    }

    return list
  }, [aiAccess.eligible, planName, unreadTotal])

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    selectedRoomRef.current = selectedRoom
  }, [selectedRoom])

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'partner') return

    let alive = true

    api.get('/api/partner/ai/access')
      .then(res => {
        if (!alive) return

        setAiAccess({
          checked: true,
          eligible: Boolean(res.data?.eligible),
          planName: res.data?.planName || '',
          message: res.data?.message || '',
        })
      })
      .catch(err => {
        if (!alive) return

        setAiAccess({
          checked: true,
          eligible: false,
          planName: '',
          message:
            err.response?.data?.message ||
            err.response?.data?.error ||
            'Không kiểm tra được quyền Partner AI.',
        })
      })

    return () => {
      alive = false
    }
  }, [currentUser])

  const fetchSupportMessages = useCallback(async (markRead = false) => {
    if (!currentUser?.id) return

    try {
      const res = await api.get(`/api/chat/messages/${currentUser.id}`)
      setMessages(Array.isArray(res.data) ? res.data : [])

      if (markRead) {
        await api.put(`/api/chat/read/${currentUser.id}`)
        setUnreadTotal(0)
      }
    } catch {}
  }, [currentUser])

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/api/chat/unread')
      setUnreadTotal(res.data?.unread || 0)
    } catch {}
  }, [])

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'partner') return

    const tick = () => {
      if (openRef.current && selectedRoomRef.current === SUPPORT_ROOM_ID) {
        fetchSupportMessages(true)
      } else if (!openRef.current) {
        fetchUnread()
      }
    }

    tick()

    const timer = setInterval(tick, 3000)

    return () => clearInterval(timer)
  }, [currentUser, fetchSupportMessages, fetchUnread])

  useEffect(() => {
    if (!selectedRoom) {
      setMessages([])
      return
    }

    prevMsgCountRef.current = 0

    if (selectedRoom === SUPPORT_ROOM_ID) {
      fetchSupportMessages(true)
      return
    }

    if (selectedRoom === AI_ROOM_ID) {
      setMessages([
        {
          id: 'partner-ai-welcome',
          content:
`# 👋 Partner AI Pro

AI riêng cho partner dùng gói **${planName}**.

Tôi có thể hỗ trợ:

- Theo dõi quota, gói đang dùng và quyền lợi partner
- Giải thích SLA, review chờ duyệt / đã duyệt / bị từ chối
- Hướng dẫn dùng API key, lấy review và gửi review riêng
- Tổng hợp review, viết báo cáo và xuất sơ đồ thống kê
- Gợi ý cách tăng thêm review thật từ khách hàng
- Trả lời câu hỏi về bảo mật dữ liệu và chi phí gửi review
- Viết phản hồi lịch sự cho review tiêu cực

### Ví dụ nhanh

- "Tổng hợp review viết báo cáo cho tôi"
- "Xuất sơ đồ thống kê review"
- "Tôi muốn có thêm review thì làm như nào?"
- "Gửi review có an toàn và có bị tính phí không?"
- "Viết phản hồi cho khách chê xe đến trễ"`,
          senderRole: 'ai',
          senderName: 'Partner AI Pro',
          sentAt: new Date().toISOString(),
        },
      ])
    }
  }, [selectedRoom, fetchSupportMessages, planName])

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const newMsgs = messages.slice(prevMsgCountRef.current)

      const hasNewFromOther = newMsgs.some((m) => {
        if (isAiRoom) return m.senderRole === 'ai'
        return m.senderId !== currentUser?.id
      })

      if (hasNewFromOther && prevMsgCountRef.current > 0) {
        playTing()
      }
    }

    prevMsgCountRef.current = messages.length
  }, [messages, isAiRoom, currentUser])

  async function sendAIMessage(content) {
    const userMsg = {
      id: crypto.randomUUID(),
      content,
      senderRole: 'partner',
      senderId: currentUser.id,
      senderName: 'Bạn',
      sentAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')

    const res = await api.post('/api/partner/ai/chat', {
      message: content,
      path: window.location.pathname,
      pageTitle: document.title || '',
      partnerContext: getPartnerContext(currentUser),
    })

    const aiMsg = {
      id: crypto.randomUUID(),
      content: extractAIText(res.data),
      senderRole: 'ai',
      senderName: 'Partner AI Pro',
      sentAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, aiMsg])
  }

  async function sendSupportMessage(content) {
    const res = await api.post('/api/chat/send', { content })
    setMessages(prev => [...prev, res.data])
    setInput('')
  }

  async function handleSend() {
    if (!input.trim() || sending || !selectedRoom) return

    const content = input.trim()

    setSending(true)

    try {
      if (selectedRoom === AI_ROOM_ID) {
        await sendAIMessage(content)
      } else {
        await sendSupportMessage(content)
      }
    } catch (err) {
      const status = err.response?.status
      const backendMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data

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
          senderName: isAiRoom ? 'Partner AI Pro' : 'Hệ thống',
          sentAt: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  function quickAsk(text) {
    setInput(text)
  }

  if (!currentUser || currentUser.role !== 'partner') return null

  const selected = rooms.find(room => room.roomId === selectedRoom)
  const headerTitle = selected ? selected.title : 'Hỗ trợ đối tác'
  const headerSub = selected ? selected.sub : 'Chọn luồng chat cần sử dụng'

  return (
    <div className={styles.wrapper}>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            {selectedRoom && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setSelectedRoom(null)}
                title="Quay lại"
              >
                ←
              </button>
            )}

            <div className={styles.headerText}>
              <strong>{headerTitle}</strong>
              <span>{headerSub}</span>
            </div>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              title="Đóng"
            >
              ✕
            </button>
          </div>

          {!selectedRoom && (
            <div className={styles.roomList}>
              {rooms.map(room => (
                <button
                  type="button"
                  key={room.roomId}
                  className={`${styles.roomItem} ${styles[room.tone]}`}
                  onClick={() => setSelectedRoom(room.roomId)}
                >
                  <span className={styles.roomAvatar}>{room.avatar}</span>

                  <span className={styles.roomContent}>
                    <strong>
                      {room.title}
                      {room.tone === 'ai' && <em>AI</em>}
                      {room.unread > 0 && <b>{room.unread > 99 ? '99+' : room.unread}</b>}
                    </strong>
                    <small>{room.sub}</small>
                    <i>{room.last}</i>
                  </span>
                </button>
              ))}

              {!aiAccess.eligible && (
                <div className={styles.lockedAiNote}>
                  Partner AI Pro chỉ mở cho gói Doanh nghiệp / Doanh nghiệp lớn.
                </div>
              )}
            </div>
          )}

          {selectedRoom && (
            <>
              <div className={styles.messages}>
                {messages.length === 0 && (
                  <div className={styles.emptyChat}>
                    {isAiRoom
                      ? 'Hỏi Partner AI để được hỗ trợ nhanh.'
                      : 'Xin chào! Gửi tin nhắn để được admin hỗ trợ.'}
                  </div>
                )}

                {messages.map(message => {
                  const isMine =
                    message.senderId === currentUser.id ||
                    message.senderRole === 'partner'

                  return (
                    <div
                      key={message.id}
                      className={`${styles.msgRow} ${isMine ? styles.mine : styles.theirs}`}
                    >
                      {!isMine && (
                        <div className={styles.avatar}>
                          {message.senderRole === 'ai'
                            ? 'AI'
                            : (message.senderName || 'A')[0].toUpperCase()}
                        </div>
                      )}

                      <div className={styles.bubbleWrap}>
                        <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                          {message.senderRole === 'ai' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            message.content
                          )}
                        </div>

                        <div className={styles.time}>
                          {new Date(message.sentAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {sending && isAiRoom && (
                  <div className={`${styles.msgRow} ${styles.theirs}`}>
                    <div className={styles.avatar}>AI</div>
                    <div className={styles.bubbleWrap}>
                      <div className={`${styles.bubble} ${styles.bubbleTheirs}`}>
                        Đang phân tích...
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {isAiRoom && (
                <div className={styles.quickReplies}>
                  <button type="button" onClick={() => quickAsk('Quota của tôi còn bao nhiêu?')}>
                    Quota
                  </button>
                  <button type="button" onClick={() => quickAsk('Giải thích trạng thái SLA review riêng')}>
                    SLA
                  </button>
                  <button type="button" onClick={() => quickAsk('Hướng dẫn dùng API key để lấy review')}>
                    API key
                  </button>
                  <button type="button" onClick={() => quickAsk('Tổng hợp review viết báo cáo cho tôi')}>
                    Báo cáo review
                  </button>
                  <button type="button" onClick={() => quickAsk('Xuất sơ đồ thống kê review')}>
                    Sơ đồ review
                  </button>
                  <button type="button" onClick={() => quickAsk('Tôi muốn có thêm review thì làm như nào?')}>
                    Thêm review
                  </button>
                  <button type="button" onClick={() => quickAsk('Nếu tôi gửi review thì có được lưu an toàn, bảo mật và có bị tính phí không?')}>
                    Bảo mật & phí
                  </button>
                  <button type="button" onClick={() => quickAsk('Giải thích công dụng các mục trong trang partner')}>
                    Công dụng mục
                  </button>
                  <button type="button" onClick={() => quickAsk('Viết phản hồi lịch sự cho khách phàn nàn xe đến trễ')}>
                    Phản hồi khách
                  </button>
                </div>
              )}

              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isAiRoom ? 'Hỏi Partner AI...' : 'Nhập tin nhắn... (Enter để gửi)'}
                  maxLength={1000}
                />

                <button
                  type="button"
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
        type="button"
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen(value => !value)}
        title="Chat hỗ trợ"
      >
        {open ? (
          <span className={styles.closeIcon}>×</span>
        ) : (
          <>
            <span className={styles.botIcon}>AI</span>
            <span className={styles.pulse} />
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
