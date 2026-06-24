import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../../../shared/ui/Card/Card'
import Button from '../../../shared/ui/Button/Button'
import Badge from '../../../shared/ui/Badge/Badge'
import ProgressBar from '../../../shared/ui/ProgressBar/ProgressBar'
import { useAuth } from '../../context/AuthContext'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  quotaPercent,
} from '../../../shared/lib/format'
import { getPlanById, fetchPlans } from '../../../services/planService'
import api from '../../../services/api'
import styles from './ProfilePage.module.css'

const PAYMENT_METHODS = [
  { id: 'momo',    name: 'Ví MoMo',          icon: 'M',  color: '#ae2070', desc: 'Quét QR / số điện thoại',           guide: 'Mở app MoMo → Quét QR hoặc chuyển đến số điện thoại đăng ký → Nhập số tiền và xác nhận.' },
  { id: 'zalopay', name: 'ZaloPay',           icon: 'Z',  color: '#0068ff', desc: 'Ví ZaloPay liên kết',                guide: 'Mở app ZaloPay → Quét QR hoặc chuyển đến tài khoản liên kết → Nhập số tiền và xác nhận.' },
  { id: 'vnpay',   name: 'VNPay QR',          icon: 'V',  color: '#cc0000', desc: 'Quét mã qua app ngân hàng',          guide: 'Mở app ngân hàng hỗ trợ VNPay → Chọn Quét QR → Quét mã do admin cung cấp → Xác nhận thanh toán.' },
  { id: 'banking', name: 'Internet Banking',  icon: 'IB', color: '#0f7235', desc: 'Chuyển khoản ATM / ngân hàng' },
  { id: 'card',    name: 'Visa / Mastercard', icon: 'CC', color: '#1a1f71', desc: 'Thẻ quốc tế Visa, Mastercard',       guide: 'Liên hệ admin để được cung cấp link thanh toán thẻ quốc tế an toàn.' },
  { id: 'cod',     name: 'Tiền mặt',          icon: 'TM', color: '#78350f', desc: 'Thanh toán tại quầy khi kích hoạt',  guide: 'Đến địa điểm giao dịch của ReviewHub, thanh toán tiền mặt và nhận mã kích hoạt từ nhân viên.' },
]

// Fallback bank info (sẽ bị ghi đè bởi dữ liệu từ DB)
const DEFAULT_ADMIN_BANK = {
  bankId: 'MB',
  accountNo: '0859693664',
  accountName: 'PHAM QUOC NHAT',
  bankName: 'MB Bank',
}

function slugifyVietnamese(name = '') {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '')
}

function tierColor(id) {
  if (id === 'custom') return '#8b5cf6'
  if (id === 'growth') return '#f59e0b'
  if (id === 'enterprise') return '#6366f1'
  return '#22c55e'
}

function getCustomLevelName(level = '') {
  if (level === 'growth') return 'Tăng trưởng'
  if (level === 'enterprise') return 'Doanh nghiệp'
  return 'Khởi đầu'
}

function countCartServices(items = '') {
  return String(items || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .length
}

const HISTORY_PAGE_SIZE = 10

function clampPage(page, totalPages) {
  return Math.max(1, Math.min(page, totalPages))
}

function getInitials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'U'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

function getStatusTone(status = '') {
  const value = String(status).toLowerCase()

  if (
    value.includes('thành công') ||
    value.includes('đã thanh toán') ||
    value.includes('completed') ||
    value.includes('success')
  ) {
    return 'success'
  }

  if (
    value.includes('đang') ||
    value.includes('chờ') ||
    value.includes('pending') ||
    value.includes('processing')
  ) {
    return 'warning'
  }

  if (
    value.includes('hủy') ||
    value.includes('lỗi') ||
    value.includes('failed') ||
    value.includes('error')
  ) {
    return 'danger'
  }

  return 'warning'
}

export default function ProfilePage() {
  const { currentUser, daysRemaining, updateProfile, refreshUser, purchasePlan, cancelPlan, uploadLogo, submitPayment } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [purchasePage, setPurchasePage] = useState(1)
  const [paymentPage, setPaymentPage] = useState(1)
  const [purchaseHistoryData, setPurchaseHistoryData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const [savedProfile, setSavedProfile] = useState(null)
  const [draft, setDraft] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const CART_KEY = 'reviewhub-cart'

  function readCart() {
    try {
      return JSON.parse(sessionStorage.getItem(CART_KEY) || '{}') || {}
    } catch {
      return {}
    }
  }

  const [cartPlanId, setCartPlanId] = useState(() => readCart()?.planId || null)
  const [cartQty, setCartQty] = useState(() => readCart()?.qty || 1)
  const [cartItems, setCartItems] = useState(() => readCart()?.items || '')
  const [cartCategories, setCartCategories] = useState(() => readCart()?.categories || '')
  const [cartPrice, setCartPrice] = useState(() => Number(readCart()?.price || 0))
  const [cartPricePerMonth, setCartPricePerMonth] = useState(() => Number(readCart()?.pricePerMonth || 0))
  const [cartLevel, setCartLevel] = useState(() => readCart()?.level || '')

  function saveCart(planId, qty, extra = {}) {
    const data = {
      planId,
      qty,
      items: extra.items ?? cartItems,
      categories: extra.categories ?? cartCategories,
      price: Number(extra.price ?? cartPrice ?? 0),
      pricePerMonth: Number(extra.pricePerMonth ?? cartPricePerMonth ?? 0),
      level: extra.level ?? cartLevel,
    }

    setCartPlanId(data.planId)
    setCartQty(data.qty)
    setCartItems(data.items)
    setCartCategories(data.categories)
    setCartPrice(data.price)
    setCartPricePerMonth(data.pricePerMonth)
    setCartLevel(data.level)
    sessionStorage.setItem(CART_KEY, JSON.stringify(data))
  }

  function clearCart() {
    setCartPlanId(null)
    setCartQty(1)
    setCartItems('')
    setCartCategories('')
    setCartPrice(0)
    setCartPricePerMonth(0)
    setCartLevel('')
    sessionStorage.removeItem(CART_KEY)
  }

  const [showPayModal, setShowPayModal] = useState(false)
  const [livePlans, setLivePlans] = useState([])

  // Fetch plans từ DB để đảm bảo giá luôn đúng
  useEffect(() => {
    fetchPlans().then(setLivePlans)
  }, [])

  // Refresh user từ DB khi vào tab plan
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab === 'plan') refreshUser()
  }, [])

  // Đọc planId + dịch vụ đã chọn từ URL (từ bảng giá chuyển sang)
  useEffect(() => {
    const planId = searchParams.get('planId')
    const qtyParam = parseInt(searchParams.get('qty') || '1', 10)

    if (planId) {
      const safeQty = Math.max(1, Math.min(12, qtyParam))
      const totalPriceFromUrl = Number(searchParams.get('price') || 0)
      const pricePerMonthFromUrl = Number(searchParams.get('pricePerMonth') || 0)
        || (totalPriceFromUrl > 0 ? Math.round(totalPriceFromUrl / safeQty) : 0)

      saveCart(planId, safeQty, {
        items: searchParams.get('items') || '',
        categories: searchParams.get('categories') || '',
        price: totalPriceFromUrl,
        pricePerMonth: pricePerMonthFromUrl,
        level: searchParams.get('level') || '',
      })

      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.delete('planId')
        next.delete('qty')
        next.delete('items')
        next.delete('categories')
        next.delete('price')
        next.delete('pricePerMonth')
        next.delete('rawPrice')
        next.delete('discount')
        next.delete('level')
        return next
      })
    }
  }, [])
  const [adminBank, setAdminBank] = useState(DEFAULT_ADMIN_BANK)

  useEffect(() => {
    api.get('/api/admin/bank-config')
      .then(res => setAdminBank(res.data))
      .catch(() => {}) // fallback vẫn là DEFAULT_ADMIN_BANK
  }, [])

  const activeTabEarly = searchParams.get('tab') || 'profile'
  useEffect(() => {
    if (activeTabEarly === 'purchase' && purchaseHistoryData === null) {
      api.get('/api/partner/my-purchases')
        .then(r => setPurchaseHistoryData(r.data))
        .catch(() => setPurchaseHistoryData([]))
    }
  }, [activeTabEarly, purchaseHistoryData])

  const [payStep, setPayStep] = useState('choose')
  const [payMethod, setPayMethod] = useState(null)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showPlanConflict, setShowPlanConflict] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')

  async function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoError('Chỉ chấp nhận file ảnh (jpg, png, webp...).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Ảnh không được vượt quá 2MB.')
      return
    }
    setLogoError('')
    setLogoUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      const result = await uploadLogo(base64)
      if (!result.success) setLogoError(result.message || 'Upload thất bại.')
      setLogoUploading(false)
    }
    reader.readAsDataURL(file)
  }

  async function handleConfirmPayment(method) {
    if (paymentSubmitting) return

    try {
      setPaymentSubmitting(true)
      setPaymentError('')

      const selectedServiceCodes = String(cartItems || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)

      const categories = String(cartCategories || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)

      await api.post('/api/partner/submit-payment', {
        planId: cartPlanId,
        qty: cartQty,
        paymentMethod: method || payMethod || 'banking',
        selectedServiceCodes,
        categories,
        price: cartTotalPrice,
        level: cartLevel || undefined,
      })

      // Giữ đúng logic cũ: bấm thanh toán xong chuyển sang màn chờ duyệt ngay trong popup.
      setPayStep('waiting')
      setPayMethod(null)
      clearCart()

      api.get('/api/partner/my-purchases')
        .then(r => setPurchaseHistoryData(r.data))
        .catch(() => {})
    } catch (error) {
      console.error('Submit payment error:', error)
      setPaymentError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Không gửi được yêu cầu thanh toán. Vui lòng kiểm tra backend.'
      )
    } finally {
      setPaymentSubmitting(false)
    }
  }

  if (!currentUser) return null

  const currentPlan = livePlans.find(p => p.id === currentUser?.currentPlanId) || getPlanById(currentUser?.currentPlanId)
  const cartServiceCount = countCartServices(cartItems)
  const customBasePlan = cartPlanId === 'custom'
    ? (livePlans.find(p => p.id === (cartLevel || 'starter')) || getPlanById(cartLevel || 'starter'))
    : null
  const customPricePerMonth = cartPricePerMonth > 0
    ? cartPricePerMonth
    : (cartPrice > 0 ? Math.round(cartPrice / Math.max(1, cartQty)) : (customBasePlan?.price || 0) * Math.max(1, cartServiceCount))

  const customCartPlanData = cartPlanId === 'custom'
    ? {
        id: 'custom',
        name: `Tự chọn - ${getCustomLevelName(cartLevel)}`,
        price: customPricePerMonth,
        quota: (customBasePlan?.quota || customBasePlan?.quotaLimit || 0) * Math.max(1, cartServiceCount),
        durationDays: customBasePlan?.durationDays || 30,
      }
    : null
  const cartPlanData = livePlans.find(p => p.id === cartPlanId) || customCartPlanData || null
  const cartTotalPrice = cartPlanId === 'custom'
    ? customPricePerMonth * cartQty
    : (cartPlanData ? cartPlanData.price * cartQty : 0)

  const liveProfile = {
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
  }

  const profileOwnerKey =
    currentUser?.email || currentUser?.id || currentUser?.name || 'guest'

  const displayedProfile =
    savedProfile?.ownerKey === profileOwnerKey ? savedProfile.data : liveProfile

  const activeTab = searchParams.get('tab') || 'profile'

  const used = currentUser.quotaUsed || 0
  const total = currentUser.quotaTotal || 0
  const remaining = Math.max(total - used, 0)
  const usedPercent = quotaPercent(used, total)

  const purchaseHistory = Array.isArray(purchaseHistoryData)
    ? purchaseHistoryData
    : []

  const paymentHistory = Array.isArray(currentUser.paymentHistory)
    ? currentUser.paymentHistory
    : []

  const purchaseTotalPages = Math.max(
    1,
    Math.ceil(purchaseHistory.length / HISTORY_PAGE_SIZE)
  )

  const paymentTotalPages = Math.max(
    1,
    Math.ceil(paymentHistory.length / HISTORY_PAGE_SIZE)
  )

  const safePurchasePage = clampPage(purchasePage, purchaseTotalPages)
  const safePaymentPage = clampPage(paymentPage, paymentTotalPages)

  const purchaseStart = (safePurchasePage - 1) * HISTORY_PAGE_SIZE
  const paymentStart = (safePaymentPage - 1) * HISTORY_PAGE_SIZE

  const pagedPurchaseHistory = purchaseHistory.slice(
    purchaseStart,
    purchaseStart + HISTORY_PAGE_SIZE
  )

  const pagedPaymentHistory = paymentHistory.slice(
    paymentStart,
    paymentStart + HISTORY_PAGE_SIZE
  )

  const purchaseFrom = purchaseHistory.length ? purchaseStart + 1 : 0
  const purchaseTo = purchaseHistory.length
    ? Math.min(purchaseStart + HISTORY_PAGE_SIZE, purchaseHistory.length)
    : 0

  const paymentFrom = paymentHistory.length ? paymentStart + 1 : 0
  const paymentTo = paymentHistory.length
    ? Math.min(paymentStart + HISTORY_PAGE_SIZE, paymentHistory.length)
    : 0

  const initials = getInitials(displayedProfile.name)

  const changeTab = (tab) => {
    setSearchParams({ tab })
  }

  const handleDraftChange = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleStartEdit = () => {
    setDraft(displayedProfile)
    setIsEditing(true)
    setSaveMessage('')
  }

  const handleCancelEdit = () => {
    setDraft(displayedProfile)
    setIsEditing(false)
    setSaveMessage('')
  }

  const handleSaveProfile = () => {
    const normalized = {
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
    }

    if (!normalized.name || !normalized.email) {
      setSaveMessage('Vui lòng nhập đầy đủ họ tên và email.')
      return
    }

    setSavedProfile({
      ownerKey: profileOwnerKey,
      data: normalized,
    })

    setDraft(normalized)
    setIsEditing(false)
    setSaveMessage(
      'Đã cập nhật thông tin trên giao diện. Khi cần lưu vĩnh viễn, bạn chỉ cần nối thêm API cập nhật hồ sơ.'
    )
  }

  const renderProfileCard = () => (
    <Card
      className={styles.surfaceCard}
      title="Hồ sơ người dùng"
      headerRight={
        !isEditing ? (
          <Button variant="secondary" onClick={handleStartEdit}>
            Chỉnh sửa
          </Button>
        ) : null
      }
    >
      {saveMessage ? <div className={styles.notice}>{saveMessage}</div> : null}

      {/* ── Cover banner ── */}
      <div className={styles.profileCover}>
        <div className={styles.profileCoverOverlay} />
        {currentUser.role === 'partner' && currentUser.orgName && (
          <div className={styles.coverOrgBadge}>{currentUser.orgName}</div>
        )}
      </div>

      {/* ── Avatar + tên ── */}
      <div className={styles.profileTop}>
        <div className={styles.profileAvatarWrap}>
          <div className={styles.avatar}>{initials}</div>
        </div>

        <div className={styles.profileMeta}>
          <h2 className={styles.profileName}>{displayedProfile.name}</h2>
          <p className={styles.profileRole}>
            {currentUser.role === 'partner'
              ? 'Tài khoản đối tác'
              : currentUser.role === 'admin'
                ? 'Tài khoản quản trị'
                : 'Tài khoản người dùng'}
          </p>
          {currentUser.status && (
            <span className={styles.profileStatusBadge}>{currentUser.status}</span>
          )}
        </div>

        {/* Logo đối tác (bên phải) */}
        {currentUser.role === 'partner' && (
          <div className={styles.partnerLogoBlock}>
            <label className={styles.partnerLogoUploadLabel} title="Nhấn để thay đổi logo">
              <input
                type="file"
                accept="image/*"
                className={styles.partnerLogoInput}
                onChange={handleLogoChange}
              />
              {currentUser.logoUrl ? (
                <img
                  src={currentUser.logoUrl}
                  alt="Logo đối tác"
                  className={styles.partnerLogoImg}
                />
              ) : (
                <div className={styles.partnerLogo}>
                  {currentUser.orgName
                    ? currentUser.orgName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
                    : 'PT'}
                </div>
              )}
              <span className={styles.partnerLogoOverlay}>
                {logoUploading ? 'Đang lưu...' : 'Đổi logo'}
              </span>
            </label>
            <span className={styles.partnerLogoLabel}>Logo đối tác</span>
            {logoError && <span className={styles.partnerLogoError}>{logoError}</span>}
          </div>
        )}
      </div>

      {/* ── Thông tin cá nhân (có thể chỉnh sửa) ── */}
      <div className={styles.planSectionLabel}>
        <span className={styles.cartEyebrowDash} />
        THÔNG TIN CÁ NHN
      </div>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label>Họ và tên</label>
          {isEditing ? (
            <input
              className={styles.input}
              value={draft.name}
              onChange={(e) => handleDraftChange('name', e.target.value)}
            />
          ) : (
            <div className={styles.valueBox}>{displayedProfile.name}</div>
          )}
        </div>

        <div className={styles.field}>
          <label>Email</label>
          {isEditing ? (
            <input
              className={styles.input}
              value={draft.email}
              onChange={(e) => handleDraftChange('email', e.target.value)}
            />
          ) : (
            <div className={styles.valueBox}>{displayedProfile.email}</div>
          )}
        </div>

        <div className={styles.field}>
          <label>Số điện thoại</label>
          {isEditing ? (
            <input
              className={styles.input}
              value={draft.phone}
              onChange={(e) => handleDraftChange('phone', e.target.value)}
            />
          ) : (
            <div className={styles.valueBox}>{displayedProfile.phone}</div>
          )}
        </div>

        <div className={styles.field}>
          <label>Loại tài khoản</label>
          <div className={styles.valueBox}>{currentUser.membershipLabel || '—'}</div>
        </div>
      </div>

      {isEditing ? (
        <div className={styles.actionRow}>
          <Button onClick={handleSaveProfile}>Lưu thay đổi</Button>
          <Button variant="secondary" onClick={handleCancelEdit}>
            Hủy
          </Button>
        </div>
      ) : null}

      {/* ── Thông tin đối tác (chỉ hiện với role partner) ── */}
      {currentUser.role === 'partner' && (
        <>
          <div className={styles.planSectionLabel} style={{ marginTop: 20 }}>
            <span className={styles.cartEyebrowDash} />
            THÔNG TIN ĐỐI TÁC
          </div>
          <div className={styles.infoList}>
            {currentUser.partnerCode && (
              <div>
                <span>Mã đối tác</span>
                <strong>{currentUser.partnerCode}</strong>
              </div>
            )}
            {currentUser.orgName && (
              <div>
                <span>Tên tổ chức</span>
                <strong>{currentUser.orgName}</strong>
              </div>
            )}
            {currentUser.businessType && (
              <div>
                <span>Ngành hoạt động</span>
                <strong>{currentUser.businessType}</strong>
              </div>
            )}
            {currentUser.domain && (
              <div>
                <span>Website</span>
                <strong>{currentUser.domain}</strong>
              </div>
            )}
            {currentUser.status && (
              <div>
                <span>Trạng thái tài khoản</span>
                <strong>{currentUser.status}</strong>
              </div>
            )}
            {currentUser.createdAt && (
              <div>
                <span>Ngày tham gia</span>
                <strong>{formatDateTime(currentUser.createdAt)}</strong>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── API Key ── */}
      {currentUser.apiKey && (
        <>
          <div className={styles.planSectionLabel} style={{ marginTop: 20 }}>
            <span className={styles.cartEyebrowDash} />
            API KEY
          </div>
          <div className={styles.infoList}>
            <div>
              <span>Live API Key</span>
              <strong style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.03em' }}>
                {currentUser.apiKey}
              </strong>
            </div>
            {currentUser.assignedOperatorCode && (
              <div>
                <span>Mã operator</span>
                <strong style={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {currentUser.assignedOperatorCode}
                </strong>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  )

  const renderPlanCard = () => (
    <Card className={styles.surfaceCard}>
      {/* ── Header ── */}
      <div className={styles.cartHeader}>
        <div className={styles.cartEyebrowLine}>
          <span className={styles.cartEyebrowDash} />
          <span className={styles.cartEyebrowText}>GÓI DỊCH VỤ</span>
        </div>
        <h2 className={styles.cartTitle}>Quản lý gói dịch vụ</h2>
        <p className={styles.cartSub}>Gia hạn, đổi gói · Thanh toán trực tiếp tại đây</p>
      </div>

      {/* ══════════════════════════════════════════
          PHẦN 1: GIỎ HÀNG — luôn hiển thị
          (trống nếu chưa chọn gói, có item nếu đến từ bảng giá)
      ══════════════════════════════════════════ */}
      <div className={styles.planSectionLabel}>
        <span className={styles.cartEyebrowDash} />
        GIỎ HÀNG
      </div>

      <div className={styles.cartSection}>
        {cartPlanData ? (
          <div className={styles.cartItem}>
            <span className={styles.cartTierDot} style={{ background: tierColor(cartPlanId) }} />
            <div className={styles.cartItemInfo}>
              <div className={styles.cartItemName}>{cartPlanData.name}</div>
              <div className={styles.cartItemMeta}>
                {cartPlanId === 'custom'
                  ? `${Math.max(1, cartServiceCount)} dịch vụ · mức ${getCustomLevelName(cartLevel)} · ${formatNumber(cartPlanData.quota)} request`
                  : `${formatNumber(cartPlanData.quota)} request · ${cartPlanData.durationDays} ngày`}
              </div>
            </div>
            <div className={styles.cartItemPriceBlock}>
              <span className={styles.cartPriceMain}>{formatCurrency(cartPlanData.price)}</span>
              <span className={styles.cartPriceCycle}>/ tháng</span>
            </div>
            <div className={styles.cartQtyBlock}>
              <div className={styles.cartQtyStepper}>
                <button className={styles.cartQtyBtn} onClick={() => { const n = Math.max(1, cartQty - 1); saveCart(cartPlanId, n) }} disabled={cartQty <= 1}>−</button>
                <span className={styles.cartQtyNum}>{cartQty}</span>
                <button className={styles.cartQtyBtn} onClick={() => { const n = Math.min(12, cartQty + 1); saveCart(cartPlanId, n) }} disabled={cartQty >= 12}>+</button>
              </div>
              <div className={styles.cartQtyLabel}>{cartQty} tháng</div>
            </div>
            <button className={styles.cartRemoveBtn} onClick={clearCart} title="Xóa khỏi giỏ">×</button>
          </div>
        ) : (
          <div className={styles.cartEmpty}>
            <div className={styles.cartEmptyText}>Giỏ hàng trống</div>
            <div className={styles.cartEmptyHint}>
              Vào <Link to="/bang-gia" className={styles.cartEmptyLink}>bảng giá</Link> để chọn gói, hoặc nhấn "Gia hạn" bên dưới nếu muốn gia hạn gói hiện tại
            </div>
          </div>
        )}
      </div>

      {/* Order summary + Checkout */}
      {cartPlanData && (
        <div className={styles.orderSummary}>
          <div className={styles.orderRow}>
            <span>Gói: {cartPlanData.name}</span>
            <span>{formatCurrency(cartPlanData.price)}</span>
          </div>
          {cartPlanId === 'custom' && (
            <div className={styles.orderRow}>
              <span>Dịch vụ đã chọn</span>
              <span>{Math.max(1, cartServiceCount)} dịch vụ</span>
            </div>
          )}
          {cartPlanId === 'custom' && cartServiceCount >= 2 && (
            <div className={styles.orderRow}>
              <span>Ưu đãi tự chọn</span>
              <span>-10%</span>
            </div>
          )}
          <div className={styles.orderRow}>
            <span>Số tháng</span>
            <span>× {cartQty}</span>
          </div>
          <div className={styles.orderDivider} />
          <div className={`${styles.orderRow} ${styles.orderTotalRow}`}>
            <span>Tổng cộng</span>
            <strong>{formatCurrency(cartTotalPrice)}</strong>
          </div>
          <button
            className={styles.btnCheckout}
            onClick={async () => {
              setShowPlanConflict(false)
              const freshUser = await refreshUser()
              const activePlanId = freshUser?.currentPlanId
              const buyingPlanId = cartPlanId === 'custom' ? (cartLevel || 'starter') : cartPlanId
              // Có gói đang hoạt động VÀ cấp gói trong giỏ khác gói đó → conflict
              if (activePlanId && activePlanId !== 'custom' && buyingPlanId !== activePlanId) {
                setShowPlanConflict(true)
                return
              }
              setPayStep('choose'); setPayMethod(null); setShowPayModal(true)
            }}
          >
            Thanh toán ngay
          </button>

          {/* ── Conflict warning ── */}
          {showPlanConflict && currentPlan && (
            <div className={styles.conflictBox}>
              <p className={styles.conflictTitle}>Bạn đang sử dụng gói {currentPlan.name}</p>
              <p className={styles.conflictSub}>
                Hệ thống không hỗ trợ dùng hai gói cùng một lúc.<br />
                Bạn muốn làm gì với gói <strong>{currentPlan.name}</strong> hiện tại?
              </p>
              <div className={styles.conflictActions}>
                <button
                  className={styles.btnRenew}
                  onClick={() => {
                    setShowPlanConflict(false)
                    saveCart(currentUser.currentPlanId, cartQty)
                    setPayStep('choose'); setPayMethod(null); setShowPayModal(true)
                  }}
                >
                  Gia hạn gói {currentPlan.name}
                </button>
                <button
                  className={styles.btnCancelConfirm}
                  onClick={async () => {
                    await cancelPlan()
                    setShowPlanConflict(false)
                    setPayStep('choose'); setPayMethod(null); setShowPayModal(true)
                  }}
                >
                  Hủy gói {currentPlan.name} và mua {cartPlanData.name}
                </button>
                <button
                  className={styles.btnCancelAbort}
                  onClick={() => { setShowPlanConflict(false); clearCart() }}
                >
                  Thôi, giữ lại
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          PHẦN 2: GÓI ĐANG KÍCH HOẠT — luôn hiển thị
          Dữ liệu lấy từ DB qua currentUser (refreshed)
      ══════════════════════════════════════════ */}
      <div className={styles.planSectionLabel} style={{ marginTop: 24 }}>
        <span className={styles.cartEyebrowDash} />
        GÓI ĐANG KÍCH HOẠT
      </div>

      {!currentPlan ? (
        <div className={styles.activePlanEmpty}>
          <span className={styles.activePlanEmptyIcon}></span>
          {currentUser.quotaTotal > 0 ? (
            /* Có quota nhưng không có current_plan_id — dữ liệu cũ chưa liên kết gói */
            <span className={styles.activePlanEmptyText} style={{ color: '#d97706' }}>
              Tài khoản có {formatNumber(currentUser.quotaTotal)} quota nhưng chưa liên kết gói. Vui lòng liên hệ admin.
            </span>
          ) : (
            <span className={styles.activePlanEmptyText}>Chưa có gói nào đang kích hoạt</span>
          )}
          {!cartPlanData && !currentUser.quotaTotal && (
            <Link to="/bang-gia" className={styles.emptyStateBtn} style={{ marginTop: 8 }}>
              Chọn gói tại bảng giá →
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.activeQuotaSection}>
          <div className={styles.activeInfoGrid}>
            <div className={styles.activeInfoRow}><span>Tên gói</span><strong>{currentPlan.name}</strong></div>
            <div className={styles.activeInfoRow}><span>Hết hạn</span><strong>{formatDateTime(currentUser.planExpiresAt)}</strong></div>
            <div className={styles.activeInfoRow}><span>Còn lại</span><strong>{daysRemaining} ngày</strong></div>
          </div>
          <div className={styles.progressWrap} style={{ marginTop: 12 }}>
            <div className={styles.progressMeta}>
              <span>Mức sử dụng quota</span>
              <strong>{usedPercent}%</strong>
            </div>
            <ProgressBar value={usedPercent} />
            <div className={styles.progressLegend}>
              <span>{formatNumber(used)} đã dùng</span>
              <span>{formatNumber(remaining)} còn lại</span>
            </div>
          </div>
          <div className={styles.activeActions}>
            {!cartPlanData && (
              <button
                className={styles.btnRenew}
                onClick={() => saveCart(currentUser.currentPlanId, 1)}
              >
                Gia hạn gói {currentPlan.name}
              </button>
            )}
            <Link to="/bang-gia" className={styles.btnViewPricing}>
              Mua gói khác →
            </Link>
            <button className={styles.btnCancel} onClick={() => setShowCancelConfirm(true)}>
              Hủy gói
            </button>
          </div>

          {showCancelConfirm && (
            <div className={styles.cancelBox}>
              <p className={styles.cancelBoxTitle}>Xác nhận hủy gói {currentPlan.name}</p>
              <p className={styles.cancelBoxSub}>
                Sau khi hủy, bạn sẽ mất quyền truy cập API và quota còn lại.<br />
                Bạn vẫn có thể mua gói mới bất kỳ lúc nào.
              </p>
              <div className={styles.cancelBoxActions}>
                <button
                  className={styles.btnCancelConfirm}
                  onClick={async () => {
                    await cancelPlan()
                    setShowCancelConfirm(false)
                    clearCart()
                  }}
                >
                  Xác nhận hủy
                </button>
                <button className={styles.btnCancelAbort} onClick={() => setShowCancelConfirm(false)}>
                  Không, giữ lại
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )

  const renderPurchaseCard = () => (
    <Card className={styles.surfaceCard} title="Lịch sử mua hàng">
      {purchaseHistoryData === null ? (
        <p style={{ color: '#888', padding: '16px 0' }}>Đang tải...</p>
      ) : (
        <>
      <div className={styles.tableTopbar}>
        <div className={styles.tableMeta}>
          <strong>{purchaseHistory.length}</strong>
          <span>giao dịch</span>
        </div>

        <div className={styles.tableMetaRight}>
          {purchaseHistory.length > 0 && (
            <span>
              Đang xem {purchaseFrom} - {purchaseTo}
            </span>
          )}
        </div>
      </div>

      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Gói</th>
              <th>Số tiền</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
            </tr>
          </thead>

          <tbody>
            {pagedPurchaseHistory.length ? (
              pagedPurchaseHistory.map((item) => {
                const plan = getPlanById(item.planId)
                const rawStatus = item.status || ''
                const displayStatus = rawStatus.startsWith('pending:')
                  ? `Chờ duyệt (${rawStatus.slice('pending:'.length)})`
                  : rawStatus === 'pending' ? 'Chờ duyệt' : rawStatus

                return (
                  <tr key={item.id}>
                    <td style={{ fontSize: 12, color: '#888' }}>{item.id?.slice(0, 8)}…</td>
                    <td>{plan?.name || item.planName || item.planId}</td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td>{formatDateTime(item.purchasedAt)}</td>
                    <td>
                      <Badge tone={getStatusTone(rawStatus)}>
                        {displayStatus}
                      </Badge>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>
                  Chưa có lịch sử mua hàng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {purchaseTotalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={safePurchasePage === 1}
            onClick={() =>
              setPurchasePage((prev) => clampPage(prev - 1, purchaseTotalPages))
            }
          >
            Trước
          </button>

          {Array.from({ length: purchaseTotalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                type="button"
                className={`${styles.pageButton} ${
                  safePurchasePage === page ? styles.pageButtonActive : ''
                }`}
                onClick={() => setPurchasePage(page)}
              >
                {page}
              </button>
            )
          )}

          <button
            type="button"
            className={styles.pageButton}
            disabled={safePurchasePage === purchaseTotalPages}
            onClick={() =>
              setPurchasePage((prev) => clampPage(prev + 1, purchaseTotalPages))
            }
          >
            Sau
          </button>
        </div>
      )}
        </>
      )}
    </Card>
  )

  const renderPaymentCard = () => (
    <Card className={styles.surfaceCard} title="Lịch sử thanh toán">
      <div className={styles.tableTopbar}>
        <div className={styles.tableMeta}>
          <strong>{paymentHistory.length}</strong>
          <span>giao dịch</span>
        </div>

        <div className={styles.tableMetaRight}>
          {paymentHistory.length > 0 && (
            <span>
              Đang xem {paymentFrom} - {paymentTo}
            </span>
          )}
        </div>
      </div>

      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mã thanh toán</th>
              <th>Phương thức</th>
              <th>Số tiền</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
            </tr>
          </thead>

          <tbody>
            {pagedPaymentHistory.length ? (
              pagedPaymentHistory.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.method}</td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{formatDateTime(item.paidAt)}</td>
                  <td>
                    <Badge tone={getStatusTone(item.status)}>
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>
                  Chưa có lịch sử thanh toán.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paymentTotalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={safePaymentPage === 1}
            onClick={() =>
              setPaymentPage((prev) => clampPage(prev - 1, paymentTotalPages))
            }
          >
            Trước
          </button>

          {Array.from({ length: paymentTotalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                type="button"
                className={`${styles.pageButton} ${
                  safePaymentPage === page ? styles.pageButtonActive : ''
                }`}
                onClick={() => setPaymentPage(page)}
              >
                {page}
              </button>
            )
          )}

          <button
            type="button"
            className={styles.pageButton}
            disabled={safePaymentPage === paymentTotalPages}
            onClick={() =>
              setPaymentPage((prev) => clampPage(prev + 1, paymentTotalPages))
            }
          >
            Sau
          </button>
        </div>
      )}
    </Card>
  )

  const sectionTitle =
    activeTab === 'profile'
      ? 'Hồ sơ người dùng'
      : activeTab === 'plan'
        ? 'Gói hiện tại'
        : activeTab === 'purchase'
          ? 'Lịch sử mua hàng'
          : 'Lịch sử thanh toán'

  return (
    <div className={`pageContainer ${styles.page}`}>

      {/* ── KPI tổng quan ── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Gói hiện tại</span>
          </div>
          <div className={styles.kpiValue} style={{ fontSize: currentPlan ? 22 : 16 }}>
            {currentPlan ? currentPlan.name : <span style={{ color: '#b45309' }}>Chưa có gói</span>}
          </div>
          <div className={styles.kpiSub}>{currentUser.membershipLabel || 'Chưa kích hoạt'}</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Quota còn lại</span>
            {currentPlan && (
              <Badge tone={daysRemaining <= 7 ? 'warning' : 'success'}>Còn {daysRemaining} ngày</Badge>
            )}
          </div>
          <div className={styles.kpiValue}>{formatNumber(remaining)}</div>
          <div className={styles.kpiSub}>trên tổng {formatNumber(total)} request</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Đã sử dụng</span>
          </div>
          <div className={styles.kpiValue}>{usedPercent}%</div>
          <div className={styles.kpiSub}>{formatNumber(used)} / {formatNumber(total)} request</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Trạng thái</span>
          </div>
          <div className={styles.kpiValue} style={{ fontSize: 18 }}>{currentUser.status || '—'}</div>
          <div className={styles.kpiSub}>{currentUser.role === 'partner' ? 'Tài khoản đối tác' : 'Tài khoản người dùng'}</div>
        </div>
      </div>

      {/* ── Tab strip ── */}
      <div className={styles.tabStrip}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'profile' ? styles.tabButtonActive : ''}`}
          onClick={() => changeTab('profile')}
        >
          Hồ sơ người dùng
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'plan' ? styles.tabButtonActive : ''}`}
          onClick={() => changeTab('plan')}
        >
          Gói hiện tại
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'purchase' ? styles.tabButtonActive : ''}`}
          onClick={() => changeTab('purchase')}
        >
          Lịch sử mua hàng
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'payment' ? styles.tabButtonActive : ''}`}
          onClick={() => changeTab('payment')}
        >
          Lịch sử thanh toán
        </button>
      </div>

      <div className={styles.singleSection}>
        {activeTab === 'profile' && renderProfileCard()}
        {activeTab === 'plan' && renderPlanCard()}
        {activeTab === 'purchase' && renderPurchaseCard()}
        {activeTab === 'payment' && renderPaymentCard()}
      </div>

      {/* Payment modal */}
      {showPayModal && (
        <div
          className={styles.modalOverlay}
          onClick={e => { if (e.target === e.currentTarget) setShowPayModal(false) }}
        >
          <div className={styles.modal}>
            <button className={styles.modalClose} onClick={() => setShowPayModal(false)}>✕</button>

            {payStep === 'choose' ? (
              <>
                <div className={styles.modalHeader}>
                  <div className={styles.cartEyebrowLine}>
                    <span className={styles.cartEyebrowDash} />
                    <span className={styles.cartEyebrowText}>THANH TOÁN</span>
                  </div>
                  <h3 className={styles.modalTitle}>Chọn hình thức thanh toán</h3>
                  {cartPlanData && (
                    <p className={styles.modalSub}>
                      {cartPlanData.name} · {cartQty} tháng · <strong>{formatCurrency(cartTotalPrice)}</strong>
                    </p>
                  )}
                </div>
                <div className={styles.payGrid}>
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      className={styles.payCard}
                      onClick={async () => {
                        setPayMethod(m.id)
                        if (m.id === 'banking') {
                          setPayStep('banking')
                          return
                        }
                        setPayStep('pending')
                      }}
                    >
                      <span className={styles.payIcon} style={{ background: m.color }}>{m.icon}</span>
                      <span className={styles.payName}>{m.name}</span>
                      <span className={styles.payDesc}>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : payStep === 'banking' ? (() => {
                const addInfo = slugifyVietnamese(currentUser?.name) + cartTotalPrice
                const qrUrl = `https://img.vietqr.io/image/${adminBank.bankId}-${adminBank.accountNo}-compact2.png?amount=${cartTotalPrice}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(adminBank.accountName)}`
                return (
                  <div className={styles.bankingStep}>
                    <div className={styles.modalHeader}>
                      <button className={styles.bankingBack} onClick={() => setPayStep('choose')}>← Quay lại</button>
                      <div className={styles.cartEyebrowLine}>
                        <span className={styles.cartEyebrowDash} />
                        <span className={styles.cartEyebrowText}>CHUYỂN KHOẢN NGN HÀNG</span>
                      </div>
                      <h3 className={styles.modalTitle}>Quét mã QR để thanh toán</h3>
                      {cartPlanData && (
                        <p className={styles.modalSub}>
                          {cartPlanData.name} · {cartQty} tháng · <strong>{formatCurrency(cartTotalPrice)}</strong>
                        </p>
                      )}
                    </div>
                    <div className={styles.bankingBody}>
                      <div className={styles.qrWrap}>
                        <img src={qrUrl} alt="QR chuyển khoản" className={styles.qrImg} />
                      </div>
                      <div className={styles.bankInfoTable}>
                        <div className={styles.bankInfoRow}>
                          <span>Ngân hàng</span>
                          <strong>{adminBank.bankName}</strong>
                        </div>
                        <div className={styles.bankInfoRow}>
                          <span>Số tài khoản</span>
                          <strong>{adminBank.accountNo}</strong>
                        </div>
                        <div className={styles.bankInfoRow}>
                          <span>Chủ tài khoản</span>
                          <strong>{adminBank.accountName}</strong>
                        </div>
                        <div className={styles.bankInfoRow}>
                          <span>Số tiền</span>
                          <strong className={styles.bankInfoAmount}>{formatCurrency(cartTotalPrice)}</strong>
                        </div>
                        <div className={styles.bankInfoRow}>
                          <span>Nội dung CK</span>
                          <strong className={styles.bankInfoContent}>{addInfo}</strong>
                        </div>
                      </div>
                      <p className={styles.bankingNote}>
                        ⚠️ Vui lòng nhập <strong>đúng nội dung chuyển khoản</strong> để hệ thống tự động xác nhận gói của bạn.
                      </p>
                    </div>
                    {paymentError && <p style={{ color: '#dc2626', fontWeight: 700, marginTop: 10 }}>{paymentError}</p>}
                    <button
                      type="button"
                      className={styles.btnCheckout}
                      disabled={paymentSubmitting}
                      onClick={() => handleConfirmPayment('banking')}
                    >
                      {paymentSubmitting ? 'Đang gửi...' : '✓ Tôi đã chuyển khoản'}
                    </button>
                  </div>
                )
              })() : payStep === 'pending' ? (() => {
                const method = PAYMENT_METHODS.find(m => m.id === payMethod)
                const addInfo = slugifyVietnamese(currentUser?.name) + cartTotalPrice
                const qrUrl = `https://img.vietqr.io/image/${adminBank.bankId}-${adminBank.accountNo}-compact2.png?amount=${cartTotalPrice}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(adminBank.accountName)}`
                return (
                  <div className={styles.bankingStep}>
                    <div className={styles.modalHeader}>
                      <button className={styles.bankingBack} onClick={() => setPayStep('choose')}>← Quay lại</button>
                      <div className={styles.cartEyebrowLine}>
                        <span className={styles.cartEyebrowDash} />
                        <span className={styles.cartEyebrowText}>XÁC NHẬN THANH TOÁN</span>
                      </div>
                      <h3 className={styles.modalTitle}>Thanh toán qua {method?.name}</h3>
                      {cartPlanData && (
                        <p className={styles.modalSub}>
                          {cartPlanData.name} · {cartQty} tháng · <strong>{formatCurrency(cartTotalPrice)}</strong>
                        </p>
                      )}
                    </div>
                    <div className={styles.bankingBody}>
                      <div className={styles.qrWrap}>
                        <img src={qrUrl} alt="QR thanh toán" className={styles.qrImg} />
                      </div>
                      <div className={styles.bankInfoTable}>
                        <div className={styles.bankInfoRow}>
                          <span>Ngân hàng</span>
                          <strong>{adminBank.bankName}</strong>
                        </div>
                        <div className={styles.bankInfoRow}>
                          <span>Số tài khoản</span>
                          <strong>{adminBank.accountNo}</strong>
                        </div>
                        <div className={styles.bankInfoRow}>
                          <span>Chủ tài khoản</span>
                          <strong>{adminBank.accountName}</strong>
                        </div>
                        <div className={styles.bankInfoRow}>
                          <span>Số tiền</span>
                          <strong className={styles.bankInfoAmount}>{formatCurrency(cartTotalPrice)}</strong>
                        </div>
                        <div className={styles.bankInfoRow}>
                          <span>Nội dung CK</span>
                          <strong className={styles.bankInfoContent}>{addInfo}</strong>
                        </div>
                      </div>
                      <p className={styles.bankingNote}>
                        ⚠️ Vui lòng nhập <strong>đúng nội dung chuyển khoản</strong> để hệ thống tự động xác nhận gói của bạn.
                      </p>
                    </div>
                    {paymentError && <p style={{ color: '#dc2626', fontWeight: 700, marginTop: 10 }}>{paymentError}</p>}
                    <button
                      type="button"
                      className={styles.btnCheckout}
                      disabled={paymentSubmitting}
                      onClick={() => handleConfirmPayment(payMethod)}
                    >
                      {paymentSubmitting ? 'Đang gửi...' : '✓ Tôi đã thanh toán'}
                    </button>
                  </div>
                )
              })() : payStep === 'waiting' ? (
              <div className={styles.payDone}>
                <div className={styles.payWaitIcon}>⏳</div>
                <h3 className={styles.payDoneTitle}>Chờ admin duyệt!</h3>
                <p className={styles.payDoneSub}>
                  Đơn đặt gói <strong>{cartPlanData?.name || 'của bạn'}</strong> đã được gửi thành công.<br />
                  Admin sẽ xem xét và kích hoạt gói cho bạn trong thời gian sớm nhất.
                </p>
                <button className={styles.btnCheckout} onClick={() => setShowPayModal(false)}>
                  Đóng
                </button>
              </div>
            ) : payStep === 'done' ? (
              <div className={styles.payDone}>
                <div className={styles.payDoneIcon}>✓</div>
                <h3 className={styles.payDoneTitle}>Đặt hàng thành công!</h3>
                <p className={styles.payDoneSub}>
                  Gói <strong>{cartPlanData?.name}</strong> đã được xử lý.{' '}
                  Hệ thống sẽ kích hoạt gói trong vài phút.
                </p>
                <button className={styles.btnCheckout} onClick={() => setShowPayModal(false)}>
                  Đóng
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}