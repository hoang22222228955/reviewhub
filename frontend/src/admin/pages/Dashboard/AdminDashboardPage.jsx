import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/context/AuthContext'
import { getPlans } from '../../../services/planService'
import { formatNumber } from '../../../shared/lib/format'
import api from '../../../services/api'
import styles from './AdminDashboardPage.module.css'

const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']

function money(value) {
  if (value === '—' || value === '...') return value
  return formatNumber(value)
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase()
}

function isApprovedReview(review) {
  return normalizeStatus(review.moderationStatus) === 'approved'
}

function isRejectedReview(review) {
  const status = normalizeStatus(review.moderationStatus)
  return status === 'rejected' || status === 'reject'
}

function isPendingReview(review) {
  const status = normalizeStatus(review.moderationStatus)
  return !status || status === 'pending_review' || status === 'pending' || status === 'flagged'
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

async function fetchAllReviewsForAdmin() {
  const candidates = [
    '/api/admin/reviews?size=10000',
    '/api/admin/review-ai/all',
    '/api/reviews?size=10000',
    '/api/admin/review-ai/pending',
  ]

  for (const url of candidates) {
    try {
      const res = await api.get(url)
      const items = extractList(res.data)

      if (items.length > 0) {
        return items
      }
    } catch (err) {
      // Thử endpoint kế tiếp để dashboard không bị chết nếu backend chưa có route.
    }
  }

  return []
}

export default function AdminDashboardPage() {
  useAuth()
  const plans = getPlans()
  const [partnerCount, setPartnerCount] = useState('...')
  const [reviewStats, setReviewStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
  })

  useEffect(() => {
    api.get('/api/admin/partners')
      .then(r => setPartnerCount(Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => setPartnerCount('—'))

    fetchAllReviewsForAdmin()
      .then(items => {
        setReviewStats({
          total: items.length,
          approved: items.filter(isApprovedReview).length,
          rejected: items.filter(isRejectedReview).length,
          pending: items.filter(isPendingReview).length,
        })
      })
      .catch(() => {
        setReviewStats({
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        })
      })
  }, [])

  const kpis = useMemo(() => ([
    {
      title: 'Gói đang có',
      desc: 'Tổng số gói dịch vụ hiện tại',
      value: plans.length,
      tone: 'green',
      icon: '▣',
    },
    {
      title: 'Tài khoản đối tác',
      desc: 'Tổng số partner trong hệ thống',
      value: partnerCount,
      tone: 'red',
      icon: '↗',
    },
    {
      title: 'Tổng toàn bộ review',
      desc: 'Tất cả review từ trước đến nay',
      value: reviewStats.total,
      tone: 'blue',
      icon: '◇',
      action: 'Xem review',
    },
    {
      title: 'Review đã duyệt',
      desc: 'Tổng review đã duyệt từ trước đến nay',
      value: reviewStats.approved,
      tone: 'mint',
      icon: '✓',
    },
    {
      title: 'Review bị từ chối',
      desc: 'Tổng review đã từ chối từ trước đến nay',
      value: reviewStats.rejected,
      tone: 'orange',
      icon: '×',
    },
    {
      title: 'Review chờ duyệt',
      desc: 'Review hiện đang pending',
      value: reviewStats.pending,
      tone: 'violet',
      icon: '◎',
      action: 'Chi tiết',
    },
  ]), [plans.length, partnerCount, reviewStats])

  const accountRows = [
    { icon: '👤', label: 'Quản trị viên', value: 'Admin' },
    { icon: '🛡', label: 'Vai trò', value: 'System Admin', pill: 'primary' },
    { icon: '✉', label: 'Email', value: 'Đã xác minh', pill: 'success' },
    { icon: '☎', label: 'Trạng thái', value: 'Đang hoạt động', pill: 'success' },
  ]

  const orderRows = [
    { icon: '✓', label: 'Review đã duyệt', value: reviewStats.approved, tone: 'success' },
    { icon: '×', label: 'Review bị từ chối', value: reviewStats.rejected, tone: 'danger' },
    { icon: '↩', label: 'Review chờ xử lý', value: reviewStats.pending, tone: 'warning' },
    { icon: '▣', label: 'Tổng toàn bộ review', value: reviewStats.total, tone: 'primary' },
  ]

  const monthRows = [
    { icon: '↪', label: 'Số lần đăng nhập', value: 0, tone: 'primary' },
    { icon: '▤', label: 'Partner hiện có', value: partnerCount, tone: 'primary' },
    { icon: '▦', label: 'Gói đã tạo', value: plans.length, tone: 'success' },
    { icon: '⚑', label: 'Review cần duyệt', value: reviewStats.pending, tone: 'warning' },
  ]

  return (
    <main className={styles.pageShell}>
      

      <section className={styles.dashboardPanel}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Dashboard</h1>
            <nav>Home <span>›</span> Admin <span>›</span> Dashboard</nav>
          </div>
          <button type="button" className={styles.exportBtn}>Xuất báo cáo</button>
        </header>

        <div className={styles.topGrid}>
          <div className={styles.kpiGrid}>
            {kpis.map((item, index) => (
              <article
                key={item.title}
                className={`${styles.kpiCard} ${styles[item.tone]}`}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className={styles.kpiText}>
                  <span>{item.title}</span>
                  <small>{item.desc}</small>
                  <strong>{money(item.value)}</strong>
                </div>
                <div className={styles.kpiIcon}>{item.icon}</div>
                {item.action && (
                  <button type="button" className={styles.kpiAction}>
                    {item.action} →
                  </button>
                )}
              </article>
            ))}
          </div>

          <article className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2>Hoạt động trong năm</h2>
              <div className={styles.legend}>
                <span><i className={styles.dot2025} />Năm 2025</span>
                <span><i className={styles.dot2026} />Năm 2026</span>
              </div>
            </div>

            <div className={styles.chartWrap}>
              <span className={styles.yTitle}>Số tiền (VND)</span>
              <svg viewBox="0 0 720 300" className={styles.chartSvg} aria-label="Hoạt động trong năm">
                <defs>
                  <linearGradient id="purpleFillExact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b276bd" stopOpacity=".18" />
                    <stop offset="100%" stopColor="#b276bd" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[36, 92, 148, 204, 260].map((y) => (
                  <line key={y} x1="72" x2="672" y1={y} y2={y} className={styles.gridLine} />
                ))}
                {['1.5M', '1M', '500K', '0'].map((label, index) => (
                  <text key={label} x="28" y={44 + index * 74} className={styles.yText}>{label}</text>
                ))}
                {months.map((m, i) => (
                  <text key={m} x={92 + i * 49} y="286" className={styles.xText}>{m}</text>
                ))}

                <path d="M92 260 C110 260 112 78 140 72 C168 72 166 260 188 260 C214 260 226 122 252 110 C284 94 300 78 320 90 C344 105 342 260 366 260 C410 260 438 260 466 260 C492 260 508 218 534 205 C560 195 578 260 604 260 C632 260 650 260 672 260 L672 268 L92 268 Z" fill="url(#purpleFillExact)" />
                <path d="M92 260 C110 260 112 78 140 72 C168 72 166 260 188 260 C214 260 226 122 252 110 C284 94 300 78 320 90 C344 105 342 260 366 260 C410 260 438 260 466 260 C492 260 508 218 534 205 C560 195 578 260 604 260 C632 260 650 260 672 260" className={styles.line2026} />
                <path d="M92 260 C120 260 150 260 188 260 C238 260 284 260 342 260 C404 260 462 260 498 260 C518 260 520 214 544 204 C570 192 578 260 604 260" className={styles.line2025} />

                {[[140, 72, '1.2M'], [252, 110, '760K'], [320, 90, '1M'], [544, 204, '360K']].map(([x, y, label]) => (
                  <g key={label} className={styles.chartPoint}>
                    <circle cx={x} cy={y} r="4.5" />
                    <text x={x - 18} y={y - 12}>{label}</text>
                  </g>
                ))}
                {[92, 188, 366, 466, 604, 672].map((x) => <text key={x} x={x - 3} y="251" className={styles.zeroText}>0</text>)}
              </svg>
            </div>
          </article>
        </div>

        <h2 className={styles.sectionTitle}>THÔNG TIN & HOẠT ĐỘNG</h2>

        <div className={styles.infoGrid}>
          <InfoCard title="Thông tin tài khoản" rows={accountRows} />
          <InfoCard title="Thống kê hệ thống" rows={orderRows} />
          <InfoCard title="Hoạt động tháng này" rows={monthRows} />
        </div>
      </section>
    </main>
  )
}

function InfoCard({ title, rows }) {
  return (
    <article className={styles.infoCard}>
      <h3>{title}</h3>
      <div className={styles.infoRows}>
        {rows.map(row => (
          <div key={row.label} className={styles.infoRow}>
            <span className={styles.rowLabel}><i>{row.icon}</i>{row.label}</span>
            <span className={row.pill || row.tone ? `${styles.valuePill} ${styles[row.pill || row.tone]}` : styles.rowValue}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <button type="button" className={styles.detailBtn}>Xem chi tiết →</button>
    </article>
  )
}
