import { useEffect, useMemo, useState } from 'react'
import Card from '../../../shared/ui/Card/Card'
import Button from '../../../shared/ui/Button/Button'
import Badge from '../../../shared/ui/Badge/Badge'
import { fetchOperators } from '../../../services/operatorService'
import api from '../../../services/api'
import styles from './AdminPartnersPage.module.css'

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState([])
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPartnerId, setSelectedPartnerId] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [draftOp, setDraftOp] = useState({})
  const [saveState, setSaveState] = useState({})

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/partners').then(r => r.data),
      fetchOperators(),
    ]).then(([pts, ops]) => {
      setPartners(pts)
      setOperators(ops)

      const init = {}
      pts.forEach(p => {
        init[p.id] = p.assignedOperatorCode || p.partnerCode || ''
      })

      setDraftOp(init)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedPartnerId) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedPartnerId(null)
    }

    document.body.classList.add(styles.modalOpen)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.classList.remove(styles.modalOpen)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedPartnerId])

  const filteredPartners = useMemo(() => {
    const q = keyword.trim().toLowerCase()

    return partners.filter(p => {
      const draftCode = draftOp[p.id] || p.partnerCode || p.assignedOperatorCode || ''
      const draftOperator = operators.find(o => o.operatorCode === draftCode)

      const matchKeyword = !q || [
        p.name,
        p.orgName,
        p.email,
        p.phone,
        p.partnerCode,
        p.assignedOperatorCode,
        draftCode,
        draftOperator?.operatorName,
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))

      const matchStatus =
        statusFilter === 'all' ||
        String(p.status || '').toLowerCase() === statusFilter

      return matchKeyword && matchStatus
    })
  }, [partners, operators, draftOp, keyword, statusFilter])

  const stats = useMemo(() => {
    const assigned = partners.filter(p => p.assignedOperatorCode || p.partnerCode).length
    const active = partners.filter(p => String(p.status || '').toLowerCase() === 'active').length
    const quotaTotal = partners.reduce((sum, p) => sum + Number(p.quotaTotal || 0), 0)
    const quotaUsed = partners.reduce((sum, p) => sum + Number(p.quotaUsed || 0), 0)

    return {
      total: partners.length,
      assigned,
      active,
      quotaTotal,
      quotaUsed,
    }
  }, [partners])

  const selectedPartner = partners.find(p => p.id === selectedPartnerId) || null

  function getOperatorByCode(code) {
    return operators.find(o => o.operatorCode === code) || null
  }

  function getDisplayPartnerCode(partner) {
    return draftOp[partner.id] || partner.partnerCode || partner.assignedOperatorCode || ''
  }

  function getDisplayOperatorName(partner) {
    const code = getDisplayPartnerCode(partner)
    const op = getOperatorByCode(code)

    return op?.operatorName || partner.orgName || ''
  }

  async function saveOperator(partner) {
    setSaveState(s => ({ ...s, [partner.id]: 'saving' }))

    try {
      const operatorCode = draftOp[partner.id] || null
      const selectedOperator = getOperatorByCode(operatorCode)

      const payload = {
        operatorCode,
        partnerCode: operatorCode,
        orgName: selectedOperator?.operatorName || partner.orgName,
      }

      const res = await api.put(
        `/api/admin/users/${partner.id}/operator`,
        payload
      )

      const updatedUser = res.data?.user || {
        ...partner,
        partnerCode: operatorCode,
        assignedOperatorCode: operatorCode,
        orgName: selectedOperator?.operatorName || partner.orgName,
      }

      setPartners(prev =>
        prev.map(p => p.id === partner.id ? updatedUser : p)
      )

      setDraftOp(prev => ({
        ...prev,
        [partner.id]: operatorCode || '',
      }))

      setSaveState(s => ({ ...s, [partner.id]: 'ok' }))

      setTimeout(() => {
        setSaveState(s => ({ ...s, [partner.id]: null }))
      }, 1800)
    } catch (err) {
      console.error(err)
      setSaveState(s => ({ ...s, [partner.id]: 'err' }))
    }
  }

  function operatorLabel(code) {
    if (!code) {
      return <span className={styles.statusPill}>Chưa gán</span>
    }

    const op = getOperatorByCode(code)

    return (
      <span className={`${styles.statusPill} ${styles.statusSuccess}`}>
        {op ? op.operatorName : code}
      </span>
    )
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString('vi-VN') : '—'
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHero} />
        <div className={styles.skeletonGrid}>
          <span />
          <span />
          <span />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroPanel}>
        <div>
          <div className={styles.eyebrow}>Partner Control Center</div>
          <h1>Quản lý đối tác</h1>
          <p>
            Gán nhà xe, kiểm soát quota và theo dõi trạng thái partner trong một giao diện gọn, sáng và chuyên nghiệp.
          </p>
        </div>

        <div className={styles.heroActions}>
          <Button variant="secondary">Xuất báo cáo</Button>
          <Button variant="primary">Tạo đối tác</Button>
        </div>
      </section>

      <div className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <span>Tổng partner</span>
          <strong>{stats.total}</strong>
          <small>Đang quản lý trên hệ thống</small>
        </div>

        <div className={styles.metricCard}>
          <span>Đã gán nhà xe</span>
          <strong>{stats.assigned}</strong>
          <small>
            {stats.total ? Math.round((stats.assigned / stats.total) * 100) : 0}% đã cấu hình
          </small>
        </div>

        <div className={styles.metricCard}>
          <span>Đang hoạt động</span>
          <strong>{stats.active}</strong>
          <small>Partner có trạng thái active</small>
        </div>

        <div className={styles.metricCard}>
          <span>Quota đã dùng</span>
          <strong>{stats.quotaUsed.toLocaleString('vi-VN')}</strong>
          <small>/ {stats.quotaTotal.toLocaleString('vi-VN')} tổng quota</small>
        </div>
      </div>

      <Card
        title="Danh sách đối tác"
        description="Chọn nhà xe mới sẽ tự hiển thị mã partner tương ứng trước khi lưu."
        headerRight={<Badge tone="primary">{filteredPartners.length} kết quả</Badge>}
      >
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <span>⌕</span>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Tìm tên, email, mã partner, nhà xe..."
            />
          </label>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className={styles.partnerTableWrap}>
          <table className={styles.partnerTable}>
            <thead>
              <tr>
                <th>Đối tác</th>
                <th>Mã partner</th>
                <th>Nhà xe đang gán</th>
                <th>Gán nhà xe mới</th>
                <th>Quota</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    Không tìm thấy partner phù hợp.
                  </td>
                </tr>
              )}

              {filteredPartners.map(partner => {
                const state = saveState[partner.id]
                const used = Number(partner.quotaUsed || 0)
                const total = Number(partner.quotaTotal || 0)
                const percent = total ? Math.min(100, Math.round((used / total) * 100)) : 0

                const displayPartnerCode = getDisplayPartnerCode(partner)
                const displayOperatorName = getDisplayOperatorName(partner)

                return (
                  <tr
                    key={partner.id}
                    className={selectedPartnerId === partner.id ? styles.activeRow : ''}
                  >
                    <td>
                      <div className={styles.partnerCell}>
                        <div className={styles.avatar}>
                          {(displayOperatorName || partner.name || 'P').slice(0, 1).toUpperCase()}
                        </div>

                        <div>
                          <strong>{displayOperatorName || 'Chưa cập nhật'}</strong>
                          <span>{partner.name} · {partner.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {displayPartnerCode ? (
                        <code className={styles.codeTag}>
                          {displayPartnerCode}
                        </code>
                      ) : (
                        <span className={styles.statusPill}>Chưa có mã</span>
                      )}
                    </td>

                    <td>
                      {operatorLabel(displayPartnerCode)}
                    </td>

                    <td>
                      <select
                        className={styles.operatorSelect}
                        value={draftOp[partner.id] ?? ''}
                        onChange={e => {
                          const operatorCode = e.target.value

                          setDraftOp(d => ({
                            ...d,
                            [partner.id]: operatorCode,
                          }))
                        }}
                      >
                        <option value="">— Bỏ gán —</option>

                        {operators.map(op => (
                          <option
                            key={op.operatorCode}
                            value={op.operatorCode}
                          >
                            {op.operatorName}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <div className={styles.quotaBox}>
                        <span>
                          {used.toLocaleString('vi-VN')} / {total.toLocaleString('vi-VN')}
                        </span>
                        <i>
                          <b style={{ width: `${percent}%` }} />
                        </i>
                      </div>
                    </td>

                    <td>
                      <div className={styles.actionGroup}>
                        <Button
                          variant="primary"
                          onClick={() => saveOperator(partner)}
                          disabled={state === 'saving'}
                        >
                          {state === 'saving' ? 'Lưu...' : 'Lưu'}
                        </Button>

                        <Button
                          variant="ghost"
                          onClick={() => setSelectedPartnerId(partner.id)}
                        >
                          Chi tiết
                        </Button>

                        {state === 'ok' && (
                          <span className={styles.okText}>Đã lưu</span>
                        )}

                        {state === 'err' && (
                          <span className={styles.errText}>Lỗi</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedPartner && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={() => setSelectedPartnerId(null)}
        >
          <section
            className={styles.partnerModal}
            role="dialog"
            aria-modal="true"
            aria-label={`Hồ sơ ${selectedPartner.orgName || selectedPartner.name}`}
            onMouseDown={e => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              type="button"
              onClick={() => setSelectedPartnerId(null)}
              aria-label="Đóng popup"
            >
              ×
            </button>

            <div className={styles.modalHeader}>
              <div>
                <div className={styles.eyebrow}>Partner Profile</div>
                <h2>Hồ sơ: {selectedPartner.orgName}</h2>
                <p>Thông tin chi tiết phục vụ kiểm tra, đối soát và hỗ trợ vận hành partner.</p>
              </div>

              {operatorLabel(selectedPartner.assignedOperatorCode || selectedPartner.partnerCode)}
            </div>

            <div className={styles.detailPanel}>
              <div className={styles.profileCard}>
                <div className={styles.largeAvatar}>
                  {(selectedPartner.orgName || 'P').slice(0, 1).toUpperCase()}
                </div>

                <h3>{selectedPartner.orgName}</h3>
                <p>{selectedPartner.businessType || 'Chưa cập nhật loại doanh nghiệp'}</p>

                {operatorLabel(selectedPartner.assignedOperatorCode || selectedPartner.partnerCode)}
              </div>

              <div className={styles.infoList}>
                <div>
                  <span>Mã partner</span>
                  <strong>{selectedPartner.partnerCode || '— Chưa gán —'}</strong>
                </div>

                <div>
                  <span>Họ tên</span>
                  <strong>{selectedPartner.name}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{selectedPartner.email}</strong>
                </div>

                <div>
                  <span>Số điện thoại</span>
                  <strong>{selectedPartner.phone}</strong>
                </div>

                <div>
                  <span>Domain</span>
                  <strong>{selectedPartner.domain || 'Chưa cập nhật'}</strong>
                </div>

                <div>
                  <span>Trạng thái</span>
                  <strong>{selectedPartner.status}</strong>
                </div>

                <div>
                  <span>API key</span>
                  <strong>{selectedPartner.apiKey || 'Chưa cấp'}</strong>
                </div>

                <div>
                  <span>Nhà xe được gán</span>
                  <strong>{selectedPartner.assignedOperatorCode || selectedPartner.partnerCode || '— Chưa gán —'}</strong>
                </div>

                <div>
                  <span>Gói đang dùng</span>
                  <strong>{selectedPartner.currentPlanId || '— Chưa mua —'}</strong>
                </div>

                <div>
                  <span>Ngày kích hoạt</span>
                  <strong>{formatDate(selectedPartner.planActivatedAt)}</strong>
                </div>

                <div>
                  <span>Ngày hết hạn</span>
                  <strong>{formatDate(selectedPartner.planExpiresAt)}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}