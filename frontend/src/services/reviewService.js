import { DEFAULT_REVIEWS } from '../shared/lib/defaultData'
import { readJson, writeJson } from '../shared/lib/storage'
import api from './api'

// ============================================================
// API THẬT — gọi backend Spring Boot
// ============================================================

/**
 * Lấy danh sách review từ backend (có filter + phân trang).
 * Trả về { content, totalElements, totalPages, number }
 */
export async function fetchReviews({
  keyword = '',
  category = 'all',
  visibility = 'all',
  sourceSystem = 'all',
  assignedOperatorCode = '',
  page = 0,
  size = 10,
} = {}) {

  const { data } = await api.get('/api/reviews', {
    params: {
      keyword,
      category,
      visibility,
      sourceSystem,
      assignedOperatorCode,
      page,
      size,
    },
  })

  return data
}

/**
 * Lấy chi tiết 1 review theo id.
 */
export async function fetchReviewById(id) {
  const { data } = await api.get(`/api/reviews/${id}`)
  return data
}

/**
 * Gửi review mới lên backend.
 */
export async function postReview(payload) {
  const { data } = await api.post('/api/reviews', payload)
  return data
}


const KEY = 'reviewhub-reviews-v8'

const OWNER_CODE_MAP = {
  VeXeNhanh: 'PT-001',
  FUTA: 'PT-002',
  'An Vui': 'PT-003',
  'Phương Trang': 'PT-004',
}

const EXTRA_SEED_REVIEWS = [
  {
    id: 'RV-FUTA-001',
    category: 'Nhà xe',
    targetCode: 'BUS-FUTA-001',
    targetName: 'FUTA Limousine Premium',
    reviewerName: 'Hoàng Minh A',
    rating: 5,
    comment: 'Xe sạch, nhân viên hỗ trợ tốt, xuất bến đúng giờ.',
    visibility: 'public',
    sourceSystem: 'partner-web',
    moderationStatus: 'approved',
    createdAt: '2026-04-13T07:15:00.000Z',
    partnerName: 'FUTA',
    ownerPartnerCode: 'PT-002',
  },
  {
    id: 'RV-FUTA-002',
    category: 'Nhà xe',
    targetCode: 'BUS-FUTA-001',
    targetName: 'FUTA Limousine Premium',
    reviewerName: 'Trần Hữu B',
    rating: 3,
    comment: 'Chỗ ngồi ổn nhưng điều hòa hơi lạnh.',
    visibility: 'private',
    sourceSystem: 'partner-app',
    moderationStatus: 'flagged',
    createdAt: '2026-04-13T10:00:00.000Z',
    partnerName: 'FUTA',
    ownerPartnerCode: 'PT-002',
  },
  {
    id: 'RV-ANVUI-001',
    category: 'Nhà xe',
    targetCode: 'BUS-ANVUI-001',
    targetName: 'An Vui Cabin 24',
    reviewerName: 'Lê Thành C',
    rating: 4,
    comment: 'Cabin sạch sẽ, chạy êm, nhân viên nhiệt tình.',
    visibility: 'private',
    sourceSystem: 'partner-web',
    moderationStatus: 'approved',
    createdAt: '2026-04-12T08:10:00.000Z',
    partnerName: 'An Vui',
    ownerPartnerCode: 'PT-003',
  },
  {
    id: 'RV-ANVUI-002',
    category: 'Nhà xe',
    targetCode: 'BUS-ANVUI-001',
    targetName: 'An Vui Cabin 24',
    reviewerName: 'Phạm Quốc D',
    rating: 1,
    comment: 'Trễ giờ và hỗ trợ khách chưa tốt.',
    visibility: 'public',
    sourceSystem: 'partner-app',
    moderationStatus: 'flagged',
    createdAt: '2026-04-12T11:25:00.000Z',
    partnerName: 'An Vui',
    ownerPartnerCode: 'PT-003',
  },
  {
    id: 'RV-VXN-001',
    category: 'Nhà xe',
    targetCode: 'BUS-VXN-001',
    targetName: 'VeXeNhanh Premium 16',
    reviewerName: 'Ngô Minh E',
    rating: 5,
    comment: 'Xe mới, ghế ngồi thoải mái và nhân viên rất nhiệt tình.',
    visibility: 'private',
    sourceSystem: 'partner-web',
    moderationStatus: 'approved',
    createdAt: '2026-04-11T09:20:00.000Z',
    partnerName: 'VeXeNhanh',
    ownerPartnerCode: 'PT-001',
  },
]

function normalizeReview(item) {
  const fallbackOwner = item.ownerPartnerCode || OWNER_CODE_MAP[item.partnerName] || ''

  return {
    ...item,
    ownerPartnerCode: fallbackOwner,
  }
}

function getSeedData() {
  return [
    ...DEFAULT_REVIEWS.map(normalizeReview),
    ...EXTRA_SEED_REVIEWS.map(normalizeReview),
  ]
}

function seed() {
  const existed = readJson(KEY, null)
  const seedData = getSeedData()

  if (!existed) {
    writeJson(KEY, seedData)
    return
  }

  const normalizedExisting = existed.map(normalizeReview)

  const existedIds = new Set(
    normalizedExisting.map((item) => item.id)
  )

  const missing = seedData.filter(
    (item) => !existedIds.has(item.id)
  )

  const repaired = normalizedExisting.map(normalizeReview)

  writeJson(KEY, [...repaired, ...missing])
}

export function getReviews() {
  seed()

  return readJson(KEY, getSeedData())
    .map(normalizeReview)
}

export function getAllowedReviewsForPartner(partnerCode) {
  const all = getReviews()

  return all.filter(
    (item) =>
      item.visibility === 'public' ||
      (
        item.visibility === 'private' &&
        item.ownerPartnerCode === partnerCode
      )
  )
}

export function submitReview(review) {
  const next = [
    normalizeReview({
      ...review,
      id: `RV-${Date.now()}`,
      createdAt: new Date().toISOString(),
      moderationStatus:
        review.rating <= 3
          ? 'flagged'
          : 'approved',
    }),
    ...getReviews(),
  ]

  writeJson(KEY, next)

  return next[0]
}

export function updateReviewStatus(reviewId, moderationStatus) {
  const items = getReviews().map((item) =>
    item.id === reviewId
      ? { ...item, moderationStatus }
      : item
  )

  writeJson(KEY, items)

  return items
}