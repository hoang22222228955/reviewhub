import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import ApiKeyCard from '../../components/ApiKeyCard/ApiKeyCard';
import api from '../../../services/api';
import styles from './PartnerApiKeysPage.module.css';

function firstCode(value) {
  return String(value || '')
    .split(/[\s,;|]+/)
    .map(item => item.trim())
    .find(Boolean) || '';
}

function splitValues(value) {
  return String(value || '')
    .split(/[\s,;|]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

const SERVICE_NAME_MAP = {
 'DV-001': 'Dịch vụ đưa đón sân bay',
  'DV-002': 'Dịch vụ thuê xe tự lái',
  'DV-003': 'Dịch vụ thuê xe có tÃ i xế',
  'DV-004': 'Dịch vụ đặt vé tham quan',
  'DV-005': 'Dịch vụ bảo hiểm du lịch',
  'DV-006': 'Dịch vụ là m visa du lịch',
  'DV-007': 'Dịch vụ hộ chiếu và giấy tờ du lịch',
  'DV-008': 'Dịch vụ eSIM du lịch',
  'DV-009': 'Dịch vụ đổi tiền du lịch',
  'DV-010': 'Dịch vụ gửi hÃ nh lý',
  'DV-011': 'Dịch vụ giao hÃ nh lý tận nơi',
  'DV-012': 'Dịch vụ hướng dẫn viên địa phương',
  'DV-013': 'Dịch vụ phiên dịch du lịch',
  'DV-014': 'Dịch vụ đặt nhà hàng du lịch',
  'DV-015': 'Dịch vụ đặt du thuyền',
  'DV-016': 'Dịch vụ booking engine OTA',
  'DV-017': 'Dịch vụ quản lý đánh giá OTA',
  'DV-018': 'Dịch vụ chăm sóc khách hÃ ng du lịch',
  'DV-019': 'Dịch vụ thiết kế lịch trình du lịch',
  'DV-020': 'Dịch vụ hỗ trợ khẩn cấp du lịch',
  'KS-001': 'Mường Thanh Luxury Äà Nẵng',
  'KS-002': 'Vinpearl Resort Nha Trang',
  'KS-003': 'FLC Grand Hotel Hạ Long',
  'KS-004': 'InterContinental Hanoi Westlake',
  'KS-005': 'Hotel Nikko Saigon',
  'KS-006': 'Saigon Morin Hotel Huế',
  'KS-007': 'Pullman Danang Beach Resort',
  'KS-008': 'Lotte Hotel Saigon',
  'KS-009': 'Sapa Jade Hill Resort',
  'KS-010': 'Dalat Palace Heritage Hotel',
  'KS-011': 'Novotel Phu Quoc Resort',
  'KS-012': 'Melia Ba Vi Mountain Retreat',
  'KS-013': 'Sofitel Legend Metropole Hanoi',
  'KS-014': 'JW Marriott Hotel Hanoi',
  'KS-015': 'Sheraton Saigon Grand Opera Hotel',
  'KS-016': 'InterContinental Danang Sun Peninsula Resort',
  'KS-017': 'Meliá Hanoi',
  'KS-018': 'Caravelle Saigon',
  'KS-019': 'New World Saigon Hotel',
  'KS-020': 'Pan Pacific Hanoi',
  'MB-001': 'Vietnam Airlines',
  'MB-002': 'Vietjet Air',
  'MB-003': 'Bamboo Airways',
  'MB-004': 'Vietravel Airlines',
  'MB-005': 'Pacific Airlines',
  'MB-006': 'VASCO',
  'MB-007': 'Singapore Airlines',
  'MB-008': 'Qatar Airways',
  'MB-009': 'Emirates',
  'MB-010': 'Thai Airways',
  'MB-011': 'AirAsia',
  'MB-012': 'Korean Air',
  'MB-013': 'Asiana Airlines',
  'MB-014': 'Cathay Pacific',
  'MB-015': 'EVA Air',
  'MB-016': 'China Airlines',
  'MB-017': 'Japan Airlines',
  'MB-018': 'All Nippon Airways',
  'MB-019': 'Turkish Airlines',
  'MB-020': 'Lufthansa',
  'PT-001': 'VeXeNhanh',
  'PT-002': 'FUTA Bus Lines',
  'PT-003': 'An Vui',
  'PT-004': 'Phương Trang',
  'PT-005': 'Thành Bưởi',
  'PT-006': 'Hoàng Long',
  'PT-007': 'Kumho Samco',
  'PT-008': 'Trung Nghĩa',
  'PT-009': 'Cúc Tùng',
  'PT-010': 'Mai Linh Express',
  'PT-011': 'Xe Hạnh',
  'PT-012': 'Tân Phước Khánh',
  'PT-013': 'Sao Việt',
  'PT-014': 'Đức Thanh',
  'PT-015': 'Thuận Thảo',
  'PT-016': 'Vạn Xuân',
  'PT-017': 'Xe Phương Nam',
  'PT-018': 'Hoa Phượng',
  'PT-019': 'Sinh Tourist',
  'PT-020': 'Eva Express',
  'PT-021': 'Hanh Café',
  'PT-022': 'Liên Hưng',
  'PT-023': 'Tấn Phát',
  'PT-024': 'Thiện Trường',
  'PT-025': 'Xe Minh Quân',
  'PT-026': 'Mê Kông Express',
  'PT-027': 'Thùy Dương',
  'PT-028': 'Phú Quý',
  'PT-029': 'Tiến Thành',
  'PT-030': 'Minh Châu',
  'PT-031': 'Quang Vinh',
  'PT-032': 'Trường Tiến',
  'PT-033': 'Phúc Lộc',
  'PT-034': 'Hùng Cường',
  'PT-035': 'Việt Thanh',
  'PT-036': 'Đức Dương',
  'PT-037': 'Tân Hải Long',
  'PT-038': 'Minh Hiếu',
  'PT-039': 'Trung Trang',
  'PT-040': 'Như Vinh',
  'PT-041': 'Anh Tuyên',
  'PT-042': 'VÅ© Linh',
  'PT-043': 'Thiện Trí',
  'PT-044': 'Trọng Minh',
  'PT-045': 'Toàn Thắng',
  'PT-046': 'DÅ©ng Lệ',
  'PT-047': 'Minh Nghĩa',
  'PT-048': 'Tiến Oanh',
  'PT-049': 'Võ Cúc Phương ',
  'PT-050': 'HoÃ  Liêm',
  'PT-051': 'Đức Minh',
  'TH-001': 'Tuyến SE1 Hà Nội - TP. Hồ Chí Minh',
  'TH-002': 'Tuyến SE2 TP. Hồ Chí Minh - HÃ  Nội',
  'TH-003': 'Tuyến SE3 Hà Nội - SÃ i Gòn',
  'TH-004': 'Tuyến SE4 SÃ i Gòn - HÃ  Nội',
  'TH-005': 'Tuyến Hà Nội - Hải Phòng',
  'TH-006': 'Tuyến Hải Phòng - HÃ  Nội',
  'TH-007': 'Tuyến Hà Nội - Lào Cai',
  'TH-008': 'Tuyến Lào Cai - HÃ  Nội',
  'TH-009': 'Tuyến Hà Nội - Vinh',
  'TH-010': 'Tuyến Vinh - Hà Nội',
  'TH-011': 'Tuyến SÃ i Gòn - Nha Trang',
  'TH-012': 'Tuyến Nha Trang - SÃ i Gòn',
  'TH-013': 'Tuyến SÃ i Gòn - Phan Thiết',
  'TH-014': 'Tuyến Phan Thiết - SÃ i Gòn',
  'TH-015': 'Tuyến Äà Nẵng - Huế',
  'TH-016': 'Tuyến Huế - Äà Nẵng',
  'TH-017': 'Tuyến Äà Nẵng - Quy Nhơn',
  'TH-018': 'Tuyến Quy Nhơn - Äà Nẵng',
  'TH-019': 'Tuyến SÃ i Gòn - Äà Lạt',
  'TH-020': 'Tuyến Hà Nội - Hạ Long',
  'TO-001': 'Tour Sa Pa 3 ngày 2 đêm',
  'TO-002': 'Tour Hạ Long 2 ngày 1 đêm',
  'TO-003': 'Tour Ninh Bình TrÃ ng An - Bái Đính',
  'TO-004': 'Tour Hà Giang 3 ngày 2 đêm',
  'TO-005': 'Tour Äà Nẵng - Hội An - Huế',
  'TO-006': 'Tour Bà Nà Hills 1 ngày',
  'TO-007': 'Tour Cù Lao ChÃ m 1 ngÃ y',
  'TO-008': 'Tour Nha Trang 3 ngày 2 đêm',
  'TO-009': 'Tour Äà Lạt 3 ngày 2 đêm',
  'TO-010': 'Tour Phú Quốc 4 ngày 3 đêm',
  'TO-011': 'Tour Côn Đảo 3 ngày 2 đêm',
  'TO-012': 'Tour Miền Tây 2 ngÃ y 1 đêm',
  'TO-013': 'Tour Củ Chi - Mekong 1 ngày',
  'TO-014': 'Tour Mũi Né 2 ngÃ y 1 đêm',
  'TO-015': 'Tour Quy Nhơn - Phú Yên 4 ngÃ y 3 đêm',
  'TO-016': 'Tour Mộc Châu 2 ngÃ y 1 đêm',
  'TO-017': 'Tour Mai Châu 2 ngÃ y 1 đêm',
  'TO-018': 'Tour Singapore 4 ngày 3 đêm',
  'TO-019': 'Tour Thái Lan Bangkok - Pattaya',
  'TO-020': 'Tour Hàn Quốc Seoul - Nami',
};

function getServiceType(code, category) {
  const value = String(code || '').trim().toUpperCase();
  const cate = String(category || '').toLowerCase();

  if (value.startsWith('PT-') || value.startsWith('BUS-')) return 'Nhà xe';
  if (value.startsWith('KS-') || value.startsWith('HOTEL-')) return 'Khách sạn';
  if (value.startsWith('MB-') || value.startsWith('AIR-')) return 'Máy bay';
  if (value.startsWith('TH-') || value.startsWith('TRAIN-')) return 'Tàu hỏa';
  if (value.startsWith('TO-') || value.startsWith('TOUR-')) return 'Tour';
  if (value.startsWith('DV-') || value.startsWith('SERVICE-')) return 'Dịch vụ';

  if (cate.includes('khách') || cate.includes('hotel')) return 'Khách sạn';
  if (cate.includes('máy') || cate.includes('bay')) return 'Máy bay';
  if (cate.includes('tàu')) return 'Tàu hỏa';
  if (cate.includes('tour')) return 'Tour';

  return 'Dịch vụ';
}

function cleanServiceName(name, code, type) {
  const raw = String(name || SERVICE_NAME_MAP[String(code || '').toUpperCase()] || '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  const typeLower = String(type || '').toLowerCase();

  if (typeLower && lower.includes(typeLower)) return raw;
  return raw;
}

function buildServiceLabel(service) {
  const code = service?.code || '';
  const type = service?.type || 'Dịch vụ';
  const name = service?.name || '';

  if (name) return `${code} · ${type} ${name}`;
  return `${code} · ${type}`;
}

function makeServiceOptions(user) {
  const codes = [
    ...splitValues(user?.assignedOperatorCode),
    ...splitValues(user?.partnerCode),
  ]
    .map(code => code.toUpperCase())
    .filter(Boolean);

  const names = [
    ...splitValues(user?.assignedOperatorName),
    ...splitValues(user?.partnerName),
    ...splitValues(user?.operatorName),
  ];

  const categories = [
    ...splitValues(user?.assignedServiceCategory),
    ...splitValues(user?.serviceCategory),
    ...splitValues(user?.category),
  ];

  const uniqueCodes = Array.from(new Set(codes));

  if (!uniqueCodes.length) {
    const fallbackCode = 'PT-013';
    const type = getServiceType(fallbackCode, user?.serviceCategory || user?.category);
    const name = cleanServiceName(user?.orgName || SERVICE_NAME_MAP[fallbackCode], fallbackCode, type);

    return [{
      code: fallbackCode,
      type,
      name,
      label: buildServiceLabel({ code: fallbackCode, type, name }),
    }];
  }

  return uniqueCodes.map((code, index) => {
    const type = getServiceType(code, categories[index]);
    const name = cleanServiceName(names[index] || SERVICE_NAME_MAP[code] || user?.orgName, code, type);

    return {
      code,
      type,
      name,
      label: buildServiceLabel({ code, type, name }),
    };
  });
}

function cleanBase(value, fallback) {
  const text = String(value || '').trim();
  return (text || fallback).replace(/\/+$/, '');
}

function maskKey(value) {
  const text = String(value || '');
  if (!text) return 'Chưa có khóa';
  if (text.length <= 18) return text;
  return `${text.slice(0, 12)}••••••••${text.slice(-6)}`;
}

function makeImportBody({ targetCode, targetName }) {
  return JSON.stringify({
    targetCode: targetCode || 'PT-013',
    targetName: targetName || 'Tên dịch vụ',
    category: 'Nhà xe',
    sourceName: 'website-doi-tac',
    reviews: [
      {
        externalId: 'rv-001',
        reviewerName: 'Nguyễn Văn A',
        rating: 5,
        comment: 'Dịch vụ tốt, nhân viên hỗ trợ nhiệt tình.',
        createdAt: new Date().toISOString(),
      },
      {
        externalId: 'rv-002',
        reviewerName: 'Trần Thị B',
        rating: 2,
        comment: 'Cần cải thiện thời gian phục vụ và phản hồi khách hÃ ng.',
        createdAt: new Date().toISOString(),
      },
    ],
  }, null, 2);
}

function makeImportCurl({ apiBase, apiKey, targetCode, targetName }) {
  return `curl.exe -X POST "${cleanBase(apiBase, 'https://reviewhub-backend-ki8w.onrender.com')}/api/v1/external-reviews/import" -H "Content-Type: application/json" -H "X-Api-Key:${apiKey || 'YOUR_API_KEY'}" -d '${makeImportBody({ targetCode, targetName }).replace(/'/g, "\\'")}'`;
}

function makeSummaryCurl({ apiBase, apiKey, targetCode }) {
  return `curl.exe -X GET "${cleanBase(apiBase, 'https://reviewhub-backend-ki8w.onrender.com')}/api/v1/ai/review-summary?targetCode=${encodeURIComponent(targetCode || 'PT-013')}" -H "X-Api-Key:${apiKey || 'YOUR_API_KEY'}"`;
}

function makeEmbedCode({ frontendBase, apiBase, apiKey, targetCode, title }) {
  return `<script
  src="${cleanBase(frontendBase, 'http://localhost:5173')}/embed/partner-ai-summary.js"
  data-api-base="${cleanBase(apiBase, 'https://reviewhub-backend-ki8w.onrender.com')}"
  data-api-key="${apiKey || 'YOUR_API_KEY'}"
  data-target-code="${targetCode || 'PT-013'}"
  data-title="${title || 'Hỏi AI về đánh giá'}">
</script>`;
}

function makeTestHtml({ frontendBase, apiBase, apiKey, targetCode, title }) {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Test AI tóm tắt review</title>
</head>
<body>
  <h1>Test AI tóm tắt review</h1>
  <p>Bấm nút AI ở góc phải dưới để kiểm tra.</p>

  ${makeEmbedCode({ frontendBase, apiBase, apiKey, targetCode, title })}
</body>
</html>`;
}

export default function PartnerApiKeysPage() {
  const { currentUser, setUser } = useAuth();
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);

  const liveKey = currentUser?.apiKey || null;
  const sandboxKey = liveKey ? liveKey.replace('rh_live_', 'rh_sandbox_') : null;

  const serviceOptions = useMemo(() => makeServiceOptions(currentUser), [currentUser]);
  const defaultCode =
    firstCode(currentUser?.assignedOperatorCode) ||
    firstCode(currentUser?.partnerCode) ||
    serviceOptions[0]?.code ||
    'PT-013';

  const [apiBase, setApiBase] = useState('https://reviewhub-backend-ki8w.onrender.com');
  const [frontendBase, setFrontendBase] = useState('http://localhost:5173');
  const [targetCode, setTargetCode] = useState(defaultCode);
  const [showServiceCode, setShowServiceCode] = useState(false);
  const [embedTitle, setEmbedTitle] = useState(
    currentUser?.orgName ? `Hỏi AI về ${currentUser.orgName}` : 'Hỏi AI về đánh giá'
  );

  const selectedService = useMemo(() => {
    return serviceOptions.find(item => item.code === targetCode) || serviceOptions[0] || {
      code: targetCode || 'PT-013',
      name: currentUser?.orgName || 'Dịch vụ mặc định',
    };
  }, [serviceOptions, targetCode, currentUser]);

  const targetName = selectedService?.name || currentUser?.orgName || 'Tên dịch vụ';

  useEffect(() => {
    if (!serviceOptions.some(item => item.code === targetCode)) {
      setTargetCode(serviceOptions[0]?.code || defaultCode);
    }
  }, [serviceOptions, targetCode, defaultCode]);

  const [activeSnippet, setActiveSnippet] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');
  const [importing, setImporting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [summaryResult, setSummaryResult] = useState(null);
  const [showImportData, setShowImportData] = useState(false);
  const [showSummaryData, setShowSummaryData] = useState(false);
  const [actionError, setActionError] = useState('');

  const importBody = useMemo(
    () => makeImportBody({ targetCode, targetName }),
    [targetCode, targetName]
  );

  const snippets = useMemo(() => ({
    importJson: {
      title: 'Mẫu dữ liệu review',
      value: importBody,
    },
    importCurl: {
      title: 'Lệnh gửi review mẫu',
      value: makeImportCurl({ apiBase, apiKey: liveKey, targetCode, targetName }),
    },
    summaryCurl: {
      title: 'Lệnh kiểm tra AI Summary',
      value: makeSummaryCurl({ apiBase, apiKey: liveKey, targetCode }),
    },
    embedCode: {
      title: 'Mã gắn vào website',
      value: makeEmbedCode({ frontendBase, apiBase, apiKey: liveKey, targetCode, title: embedTitle }),
    },
    testHtml: {
      title: 'File test hoàn chỉnh',
      value: makeTestHtml({ frontendBase, apiBase, apiKey: liveKey, targetCode, title: embedTitle }),
    },
  }), [apiBase, frontendBase, liveKey, targetCode, targetName, embedTitle, importBody]);

  async function copyText(value, key) {
    try {
      await navigator.clipboard.writeText(value || '');
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(''), 1400);
    } catch {
      setError('Không copy tự động được. Vui lòng copy thủ công.');
    }
  }

  function showSnippet(key) {
    setActiveSnippet(key);
    copyText(snippets[key]?.value || '', key);
  }

  async function doRegenerate() {
    setShowConfirm(false);
    setRegenerating(true);
    setError(null);
    try {
      const res = await api.post('/api/partner/regenerate-key');
      setUser(res.data);
    } catch {
      setError('Không thể tạo lại khóa. Vui lòng thử lại sau.');
    } finally {
      setRegenerating(false);
    }
  }

  async function sendSampleReviews() {
    if (!liveKey) {
      setActionError('Tài khoản chưa có khóa live.');
      return;
    }

    setImporting(true);
    setActionError('');
    setImportResult(null);
    setShowImportData(false);

    try {
      const res = await fetch(`${cleanBase(apiBase, 'https://reviewhub-backend-ki8w.onrender.com')}/api/v1/external-reviews/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': liveKey,
        },
        body: importBody,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      setImportResult(json);
      setShowImportData(true);
    } catch (err) {
      setActionError(err?.message || 'Không gửi được review mẫu.');
    } finally {
      setImporting(false);
    }
  }

  async function checkSummary() {
    if (!liveKey) {
      setActionError('Tài khoản chưa có khóa live.');
      return;
    }

    setChecking(true);
    setActionError('');
    setSummaryResult(null);
    setShowSummaryData(false);

    try {
      const res = await fetch(`${cleanBase(apiBase, 'https://reviewhub-backend-ki8w.onrender.com')}/api/v1/ai/review-summary?targetCode=${encodeURIComponent(targetCode)}`, {
        headers: { 'X-Api-Key': liveKey },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      setSummaryResult(json);
    } catch (err) {
      setActionError(err?.message || 'Không kiểm tra được AI Summary.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div>
          <span className={styles.eyebrow}>Kết nối đối tác</span>
          <h1>Khóa API và AI tóm tắt review</h1>
          <p>
            Đối tác dùng khóa nÃ y để gửi review từ website của mình về hệ thống, sau đó gắn nút AI để hiển thị bản tóm tắt review.
          </p>
        </div>

        <div className={styles.keyPreview}>
          <span>Khóa live</span>
          <strong>{maskKey(liveKey)}</strong>
          <small>Mỗi lần gọi API thÃ nh công sẽ tính và o quota.</small>
        </div>
      </section>

      <section className={styles.keyGrid}>
        <ApiKeyCard
          title="Khóa sandbox"
          value={sandboxKey}
          helper="Dùng để thử nghiệm trước khi kết nối thật."
        />

        <ApiKeyCard
          title="Khóa live"
          value={liveKey}
          helper="Dùng cho website hoặc hệ thống thật của đối tác."
          onRegenerate={() => setShowConfirm(true)}
          regenerating={regenerating}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionTag}>Thiết lập</span>
            <h2>Thông tin kết nối</h2>
            <p>Điền đúng mã dịch vụ đã được cấp quyền. AI chỉ xử lý dữ liệu trong phạm vi mã nÃ y.</p>
          </div>

          <div className={styles.safeBadge}>Không trả raw review</div>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Địa chỉ API hệ thống</span>
            <input value={apiBase} onChange={event => setApiBase(event.target.value)} />
            <small>Test local dùng https://reviewhub-backend-ki8w.onrender.com.</small>
          </label>

          <label className={styles.field}>
            <span>Website hiển thị nút AI</span>
            <input value={frontendBase} onChange={event => setFrontendBase(event.target.value)} />
            <small>Test local dùng http://localhost:5173.</small>
          </label>

          <div className={styles.serviceField}>
            <div className={styles.serviceLabelRow}>
              <span>Dịch vụ đã đăng ký</span>
              <button type="button" onClick={() => setShowServiceCode(value => !value)}>
                {showServiceCode ? 'Ẩn mã' : 'Hiện mã'}
              </button>
            </div>

            {serviceOptions.length > 1 ? (
              <select value={targetCode} onChange={event => setTargetCode(event.target.value)}>
                {serviceOptions.map(item => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className={styles.lockedService}>
                {selectedService.label}
              </div>
            )}

            {showServiceCode && (
              <small>Mã đang dùng: <b>{selectedService.code}</b></small>
            )}

            {!showServiceCode && (
              <small>Không cho nhập tay để tránh chọn sai dịch vụ.</small>
            )}
          </div>

          <label className={styles.field}>
            <span>Tên nút AI</span>
            <input value={embedTitle} onChange={event => setEmbedTitle(event.target.value)} />
            <small>Nên đặt ngắn, dễ hiểu và có tên thương hiệu.</small>
          </label>
        </div>
      </section>

      <section className={styles.flowGrid}>
        <article className={styles.stepCard}>
          <div className={styles.stepNumber}>1</div>
          <div>
            <h3>Gửi review về hệ thống</h3>
            <p>Website hoặc CRM của đối tác gửi review theo mẫu. Hệ thống sẽ kiểm tra khóa, quota và mã dịch vụ trước khi lưu.</p>
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryBtn} onClick={sendSampleReviews} disabled={importing}>
              {importing ? 'Đang gửi...' : 'Gửi thử review mẫu'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => showSnippet('importJson')}>
              {copiedKey === 'importJson' ? 'Đã copy' : 'Copy mẫu JSON'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => showSnippet('importCurl')}>
              {copiedKey === 'importCurl' ? 'Đã copy' : 'Copy lệnh API'}
            </button>
          </div>

          {importResult && (
            <div className={styles.resultPanel}>
              <div className={styles.resultMeta}>
                <span>Phản hồi khi gửi review mẫu</span>
                <button type="button" onClick={() => setShowImportData(value => !value)}>
                  {showImportData ? 'Ẩn dữ liệu' : 'Xem dữ liệu'}
                </button>
              </div>

              {showImportData && (
                <pre className={styles.jsonPreview}>
                  <code>{JSON.stringify(importResult, null, 2)}</code>
                </pre>
              )}
            </div>
          )}
        </article>

        <article className={styles.stepCard}>
          <div className={styles.stepNumber}>2</div>
          <div>
            <h3>Kiểm tra AI tóm tắt</h3>
            <p>AI đọc review của dịch vụ đã chọn và trả về dữ liệu tóm tắt dạng JSON để kiểm tra trước khi gắn lên website.</p>
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryBtn} onClick={checkSummary} disabled={checking}>
              {checking ? 'Đang kiểm tra...' : 'Kiểm tra AI'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => showSnippet('summaryCurl')}>
              {copiedKey === 'summaryCurl' ? 'Đã copy' : 'Copy lệnh test'}
            </button>
          </div>

          {summaryResult && (
            <div className={styles.resultPanel}>
              <div className={styles.resultMeta}>
                <span>Phản hồi khi kiểm tra AI tóm tắt</span>
                <button type="button" onClick={() => setShowSummaryData(value => !value)}>
                  {showSummaryData ? 'Ẩn dữ liệu' : 'Xem dữ liệu'}
                </button>
              </div>

              {showSummaryData && (
                <pre className={styles.jsonPreview}>
                  <code>{JSON.stringify(summaryResult, null, 2)}</code>
                </pre>
              )}
            </div>
          )}
        </article>

        <article className={styles.stepCard}>
          <div className={styles.stepNumber}>3</div>
          <div>
            <h3>Gắn nút AI lên website</h3>
            <p>Copy mã nhúng và gửi cho người phụ trách website. Khách truy cập sẽ thấy nút AI ở góc phải dưới.</p>
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryBtn} onClick={() => showSnippet('embedCode')}>
              {copiedKey === 'embedCode' ? 'Đã copy' : 'Copy mã gắn web'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => showSnippet('testHtml')}>
              {copiedKey === 'testHtml' ? 'Đã copy' : 'Copy file test'}
            </button>
          </div>
        </article>
      </section>

      {actionError && (
        <div className={styles.errorBox}>
          {actionError}
        </div>
      )}

      {activeSnippet && (
        <section className={styles.snippetPanel}>
          <div className={styles.snippetHead}>
            <div>
              <span>Mã dÃ nh cho kỹ thuật</span>
              <h3>{snippets[activeSnippet]?.title}</h3>
            </div>
            <div className={styles.snippetActions}>
              <button type="button" onClick={() => copyText(snippets[activeSnippet]?.value, activeSnippet)}>
                {copiedKey === activeSnippet ? 'Đã copy' : 'Copy lại'}
              </button>
              <button type="button" onClick={() => setActiveSnippet(null)}>Ẩn</button>
            </div>
          </div>

          <pre>
            <code>{snippets[activeSnippet]?.value}</code>
          </pre>
        </section>
      )}

      <section className={styles.helpBar}>
        <span><b>401</b> Khóa sai hoặc chưa được cấp.</span>
        <span><b>403</b> Khóa không có quyền với mã dịch vụ.</span>
        <span><b>429</b> Quota đã hết, cần gia hạn hoặc nâng gói.</span>
      </section>

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Đóng">×</button>
        </div>
      )}

      {showConfirm && (
        <div className={styles.overlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()}>
            <div className={styles.modalIcon}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4.75 12A7.25 7.25 0 0 1 17.3 6.5M19.25 12A7.25 7.25 0 0 1 6.7 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16.75 4.75v3.5h3.5M3.75 15.75v3.5h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h3>Tạo lại khóa API?</h3>
            <p>
              Khóa cũ sẽ ngừng hoạt động ngay. Nếu website đang dùng khóa nÃ y,
              đối tác cần cập nhật lại khóa mới sau khi tạo.
            </p>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowConfirm(false)}>Hủy</button>
              <button type="button" className={styles.confirmBtn} onClick={doRegenerate}>Tạo khóa mới</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

