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
 'DV-001': 'Dá»‹ch vá»¥ Ä‘Æ°a Ä‘Ã³n sÃ¢n bay',
  'DV-002': 'Dá»‹ch vá»¥ thuÃª xe tá»± lÃ¡i',
  'DV-003': 'Dá»‹ch vá»¥ thuÃª xe cÃ³ tÃ i xáº¿',
  'DV-004': 'Dá»‹ch vá»¥ Ä‘áº·t vÃ© tham quan',
  'DV-005': 'Dá»‹ch vá»¥ báº£o hiá»ƒm du lá»‹ch',
  'DV-006': 'Dá»‹ch vá»¥ lÃ m visa du lá»‹ch',
  'DV-007': 'Dá»‹ch vá»¥ há»™ chiáº¿u vÃ  giáº¥y tá» du lá»‹ch',
  'DV-008': 'Dá»‹ch vá»¥ eSIM du lá»‹ch',
  'DV-009': 'Dá»‹ch vá»¥ Ä‘á»•i tiá»n du lá»‹ch',
  'DV-010': 'Dá»‹ch vá»¥ gá»­i hÃ nh lÃ½',
  'DV-011': 'Dá»‹ch vá»¥ giao hÃ nh lÃ½ táº­n nÆ¡i',
  'DV-012': 'Dá»‹ch vá»¥ hÆ°á»›ng dáº«n viÃªn Ä‘á»‹a phÆ°Æ¡ng',
  'DV-013': 'Dá»‹ch vá»¥ phiÃªn dá»‹ch du lá»‹ch',
  'DV-014': 'Dá»‹ch vá»¥ Ä‘áº·t nhÃ  hÃ ng du lá»‹ch',
  'DV-015': 'Dá»‹ch vá»¥ Ä‘áº·t du thuyá»n',
  'DV-016': 'Dá»‹ch vá»¥ booking engine OTA',
  'DV-017': 'Dá»‹ch vá»¥ quáº£n lÃ½ Ä‘Ã¡nh giÃ¡ OTA',
  'DV-018': 'Dá»‹ch vá»¥ chÄƒm sÃ³c khÃ¡ch hÃ ng du lá»‹ch',
  'DV-019': 'Dá»‹ch vá»¥ thiáº¿t káº¿ lá»‹ch trÃ¬nh du lá»‹ch',
  'DV-020': 'Dá»‹ch vá»¥ há»— trá»£ kháº©n cáº¥p du lá»‹ch',
  'KS-001': 'MÆ°á»ng Thanh Luxury ÄÃ  Náºµng',
  'KS-002': 'Vinpearl Resort Nha Trang',
  'KS-003': 'FLC Grand Hotel Háº¡ Long',
  'KS-004': 'InterContinental Hanoi Westlake',
  'KS-005': 'Hotel Nikko Saigon',
  'KS-006': 'Saigon Morin Hotel Huáº¿',
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
  'KS-017': 'MeliÃ¡ Hanoi',
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
  'PT-004': 'PhÆ°Æ¡ng Trang',
  'PT-005': 'ThÃ nh BÆ°á»Ÿi',
  'PT-006': 'HoÃ ng Long',
  'PT-007': 'Kumho Samco',
  'PT-008': 'Trung NghÄ©a',
  'PT-009': 'CÃºc TÃ¹ng',
  'PT-010': 'Mai Linh Express',
  'PT-011': 'Xe Háº¡nh',
  'PT-012': 'TÃ¢n PhÆ°á»›c KhÃ¡nh',
  'PT-013': 'Sao Viá»‡t',
  'PT-014': 'Äá»©c Thanh',
  'PT-015': 'Thuáº­n Tháº£o',
  'PT-016': 'Váº¡n XuÃ¢n',
  'PT-017': 'Xe PhÆ°Æ¡ng Nam',
  'PT-018': 'Hoa PhÆ°á»£ng',
  'PT-019': 'Sinh Tourist',
  'PT-020': 'Eva Express',
  'PT-021': 'Hanh CafÃ©',
  'PT-022': 'LiÃªn HÆ°ng',
  'PT-023': 'Táº¥n PhÃ¡t',
  'PT-024': 'Thiá»‡n TrÆ°á»ng',
  'PT-025': 'Xe Minh QuÃ¢n',
  'PT-026': 'MÃª KÃ´ng Express',
  'PT-027': 'ThÃ¹y DÆ°Æ¡ng',
  'PT-028': 'PhÃº QuÃ½',
  'PT-029': 'Tiáº¿n ThÃ nh',
  'PT-030': 'Minh ChÃ¢u',
  'PT-031': 'Quang Vinh',
  'PT-032': 'TrÆ°á»ng Tiáº¿n',
  'PT-033': 'PhÃºc Lá»™c',
  'PT-034': 'HÃ¹ng CÆ°á»ng',
  'PT-035': 'Viá»‡t Thanh',
  'PT-036': 'Äá»©c DÆ°Æ¡ng',
  'PT-037': 'TÃ¢n Háº£i Long',
  'PT-038': 'Minh Hiáº¿u',
  'PT-039': 'Trung Trang',
  'PT-040': 'NhÆ° Vinh',
  'PT-041': 'Anh TuyÃªn',
  'PT-042': 'VÅ© Linh',
  'PT-043': 'Thiá»‡n TrÃ­',
  'PT-044': 'Trá»ng Minh',
  'PT-045': 'ToÃ n Tháº¯ng',
  'PT-046': 'DÅ©ng Lá»‡',
  'PT-047': 'Minh NghÄ©a',
  'PT-048': 'Tiáº¿n Oanh',
  'PT-049': 'VÃµ CÃºc PhÆ°Æ¡ng ',
  'PT-050': 'HoÃ  LiÃªm',
  'PT-051': 'Äá»©c Minh',
  'TH-001': 'Tuyáº¿n SE1 HÃ  Ná»™i - TP. Há»“ ChÃ­ Minh',
  'TH-002': 'Tuyáº¿n SE2 TP. Há»“ ChÃ­ Minh - HÃ  Ná»™i',
  'TH-003': 'Tuyáº¿n SE3 HÃ  Ná»™i - SÃ i GÃ²n',
  'TH-004': 'Tuyáº¿n SE4 SÃ i GÃ²n - HÃ  Ná»™i',
  'TH-005': 'Tuyáº¿n HÃ  Ná»™i - Háº£i PhÃ²ng',
  'TH-006': 'Tuyáº¿n Háº£i PhÃ²ng - HÃ  Ná»™i',
  'TH-007': 'Tuyáº¿n HÃ  Ná»™i - LÃ o Cai',
  'TH-008': 'Tuyáº¿n LÃ o Cai - HÃ  Ná»™i',
  'TH-009': 'Tuyáº¿n HÃ  Ná»™i - Vinh',
  'TH-010': 'Tuyáº¿n Vinh - HÃ  Ná»™i',
  'TH-011': 'Tuyáº¿n SÃ i GÃ²n - Nha Trang',
  'TH-012': 'Tuyáº¿n Nha Trang - SÃ i GÃ²n',
  'TH-013': 'Tuyáº¿n SÃ i GÃ²n - Phan Thiáº¿t',
  'TH-014': 'Tuyáº¿n Phan Thiáº¿t - SÃ i GÃ²n',
  'TH-015': 'Tuyáº¿n ÄÃ  Náºµng - Huáº¿',
  'TH-016': 'Tuyáº¿n Huáº¿ - ÄÃ  Náºµng',
  'TH-017': 'Tuyáº¿n ÄÃ  Náºµng - Quy NhÆ¡n',
  'TH-018': 'Tuyáº¿n Quy NhÆ¡n - ÄÃ  Náºµng',
  'TH-019': 'Tuyáº¿n SÃ i GÃ²n - ÄÃ  Láº¡t',
  'TH-020': 'Tuyáº¿n HÃ  Ná»™i - Háº¡ Long',
  'TO-001': 'Tour Sa Pa 3 ngÃ y 2 Ä‘Ãªm',
  'TO-002': 'Tour Háº¡ Long 2 ngÃ y 1 Ä‘Ãªm',
  'TO-003': 'Tour Ninh BÃ¬nh TrÃ ng An - BÃ¡i ÄÃ­nh',
  'TO-004': 'Tour HÃ  Giang 3 ngÃ y 2 Ä‘Ãªm',
  'TO-005': 'Tour ÄÃ  Náºµng - Há»™i An - Huáº¿',
  'TO-006': 'Tour BÃ  NÃ  Hills 1 ngÃ y',
  'TO-007': 'Tour CÃ¹ Lao ChÃ m 1 ngÃ y',
  'TO-008': 'Tour Nha Trang 3 ngÃ y 2 Ä‘Ãªm',
  'TO-009': 'Tour ÄÃ  Láº¡t 3 ngÃ y 2 Ä‘Ãªm',
  'TO-010': 'Tour PhÃº Quá»‘c 4 ngÃ y 3 Ä‘Ãªm',
  'TO-011': 'Tour CÃ´n Äáº£o 3 ngÃ y 2 Ä‘Ãªm',
  'TO-012': 'Tour Miá»n TÃ¢y 2 ngÃ y 1 Ä‘Ãªm',
  'TO-013': 'Tour Cá»§ Chi - Mekong 1 ngÃ y',
  'TO-014': 'Tour MÅ©i NÃ© 2 ngÃ y 1 Ä‘Ãªm',
  'TO-015': 'Tour Quy NhÆ¡n - PhÃº YÃªn 4 ngÃ y 3 Ä‘Ãªm',
  'TO-016': 'Tour Má»™c ChÃ¢u 2 ngÃ y 1 Ä‘Ãªm',
  'TO-017': 'Tour Mai ChÃ¢u 2 ngÃ y 1 Ä‘Ãªm',
  'TO-018': 'Tour Singapore 4 ngÃ y 3 Ä‘Ãªm',
  'TO-019': 'Tour ThÃ¡i Lan Bangkok - Pattaya',
  'TO-020': 'Tour HÃ n Quá»‘c Seoul - Nami',
};

function getServiceType(code, category) {
  const value = String(code || '').trim().toUpperCase();
  const cate = String(category || '').toLowerCase();

  if (value.startsWith('PT-') || value.startsWith('BUS-')) return 'NhÃ  xe';
  if (value.startsWith('KS-') || value.startsWith('HOTEL-')) return 'KhÃ¡ch sáº¡n';
  if (value.startsWith('MB-') || value.startsWith('AIR-')) return 'MÃ¡y bay';
  if (value.startsWith('TH-') || value.startsWith('TRAIN-')) return 'TÃ u há»a';
  if (value.startsWith('TO-') || value.startsWith('TOUR-')) return 'Tour';
  if (value.startsWith('DV-') || value.startsWith('SERVICE-')) return 'Dá»‹ch vá»¥';

  if (cate.includes('khÃ¡ch') || cate.includes('hotel')) return 'KhÃ¡ch sáº¡n';
  if (cate.includes('mÃ¡y') || cate.includes('bay')) return 'MÃ¡y bay';
  if (cate.includes('tÃ u')) return 'TÃ u há»a';
  if (cate.includes('tour')) return 'Tour';

  return 'Dá»‹ch vá»¥';
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
  const type = service?.type || 'Dá»‹ch vá»¥';
  const name = service?.name || '';

  if (name) return `${code} Â· ${type} ${name}`;
  return `${code} Â· ${type}`;
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
  if (!text) return 'ChÆ°a cÃ³ khÃ³a';
  if (text.length <= 18) return text;
  return `${text.slice(0, 12)}â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢${text.slice(-6)}`;
}

function makeImportBody({ targetCode, targetName }) {
  return JSON.stringify({
    targetCode: targetCode || 'PT-013',
    targetName: targetName || 'TÃªn dá»‹ch vá»¥',
    category: 'NhÃ  xe',
    sourceName: 'website-doi-tac',
    reviews: [
      {
        externalId: 'rv-001',
        reviewerName: 'Nguyá»…n VÄƒn A',
        rating: 5,
        comment: 'Dá»‹ch vá»¥ tá»‘t, nhÃ¢n viÃªn há»— trá»£ nhiá»‡t tÃ¬nh.',
        createdAt: new Date().toISOString(),
      },
      {
        externalId: 'rv-002',
        reviewerName: 'Tráº§n Thá»‹ B',
        rating: 2,
        comment: 'Cáº§n cáº£i thiá»‡n thá»i gian phá»¥c vá»¥ vÃ  pháº£n há»“i khÃ¡ch hÃ ng.',
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
  data-title="${title || 'Há»i AI vá» Ä‘Ã¡nh giÃ¡'}">
</script>`;
}

function makeTestHtml({ frontendBase, apiBase, apiKey, targetCode, title }) {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Test AI tÃ³m táº¯t review</title>
</head>
<body>
  <h1>Test AI tÃ³m táº¯t review</h1>
  <p>Báº¥m nÃºt AI á»Ÿ gÃ³c pháº£i dÆ°á»›i Ä‘á»ƒ kiá»ƒm tra.</p>

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
    currentUser?.orgName ? `Há»i AI vá» ${currentUser.orgName}` : 'Há»i AI vá» Ä‘Ã¡nh giÃ¡'
  );

  const selectedService = useMemo(() => {
    return serviceOptions.find(item => item.code === targetCode) || serviceOptions[0] || {
      code: targetCode || 'PT-013',
      name: currentUser?.orgName || 'Dá»‹ch vá»¥ máº·c Ä‘á»‹nh',
    };
  }, [serviceOptions, targetCode, currentUser]);

  const targetName = selectedService?.name || currentUser?.orgName || 'TÃªn dá»‹ch vá»¥';

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
      title: 'Máº«u dá»¯ liá»‡u review',
      value: importBody,
    },
    importCurl: {
      title: 'Lá»‡nh gá»­i review máº«u',
      value: makeImportCurl({ apiBase, apiKey: liveKey, targetCode, targetName }),
    },
    summaryCurl: {
      title: 'Lá»‡nh kiá»ƒm tra AI Summary',
      value: makeSummaryCurl({ apiBase, apiKey: liveKey, targetCode }),
    },
    embedCode: {
      title: 'MÃ£ gáº¯n vÃ o website',
      value: makeEmbedCode({ frontendBase, apiBase, apiKey: liveKey, targetCode, title: embedTitle }),
    },
    testHtml: {
      title: 'File test hoÃ n chá»‰nh',
      value: makeTestHtml({ frontendBase, apiBase, apiKey: liveKey, targetCode, title: embedTitle }),
    },
  }), [apiBase, frontendBase, liveKey, targetCode, targetName, embedTitle, importBody]);

  async function copyText(value, key) {
    try {
      await navigator.clipboard.writeText(value || '');
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(''), 1400);
    } catch {
      setError('KhÃ´ng copy tá»± Ä‘á»™ng Ä‘Æ°á»£c. Vui lÃ²ng copy thá»§ cÃ´ng.');
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
      setError('KhÃ´ng thá»ƒ táº¡o láº¡i khÃ³a. Vui lÃ²ng thá»­ láº¡i sau.');
    } finally {
      setRegenerating(false);
    }
  }

  async function sendSampleReviews() {
    if (!liveKey) {
      setActionError('TÃ i khoáº£n chÆ°a cÃ³ khÃ³a live.');
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
      setActionError(err?.message || 'KhÃ´ng gá»­i Ä‘Æ°á»£c review máº«u.');
    } finally {
      setImporting(false);
    }
  }

  async function checkSummary() {
    if (!liveKey) {
      setActionError('TÃ i khoáº£n chÆ°a cÃ³ khÃ³a live.');
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
      setActionError(err?.message || 'KhÃ´ng kiá»ƒm tra Ä‘Æ°á»£c AI Summary.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div>
          <span className={styles.eyebrow}>Káº¿t ná»‘i Ä‘á»‘i tÃ¡c</span>
          <h1>KhÃ³a API vÃ  AI tÃ³m táº¯t review</h1>
          <p>
            Äá»‘i tÃ¡c dÃ¹ng khÃ³a nÃ y Ä‘á»ƒ gá»­i review tá»« website cá»§a mÃ¬nh vá» há»‡ thá»‘ng, sau Ä‘Ã³ gáº¯n nÃºt AI Ä‘á»ƒ hiá»ƒn thá»‹ báº£n tÃ³m táº¯t review.
          </p>
        </div>

        <div className={styles.keyPreview}>
          <span>KhÃ³a live</span>
          <strong>{maskKey(liveKey)}</strong>
          <small>Má»—i láº§n gá»i API thÃ nh cÃ´ng sáº½ tÃ­nh vÃ o quota.</small>
        </div>
      </section>

      <section className={styles.keyGrid}>
        <ApiKeyCard
          title="KhÃ³a sandbox"
          value={sandboxKey}
          helper="DÃ¹ng Ä‘á»ƒ thá»­ nghiá»‡m trÆ°á»›c khi káº¿t ná»‘i tháº­t."
        />

        <ApiKeyCard
          title="KhÃ³a live"
          value={liveKey}
          helper="DÃ¹ng cho website hoáº·c há»‡ thá»‘ng tháº­t cá»§a Ä‘á»‘i tÃ¡c."
          onRegenerate={() => setShowConfirm(true)}
          regenerating={regenerating}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionTag}>Thiáº¿t láº­p</span>
            <h2>ThÃ´ng tin káº¿t ná»‘i</h2>
            <p>Äiá»n Ä‘Ãºng mÃ£ dá»‹ch vá»¥ Ä‘Ã£ Ä‘Æ°á»£c cáº¥p quyá»n. AI chá»‰ xá»­ lÃ½ dá»¯ liá»‡u trong pháº¡m vi mÃ£ nÃ y.</p>
          </div>

          <div className={styles.safeBadge}>KhÃ´ng tráº£ raw review</div>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Äá»‹a chá»‰ API há»‡ thá»‘ng</span>
            <input value={apiBase} onChange={event => setApiBase(event.target.value)} />
            <small>Test local dÃ¹ng https://reviewhub-backend-ki8w.onrender.com.</small>
          </label>

          <label className={styles.field}>
            <span>Website hiá»ƒn thá»‹ nÃºt AI</span>
            <input value={frontendBase} onChange={event => setFrontendBase(event.target.value)} />
            <small>Test local dÃ¹ng http://localhost:5173.</small>
          </label>

          <div className={styles.serviceField}>
            <div className={styles.serviceLabelRow}>
              <span>Dá»‹ch vá»¥ Ä‘Ã£ Ä‘Äƒng kÃ½</span>
              <button type="button" onClick={() => setShowServiceCode(value => !value)}>
                {showServiceCode ? 'áº¨n mÃ£' : 'Hiá»‡n mÃ£'}
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
              <small>MÃ£ Ä‘ang dÃ¹ng: <b>{selectedService.code}</b></small>
            )}

            {!showServiceCode && (
              <small>KhÃ´ng cho nháº­p tay Ä‘á»ƒ trÃ¡nh chá»n sai dá»‹ch vá»¥.</small>
            )}
          </div>

          <label className={styles.field}>
            <span>TÃªn nÃºt AI</span>
            <input value={embedTitle} onChange={event => setEmbedTitle(event.target.value)} />
            <small>NÃªn Ä‘áº·t ngáº¯n, dá»… hiá»ƒu vÃ  cÃ³ tÃªn thÆ°Æ¡ng hiá»‡u.</small>
          </label>
        </div>
      </section>

      <section className={styles.flowGrid}>
        <article className={styles.stepCard}>
          <div className={styles.stepNumber}>1</div>
          <div>
            <h3>Gá»­i review vá» há»‡ thá»‘ng</h3>
            <p>Website hoáº·c CRM cá»§a Ä‘á»‘i tÃ¡c gá»­i review theo máº«u. Há»‡ thá»‘ng sáº½ kiá»ƒm tra khÃ³a, quota vÃ  mÃ£ dá»‹ch vá»¥ trÆ°á»›c khi lÆ°u.</p>
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryBtn} onClick={sendSampleReviews} disabled={importing}>
              {importing ? 'Äang gá»­i...' : 'Gá»­i thá»­ review máº«u'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => showSnippet('importJson')}>
              {copiedKey === 'importJson' ? 'ÄÃ£ copy' : 'Copy máº«u JSON'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => showSnippet('importCurl')}>
              {copiedKey === 'importCurl' ? 'ÄÃ£ copy' : 'Copy lá»‡nh API'}
            </button>
          </div>

          {importResult && (
            <div className={styles.resultPanel}>
              <div className={styles.resultMeta}>
                <span>Pháº£n há»“i khi gá»­i review máº«u</span>
                <button type="button" onClick={() => setShowImportData(value => !value)}>
                  {showImportData ? 'áº¨n dá»¯ liá»‡u' : 'Xem dá»¯ liá»‡u'}
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
            <h3>Kiá»ƒm tra AI tÃ³m táº¯t</h3>
            <p>AI Ä‘á»c review cá»§a dá»‹ch vá»¥ Ä‘Ã£ chá»n vÃ  tráº£ vá» dá»¯ liá»‡u tÃ³m táº¯t dáº¡ng JSON Ä‘á»ƒ kiá»ƒm tra trÆ°á»›c khi gáº¯n lÃªn website.</p>
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryBtn} onClick={checkSummary} disabled={checking}>
              {checking ? 'Äang kiá»ƒm tra...' : 'Kiá»ƒm tra AI'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => showSnippet('summaryCurl')}>
              {copiedKey === 'summaryCurl' ? 'ÄÃ£ copy' : 'Copy lá»‡nh test'}
            </button>
          </div>

          {summaryResult && (
            <div className={styles.resultPanel}>
              <div className={styles.resultMeta}>
                <span>Pháº£n há»“i khi kiá»ƒm tra AI tÃ³m táº¯t</span>
                <button type="button" onClick={() => setShowSummaryData(value => !value)}>
                  {showSummaryData ? 'áº¨n dá»¯ liá»‡u' : 'Xem dá»¯ liá»‡u'}
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
            <h3>Gáº¯n nÃºt AI lÃªn website</h3>
            <p>Copy mÃ£ nhÃºng vÃ  gá»­i cho ngÆ°á»i phá»¥ trÃ¡ch website. KhÃ¡ch truy cáº­p sáº½ tháº¥y nÃºt AI á»Ÿ gÃ³c pháº£i dÆ°á»›i.</p>
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryBtn} onClick={() => showSnippet('embedCode')}>
              {copiedKey === 'embedCode' ? 'ÄÃ£ copy' : 'Copy mÃ£ gáº¯n web'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => showSnippet('testHtml')}>
              {copiedKey === 'testHtml' ? 'ÄÃ£ copy' : 'Copy file test'}
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
              <span>MÃ£ dÃ nh cho ká»¹ thuáº­t</span>
              <h3>{snippets[activeSnippet]?.title}</h3>
            </div>
            <div className={styles.snippetActions}>
              <button type="button" onClick={() => copyText(snippets[activeSnippet]?.value, activeSnippet)}>
                {copiedKey === activeSnippet ? 'ÄÃ£ copy' : 'Copy láº¡i'}
              </button>
              <button type="button" onClick={() => setActiveSnippet(null)}>áº¨n</button>
            </div>
          </div>

          <pre>
            <code>{snippets[activeSnippet]?.value}</code>
          </pre>
        </section>
      )}

      <section className={styles.helpBar}>
        <span><b>401</b> KhÃ³a sai hoáº·c chÆ°a Ä‘Æ°á»£c cáº¥p.</span>
        <span><b>403</b> KhÃ³a khÃ´ng cÃ³ quyá»n vá»›i mÃ£ dá»‹ch vá»¥.</span>
        <span><b>429</b> Quota Ä‘Ã£ háº¿t, cáº§n gia háº¡n hoáº·c nÃ¢ng gÃ³i.</span>
      </section>

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="ÄÃ³ng">Ã—</button>
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

            <h3>Táº¡o láº¡i khÃ³a API?</h3>
            <p>
              KhÃ³a cÅ© sáº½ ngá»«ng hoáº¡t Ä‘á»™ng ngay. Náº¿u website Ä‘ang dÃ¹ng khÃ³a nÃ y,
              Ä‘á»‘i tÃ¡c cáº§n cáº­p nháº­t láº¡i khÃ³a má»›i sau khi táº¡o.
            </p>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowConfirm(false)}>Há»§y</button>
              <button type="button" className={styles.confirmBtn} onClick={doRegenerate}>Táº¡o khÃ³a má»›i</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

