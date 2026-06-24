import { useEffect, useMemo, useState } from 'react'
import api from '../../../services/api'
import { formatCurrency } from '../../../shared/lib/format'
import styles from './PartnerPurchasesPage.module.css'

function formatDate(isoStr) {
  if (!isoStr) return '—'

  return new Date(isoStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusTone(status) {
  if (!status) return 'neutral'
  if (status.startsWith('pending')) return 'warning'
  if (status === 'Đã thanh toán') return 'success'
  if (status === 'Từ chối') return 'danger'
  return 'neutral'
}

function statusLabel(status) {
  if (!status) return '—'
  if (status.startsWith('pending:')) return `Chờ duyệt (${status.slice('pending:'.length)})`
  if (status === 'pending') return 'Chờ duyệt'
  return status
}

function planClass(planId) {
  if (planId === 'growth') return styles.planGrowth
  if (planId === 'enterprise') return styles.planEnterprise
  if (planId === 'custom') return styles.planCustom
  return styles.planStarter
}

function getInitials(name) {
  const result = String(name || 'Gói')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return result || 'G'
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const iconMap = {
  receipt: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.25 4.75h9.5a1.5 1.5 0 0 1 1.5 1.5v13l-2.15-1.15-2.05 1.15-2.05-1.15-2.05 1.15-2.05-1.15-2.15 1.15v-13a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M9 9h6M9 12h6M9 15h3.5" />
    </svg>
  ),
  money: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.75 7.25h14.5v9.5H4.75v-9.5Z" />
      <path d="M8 12h.01M16 12h.01M12 14.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19.25a7.25 7.25 0 1 0-7.25-7.25" />
      <path d="M12 8v4.2l2.8 1.8" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6.75 12.25 3.3 3.3 7.2-7.2" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="5.8" />
      <path d="m15.2 15.2 4 4" />
    </svg>
  ),
  empty: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.75 5.25h10.5a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2v-9.5a2 2 0 0 1 2-2Z" />
      <path d="M8.75 9.25h6.5M8.75 12h4.5" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.8 19 6.5v5.6c0 4.3-2.7 7.2-7 8.5-4.3-1.3-7-4.2-7-8.5V6.5l7-2.7Z" />
      <path d="m8.7 12.2 2.1 2.1 4.6-5" />
    </svg>
  ),
}

function SparkLine({ tone = 'violet' }) {
  return (
    <svg className={`${styles.sparkLine} ${styles[tone]}`} viewBox="0 0 120 46" aria-hidden="true">
      <path d="M4 34 C15 25 22 31 31 20 C41 8 50 31 61 21 C72 11 79 37 91 20 C101 8 108 20 116 10" />
      <path className={styles.sparkArea} d="M4 34 C15 25 22 31 31 20 C41 8 50 31 61 21 C72 11 79 37 91 20 C101 8 108 20 116 10 L116 46 L4 46 Z" />
    </svg>
  )
}

function StatCard({ tone, icon, title, value, hint }) {
  return (
    <article className={`${styles.kpiCard} ${styles[tone]}`}>
      <div className={styles.kpiTop}>
        <div className={styles.kpiIcon}>{icon}</div>
        <div>
          <p>{title}</p>
          <strong>{value}</strong>
        </div>
      </div>
      <small>{hint}</small>
      <SparkLine tone={tone} />
    </article>
  )
}

export default function PartnerPurchasesPage() {
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    api.get('/api/partner/my-purchases')
      .then(r => setPurchases(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPurchases([]))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const pending = purchases.filter(p => p.status?.startsWith('pending')).length
    const paid = purchases.filter(p => p.status === 'Đã thanh toán').length
    const rejected = purchases.filter(p => p.status === 'Từ chối').length
    const totalAmount = purchases.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const latest = purchases[0]?.purchasedAt || null
    const paidPercent = purchases.length ? Math.round((paid / purchases.length) * 100) : 0
    const pendingPercent = purchases.length ? Math.round((pending / purchases.length) * 100) : 0

    return {
      total: purchases.length,
      pending,
      paid,
      rejected,
      totalAmount,
      latest,
      paidPercent,
      pendingPercent,
    }
  }, [purchases])

  const filteredPurchases = useMemo(() => {
    const q = normalizeText(keyword.trim())

    return purchases.filter((item) => {
      const rawStatus = String(item.status || '')
      const isPending = rawStatus.startsWith('pending')
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'paid' && rawStatus === 'Đã thanh toán') ||
        (statusFilter === 'pending' && isPending) ||
        (statusFilter === 'rejected' && rawStatus === 'Từ chối')

      const haystack = normalizeText([
        item.id,
        item.planId,
        item.planName,
        item.status,
        item.amount,
        formatDate(item.purchasedAt),
      ].filter(Boolean).join(' '))

      const matchKeyword = !q || haystack.includes(q)

      return matchStatus && matchKeyword
    })
  }, [purchases, keyword, statusFilter])

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingIcon}>{iconMap.receipt}</div>
        <span>Đang tải lịch sử mua gói...</span>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.titleCard}>
        <div className={styles.sectionTitleBlock}>
          <span className={styles.eyebrow}>Partner billing</span>
          <h1>Lịch sử mua gói</h1>
          <p>
            Theo dõi các giao dịch mua gói, trạng thái duyệt và tổng chi tiêu của tài khoản đối tác
            trong một giao diện gọn, sáng và dễ đọc.
          </p>
        </div>

        <div className={styles.quickBalance}>
          <span>Tổng chi tiêu</span>
          <strong>{formatCurrency(stats.totalAmount)}</strong>
          <small>{stats.latest ? `Gần nhất: ${formatDate(stats.latest)}` : 'Chưa có giao dịch'}</small>
        </div>
      </section>

      <section className={styles.kpiGrid} aria-label="Thống kê lịch sử mua gói">
        <StatCard
          tone="violet"
          icon={iconMap.receipt}
          title="Tổng giao dịch"
          value={stats.total}
          hint="Toàn bộ đơn mua gói"
        />
        <StatCard
          tone="green"
          icon={iconMap.check}
          title="Đã thanh toán"
          value={stats.paid}
          hint={`${stats.paidPercent}% giao dịch đã xác nhận`}
        />
        <StatCard
          tone="orange"
          icon={iconMap.pending}
          title="Chờ duyệt"
          value={stats.pending}
          hint={`${stats.pendingPercent}% đơn cần admin xử lý`}
        />
        <StatCard
          tone="red"
          icon={iconMap.money}
          title="Bị từ chối"
          value={stats.rejected}
          hint="Đơn không được duyệt"
        />
      </section>

      <section className={styles.workspaceGrid}>
        <div className={styles.leftColumn}>
          <article className={styles.filterCard}>
            <div className={styles.sectionTitleBlock}>
              <h2>Bộ lọc giao dịch</h2>
              <p>Tìm nhanh theo mã đơn, tên gói hoặc trạng thái thanh toán.</p>
            </div>

            <div className={styles.filterGrid}>
              <label className={styles.fieldGroup}>
                <span>Từ khóa</span>
                <div className={styles.searchInputWrap}>
                  <i>{iconMap.search}</i>
                  <input
                    value={keyword}
                    onChange={event => setKeyword(event.target.value)}
                    placeholder="Tìm mã giao dịch, tên gói..."
                  />
                </div>
              </label>

              <label className={styles.fieldGroup}>
                <span>Trạng thái</span>
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="rejected">Từ chối</option>
                </select>
              </label>
            </div>
          </article>

          <article className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <div>
                <h2>Danh sách giao dịch</h2>
                <p>
                  Hiển thị {filteredPurchases.length}/{stats.total} giao dịch
                  {stats.pending > 0 ? ` · ${stats.pending} đơn đang chờ duyệt` : ''}
                </p>
              </div>
            </div>

            {purchases.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>{iconMap.empty}</div>
                <strong>Bạn chưa có giao dịch nào</strong>
                <span>Khi mua hoặc nâng cấp gói, lịch sử giao dịch sẽ hiển thị tại đây.</span>
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>{iconMap.search}</div>
                <strong>Không tìm thấy giao dịch phù hợp</strong>
                <span>Thử đổi từ khóa tìm kiếm hoặc chọn lại trạng thái giao dịch.</span>
              </div>
            ) : (
              <div className={styles.tableShell}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Giao dịch</th>
                      <th>Gói đã mua</th>
                      <th>Số tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPurchases.map((p, index) => (
                      <tr key={p.id || `${p.planId}-${p.purchasedAt}-${index}`}>
                        <td>
                          <div className={styles.dateCell}>
                            <span>{formatDate(p.purchasedAt)}</span>
                            <small>Mã giao dịch: {p.id || '—'}</small>
                          </div>
                        </td>

                        <td>
                          <div className={styles.planCell}>
                            <div className={`${styles.planAvatar} ${planClass(p.planId)}`}>
                              {getInitials(p.planName)}
                            </div>

                            <div>
                              <strong>{p.planName || '—'}</strong>
                              <span className={styles.planIdBadge}>
                                {p.planId || 'custom'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={styles.amountText}>{formatCurrency(p.amount)}</span>
                        </td>

                        <td>
                          <span className={`${styles.statusPill} ${styles[`status_${statusTone(p.status)}`]}`}>
                            {statusLabel(p.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>

        <aside className={styles.rightColumn}>
          <article className={styles.analyticsCard}>
            <div className={styles.sideHeader}>
              <div>
                <h3>Tổng quan thanh toán</h3>
                <p>Tỷ lệ xác nhận và đơn chờ xử lý.</p>
              </div>
            </div>

            <div className={styles.moneySummary}>
              <span>Tổng chi tiêu</span>
              <strong>{formatCurrency(stats.totalAmount)}</strong>
              <small>{stats.latest ? `Giao dịch gần nhất: ${formatDate(stats.latest)}` : 'Chưa phát sinh giao dịch'}</small>
            </div>

            <div className={styles.breakdownList}>
              <div className={styles.breakdownRow}>
                <span>Đã duyệt</span>
                <div><i style={{ width: `${stats.paidPercent}%` }} /></div>
                <b>{stats.paidPercent}%</b>
              </div>
              <div className={styles.breakdownRow}>
                <span>Chờ duyệt</span>
                <div><i style={{ width: `${stats.pendingPercent}%` }} /></div>
                <b>{stats.pendingPercent}%</b>
              </div>
            </div>
          </article>

          <article className={styles.trustCard}>
            <div className={styles.trustIcon}>{iconMap.shield}</div>
            <h3>Ghi chú xử lý</h3>
            <p>
              Đơn ở trạng thái chờ duyệt sẽ được admin kiểm tra trước khi kích hoạt quyền truy cập cho tài khoản đối tác.
            </p>
            <div className={styles.trustPills}>
              <span>Rõ trạng thái</span>
              <span>Dễ đối soát</span>
              <span>An toàn</span>
            </div>
          </article>
        </aside>
      </section>
    </div>
  )
}
