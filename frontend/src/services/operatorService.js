import api from './api';

export const SERVICE_CATEGORIES = [
  { slug: 'all', label: 'Tất cả', icon: '🌐' },
  { slug: 'nha-xe', label: 'Nhà xe', icon: '🚌' },
  { slug: 'khach-san', label: 'Khách sạn', icon: '🏨' },
  { slug: 'may-bay', label: 'Máy bay', icon: '✈️' },
  { slug: 'tau-hoa', label: 'Tàu hỏa', icon: '🚆' },
  { slug: 'tour', label: 'Tour', icon: '🧭' },
  { slug: 'dich-vu-khac', label: 'Dịch vụ khác', icon: '✨' },
];

const CATEGORY_BY_PREFIX = {
  PT: 'nha-xe',
  NX: 'nha-xe',
  BUS: 'nha-xe',
  KS: 'khach-san',
  HOTEL: 'khach-san',
  MB: 'may-bay',
  FLIGHT: 'may-bay',
  TH: 'tau-hoa',
  TRAIN: 'tau-hoa',
  TO: 'tour',
  TOUR: 'tour',
  DV: 'dich-vu-khac',
  OTHER: 'dich-vu-khac',
};

const PRICE_BY_CATEGORY = {
  'nha-xe': 400000,
  'khach-san': 600000,
  'may-bay': 700000,
  'tau-hoa': 450000,
  tour: 650000,
  'dich-vu-khac': 350000,
};

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.operators)) return payload.operators;
  return [];
}

export function getCategoryLabel(slug) {
  return SERVICE_CATEGORIES.find((item) => item.slug === slug)?.label || 'Dịch vụ khác';
}

export function getCategoryIcon(slug) {
  return SERVICE_CATEGORIES.find((item) => item.slug === slug)?.icon || '✨';
}

function getCategoryFromCode(code = '') {
  const prefix = String(code).split('-')[0]?.toUpperCase();
  return CATEGORY_BY_PREFIX[prefix] || 'dich-vu-khac';
}

function normalizeServiceItem(item = {}) {
  const code =
    item.operatorCode ||
    item.operator_code ||
    item.code ||
    item.serviceCode ||
    item.service_code ||
    item.id ||
    '';

  const name =
    item.operatorName ||
    item.operator_name ||
    item.name ||
    item.serviceName ||
    item.service_name ||
    'Chưa có tên';

  const category =
    item.category ||
    item.categorySlug ||
    item.category_slug ||
    item.serviceCategory ||
    item.service_category ||
    getCategoryFromCode(code);

  const safeCategory = SERVICE_CATEGORIES.some((cat) => cat.slug === category)
    ? category
    : getCategoryFromCode(code);

  const safeCode = String(code || '');
  const safeName = String(name || 'Chưa có tên');

  return {
    // Giữ đủ 2 kiểu tên field để không làm hỏng các trang cũ:
    // - AdminPartnersPage đang dùng operatorCode/operatorName
    // - PricingPage mới đang dùng code/name
    id: safeCode || safeName,
    code: safeCode,
    name: safeName,
    operatorCode: safeCode,
    operatorName: safeName,
    category: safeCategory,
    categoryLabel: item.categoryLabel || item.category_label || getCategoryLabel(safeCategory),
    categoryIcon: item.categoryIcon || item.category_icon || getCategoryIcon(safeCategory),
    region: item.region || item.area || item.address || 'Đang cập nhật',
    type: item.type || item.serviceType || item.service_type || item.vehicleType || item.vehicle_type || 'Dịch vụ',
    hotline: item.hotline || item.phone || '',
    website: item.website || item.url || '',
    description: item.description || item.desc || 'Đang cập nhật mô tả',
    price: Number(item.price || item.priceMonthly || item.price_monthly || PRICE_BY_CATEGORY[safeCategory] || 400000),
    overallRating: Number(item.overallRating || item.overall_rating || item.rating || 0),
    totalReviews: Number(item.totalReviews || item.total_reviews || item.reviewCount || item.review_count || 0),
  };
}

function sortServices(items = []) {
  const order = SERVICE_CATEGORIES.reduce((acc, item, index) => {
    acc[item.slug] = index;
    return acc;
  }, {});

  return [...items].sort((a, b) => {
    const cat = (order[a.category] || 99) - (order[b.category] || 99);
    if (cat !== 0) return cat;
    return String(a.name).localeCompare(String(b.name), 'vi');
  });
}

/**
 * Hàm cũ: giữ lại để các trang đang dùng /api/operators không bị lỗi.
 */
export async function fetchOperators() {
  const { data } = await api.get('/api/operators');
  return sortServices(toArray(data).map(normalizeServiceItem));
}

/**
 * Hàm dùng cho popup bảng giá.
 * Ưu tiên API /api/services nếu backend có.
 * Nếu backend chưa có /api/services thì fallback về /api/operators.
 */
export async function fetchServiceCatalog(params = {}) {
  const { category, q } = params;

  let raw = [];

  try {
    const { data } = await api.get('/api/services', {
      params: {
        category: category && category !== 'all' ? category : undefined,
        q: q || undefined,
      },
    });
    raw = toArray(data);
  } catch (error) {
    const { data } = await api.get('/api/operators');
    raw = toArray(data);
  }

  const keyword = String(q || '').trim().toLowerCase();

  const result = raw.map(normalizeServiceItem).filter((item) => {
    const matchCategory = !category || category === 'all' || item.category === category;
    const matchSearch =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.code.toLowerCase().includes(keyword) ||
      item.region.toLowerCase().includes(keyword) ||
      item.type.toLowerCase().includes(keyword);

    return matchCategory && matchSearch;
  });

  return sortServices(result);
}

export async function fetchServicesByCategory(category) {
  return fetchServiceCatalog({ category });
}

export function groupServicesByCategory(items = []) {
  return SERVICE_CATEGORIES.filter((cat) => cat.slug !== 'all').map((cat) => ({
    ...cat,
    items: items.filter((item) => item.category === cat.slug),
  }));
}
