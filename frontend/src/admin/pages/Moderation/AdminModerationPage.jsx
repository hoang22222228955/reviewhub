import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../../services/api';
import styles from './AdminModerationPage.module.css';

function nowTime() {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const PAGE_SIZE = 12;

function normalizeSource(value) {
  const source = String(value || '').trim().toLowerCase();
  if (source === 'google' || source === 'google_maps' || source === 'google-maps') return 'google-maps';
  if (source === 'partner' || source === 'partner_web' || source === 'partner-web') return 'partner-web';
  if (['public', 'public_web', 'public-web', 'user-web', 'user_web', 'community', 'community-web', 'customer-web', 'customer'].includes(source)) return 'public-web';
  return source || 'unknown';
}

function getSourceLabel(value) {
  const source = normalizeSource(value);
  if (source === 'google-maps') return 'Google Maps';
  if (source === 'partner-web') return 'Partner gửi';
  if (source === 'public-web') return 'Người dùng public';
  return 'Nguồn khác';
}

function getSourceBadgeClass(styles, value) {
  const source = normalizeSource(value);
  if (source === 'google-maps') return styles.sourceGoogle;
  if (source === 'partner-web') return styles.sourcePartner;
  if (source === 'public-web') return styles.sourcePublic;
  return styles.sourceOther;
}

function isPartnerPrivateReview(item) {
  return normalizeSource(item?.sourceSystem || item?.source) === 'partner-web';
}

function isPublicSharedReview(item) {
  const source = normalizeSource(item?.sourceSystem || item?.source);
  return source === 'google-maps' || source === 'public-web';
}

function isEmailLike(value) {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(String(value || '').trim());
}

function sameText(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function normalizeLookupKey(value) {
  return String(value || '').trim().toLowerCase();
}

function buildPartnerAccountLookup(partners = []) {
  const lookup = new Map();

  const push = (key, account) => {
    const normalized = normalizeLookupKey(key);
    if (!normalized || lookup.has(normalized)) return;
    lookup.set(normalized, account);
  };

  partners.forEach(partner => {
    const accountName = String(
      partner?.name ||
      partner?.fullName ||
      partner?.full_name ||
      partner?.displayName ||
      partner?.display_name ||
      ''
    ).trim();

    const accountEmail = String(
      partner?.email ||
      partner?.userEmail ||
      partner?.user_email ||
      partner?.accountEmail ||
      partner?.account_email ||
      ''
    ).trim();

    const account = {
      ...partner,
      accountName,
      accountEmail,
      accountId: String(partner?.id || partner?.userId || partner?.user_id || '').trim(),
    };

    [
      partner?.id,
      partner?.userId,
      partner?.user_id,
      partner?.accountId,
      partner?.account_id,
      partner?.email,
      partner?.userEmail,
      partner?.user_email,
      partner?.accountEmail,
      partner?.account_email,
    ].forEach(key => push(key, account));
  });

  return lookup;
}

function getPartnerOwnerKey(item) {
  return getFirstValue(item, [
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

function getPartnerSenderAccountInfo(item, partnerAccountLookup = new Map()) {
  if (!isPartnerPrivateReview(item)) {
    return { summary: '', name: '', email: '', ownerCode: '' };
  }

  const directEmail = getFirstValue(item, [
    'partnerAccountEmail',
    'partner_account_email',
    'partnerEmail',
    'partner_email',
    'ownerPartnerEmail',
    'owner_partner_email',
    'submittedByEmail',
    'submitted_by_email',
    'senderEmail',
    'sender_email',
    'accountEmail',
    'account_email',
    'userEmail',
    'user_email',
    'registeredEmail',
    'registered_email',
    'loginEmail',
    'login_email',
  ]);

  const rawName = getFirstValue(item, [
    'partnerAccountName',
    'partner_account_name',
    'submittedByName',
    'submitted_by_name',
    'senderName',
    'sender_name',
    'accountName',
    'account_name',
    'userName',
    'user_name',
    'registeredName',
    'registered_name',
    'loginName',
    'login_name',
    'fullName',
    'full_name',
    'displayName',
    'display_name',
  ]);

  const ownerCode = getPartnerOwnerKey(item);

  const lookupKeys = [
    ownerCode,
    directEmail,
    getFirstValue(item, ['partnerAccountId', 'partner_account_id', 'accountId', 'account_id', 'userId', 'user_id']),
  ].filter(Boolean);

  let matchedAccount = null;

  for (const key of lookupKeys) {
    const found = partnerAccountLookup.get(normalizeLookupKey(key));
    if (found) {
      matchedAccount = found;
      break;
    }
  }

  // Không dùng tên dịch vụ/nhà xe/khách sạn làm tên tài khoản gửi.
  const serviceNames = [
    item?.targetName,
    item?.target_name,
    item?.operatorName,
    item?.operator_name,
    item?.partnerName,
    item?.partner_name,
    item?.orgName,
    item?.org_name,
  ].filter(Boolean);

  const safeRawName = rawName && !serviceNames.some(name => sameText(name, rawName))
    ? rawName
    : '';

  const accountName = matchedAccount?.accountName || safeRawName || '';
  const emailFromCode = isEmailLike(ownerCode) ? ownerCode : '';
  const accountEmail = matchedAccount?.accountEmail || directEmail || emailFromCode || '';

  let summary = '';
  if (accountName && accountEmail) summary = `${accountName} · ${accountEmail}`;
  else if (accountEmail) summary = accountEmail;
  else if (accountName) summary = accountName;
  else if (ownerCode) summary = `Mã tài khoản: ${ownerCode}`;
  else summary = 'Chưa có tên / gmail tài khoản gửi';

  return {
    summary,
    name: accountName,
    email: accountEmail,
    ownerCode,
  };
}

function getPartnerSenderAccount(item, partnerAccountLookup = new Map()) {
  return getPartnerSenderAccountInfo(item, partnerAccountLookup).summary;
}

function getPartnerSenderMeta(item, partnerAccountLookup = new Map()) {
  const info = getPartnerSenderAccountInfo(item, partnerAccountLookup);
  const summary = String(info.summary || '').trim();

  let title = info.name || '';
  let subtitle = info.email || '';

  if (!title && summary.includes(' · ')) {
    const parts = summary.split(' · ');
    title = parts[0]?.trim() || '';
    subtitle = parts.slice(1).join(' · ').trim();
  }

  if (!title && info.email) title = info.email;
  if (!subtitle && info.ownerCode && !isEmailLike(info.ownerCode)) subtitle = `Mã tài khoản: ${info.ownerCode}`;
  if (!title && info.ownerCode) title = 'Tài khoản partner';
  if (!title && summary) title = summary;
  if (!subtitle && title && title !== summary && summary) subtitle = summary;
  if (!subtitle && title && !title.startsWith('Mã tài khoản:')) subtitle = 'Review riêng của tài khoản này';

  return {
    title: title || 'Chưa có tên tài khoản',
    subtitle: subtitle || 'Chưa có gmail tài khoản gửi',
    initial: getInitial(title || subtitle || 'P'),
  };
}

function PartnerSenderHighlight({ item, partnerAccountLookup = new Map(), compact = false }) {
  const meta = getPartnerSenderMeta(item, partnerAccountLookup);

  return (
    <div className={`${styles.partnerSenderBox} ${compact ? styles.partnerSenderBoxCompact : ''}`}>
      <div className={styles.partnerSenderBody}>
        <div className={styles.partnerSenderContent}>
          <strong>{meta.title}</strong>
          <span>{meta.subtitle}</span>
        </div>
      </div>
    </div>
  );
}


function getRawPayload(item) {
  const raw = item?.rawPayload || item?.raw_payload || item?.payload || item?.meta || item?.metadata || null;
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

function getFirstValue(item, keys) {
  const raw = getRawPayload(item);

  for (const key of keys) {
    const direct = item?.[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct).trim();

    const rawValue = raw?.[key];
    if (rawValue !== undefined && rawValue !== null && String(rawValue).trim()) return String(rawValue).trim();
  }

  return '';
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function getCategoryFolder(item) {
  const explicit = getFirstValue(item, ['categoryFolder', 'category_folder', 'imageCategoryFolder']);
  if (explicit) return explicit;

  const category = String(item?.category || item?.serviceCategory || '').toLowerCase();
  if (category.includes('khách') || category.includes('khach')) return 'khachsan';
  if (category.includes('máy') || category.includes('may')) return 'maybay';
  if (category.includes('tàu') || category.includes('tau')) return 'tauhoa';
  if (category.includes('tour')) return 'tour';
  if (category.includes('dịch') || category.includes('dich')) return 'dichvukhac';
  return 'nhaxe';
}

function getImageOperatorCode(item) {
  const candidates = [
    getFirstValue(item, ['operatorCodeForImage', 'imageOperatorCode']),
    item?.operatorCode,
    item?.operator_code,
    item?.targetCode,
    item?.target_code,
    item?.partnerCode,
    item?.partner_code,
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

function getReviewImageUrl(item) {
  const direct = getFirstValue(item, [
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

  const id = String(item?.id || item?.reviewId || item?.review_id || '').trim();
  const match = id.match(/^([A-Z]{2}-\d{3})-(.+)$/i);
  if (!match) return '';

  const operatorCode = getImageOperatorCode(item) || match[1].toUpperCase();
  const imageFileName = getFirstValue(item, ['imageFileName', 'image_file_name']) || `${match[2].replace(/\.[^.]+$/, '')}.webp`;
  return `/anhdanggia/${getCategoryFolder(item)}/${operatorCode}/${imageFileName}`;
}

function hideBrokenImage(event) {
  const wrap = event.currentTarget.closest('[data-review-image-wrap]');
  if (wrap) wrap.style.display = 'none';
  else event.currentTarget.style.display = 'none';
}


function confidenceLevel(score) {
  if (score >= 0.9) return 'Rủi ro cao';
  if (score >= 0.5) return 'Cần xem lại';
  return 'Rủi ro thấp';
}

function confidenceClass(score) {
  if (score >= 0.9) return styles.badgeDanger;
  if (score >= 0.5) return styles.badgeWarning;
  return styles.badgeSuccess;
}

function getInitial(value) {
  return String(value || 'R').trim().slice(0, 1).toUpperCase();
}

function normalizeAIAction(action) {
  const raw = String(action || '').trim().toLowerCase();

  if (
    [
      'approve',
      'approved',
      'yes',
      'y',
      'ok',
      'accept',
      'accepted',
      'duyet',
      'duyệt',
      'nen_duyet',
      'nên duyệt',
      'approve_review',
    ].includes(raw)
  ) {
    return 'approve';
  }

  if (
    [
      'reject',
      'rejected',
      'no',
      'n',
      'deny',
      'denied',
      'refuse',
      'tu_choi',
      'từ chối',
      'nen_tu_choi',
      'nên từ chối',
      'reject_review',
    ].includes(raw)
  ) {
    return 'reject';
  }

  return 'manual';
}

function getReviewId(item) {
  return item?.id || item?.reviewId || item?.review_id || item?.reviewID || null;
}

function getAIActionLabel(action) {
  const normalized = normalizeAIAction(action);
  if (normalized === 'approve') return 'Nên duyệt';
  if (normalized === 'reject') return 'Nên từ chối';
  return 'Cần admin xem';
}

function getAIActionClass(action) {
  const normalized = normalizeAIAction(action);
  if (normalized === 'approve') return styles.aiApprove;
  if (normalized === 'reject') return styles.aiReject;
  return styles.aiManual;
}


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

function syncPartnerSlaReviewStatus(review, status) {
  if (typeof window === 'undefined' || !review || !isPartnerPrivateReview(review)) return;

  const id = String(getReviewId(review) || review.id || review.reviewId || review.review_id || '').trim();
  if (!id) return;

  const current = readPartnerSlaStorage();
  const rejectReason = getFirstValue(review, [
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

  const updated = {
    ...review,
    id,
    reviewId: review.reviewId || review.review_id || id,
    moderationStatus: status,
    status,
    reviewStatus: status,
    sourceSystem: 'partner-web',
    source: 'partner-web',
    visibility: 'private',
    dataScope: 'private',
    data_scope: 'private',
    updatedAt: new Date().toISOString(),
    moderatedAt: new Date().toISOString(),
    rejectReason: status === 'rejected'
      ? (review.rejectReason || review.reject_reason || rejectReason || 'Admin đã từ chối review này.')
      : (review.rejectReason || review.reject_reason || ''),
  };

  const next = [updated, ...current.filter((item) => String(getReviewId(item) || item.id || item.reviewId) !== id)];
  window.localStorage.setItem(PARTNER_SLA_STORAGE_KEY, JSON.stringify(next.slice(0, 500)));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('reviewhub:partner-sla-updated', { detail: updated }));
}

export default function AdminModerationPage() {
  const [queue, setQueue] = useState([]);
  const [partnerAccounts, setPartnerAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState('');
  const [selectedCarrierKey, setSelectedCarrierKey] = useState('all');
  const [bulkProgress, setBulkProgress] = useState(null);
  const [aiPreview, setAiPreview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // --- Crawl section ---
  const [operators, setOperators] = useState([]);
  const [syncOpCode, setSyncOpCode] = useState('');
  const [syncEmail, setSyncEmail] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState([]);
  const [syncResult, setSyncResult] = useState(null);
  const [syncExpanded, setSyncExpanded] = useState(false);
  const syncLogRef = useRef(null);

  const stopBulkRef = useRef(false);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/review-ai/pending');
      setQueue(Array.isArray(res.data) ? res.data : []);
      setAiPreview(null);
    } catch (err) {
      console.log(err);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    api.get('/api/admin/partners')
      .then(res => setPartnerAccounts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPartnerAccounts([]));
  }, []);

  // Load operators for crawl
  useEffect(() => {
    api.get('/api/operators').then(res => {
      const list = res.data || [];
      setOperators(list);
      if (list.length) setSyncOpCode(list[0].operatorCode);
    }).catch(() => {});
  }, []);

  // Auto-scroll sync log
  useEffect(() => {
    if (syncLogRef.current) syncLogRef.current.scrollTop = syncLogRef.current.scrollHeight;
  }, [syncLog]);

  async function handleCrawl() {
    if (!syncOpCode || syncing) return;
    setSyncing(true);
    setSyncResult(null);
    setSyncLog([]);
    setSyncExpanded(true);

    const op = operators.find(o => o.operatorCode === syncOpCode);
    const name = op ? op.operatorName : syncOpCode;

    setSyncLog([
      `[${nowTime()}] Bắt đầu crawl Google Maps: ${name} (${syncOpCode})`,
      `[${nowTime()}] Đang mở Chrome và tìm kiếm...`,
    ]);

    try {
      let url = `/api/admin/sync-reviews?operatorCode=${encodeURIComponent(syncOpCode)}`;
      if (syncEmail.trim()) url += `&partnerEmail=${encodeURIComponent(syncEmail.trim())}`;
      const res = await api.post(url, null, { timeout: 600000 });
      const data = res.data;

      setSyncLog(prev => [
        ...prev,
        `[${nowTime()}] ✓ Crawl hoàn tất.`,
        `[${nowTime()}] ✓ Import vào database xong.`,
        ...(syncEmail.trim() ? [`[${nowTime()}] ✓ Đã gán tài khoản ${syncEmail.trim()} vào dịch vụ.`] : []),
        `[${nowTime()}] Kết quả: ${data.inserted ?? 0} review mới, ${data.skipped ?? 0} bỏ qua, ${data.failed ?? 0} lỗi.`,
      ]);
      setSyncResult({ ok: true, inserted: data.inserted ?? 0 });
      // Refresh moderation queue + auto-filter to this operator
      await fetchQueue();
      if (data.inserted > 0) {
        const opName = op ? op.operatorName : syncOpCode;
        const key = `${syncOpCode}__${opName}`;
        setSelectedCarrierKey(key);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi không xác định.';
      setSyncLog(prev => [...prev, `[${nowTime()}] ✗ Lỗi: ${msg}`]);
      setSyncResult({ ok: false, message: msg });
    } finally {
      setSyncing(false);
    }
  }

  async function handleModeration(id, action) {
    if (!id || actionLoading) return;

    const reviewBeforeAction =
      queue.find(item => String(getReviewId(item) || item.id) === String(id)) ||
      (String(getReviewId(selectedReview) || selectedReview?.id) === String(id) ? selectedReview : null);

    setActionLoading(`${id}_${action}`);

    try {
      await api.post(`/api/admin/review-ai/${id}/${action}`);

      syncPartnerSlaReviewStatus(
        reviewBeforeAction,
        action === 'approve' ? 'approved' : 'rejected',
      );

      setQueue(prev => prev.filter(item => item.id !== id));

      if (selectedReview?.id === id) {
        setSelectedReview(null);
      }

      setAiPreview(null);
    } catch (err) {
      console.error(err);
      alert(action === 'approve' ? 'Lỗi khi duyệt review' : 'Lỗi khi từ chối review');
    } finally {
      setActionLoading('');
    }
  }

  const partnerAccountLookup = useMemo(() => buildPartnerAccountLookup(partnerAccounts), [partnerAccounts]);

  const filteredQueue = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return queue.filter(item => {
      const score = Number(item.aiConfidence || 0);

      const risk =
        score >= 0.9
          ? 'high'
          : score >= 0.5
          ? 'medium'
          : 'low';

      const matchKeyword =
        !q ||
        [
          item.targetName,
          item.targetCode,
          item.reviewerName,
          item.comment,
          item.aiReason,
          item.sourceSystem,
          getSourceLabel(item.sourceSystem),
          item.ownerPartnerCode,
          getPartnerSenderAccount(item, partnerAccountLookup),
        ]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q));

      const matchRisk = riskFilter === 'all' || riskFilter === risk;
      const matchSource = sourceFilter === 'all' || normalizeSource(item.sourceSystem || item.source) === sourceFilter;

      return matchKeyword && matchRisk && matchSource;
    });
  }, [queue, keyword, riskFilter, sourceFilter, partnerAccountLookup]);

  const moderationStats = useMemo(() => {
    const google = filteredQueue.filter(item => normalizeSource(item.sourceSystem || item.source) === 'google-maps').length;
    const publicUser = filteredQueue.filter(item => normalizeSource(item.sourceSystem || item.source) === 'public-web').length;
    const partner = filteredQueue.filter(item => normalizeSource(item.sourceSystem || item.source) === 'partner-web').length;
    const shared = filteredQueue.filter(item => isPublicSharedReview(item)).length;
    const privatePartner = filteredQueue.filter(item => isPartnerPrivateReview(item)).length;

    return {
      total: filteredQueue.length,
      google,
      publicUser,
      partner,
      shared,
      privatePartner,
    };
  }, [filteredQueue]);

  function getCarrierKey(item) {
    return `${item.targetCode || 'NO_CODE'}__${item.targetName || 'NO_NAME'}`;
  }

  const carrierGroups = useMemo(() => {
    const map = new Map();

    filteredQueue.forEach(item => {
      const key = getCarrierKey(item);
      const current = map.get(key) || {
        key,
        name: item.targetName || 'Chưa cập nhật',
        code: item.targetCode || '---',
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
        scoreSum: 0,
      };

      const score = Number(item.aiConfidence || 0);
      current.total += 1;
      current.scoreSum += score;

      if (score >= 0.9) current.high += 1;
      else if (score >= 0.5) current.medium += 1;
      else current.low += 1;

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredQueue]);

  const visibleQueue = useMemo(() => {
    if (selectedCarrierKey === 'all') return filteredQueue;
    return filteredQueue.filter(item => getCarrierKey(item) === selectedCarrierKey);
  }, [filteredQueue, selectedCarrierKey]);

  const visibleIds = useMemo(
    () => visibleQueue.map(item => item.id).filter(Boolean),
    [visibleQueue]
  );

  async function handleBulkModeration(action, customIds = null) {
    const ids = Array.isArray(customIds) ? customIds : visibleIds;

    if (actionLoading || ids.length === 0) return;

    const confirmMessage =
      action === 'approve'
        ? `Bạn có chắc muốn duyệt ${ids.length} review không?`
        : `Bạn có chắc muốn từ chối ${ids.length} review không?`;

    if (!window.confirm(confirmMessage)) return;

    stopBulkRef.current = false;
    setActionLoading(`bulk_${action}`);
    setBulkProgress({
      action,
      current: 0,
      total: ids.length,
      status: 'running',
      label: action === 'approve' ? 'Đang duyệt review' : 'Đang từ chối review',
    });

    try {
      const endpoint =
        action === 'approve'
          ? '/api/admin/review-ai/bulk-approve'
          : '/api/admin/review-ai/bulk-reject';

      await api.post(endpoint, { ids });

      ids.forEach(id => {
        const review = queue.find(item => String(getReviewId(item) || item.id) === String(id));
        syncPartnerSlaReviewStatus(review, action === 'approve' ? 'approved' : 'rejected');
      });

      setBulkProgress(prev => ({
        ...(prev || {}),
        current: ids.length,
        total: ids.length,
        status: 'done',
        label: action === 'approve' ? 'Hoàn tất duyệt toàn bộ' : 'Hoàn tất từ chối toàn bộ',
      }));

      setQueue(prev => prev.filter(item => !ids.includes(item.id)));
      setSelectedReview(null);
      setAiPreview(null);

      window.setTimeout(() => setBulkProgress(null), 1200);
    } catch (err) {
      console.error(err);
      alert(
        action === 'approve'
          ? 'Lỗi khi duyệt toàn bộ review'
          : 'Lỗi khi từ chối toàn bộ review'
      );
      await fetchQueue();
    } finally {
      stopBulkRef.current = false;
      setActionLoading('');
    }
  }

  async function handleAIPreview() {
    if (aiLoading || actionLoading || visibleIds.length === 0) return;

    setAiLoading(true);
    setAiPreview(null);

    try {
      const res = await api.post('/api/admin/review-ai/ai-preview', {
        ids: visibleIds,
      });

      setAiPreview(res.data);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi AI đánh giá review');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleApplyAI() {
    if (!aiPreview || actionLoading) return;

    const approveSet = new Set((aiPreview.approveIds || []).filter(Boolean));
    const rejectSet = new Set((aiPreview.rejectIds || []).filter(Boolean));
    const manualSet = new Set((aiPreview.manualIds || []).filter(Boolean));

    if (Array.isArray(aiPreview.items)) {
      aiPreview.items.forEach(item => {
        const id = getReviewId(item);
        if (!id) return;

        const action = normalizeAIAction(
          item.action ||
          item.decision ||
          item.result ||
          item.aiAction
        );

        if (action === 'approve') approveSet.add(id);
        else if (action === 'reject') rejectSet.add(id);
        else manualSet.add(id);
      });
    }

    const approveIds = Array.from(approveSet);
    const rejectIds = Array.from(rejectSet).filter(id => !approveSet.has(id));

    const jobs = [
      ...approveIds.map(id => ({ id, action: 'approve' })),
      ...rejectIds.map(id => ({ id, action: 'reject' })),
    ];

    if (jobs.length === 0) {
      alert('AI không có review nào đủ điều kiện tự xử lý. Nếu đang hiện "No", backend cần trả action = reject hoặc no trong items.');
      return;
    }

    const ok = window.confirm(
      `AI đề xuất:

- Duyệt: ${approveIds.length} review
- Từ chối: ${rejectIds.length} review
- Cần xem tay: ${manualSet.size || aiPreview.manualCount || 0} review

Bạn có chắc muốn áp dụng đề xuất của AI không?`
    );

    if (!ok) return;

    stopBulkRef.current = false;
    setActionLoading('ai_apply');

    let approvedDone = 0;
    let rejectedDone = 0;
    let failedDone = 0;
    const doneIds = [];

    setBulkProgress({
      action: 'ai_apply',
      current: 0,
      total: jobs.length,
      approved: 0,
      rejected: 0,
      failed: 0,
      remaining: jobs.length,
      status: 'running',
      label: 'AI đang áp dụng đề xuất',
    });

    try {
      for (let index = 0; index < jobs.length; index += 1) {
        if (stopBulkRef.current) {
          setBulkProgress(prev => prev ? {
            ...prev,
            status: 'stopped',
            label: 'Đã dừng áp dụng đề xuất AI',
            remaining: jobs.length - index,
          } : prev);

          break;
        }

        const job = jobs[index];

        try {
          await api.post(`/api/admin/review-ai/${job.id}/${job.action}`);

          const review = queue.find(item => String(getReviewId(item) || item.id) === String(job.id));
          syncPartnerSlaReviewStatus(review, job.action === 'approve' ? 'approved' : 'rejected');

          doneIds.push(job.id);

          if (job.action === 'approve') approvedDone += 1;
          if (job.action === 'reject') rejectedDone += 1;
        } catch (err) {
          console.error('AI apply failed:', job, err);
          failedDone += 1;
        }

        const current = approvedDone + rejectedDone + failedDone;

        setBulkProgress(prev => prev ? {
          ...prev,
          current,
          approved: approvedDone,
          rejected: rejectedDone,
          failed: failedDone,
          remaining: Math.max(jobs.length - current, 0),
          label: stopBulkRef.current
            ? 'Đang dừng áp dụng đề xuất AI'
            : 'AI đang áp dụng đề xuất',
        } : prev);
      }

      const wasStopped = stopBulkRef.current;

      setQueue(prev => prev.filter(item => !doneIds.includes(item.id)));
      setSelectedReview(null);
      setAiPreview(null);

      setBulkProgress(prev => prev ? {
        ...prev,
        status: wasStopped ? 'stopped' : 'done',
        label: wasStopped
          ? `Đã dừng · Duyệt ${approvedDone}, từ chối ${rejectedDone}, lỗi ${failedDone}`
          : `Hoàn tất · Duyệt ${approvedDone}, từ chối ${rejectedDone}, lỗi ${failedDone}`,
      } : prev);

      await fetchQueue();

      window.setTimeout(() => {
        setBulkProgress(null);
      }, wasStopped ? 2600 : 1600);
    } finally {
      stopBulkRef.current = false;
      setActionLoading('');
    }
  }

  function handleStopBulk() {
    stopBulkRef.current = true;
    setBulkProgress(prev => prev ? {
      ...prev,
      status: 'stopping',
      label: 'Đang dừng sau review hiện tại',
    } : prev);
  }

  const totalPages = Math.max(1, Math.ceil(visibleQueue.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginatedQueue = visibleQueue.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items = [1];
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);

    if (start > 2) items.push('left-dots');

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      items.push(pageNumber);
    }

    if (end < totalPages - 1) items.push('right-dots');

    items.push(totalPages);
    return items;
  }, [safePage, totalPages]);

  const aiDecisionMap = useMemo(() => {
    const map = new Map();

    if (!aiPreview?.items) return map;

    aiPreview.items.forEach(item => {
      const id = getReviewId(item);
      if (!id) return;

      map.set(id, {
        ...item,
        id,
        action: normalizeAIAction(item.action || item.decision || item.result || item.aiAction),
      });
    });

    return map;
  }, [aiPreview]);

  useEffect(() => {
    setPage(1);
  }, [keyword, riskFilter, sourceFilter, selectedCarrierKey]);

  useEffect(() => {
    if (
      selectedCarrierKey !== 'all' &&
      !carrierGroups.some(group => group.key === selectedCarrierKey)
    ) {
      setSelectedCarrierKey('all');
    }
  }, [carrierGroups, selectedCarrierKey]);

  if (loading) {
    return (
      <div className={styles.loading}>
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>

          <h1>Kiểm duyệt review</h1>

          <p>
            Kiểm tra review từ Google Maps, người dùng public và review riêng do partner gửi. Nội dung partner chỉ được hiển thị cho đúng tài khoản sau khi admin duyệt.
          </p>
        </div>

        <button
          className={styles.refreshButton}
          onClick={fetchQueue}
          disabled={!!actionLoading || aiLoading}
        >
          Làm mới
        </button>
      </section>

      {/* === CRAWL PANEL === */}
      <section className={styles.syncPanel}>
        <div className={styles.syncBar}>
          <span className={styles.syncLabel}>Đồng bộ Review từ Google Maps</span>

          <div className={styles.syncControls}>
            <span className={styles.syncFieldLabel}>Dịch vụ:</span>
            <select
              className={styles.syncSelect}
              value={syncOpCode}
              onChange={e => setSyncOpCode(e.target.value)}
              disabled={syncing}
            >
              <option value="">-- Chọn --</option>
              {operators.map(op => (
                <option key={op.operatorCode} value={op.operatorCode}>
                  {op.operatorCode} — {op.operatorName}
                </option>
              ))}
            </select>

            <input
              type="email"
              className={styles.syncEmailInput}
              placeholder="Gmail partner (tuỳ chọn)"
              value={syncEmail}
              onChange={e => setSyncEmail(e.target.value)}
              disabled={syncing}
            />

            <button
              className={styles.syncBtn}
              onClick={handleCrawl}
              disabled={syncing || !syncOpCode}
            >
              {syncing ? (
                <><span className={styles.syncSpinner} /> Đang crawl...</>
              ) : (
                '↓ Lấy Review từ Google Maps'
              )}
            </button>

            <button
              className={styles.syncToggle}
              onClick={() => setSyncExpanded(v => !v)}
              aria-label="Toggle log"
            >
              {syncExpanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {syncExpanded && (
          <div className={styles.syncBody}>
            <div className={styles.syncLog} ref={syncLogRef}>
              {syncLog.length === 0 ? (
                <span className={styles.syncLogEmpty}>Nhấn "Lấy Review" để bắt đầu crawl...</span>
              ) : (
                syncLog.map((line, i) => (
                  <div
                    key={i}
                    className={`${styles.syncLogLine} ${
                      line.includes('✓') ? styles.syncLogOk
                      : line.includes('✗') ? styles.syncLogErr
                      : ''
                    }`}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>

            {syncResult && (
              <div className={syncResult.ok ? styles.syncResultOk : styles.syncResultErr}>
                {syncResult.ok
                  ? `✓ Thành công · ${syncResult.inserted} review mới đã vào queue kiểm duyệt bên dưới`
                  : `✗ Lỗi: ${syncResult.message}`}
              </div>
            )}
          </div>
        )}
      </section>

      <section className={styles.toolbar}>
        <input
          type="text"
          placeholder="Tìm review..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">Tất cả</option>
          <option value="high">Rủi ro cao</option>
          <option value="medium">Cần xem lại</option>
          <option value="low">Rủi ro thấp</option>
        </select>

        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">Tất cả nguồn</option>
          <option value="google-maps">Google Maps chung</option>
          <option value="public-web">Người dùng public</option>
          <option value="partner-web">Partner gửi riêng</option>
        </select>

        <button
          className={styles.aiButton}
          disabled={!!actionLoading || aiLoading || visibleQueue.length === 0}
          onClick={handleAIPreview}
        >
          {aiLoading ? 'AI đang đọc...' : `AI tự đánh giá (${visibleQueue.length})`}
        </button>

        <button
          className={styles.bulkApprove}
          disabled={!!actionLoading || visibleQueue.length === 0}
          onClick={() => handleBulkModeration('approve')}
        >
          {actionLoading === 'bulk_approve'
            ? 'Đang duyệt...'
            : `Duyệt toàn bộ (${visibleQueue.length})`}
        </button>

        <button
          className={styles.bulkReject}
          disabled={!!actionLoading || visibleQueue.length === 0}
          onClick={() => handleBulkModeration('reject')}
        >
          {actionLoading === 'bulk_reject'
            ? 'Đang từ chối...'
            : `Từ chối toàn bộ (${visibleQueue.length})`}
        </button>
      </section>

      <section className={styles.sourceSummary}>
        <article className={styles.sourceSummaryCard}>
          <span>Tổng hàng chờ</span>
          <strong>{moderationStats.total}</strong>
          <small>Review đang đợi admin xử lý</small>
        </article>

        <article className={`${styles.sourceSummaryCard} ${styles.googleSummary}`}>
          <span>Google Maps</span>
          <strong>{moderationStats.google}</strong>
          <small>Nguồn chung từ crawl Maps</small>
        </article>

        <article className={`${styles.sourceSummaryCard} ${styles.publicSummary}`}>
          <span>Người dùng public</span>
          <strong>{moderationStats.publicUser}</strong>
          <small>Duyệt xong chia sẻ cho đúng dịch vụ</small>
        </article>

        <article className={`${styles.sourceSummaryCard} ${styles.partnerSummary}`}>
          <span>Partner gửi</span>
          <strong>{moderationStats.partner}</strong>
          <small>Dữ liệu riêng từng tài khoản</small>
        </article>
      </section>

      <section className={styles.carrierPanel}>
        <div className={styles.sectionHead}>
          <div>
            <span>Phân nhóm dịch vụ</span>
            <h2>Chọn từng dịch vụ để duyệt chính xác hơn</h2>
          </div>

          <small>
            {carrierGroups.length} dịch vụ · {filteredQueue.length} review đang lọc
          </small>
        </div>

        <div className={styles.carrierList}>
          <button
            className={`${styles.carrierChip} ${selectedCarrierKey === 'all' ? styles.activeCarrier : ''}`}
            onClick={() => setSelectedCarrierKey('all')}
            disabled={!!actionLoading || aiLoading}
          >
            <div>
              <strong>Tất cả dịch vụ</strong>
              <span>ALL</span>
            </div>

            <em>{filteredQueue.length}</em>
          </button>

          {carrierGroups.map(group => (
            <button
              key={group.key}
              className={`${styles.carrierChip} ${selectedCarrierKey === group.key ? styles.activeCarrier : ''}`}
              onClick={() => setSelectedCarrierKey(group.key)}
              disabled={!!actionLoading || aiLoading}
            >
              <div>
                <strong>{group.name}</strong>
                <span>{group.code}</span>
              </div>

              <em>{group.total}</em>
            </button>
          ))}
        </div>
      </section>

      {aiPreview && (
        <section className={styles.aiPanel}>
          <div className={styles.aiPanelTop}>
            <div>
              <span>AI REVIEW SUMMARY</span>
              <h2>AI đã phân tích {aiPreview.total || 0} review</h2>
            </div>

            <button
              className={styles.aiApplyButton}
              disabled={!!actionLoading}
              onClick={handleApplyAI}
            >
              {actionLoading === 'ai_apply'
                ? 'Đang áp dụng...'
                : 'Đồng ý áp dụng đề xuất AI'}
            </button>
          </div>

          <div className={styles.aiStats}>
            <div className={styles.aiStatApprove}>
              <label>Nên duyệt</label>
              <strong>{aiPreview.approveCount || 0}</strong>
            </div>

            <div className={styles.aiStatReject}>
              <label>Nên từ chối</label>
              <strong>{aiPreview.rejectCount || 0}</strong>
            </div>

            <div className={styles.aiStatManual}>
              <label>Cần xem tay</label>
              <strong>{aiPreview.manualCount || 0}</strong>
            </div>
          </div>

          <p>
            AI chỉ đưa ra đề xuất. Review chỉ được duyệt hoặc từ chối sau khi admin bấm xác nhận.
          </p>
        </section>
      )}

      {bulkProgress && (
        <section className={styles.progressPanel}>
          <div className={styles.progressTop}>
            <div>
              <span className={styles.progressLabel}>{bulkProgress.label}</span>
              <strong>
                {bulkProgress.current}/{bulkProgress.total} review đã xử lý
              </strong>

              <div className={styles.progressMeta}>
                <span>Đã duyệt: {bulkProgress.approved || 0}</span>
                <span>Đã từ chối: {bulkProgress.rejected || 0}</span>
                <span>Còn lại: {bulkProgress.remaining ?? Math.max((bulkProgress.total || 0) - (bulkProgress.current || 0), 0)}</span>
                {!!bulkProgress.failed && <span>Lỗi: {bulkProgress.failed}</span>}
              </div>
            </div>

            {['running', 'stopping'].includes(bulkProgress.status) && (
              <button
                className={styles.stopButton}
                onClick={handleStopBulk}
                disabled={bulkProgress.status === 'stopping'}
              >
                {bulkProgress.status === 'stopping' ? 'Đang dừng...' : 'Dừng lại'}
              </button>
            )}
          </div>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{
                width: `${bulkProgress.total ? Math.round((bulkProgress.current / bulkProgress.total) * 100) : 0}%`,
              }}
            />
          </div>

          <p>
            Khi bấm dừng, hệ thống sẽ dừng sau review hiện tại, báo số đã duyệt/từ chối và tự tải lại danh sách còn lại.
          </p>
        </section>
      )}

      {!paginatedQueue.length ? (
        <div className={styles.empty}>
          Không có review nào.
        </div>
      ) : (
        <>
          <div className={styles.resultHead}>
            <div>
              <span>Danh sách review</span>
              <strong>{visibleQueue.length} review cần xử lý</strong>
            </div>

            <small>
              {selectedCarrierKey === 'all'
                ? 'Đang xem tất cả dịch vụ'
                : carrierGroups.find(group => group.key === selectedCarrierKey)?.name}
            </small>
          </div>

          <div className={styles.grid}>
            {paginatedQueue.map(item => {
              const score = Number(item.aiConfidence || 0);
              const aiDecision = aiDecisionMap.get(item.id);

              return (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.user}>
                      <div className={styles.avatar}>
                        {getInitial(item.targetName)}
                      </div>

                      <div>
                        <h3>{item.targetName || 'Chưa cập nhật'}</h3>
                        <span>{item.targetCode || '---'}</span>
                      </div>
                    </div>

                    <div className={`${styles.badge} ${confidenceClass(score)}`}>
                      {Math.round(score * 100)}%
                    </div>
                  </div>

                  <div className={styles.sourceRow}>
                    <span className={`${styles.sourceBadge} ${getSourceBadgeClass(styles, item.sourceSystem || item.source)}`}>
                      {getSourceLabel(item.sourceSystem || item.source)}
                    </span>
                    {isPartnerPrivateReview(item) && (
                      <span className={styles.privateNotice}>Dữ liệu riêng</span>
                    )}
                    {normalizeSource(item.sourceSystem || item.source) === 'public-web' && (
                      <span className={styles.sharedNotice}>Dữ liệu chung theo mã dịch vụ</span>
                    )}
                  </div>

                  {isPartnerPrivateReview(item) && (
                    <PartnerSenderHighlight item={item} partnerAccountLookup={partnerAccountLookup} compact />
                  )}

                  {aiDecision && (
                    <div className={`${styles.aiDecision} ${getAIActionClass(aiDecision.action)}`}>
                      <strong>{getAIActionLabel(aiDecision.action)}</strong>
                      <span>{Math.round(Number(aiDecision.confidence || 0) * 100)}%</span>
                    </div>
                  )}

                  <div className={styles.meta}>
                    <div>
                      <label>Reviewer</label>
                      <strong>{item.reviewerName || 'Ẩn danh'}</strong>
                    </div>

                    <div>
                      <label>Rating</label>
                      <strong>⭐ {item.rating || 0}</strong>
                    </div>

                    <div>
                      <label>Nguồn</label>
                      <strong>{getSourceLabel(item.sourceSystem || item.source)}</strong>
                    </div>
                  </div>

                  <div className={styles.comment}>
                    {item.comment || 'Không có nội dung'}
                  </div>

                  {getReviewImageUrl(item) && (
                    <div className={styles.cardImageBox} data-review-image-wrap>
                      <img
                        src={getReviewImageUrl(item)}
                        alt="Ảnh khách gửi kèm review"
                        onError={hideBrokenImage}
                      />
                    </div>
                  )}

                  <div className={styles.reason}>
                    <label>Lý do AI</label>
                    <p>
                      {aiDecision?.reason || item.aiReason || 'Không có dữ liệu'}
                    </p>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.approve}
                      disabled={!!actionLoading || aiLoading}
                      onClick={() => handleModeration(item.id, 'approve')}
                    >
                      {actionLoading === `${item.id}_approve`
                        ? 'Đang duyệt...'
                        : 'Duyệt'}
                    </button>

                    <button
                      className={styles.reject}
                      disabled={!!actionLoading || aiLoading}
                      onClick={() => handleModeration(item.id, 'reject')}
                    >
                      {actionLoading === `${item.id}_reject`
                        ? 'Đang xử lý...'
                        : 'Từ chối'}
                    </button>

                    <button
                      className={styles.detail}
                      disabled={!!actionLoading || aiLoading}
                      onClick={() => setSelectedReview(item)}
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.pagination}>
            {paginationItems.map((item, index) => (
              typeof item === 'string' ? (
                <span key={`${item}-${index}`} className={styles.paginationDots}>...</span>
              ) : (
                <button
                  key={item}
                  className={safePage === item ? styles.activePage : ''}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              )
            ))}
          </div>
        </>
      )}

      {selectedReview && (
        <div
          className={styles.overlay}
          onClick={() => setSelectedReview(null)}
        >
          <div
            className={styles.modal}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalTop}>
              <div>
                <span className={styles.modalBadge}>
                  REVIEW DETAIL
                </span>

                <h2>{selectedReview.targetName}</h2>
              </div>

              <button
                onClick={() => setSelectedReview(null)}
                className={styles.close}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalItem}>
                <label>Reviewer</label>
                <strong>{selectedReview.reviewerName}</strong>
              </div>

              <div className={styles.modalItem}>
                <label>Rating</label>
                <strong>⭐ {selectedReview.rating}</strong>
              </div>

              <div className={styles.modalItem}>
                <label>Nguồn review</label>
                <strong>{getSourceLabel(selectedReview.sourceSystem || selectedReview.source)}</strong>
              </div>

              {isPartnerPrivateReview(selectedReview) && (
                <div className={styles.modalWideBlock}>
                  <PartnerSenderHighlight item={selectedReview} partnerAccountLookup={partnerAccountLookup} />
                </div>
              )}

              <div className={styles.modalItem}>
                <label>Phạm vi dữ liệu</label>
                <strong>{isPartnerPrivateReview(selectedReview) ? 'Riêng của tài khoản partner gửi' : 'Dữ liệu dùng chung theo dịch vụ'}</strong>
              </div>

              <div className={styles.modalItem}>
                <label>AI Confidence</label>
                <strong>
                  {Math.round(Number(selectedReview.aiConfidence || 0) * 100)}%
                </strong>
              </div>

              <div className={styles.fullContent}>
                <label>Nội dung</label>
                <p>{selectedReview.comment}</p>
              </div>

              {getReviewImageUrl(selectedReview) && (
                <div className={styles.reviewImagePanel} data-review-image-wrap>
                  <div className={styles.reviewImageHead}>
                    <label>Ảnh đính kèm</label>
                    <span>{getFirstValue(selectedReview, ['imageFileName', 'image_file_name']) || 'Ảnh review'}</span>
                  </div>
                  <img
                    src={getReviewImageUrl(selectedReview)}
                    alt="Ảnh đính kèm của review"
                    onError={hideBrokenImage}
                  />
                </div>
              )}

              <div className={styles.fullContent}>
                <label>Lý do AI</label>
                <p>{selectedReview.aiReason || 'Không có dữ liệu'}</p>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.approve}
                  disabled={!!actionLoading}
                  onClick={() => handleModeration(selectedReview.id, 'approve')}
                >
                  {actionLoading === `${selectedReview.id}_approve`
                    ? 'Đang duyệt...'
                    : 'Duyệt'}
                </button>

                <button
                  className={styles.reject}
                  disabled={!!actionLoading}
                  onClick={() => handleModeration(selectedReview.id, 'reject')}
                >
                  {actionLoading === `${selectedReview.id}_reject`
                    ? 'Đang xử lý...'
                    : 'Từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}