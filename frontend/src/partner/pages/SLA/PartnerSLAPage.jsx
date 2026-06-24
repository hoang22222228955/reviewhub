import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../services/api';
import styles from './PartnerSLAPage.module.css';

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

const STATUS_DESCRIPTION = {
  pending: 'Review đã gửi cho admin và đang chờ kiểm tra.',
  pending_review: 'Review đã gửi cho admin và đang chờ kiểm tra.',
  approved: 'Review đã được admin duyệt và có thể hiển thị trong dữ liệu partner.',
  rejected: 'Review đã bị từ chối. Xem lý do xử lý bên dưới.',
};

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

function mergeReviewState(current, incoming) {
  if (!current) return incoming;

  const currentTone = getStatusTone(current.moderationStatus);
  const incomingTone = getStatusTone(incoming.moderationStatus);

  // Không để dữ liệu pending cũ ghi đè trạng thái đã duyệt / đã từ chối.
  if (currentTone !== 'pending' && incomingTone === 'pending') {
    return { ...incoming, ...current };
  }

  return { ...current, ...incoming };
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeSource(value) {
  const source = String(value || '').trim().toLowerCase();
  if (source === 'google' || source === 'google_maps' || source === 'google-maps') return 'google-maps';
  if (source === 'partner' || source === 'partner_web' || source === 'partner-web') return 'partner-web';
  if (['public', 'public_web', 'public-web', 'user-web', 'user_web', 'community', 'community-web', 'customer-web', 'customer'].includes(source)) return 'public-web';
  return source || 'unknown';
}

function getRawPayload(review) {
  const raw = review?.rawPayload || review?.raw_payload || review?.payload || review?.meta || review?.metadata || null;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

function firstValue(review, keys) {
  const raw = getRawPayload(review);

  for (const key of keys) {
    const direct = review?.[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct).trim();

    const rawValue = raw?.[key];
    if (rawValue !== undefined && rawValue !== null && String(rawValue).trim()) return String(rawValue).trim();
  }

  return '';
}

function extractArray(data) {
  if (Array.isArray(data)) return data;

  const candidates = [
    data?.reviews,
    data?.content,
    data?.items,
    data?.data,
    data?.result,
    data?.rows,
    data?.list,
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) return item;
  }

  return [];
}


function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function getCategoryFolder(review, operatorCode = '') {
  const explicit = firstValue(review, ['categoryFolder', 'category_folder', 'imageCategoryFolder']);
  if (explicit) return explicit;

  const code = normalizeCode(operatorCode || review?.targetCode || review?.operatorCode || review?.partnerCode || review?.target_code);
  if (code.startsWith('KS-')) return 'khachsan';
  if (code.startsWith('MB-')) return 'maybay';
  if (code.startsWith('TH-')) return 'tauhoa';
  if (code.startsWith('TO-')) return 'tour';
  if (code.startsWith('DV-')) return 'dichvukhac';
  if (code.startsWith('PT-')) return 'nhaxe';

  const category = String(review?.category || review?.serviceCategory || review?.service_category || '').toLowerCase();
  if (category.includes('khách') || category.includes('khach')) return 'khachsan';
  if (category.includes('máy') || category.includes('may')) return 'maybay';
  if (category.includes('tàu') || category.includes('tau')) return 'tauhoa';
  if (category.includes('tour')) return 'tour';
  if (category.includes('dịch') || category.includes('dich')) return 'dichvukhac';
  return 'nhaxe';
}

function getImageOperatorCode(review) {
  const candidates = [
    firstValue(review, ['operatorCodeForImage', 'imageOperatorCode']),
    review?.operatorCode,
    review?.operator_code,
    review?.targetCode,
    review?.target_code,
    review?.partnerCode,
    review?.partner_code,
  ].map(normalizeCode).filter(Boolean);

  for (const code of candidates) {
    if (/^(PT|KS|MB|TH|TO|DV)-\d{3}$/.test(code)) return code;
    const hotel = code.match(/^HOTEL-(\d{3})-/);
    if (hotel) return `KS-${hotel[1]}`;
    const bus = code.match(/^BUS-(\d{3})-/);
    if (bus) return `PT-${bus[1]}`;
  }

  return '';
}

function getReviewImageUrl(review) {
  const direct = firstValue(review, [
    'imageUrl',
    'image_url',
    'reviewImage',
    'review_image',
    'reviewImageUrl',
    'review_image_url',
    'photoUrl',
    'photo_url',
    'publicPath',
    'imagePath',
  ]);

  if (direct) return direct;

  const id = String(review?.id || review?.reviewId || review?.review_id || '').trim();
  const match = id.match(/^([A-Z]{2}-\d{3})-(.+)$/i);
  if (!match) return '';

  const operatorCode = getImageOperatorCode(review) || match[1].toUpperCase();
  const imageFileName = firstValue(review, ['imageFileName', 'image_file_name']) || `${match[2].replace(/\.[^.]+$/, '')}.webp`;
  return `/anhdanggia/${getCategoryFolder(review, operatorCode)}/${operatorCode}/${imageFileName}`;
}

function hideBrokenImage(event) {
  const wrap = event.currentTarget.closest('[data-sla-image-wrap]');
  if (wrap) wrap.classList.add(styles.imageBroken);
  event.currentTarget.style.display = 'none';
}

function getStatusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'approved') return 'approved';
  if (value === 'rejected') return 'rejected';
  return 'pending';
}

function getReviewId(review) {
  return String(
    review?.id ||
      review?.reviewId ||
      review?.review_id ||
      `${review?.targetCode || review?.operatorCode || review?.partnerCode || 'REVIEW'}-${review?.createdAt || review?.created_at || Date.now()}`,
  );
}

function getOwnerKey(review) {
  return firstValue(review, [
    'ownerPartnerCode',
    'owner_partner_code',
    'partnerUserId',
    'partner_user_id',
    'submittedBy',
    'submitted_by',
    'senderId',
    'sender_id',
    'accountId',
    'account_id',
    'userId',
    'user_id',
  ]);
}

function getCurrentUserKeys(currentUser) {
  return [
    currentUser?.id,
    currentUser?.userId,
    currentUser?.user_id,
    currentUser?.email,
    currentUser?.partnerCode,
    currentUser?.partner_code,
    currentUser?.ownerPartnerCode,
    currentUser?.owner_partner_code,
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value));
}

function isPartnerSubmittedReview(review) {
  const source = normalizeSource(review?.sourceSystem || review?.source);
  if (source === 'google-maps' || source === 'public-web') return false;
  if (source === 'partner-web') return true;

  const visibility = normalizeText(review?.visibility);
  const scope = normalizeText(review?.dataScope || review?.data_scope || review?.scope);

  return visibility === 'private' || scope === 'private' || Boolean(getOwnerKey(review));
}

function belongsToCurrentPartner(review, currentUser, fromPartnerScopedEndpoint) {
  const owner = normalizeText(getOwnerKey(review));
  const userKeys = getCurrentUserKeys(currentUser);

  if (owner && userKeys.length) {
    return userKeys.some((key) => key && (owner === key || owner.includes(key) || key.includes(owner)));
  }

  // Các endpoint /api/partner/* thường đã tự lọc theo tài khoản đăng nhập.
  return Boolean(fromPartnerScopedEndpoint);
}

function normalizeReview(review = {}, fromPartnerScopedEndpoint = false) {
  const moderationStatus = String(
    firstValue(review, [
      'moderationStatus',
      'moderation_status',
      'reviewStatus',
      'review_status',
      'status',
    ]) || 'pending_review',
  ).trim();

  const targetCode = firstValue(review, [
    'targetCode',
    'target_code',
    'operatorCode',
    'operator_code',
    'partnerCode',
    'partner_code',
    'code',
  ]) || '---';

  const targetName = firstValue(review, [
    'targetName',
    'target_name',
    'operatorName',
    'operator_name',
    'partnerName',
    'partner_name',
    'orgName',
    'org_name',
    'name',
  ]) || 'Không rõ dịch vụ';

  const reviewerName = firstValue(review, [
    'reviewerName',
    'reviewer_name',
    'userName',
    'user_name',
    'authorName',
    'author_name',
    'customerName',
    'customer_name',
  ]) || 'Khách hàng ẩn danh';

  const comment = firstValue(review, [
    'comment',
    'content',
    'reviewText',
    'review_text',
    'text',
    'message',
  ]) || 'Không có nội dung đánh giá.';

  const rejectReason = firstValue(review, [
    'rejectReason',
    'reject_reason',
    'rejectionReason',
    'rejection_reason',
    'adminReason',
    'admin_reason',
    'moderationReason',
    'moderation_reason',
    'reason',
    'aiReason',
    'ai_reason',
  ]);

  return {
    ...review,
    __fromPartnerScopedEndpoint: fromPartnerScopedEndpoint,
    id: getReviewId(review),
    reviewId: review.reviewId || review.review_id || getReviewId(review),
    targetCode,
    targetName,
    reviewerName,
    comment,
    rating: Number(review.rating || review.score || review.stars || 0),
    createdAt: review.createdAt || review.created_at || review.submittedAt || review.submitted_at || new Date().toISOString(),
    updatedAt: review.updatedAt || review.updated_at || review.moderatedAt || review.moderated_at || '',
    moderationStatus,
    status: moderationStatus,
    sourceSystem: review.sourceSystem || review.source_system || review.source || 'partner-web',
    visibility: review.visibility || 'private',
    imageUrl: getReviewImageUrl({ ...review, targetCode, target_code: targetCode, operatorCode: targetCode, operator_code: targetCode }),
    rejectReason,
  };
}

function makeStars(value) {
  const rating = Math.max(0, Math.min(5, Math.round(Number(value || 0))));
  return '★★★★★'.slice(0, rating).padEnd(5, '☆');
}

function formatDate(value) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}

function StatCard({ label, value, sub, tone = 'violet' }) {
  return (
    <article className={`${styles.statCard} ${styles[tone]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </article>
  );
}

function StatusPill({ status }) {
  const tone = getStatusTone(status);

  return (
    <span className={`${styles.statusBadge} ${styles[tone]}`}>
      {STATUS_LABEL[status] || STATUS_LABEL[tone] || 'Chờ duyệt'}
    </span>
  );
}

export default function PartnerSLAPage() {
  const { currentUser } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setMessage('');

    const endpoints = [
      { url: '/api/partner/sla', scoped: true },
      { url: '/api/partner/reviews', scoped: true },
      { url: '/api/reviews/mine', scoped: true },
      { url: '/api/reviews?mine=true&sourceSystem=partner-web&page=0&size=500', scoped: true },
    ];

    const resultMap = new Map();
    const errors = [];

    // Review partner vừa gửi sẽ hiện ngay trong SLA với trạng thái Chờ duyệt.
    readPartnerSlaStorage()
      .map((item) => normalizeReview(item, false))
      .filter((item) => isPartnerSubmittedReview(item))
      .filter((item) => belongsToCurrentPartner(item, currentUser, false))
      .forEach((item) => {
        resultMap.set(item.id, mergeReviewState(resultMap.get(item.id), item));
      });

    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint.url);
        extractArray(response.data)
          .map((item) => normalizeReview(item, endpoint.scoped))
          .filter((item) => isPartnerSubmittedReview(item))
          .filter((item) => belongsToCurrentPartner(item, currentUser, endpoint.scoped))
          .forEach((item) => {
            resultMap.set(item.id, mergeReviewState(resultMap.get(item.id), item));
          });
      } catch (error) {
        errors.push(error);
      }
    }

    const nextReviews = Array.from(resultMap.values()).sort((a, b) => {
      const timeB = new Date(b.createdAt || 0).getTime();
      const timeA = new Date(a.createdAt || 0).getTime();
      return timeB - timeA;
    });

    setReviews(nextReviews);

    if (!nextReviews.length && errors.length === endpoints.length) {
      setMessage('Chưa lấy được danh sách review partner gửi. Kiểm tra lại API partner SLA/reviews ở backend.');
    }

    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadReviews();

    const handleUpdate = () => loadReviews();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('reviewhub:partner-sla-updated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('reviewhub:partner-sla-updated', handleUpdate);
    };
  }, [loadReviews]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((review) => getStatusTone(review.moderationStatus) === 'pending').length;
    const approved = reviews.filter((review) => getStatusTone(review.moderationStatus) === 'approved').length;
    const rejected = reviews.filter((review) => getStatusTone(review.moderationStatus) === 'rejected').length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, pending, approved, rejected, approvalRate };
  }, [reviews]);

  const visibleReviews = useMemo(() => {
    const keyword = normalizeText(searchText);

    return reviews.filter((review) => {
      const tone = getStatusTone(review.moderationStatus);
      const matchesStatus = filterStatus === 'all' || tone === filterStatus;
      const searchable = normalizeText([
        review.id,
        review.targetName,
        review.targetCode,
        review.reviewerName,
        review.comment,
        review.rejectReason,
      ].join(' '));

      return matchesStatus && (!keyword || searchable.includes(keyword));
    });
  }, [reviews, filterStatus, searchText]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>

        <div className={styles.heroText}>
          <span>PARTNER REVIEW STATUS</span>
          <h1>Theo dõi review riêng đã gửi admin</h1>
          <p>
            Khu vực này chỉ hiển thị các review do chính tài khoản partner của bạn gửi lên admin.
            Bạn có thể xem review đang chờ duyệt, đã duyệt, bị từ chối và lý do xử lý.
          </p>
        </div>

        <button type="button" className={styles.refreshBtn} onClick={loadReviews}>
          Làm mới
        </button>
      </section>

      {loading ? (
        <div className={styles.emptyState}>
          <div className={styles.spinner} />
          <p>Đang tải danh sách review riêng…</p>
        </div>
      ) : (
        <>
          <section className={styles.kpiGrid}>
            <StatCard label="Review đã gửi" value={stats.total} sub="Riêng tài khoản này" tone="violet" />
            <StatCard label="Chờ admin duyệt" value={stats.pending} sub="Đang xử lý" tone="orange" />
            <StatCard label="Đã duyệt" value={stats.approved} sub="Có thể hiển thị" tone="green" />
            <StatCard label="Bị từ chối" value={stats.rejected} sub="Có lý do xử lý" tone="red" />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Tiến trình kiểm duyệt</h2>
                <p>Tỷ lệ review riêng của bạn được admin duyệt trong hệ thống.</p>
              </div>

              <div className={styles.approvalMeter}>
                <strong>{stats.approvalRate}%</strong>
                <span>tỷ lệ duyệt</span>
              </div>
            </div>

            <div className={styles.flowBox}>
              <div>
                <span>01</span>
                <strong>Partner gửi review</strong>
                <p>Review được chuyển vào AdminModerationPage.</p>
              </div>
              <div>
                <span>02</span>
                <strong>Admin kiểm duyệt</strong>
                <p>Admin duyệt hoặc từ chối dựa trên nội dung.</p>
              </div>
              <div>
                <span>03</span>
                <strong>Xem kết quả</strong>
                <p>Partner xem trạng thái và lý do nếu bị từ chối.</p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.reviewHeader}>
              <div>
                <h2>Review riêng đã gửi</h2>
                <p>Chỉ hiển thị dữ liệu do tài khoản partner hiện tại gửi lên admin.</p>
              </div>

              <div className={styles.reviewTools}>
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Tìm tên khách, nội dung, mã dịch vụ..."
                />

                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="rejected">Bị từ chối</option>
                </select>
              </div>
            </div>

            {message && <div className={styles.notice}>{message}</div>}

            {visibleReviews.length === 0 ? (
              <div className={styles.emptyReviewBox}>
                <strong>Chưa có review riêng phù hợp.</strong>
                <span>Review partner gửi mới sẽ xuất hiện ngay tại đây với trạng thái Chờ duyệt.</span>
              </div>
            ) : (
              <div className={styles.reviewList}>
                {visibleReviews.map((review) => {
                  const tone = getStatusTone(review.moderationStatus);
                  const statusText = STATUS_DESCRIPTION[review.moderationStatus] || STATUS_DESCRIPTION[tone] || STATUS_DESCRIPTION.pending;

                  return (
                    <article key={review.id} className={`${styles.reviewCard} ${styles[`${tone}Card`]}`}>
                      <div className={styles.reviewCover} data-sla-image-wrap>
                        {review.imageUrl ? (
                          <>
                            <img
                              src={review.imageUrl}
                              alt="Ảnh đánh giá"
                              onError={hideBrokenImage}
                            />
                            <div className={styles.imagePlaceholder}>
                              <span>Ảnh chưa tải được</span>
                            </div>
                          </>
                        ) : (
                          <div className={styles.imagePlaceholder}>
                            <span>Không có ảnh đính kèm</span>
                          </div>
                        )}

                        <StatusPill status={review.moderationStatus} />
                      </div>

                      <div className={styles.reviewBody}>
                        <div className={styles.reviewTop}>
                          <div className={styles.reviewIdentity}>
                            <div className={styles.avatar}>
                              {String(review.reviewerName || 'KH').trim().slice(0, 2).toUpperCase()}
                            </div>

                            <div>
                              <h3>{review.reviewerName}</h3>
                              <span>{review.targetName} · {review.targetCode}</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.reviewMetaGrid}>
                          <div>
                            <label>Ngày gửi</label>
                            <strong>{formatDate(review.createdAt)}</strong>
                          </div>
                          <div>
                            <label>Rating</label>
                            <strong>{makeStars(review.rating)} <em>{Number(review.rating || 0).toFixed(0)}/5</em></strong>
                          </div>
                          <div>
                            <label>Phạm vi</label>
                            <strong>Dữ liệu riêng</strong>
                          </div>
                        </div>

                        <p className={styles.reviewText}>{review.comment}</p>

                        <div className={`${styles.statusExplain} ${styles[tone]}`}>
                          <div>
                            <strong>{STATUS_LABEL[review.moderationStatus] || STATUS_LABEL[tone]}</strong>
                            <span>{statusText}</span>
                          </div>

                          {tone === 'rejected' && (
                            <p>
                              <b>Lý do từ chối:</b>{' '}
                              {review.rejectReason || 'Admin chưa ghi lý do cụ thể. Nếu cần bắt buộc có lý do, backend/admin cần lưu trường rejectReason khi từ chối.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
