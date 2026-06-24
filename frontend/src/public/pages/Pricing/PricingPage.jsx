import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatNumber } from '../../../shared/lib/format';
import { fetchPlans } from '../../../services/planService';
import { fetchServiceCatalog, SERVICE_CATEGORIES } from '../../../services/operatorService';
import { useAuth } from '../../../auth/context/AuthContext';
import { PRIVILEGE_META, PRIVILEGE_ORDER } from '../../../shared/lib/privileges';
import styles from './PricingPage.module.css';

const MAX_MONTH = 12;
const PLAN_ORDER = ['starter', 'growth', 'enterprise'];
const CUSTOM_DISCOUNT_MIN_ITEMS = 2;
const CUSTOM_DISCOUNT_RATE = 0.1;

const FALLBACK_PLANS = {
  starter: {
    id: 'starter',
    name: 'Khởi đầu',
    price: 400000,
    quota: 5000,
    durationDays: 30,
    cycle: 'tháng',
    status: 'Đang bán',
    featured: false,
    privileges: ['Theo dõi 1 dịch vụ đã chọn', 'Xem điểm trung bình và tổng review', 'Thống kê cơ bản trong cổng đối tác'],
  },
  growth: {
    id: 'growth',
    name: 'Tăng trưởng',
    price: 2490000,
    quota: 50000,
    durationDays: 30,
    cycle: 'tháng',
    status: 'Đang bán',
    featured: true,
    privileges: ['Gồm quyền lợi của Khởi đầu', 'Dung lượng tra cứu cao hơn ', 'Tổng hợp đánh giá rõ hơn ', 'Lịch sử sử dụng dữ liệu'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Doanh nghiệp',
    price: 9990000,
    quota: 300000,
    durationDays: 30,
    cycle: 'tháng',
    status: 'Đang bán',
    featured: false,
    privileges: ['Gồm quyền lợi của Tăng trưởng', 'Dung lượng lớn cho doanh nghiệp', 'Báo cáo nâng cao', 'Hỗ trợ riêng khi vận hành'],
  },
};

const PLAN_UI = {
  starter: {
    eyebrow: 'Gói cơ bản',
    badge: 'Chọn 1 dịch vụ',
    desc: 'Theo dõi một nhà xe, khách sạn, hãng bay, tour hoặc dịch vụ du lịch ở mức cơ bản.',
    tone: 'green',
    level: '1/4 gói',
    scopeTitle: 'Điểm nổi bật',
    scope: ['Theo dõi 1 dịch vụ cụ thể', 'Xem điểm số, tổng review và nhận xét tiêu biểu', 'Phù hợp để bắt đầu kiểm tra chất lượng'],
    modalTitle: 'Chọn dịch vụ muốn theo dõi',
    modalDesc: 'Chọn đúng nhà xe, khách sạn, hãng bay, tàu hỏa, tour hoặc dịch vụ du lịch bạn muốn xem đánh giá.',
    mode: 'single',
  },
  growth: {
    eyebrow: 'Phổ biến nhất',
    badge: 'Chọn 1 dịch vụ',
    desc: 'Dành cho đơn vị cần theo dõi đánh giá thường xuyên hơn và xem dữ liệu rõ hơn.',
    tone: 'amber',
    level: '2/4 gói',
    scopeTitle: 'Có thêm gì?',
    scope: ['Gồm quyền lợi của Khởi đầu', 'Dung lượng tra cứu cao hơn', 'Cho phép gửi review và lưu vào server riêng'],
    modalTitle: 'Chọn dịch vụ cho gói Tăng trưởng',
    modalDesc: 'Phù hợp với đơn vị đang vận hành thực tế và cần theo dõi chất lượng dịch vụ đều đặn.',
    mode: 'single',
  },
  enterprise: {
    eyebrow: 'Doanh nghiệp lớn',
    badge: 'Chọn 1 dịch vụ',
    desc: 'Dành cho doanh nghiệp cần dung lượng lớn, báo cáo sâu và hỗ trợ riêng khi vận hành.',
    tone: 'blue',
    level: '3/4 gói',
    scopeTitle: 'Có thêm gì?',
    scope: ['Gồm quyền lợi của Tăng trưởng', 'Báo cáo nâng cao theo chất lượng dịch vụ', 'Hỗ trợ riêng và mở rộng theo thương hiệu'],
    modalTitle: 'Chọn dịch vụ cho gói Doanh nghiệp',
    modalDesc: 'Dành cho doanh nghiệp muốn theo dõi đánh giá chuyên sâu cho một dịch vụ trọng điểm.',
    mode: 'single',
  },
  custom: {
    eyebrow: 'Gói tự chọn',
    badge: 'Chọn nhiều + ưu đãi',
    desc: 'Chọn nhiều dịch vụ cùng lúc. Từ 2 dịch vụ trở lên được giảm ngay 10% so với giá gốc.',
    tone: 'purple',
    level: '4/4 gói',
    scopeTitle: 'Linh hoạt hơn',
    scope: ['Chọn nhiều nhóm dịch vụ', 'Chọn mức Khởi đầu, Tăng trưởng hoặc Doanh nghiệp', 'Từ 2 dịch vụ giảm ngay 10%'],
    modalTitle: 'Tự chọn dịch vụ cần theo dõi',
    modalDesc: 'Chọn các dịch vụ muốn xem đánh giá, sau đó chọn cấp gói phù hợp. Chọn từ 2 dịch vụ trở lên, hệ thống hiển thị ngay ưu đãi giảm 10%.',
    mode: 'multi',
  },
};

const CUSTOM_LEVELS = [
  {
    id: 'starter',
    label: 'Khởi đầu',
    short: 'Cơ bản',
    unitPrice: 400000,
    factor: 1,
    quotaPerItem: 5000,
    desc: 'Xem điểm số, tổng review và nhận xét tiêu biểu cho từng dịch vụ.',
  },
  {
    id: 'growth',
    label: 'Tăng trưởng',
    short: 'Nâng cao',
    unitPrice: 2490000,
    factor: 1,
    quotaPerItem: 50000,
    desc: 'Thêm dung lượng cao hơn và thống kê đánh giá rõ hơn.',
  },
  {
    id: 'enterprise',
    label: 'Doanh nghiệp',
    short: 'Cao cấp',
    unitPrice: 9990000,
    factor: 1,
    quotaPerItem: 300000,
    desc: 'Dung lượng lớn, báo cáo chuyên sâu và hỗ trợ riêng.',
  },
];

const CATEGORY_ROUTES = {
  'nha-xe': 'nha-xe',
  'khach-san': 'khach-san',
  'may-bay': 'may-bay',
  'tau-hoa': 'tau-hoa',
  tour: 'tour',
  'dich-vu-khac': 'dich-vu-khac',
};




function CategoryIcon({ slug }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': 'true',
    className: styles.categorySvg,
  };

  const line = {
    className: styles.iconLine,
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const icons = {
    all: (
      <svg {...common}>
        <rect className={styles.iconSoft} x="3" y="3" width="18" height="18" rx="6" />
        <rect className={styles.iconFill} x="6.2" y="6.2" width="4.8" height="4.8" rx="1.6" />
        <rect className={styles.iconFill} x="13" y="6.2" width="4.8" height="4.8" rx="1.6" />
        <rect className={styles.iconFill} x="6.2" y="13" width="4.8" height="4.8" rx="1.6" />
        <rect className={styles.iconFill} x="13" y="13" width="4.8" height="4.8" rx="1.6" />
        <path {...line} d="M6.8 11h3.6M13.6 11h3.6M11 6.8v3.6M17.2 13.6v3.2" />
      </svg>
    ),
    'nha-xe': (
      <svg {...common}>
        <rect className={styles.iconSoft} x="4" y="5" width="16" height="12.5" rx="4" />
        <path className={styles.iconFill} d="M7.8 5.2h8.4c1.6 0 2.8 1.2 2.8 2.8v3H5V8c0-1.6 1.2-2.8 2.8-2.8Z" />
        <path {...line} d="M7.2 12.1h9.6M8 17.4v1.4M16 17.4v1.4M8.4 14.8h.01M15.6 14.8h.01" />
        <path {...line} d="M8.4 8h7.2" />
      </svg>
    ),
    'khach-san': (
      <svg {...common}>
        <path className={styles.iconSoft} d="M5 20V6.7A2.7 2.7 0 0 1 7.7 4h8.6A2.7 2.7 0 0 1 19 6.7V20Z" />
        <path className={styles.iconFill} d="M8.2 20v-4.5h7.6V20Z" />
        <path {...line} d="M5 20V6.7A2.7 2.7 0 0 1 7.7 4h8.6A2.7 2.7 0 0 1 19 6.7V20M8.2 20v-4.5h7.6V20" />
        <path {...line} d="M8.4 8h.01M12 8h.01M15.6 8h.01M8.4 11.5h.01M12 11.5h.01M15.6 11.5h.01" />
      </svg>
    ),
    'may-bay': (
      <svg {...common}>
        <path className={styles.iconSoft} d="M3.8 13.9 20.4 4.8c.8-.4 1.6.4 1.2 1.2l-9.1 16.6c-.4.8-1.6.6-1.8-.3l-1.2-6.2-5.4-2.2c-.8-.3-.9-1.5-.3-2Z" />
        <path className={styles.iconFill} d="m10 15.9 10.2-10.2-7.1 12.9Z" />
        <path {...line} d="m4.5 12.6 15.7-6.9-7.3 13.8-2.2-6.7Z" />
        <path {...line} d="m10.7 12.8 9.5-7.1" />
      </svg>
    ),
    'tau-hoa': (
      <svg {...common}>
        <rect className={styles.iconSoft} x="6" y="3.5" width="12" height="14" rx="4" />
        <path className={styles.iconFill} d="M8.4 6.7h7.2v4.2H8.4Z" />
        <path {...line} d="M8.6 17.5 6.7 20M15.4 17.5l1.9 2.5M9.1 20h5.8M9.2 13.7h.01M14.8 13.7h.01" />
        <path {...line} d="M8.4 6.7h7.2v4.2H8.4Z" />
      </svg>
    ),
    tour: (
      <svg {...common}>
        <path className={styles.iconSoft} d="M6.5 4.7 11 3l6.5 2.3v14l-4.5-1.6-6.5 2.3Z" />
        <path className={styles.iconFill} d="M12 8.2a3.1 3.1 0 0 1 3.1 3.1c0 2.4-3.1 5.2-3.1 5.2s-3.1-2.8-3.1-5.2A3.1 3.1 0 0 1 12 8.2Z" />
        <path {...line} d="M6.5 4.7V20M11 3v14.7M17.5 5.3v14" />
        <path {...line} d="M12 10.4h.01" />
      </svg>
    ),
    'dich-vu-khac': (
      <svg {...common}>
        <path className={styles.iconSoft} d="M12 3.7 14.2 9l5.7 1.1-4 4.2.8 5.9L12 17.4l-4.7 2.8.8-5.9-4-4.2L9.8 9Z" />
        <path className={styles.iconFill} d="M12 6.7 13.5 10l3.6.7-2.6 2.7.5 3.7-3-1.8-3 1.8.5-3.7-2.6-2.7 3.6-.7Z" />
        <path {...line} d="M18.8 4.8v2.4M20 6h-2.4M4.8 17v2.4M6 18.2H3.6" />
      </svg>
    ),
  };

  return icons[slug] || icons['dich-vu-khac'];
}

function getPlanById(plans, planId) {
  return plans.find((plan) => plan.id === planId) || FALLBACK_PLANS[planId];
}

function getToneClass(tone) {
  if (tone === 'amber') return styles.toneAmber;
  if (tone === 'blue') return styles.toneBlue;
  if (tone === 'purple') return styles.tonePurple;
  return styles.toneGreen;
}

function isUnavailable(plan) {
  return ['Hết hàng', 'Ngừng bán', 'Tạm ngưng'].includes(plan?.status);
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getSafePrice(value) {
  const price = Number(value || 0);
  return Number.isFinite(price) && price > 0 ? price : 400000;
}

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [qty, setQty] = useState({ starter: 1, growth: 1, enterprise: 1, custom: 1 });
  const [serviceItems, setServiceItems] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [selectedIds, setSelectedIds] = useState({
    starter: [],
    growth: [],
    enterprise: [],
    custom: [],
  });
  const [customLevel, setCustomLevel] = useState('starter');
  const [modalPlanId, setModalPlanId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans().then((data) => {
      const safeData = Array.isArray(data) ? data : [];
      setPlans(safeData);

      setQty((prev) => {
        const next = { ...prev };
        safeData.forEach((plan) => {
          next[plan.id] = next[plan.id] || 1;
        });
        return next;
      });
    });
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadServices() {
      try {
        setServiceLoading(true);
        setServiceError('');

        const data = await fetchServiceCatalog();

        if (alive) {
          setServiceItems(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Không lấy được danh sách dịch vụ:', error);

        if (alive) {
          setServiceError('Chưa tải được danh sách dịch vụ. Vui lòng thử lại sau ít phút.');
          setServiceItems([]);
        }
      } finally {
        if (alive) {
          setServiceLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!modalPlanId) return undefined;

    document.body.classList.add(styles.modalOpenBody);

    return () => {
      document.body.classList.remove(styles.modalOpenBody);
    };
  }, [modalPlanId]);

  const orderedPlans = useMemo(() => PLAN_ORDER.map((id) => getPlanById(plans, id)).filter(Boolean), [plans]);

  const categoryStats = useMemo(() => {
    return SERVICE_CATEGORIES.map((category) => {
      if (category.slug === 'all') {
        return { ...category, count: serviceItems.length };
      }

      return {
        ...category,
        count: serviceItems.filter((item) => item.category === category.slug).length,
      };
    });
  }, [serviceItems]);

  const modalPlan = modalPlanId === 'custom' ? null : getPlanById(plans, modalPlanId);
  const modalUi = modalPlanId ? PLAN_UI[modalPlanId] : null;
  const modalQty = qty[modalPlanId] || 1;
  const selectedForModal = modalPlanId ? selectedIds[modalPlanId] || [] : [];

  const selectedItemsForModal = useMemo(() => {
    if (!modalPlanId) return [];
    const selectedSet = new Set(selectedForModal);
    return serviceItems.filter((item) => selectedSet.has(item.id));
  }, [modalPlanId, selectedForModal, serviceItems]);

  const customLevelInfo = CUSTOM_LEVELS.find((item) => item.id === customLevel) || CUSTOM_LEVELS[0];
  const customItemCount = selectedItemsForModal.length;
  const customDiscountRate = customItemCount >= CUSTOM_DISCOUNT_MIN_ITEMS ? CUSTOM_DISCOUNT_RATE : 0;
  const customRawOneMonthTotal = customItemCount * Number(customLevelInfo.unitPrice || 0);
  const customDiscountOneMonth = Math.round(customRawOneMonthTotal * customDiscountRate);
  const customOneMonthTotal = customRawOneMonthTotal - customDiscountOneMonth;
  const customRawTotal = customRawOneMonthTotal * (qty.custom || 1);
  const customDiscountTotal = customDiscountOneMonth * (qty.custom || 1);
  const customTotal = customOneMonthTotal * (qty.custom || 1);
  const customQuota = customItemCount * customLevelInfo.quotaPerItem * (qty.custom || 1);

  const filteredItems = useMemo(() => {
    const keyword = normalizeText(searchTerm);

    return serviceItems.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      const haystack = normalizeText(`${item.name} ${item.code} ${item.region} ${item.type} ${item.description}`);
      const matchSearch = !keyword || haystack.includes(keyword);
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchTerm, serviceItems]);

  function changeQty(planId, delta) {
    setQty((prev) => ({
      ...prev,
      [planId]: Math.max(1, Math.min(MAX_MONTH, (prev[planId] || 1) + delta)),
    }));
  }

  function openModal(planId) {
    setModalPlanId(planId);
    setActiveCategory('all');
    setSearchTerm('');
  }

  function closeModal() {
    setModalPlanId(null);
    setSearchTerm('');
    setActiveCategory('all');
  }

  function toggleItem(itemId) {
    if (!modalPlanId) return;

    setSelectedIds((prev) => {
      const current = prev[modalPlanId] || [];

      if (modalUi?.mode === 'single') {
        return {
          ...prev,
          [modalPlanId]: current.includes(itemId) ? [] : [itemId],
        };
      }

      return {
        ...prev,
        [modalPlanId]: current.includes(itemId)
          ? current.filter((id) => id !== itemId)
          : [...current, itemId],
      };
    });
  }

  function getFixedPlanTotal(planId) {
    const plan = getPlanById(plans, planId);
    return (Number(plan?.price || 0) || 0) * (qty[planId] || 1);
  }

  function getModalTotal() {
    if (modalPlanId === 'custom') return customTotal;
    return getFixedPlanTotal(modalPlanId);
  }

  function getModalQuota() {
    if (modalPlanId === 'custom') return customQuota;
    return (Number(modalPlan?.quota || 0) || 0) * modalQty;
  }

  function getModalPriceSub() {
    if (modalPlanId === 'custom') {
      if (!selectedItemsForModal.length) return 'Chưa chọn dịch vụ';
      const discountText = customDiscountRate
        ? ` · đã giảm ${formatCurrency(customDiscountOneMonth)} / tháng`
        : ' · chọn thêm 1 dịch vụ để được giảm 10%';
      return `${selectedItemsForModal.length} dịch vụ × ${formatCurrency(customLevelInfo.unitPrice)} · mức ${customLevelInfo.label}${discountText}`;
    }

    if (!modalPlan) return '';
    return `${formatCurrency(modalPlan.price)} / ${modalPlan.cycle || 'tháng'} · ${modalQty} tháng`;
  }

  function canCheckout() {
    return selectedForModal.length > 0 && !serviceLoading;
  }

  function handleCheckout() {
    if (!modalPlanId || !canCheckout()) return;

    if (!currentUser) {
      navigate('/dang-nhap');
      return;
    }

    const selectedCategories = [...new Set(selectedItemsForModal.map((item) => item.category))];
    const itemIds = selectedForModal.join(',');
    const price = getModalTotal();
    const q = qty[modalPlanId] || 1;
    const pricePerMonth = modalPlanId === 'custom'
      ? customOneMonthTotal
      : Math.round(price / Math.max(1, q));

    const params = new URLSearchParams({
      tab: 'plan',
      planId: modalPlanId,
      qty: String(q),
      items: itemIds,
      categories: selectedCategories.join(','),
      price: String(price),
      pricePerMonth: String(pricePerMonth),
    });

    if (modalPlanId === 'custom') {
      params.set('level', customLevel);
      params.set('discount', String(customDiscountTotal));
      params.set('rawPrice', String(customRawTotal));
    }

    navigate(`/tai-khoan?${params.toString()}`);
  }

  function getCardSelectedText(planId) {
    const ids = selectedIds[planId] || [];
    if (!ids.length) return 'Chưa chọn dịch vụ';

    const picked = serviceItems.filter((item) => ids.includes(item.id));

    if (planId === 'custom') {
      return `${picked.length} mục · mức ${customLevelInfo.label}`;
    }

    return picked[0]?.name || 'Đã chọn 1 mục';
  }

  function renderQtyRow(planId, quota) {
    const q = qty[planId] || 1;

    return (
      <div className={styles.qtyRow}>
        <div className={styles.qtyLeft}>
          <div className={styles.qtyLabel}>Số tháng</div>
          <div className={styles.qtyDesc}>≈ {formatNumber((quota || 0) * q)} lượt sử dụng</div>
        </div>

        <div className={styles.qtyStepper}>
          <button className={styles.qtyBtn} type="button" onClick={() => changeQty(planId, -1)} disabled={q <= 1}>
            −
          </button>
          <span className={`${styles.qtyNum} ${q > 1 ? styles.qtyNumActive : ''}`}>{q}</span>
          <button className={styles.qtyBtn} type="button" onClick={() => changeQty(planId, 1)} disabled={q >= MAX_MONTH}>
            +
          </button>
        </div>
      </div>
    );
  }

  const compareRows = useMemo(() => {
    const privilegeRows = PRIVILEGE_ORDER.map((key) => ({
      label: PRIVILEGE_META[key]?.label || key,
      values: orderedPlans.map((p) => (Array.isArray(p.privileges) && p.privileges.includes(key) ? '✓' : '—')).concat('Theo mức'),
    }));

    return [
      {
        label: 'Phạm vi theo dõi',
        values: ['1 dịch vụ cụ thể', '1 dịch vụ cụ thể', '1 dịch vụ cụ thể', 'Nhiều dịch vụ đã chọn'],
      },
      {
        label: 'Có thể chọn từ',
        values: ['6 nhóm du lịch', '6 nhóm du lịch', '6 nhóm du lịch', '6 nhóm du lịch'],
      },
      {
        label: 'Dung lượng sử dụng / tháng',
        values: orderedPlans.map((p) => `${formatNumber(p.quota)} lượt`).concat('Theo mức đã chọn'),
      },
      {
        label: 'Thời hạn sử dụng',
        values: orderedPlans.map((p) => `${p.durationDays} ngày`).concat('Theo số tháng'),
      },
      {
        label: 'Cách tính phí',
        values: ['400.000đ / dịch vụ', '2.490.000đ / dịch vụ', '9.990.000đ / dịch vụ', 'Số dịch vụ × mức gói, giảm 10% từ 2 dịch vụ'],
      },
      ...privilegeRows,
    ];
  }, [orderedPlans]);

  return (
    <div className={styles.page}>
      <div className={styles.sectionHeader}>
        <div className={styles.eyebrowLine}>
          <span className={styles.eyebrowDash} />
          <span className={styles.eyebrowText}>BẢNG GIÁ REVIEWHUB</span>
        </div>
        <h2 className={styles.sectionTitle}>Chọn gói theo dõi đánh giá du lịch</h2>
        <p className={styles.sectionSub}>
          ReviewHub tổng hợp đánh giá cho nhà xe, khách sạn, máy bay, tàu hỏa, tour và dịch vụ du lịch khác. Chọn dịch vụ cần theo dõi, hệ thống sẽ mở đúng phạm vi sau khi thanh toán được xác nhận.
        </p>
      </div>

      <div className={styles.cardsRow}>
        {orderedPlans.map((plan) => {
          const q = qty[plan.id] || 1;
          const total = getFixedPlanTotal(plan.id);
          const isOut = isUnavailable(plan);
          const ui = PLAN_UI[plan.id] || PLAN_UI.starter;
          const toneClass = getToneClass(ui.tone);

          return (
            <div key={plan.id} className={`${styles.card} ${plan.featured ? styles.cardFeatured : ''} ${isOut ? styles.cardOut : ''} ${toneClass}`}>
              {isOut && <div className={styles.outBanner}>{plan.status}</div>}

              <div className={styles.cardBadgeRow}>
                <span className={styles.tierBadge}>{ui.eyebrow}</span>
                {plan.featured && <span className={styles.stockBadge}>● Đang bán</span>}
              </div>

              <div className={styles.cardName}>{plan.name}</div>
              <div className={styles.cardDesc}>{ui.desc}</div>

              <div className={styles.tierDots}>
                <span className={`${styles.dot} ${styles.dotGreen}`} />
                <span className={`${styles.dot} ${plan.id !== 'starter' ? styles.dotAmber : styles.dotDim}`} />
                <span className={`${styles.dot} ${plan.id === 'enterprise' ? styles.dotBlue : styles.dotDim}`} />
                <span className={`${styles.dot} ${styles.dotDim}`} />
                <span className={styles.tierLabel}>{ui.level}</span>
              </div>

              <div className={styles.priceBlock}>
                <div className={styles.priceRow}>
                  <span className={styles.priceMain}>{formatCurrency(total)}</span>
                  <span className={styles.priceCycle}>/ {plan.cycle || 'tháng'}</span>
                </div>
                {q > 1 && <div className={styles.priceSub}>{formatCurrency(plan.price)} × {q} tháng</div>}
              </div>

              {renderQtyRow(plan.id, plan.quota)}

              <div className={styles.scopeBox}>
                <div className={styles.scopeTitle}>{ui.scopeTitle}</div>
                {ui.scope.map((text) => (
                  <div key={text} className={styles.scopeItem}>
                    <span className={styles.scopeBullet} />
                    {text}
                  </div>
                ))}
              </div>

              <div className={styles.selectedPreview}>
                <span>Dịch vụ đã chọn</span>
                <strong>{getCardSelectedText(plan.id)}</strong>
              </div>

              <button className={styles.btnPrimary} type="button" onClick={() => !isOut && openModal(plan.id)} disabled={isOut}>
                Chọn dịch vụ
              </button>

              <button className={styles.btnSecondary} type="button" onClick={() => navigate('/tai-khoan')}>
                Xem tài khoản
              </button>

              <div className={styles.featureSection}>
                <div className={styles.featureSectionLabel}>{plan.name.toUpperCase()} · QUYỀN LỢI</div>
                <ul className={styles.featureList}>
                  {(Array.isArray(plan.privileges) ? plan.privileges : []).map((key) => {
                    const meta = PRIVILEGE_META[key];
                    const label = meta ? meta.label : key;
                    return (
                      <li key={key} className={styles.featureItem}>
                        <span className={styles.featureCheck}>✓</span>
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}

        <div className={`${styles.card} ${styles.cardCustom} ${getToneClass('purple')}`}>
          <div className={styles.cardBadgeRow}>
            <span className={styles.tierBadge}>Gói tự chọn</span>
            <span className={styles.customBadge}>Chọn nhiều</span>
          </div>

          <div className={styles.cardName}>Tự chọn</div>
          <div className={styles.cardDesc}>{PLAN_UI.custom.desc}</div>

          <div className={styles.tierDots}>
            <span className={`${styles.dot} ${styles.dotGreen}`} />
            <span className={`${styles.dot} ${styles.dotAmber}`} />
            <span className={`${styles.dot} ${styles.dotBlue}`} />
            <span className={`${styles.dot} ${styles.dotPurple}`} />
            <span className={styles.tierLabel}>{PLAN_UI.custom.level}</span>
          </div>

          <div className={styles.priceBlock}>
            <div className={styles.priceRow}>
              <span className={styles.priceMain}>{formatCurrency(customTotal)}</span>
              <span className={styles.priceCycle}>/ tháng</span>
            </div>
            <div className={styles.priceSub}>
              {selectedIds.custom.length ? `${selectedIds.custom.length} dịch vụ · mức ${customLevelInfo.label}` : 'Chưa chọn dịch vụ'}
            </div>
            {selectedIds.custom.length >= CUSTOM_DISCOUNT_MIN_ITEMS && (
              <div className={styles.discountLine}>
                <span className={styles.oldPrice}>{formatCurrency(customRawTotal)}</span>
                <span className={styles.discountBadgeInline}>Ưu đãi -10%</span>
              </div>
            )}
            {selectedIds.custom.length === 1 && (
              <div className={styles.discountHint}>Chọn thêm 1 dịch vụ để được giảm 10%</div>
            )}
          </div>

          {renderQtyRow('custom', selectedIds.custom.length ? customLevelInfo.quotaPerItem * selectedIds.custom.length : 0)}

          <div className={styles.scopeBox}>
            <div className={styles.scopeTitle}>{PLAN_UI.custom.scopeTitle}</div>
            {PLAN_UI.custom.scope.map((text) => (
              <div key={text} className={styles.scopeItem}>
                <span className={styles.scopeBullet} />
                {text}
              </div>
            ))}
          </div>

          <div className={styles.selectedPreview}>
            <span>Dịch vụ đã chọn</span>
            <strong>{getCardSelectedText('custom')}</strong>
          </div>

          <button className={styles.btnPrimary} type="button" onClick={() => openModal('custom')}>
            Tự chọn dịch vụ
          </button>

          <button className={styles.btnSecondary} type="button" onClick={() => navigate('/tai-khoan')}>
            Xem tài khoản
          </button>

          <div className={styles.featureSection}>
            <div className={styles.featureSectionLabel}>TỰ CHỌN · QUYỀN LỢI</div>
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Theo dõi nhiều dịch vụ cùng lúc
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Chọn cấp gói theo nhu cầu
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Giảm 10% khi chọn từ 2 dịch vụ
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.compareSection}>
        <div className={styles.eyebrowLine}>
          <span className={styles.eyebrowDash} />
          <span className={styles.eyebrowText}>SO SÁNH</span>
        </div>
        <h2 className={styles.sectionTitle}>So sánh các gói</h2>

        <div className={styles.tableWrap}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th className={styles.thFeature}>QUYỀN LỢI</th>
                <th>KHỞI ĐẦU</th>
                <th>TĂNG TRƯỞNG</th>
                <th>DOANH NGHIỆP</th>
                <th>TỰ CHỌN</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? styles.trEven : ''}>
                  <td className={styles.tdFeature}>{row.label}</td>
                  {row.values.map((val, j) => (
                    <td key={`${row.label}-${j}`} className={styles.tdVal}>
                      {val === '✓' ? <span className={styles.checkMark}>✓</span> : val === '—' ? <span className={styles.dashMark}>—</span> : val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.bottomNote}>
        <p>
          Sau khi thanh toán được xác nhận, tài khoản sẽ được theo dõi theo đúng dịch vụ đã chọn. Cổng đối tác sẽ hiển thị đánh giá và thống kê tập trung cho phạm vi bạn đã đăng ký.
        </p>
        <Link to="/tai-khoan">Quản lý gói trong tài khoản →</Link>
      </div>

      {modalPlanId && modalUi && (
        <div className={styles.modalOverlay} role="presentation" onMouseDown={closeModal}>
          <div className={`${styles.modalPanel} ${getToneClass(modalUi.tone)}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalBadge}>{modalUi.eyebrow}</span>
                <h3>{modalUi.modalTitle}</h3>
                <p>{modalUi.modalDesc}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={closeModal} aria-label="Đóng popup">
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <aside className={styles.modalSidebar}>
                <div className={styles.sidebarTitle}>Nhóm dịch vụ</div>
                <div className={styles.categoryTabs}>
                  {categoryStats.map((category) => {
                    const active = activeCategory === category.slug;
                    const selectedInCategory = selectedItemsForModal.filter((item) => category.slug === 'all' || item.category === category.slug).length;

                    return (
                      <button
                        key={category.slug}
                        type="button"
                        className={`${styles.categoryTab} ${active ? styles.categoryTabActive : ''}`}
                        onClick={() => setActiveCategory(category.slug)}
                      >
                        <span className={styles.categoryMain}>
                          <span className={styles.categoryIcon} data-cat={category.slug}><CategoryIcon slug={category.slug} /></span>
                          <span className={styles.categoryName}>{category.label}</span>
                        </span>
                        <span className={styles.categoryMetaLine}>
                          {selectedInCategory > 0 ? `Đã chọn ${selectedInCategory}` : `${category.count} mục`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeCategory !== 'all' && CATEGORY_ROUTES[activeCategory] && (
                  <Link className={styles.categoryLink} to={`/dich-vu/${CATEGORY_ROUTES[activeCategory]}`}>
                    Xem trang {SERVICE_CATEGORIES.find((cat) => cat.slug === activeCategory)?.label} →
                  </Link>
                )}
              </aside>

              <main className={styles.modalContent}>
                <div className={styles.modalToolbar}>
                  <div>
                    <h4>Chọn dịch vụ/địa điểm</h4>
                    <p>
                      {modalUi.mode === 'single'
                        ? 'Chọn một nhà xe, khách sạn, hãng bay, tour hoặc dịch vụ bạn muốn xem đánh giá.'
                        : 'Chọn nhiều dịch vụ du lịch để theo dõi trong cùng một gói. Từ 2 dịch vụ trở lên sẽ được giảm ngay 10%.'}
                    </p>
                  </div>
                  <input
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Tìm tên dịch vụ, mã hoặc khu vực..."
                  />
                </div>

                {modalPlanId === 'custom' && (
                  <div className={styles.levelBox}>
                    <div className={styles.levelHeader}>
                      <strong>Chọn mức sử dụng</strong>
                      <span>Mức càng cao thì dung lượng, báo cáo và hỗ trợ càng mạnh</span>
                    </div>

                    <div className={styles.levelGrid}>
                      {CUSTOM_LEVELS.map((level) => (
                        <button
                          key={level.id}
                          type="button"
                          className={`${styles.levelCard} ${customLevel === level.id ? styles.levelCardActive : ''}`}
                          onClick={() => setCustomLevel(level.id)}
                        >
                          <span>{level.label}</span>
                          <strong>{formatCurrency(level.unitPrice)}</strong>
                          <small>{level.desc}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.serviceListWrap}>
                  {serviceLoading ? (
                    <div className={styles.emptyBox}>Đang tải danh sách dịch vụ...</div>
                  ) : serviceError ? (
                    <div className={styles.emptyBox}>{serviceError}</div>
                  ) : filteredItems.length === 0 ? (
                    <div className={styles.emptyBox}>Chưa có dịch vụ phù hợp với bộ lọc này.</div>
                  ) : (
                    <div className={styles.serviceList}>
                      {filteredItems.map((item) => {
                        const checked = selectedForModal.includes(item.id);

                        return (
                          <label key={item.id} className={`${styles.serviceItem} ${checked ? styles.serviceItemActive : ''}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleItem(item.id)} />
                            <span className={styles.serviceCheck}>{checked ? '✓' : '+'}</span>
                            <span className={styles.serviceInfo}>
                              <strong>{item.name}</strong>
                              <small>
                                {item.categoryLabel} · {item.region} · {item.type}
                              </small>
                              <small>{item.description}</small>
                            </span>
                            <span className={styles.serviceRight}>
                              <span>{item.code}</span>
                              {modalPlanId === 'custom' ? <strong>{formatCurrency(customLevelInfo.unitPrice)}</strong> : <strong>Đã bao gồm</strong>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </main>

              <aside className={styles.summaryPanel}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Chi phí dự kiến</div>
                  <div className={styles.summaryPrice}>{formatCurrency(getModalTotal())}</div>
                  {modalPlanId === 'custom' && customDiscountRate > 0 && (
                    <div className={styles.summaryOldPrice}>Giá gốc: <span>{formatCurrency(customRawTotal)}</span></div>
                  )}
                  <div className={styles.summarySub}>{getModalPriceSub()}</div>
                  {modalPlanId === 'custom' && customDiscountRate > 0 && (
                    <div className={styles.summaryDiscountBox}>
                      <span>Ưu đãi tự chọn</span>
                      <strong>-{formatCurrency(customDiscountTotal)}</strong>
                    </div>
                  )}

                  {renderQtyRow(modalPlanId, getModalQuota() / (qty[modalPlanId] || 1))}

                  <div className={styles.summaryRows}>
                    <div>
                      <span>Đã chọn</span>
                      <strong>{selectedForModal.length} mục</strong>
                    </div>
                    <div>
                      <span>Nhóm dịch vụ</span>
                      <strong>{new Set(selectedItemsForModal.map((item) => item.category)).size}</strong>
                    </div>
                    <div>
                      <span>Phạm vi theo dõi</span>
                      <strong>{modalPlanId === 'custom' ? `Tự chọn · ${customLevelInfo.label}` : 'Theo gói đã chọn'}</strong>
                    </div>
                    {modalPlanId === 'custom' && (
                      <div>
                        <span>Ưu đãi</span>
                        <strong>{customDiscountRate ? `Đã giảm ${Math.round(customDiscountRate * 100)}%` : 'Chọn thêm 1 dịch vụ'}</strong>
                      </div>
                    )}
                  </div>

                  <div className={styles.selectedChips}>
                    {selectedItemsForModal.length === 0 ? (
                      <span className={styles.emptyChip}>Chưa chọn</span>
                    ) : (
                      selectedItemsForModal.slice(0, 8).map((item) => (
                        <button key={item.id} type="button" className={styles.selectedChip} onClick={() => toggleItem(item.id)} title="Bấm để bỏ chọn">
                          {item.name}
                        </button>
                      ))
                    )}
                    {selectedItemsForModal.length > 8 && <span className={styles.moreChip}>+{selectedItemsForModal.length - 8} mục</span>}
                  </div>

                  <button className={styles.checkoutBtn} type="button" onClick={handleCheckout} disabled={!canCheckout()}>
                    {!canCheckout() ? 'Chọn dịch vụ trước' : currentUser ? 'Tiếp tục thanh toán' : 'Đăng nhập để mua'}
                  </button>

                  <button className={styles.backBtn} type="button" onClick={closeModal}>
                    Quay lại bảng giá
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
