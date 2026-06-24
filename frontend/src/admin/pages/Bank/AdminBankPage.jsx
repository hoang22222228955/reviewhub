import { useEffect, useState } from 'react'
import api from '../../../services/api'
import styles from './AdminBankPage.module.css'

const VIETQR_BANKS = [
  { code: 'MB',   name: 'MB Bank' },
  { code: 'VCB',  name: 'Vietcombank' },
  { code: 'TCB',  name: 'Techcombank' },
  { code: 'ACB',  name: 'ACB' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VTB',  name: 'VietinBank' },
  { code: 'TPB',  name: 'TPBank' },
  { code: 'STB',  name: 'Sacombank' },
  { code: 'VPB',  name: 'VPBank' },
  { code: 'MSB',  name: 'MSB' },
  { code: 'OCB',  name: 'OCB' },
  { code: 'SHB',  name: 'SHB' },
  { code: 'HDB',  name: 'HDBank' },
  { code: 'EIB',  name: 'Eximbank' },
  { code: 'NAB',  name: 'Nam A Bank' },
]

export default function AdminBankPage() {
  const [form, setForm] = useState({
    bankId: 'MB',
    accountNo: '',
    accountName: '',
    bankName: 'MB Bank',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'success'|'error', text }

  useEffect(() => {
    api.get('/api/admin/bank-config')
      .then(res => setForm(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      // Tự đồng bộ bankName khi đổi bankId
      if (name === 'bankId') {
        const bank = VIETQR_BANKS.find(b => b.code === value)
        if (bank) next.bankName = bank.name
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await api.put('/api/admin/bank-config', form)
      setMsg({ type: 'success', text: 'Đã lưu thông tin ngân hàng thành công!' })
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'Lưu thất bại, vui lòng thử lại.'
      setMsg({ type: 'error', text: errMsg })
    } finally {
      setSaving(false)
    }
  }

  // Preview QR
  const previewQr = form.bankId && form.accountNo
    ? `https://img.vietqr.io/image/${form.bankId}-${form.accountNo}-compact2.png?amount=0&addInfo=preview&accountName=${encodeURIComponent(form.accountName)}`
    : null

  if (loading) return <div className={styles.loading}>Đang tải...</div>

  return (
    <div className={styles.page}>
      <div className={styles.sectionHeader}>
        <div className={styles.eyebrowLine}>
          <span className={styles.eyebrowDash} />
          <span className={styles.eyebrowText}>QUẢN TRỊ</span>
        </div>
        <h2 className={styles.sectionTitle}>Cấu hình ngân hàng nhận tiền</h2>
        <p className={styles.sectionSub}>
          Thông tin này sẽ hiển thị cho user khi chọn thanh toán chuyển khoản ngân hàng.
        </p>
      </div>

      <div className={styles.content}>
        {/* Form */}
        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Ngân hàng (VietQR code)</label>
            <select
              name="bankId"
              value={form.bankId}
              onChange={handleChange}
              className={styles.select}
              required
            >
              {VIETQR_BANKS.map(b => (
                <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
              ))}
              <option value="__custom">Khác (nhập thủ công)</option>
            </select>
            {form.bankId === '__custom' && (
              <input
                name="bankId"
                className={styles.input}
                placeholder="Nhập mã VietQR (vd: VIB, BAB...)"
                value={form.bankId === '__custom' ? '' : form.bankId}
                onChange={handleChange}
                required
              />
            )}
            <p className={styles.hint}>
              Mã VietQR — xem danh sách tại{' '}
              <a href="https://www.vietqr.io/danh-sach-ngan-hang" target="_blank" rel="noreferrer">
                vietqr.io
              </a>
            </p>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Tên ngân hàng (hiển thị)</label>
            <input
              name="bankName"
              value={form.bankName}
              onChange={handleChange}
              className={styles.input}
              placeholder="VD: MB Bank"
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Số tài khoản</label>
            <input
              name="accountNo"
              value={form.accountNo}
              onChange={handleChange}
              className={styles.input}
              placeholder="VD: 0123456789"
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Chủ tài khoản</label>
            <input
              name="accountName"
              value={form.accountName}
              onChange={handleChange}
              className={styles.input}
              placeholder="VD: NGUYEN VAN A"
              required
            />
            <p className={styles.hint}>Nhập IN HOA, không dấu (khớp với tên tài khoản ngân hàng).</p>
          </div>

          {msg && (
            <div className={`${styles.alert} ${msg.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
              {msg.text}
            </div>
          )}

          <button type="submit" className={styles.btnSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>

        {/* QR Preview */}
        <div className={styles.previewCard}>
          <p className={styles.previewTitle}>Xem trước mã QR</p>
          {previewQr ? (
            <div className={styles.qrWrap}>
              <img src={previewQr} alt="QR preview" className={styles.qrImg} />
            </div>
          ) : (
            <div className={styles.qrPlaceholder}>Nhập số tài khoản để xem trước QR</div>
          )}
          <div className={styles.bankInfoList}>
            <div className={styles.bankInfoRow}>
              <span>Ngân hàng</span>
              <strong>{form.bankName || '—'}</strong>
            </div>
            <div className={styles.bankInfoRow}>
              <span>Số TK</span>
              <strong>{form.accountNo || '—'}</strong>
            </div>
            <div className={styles.bankInfoRow}>
              <span>Chủ TK</span>
              <strong>{form.accountName || '—'}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
