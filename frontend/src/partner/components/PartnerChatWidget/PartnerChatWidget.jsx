import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../../../auth/context/AuthContext'
import api from '../../../services/api'
import styles from './PartnerChatWidget.module.css'
import queryStyles from '../../pages/ReviewQuery/PartnerReviewQueryPage.module.css'

const SUPPORT_ROOM_ID = '__PARTNER_SUPPORT__'
const AI_ROOM_ID = '__PARTNER_AI__'
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

function isPartnerAIContextForUser(context, currentUser) {
  if (!context) return false
  const expectedUserKey = getPartnerAIUserKey(currentUser)
  if (!context.userKey) return false
  return context.userKey === expectedUserKey
}

const PARTNER_AI_MENU = [
  {
    key: 'plan-quota',
    label: 'Hạn gói & quota',
    desc: 'Xem hạn gói, quota đã dùng và còn lại',
    message: 'Hạn sử dụng gói và quota của tôi còn bao nhiêu?',
    group: 'main',
  },
  {
    key: 'chart',
    label: 'Xuất biểu đồ review',
    desc: 'Hiện sơ đồ tỷ lệ tốt / xấu / trung lập',
    message: 'Xuất biểu đồ review',
    mode: 'chart',
    group: 'main',
  },
  {
    key: 'analysis',
    label: 'AI phân tích review',
    desc: 'Tóm tắt ưu điểm, nhược điểm và lời khuyên',
    message: 'AI phân tích review',
    mode: 'analysis',
    group: 'main',
  },
  {
    key: 'api',
    label: 'Hướng dẫn API key',
    desc: 'Cách dùng API key để lấy review',
    message: 'Hướng dẫn dùng API key để lấy review',
    group: 'main',
  },
  {
    key: 'security',
    label: 'Bảo mật & chi phí',
    desc: 'Review gửi có an toàn và tính phí không',
    message: 'Nếu tôi gửi review thì có được lưu an toàn, bảo mật và có bị tính phí không?',
    group: 'main',
  },
  {
    key: 'more-review',
    label: 'Thêm review',
    message: 'Tôi muốn có thêm review thì làm như nào?',
    group: 'more',
  },
  {
    key: 'discount',
    label: 'Ưu đãi',
    message: 'Mua nhiều có ưu đãi cho khách hàng quen không?',
    group: 'more',
  },
  {
    key: 'reply',
    label: 'Phản hồi khách',
    message: 'Viết phản hồi lịch sự cho khách phàn nàn xe đến trễ',
    group: 'more',
  },
  {
    key: 'feature-guide',
    label: 'Công dụng mục',
    message: 'Giải thích công dụng các mục trong trang partner',
    group: 'more',
  },
]


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


function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}


function cleanReportBullet(line) {
  return String(line || '').replace(/^[\-•*]+\s*/, '').trim()
}

function makeEmptyReportInsight() {
  return {
    summary: {
      good: [],
      bad: [],
      suggestion: [],
    },
    detail: {
      good: [],
      bad: [],
      suggestion: [],
    },
  }
}

function detectReportSectionKey(value) {
  const text = normalizeSearchText(value)

  if (
    text.includes('khach khen') ||
    text.includes('thuong khen') ||
    text.includes('diem manh') ||
    text.includes('uu diem') ||
    text.includes('diem duoc khen')
  ) {
    return 'good'
  }

  if (
    text.includes('khach phan anh') ||
    text.includes('thuong che') ||
    text.includes('diem can cai thien') ||
    text.includes('diem yeu') ||
    text.includes('can cai thien') ||
    text.includes('van de bi phan anh') ||
    text.includes('nhuoc diem')
  ) {
    return 'bad'
  }

  if (
    text.includes('goi y') ||
    text.includes('loi khuyen') ||
    text.includes('de xuat')
  ) {
    return 'suggestion'
  }

  return ''
}

function parsePercentReportItem(value) {
  const text = cleanReportBullet(value)
  const matched = text.match(/^(.*?)(?:\s*[|–—-]\s*|\s+)(\d+(?:[.,]\d+)?)\s*%$/)

  if (matched) {
    return {
      label: matched[1].trim(),
      percent: `${matched[2].replace('.', ',')}%`,
    }
  }

  return {
    label: text,
    percent: '',
  }
}

function parsePartnerAIReportForChat(text) {
  const insight = makeEmptyReportInsight()
  const lines = String(text || '').split('\n')
  let mode = 'summary'
  let currentKey = ''

  lines.forEach((rawLine) => {
    const line = String(rawLine || '').trim()
    if (!line) return

    const heading = line.replace(/^#+\s*/, '').trim()
    const headingText = normalizeSearchText(heading)

    if (headingText === 'ban tom tat') {
      mode = 'summary'
      currentKey = ''
      return
    }

    if (
      headingText === 'ban tom tat chi tiet' ||
      headingText === 'xem chi tiet'
    ) {
      mode = 'detail'
      currentKey = ''
      return
    }

    const sectionKey = detectReportSectionKey(heading)
    if (sectionKey && (/^#+\s*/.test(line) || /:$/.test(line))) {
      currentKey = sectionKey
      return
    }

    const value = cleanReportBullet(line)
    if (!value || !currentKey) return

    if (mode === 'detail' && (currentKey === 'good' || currentKey === 'bad')) {
      insight.detail[currentKey].push(parsePercentReportItem(value))
      return
    }

    insight[mode][currentKey].push(value)
  })

  if (!insight.summary.good.length && insight.detail.good.length) {
    insight.summary.good = insight.detail.good.map((item) => item.label).slice(0, 3)
  }

  if (!insight.summary.bad.length && insight.detail.bad.length) {
    insight.summary.bad = insight.detail.bad.map((item) => item.label).slice(0, 3)
  }

  if (!insight.summary.suggestion.length && insight.detail.suggestion.length) {
    insight.summary.suggestion = insight.detail.suggestion.slice(0, 2)
  }

  if (!insight.detail.good.length && insight.summary.good.length) {
    insight.detail.good = insight.summary.good.map((label) => ({ label, percent: '' }))
  }

  if (!insight.detail.bad.length && insight.summary.bad.length) {
    insight.detail.bad = insight.summary.bad.map((label) => ({ label, percent: '' }))
  }

  if (!insight.detail.suggestion.length && insight.summary.suggestion.length) {
    insight.detail.suggestion = [...insight.summary.suggestion]
  }

  return insight
}


function splitPartnerAssignedValues(value) {
  return String(value || '')
    .split(/[|,;]+/)
    .map((item) => normalizeSearchText(item))
    .filter(Boolean)
}

function normalizeReviewForPartnerAI(review = {}, currentUser = {}) {
  const targetCode =
    review.targetCode ||
    review.target_code ||
    review.operatorCode ||
    review.operator_code ||
    review.partnerCode ||
    review.partner_code ||
    review.ownerPartnerCode ||
    review.owner_partner_code ||
    review.code ||
    ''

  const targetName =
    review.targetName ||
    review.target_name ||
    review.operatorName ||
    review.operator_name ||
    review.partnerName ||
    review.partner_name ||
    review.name ||
    currentUser?.orgName ||
    'Dịch vụ'

  return {
    ...review,
    id: review.id || review.reviewId || `${targetCode}-${review.reviewerName || review.userName || review.authorName || ''}-${review.createdAt || review.created_at || ''}`,
    targetCode,
    targetName,
    operatorCode: review.operatorCode || review.operator_code || targetCode,
    partnerName: review.partnerName || review.partner_name || targetName,
    reviewerName:
      review.reviewerName ||
      review.reviewer_name ||
      review.userName ||
      review.user_name ||
      review.authorName ||
      review.author_name ||
      review.customerName ||
      review.customer_name ||
      'Khách hàng',
    comment:
      review.comment ||
      review.content ||
      review.reviewText ||
      review.review_text ||
      review.text ||
      '',
    rating: Number(review.rating || review.stars || review.score || 0),
    sourceSystem: review.sourceSystem || review.source_system || review.source || '',
    visibility: review.visibility || '',
    moderationStatus: review.moderationStatus || review.moderation_status || review.status || '',
    category: review.category || review.serviceCategory || review.service_category || '',
    createdAt: review.createdAt || review.created_at || new Date().toISOString(),
  }
}

function reviewMatchesCurrentPartner(review, currentUser) {
  const assignedCodes = splitPartnerAssignedValues(currentUser?.assignedOperatorCode)
  const assignedNames = splitPartnerAssignedValues(
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
  ].map((item) => normalizeSearchText(item)).filter(Boolean)

  const names = [
    review.targetName,
    review.target_name,
    review.operatorName,
    review.operator_name,
    review.partnerName,
    review.partner_name,
    review.name,
  ].map((item) => normalizeSearchText(item)).filter(Boolean)

  const codeMatches = assignedCodes.length > 0 && codes.some((code) => assignedCodes.includes(code))
  const nameMatches = assignedNames.length > 0 && names.some((name) => assignedNames.includes(name))

  if (assignedCodes.length && codes.length) return codeMatches
  if (assignedNames.length && names.length) return nameMatches

  return true
}

function isReviewVisibleForPartner(review) {
  const status = normalizeSearchText(review?.moderationStatus || review?.moderation_status || review?.status)
  const visibility = normalizeSearchText(review?.visibility)
  const source = normalizeSearchText(review?.sourceSystem || review?.source_system || review?.source)

  if (status && status.includes('pending')) return false
  if (status && status.includes('rejected')) return false
  if (visibility && visibility.includes('private') && !source.includes('partner')) return false

  return true
}

function makePartnerAIContextFromReviews(reviews = [], currentUser = {}) {
  const normalized = reviews
    .map((item) => normalizeReviewForPartnerAI(item, currentUser))
    .filter((item) => reviewMatchesCurrentPartner(item, currentUser))
    .filter(isReviewVisibleForPartner)

  const map = new Map()

  normalized.forEach((item) => {
    const key = String(item.id || `${item.targetCode}-${item.reviewerName}-${item.createdAt}-${item.comment}`)
    if (!map.has(key)) map.set(key, item)
  })

  const uniqueReviews = Array.from(map.values())

  return {
    version: 5,
    userKey: getPartnerAIUserKey(currentUser),
    updatedAt: Date.now(),
    filters: {
      keyword: '',
      category: 'all',
      visibility: 'all',
      sourceSystem: 'all',
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
    totalReviews: uniqueReviews.length,
    reviews: uniqueReviews.slice(0, 1000),
    aiReport: '',
    source: 'chat-fetch-reviews',
  }
}

async function fetchPartnerReviewAIContext(currentUser) {
  const response = await api.get('/api/reviews', {
    params: {
      keyword: '',
      category: 'all',
      visibility: 'all',
      sourceSystem: 'all',
      page: 0,
      size: 1000,
    },
  })

  const data = response.data
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.reviews)
          ? data.reviews
          : []

  const context = makePartnerAIContextFromReviews(list, currentUser)

  if (typeof window !== 'undefined') {
    window.__reviewhubPartnerReviewAIContext = context

    try {
      window.localStorage.setItem(getPartnerReviewAIContextKey(currentUser), JSON.stringify(context))
      window.localStorage.removeItem(PARTNER_REVIEW_AI_CONTEXT_KEY)
    } catch {}
  }

  return context
}


function readPartnerReviewAIContext(currentUser) {
  if (typeof window === 'undefined') return null

  const expectedKey = getPartnerAIUserKey(currentUser)
  const fromWindow = window.__reviewhubPartnerReviewAIContext

  if (fromWindow?.reviews?.length && isPartnerAIContextForUser(fromWindow, currentUser)) {
    return fromWindow
  }

  try {
    const scopedKey = getPartnerReviewAIContextKey(currentUser)
    const scopedParsed = JSON.parse(window.localStorage.getItem(scopedKey) || 'null')

    if (scopedParsed?.reviews?.length && scopedParsed.userKey === expectedKey) {
      return scopedParsed
    }

    // Xóa cache global cũ để tránh đổi account vẫn ăn dữ liệu partner trước.
    window.localStorage.removeItem(PARTNER_REVIEW_AI_CONTEXT_KEY)
  } catch {}

  return null
}


function buildFallbackTopicsFromReviews(reviews = [], positive = true) {
  const source = reviews
    .filter((item) => positive ? Number(item.rating || 0) >= 4 : Number(item.rating || 0) <= 2)
    .map((item) => String(item.comment || ''))
    .join(' ')

  const text = normalizeSearchText(source)
  const items = []

  const pushIf = (condition, label) => {
    if (condition) items.push(label)
  }

  pushIf(text.includes('nhan vien') || text.includes('phuc vu') || text.includes('thai do'), positive ? 'Thái độ phục vụ được khách nhắc đến' : 'Thái độ phục vụ cần theo dõi')
  pushIf(text.includes('khong gian') || text.includes('phong') || text.includes('tien nghi') || text.includes('ghe') || text.includes('giuong'), positive ? 'Không gian / tiện nghi tạo ấn tượng tốt' : 'Không gian / tiện nghi còn bị phản ánh')
  pushIf(text.includes('gio') || text.includes('tre') || text.includes('dung gio') || text.includes('cham'), positive ? 'Giờ giấc được đánh giá ổn định' : 'Giờ giấc / chờ đợi cần cải thiện')
  pushIf(text.includes('gia') || text.includes('chi phi') || text.includes('ve'), positive ? 'Giá / chi phí được khách quan tâm tích cực' : 'Giá / chi phí còn gây băn khoăn')
  pushIf(text.includes('sach') || text.includes('ve sinh'), positive ? 'Vệ sinh / sạch sẽ được đánh giá tốt' : 'Vệ sinh / sạch sẽ cần cải thiện')

  if (!items.length) {
    items.push(positive ? 'Trải nghiệm chung được đánh giá tốt' : 'Một số trải nghiệm chung cần theo dõi thêm')
  }

  return items.slice(0, 3)
}


function makeFastAIReviewSample(reviews = [], maxItems = 120) {
  const safeReviews = Array.isArray(reviews) ? reviews : []
  if (safeReviews.length <= maxItems) return safeReviews

  const bad = safeReviews.filter((item) => Number(item.rating || 0) <= 2)
  const neutral = safeReviews.filter((item) => Number(item.rating || 0) === 3)
  const good = safeReviews.filter((item) => Number(item.rating || 0) >= 4)

  const selected = []
  const seen = new Set()

  const addMany = (items) => {
    items.forEach((item) => {
      const key = String(item.id || `${item.targetCode}-${item.reviewerName}-${item.createdAt}-${item.comment}`)
      if (!seen.has(key) && selected.length < maxItems) {
        seen.add(key)
        selected.push(item)
      }
    })
  }

  addMany(bad)
  addMany(neutral)
  addMany(good)
  addMany(safeReviews)

  return selected
}

function getScopeCachedReport(context, scopeKey) {
  if (!context) return ''
  const reportsByScope = context.aiReportsByScope || {}
  return reportsByScope[scopeKey] || (scopeKey === 'all' ? context.aiReport : '') || ''
}

function saveScopeCachedReport(currentUser, context, scopeKey, report) {
  if (!context || !report) return context

  const nextContext = {
    ...context,
    aiReport: scopeKey === 'all' ? report : context.aiReport,
    aiReportsByScope: {
      ...(context.aiReportsByScope || {}),
      [scopeKey]: report,
    },
    updatedAt: Date.now(),
  }

  if (typeof window !== 'undefined') {
    window.__reviewhubPartnerReviewAIContext = nextContext

    try {
      window.localStorage.setItem(getPartnerReviewAIContextKey(currentUser), JSON.stringify(nextContext))
      window.localStorage.removeItem(PARTNER_REVIEW_AI_CONTEXT_KEY)
    } catch {}
  }

  return nextContext
}

function buildStatsFromReviews(reviews = [], aiReport = '', scopeLabel = '') {
  const safeReviews = Array.isArray(reviews) ? reviews : []
  const total = safeReviews.length
  const good = safeReviews.filter((item) => Number(item.rating || 0) >= 4).length
  const bad = safeReviews.filter((item) => Number(item.rating || 0) <= 2).length
  const neutral = Math.max(total - good - bad, 0)
  const averageRating = total
    ? safeReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total
    : 0

  const ratingRows = [5, 4, 3, 2, 1].map((rating) => {
    const count = safeReviews.filter((item) => Math.round(Number(item.rating || 0)) === rating).length

    return {
      rating,
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
    }
  })

  const parsed = parsePartnerAIReportForChat(aiReport)
  const reportGood = parsed.summary.good.length
    ? parsed.summary.good
    : parsed.detail.good.map((item) => item.label)

  const reportBad = parsed.summary.bad.length
    ? parsed.summary.bad
    : parsed.detail.bad.map((item) => item.label)

  const reportSuggestion = parsed.summary.suggestion.length
    ? parsed.summary.suggestion
    : parsed.detail.suggestion

  const goodTopics = reportGood.length
    ? reportGood.slice(0, 4)
    : buildFallbackTopicsFromReviews(safeReviews, true)

  const badTopics = reportBad.length
    ? reportBad.slice(0, 4)
    : buildFallbackTopicsFromReviews(safeReviews, false)

  const suggestions = reportSuggestion.length
    ? reportSuggestion.slice(0, 3)
    : [
        bad > 0
          ? 'Ưu tiên xử lý các nhóm phản ánh xuất hiện nhiều trong review xấu.'
          : 'Duy trì các điểm đang được khách đánh giá tốt.',
        'Phản hồi review tiêu cực trong 24–48 giờ bằng giọng văn lịch sự và có hướng xử lý rõ.',
      ]

  return {
    total,
    good,
    bad,
    neutral,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingRows,
    goodTopics,
    badTopics,
    suggestions,
    source: aiReport ? 'page-ai-report' : 'page-filtered-reviews',
    scopeLabel,
  }
}


function getReviewServiceInfo(review) {
  const rawCategory = String(
    review?.category ||
    review?.serviceCategory ||
    review?.service_category ||
    review?.serviceSlug ||
    review?.service_slug ||
    ''
  ).trim()

  const code = String(
    review?.targetCode ||
    review?.target_code ||
    review?.operatorCode ||
    review?.operator_code ||
    review?.partnerCode ||
    review?.partner_code ||
    review?.ownerPartnerCode ||
    review?.owner_partner_code ||
    review?.code ||
    ''
  ).trim().toUpperCase()

  const normalizedCategory = normalizeSearchText(rawCategory)

  if (code.startsWith('PT-') || code.startsWith('BUS-') || normalizedCategory.includes('nha xe')) {
    return { key: 'nhaxe', label: 'Nhà xe' }
  }

  if (code.startsWith('KS-') || code.startsWith('HOTEL-') || normalizedCategory.includes('khach san')) {
    return { key: 'khachsan', label: 'Khách sạn' }
  }

  if (code.startsWith('MB-') || normalizedCategory.includes('may bay')) {
    return { key: 'maybay', label: 'Máy bay' }
  }

  if (code.startsWith('TH-') || code.startsWith('TRAIN-') || normalizedCategory.includes('tau hoa')) {
    return { key: 'tauhoa', label: 'Tàu hỏa' }
  }

  if (code.startsWith('TOUR-') || normalizedCategory.includes('tour')) {
    return { key: 'tour', label: 'Tour' }
  }

  if (normalizedCategory) {
    return {
      key: normalizedCategory.replace(/\s+/g, '-'),
      label: rawCategory,
    }
  }

  return { key: 'khac', label: 'Dịch vụ khác' }
}

function getServiceScopeOptions(reviews = []) {
  const map = new Map()

  reviews.forEach((review) => {
    const info = getReviewServiceInfo(review)

    if (!map.has(info.key)) {
      map.set(info.key, {
        key: info.key,
        label: info.label,
        count: 0,
        reviews: [],
      })
    }

    const entry = map.get(info.key)
    entry.count += 1
    entry.reviews.push(review)
  })

  const order = ['nhaxe', 'khachsan', 'maybay', 'tauhoa', 'tour', 'khac']

  return Array.from(map.values()).sort((a, b) => {
    const ai = order.indexOf(a.key)
    const bi = order.indexOf(b.key)
    if (ai === -1 && bi === -1) return a.label.localeCompare(b.label, 'vi')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

function shouldShowScopePicker(context, reviews = []) {
  const options = getServiceScopeOptions(reviews)
  if (options.length <= 1) return false

  const text = normalizeSearchText([
    context?.currentUser?.currentPlanId,
    context?.currentUser?.membershipLabel,
    context?.planName,
    context?.currentPlanId,
  ].filter(Boolean).join(' '))

  // Chỉ 1 dịch vụ: giữ nguyên, bấm là ra kết quả.
  // Có nhiều loại dịch vụ trong cùng tài khoản: mở lựa chọn phạm vi.
  // Điều này bao phủ gói tự chọn như 1 nhà xe + 1 khách sạn.
  return (
    text.includes('custom') ||
    text.includes('tu chon') ||
    text.includes('tuy chon') ||
    text.includes('tuy chinh') ||
    options.length > 1
  )
}

function getScopeReviews(reviews = [], scopeKey = 'all') {
  if (scopeKey === 'all') return reviews

  return reviews.filter((review) => getReviewServiceInfo(review).key === scopeKey)
}

function getScopeLabel(reviews = [], scopeKey = 'all') {
  const options = getServiceScopeOptions(reviews)

  if (scopeKey === 'all') {
    return options.length > 1 ? `Tổng hợp cả ${options.length}` : 'Tất cả nguồn'
  }

  return options.find((item) => item.key === scopeKey)?.label || 'Dịch vụ'
}

function makeScopeChoices(mode, reviews = []) {
  const options = getServiceScopeOptions(reviews)

  if (mode === 'analysis') {
    return [
      ...options.map((item) => ({
        key: item.key,
        label: item.label,
        desc: `${item.count} review`,
        mode,
      })),
      {
        key: 'all',
        label: `Tổng hợp cả ${options.length}`,
        desc: `${reviews.length} review`,
        mode,
      },
    ]
  }

  return [
    {
      key: 'all',
      label: `Biểu đồ chung`,
      desc: `${reviews.length} review`,
      mode,
    },
    ...options.map((item) => ({
      key: item.key,
      label: `Biểu đồ ${item.label.toLowerCase()}`,
      desc: `${item.count} review`,
      mode,
    })),
  ]
}

function ScopeChoiceBubble({ mode, choices, onSelect }) {
  return (
    <div className={styles.scopeChoiceCard}>
      <div className={styles.scopeChoiceHead}>
        <strong>{mode === 'analysis' ? 'AI phân tích review' : 'Xuất biểu đồ review'}</strong>
        <span>Chọn phạm vi dữ liệu cần xem</span>
      </div>

      <div className={styles.scopeChoiceList}>
        {choices.map((item) => (
          <button
            type="button"
            key={`${item.mode}-${item.key}`}
            onClick={() => onSelect(item)}
          >
            <span>
              <strong>{item.label}</strong>
              <small>{item.desc}</small>
            </span>
            <i>›</i>
          </button>
        ))}
      </div>
    </div>
  )
}

function isReviewChartRequest(value) {
  const text = normalizeSearchText(value)

  // Chỉ xuất biểu đồ khi người dùng hỏi sơ đồ / biểu đồ.
  // Không bắt câu "AI phân tích review" để tránh nhầm chức năng.
  return (
    !text.includes('ai phan tich') &&
    !text.includes('phan tich review') &&
    (
      text.includes('so do') ||
      text.includes('bieu do') ||
      text.includes('xuat bieu') ||
      text.includes('xuat bieu do') ||
      text.includes('xuat bieu do review') ||
      text.includes('xuat so do') ||
      text.includes('ty le review') ||
      text.includes('ty le danh gia') ||
      text.includes('thong ke review')
    )
  )
}

function isReviewAnalysisRequest(value) {
  const text = normalizeSearchText(value)

  return (
    text.includes('ai phan tich') ||
    text.includes('phan tich review') ||
    text === 'ai phan tich review' ||
    text.includes('tom tat nhanh danh gia') ||
    text.includes('tom tat danh gia cua khach hang')
  )
}

function formatPercentValue(value, total) {
  if (!total) return '0%'
  return `${((Number(value || 0) / Number(total || 0)) * 100).toFixed(1).replace('.', ',')}%`
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value || 0)))
}

function ReviewChartBubble({ data }) {
  const total = Number(data?.total || 0)
  const good = Number(data?.good || 0)
  const bad = Number(data?.bad || 0)
  const neutral = Number(data?.neutral || 0)
  const avg = Number(data?.averageRating || 0)
  const scorePercent = `${Math.max(0, Math.min(100, (avg / 5) * 100))}%`
  const ratingRows = Array.isArray(data?.ratingRows) ? data.ratingRows : []

  return (
    <div className={`${queryStyles.analyticsCard} ${styles.chatReviewAnalyticsCard}`}>
      <div className={queryStyles.sideHeader}>
        <div>
          <h3>Thống kê đánh giá</h3>
          <p>{data?.scopeLabel || 'Tổng quan điểm chất lượng'}</p>
        </div>

        <select value="all" disabled>
          <option>{data?.scopeLabel || 'Tất cả nguồn'}</option>
        </select>
      </div>

      <div className={queryStyles.analyticsBody}>
        <div className={queryStyles.donut} style={{ '--score': scorePercent }}>
          <div>
            <strong>{avg.toFixed(1)}</strong>
            <span>/5</span>
            <small>Điểm trung bình</small>
          </div>
        </div>

        <div className={queryStyles.breakdownList}>
          {ratingRows.map((row) => (
            <div key={row.rating} className={queryStyles.breakdownRow}>
              <span>{row.rating} sao</span>
              <div>
                <i style={{ width: `${clampPercent(row.percent)}%` }} />
              </div>
              <b>{row.count}</b>
            </div>
          ))}
        </div>
      </div>

      <div className={queryStyles.summaryGrid}>
        <div>
          <span>Tổng đánh giá</span>
          <strong>{total}</strong>
        </div>

        <div className={queryStyles.goodBox}>
          <span>Đánh giá tốt</span>
          <strong>{good}</strong>
        </div>

        <div className={queryStyles.badBox}>
          <span>Cần theo dõi</span>
          <strong>{bad}</strong>
        </div>
      </div>

      {neutral > 0 && (
        <p className={styles.chartNeutralNote}>
          Có {neutral} review trung lập, chiếm {formatPercentValue(neutral, total)}.
        </p>
      )}
    </div>
  )
}

function ReviewAnalysisBubble({ data }) {
  const total = Number(data?.total || 0)
  const good = Number(data?.good || 0)
  const bad = Number(data?.bad || 0)
  const neutral = Number(data?.neutral || 0)
  const avg = Number(data?.averageRating || 0)
  const goodTopics = Array.isArray(data?.goodTopics) ? data.goodTopics : []
  const badTopics = Array.isArray(data?.badTopics) ? data.badTopics : []
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []

  return (
    <div className={styles.analysisCard}>
      <div className={styles.analysisHeader}>
        <span className={styles.analysisIcon}>Ai</span>
        <div>
          <strong>AI phân tích review</strong>
          <small>
            {data?.isRefreshingAI
              ? 'Hiện bản nhanh, AI đang cập nhật chi tiết...'
              : 'Dựa trên review của tài khoản hiện tại'}
          </small>
        </div>
      </div>

      <div className={styles.analysisStats}>
        <div>
          <span>Tổng</span>
          <strong>{total}</strong>
          <small>{avg.toFixed(1)}/5 điểm TB</small>
        </div>
        <div>
          <span>Tốt</span>
          <strong className={styles.goodText}>{good}</strong>
          <small>{formatPercentValue(good, total)}</small>
        </div>
        <div>
          <span>Cần theo dõi</span>
          <strong className={styles.badText}>{bad}</strong>
          <small>{formatPercentValue(bad, total)}</small>
        </div>
        <div>
          <span>Trung lập</span>
          <strong>{neutral}</strong>
          <small>{formatPercentValue(neutral, total)}</small>
        </div>
      </div>

      <div className={styles.analysisSections}>
        <section>
          <h4>Ưu điểm</h4>
          {goodTopics.length ? (
            <ul>
              {goodTopics.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <p>Chưa đủ dữ liệu để xác định ưu điểm nổi bật.</p>
          )}
        </section>

        <section>
          <h4>Nhược điểm</h4>
          {badTopics.length ? (
            <ul>
              {badTopics.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <p>Chưa có nhóm phản ánh nổi bật.</p>
          )}
        </section>

        <section>
          <h4>Lời khuyên</h4>
          {suggestions.length ? (
            <ul>
              {suggestions.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <p>Duy trì phản hồi khách hàng đều đặn và theo dõi review xấu mới.</p>
          )}
        </section>
      </div>

      {data?.isRefreshingAI && (
        <p className={styles.analysisLoadingNote}>
          Đang cập nhật phân tích chi tiết từ AI. Bạn có thể xem bản nhanh trước.
        </p>
      )}

      {data?.aiDetailError && (
        <p className={styles.analysisErrorNote}>
          AI chi tiết phản hồi chậm, hệ thống giữ bản phân tích nhanh để tránh lỗi.
        </p>
      )}
    </div>
  )
}


function PartnerAIMenuBubble({ onSelect }) {
  const mainItems = PARTNER_AI_MENU.filter((item) => item.group === 'main')
  const moreItems = PARTNER_AI_MENU.filter((item) => item.group === 'more')

  return (
    <div className={styles.menuCard}>
      <div className={styles.menuHead}>
        <strong>Partner AI hỗ trợ nhanh</strong>
        <span>Chọn một mục, AI sẽ tự gửi câu hỏi và trả lời ngay.</span>
      </div>

      <div className={styles.menuList}>
        {mainItems.map((item) => (
          <button
            type="button"
            key={item.key}
            className={styles.menuItem}
            onClick={() => onSelect(item)}
          >
            <span>
              <strong>{item.label}</strong>
              <small>{item.desc}</small>
            </span>
            <i>›</i>
          </button>
        ))}
      </div>

      <div className={styles.menuChipArea}>
        <span>Hỗ trợ thêm</span>

        <div>
          {moreItems.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => onSelect(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
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


  useEffect(() => {
    setOpen(false)
    setSelectedRoom(null)
    setMessages([])
    setInput('')
    setUnreadTotal(0)

    if (typeof window !== 'undefined') {
      const context = window.__reviewhubPartnerReviewAIContext

      if (context && !isPartnerAIContextForUser(context, currentUser)) {
        window.__reviewhubPartnerReviewAIContext = null
      }

      try {
        window.localStorage.removeItem(PARTNER_REVIEW_AI_CONTEXT_KEY)
      } catch {}
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.assignedOperatorCode, currentUser?.currentPlanId])


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

Tôi có thể hỗ trợ nhanh về quota, hạn gói, SLA, API key, báo cáo review, biểu đồ review, bảo mật chi phí và phản hồi khách hàng.

Hãy chọn một mục bên dưới để bắt đầu.`,
          senderRole: 'ai',
          senderName: 'Partner AI Pro',
          sentAt: new Date().toISOString(),
        },
        {
          id: 'partner-ai-menu',
          content: 'Partner AI menu',
          senderRole: 'menu',
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

  async function sendReviewStatsCard(content, mode, scopeKey = 'auto') {
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

    let context = readPartnerReviewAIContext(currentUser)
    let contextReviews =
      isPartnerAIContextForUser(context, currentUser) && Array.isArray(context?.reviews)
        ? context.reviews
        : []

    if (!contextReviews.length) {
      context = await fetchPartnerReviewAIContext(currentUser)
      contextReviews =
        isPartnerAIContextForUser(context, currentUser) && Array.isArray(context?.reviews)
          ? context.reviews
          : []
    }

    if (contextReviews.length) {
      if (scopeKey === 'auto' && shouldShowScopePicker(context, contextReviews)) {
        const choices = makeScopeChoices(mode, contextReviews)

        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            content: mode === 'analysis' ? 'Chọn phạm vi AI phân tích review' : 'Chọn phạm vi xuất biểu đồ review',
            senderRole: 'scope-choice',
            senderName: 'Partner AI Pro',
            scopeMode: mode,
            scopeChoices: choices,
            sentAt: new Date().toISOString(),
          },
        ])
        return
      }

      const finalScopeKey = scopeKey === 'auto' ? 'all' : scopeKey
      const scopedReviews = getScopeReviews(contextReviews, finalScopeKey)
      const scopeLabel = getScopeLabel(contextReviews, finalScopeKey)
      const cachedReport = mode === 'analysis'
        ? getScopeCachedReport(context, finalScopeKey)
        : ''

      const fastStats = buildStatsFromReviews(scopedReviews, cachedReport, scopeLabel)
      const messageId = crypto.randomUUID()

      setMessages(prev => [
        ...prev,
        {
          id: messageId,
          content: mode === 'chart' ? `Xuất biểu đồ review - ${scopeLabel}` : `AI phân tích review - ${scopeLabel}`,
          senderRole: mode === 'chart' ? 'chart' : 'analysis',
          senderName: 'Partner AI Pro',
          chartData: {
            ...fastStats,
            isRefreshingAI: mode === 'analysis' && !cachedReport,
          },
          sentAt: new Date().toISOString(),
        },
      ])

      if (mode !== 'analysis' || cachedReport) return

      const aiSample = makeFastAIReviewSample(scopedReviews, 120)

      api.post(
        '/api/partner/review-ai/insight',
        {
          keyword: context?.filters?.keyword || '',
          category: context?.filters?.category || 'all',
          visibility: context?.filters?.visibility || 'all',
          sourceSystem: context?.filters?.sourceSystem || 'all',
          totalReviews: scopedReviews.length,
          reviews: aiSample,
          analysisMode: 'fast-chat',
        },
        {
          timeout: 120000,
        }
      )
        .then((res) => {
          const report = res.data?.report || ''
          if (!report) return

          const nextStats = buildStatsFromReviews(scopedReviews, report, scopeLabel)
          saveScopeCachedReport(currentUser, context, finalScopeKey, report)

          setMessages(prev =>
            prev.map((item) =>
              item.id === messageId
                ? {
                    ...item,
                    chartData: {
                      ...nextStats,
                      isRefreshingAI: false,
                      source: 'ai-report-background',
                    },
                  }
                : item
            )
          )
        })
        .catch(() => {
          setMessages(prev =>
            prev.map((item) =>
              item.id === messageId
                ? {
                    ...item,
                    chartData: {
                      ...(item.chartData || {}),
                      isRefreshingAI: false,
                      aiDetailError: true,
                    },
                  }
                : item
            )
          )
        })

      return
    }

    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        content:
          'Chưa lấy được review của tài khoản hiện tại. Hãy kiểm tra tài khoản đã được gán dịch vụ chưa hoặc mở trang Lấy review và bấm Làm mới.',
        senderRole: 'ai',
        senderName: 'Partner AI Pro',
        sentAt: new Date().toISOString(),
      },
    ])
  }

  async function sendAIMessage(content) {
    const wantsChart = isReviewChartRequest(content)
    const wantsAnalysis = isReviewAnalysisRequest(content)

    // Bắt ở frontend trước khi gọi /chat để không bao giờ rơi nhầm sang nhánh SLA của backend.
    if (wantsChart) {
      await sendReviewStatsCard('Xuất biểu đồ review', 'chart')
      return
    }

    if (wantsAnalysis) {
      await sendReviewStatsCard('AI phân tích review', 'analysis')
      return
    }

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


  async function handleMenuSelect(item) {
    if (!item || sending) return

    setSending(true)

    try {
      if (item.mode === 'chart' || item.mode === 'analysis') {
        await sendReviewStatsCard(item.message, item.mode)
      } else {
        await sendAIMessage(item.message)
      }
    } finally {
      setSending(false)
    }
  }


  async function handleScopeSelect(item) {
    if (!item || sending) return

    setSending(true)

    try {
      await sendReviewStatsCard(item.label, item.mode, item.key)
    } catch (err) {
      const status = err.response?.status
      const backendMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data

      let errorText = backendMsg || err.message || 'Không xuất được dữ liệu theo phạm vi đã chọn.'

      if (status) {
        errorText = `HTTP ${status}\n\n${errorText}`
      }

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          content: String(errorText),
          senderRole: 'ai',
          senderName: 'Partner AI Pro',
          sentAt: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  async function quickStatsCard(text, mode) {
    if (sending) return

    setSending(true)

    try {
      await sendReviewStatsCard(text, mode)
    } catch (err) {
      const status = err.response?.status
      const backendMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data

      let errorText = backendMsg || err.message || 'Không xuất được dữ liệu review.'

      if (status) {
        errorText = `HTTP ${status}\n\n${errorText}`
      }

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          content: String(errorText),
          senderRole: 'ai',
          senderName: 'Partner AI Pro',
          sentAt: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
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
                          {(message.senderRole === 'ai' || message.senderRole === 'chart' || message.senderRole === 'analysis' || message.senderRole === 'menu' || message.senderRole === 'scope-choice')
                            ? 'AI'
                            : (message.senderName || 'A')[0].toUpperCase()}
                        </div>
                      )}

                      <div className={styles.bubbleWrap}>
                        <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                          {message.senderRole === 'menu' ? (
                            <PartnerAIMenuBubble onSelect={handleMenuSelect} />
                          ) : message.senderRole === 'scope-choice' ? (
                            <ScopeChoiceBubble
                              mode={message.scopeMode}
                              choices={message.scopeChoices || []}
                              onSelect={handleScopeSelect}
                            />
                          ) : message.senderRole === 'chart' ? (
                            <ReviewChartBubble data={message.chartData} />
                          ) : message.senderRole === 'analysis' ? (
                            <ReviewAnalysisBubble data={message.chartData} />
                          ) : message.senderRole === 'ai' ? (
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
                  <button
                    type="button"
                    onClick={() => setMessages((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        content: 'Partner AI menu',
                        senderRole: 'menu',
                        senderName: 'Partner AI Pro',
                        sentAt: new Date().toISOString(),
                      },
                    ])}
                  >
                    Mở danh mục hỗ trợ
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
