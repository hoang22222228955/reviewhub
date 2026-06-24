import { useState } from 'react'
import { useAuth } from '../../../auth/context/AuthContext'
import ReviewSubmitForm from '../../components/ReviewSubmitForm/ReviewSubmitForm'
import ReviewPreview from '../../components/ReviewPreview/ReviewPreview'


const PARTNER_SLA_STORAGE_KEY = 'reviewhub-partner-sla-submitted-reviews';

function readPartnerSlaStorage() {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(PARTNER_SLA_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getReviewId(review) {
  return String(
    review?.id ||
      review?.reviewId ||
      review?.review_id ||
      `${review?.targetCode || review?.operatorCode || review?.partnerCode || 'REVIEW'}-${Date.now()}`,
  );
}

function normalizePartnerSlaDraft(review = {}, currentUser = {}) {
  const id = getReviewId(review);
  const targetCode =
    review.targetCode ||
    review.target_code ||
    review.operatorCode ||
    review.operator_code ||
    review.partnerCode ||
    review.partner_code ||
    currentUser?.assignedOperatorCode ||
    currentUser?.partnerCode ||
    '---';

  const targetName =
    review.targetName ||
    review.target_name ||
    review.operatorName ||
    review.operator_name ||
    review.partnerName ||
    review.partner_name ||
    currentUser?.assignedOperatorName ||
    currentUser?.orgName ||
    currentUser?.businessName ||
    currentUser?.name ||
    'Dịch vụ đã chọn';

  return {
    ...review,
    id,
    reviewId: review.reviewId || review.review_id || id,
    targetCode,
    target_code: review.target_code || targetCode,
    operatorCode: review.operatorCode || review.operator_code || targetCode,
    operator_code: review.operator_code || review.operatorCode || targetCode,
    partnerCode: review.partnerCode || review.partner_code || targetCode,
    partner_code: review.partner_code || review.partnerCode || targetCode,
    targetName,
    target_name: review.target_name || targetName,
    operatorName: review.operatorName || review.operator_name || targetName,
    operator_name: review.operator_name || review.operatorName || targetName,
    reviewerName: review.reviewerName || review.reviewer_name || review.userName || review.customerName || 'Khách hàng ẩn danh',
    comment: review.comment || review.content || review.reviewText || review.text || 'Không có nội dung đánh giá.',
    rating: Number(review.rating || review.score || review.stars || 0),
    createdAt: review.createdAt || review.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    moderationStatus: 'pending_review',
    status: 'pending_review',
    reviewStatus: 'pending_review',
    sourceSystem: 'partner-web',
    source: 'partner-web',
    visibility: 'private',
    dataScope: 'private',
    data_scope: 'private',
    ownerPartnerCode: review.ownerPartnerCode || review.owner_partner_code || currentUser?.id || currentUser?.userId || currentUser?.email || '',
    owner_partner_code: review.owner_partner_code || review.ownerPartnerCode || currentUser?.id || currentUser?.userId || currentUser?.email || '',
    userId: review.userId || review.user_id || currentUser?.id || currentUser?.userId || '',
    userEmail: review.userEmail || review.user_email || currentUser?.email || '',
    partnerAccountEmail: review.partnerAccountEmail || currentUser?.email || '',
    partnerAccountName: review.partnerAccountName || currentUser?.name || currentUser?.orgName || currentUser?.businessName || '',
    imageUrl: review.imageUrl || review.image_url || review.reviewImage || review.review_image || review.publicPath || '',
    reviewImage: review.reviewImage || review.review_image || review.imageUrl || review.image_url || review.publicPath || '',
    imageFileName: review.imageFileName || review.image_file_name || '',
  };
}

function savePartnerSlaPendingReview(review, currentUser) {
  if (typeof window === 'undefined' || !review) return;

  const normalized = normalizePartnerSlaDraft(review, currentUser);
  const current = readPartnerSlaStorage();
  const next = [normalized, ...current.filter((item) => String(getReviewId(item)) !== String(normalized.id))];

  window.localStorage.setItem(PARTNER_SLA_STORAGE_KEY, JSON.stringify(next.slice(0, 500)));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('reviewhub:partner-sla-updated', { detail: normalized }));
}

export default function PartnerReviewSubmitPage() {
  const { currentUser, consumeQuota } = useAuth()
  const [createdReview, setCreatedReview] = useState(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 18 }}>
      <ReviewSubmitForm
        partnerName={currentUser?.orgName || currentUser?.businessName || currentUser?.name || 'Đối tác'}
        onSubmitSuccess={(review) => {
          setCreatedReview(review)
          consumeQuota(1)
          savePartnerSlaPendingReview(review, currentUser)
        }}
      />
      <ReviewPreview review={createdReview} />
    </div>
  )
}
