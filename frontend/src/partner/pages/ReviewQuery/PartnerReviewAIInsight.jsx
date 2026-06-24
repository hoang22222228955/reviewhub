import { useEffect, useMemo, useState } from 'react'
import styles from './PartnerReviewQueryPage.module.css'

function makeReviewPayload(item) {
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

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function cleanBullet(line) {
  return String(line || '').replace(/^[\-•*]+\s*/, '').trim()
}

function makeEmptyInsight() {
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

function detectSectionKey(value) {
  const text = normalizeText(value)

  if (
    text.includes('khach khen') ||
    text.includes('thuong khen') ||
    text.includes('diem manh') ||
    text.includes('uu diem')
  ) {
    return 'good'
  }

  if (
    text.includes('khach phan anh') ||
    text.includes('thuong che') ||
    text.includes('diem can cai thien') ||
    text.includes('diem yeu') ||
    text.includes('can cai thien')
  ) {
    return 'bad'
  }

  if (text.includes('goi y')) {
    return 'suggestion'
  }

  return ''
}

function parsePercentItem(value) {
  const text = cleanBullet(value)
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

function parsePartnerAIReport(text) {
  const insight = makeEmptyInsight()
  const lines = String(text || '').split('\n')
  let mode = 'summary'
  let currentKey = ''

  lines.forEach((rawLine) => {
    const line = String(rawLine || '').trim()
    if (!line) return

    const heading = line.replace(/^#+\s*/, '').trim()
    const headingText = normalizeText(heading)

    if (headingText === 'ban tom tat') {
      mode = 'summary'
      currentKey = ''
      return
    }

    if (headingText === 'ban tom tat chi tiet' || headingText === 'xem chi tiet') {
      mode = 'detail'
      currentKey = ''
      return
    }

    const sectionKey = detectSectionKey(heading)
    if (sectionKey && (/^#+\s*/.test(line) || /:$/.test(line))) {
      currentKey = sectionKey
      return
    }

    const value = cleanBullet(line)
    if (!value || !currentKey) return

    if (mode === 'detail' && (currentKey === 'good' || currentKey === 'bad')) {
      insight.detail[currentKey].push(parsePercentItem(value))
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

function formatPercent(value, total) {
  if (!total) return '0%'
  return `${((value / total) * 100).toFixed(1).replace('.', ',')}%`
}

function AiLogoIcon() {
  return (
    <div className={styles.partnerAiIconInner} aria-hidden="true">
      <span>Ai</span>
      <i>✦</i>
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 5v5h-5" />
      <path d="M4 19v-5h5" />
      <path d="M6.7 9A7 7 0 0 1 18 6.2L20 10" />
      <path d="M17.3 15A7 7 0 0 1 6 17.8L4 14" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9Z" />
      <path d="M14 3v6h6" />
      <path d="M10 13h4" />
      <path d="M10 17h4" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 18.5 4.5 20V7a2.5 2.5 0 0 1 2.5-2.5h10A2.5 2.5 0 0 1 19.5 7v7A2.5 2.5 0 0 1 17 16.5H9.5L7 18.5Z" />
      <path d="M8.5 9.5h7" />
      <path d="M8.5 12.5h4.5" />
    </svg>
  )
}

function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10.2h.01" />
      <path d="M15 10.2h.01" />
      <path d="M8.5 14.1c.9 1.6 2.3 2.4 3.5 2.4s2.6-.8 3.5-2.4" />
    </svg>
  )
}

function SadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10.2h.01" />
      <path d="M15 10.2h.01" />
      <path d="M8.7 16c.8-1.2 2-1.9 3.3-1.9s2.5.7 3.3 1.9" />
    </svg>
  )
}

function MehIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10.2h.01" />
      <path d="M15 10.2h.01" />
      <path d="M9 15h6" />
    </svg>
  )
}

function ThumbsUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 10V6.8A2.8 2.8 0 0 1 11.8 4h.4l.7 4.2 2.4 2.6V18H8.2A2.2 2.2 0 0 1 6 15.8V10Z" />
      <path d="M6 10H4.2A1.2 1.2 0 0 0 3 11.2v4.6A1.2 1.2 0 0 0 4.2 17H6" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4" />
      <path d="M12 15.5h.01" />
    </svg>
  )
}

function SparkIdeaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.8a6.2 6.2 0 0 0-3.9 11c.8.6 1.2 1.3 1.4 2.2h5c.2-.9.6-1.6 1.4-2.2A6.2 6.2 0 0 0 12 3.8Z" />
      <path d="M9.8 19h4.4" />
      <path d="M10.4 21h3.2" />
      <path d="M4.5 10.5h1.6" />
      <path d="M17.9 10.5h1.6" />
      <path d="M7.3 6.5 6.2 5.4" />
      <path d="M16.7 6.5l1.1-1.1" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 15 6-6 6 6" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.2v5" />
      <path d="M12 7.8h.01" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.8 12s3.4-5.5 9.2-5.5S21.2 12 21.2 12s-3.4 5.5-9.2 5.5S2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 3.5 20.5 20.5" />
      <path d="M9.8 6.8A9.6 9.6 0 0 1 12 6.5c5.8 0 9.2 5.5 9.2 5.5a15.2 15.2 0 0 1-2.4 3.1" />
      <path d="M14.1 14.1A2.9 2.9 0 0 1 9.9 9.9" />
      <path d="M6.6 8.2A15.1 15.1 0 0 0 2.8 12s3.4 5.5 9.2 5.5a9.8 9.8 0 0 0 3.7-.7" />
    </svg>
  )
}

function CheckOutlineIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.3 2.3 4.7-5" />
    </svg>
  )
}

export default function PartnerReviewAIInsight({
  reviews,
  filters,
  aiReport,
  aiLoading,
  aiError,
  onAnalyze,
  onRefresh,
}) {
  const [showDetail, setShowDetail] = useState(false)
  const [reportHidden, setReportHidden] = useState(false)

  const totalReviews = Array.isArray(reviews) ? reviews.length : 0
  const goodReviews = Array.isArray(reviews)
    ? reviews.filter((item) => Number(item.rating || 0) >= 4).length
    : 0
  const badReviews = Array.isArray(reviews)
    ? reviews.filter((item) => Number(item.rating || 0) <= 2).length
    : 0
  const neutralReviews = Math.max(totalReviews - goodReviews - badReviews, 0)

  const parsedInsight = useMemo(() => parsePartnerAIReport(aiReport), [aiReport])

  useEffect(() => {
    setShowDetail(false)
    setReportHidden(false)
  }, [aiReport, aiError])

  const summaryGood = parsedInsight.summary.good.slice(0, 3)
  const summaryBad = parsedInsight.summary.bad.slice(0, 3)
  const summarySuggestion = parsedInsight.summary.suggestion.join(' ')
  const detailGood = parsedInsight.detail.good.slice(0, 4)
  const detailBad = parsedInsight.detail.bad.slice(0, 4)
  const detailSuggestion = parsedInsight.detail.suggestion.slice(0, 3)
  const hasSummary = Boolean(summaryGood.length || summaryBad.length || summarySuggestion)
  const hasDetail = Boolean(detailGood.length || detailBad.length || detailSuggestion.length)

  return (
    <section className={styles.partnerAiCard}>
      <div className={styles.partnerAiHeader}>
        <div className={styles.partnerAiHeaderMain}>
          <div className={styles.partnerAiIcon}>
            <AiLogoIcon />
          </div>

          <div className={styles.partnerAiTitleBlock}>
            <h3>AI phân tích review</h3>
            <p>Tóm tắt nhanh đánh giá của khách hàng dành cho dịch vụ.</p>
          </div>
        </div>

        <button
          type="button"
          className={styles.partnerAiRefresh}
          onClick={onRefresh || onAnalyze}
          disabled={aiLoading || totalReviews === 0}
        >
          <RefreshIcon />
          <span>Làm mới</span>
        </button>
      </div>

      <div className={styles.aiMiniStats}>
        <article className={styles.aiMiniStat}>
          <span className={`${styles.aiMiniIcon} ${styles.aiMiniIconPrimary}`}>
            <ReviewIcon />
          </span>
          <div className={styles.aiMiniInfo}>
            <p>Tổng review</p>
            <strong>{totalReviews}</strong>
            <small>100% đánh giá thật</small>
          </div>
        </article>

        <article className={styles.aiMiniStat}>
          <span className={`${styles.aiMiniIcon} ${styles.aiMiniIconGood}`}>
            <SmileIcon />
          </span>
          <div className={styles.aiMiniInfo}>
            <p>Tốt</p>
            <strong className={styles.aiMiniGood}>{goodReviews}</strong>
            <small>{formatPercent(goodReviews, totalReviews)}</small>
          </div>
        </article>

        <article className={styles.aiMiniStat}>
          <span className={`${styles.aiMiniIcon} ${styles.aiMiniIconBad}`}>
            <SadIcon />
          </span>
          <div className={styles.aiMiniInfo}>
            <p>Xấu</p>
            <strong className={styles.aiMiniBad}>{badReviews}</strong>
            <small>{formatPercent(badReviews, totalReviews)}</small>
          </div>
        </article>

        <article className={styles.aiMiniStat}>
          <span className={`${styles.aiMiniIcon} ${styles.aiMiniIconNeutral}`}>
            <MehIcon />
          </span>
          <div className={styles.aiMiniInfo}>
            <p>Trung lập</p>
            <strong className={styles.aiMiniNeutral}>{neutralReviews}</strong>
            <small>{formatPercent(neutralReviews, totalReviews)}</small>
          </div>
        </article>
      </div>

      <button
        type="button"
        className={styles.partnerAiAction}
        onClick={onAnalyze}
        disabled={aiLoading || totalReviews === 0}
      >
        <span className={styles.partnerAiActionIcon}>
          <DocumentIcon />
        </span>
        <span className={styles.partnerAiActionBody}>
          <strong>AI viết báo cáo</strong>
          <small>
            {aiLoading ? 'AI đang tạo báo cáo chi tiết...' : `Tạo báo cáo chi tiết từ ${totalReviews} review`}
          </small>
        </span>
        <span className={styles.partnerAiActionArrow}>
          <ChevronRightIcon />
        </span>
      </button>

      {aiError && <div className={styles.partnerAiError}>✗ {aiError}</div>}

      {!aiReport && !aiLoading && !aiError && (
        <div className={styles.partnerAiEmpty}>
          Nhấn “AI viết báo cáo” để tạo bản tóm tắt nhanh gồm: khách khen nhiều về gì, phản ánh nhiều về gì và gợi ý ưu tiên cải thiện.
        </div>
      )}

      {aiLoading && (
        <div className={styles.partnerAiLoading}>
          <span />
          AI đang đọc dữ liệu review và tổng hợp báo cáo...
        </div>
      )}

      {aiReport && hasSummary && reportHidden && (
        <div className={styles.partnerAiCollapsedReport}>
          <div>
            <strong>Báo cáo AI đang được ẩn</strong>
            <p>Bấm hiện lại để mở phần tóm tắt vừa phân tích.</p>
          </div>

          <button type="button" onClick={() => setReportHidden(false)}>
            <EyeIcon />
            <span>Hiện lại</span>
          </button>
        </div>
      )}

      {aiReport && hasSummary && !reportHidden && !showDetail && (
        <div className={styles.partnerAiSummaryCard}>
          <h4 className={styles.partnerAiSectionTitle}>Bản tóm tắt</h4>

          <div className={styles.partnerAiSummaryGrid}>
            <section className={styles.partnerAiSummaryItem}>
              <div className={styles.partnerAiSummaryHead}>
                <span className={`${styles.partnerAiSummaryIcon} ${styles.partnerAiSummaryGoodIcon}`}>
                  <ThumbsUpIcon />
                </span>
                <strong>Điểm được khen nhiều</strong>
              </div>
              <ul className={styles.partnerAiBulletList}>
                {summaryGood.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className={styles.partnerAiSummaryItem}>
              <div className={styles.partnerAiSummaryHead}>
                <span className={`${styles.partnerAiSummaryIcon} ${styles.partnerAiSummaryBadIcon}`}>
                  <AlertIcon />
                </span>
                <strong>Vấn đề bị phản ánh nhiều</strong>
              </div>
              <ul className={styles.partnerAiBulletList}>
                {summaryBad.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className={styles.partnerAiSummaryItem}>
              <div className={styles.partnerAiSummaryHead}>
                <span className={`${styles.partnerAiSummaryIcon} ${styles.partnerAiSummaryIdeaIcon}`}>
                  <SparkIdeaIcon />
                </span>
                <strong>Gợi ý từ AI</strong>
              </div>
              <p className={styles.partnerAiSummaryText}>{summarySuggestion}</p>
            </section>
          </div>

          <div className={styles.partnerAiToggleCenter}>
            {hasDetail && (
              <button type="button" className={styles.partnerAiToggleButton} onClick={() => setShowDetail(true)}>
                <span>Xem chi tiết</span>
                <ChevronDownIcon />
              </button>
            )}

            <button type="button" className={styles.partnerAiHideButton} onClick={() => setReportHidden(true)}>
              <EyeOffIcon />
              <span>Ẩn báo cáo</span>
            </button>
          </div>
        </div>
      )}

      {aiReport && hasSummary && !reportHidden && showDetail && (
        <div className={styles.partnerAiSummaryCard}>
          <h4 className={styles.partnerAiSectionTitle}>Bản tóm tắt chi tiết</h4>

          <div className={`${styles.partnerAiSummaryGrid} ${styles.partnerAiDetailGrid}`}>
            <section className={styles.partnerAiSummaryItem}>
              <div className={styles.partnerAiSummaryHead}>
                <span className={`${styles.partnerAiSummaryIcon} ${styles.partnerAiSummaryGoodIcon}`}>
                  <ThumbsUpIcon />
                </span>
                <strong>Điểm được khen nhiều</strong>
              </div>

              <div className={styles.partnerAiMetricList}>
                {detailGood.map((item) => (
                  <div key={`${item.label}-${item.percent}`} className={styles.partnerAiMetricRow}>
                    <div className={styles.partnerAiMetricLabelWrap}>
                      <i className={`${styles.partnerAiDot} ${styles.partnerAiGoodDot}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.percent && <b className={`${styles.partnerAiPercentPill} ${styles.partnerAiPercentGood}`}>{item.percent}</b>}
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.partnerAiSummaryItem}>
              <div className={styles.partnerAiSummaryHead}>
                <span className={`${styles.partnerAiSummaryIcon} ${styles.partnerAiSummaryBadIcon}`}>
                  <AlertIcon />
                </span>
                <strong>Vấn đề bị phản ánh nhiều</strong>
              </div>

              <div className={styles.partnerAiMetricList}>
                {detailBad.map((item) => (
                  <div key={`${item.label}-${item.percent}`} className={styles.partnerAiMetricRow}>
                    <div className={styles.partnerAiMetricLabelWrap}>
                      <i className={`${styles.partnerAiDot} ${styles.partnerAiBadDot}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.percent && <b className={`${styles.partnerAiPercentPill} ${styles.partnerAiPercentBad}`}>{item.percent}</b>}
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.partnerAiSummaryItem}>
              <div className={styles.partnerAiSummaryHead}>
                <span className={`${styles.partnerAiSummaryIcon} ${styles.partnerAiSummaryIdeaIcon}`}>
                  <SparkIdeaIcon />
                </span>
                <strong>Gợi ý từ AI</strong>
              </div>

              <div className={styles.partnerAiSuggestionList}>
                {detailSuggestion.map((item) => (
                  <div key={item} className={styles.partnerAiSuggestionRow}>
                    <span className={styles.partnerAiCheckIcon}>
                      <CheckOutlineIcon />
                    </span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className={styles.partnerAiDetailFooter}>
            <p className={styles.partnerAiDetailNote}>
              <InfoIcon />
              <span>Dữ liệu dựa trên {totalReviews} đánh giá gần nhất</span>
            </p>

            <div className={styles.partnerAiDetailActions}>
              <button type="button" className={styles.partnerAiToggleButton} onClick={() => setShowDetail(false)}>
                <span>Thu gọn</span>
                <ChevronUpIcon />
              </button>

              <button type="button" className={styles.partnerAiHideButton} onClick={() => setReportHidden(true)}>
                <EyeOffIcon />
                <span>Ẩn báo cáo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export { makeReviewPayload }
