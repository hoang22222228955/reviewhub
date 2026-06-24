import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/context/AuthContext'
import { fetchReviews } from '../../../services/reviewService'
import { formatDateTime } from '../../../shared/lib/format'
import api from '../../../services/api'
import styles from './PartnerReviewQueryPage.module.css'
import PartnerReviewAIInsight from './PartnerReviewAIInsight'

const PARTNER_NAME_MAP = {
  'PT-001': 'VeXeNhanh',
  'PT-002': 'FUTA',
  'PT-003': 'An Vui',
}


const VISIBILITY_STORAGE_KEY = 'partner-review-visibility-overrides'
const PUBLIC_REVIEW_STORAGE_KEY = 'reviewhub-public-service-reviews'
const PUBLIC_REVIEW_STORAGE_SLUGS = [
  'nha-xe',
  'khach-san',
  'may-bay',
  'tau-hoa',
  'tour',
  'dich-vu-khac',
]

function readPublicServiceReviews() {
  if (typeof window === 'undefined') return []

  const readKey = (key) => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const keys = [
    PUBLIC_REVIEW_STORAGE_KEY,
    ...PUBLIC_REVIEW_STORAGE_SLUGS.map((slug) => `${PUBLIC_REVIEW_STORAGE_KEY}:${slug}`),
  ]

  const map = new Map()

  keys.forEach((key) => {
    readKey(key).forEach((review) => {
      const stableKey = String(
        review.id ||
        review.reviewId ||
        `${review.targetCode || review.operatorCode || review.partnerCode || review.code || 'UNKNOWN'}-${review.targetName || review.operatorName || review.partnerName || review.name || ''}-${review.reviewerName || review.userName || review.authorName || review.customerName || ''}-${review.createdAt || review.created_at || ''}-${review.comment || review.content || review.reviewText || review.text || ''}`
      )
      if (!map.has(stableKey)) {
        map.set(stableKey, {
          ...review,
          __fromPublicServiceHub: true,
        })
      }
    })
  })

  return Array.from(map.values())
}

function normalizePublicServiceReview(review) {
  const targetCode = review.targetCode || review.target_code || review.operatorCode || review.operator_code || review.partnerCode || review.partner_code || review.ownerPartnerCode || review.owner_partner_code || review.code || 'UNKNOWN'
  const targetName = review.targetName || review.target_name || review.operatorName || review.operator_name || review.partnerName || review.partner_name || review.name || 'Không rõ đối tượng'

  return {
    ...review,
    id: review.id || review.reviewId || review.review_id || `PUBLIC-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    serviceSlug: review.serviceSlug || review.service_slug || review.targetSlug || review.target_slug || '',
    targetName,
    targetCode,
    operatorCode: review.operatorCode || review.operator_code || targetCode,
    partnerCode: review.partnerCode || review.partner_code || targetCode,
    partnerName: review.partnerName || review.partner_name || targetName || 'Public',
    sourceSystem: review.sourceSystem || review.source || 'partner-web',
    visibility: review.visibility || 'public',
    moderationStatus: review.moderationStatus || review.status || review.reviewStatus || 'pending',
    category: review.category || review.serviceCategory || review.service_category || 'Nhà xe',
    reviewerName: review.reviewerName || review.userName || review.authorName || review.customerName || 'Hành khách ẩn danh',
    comment: review.comment || review.content || review.reviewText || review.text || '',
    rating: Number(review.rating || review.score || review.stars || 0),
    createdAt: review.createdAt || review.created_at || new Date().toISOString(),
    __fromPublicServiceHub: Boolean(review.__fromPublicServiceHub),
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function splitAssignedValues(value) {
  return String(value || '')
    .split(/[|,;]+/)
    .map(normalizeText)
    .filter(Boolean)
}

function reviewMatchesAssignedPartner(review, currentUser) {
  const assignedCodes = splitAssignedValues(currentUser?.assignedOperatorCode)
  const assignedNames = splitAssignedValues(
    currentUser?.assignedOperatorName ||
    currentUser?.orgName ||
    currentUser?.businessName ||
    currentUser?.name
  )

  if (!assignedCodes.length && !assignedNames.length) return true

  const codes = [
    review.targetCode,
    review.target_code,
    review.operatorCode,
    review.operator_code,
    review.partnerCode,
    review.partner_code,
    review.ownerPartnerCode,
    review.owner_partner_code,
    review.code,
  ].map(normalizeText).filter(Boolean)

  const names = [
    review.targetName,
    review.target_name,
    review.operatorName,
    review.operator_name,
    review.partnerName,
    review.partner_name,
    review.name,
  ].map(normalizeText).filter(Boolean)

  const codeMatches = assignedCodes.length > 0 && codes.some((code) => assignedCodes.includes(code))
  const nameMatches = assignedNames.length > 0 && names.some((name) => assignedNames.includes(name))

  // Khi tài khoản mua gói tự chọn nhiều dịch vụ, assignedOperatorCode có dạng:
  // PT-001,PT-002 hoặc KS-004|PT-040. Chỉ cần review thuộc một mã đã mua là được hiển thị.
  if (assignedCodes.length && codes.length) return codeMatches
  if (assignedNames.length && names.length) return nameMatches

  return false
}

function mergeUniqueReviews(reviews) {
  const map = new Map()
  reviews.forEach((review) => {
    const normalized = applyVisibilityOverride(normalizePublicServiceReview(review))
    const key = normalized.id || `${normalized.targetCode}-${normalized.reviewerName}-${normalized.createdAt}-${normalized.comment}`
    if (!map.has(key)) map.set(key, normalized)
  })
  return Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
}


function readVisibilityOverrides() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(VISIBILITY_STORAGE_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

function writeVisibilityOverride(reviewId, visibility) {
  if (typeof window === 'undefined') return
  const overrides = readVisibilityOverrides()
  overrides[reviewId] = visibility
  window.localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(overrides))
}

function applyVisibilityOverride(review) {
  const overrides = readVisibilityOverrides()
  return {
    ...review,
    visibility: overrides[review.id] || review.visibility || 'public',
  }
}

async function persistVisibilityRemote(reviewId, visibility) {
  const candidates = [
    { method: 'patch', url: `/api/reviews/${reviewId}/visibility`, data: { visibility } },
    { method: 'put', url: `/api/reviews/${reviewId}/visibility`, data: { visibility } },
    { method: 'patch', url: `/api/partner/reviews/${reviewId}/visibility`, data: { visibility } },
    { method: 'put', url: `/api/partner/reviews/${reviewId}/visibility`, data: { visibility } },
    { method: 'patch', url: `/api/reviews/${reviewId}`, data: { visibility } },
  ]

  let lastError = null
  for (const candidate of candidates) {
    try {
      await api[candidate.method](candidate.url, candidate.data)
      return true
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

const PAGE_SIZE = 10
const PARTNER_REVIEW_AI_CONTEXT_KEY = 'reviewhub-partner-review-ai-context'

function getPartnerAIUserKey(currentUser) {
  return [
    currentUser?.id,
    currentUser?.email,
    currentUser?.assignedOperatorCode,
    currentUser?.currentPlanId,
  ]
    .filter(Boolean)
    .map((item) => String(item).trim())
    .join('|') || 'anonymous'
}

function getPartnerReviewAIContextKey(currentUser) {
  return `${PARTNER_REVIEW_AI_CONTEXT_KEY}:${getPartnerAIUserKey(currentUser)}`
}

function getAverageRating(items) {
  if (!items.length) return 0
  return items.reduce((sum, item) => sum + Number(item.rating || 0), 0) / items.length
}

function getRatingLabel(avg) {
  if (avg >= 4.5) return 'Xuất sắc'
  if (avg >= 4) return 'Rất tốt'
  if (avg >= 3) return 'Ổn định'
  return 'Cần cải thiện'
}

function getTone(status) {
  const value = String(status || '').trim().toLowerCase()
  if (value === 'approved') return 'success'
  if (value === 'flagged' || value === 'pending' || value === 'pending_review') return 'warning'
  return 'danger'
}

function getReviewModerationStatus(review) {
  return String(
    review?.moderationStatus ||
    review?.reviewStatus ||
    review?.review_status ||
    review?.status ||
    ''
  ).trim().toLowerCase()
}

function isRejectedForPartnerView(review) {
  const status = getReviewModerationStatus(review)
  return status === 'rejected' || status === 'reject' || status === 'declined' || status === 'refused'
}

function isPublicServiceHubReview(review) {
  if (review?.__fromPublicServiceHub) return true

  const source = normalizeSource(review?.sourceSystem || review?.source)
  return [
    'service-public',
    'public-service',
    'public-review',
    'public-web',
    'user-web',
    'community-web',
    'customer-web',
    'homepage',
    'home-page',
    'service-operator',
  ].includes(source)
}

function isApprovedForPartnerView(review) {
  if (isRejectedForPartnerView(review)) return false

  // Review khách gửi từ trang chủ phải qua SLA.
  // Pending sẽ nằm ở SLA, chưa cộng vào các chỉ số PartnerReviewQueryPage.
  if (isPublicServiceHubReview(review)) {
    return getReviewModerationStatus(review) === 'approved'
  }

  // Review cũ/API khác vẫn giữ hiển thị như trước.
  return true
}

function normalizeSource(value) {
  const source = String(value || '').trim().toLowerCase()
  if (source === 'partner' || source === 'partner_web' || source === 'partner-web') return 'partner-web'
  if (source === 'public' || source === 'public_web' || source === 'public-web' || source === 'user-web' || source === 'community-web' || source === 'customer-web') return 'public-web'
  if (source === 'google' || source === 'google_maps' || source === 'google-maps') return 'google-maps'
  if (source === 'vexere') return 'public-web'
  return source || 'unknown'
}

function getSourceLabel(value) {
  const source = normalizeSource(value)
  if (source === 'partner-web') return 'Partner'
  if (source === 'public-web') return 'Người dùng'
  if (source === 'google-maps') return 'Google'
  if (source === 'vexere') return 'Người dùng'
  return 'Không rõ'
}

function getSourceIcon(value) {
  const source = normalizeSource(value)
  if (source === 'partner-web') return 'Partner'
  if (source === 'public-web') return 'Người dùng'
  if (source === 'google-maps') return 'Google'
  if (source === 'vexere') return 'Người dùng'
  return 'Nguồn'
}

function clampPage(page, totalPages) {
  return Math.max(1, Math.min(page, totalPages))
}

function getPaginationItems(currentPage, totalPages) {
  const total = Number(totalPages) || 1
  const current = clampPage(Number(currentPage) || 1, total)

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'end-ellipsis', total]
  }

  if (current >= total - 3) {
    return [1, 'start-ellipsis', total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, 'start-ellipsis', current - 1, current, current + 1, 'end-ellipsis', total]
}

function makeStars(value) {
  const rounded = Math.round(Number(value || 0))
  return Array.from({ length: 5 }, (_, index) => (index < rounded ? '★' : '☆')).join('')
}

function makeInitials(value) {
  return String(value || 'P')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function getAvatarTone(item) {
  const key = String(item.id || item.targetCode || item.partnerName || item.operatorCode || '')
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash + key.charCodeAt(index) * (index + 1)) % 6
  }
  return `avatar${hash}`
}

function DashboardIcon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  }

  if (name === 'reviews') {
    return (
      <svg {...common}>
        <path d="M7.5 8.5h9" />
        <path d="M7.5 12h5.5" />
        <path d="M8 19.5 4.8 21V6.2A3.2 3.2 0 0 1 8 3h8a3.2 3.2 0 0 1 3.2 3.2v7.6A3.2 3.2 0 0 1 16 17H9.7L8 19.5Z" />
      </svg>
    )
  }

  if (name === 'visible') {
    return (
      <svg {...common}>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </svg>
    )
  }

  if (name === 'public') {
    return (
      <svg {...common}>
        <path d="M12 3.5 14.7 9l6.1.9-4.4 4.3 1 6.1L12 17.4l-5.4 2.9 1-6.1L3.2 9.9 9.3 9 12 3.5Z" />
      </svg>
    )
  }

  if (name === 'private') {
    return (
      <svg {...common}>
        <rect x="5" y="10" width="14" height="10" rx="2.5" />
        <path d="M8.5 10V7.6a3.5 3.5 0 0 1 7 0V10" />
        <path d="M12 14.2v2.2" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  )
}

function DetailIcon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  }

  const icons = {
    id: (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    ),
    target: (
      <svg {...common}>
        <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
    ),
    code: (
      <svg {...common}>
        <path d="m8 8-4 4 4 4" />
        <path d="m16 8 4 4-4 4" />
        <path d="m14 5-4 14" />
      </svg>
    ),
    partner: (
      <svg {...common}>
        <path d="M16 11a4 4 0 1 0-8 0" />
        <path d="M4 20a8 8 0 0 1 16 0" />
        <path d="M18 6.5h3M19.5 5v3" />
      </svg>
    ),
    user: (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      </svg>
    ),
    rating: (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M12 3.7 14.5 8.8l5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8L12 3.7Z" />
      </svg>
    ),
    visibility: (
      <svg {...common}>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.7" />
      </svg>
    ),
    moderation: (
      <svg {...common}>
        <path d="M20 7 10 17l-5-5" />
        <path d="M12 22a10 10 0 1 0-9.5-13" />
      </svg>
    ),
    calendar: (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    ),
    refresh: (
      <svg {...common}>
        <path d="M20 12a8 8 0 0 1-13.7 5.7" />
        <path d="M4 12A8 8 0 0 1 17.7 6.3" />
        <path d="M17.7 3.7v2.6h-2.6" />
        <path d="M6.3 20.3v-2.6h2.6" />
      </svg>
    ),
    link: (
      <svg {...common}>
        <path d="M10 13.5a4 4 0 0 0 5.7 0l2.2-2.2a4 4 0 0 0-5.7-5.7L11 6.8" />
        <path d="M14 10.5a4 4 0 0 0-5.7 0l-2.2 2.2a4 4 0 0 0 5.7 5.7L13 17.2" />
      </svg>
    ),
  }

  return icons[name] || icons.id
}

function escapeExcel(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function SparkLine({ tone = 'violet' }) {
  return (
    <svg className={`${styles.sparkLine} ${styles[tone]}`} viewBox="0 0 120 46" aria-hidden="true">
      <path d="M4 34 C15 25 22 31 31 20 C41 8 50 31 61 21 C72 11 79 37 91 20 C101 8 108 20 116 10" />
      <path className={styles.sparkArea} d="M4 34 C15 25 22 31 31 20 C41 8 50 31 61 21 C72 11 79 37 91 20 C101 8 108 20 116 10 L116 46 L4 46 Z" />
    </svg>
  )
}


function makePartnerAIReviewPayload(item) {
  return {
    id: item.id || '',
    targetName: item.targetName || '',
    targetCode: item.targetCode || '',
    partnerName: item.partnerName || '',
    reviewerName: item.reviewerName || '',
    comment: item.comment || '',
    rating: Number(item.rating || 0),
    sourceSystem: item.sourceSystem || '',
    visibility: item.visibility || '',
    moderationStatus: item.moderationStatus || '',
    createdAt: item.createdAt || '',
  }
}


function padReviewImageNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return ''
  return String(Math.trunc(number))
}

function normalizeReviewCode(value) {
  return String(value || '').trim().toUpperCase()
}

function getReviewImageCategorySlug(review) {
  const code = normalizeReviewCode(
    review?.targetCode ||
    review?.target_code ||
    review?.operatorCode ||
    review?.operator_code ||
    review?.partnerCode ||
    review?.partner_code ||
    review?.ownerPartnerCode ||
    review?.owner_partner_code ||
    review?.code
  )

  if (code.startsWith('PT-') || code.startsWith('BUS-')) return 'nhaxe'
  if (code.startsWith('KS-') || code.startsWith('HOTEL-')) return 'khachsan'
  if (code.startsWith('MB-') || code.startsWith('AIR-')) return 'maybay'
  if (code.startsWith('TH-') || code.startsWith('TRAIN-')) return 'tauhoa'
  if (code.startsWith('TO-') || code.startsWith('TOUR-')) return 'tour'
  if (code.startsWith('DV-') || code.startsWith('SERVICE-')) return 'dichvukhac'

  const category = normalizeText(review?.category || review?.serviceCategory || review?.service_category)

  if (category.includes('khach san') || category.includes('hotel')) return 'khachsan'
  if (category.includes('may bay') || category.includes('hang bay')) return 'maybay'
  if (category.includes('tau hoa')) return 'tauhoa'
  if (category.includes('tour')) return 'tour'
  if (category.includes('dich vu')) return 'dichvukhac'

  return 'nhaxe'
}

function getReviewImageOperatorCode(review) {
  const candidates = [
    review?.targetCode,
    review?.target_code,
    review?.operatorCode,
    review?.operator_code,
    review?.partnerCode,
    review?.partner_code,
    review?.ownerPartnerCode,
    review?.owner_partner_code,
    review?.code,
  ]
    .map(normalizeReviewCode)
    .filter(Boolean)

  for (const code of candidates) {
    const direct = code.match(/^(PT|KS|MB|TH|TO|DV)-\d{3}$/)
    if (direct) return code

    const bus = code.match(/^BUS-(\d{3})-/)
    if (bus) return `PT-${bus[1]}`

    const hotel = code.match(/^HOTEL-(\d{3})-/)
    if (hotel) return `KS-${hotel[1]}`

    const air = code.match(/^AIR-(\d{3})-/)
    if (air) return `MB-${air[1]}`

    const train = code.match(/^TRAIN-(\d{3})-/)
    if (train) return `TH-${train[1]}`

    const tour = code.match(/^TOUR-(\d{3})-/)
    if (tour) return `TO-${tour[1]}`

    const service = code.match(/^SERVICE-(\d{3})-/)
    if (service) return `DV-${service[1]}`
  }

  return ''
}

function getReviewImageIndex(review) {
  const explicit = review?.imageIndex || review?.reviewImageIndex || review?.photoIndex || review?.image_index || review?.review_image_index
  const explicitValue = padReviewImageNumber(explicit)
  if (explicitValue) return explicitValue

  const idCandidates = [review?.id, review?.reviewId, review?.review_id]
    .map((value) => String(value || '').trim())
    .filter(Boolean)

  for (const id of idCandidates) {
    const matched = id.match(/(?:^|[-_])(\d{1,6})$/)
    if (matched) {
      const value = padReviewImageNumber(matched[1])
      if (value) return value
    }
  }

  return ''
}

function getReviewImageToken(review) {
  const explicitFileName =
    review?.imageFileName ||
    review?.image_file_name ||
    review?.reviewImageFileName ||
    review?.review_image_file_name ||
    review?.photoFileName ||
    review?.photo_file_name

  if (explicitFileName) {
    const cleanFileName = String(explicitFileName).trim()
    return cleanFileName.replace(/\.[^.]+$/, '')
  }

  const idCandidates = [review?.id, review?.reviewId, review?.review_id]
    .map((value) => String(value || '').trim())
    .filter(Boolean)

  for (const id of idCandidates) {
    // Review mới có id dạng KS-003-E1930390 thì ảnh lưu là E1930390.webp.
    // Không đưa phần KS-003 vào tên file ảnh.
    const matched = id.match(/^(PT|KS|MB|TH|TO|DV)-\d{3}-(.+)$/i)
    if (matched?.[2]) {
      return matched[2].replace(/\.[^.]+$/, '')
    }
  }

  return ''
}

function getReviewImageInfo(review) {
  const directImage =
    review?.reviewImage ||
    review?.reviewImageUrl ||
    review?.imageUrl ||
    review?.photoUrl ||
    review?.publicPath ||
    review?.imagePath ||
    review?.review_image ||
    review?.review_image_url ||
    review?.image_url ||
    review?.photo_url ||
    review?.public_path ||
    review?.image_path

  if (directImage) {
    return {
      url: directImage,
      index: getReviewImageIndex(review),
      token: getReviewImageToken(review),
      operatorCode: getReviewImageOperatorCode(review),
      categorySlug: getReviewImageCategorySlug(review),
    }
  }

  const operatorCode = getReviewImageOperatorCode(review)
  const categorySlug = getReviewImageCategorySlug(review)
  const imageToken = getReviewImageToken(review)

  if (operatorCode && imageToken) {
    return {
      url: `/anhdanggia/${categorySlug}/${operatorCode}/${imageToken}.webp`,
      index: getReviewImageIndex(review),
      token: imageToken,
      operatorCode,
      categorySlug,
    }
  }

  const index = getReviewImageIndex(review)

  if (!operatorCode || !index) return null

  return {
    url: `/anhdanggia/${categorySlug}/${operatorCode}/${index}.webp`,
    index,
    operatorCode,
    categorySlug,
  }
}

function normalizeReviewImageList(value) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        return item?.url || item?.src || item?.imageUrl || item?.photoUrl || item?.path || ''
      })
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/[|,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function getReviewImageGallery(review) {
  const directImages = [
    review?.images,
    review?.imageUrls,
    review?.photoUrls,
    review?.reviewImages,
    review?.reviewImageUrls,
    review?.image_urls,
    review?.photo_urls,
    review?.review_images,
  ]
    .flatMap(normalizeReviewImageList)
    .filter(Boolean)

  if (directImages.length) {
    const operatorCode = getReviewImageOperatorCode(review)
    const categorySlug = getReviewImageCategorySlug(review)
    const baseIndex = getReviewImageIndex(review)

    return Array.from(new Set(directImages)).map((url, index) => ({
      url,
      index: index + 1,
      displayIndex: baseIndex || index + 1,
      operatorCode,
      categorySlug,
    }))
  }

  const single = getReviewImageInfo(review)
  return single?.url ? [{ ...single, displayIndex: single.index }] : []
}

function renderPartnerAIReport(text, styles) {
  return String(text || '')
    .split('\n')
    .map((line, index) => {
      const value = line.trim()

      if (!value) {
        return <br key={`br-${index}`} />
      }

      if (value.startsWith('# ')) {
        return <h3 key={`h3-${index}`}>{value.replace(/^#\s+/, '')}</h3>
      }

      if (value.startsWith('## ')) {
        return <h4 key={`h4-${index}`}>{value.replace(/^##\s+/, '')}</h4>
      }

      if (value.startsWith('- ')) {
        return (
          <p key={`li-${index}`} className={styles.partnerAiBullet}>
            • {value.replace(/^-\s+/, '')}
          </p>
        )
      }

      return <p key={`p-${index}`}>{value}</p>
    })
}


function ReviewSoftIcon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  }

  if (name === 'info') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 10.5v5" />
        <path d="M12 7.8h.01" />
      </svg>
    )
  }

  if (name === 'comment') {
    return (
      <svg {...common}>
        <path d="M7.5 17.8 4.7 20V7.2A3.2 3.2 0 0 1 7.9 4h8.2a3.2 3.2 0 0 1 3.2 3.2v5.9a3.2 3.2 0 0 1-3.2 3.2H9.8l-2.3 1.5Z" />
        <path d="M8.5 9h7" />
        <path d="M8.5 12.3h4.5" />
      </svg>
    )
  }

  if (name === 'image') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="m7.5 15.5 3.2-3.2 2.4 2.4 1.6-1.6 2.8 2.8" />
        <circle cx="15.5" cy="9.2" r="1.2" />
      </svg>
    )
  }

  if (name === 'star') {
    return (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M12 4.2 14.3 9l5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2L4.5 9.8 9.7 9 12 4.2Z" />
      </svg>
    )
  }

  if (name === 'positive') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.8 12.6 11 14.8l4.4-5.1" />
      </svg>
    )
  }

  if (name === 'code') {
    return (
      <svg {...common}>
        <path d="m9 8-4 4 4 4" />
        <path d="m15 8 4 4-4 4" />
        <path d="m13.5 5-3 14" />
      </svg>
    )
  }

  return null
}


export default function PartnerReviewQueryPage() {
  const { currentUser } = useAuth()
  const [filters, setFilters] = useState({
    keyword: '',
    category: 'all',
    visibility: 'all',
    sourceSystem: 'all',
  })
  const [selectedReviewId, setSelectedReviewId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [currentPage, setCurrentPage] = useState(1)
  const [allowedReviews, setAllowedReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [openVisibilityId, setOpenVisibilityId] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [aiReport, setAiReport] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [hiddenReviewImages, setHiddenReviewImages] = useState({})
  const [activeReviewImageIndex, setActiveReviewImageIndex] = useState(0)
  const [slaRefreshTick, setSlaRefreshTick] = useState(0)

  useEffect(() => {
    const refreshAfterSlaModeration = () => {
      setSlaRefreshTick((value) => value + 1)
    }

    window.addEventListener('storage', refreshAfterSlaModeration)
    window.addEventListener('reviewhub:sla-review-moderated', refreshAfterSlaModeration)
    window.addEventListener('reviewhub:public-review-created', refreshAfterSlaModeration)

    return () => {
      window.removeEventListener('storage', refreshAfterSlaModeration)
      window.removeEventListener('reviewhub:sla-review-moderated', refreshAfterSlaModeration)
      window.removeEventListener('reviewhub:public-review-created', refreshAfterSlaModeration)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchReviews({
      keyword: filters.keyword,
      category: filters.category,
      visibility: filters.visibility,
      sourceSystem: 'all',
      size: 1000,
    })
      .then((data) => {
        const apiList = Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
            ? data.content
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.reviews)
                ? data.reviews
                : []

        const apiReviews = apiList.map((review) =>
          applyVisibilityOverride({
            ...review,
            partnerName:
              review.partnerName ||
              review.partner_name ||
              PARTNER_NAME_MAP[review.operatorCode || review.operator_code || review.targetCode || review.target_code] ||
              review.operatorName ||
              review.operator_name ||
              review.targetName ||
              review.target_name ||
              currentUser?.orgName ||
              'Đối tác',
          })
        )
        const publicServiceReviews = readPublicServiceReviews().map(normalizePublicServiceReview)
        const merged = mergeUniqueReviews([...publicServiceReviews, ...apiReviews])
          .filter((review) => reviewMatchesAssignedPartner(review, currentUser))
          .filter(isApprovedForPartnerView)
        setAllowedReviews(merged)
      })
      .catch(() => {
        const publicServiceReviews = readPublicServiceReviews().map(normalizePublicServiceReview)
        setAllowedReviews(
          mergeUniqueReviews(publicServiceReviews)
            .filter((review) => reviewMatchesAssignedPartner(review, currentUser))
            .filter(isApprovedForPartnerView)
        )
      })
      .finally(() => setLoading(false))
  }, [filters.keyword, filters.category, filters.visibility, currentUser, slaRefreshTick])

  const filtered = useMemo(() => {
    const keyword = filters.keyword.toLowerCase().trim()

    return allowedReviews.filter((item) => {
      const text = [
        item.id,
        item.targetName,
        item.targetCode,
        item.comment,
        item.partnerName,
        item.reviewerName,
        item.category,
        item.sourceSystem,
        getSourceLabel(item.sourceSystem),
        item.visibility,
        item.moderationStatus,
      ]
        .join(' ')
        .toLowerCase()

      const matchesKeyword = !keyword || text.includes(keyword)
      const matchesCategory = filters.category === 'all' || item.category === filters.category
      const matchesVisibility = filters.visibility === 'all' || item.visibility === filters.visibility
      const matchesSource = filters.sourceSystem === 'all' || normalizeSource(item.sourceSystem) === filters.sourceSystem

      return isApprovedForPartnerView(item) && matchesKeyword && matchesCategory && matchesVisibility && matchesSource
    })
  }, [allowedReviews, filters])


  useEffect(() => {
    if (typeof window === 'undefined') return

    const payload = {
      version: 4,
      userKey: getPartnerAIUserKey(currentUser),
      updatedAt: Date.now(),
      filters: {
        keyword: filters.keyword,
        category: filters.category,
        visibility: filters.visibility,
        sourceSystem: filters.sourceSystem,
      },
      currentUser: {
        id: currentUser?.id || '',
        email: currentUser?.email || '',
        currentPlanId: currentUser?.currentPlanId || '',
        membershipLabel: currentUser?.membershipLabel || '',
        assignedOperatorCode: currentUser?.assignedOperatorCode || '',
        assignedOperatorName: currentUser?.assignedOperatorName || '',
        orgName: currentUser?.orgName || '',
      },
      totalReviews: filtered.length,
      reviews: filtered
        .slice(0, 1000)
        .map(makePartnerAIReviewPayload),
      aiReport: aiReport || '',
    }

    window.__reviewhubPartnerReviewAIContext = payload

    try {
      window.localStorage.setItem(getPartnerReviewAIContextKey(currentUser), JSON.stringify(payload))
      window.localStorage.removeItem(PARTNER_REVIEW_AI_CONTEXT_KEY)
    } catch {}
  }, [
    filtered,
    filters.keyword,
    filters.category,
    filters.visibility,
    filters.sourceSystem,
    aiReport,
    currentUser?.id,
    currentUser?.email,
    currentUser?.currentPlanId,
    currentUser?.membershipLabel,
    currentUser?.assignedOperatorCode,
    currentUser?.assignedOperatorName,
    currentUser?.orgName,
  ])

  useEffect(() => {
    setAiReport('')
    setAiError('')
  }, [filters.keyword, filters.category, filters.visibility, filters.sourceSystem])

  const stats = useMemo(() => {
    const partnerVisibleReviews = allowedReviews.filter(isApprovedForPartnerView)
    const filteredPartnerVisible = filtered.filter(isApprovedForPartnerView)

    const publicShared = partnerVisibleReviews.filter((item) => item.visibility === 'public').length
    const privateMine = partnerVisibleReviews.filter((item) => item.visibility === 'private').length
    const good = filteredPartnerVisible.filter((item) => Number(item.rating) >= 4).length
    const bad = filteredPartnerVisible.filter((item) => Number(item.rating) <= 2).length
    const average = getAverageRating(filteredPartnerVisible)

    return {
      totalAllowed: partnerVisibleReviews.length,
      visibleNow: filteredPartnerVisible.length,
      publicShared,
      privateMine,
      good,
      bad,
      average,
      averagePercent: Math.max(0, Math.min(100, (average / 5) * 100)),
      averageLabel: getRatingLabel(average),
    }
  }, [allowedReviews, filtered])

  const ratingBreakdown = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    filtered.forEach((item) => {
      const rating = Math.round(Number(item.rating) || 0)
      if (counts[rating] !== undefined) counts[rating] += 1
    })

    const total = Math.max(filtered.length, 1)
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star],
      percent: (counts[star] / total) * 100,
    }))
  }, [filtered])

  const latestUpdatedAt = useMemo(() => {
    if (!filtered.length) return null
    return filtered.reduce((latest, item) => {
      const currentTime = new Date(item.createdAt).getTime()
      const latestTime = latest ? new Date(latest).getTime() : 0
      return currentTime > latestTime ? item.createdAt : latest
    }, null)
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safeCurrentPage = clampPage(currentPage, totalPages)
  const startIndex = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1
  const endIndex = filtered.length === 0 ? 0 : Math.min(safeCurrentPage * PAGE_SIZE, filtered.length)
  const paginationItems = useMemo(
    () => getPaginationItems(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages]
  )

  const currentItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safeCurrentPage])

  const selectedReview = filtered.find((item) => item.id === selectedReviewId) || null
  const selectedReviewImages = selectedReview
    ? getReviewImageGallery(selectedReview).filter((item) => item.url && !hiddenReviewImages[item.url])
    : []
  const activeReviewImage = selectedReviewImages[activeReviewImageIndex] || selectedReviewImages[0] || null
  const activeReviewImageUrl = activeReviewImage?.url || ''
  const shouldShowReviewImage = Boolean(activeReviewImageUrl)
  const isSingleReviewImage = selectedReviewImages.length === 1
  const hasMultipleReviewImages = selectedReviewImages.length > 1

  useEffect(() => {
    setActiveReviewImageIndex(0)
  }, [selectedReviewId])

  const handlePrevReviewImage = () => {
    if (!selectedReviewImages.length) return
    setActiveReviewImageIndex((prev) => (prev <= 0 ? selectedReviewImages.length - 1 : prev - 1))
  }

  const handleNextReviewImage = () => {
    if (!selectedReviewImages.length) return
    setActiveReviewImageIndex((prev) => (prev >= selectedReviewImages.length - 1 ? 0 : prev + 1))
  }

  const handleSyncReviews = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await api.post('/api/partner/sync-reviews')
      const { message } = res.data
      setSyncResult({ ok: true, message: message || 'Đồng bộ thành công!' })
      // Làm mới danh sách review sau khi sync
      setFilters((prev) => ({ ...prev }))
    } catch (err) {
      const msg = err?.response?.data?.message || 'Lỗi khi đồng bộ review. Vui lòng thử lại.'
      setSyncResult({ ok: false, message: msg })
    } finally {
      setSyncing(false)
    }
  }



  const handleAnalyzePartnerAI = async () => {
    if (aiLoading) return

    if (!filtered.length) {
      setAiError('Chưa có review phù hợp để AI phân tích.')
      return
    }

    setAiLoading(true)
    setAiError('')
    setAiReport('')

    try {
      const payloadReviews = filtered
        .slice(0, 1000)
        .map(makePartnerAIReviewPayload)

      const res = await api.post(
        '/api/partner/review-ai/insight',
        {
          keyword: filters.keyword,
          category: filters.category,
          visibility: filters.visibility,
          sourceSystem: filters.sourceSystem,
          totalReviews: filtered.length,
          reviews: payloadReviews,
        },
        {
          timeout: 120000,
        }
      )

      setAiReport(res.data?.report || 'AI chưa trả về nội dung báo cáo.')
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Lỗi khi AI phân tích review.'

      setAiError(msg)
    } finally {
      setAiLoading(false)
    }
  }


const handleRefreshPartnerAI = () => {
  if (aiLoading || filtered.length === 0) {
    setAiError(filtered.length === 0 ? 'Chưa có review phù hợp để AI phân tích.' : '')
    return
  }

  handleAnalyzePartnerAI()
}

const handleExportExcel = () => {

    const columns = [
      'Mã review',
      'Đối tượng',
      'Mã đối tượng',
      'Partner gửi',
      'Nguồn',
      'Điểm',
      'Hiển thị',
      'Moderation',
      'Người gửi',
      'Thời gian tạo',
      'Nội dung',
    ]

    const rows = filtered.map((item) => [
      item.id,
      item.targetName || 'Không rõ đối tượng',
      item.targetCode || 'UNKNOWN',
      item.partnerName || '',
      getSourceLabel(item.sourceSystem),
      `${Number(item.rating || 0)}/5`,
      item.visibility || '',
      item.moderationStatus || 'pending',
      item.reviewerName || '',
      item.createdAt ? formatDateTime(item.createdAt) : '',
      item.comment || '',
    ])

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8" /></head>
        <body>
          <table border="1">
            <thead><tr>${columns.map((column) => `<th>${escapeExcel(column)}</th>`).join('')}</tr></thead>
            <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeExcel(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `partner-reviews-${today}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleChangeFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleOpenReview = (reviewId) => {
    setOpenVisibilityId(null)
    setSelectedReviewId(reviewId)
    setActiveTab('overview')
  }

  const toggleVisibility = (reviewId) => {
    setOpenVisibilityId((currentId) => (currentId === reviewId ? null : reviewId))
  }

  const updateVisibility = async (reviewId, nextVisibility) => {
    setAllowedReviews((prev) =>
      prev.map((item) =>
        item.id === reviewId ? { ...item, visibility: nextVisibility } : item
      )
    )
    writeVisibilityOverride(reviewId, nextVisibility)
    setOpenVisibilityId(null)

    try {
      await persistVisibilityRemote(reviewId, nextVisibility)
    } catch (error) {
      // Nếu backend chưa có API cập nhật visibility, localStorage vẫn giữ lựa chọn
      // để khi thoát ra vào lại giao diện không tự nhảy về public.
      setAllowedReviews((prev) =>
        prev.map((item) =>
          item.id === reviewId ? { ...item, visibility: nextVisibility } : item
        )
      )
      console.warn('Không thể đồng bộ visibility lên server, đã lưu tạm trên trình duyệt.', error)
    }
  }

  const handleCloseReview = () => setSelectedReviewId(null)

  useEffect(() => {
    if (!selectedReview) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedReviewId(null)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedReview])

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <span />
        Đang tải dữ liệu review...
      </div>
    )
  }

  if (!currentUser?.assignedOperatorCode) {
    return (
      <div className={styles.emptyAccessPage}>
        <div className={styles.emptyAccessCard}>
          <h3>Tài khoản chưa được gán nhà xe</h3>
          <p>Tài khoản của bạn chưa được admin gán nhà xe. Vui lòng liên hệ admin để được phân công trước khi tra cứu review.</p>
        </div>
      </div>
    )
  }

  const kpis = [
    { label: 'Review được phép xem', value: stats.totalAllowed, hint: 'Tăng khi SLA phê duyệt review mới', icon: 'reviews', tone: 'violet' },
    { label: 'Đang hiển thị', value: stats.visibleNow, hint: 'Tính theo bộ lọc hiện tại', icon: 'visible', tone: 'green' },
    { label: 'Public dùng chung', value: stats.publicShared, hint: 'Chỉ tính review public đã duyệt', icon: 'public', tone: 'blue' },
    { label: 'Private của tôi', value: stats.privateMine, hint: stats.privateMine ? 'Dữ liệu riêng đối tác' : 'Không có dữ liệu', icon: 'private', tone: 'orange' },
    { label: 'Cần theo dõi', value: stats.bad, hint: '-4.3% cần xử lý', icon: 'alert', tone: 'red' },
  ]

  return (
    <main className={styles.page}>
      <section className={styles.kpiGrid}>
        {kpis.map((item, index) => (
          <article key={item.label} className={`${styles.kpiCard} ${styles[item.tone]}`} style={{ animationDelay: `${index * 55}ms` }}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiIcon}><DashboardIcon name={item.icon} /></span>
              <div>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            </div>
            <small className={item.tone === 'red' ? styles.downHint : ''}>{item.hint}</small>
            <SparkLine tone={item.tone} />
          </article>
        ))}

</section>


<section className={styles.workspaceGrid}>

        <div className={styles.leftColumn}>
          <section className={styles.filterCard}>
            <div className={styles.sectionTitleBlock}>
              <h2>Bộ lọc review</h2>
              <p>Tìm nhanh review theo từ khóa, danh mục, nguồn gửi và trạng thái hiển thị.</p>
            </div>

            <div className={styles.filterGrid}>
              <label className={`${styles.fieldGroup} ${styles.searchField}`}>
                <span>Từ khóa</span>
                <input
                  value={filters.keyword}
                  onChange={(event) => handleChangeFilter('keyword', event.target.value)}
                  placeholder="Tìm kiếm review..."
                />
              </label>

              <label className={styles.fieldGroup}>
                <span>Danh mục</span>
                <select value={filters.category} onChange={(event) => handleChangeFilter('category', event.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="Nhà xe">Nhà xe</option>
                  <option value="Khách sạn">Khách sạn</option>
                  <option value="Máy bay">Máy bay</option>
                  <option value="Tàu hỏa">Tàu hỏa</option>
                  <option value="Tour">Tour</option>
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span>Nguồn</span>
                <select value={filters.sourceSystem} onChange={(event) => handleChangeFilter('sourceSystem', event.target.value)}>
                  <option value="all">Tất cả nguồn</option>
                  <option value="public-web">Người dùng</option>
                  <option value="partner-web">Partner gửi</option>
                  <option value="google-maps">Google Maps</option>
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span>Hiển thị</span>
                <select value={filters.visibility} onChange={(event) => handleChangeFilter('visibility', event.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>
            </div>
          </section>

          <section className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <div>
                <h2>Danh sách review</h2>
                <p>{filtered.length ? `Tìm thấy ${filtered.length} review phù hợp.` : 'Không có review phù hợp.'}</p>
              </div>
              <button type="button" className={styles.exportBtn} onClick={handleExportExcel}>Xuất Excel</button>
            </div>

            <div className={styles.tableShell}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã review</th>
                    <th>Đối tượng</th>
                    <th>Partner gửi</th>
                    <th>Nguồn</th>
                    <th>Điểm</th>
                    <th>Hiển thị</th>
                    <th>Moderation</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.length ? currentItems.map((item) => {
                    const avatarTone = getAvatarTone(item)
                    const source = normalizeSource(item.sourceSystem)

                    return (
                      <tr key={item.id}>
                        <td><span className={styles.idBadge}>{item.id}</span></td>
                        <td>
                          <div className={styles.targetCell}>
                            <span className={`${styles.reviewAvatar} ${styles[avatarTone]}`}>{makeInitials(item.targetName || item.partnerName)}</span>
                            <div>
                              <strong>{item.targetName || 'Không rõ đối tượng'}</strong>
                              <small>{item.targetCode || 'UNKNOWN'}</small>
                            </div>
                          </div>
                        </td>
                        <td className={styles.partnerCell}>{item.partnerName}</td>
                        <td>
                          <span className={`${styles.sourceBadge} ${styles[source]}`}>
                            <i />{getSourceLabel(item.sourceSystem)}
                          </span>
                        </td>
                        <td>
                          <span className={styles.ratingBadge}>{Number(item.rating || 0).toFixed(0)}/5</span>
                        </td>
                        <td>
                          <div className={styles.visibilitySelectWrap}>
                            <button
                              type="button"
                              className={`${styles.visibilityBadge} ${item.visibility === 'public' ? styles.publicBadge : styles.privateBadge}`}
                              onClick={() => toggleVisibility(item.id)}
                              aria-haspopup="listbox"
                              aria-expanded={openVisibilityId === item.id}
                            >
                              <span>{item.visibility || 'public'}</span>
                              <svg className={styles.visibilityChevron} viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            {openVisibilityId === item.id && (
                              <div className={styles.visibilityDropdown} role="listbox">
                                <button type="button" onClick={() => updateVisibility(item.id, 'public')}>
                                  public
                                </button>
                                <button type="button" onClick={() => updateVisibility(item.id, 'private')}>
                                  private
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[getTone(item.moderationStatus)]}`}>
                            {item.moderationStatus || 'pending'}
                          </span>
                        </td>
                        <td className={styles.actionCell}>
                          <button type="button" className={styles.detailBtn} onClick={() => handleOpenReview(item.id)}>
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan="8" className={styles.emptyCell}>Không có review phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.tableFooter}>
              <span className={styles.paginationSummary}>
                Hiển thị {startIndex}–{endIndex} / {filtered.length} review
              </span>

              {totalPages > 1 && (
                <div className={styles.paginationWrap} aria-label="Phân trang review">
                  <button
                    type="button"
                    aria-label="Trang trước"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((prev) => clampPage(prev - 1, totalPages))}
                  >
                    ‹
                  </button>

                  {paginationItems.map((item) => (
                    typeof item === 'number' ? (
                      <button
                        key={item}
                        type="button"
                        className={safeCurrentPage === item ? styles.pageActive : ''}
                        aria-current={safeCurrentPage === item ? 'page' : undefined}
                        onClick={() => setCurrentPage(item)}
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={item} className={styles.paginationEllipsis}>…</span>
                    )
                  ))}

                  <button
                    type="button"
                    aria-label="Trang sau"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => clampPage(prev + 1, totalPages))}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.rightColumn}>
          <PartnerReviewAIInsight
            reviews={filtered}
            filters={filters}
            aiReport={aiReport}
            aiLoading={aiLoading}
            aiError={aiError}
            onAnalyze={handleAnalyzePartnerAI}
            onRefresh={handleRefreshPartnerAI}
          />

          <section className={styles.analyticsCard}>
            <div className={styles.sideHeader}>
              <div>
                <h3>Thống kê đánh giá</h3>
                <p>Tổng quan điểm chất lượng</p>
              </div>
              <select value={filters.sourceSystem} onChange={(event) => handleChangeFilter('sourceSystem', event.target.value)}>
                <option value="all">Tất cả nguồn</option>
                <option value="public-web">Người dùng</option>
                <option value="partner-web">Partner gửi</option>
                <option value="google-maps">Google Maps</option>
              </select>
            </div>

            <div className={styles.analyticsBody}>
              <div className={styles.donut} style={{ '--score': `${stats.averagePercent}%` }}>
                <div>
                  <strong>{stats.average.toFixed(1)}</strong>
                  <span>/5</span>
                  <small>Điểm trung bình</small>
                </div>
              </div>

              <div className={styles.breakdownList}>
                {ratingBreakdown.map((item) => (
                  <div key={item.star} className={styles.breakdownRow}>
                    <span>{item.star} sao</span>
                    <div><i style={{ width: `${item.percent}%` }} /></div>
                    <b>{item.count}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.summaryGrid}>
              <div><span>Tổng đánh giá</span><strong>{filtered.length}</strong></div>
              <div className={styles.goodBox}><span>Đánh giá tốt</span><strong>{stats.good}</strong></div>
              <div className={styles.badBox}><span>Cần theo dõi</span><strong>{stats.bad}</strong></div>
            </div>
          </section>

          <section className={styles.trustCard}>
            <div className={styles.trustIcon}>★</div>
            <div>
              <h3>Hệ thống đánh giá minh bạch</h3>
              <p>Dữ liệu được cập nhật theo quyền truy cập của đối tác, tách rõ public/private và hỗ trợ theo dõi chất lượng dịch vụ.</p>
            </div>
            <div className={styles.trustPills}>
              <span>Minh bạch</span>
              <span>Chính xác</span>
              <span>Công bằng</span>
            </div>
          </section>
        </aside>
      </section>

      {selectedReview && (
        <div className={styles.modalOverlay} onClick={handleCloseReview}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHeaderPro}>
              <button type="button" className={styles.modalBackBtn} onClick={handleCloseReview} aria-label="Quay lại">‹</button>

              <div className={styles.modalIdentity}>
                <div className={`${styles.modalAvatar} ${styles[getAvatarTone(selectedReview)]}`}>
                  {makeInitials(selectedReview.targetName || selectedReview.partnerName)}
                </div>
                <div className={styles.modalTitleArea}>
                  <span className={styles.modalEyebrow}>Chi tiết review</span>
                  <h3>{selectedReview.targetName || 'Không rõ đối tượng'}</h3>
                  <div className={styles.modalQuickMeta}>
                    <i className={styles.sourcePartner}>{getSourceLabel(selectedReview.sourceSystem)}</i>
                    <i className={getTone(selectedReview.moderationStatus) === 'success' ? styles.statusApproved : styles.statusPending}>
                      {selectedReview.moderationStatus || 'pending'}
                    </i>
                    <i className={styles.visibilityMeta}>{selectedReview.visibility || 'public'}</i>
                  </div>
                </div>
              </div>

              <button type="button" className={styles.modalCloseBtn} onClick={handleCloseReview} aria-label="Đóng popup">×</button>
            </div>

            <div className={styles.modalTabs}>
              <button type="button" className={activeTab === 'overview' ? styles.modalTabActive : ''} onClick={() => setActiveTab('overview')}>
                <span className={styles.modalTabIcon}><ReviewSoftIcon name="info" /></span>
                <span>Thông tin chung</span>
              </button>

              <button type="button" className={activeTab === 'content' ? styles.modalTabActive : ''} onClick={() => setActiveTab('content')}>
                <span className={styles.modalTabIcon}><ReviewSoftIcon name="comment" /></span>
                <span>Nội dung đánh giá</span>
              </button>

              <button type="button" className={activeTab === 'meta' ? styles.modalTabActive : ''} onClick={() => setActiveTab('meta')}>
                <span className={styles.modalTabIcon}><ReviewSoftIcon name="code" /></span>
                <span>Metadata / API</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              {activeTab === 'overview' && (
                <div className={styles.overviewTab}>
                  <h4 className={styles.modalSectionTitle}>Thông tin review</h4>
                  <div className={styles.detailGridPro}>
                    <div className={styles.detailCard}><span className={styles.detailIcon}><DetailIcon name="id" /></span><div><small>Mã review</small><strong>{selectedReview.id}</strong></div></div>
                    <div className={styles.detailCard}><span className={styles.detailIcon}><DetailIcon name="target" /></span><div><small>Đối tượng</small><strong>{selectedReview.targetName || 'Không rõ đối tượng'}</strong></div></div>
                    <div className={styles.detailCard}><span className={styles.detailIcon}><DetailIcon name="code" /></span><div><small>Mã đối tượng</small><strong>{selectedReview.targetCode || 'UNKNOWN'}</strong></div></div>
                    <div className={styles.detailCard}><span className={styles.detailIcon}><DetailIcon name="partner" /></span><div><small>Partner gửi</small><strong>{selectedReview.partnerName || 'Đối tác'}</strong></div></div>
                    <div className={styles.detailCard}><span className={styles.detailIcon}><DetailIcon name="user" /></span><div><small>Người gửi</small><strong>{selectedReview.reviewerName || 'Không rõ'}</strong></div></div>
                    <div className={styles.detailCard}><span className={`${styles.detailIcon} ${styles.starIcon}`}><DetailIcon name="rating" /></span><div><small>Điểm</small><strong>{selectedReview.rating || 0}/5</strong></div></div>
                    <div className={styles.detailCard}><span className={styles.detailIcon}><DetailIcon name="visibility" /></span><div><small>Hiển thị</small><strong>{selectedReview.visibility || 'public'}</strong></div></div>
                    <div className={styles.detailCard}><span className={`${styles.detailIcon} ${styles.checkIcon}`}><DetailIcon name="moderation" /></span><div><small>Moderation</small><strong>{selectedReview.moderationStatus || 'pending'}</strong></div></div>
                  </div>

                  <div className={styles.modalInfoStrip}>
                    <div><span><DetailIcon name="calendar" /></span><small>Thời gian tạo</small><strong>{selectedReview.createdAt ? formatDateTime(selectedReview.createdAt) : 'Chưa có'}</strong></div>
                    <div><span><DetailIcon name="refresh" /></span><small>Cập nhật lần cuối</small><strong>{selectedReview.createdAt ? formatDateTime(selectedReview.createdAt) : 'Chưa có'}</strong></div>
                    <div><span><DetailIcon name="link" /></span><small>Nguồn gửi</small><strong>{getSourceLabel(selectedReview.sourceSystem)} System</strong></div>
                  </div>
                </div>
              )}

              {activeTab === 'content' && (
                <div className={styles.contentTabPro}>
                  <section className={styles.reviewSummaryCard}>
                    <div className={styles.reviewSummaryMain}>
                      <span className={styles.reviewCardEyebrow}>Đánh giá tổng thể</span>
                      <div className={styles.reviewRatingRow}>
                        <strong>{selectedReview.rating || 0}</strong>
                        <span>/5 sao</span>
                      </div>
                      <div className={styles.reviewStarLine}>{makeStars(selectedReview.rating)}</div>
                    </div>

                    <b className={Number(selectedReview.rating || 0) >= 4 ? styles.positiveReviewBadge : styles.attentionReviewBadge}>
                      {Number(selectedReview.rating || 0) >= 4 ? '☺ Positive Review' : 'Needs Attention'}
                    </b>
                  </section>

                  <section className={styles.reviewCommentCardPro}>
                    <h4 className={styles.reviewSectionHeading}>
                      <span className={styles.reviewSectionIcon}><ReviewSoftIcon name="comment" /></span>
                      <span>Nội dung đánh giá</span>
                    </h4>
                    <p>{selectedReview.comment || 'Không có nội dung đánh giá.'}</p>
                  </section>

                  {shouldShowReviewImage && (
                    <section className={styles.reviewAttachmentCard}>
                      <div className={styles.reviewAttachmentHeader}>
                        <h4 className={styles.reviewSectionHeading}>
                          <span className={styles.reviewSectionIcon}><ReviewSoftIcon name="image" /></span>
                          <span>Hình ảnh đính kèm</span>
                        </h4>

                        {isSingleReviewImage ? (
                          <span className={styles.reviewImageBadge}>1 ảnh</span>
                        ) : (
                          <div className={styles.reviewImageControls}>
                            <span>Ảnh {activeReviewImageIndex + 1}/{selectedReviewImages.length}</span>
                            <button
                              type="button"
                              onClick={handlePrevReviewImage}
                              disabled={!hasMultipleReviewImages}
                              aria-label="Ảnh trước"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              onClick={handleNextReviewImage}
                              disabled={!hasMultipleReviewImages}
                              aria-label="Ảnh sau"
                            >
                              ›
                            </button>
                          </div>
                        )}
                      </div>

                      {isSingleReviewImage ? (
                        <button
                          type="button"
                          className={styles.reviewSingleImageButton}
                          onClick={() => window.open(activeReviewImageUrl, '_blank', 'noopener,noreferrer')}
                          aria-label={`Xem ảnh đánh giá số ${activeReviewImage?.displayIndex || activeReviewImage?.index || ''}`}
                        >
                          <img
                            src={activeReviewImageUrl}
                            alt={`Ảnh đánh giá số ${activeReviewImage?.displayIndex || activeReviewImage?.index || ''}`}
                            loading="lazy"
                            onError={() => {
                              setHiddenReviewImages((prev) => ({
                                ...prev,
                                [activeReviewImageUrl]: true,
                              }))
                            }}
                          />
                        </button>
                      ) : (
                        <div className={styles.reviewImageGalleryBody}>
                          <button
                            type="button"
                            className={styles.reviewMainImageButton}
                            onClick={() => window.open(activeReviewImageUrl, '_blank', 'noopener,noreferrer')}
                            aria-label={`Xem ảnh đánh giá số ${activeReviewImage?.displayIndex || activeReviewImage?.index || ''}`}
                          >
                            <img
                              src={activeReviewImageUrl}
                              alt={`Ảnh đánh giá số ${activeReviewImage?.displayIndex || activeReviewImage?.index || ''}`}
                              loading="lazy"
                              onError={() => {
                                setHiddenReviewImages((prev) => ({
                                  ...prev,
                                  [activeReviewImageUrl]: true,
                                }))
                              }}
                            />
                          </button>

                          <aside className={styles.reviewThumbnailPanel}>
                            <div className={styles.reviewThumbnailList}>
                              {selectedReviewImages.map((image, imageIndex) => (
                                <button
                                  type="button"
                                  key={`${image.url}-${imageIndex}`}
                                  className={imageIndex === activeReviewImageIndex ? styles.reviewThumbnailActive : ''}
                                  onClick={() => setActiveReviewImageIndex(imageIndex)}
                                  aria-label={`Chọn ảnh ${imageIndex + 1}`}
                                >
                                  <img
                                    src={image.url}
                                    alt={`Thumbnail ảnh đánh giá ${imageIndex + 1}`}
                                    loading="lazy"
                                    onError={() => {
                                      setHiddenReviewImages((prev) => ({
                                        ...prev,
                                        [image.url]: true,
                                      }))
                                    }}
                                  />
                                </button>
                              ))}
                            </div>
                          </aside>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'meta' && (
                <div className={styles.metaTabPro}>
                  <section className={styles.metaInfoCard}>
                    <h4>Thông tin hệ thống</h4>
                    <dl>
                      <div><dt>Review ID</dt><dd>{selectedReview.id}</dd></div>
                      <div><dt>Danh mục</dt><dd>{selectedReview.category || 'Chưa có'}</dd></div>
                      <div><dt>Đối tượng</dt><dd>{selectedReview.targetName || 'Không rõ đối tượng'}</dd></div>
                      <div><dt>Điểm đánh giá</dt><dd>{selectedReview.rating || 0}/5</dd></div>
                      <div><dt>Hiển thị</dt><dd>{selectedReview.visibility || 'public'}</dd></div>
                      <div><dt>Moderation</dt><dd>{selectedReview.moderationStatus || 'pending'}</dd></div>
                      <div><dt>Partner gửi</dt><dd>{selectedReview.partnerName || 'Đối tác'}</dd></div>
                      <div><dt>Thời gian tạo</dt><dd>{selectedReview.createdAt ? formatDateTime(selectedReview.createdAt) : 'Chưa có'}</dd></div>
                    </dl>
                  </section>

                  <section className={styles.apiBlockPro}>
                    <div className={styles.apiHeaderPro}>
                      <span>Dữ liệu JSON</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(JSON.stringify({
                          id: selectedReview.id,
                          category: selectedReview.category,
                          targetCode: selectedReview.targetCode,
                          targetName: selectedReview.targetName,
                          reviewerName: selectedReview.reviewerName,
                          rating: selectedReview.rating,
                          comment: selectedReview.comment,
                          visibility: selectedReview.visibility,
                          moderationStatus: selectedReview.moderationStatus,
                          sourceSystem: selectedReview.sourceSystem,
                          partnerName: selectedReview.partnerName,
                          createdAt: selectedReview.createdAt,
                          formattedCreatedAt: selectedReview.createdAt ? formatDateTime(selectedReview.createdAt) : null,
                        }, null, 2))}
                      >Sao chép</button>
                    </div>
                    <pre>{JSON.stringify({
                      id: selectedReview.id,
                      category: selectedReview.category,
                      targetCode: selectedReview.targetCode,
                      targetName: selectedReview.targetName,
                      reviewerName: selectedReview.reviewerName,
                      rating: selectedReview.rating,
                      comment: selectedReview.comment,
                      visibility: selectedReview.visibility,
                      moderationStatus: selectedReview.moderationStatus,
                      sourceSystem: selectedReview.sourceSystem,
                      partnerName: selectedReview.partnerName,
                      createdAt: selectedReview.createdAt,
                      formattedCreatedAt: selectedReview.createdAt ? formatDateTime(selectedReview.createdAt) : null,
                    }, null, 2)}</pre>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
