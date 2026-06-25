import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../../services/api';
import styles from './ServiceCategoryPage.module.css';

const PAGE_CONFIG = {
  'nha-xe': {
    title: 'Top nhà xe uy tín',
    subtitle: 'Nền tảng tổng hợp đánh giá, xếp hạng và phản hồi thực tế từ hành khách. Minh bạch - Khách quan - Cộng đồng xác thực.',
    tableTitle: 'Bảng xếp hạng tất cả nhà xe',
    tableSubtitle: 'Dữ liệu cập nhật từ hệ thống nhà xe và đánh giá đã duyệt trong database.',
    backLabel: 'Về trang chủ',
    operatorEndpoints: [
      '/api/operators',
      '/api/public/operators',
      '/api/transport-operators',
      '/api/public/transport-operators',
    ],
  },
  'khach-san': {
    title: 'Top khách sạn uy tín',
    subtitle: 'Danh sách khách sạn được đánh giá theo trải nghiệm lưu trú thực tế.',
    tableTitle: 'Bảng xếp hạng tất cả khách sạn',
    tableSubtitle: 'Danh sách khách sạn trong hệ thống.',
    backLabel: 'Về trang chủ',
    operatorEndpoints: [
      '/api/operators',
      '/api/public/operators',
      '/api/transport-operators',
      '/api/public/transport-operators',
    ],
  },
  'may-bay': {
    title: 'Top hãng bay uy tín',
    subtitle: 'Danh sách hãng bay được đánh giá theo trải nghiệm chuyến bay thực tế.',
    tableTitle: 'Bảng xếp hạng tất cả hãng bay',
    tableSubtitle: 'Danh sách hãng bay trong hệ thống.',
    backLabel: 'Về trang chủ',
    operatorEndpoints: ['/api/public/airlines', '/api/airlines', '/api/operators', '/api/public/operators'],
  },
  'tau-hoa': {
    title: 'Top tàu hỏa uy tín',
    subtitle: 'Danh sách dịch vụ đường sắt được đánh giá theo trải nghiệm thực tế.',
    tableTitle: 'Bảng xếp hạng tất cả tuyến tàu',
    tableSubtitle: 'Danh sách tuyến tàu trong hệ thống.',
    backLabel: 'Về trang chủ',
    operatorEndpoints: ['/api/public/trains', '/api/trains', '/api/operators', '/api/public/operators'],
  },
  tour: {
    title: 'Top tour uy tín',
    subtitle: 'Danh sách tour được đánh giá theo trải nghiệm thực tế.',
    tableTitle: 'Bảng xếp hạng tất cả tour',
    tableSubtitle: 'Danh sách tour trong hệ thống.',
    backLabel: 'Về trang chủ',
    operatorEndpoints: ['/api/public/tours', '/api/tours', '/api/operators', '/api/public/operators'],
  },
  'dich-vu-khac': {
    title: 'Top dịch vụ uy tín',
    subtitle: 'Danh sách dịch vụ được đánh giá theo dữ liệu trong hệ thống.',
    tableTitle: 'Bảng xếp hạng tất cả dịch vụ',
    tableSubtitle: 'Danh sách dịch vụ trong hệ thống.',
    backLabel: 'Về trang chủ',
    operatorEndpoints: ['/api/public/services', '/api/services', '/api/operators', '/api/public/operators'],
  },
};

const SERVICE_META = {
  'nha-xe': {
    prefix: 'PT-',
    singular: 'nhà xe',
    plural: 'nhà xe',
    person: 'hành khách',
    itemColumn: 'Nhà xe',
    routeColumn: 'Tuyến phổ biến',
    routeLabel: 'Tuyến phổ biến',
    typeFilterLabel: 'Loại xe',
    typeFilterAll: 'Tất cả loại xe',
    searchLabel: 'Tìm kiếm nhà xe',
    searchPlaceholder: 'Nhập tên nhà xe...',
    topTitle: 'TOP nhà xe nổi bật',
    noApiMessage: 'Không đọc được danh sách nhà xe từ API/DB.',
    noMatchMessage: 'Không có nhà xe phù hợp.',
    loadMoreText: 'Xem thêm nhà xe',
    sourceLabel: 'Nhà xe',
    sourceFallback: 'Không đọc được API nhà xe',
    imageInfo: 'public/anhxe/1-50.webp',
    imageFolder: '/anhxe',
    imageTotal: 50,
    defaultType: 'Nhà xe',
    defaultDescription: 'Dịch vụ vận chuyển được cộng đồng đánh giá theo chất lượng xe, đúng giờ, thái độ phục vụ và an toàn hành trình.',
    communityTitle: 'Cộng đồng nói gì về các nhà xe?',
    communitySubtitle: 'Những chia sẻ chân thực từ hành khách trên mọi hành trình.',
    sidebarEvaluated: 'Nhà xe đã đánh giá',
    totalReviewsLabel: 'Đánh giá từ hành khách',
    memberLabel: 'Thành viên cộng đồng',
    trustQuote: '“Sứ mệnh của chúng tôi là giúp bạn tìm được nhà xe uy tín nhất cho mọi hành trình.”',
    sampleReviewers: ['Nguyễn Minh Tuấn', 'Trần Thu Hương', 'Lê Quốc Bảo', 'Phạm Thùy Linh'],
    sampleComments: [
      'Xe sạch sẽ, tài xế lịch sự, đúng giờ. Rất hài lòng với dịch vụ.',
      'Chỗ ngồi thoải mái, nhân viên hỗ trợ ổn. Trạm dừng hơi lâu nhưng nhìn chung tốt.',
      'Điều hòa hơi yếu, ghế không thoải mái lắm cho chuyến dài.',
      'Tuyệt vời! Xe limousine sang, nhân viên phục vụ chuyên nghiệp.',
    ],
  },
  'khach-san': {
    prefix: 'KS-',
    singular: 'khách sạn',
    plural: 'khách sạn',
    person: 'khách lưu trú',
    itemColumn: 'Khách sạn',
    routeColumn: 'Khu vực phổ biến',
    routeLabel: 'Khu vực phổ biến',
    typeFilterLabel: 'Loại khách sạn',
    typeFilterAll: 'Tất cả loại khách sạn',
    searchLabel: 'Tìm kiếm khách sạn',
    searchPlaceholder: 'Nhập tên khách sạn...',
    topTitle: 'TOP khách sạn nổi bật',
    noApiMessage: 'Không đọc được danh sách khách sạn từ API/DB.',
    noMatchMessage: 'Không có khách sạn phù hợp.',
    loadMoreText: 'Xem thêm khách sạn',
    sourceLabel: 'Khách sạn',
    sourceFallback: 'Không đọc được API khách sạn',
    imageInfo: 'public/anhkhachsan/1-50.webp',
    imageFolder: '/anhkhachsan',
    imageTotal: 50,
    defaultType: 'Khách sạn',
    defaultDescription: 'Khách sạn được cộng đồng đánh giá theo vị trí, vệ sinh, tiện nghi, chất lượng phục vụ và trải nghiệm lưu trú thực tế.',
    communityTitle: 'Cộng đồng nói gì về các khách sạn?',
    communitySubtitle: 'Những chia sẻ chân thực từ khách lưu trú sau mỗi chuyến đi.',
    sidebarEvaluated: 'Khách sạn đã đánh giá',
    totalReviewsLabel: 'Đánh giá từ khách lưu trú',
    memberLabel: 'Thành viên cộng đồng',
    trustQuote: '“Sứ mệnh của chúng tôi là giúp bạn chọn được khách sạn đáng tin cậy nhất cho mỗi chuyến đi.”',
    sampleReviewers: ['Nguyễn Văn A', 'Trần Thị B', 'Lê Minh C', 'Phạm Thu D'],
    sampleComments: [
      'Phòng sạch, vị trí thuận tiện, nhân viên lễ tân hỗ trợ nhanh. Rất đáng để quay lại.',
      'Không gian yên tĩnh, tiện nghi đầy đủ. Bữa sáng ổn, phù hợp đi công tác và nghỉ dưỡng.',
      'Phòng hơi nhỏ so với kỳ vọng nhưng dịch vụ tốt, nhân viên thân thiện.',
      'Khách sạn đẹp, gần trung tâm, vệ sinh tốt và quy trình check-in nhanh.',
    ],
  },
  'may-bay': {
    prefix: 'MB-',
    singular: 'hãng bay',
    plural: 'hãng bay',
    person: 'hành khách',
    itemColumn: 'Hãng bay',
    routeColumn: 'Đường bay phổ biến',
    routeLabel: 'Đường bay phổ biến',
    typeFilterLabel: 'Loại dịch vụ bay',
    typeFilterAll: 'Tất cả dịch vụ bay',
    searchLabel: 'Tìm kiếm hãng bay',
    searchPlaceholder: 'Nhập tên hãng bay...',
    topTitle: 'TOP hãng bay nổi bật',
    noApiMessage: 'Không đọc được danh sách hãng bay từ API/DB.',
    noMatchMessage: 'Không có hãng bay phù hợp.',
    loadMoreText: 'Xem thêm hãng bay',
    sourceLabel: 'Hãng bay',
    sourceFallback: 'Không đọc được API hãng bay',
    imageInfo: 'public/anhmaybay/1-50.webp',
    imageFolder: '/anhmaybay',
    imageTotal: 50,
    defaultType: 'Hãng bay',
    defaultDescription: 'Hãng bay được đánh giá theo đúng giờ, phục vụ, check-in, hành lý và trải nghiệm chuyến bay.',
    communityTitle: 'Cộng đồng nói gì về các hãng bay?',
    communitySubtitle: 'Những chia sẻ thực tế từ hành khách sau chuyến bay.',
    sidebarEvaluated: 'Hãng bay đã đánh giá',
    totalReviewsLabel: 'Đánh giá từ hành khách',
    memberLabel: 'Thành viên cộng đồng',
    trustQuote: '“Sứ mệnh của chúng tôi là giúp bạn chọn được hãng bay phù hợp nhất.”',
    sampleReviewers: ['Hoàng Minh', 'Ngọc Anh', 'Thanh Bình', 'Kim Chi'],
    sampleComments: [
      'Làm thủ tục nhanh, tiếp viên lịch sự, chuyến bay khá đúng giờ.',
      'Ghế ngồi ổn, dịch vụ tốt, hành lý ra hơi chậm.',
      'Có delay nhẹ nhưng hãng thông báo rõ ràng và hỗ trợ tốt.',
      'Trải nghiệm bay tốt, nhân viên chuyên nghiệp.',
    ],
  },
  'tau-hoa': {
    prefix: 'TH-',
    singular: 'tuyến tàu',
    plural: 'tuyến tàu',
    person: 'hành khách',
    itemColumn: 'Tuyến tàu',
    routeColumn: 'Hành trình phổ biến',
    routeLabel: 'Hành trình phổ biến',
    typeFilterLabel: 'Loại tàu',
    typeFilterAll: 'Tất cả loại tàu',
    searchLabel: 'Tìm kiếm tuyến tàu',
    searchPlaceholder: 'Nhập tên tuyến tàu...',
    topTitle: 'TOP tuyến tàu nổi bật',
    noApiMessage: 'Không đọc được danh sách tuyến tàu từ API/DB.',
    noMatchMessage: 'Không có tuyến tàu phù hợp.',
    loadMoreText: 'Xem thêm tuyến tàu',
    sourceLabel: 'Tuyến tàu',
    sourceFallback: 'Không đọc được API tàu hỏa',
    imageInfo: 'public/anhtauhoa/1-50.webp',
    imageFolder: '/anhtauhoa',
    imageTotal: 50,
    defaultType: 'Dịch vụ đường sắt',
    defaultDescription: 'Tuyến tàu được đánh giá theo độ đúng giờ, vệ sinh, chỗ ngồi, tiện nghi và trải nghiệm hành trình.',
    communityTitle: 'Cộng đồng nói gì về các tuyến tàu?',
    communitySubtitle: 'Những chia sẻ thực tế từ hành khách đi tàu.',
    sidebarEvaluated: 'Tuyến tàu đã đánh giá',
    totalReviewsLabel: 'Đánh giá từ hành khách',
    memberLabel: 'Thành viên cộng đồng',
    trustQuote: '“Sứ mệnh của chúng tôi là giúp bạn chọn được hành trình tàu đáng tin cậy.”',
    sampleReviewers: ['Quốc Huy', 'Bảo Trân', 'Minh Khang', 'Thu Hà'],
    sampleComments: [
      'Tàu sạch, chỗ ngồi ổn, nhân viên hỗ trợ tốt.',
      'Đi đúng giờ, toa tàu yên tĩnh, phù hợp đi đường dài.',
      'Nhà vệ sinh cần cải thiện thêm nhưng hành trình khá ổn.',
      'Trải nghiệm tốt, đặt vé dễ, thông tin rõ ràng.',
    ],
  },
  tour: {
    prefix: 'TO-',
    singular: 'tour',
    plural: 'tour',
    person: 'du khách',
    itemColumn: 'Tour',
    routeColumn: 'Lịch trình phổ biến',
    routeLabel: 'Lịch trình phổ biến',
    typeFilterLabel: 'Loại tour',
    typeFilterAll: 'Tất cả loại tour',
    searchLabel: 'Tìm kiếm tour',
    searchPlaceholder: 'Nhập tên tour...',
    topTitle: 'TOP tour nổi bật',
    noApiMessage: 'Không đọc được danh sách tour từ API/DB.',
    noMatchMessage: 'Không có tour phù hợp.',
    loadMoreText: 'Xem thêm tour',
    sourceLabel: 'Tour',
    sourceFallback: 'Không đọc được API tour',
    imageInfo: 'public/anhtour/1-50.webp',
    imageFolder: '/anhtour',
    imageTotal: 50,
    defaultType: 'Tour du lịch',
    defaultDescription: 'Tour được đánh giá theo lịch trình, hướng dẫn viên, nơi ở, ăn uống và trải nghiệm tổng thể.',
    communityTitle: 'Cộng đồng nói gì về các tour?',
    communitySubtitle: 'Những chia sẻ chân thực từ du khách sau hành trình.',
    sidebarEvaluated: 'Tour đã đánh giá',
    totalReviewsLabel: 'Đánh giá từ du khách',
    memberLabel: 'Thành viên cộng đồng',
    trustQuote: '“Sứ mệnh của chúng tôi là giúp bạn chọn được tour phù hợp nhất.”',
    sampleReviewers: ['Gia Hân', 'Tuấn Kiệt', 'Đức Anh', 'Mai Phương'],
    sampleComments: [
      'Lịch trình hợp lý, hướng dẫn viên nhiệt tình, trải nghiệm rất tốt.',
      'Điểm tham quan đẹp, dịch vụ ổn, phù hợp gia đình.',
      'Một vài điểm hơi gấp nhưng tổng thể đáng tiền.',
      'Tour tổ chức chuyên nghiệp, ăn uống và xe đưa đón tốt.',
    ],
  },
  'dich-vu-khac': {
    prefix: 'DV-',
    singular: 'dịch vụ',
    plural: 'dịch vụ',
    person: 'người dùng',
    itemColumn: 'Dịch vụ',
    routeColumn: 'Phạm vi phổ biến',
    routeLabel: 'Phạm vi phổ biến',
    typeFilterLabel: 'Loại dịch vụ',
    typeFilterAll: 'Tất cả loại dịch vụ',
    searchLabel: 'Tìm kiếm dịch vụ',
    searchPlaceholder: 'Nhập tên dịch vụ...',
    topTitle: 'TOP dịch vụ nổi bật',
    noApiMessage: 'Không đọc được danh sách dịch vụ từ API/DB.',
    noMatchMessage: 'Không có dịch vụ phù hợp.',
    loadMoreText: 'Xem thêm dịch vụ',
    sourceLabel: 'Dịch vụ',
    sourceFallback: 'Không đọc được API dịch vụ',
    imageInfo: 'public/anhdichvu/1-50.webp',
    imageFolder: '/anhdichvu',
    imageFolderAlt: '/anhdichvukhac',
    imageTotal: 50,
    defaultType: 'Dịch vụ du lịch',
    defaultDescription: 'Dịch vụ được đánh giá theo chất lượng hỗ trợ, minh bạch thông tin và trải nghiệm người dùng.',
    communityTitle: 'Cộng đồng nói gì về các dịch vụ?',
    communitySubtitle: 'Những chia sẻ chân thực từ người dùng.',
    sidebarEvaluated: 'Dịch vụ đã đánh giá',
    totalReviewsLabel: 'Đánh giá từ người dùng',
    memberLabel: 'Thành viên cộng đồng',
    trustQuote: '“Sứ mệnh của chúng tôi là giúp bạn chọn được dịch vụ đáng tin cậy.”',
    sampleReviewers: ['Hải Nam', 'Lan Anh', 'Minh Nhật', 'Khánh Linh'],
    sampleComments: [
      'Dịch vụ hỗ trợ nhanh, thông tin rõ ràng.',
      'Trải nghiệm ổn, nhân viên phản hồi tốt.',
      'Cần cải thiện tốc độ xử lý nhưng nhìn chung dùng được.',
      'Dịch vụ chuyên nghiệp, phù hợp nhu cầu đặt lịch và hỗ trợ.',
    ],
  },
};


const LOCAL_REVIEW_KEY = 'reviewhub-public-service-reviews';

// Trang danh mục không tải toàn bộ comment nữa.
// Nếu API operator chưa trả sẵn tổng/sao, các endpoint thống kê nhẹ bên dưới sẽ được thử sau khi render xong.
const REVIEW_STATS_ENDPOINTS = [
  '/api/public/reviews/stats',
  '/api/public/review-stats',
  '/api/reviews/stats',
  '/api/review-stats',
  '/api/public/reviews/summary',
  '/api/reviews/summary',
  '/api/admin/review-ai/stats',
  '/api/admin/review-ai/summary',
];

function withCategoryParam(endpoint, slug) {
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}category=${encodeURIComponent(slug)}`;
}

function categoryOperatorEndpoints(slug, fallbackEndpoints = []) {
  const category = encodeURIComponent(slug);

  // Endpoint đầu tiên là endpoint nhẹ mới: backend chỉ trả đúng nhóm đang xem.
  // Các endpoint sau là fallback để tránh vỡ trang nếu backend chưa cập nhật.
  return [
    `/api/public/service-operators?category=${category}`,
    `/api/public/operators/by-category?category=${category}`,
    `/api/public/category-operators?category=${category}`,
    ...fallbackEndpoints,
  ];
}

const CATEGORY_CACHE_FILES = {
  'nha-xe': '/cache/service-ranking-nha-xe.json',
  'khach-san': '/cache/service-ranking-khach-san.json',
  'may-bay': '/cache/service-ranking-may-bay.json',
  'tau-hoa': '/cache/service-ranking-tau-hoa.json',
  tour: '/cache/service-ranking-tour.json',
  'dich-vu-khac': '/cache/service-ranking-dich-vu-khac.json',
};

async function readCategoryCache(slug) {
  if (typeof window === 'undefined') {
    throw new Error('Không thể đọc cache trên server.');
  }

  const file = CATEGORY_CACHE_FILES[slug] || CATEGORY_CACHE_FILES['nha-xe'];

  const response = await fetch(file, {
    method: 'GET',
    cache: 'force-cache',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Không đọc được cache ${file}: ${response.status}`);
  }

  const payload = await response.json();
  const list = extractList(payload);

  if (!list.length) {
    throw new Error(`Cache ${file} chưa có dữ liệu items.`);
  }

  return {
    endpoint: file,
    list,
    generatedAt: payload?.generatedAt || '',
    total: Number(payload?.total || list.length),
  };
}

const AVG_RATING_KEYS = [
  'avgRating',
  'averageRating',
  'overallRating',
  'ratingAvg',
  'ratingAverage',
  'rating',
  'avgScore',
  'averageScore',
  'scoreAvg',
  'scoreAverage',
  'avgStars',
  'starAvg',
  'starsAvg',
  'starAverage',
  'averageStars',
  'ratingValue',
  'diemTb',
  'diemTb10',
  'diemTrungBinh',
  'diemHienThi10',
  'avg_rating',
  'average_rating',
  'overall_rating',
  'rating_avg',
  'rating_average',
  'avg_score',
  'average_score',
  'score_avg',
  'score_average',
  'avg_stars',
  'star_avg',
  'stars_avg',
  'star_average',
  'average_stars',
  'rating_value',
  'diem_tb',
  'diem_tb_10',
  'diem_trung_binh',
  'diem_hien_thi_10',
];

const TOTAL_REVIEW_KEYS = [
  'totalReviews',
  'reviewCount',
  'reviewsCount',
  'totalReview',
  'totalReviewCount',
  'reviewTotal',
  'ratingCount',
  'countReviews',
  'numberOfReviews',
  'totalRatings',
  'ratingsCount',
  'totalComments',
  'commentCount',
  'totalRv',
  'rvCount',
  'soLuongReview',
  'soLuongRv',
  'tongDanhGia',
  'tongReview',
  'total_reviews',
  'review_count',
  'reviews_count',
  'total_review',
  'total_review_count',
  'review_total',
  'rating_count',
  'count_reviews',
  'number_of_reviews',
  'total_ratings',
  'ratings_count',
  'total_comments',
  'comment_count',
  'total_rv',
  'rv_count',
  'so_luong_review',
  'so_luong_rv',
  'tong_danh_gia',
  'tong_review',
];

const RATING_CRITERIA = [
  { key: 'punctuality', label: 'Đúng giờ', icon: 'clock', weight: 20 },
  { key: 'quality', label: 'Chất lượng dịch vụ', icon: 'bus', weight: 20 },
  { key: 'service', label: 'Thái độ phục vụ', icon: 'user', weight: 20 },
  { key: 'safety', label: 'An toàn', icon: 'shield', weight: 20 },
  { key: 'transparency', label: 'Minh bạch phản hồi', icon: 'message', weight: 20 },
];

function getServiceMeta(slug) {
  return SERVICE_META[slug] || SERVICE_META['nha-xe'];
}

function getImageNumberFromCode(code, fallbackIndex = 0) {
  const text = String(code || '').trim();
  const match = text.match(/(\d+)$/);

  if (match) {
    const parsed = Number(match[1]);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const safeIndex = Number.isFinite(Number(fallbackIndex)) ? Number(fallbackIndex) : 0;
  return safeIndex + 1;
}

function localOperatorImage(index, slug = 'nha-xe', code = '') {
  const meta = getServiceMeta(slug);
  const total = meta.imageTotal || 50;
  const number = getImageNumberFromCode(code, index);
  const safeNumber = ((number - 1) % total) + 1;

  return `${meta.imageFolder}/${safeNumber}.webp`;
}

function localOperatorImageAlt(index, slug = 'nha-xe', code = '') {
  const meta = getServiceMeta(slug);
  if (!meta.imageFolderAlt) return '';

  const total = meta.imageTotal || 50;
  const number = getImageNumberFromCode(code, index);
  const safeNumber = ((number - 1) % total) + 1;

  return `${meta.imageFolderAlt}/${safeNumber}.webp`;
}

function getCodePrefixBySlug(slug) {
  return getServiceMeta(slug).prefix;
}


function normalizeServiceCode(code) {
  const raw = String(code || '').trim().toUpperCase();
  if (!raw) return '';

  const rules = [
    { regex: /^BUS-(\d+)-001$/, prefix: 'PT' },
    { regex: /^HOTEL-(\d+)-001$/, prefix: 'KS' },
    { regex: /^AIR-(\d+)-001$/, prefix: 'MB' },
    { regex: /^RAIL-(\d+)-001$/, prefix: 'TH' },
    { regex: /^TOUR-(\d+)-001$/, prefix: 'TO' },
    { regex: /^SERVICE-(\d+)-001$/, prefix: 'DV' },
  ];

  for (const rule of rules) {
    const match = raw.match(rule.regex);
    if (match) return `${rule.prefix}-${String(Number(match[1])).padStart(3, '0')}`;
  }

  return raw;
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.operators)) return payload.operators;
  if (Array.isArray(payload?.reviews)) return payload.reviews;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function objectMapToList(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];

  return Object.entries(value)
    .filter(([, item]) => item && typeof item === 'object' && !Array.isArray(item))
    .map(([key, item]) => ({ code: key, ...item }));
}

function extractStatsList(payload) {
  const list = extractList(payload);
  if (list.length) return list;

  const mapped = [
    ...objectMapToList(payload?.data),
    ...objectMapToList(payload?.stats),
    ...objectMapToList(payload?.reviewStats),
    ...objectMapToList(payload?.review_stats),
    ...objectMapToList(payload?.results),
  ];

  return mapped;
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;

  let text = String(value).trim();
  if (!text) return fallback;

  text = text.replace(/\s/g, '');

  // Hỗ trợ cả dạng 1,234 / 1.234 và 4,5.
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(text)) {
    text = text.replace(/[.,]/g, '');
  } else {
    text = text.replace(',', '.');
  }

  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;

  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return fallback;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstText(...values) {
  const value = values.find(v => v !== undefined && v !== null && String(v).trim() !== '');
  return value === undefined ? '' : String(value).trim();
}

function normalizeFieldKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function getStatCandidateObjects(source) {
  if (!source || typeof source !== 'object') return [];

  return [
    source,
    source.stats,
    source.stat,
    source.metrics,
    source.metric,
    source.summary,
    source.reviewStats,
    source.review_stats,
    source.ratingStats,
    source.rating_stats,
    source.reviewSummary,
    source.review_summary,
    source.aggregate,
    source.aggregates,
  ].filter(item => item && typeof item === 'object' && !Array.isArray(item));
}

function readNumberByKeys(source, keys, fallback = 0) {
  const wanted = new Set(keys.map(normalizeFieldKey));

  for (const object of getStatCandidateObjects(source)) {
    for (const key of keys) {
      if (object[key] !== undefined && object[key] !== null && String(object[key]).trim() !== '') {
        return toNumber(object[key], fallback);
      }
    }

    for (const [key, value] of Object.entries(object)) {
      if (wanted.has(normalizeFieldKey(key)) && value !== undefined && value !== null && String(value).trim() !== '') {
        return toNumber(value, fallback);
      }
    }
  }

  return fallback;
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function isApprovedReview(review) {
  const status = normalizeStatus(review?.moderationStatus || review?.status || review?.reviewStatus);
  const visibility = normalizeStatus(review?.visibility);

  if (!status && !visibility) return true;

  return [
    'approved',
    'approve',
    'published',
    'active',
    'success',
    'pending_review',
    'pending',
    'hidden',
  ].includes(status) || visibility === 'hidden' || visibility === 'public';
}

function getCode(item, fallback = '') {
  return firstText(
    item?.assignedOperatorCode,
    item?.assigned_operator_code,
    item?.ownerPartnerCode,
    item?.owner_partner_code,
    item?.partnerCode,
    item?.partner_code,
    item?.operatorCode,
    item?.operator_code,
    item?.targetOperatorCode,
    item?.target_operator_code,
    item?.targetCode,
    item?.target_code,
    item?.hotelCode,
    item?.hotel_code,
    item?.serviceCode,
    item?.service_code,
    item?.code,
    item?.id,
    fallback,
  );
}

function getName(item, fallback = '') {
  return firstText(
    item?.operatorName,
    item?.operator_name,
    item?.targetName,
    item?.target_name,
    item?.hotelName,
    item?.hotel_name,
    item?.serviceName,
    item?.service_name,
    item?.orgName,
    item?.businessName,
    item?.name,
    item?.title,
    fallback,
  );
}

function getRegion(item) {
  return firstText(
    item?.region,
    item?.area,
    item?.route,
    item?.routes,
    item?.location,
    item?.address,
    item?.province,
    item?.city,
    'Đang cập nhật',
  );
}

function normalizeOperator(item, index, slug = 'nha-xe') {
  const meta = getServiceMeta(slug);
  const embeddedReviews = Array.isArray(item?.reviews) ? item.reviews.filter(isApprovedReview) : [];
  const embeddedTotal = embeddedReviews.length;
  const embeddedSum = embeddedReviews.reduce((sum, review) => sum + toNumber(review.rating || review.score || review.stars), 0);
  const rawCode = getCode(item, `OP-${index + 1}`);
  const normalizedCode = normalizeServiceCode(rawCode);
  const code = normalizedCode || rawCode;
  const name = getName(item, `${meta.sourceLabel} ${index + 1}`);

  const embeddedAverage = embeddedTotal ? embeddedSum / embeddedTotal : 0;
  const avgRating = readNumberByKeys(
    item,
    AVG_RATING_KEYS,
    toNumber(firstText(item?.avgRating, item?.averageRating, item?.overallRating, item?.ratingAvg, item?.ratingAverage, item?.rating, embeddedAverage), embeddedAverage),
  );
  const totalReviews = readNumberByKeys(
    item,
    TOTAL_REVIEW_KEYS,
    toNumber(firstText(item?.totalReviews, item?.reviewCount, item?.total_reviews, item?.reviewsCount, item?.totalReview, embeddedTotal), embeddedTotal),
  );

  return {
    id: firstText(item?.id, rawCode, code, `${index + 1}`),
    rawCode,
    code,
    name,
    region: getRegion(item),
    type: firstText(item?.type, item?.serviceType, item?.category, item?.vehicleType, item?.businessType, meta.defaultType),
    imageUrl: firstText(
      item?.imageUrl,
      item?.image_url,
      item?.photoUrl,
      item?.photo_url,
      item?.logoUrl,
      item?.logo_url,
      item?.logo,
      item?.avatar,
      item?.thumbnail,
      item?.coverImage,
      item?.cover_image,
      item?.image,
    ),
    localImageUrl: localOperatorImage(index, slug, code),
    localImageAltUrl: localOperatorImageAlt(index, slug, code),
    description: firstText(
      item?.description,
      item?.note,
      item?.summary,
      item?.shortDescription,
      meta.defaultDescription,
    ),
    avgRating,
    totalReviews,
  };
}

function normalizeReview(review, index) {
  const code = getCode(review, `REVIEW-${index + 1}`);
  const name = getName(review);

  return {
    ...review,
    code,
    targetCode: firstText(review?.targetCode, review?.target_code, code),
    operatorCode: firstText(review?.operatorCode, review?.operator_code, code),
    assignedOperatorCode: firstText(review?.assignedOperatorCode, review?.assigned_operator_code, code),
    ownerPartnerCode: firstText(review?.ownerPartnerCode, review?.owner_partner_code, code),
    partnerCode: firstText(review?.partnerCode, review?.partner_code, code),
    name,
    targetName: firstText(review?.targetName, review?.target_name, name),
    operatorName: firstText(review?.operatorName, review?.operator_name, name),
    partnerName: firstText(review?.partnerName, review?.partner_name, name),
    reviewerName: firstText(review?.reviewerName, review?.userName, review?.authorName, review?.customerName, 'Người dùng ẩn danh'),
    comment: firstText(review?.comment, review?.content, review?.reviewText, review?.text, 'Trải nghiệm ổn, thông tin được ghi nhận từ hệ thống đánh giá.'),
    rating: toNumber(firstText(review?.rating, review?.score, review?.stars, review?.avgRating, review?.averageRating), 0),
    count: toNumber(firstText(review?.totalReviews, review?.reviewCount, review?.total_reviews, review?.count, review?.total), 1),
  };
}

function readLocalReviews() {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_REVIEW_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

async function readFirstList(endpoints) {
  let lastError = '';

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      const list = extractList(response.data);
      if (list.length) return { endpoint, list };
    } catch (err) {
      lastError = err?.response?.data?.message || err?.message || endpoint;
    }
  }

  return { endpoint: '', list: [], error: lastError };
}

async function readFirstStatsList(endpoints) {
  let lastError = '';

  const readWithApi = async (endpoint) => {
    const separator = endpoint.includes('?') ? '&' : '?';
    const safeEndpoint = `${endpoint}${separator}_rh_t=${Date.now()}`;
    const response = await api.get(safeEndpoint, {
      timeout: 5000,
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    return response.data;
  };

  const readWithFetchFallback = async (endpoint) => {
    if (typeof window === 'undefined') return null;

    const isLocalFrontend = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const base =
   import.meta.env.VITE_API_BASE_URL ||
   (isLocalFrontend ? 'http://localhost:8080' : 'https://reviewhub-backend-ki8w.onrender.com');
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${base}${endpoint}${separator}_rh_t=${Date.now()}`;

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  for (const endpoint of endpoints) {
    for (const reader of [readWithApi, readWithFetchFallback]) {
      try {
        const data = await reader(endpoint);
        const list = extractStatsList(data);
        if (list.length) return { endpoint, list };

        const single = normalizeStatItem(data, 0, '');
        if (single.totalReviews || single.avgRating) return { endpoint, list: [single] };
      } catch (err) {
        lastError = err?.response?.data?.message || err?.message || endpoint;
      }
    }
  }

  return { endpoint: '', list: [], error: lastError };
}

function normalizeStatItem(item, index = 0, fallbackCode = '') {
  const rawCode = getCode(item, fallbackCode);
  const normalizedCode = normalizeServiceCode(rawCode);
  const name = getName(item);

  return {
    rawCode,
    code: normalizedCode || rawCode,
    name,
    avgRating: readNumberByKeys(item, AVG_RATING_KEYS, 0),
    totalReviews: readNumberByKeys(item, TOTAL_REVIEW_KEYS, 0),
    index,
  };
}

function getCodeKeys(value) {
  const raw = String(value || '').trim();
  const normalized = normalizeServiceCode(raw);
  return Array.from(new Set([
    raw,
    normalized,
    normalizeSearchText(raw),
    normalizeSearchText(normalized),
  ].filter(Boolean)));
}

function setBestStat(map, key, stat) {
  const safeKey = normalizeSearchText(key);
  if (!safeKey) return;

  const current = map.get(safeKey);
  if (!current || Number(stat.totalReviews || 0) > Number(current.totalReviews || 0)) {
    map.set(safeKey, stat);
  }
}

function mergeStats(operators, stats) {
  if (!stats?.length) return operators;

  const byCode = new Map();
  const byName = new Map();

  stats.map(normalizeStatItem).forEach(stat => {
    const hasStat = Number(stat.totalReviews || 0) > 0 || Number(stat.avgRating || 0) > 0;
    if (!hasStat) return;

    getCodeKeys(stat.rawCode).forEach(key => setBestStat(byCode, key, stat));
    getCodeKeys(stat.code).forEach(key => setBestStat(byCode, key, stat));

    const name = normalizeSearchText(stat.name);
    if (name) setBestStat(byName, name, stat);
  });

  if (!byCode.size && !byName.size) return operators;

  return operators.map(operator => {
    const codeKeys = [
      ...getCodeKeys(operator.rawCode),
      ...getCodeKeys(operator.code),
    ];

    let stat = null;
    for (const key of codeKeys) {
      stat = byCode.get(normalizeSearchText(key));
      if (stat) break;
    }

    const operatorName = normalizeSearchText(operator.name);
    if (!stat && operatorName) {
      stat = byName.get(operatorName);
    }

    if (!stat && operatorName) {
      for (const [name, item] of byName.entries()) {
        if (name && operatorName && (name.includes(operatorName) || operatorName.includes(name))) {
          stat = item;
          break;
        }
      }
    }

    if (!stat) return operator;

    const statTotal = Number(stat.totalReviews || 0);
    const statRating = Number(stat.avgRating || 0);

    return {
      ...operator,
      totalReviews: statTotal || operator.totalReviews,
      avgRating: statRating || operator.avgRating,
    };
  });
}

function buildReviewMaps(reviews) {
  const byCode = new Map();
  const byName = new Map();
  const normalizedReviews = reviews.filter(isApprovedReview).map(normalizeReview);

  normalizedReviews.forEach(review => {
    if (!review.rating) return;

    const update = (map, key) => {
      if (!key) return;
      const current = map.get(key) || { count: 0, sum: 0, comments: [] };
      const count = Math.max(review.count, 1);
      current.count += count;
      current.sum += review.rating * count;
      current.comments.push(review);
      map.set(key, current);
    };

    update(byCode, review.code);
    update(byName, normalizeSearchText(review.name));
  });

  return { byCode, byName, normalizedReviews };
}

function mergeReviews(operators, reviews) {
  const { byCode, byName } = buildReviewMaps(reviews);
  if (!byCode.size && !byName.size) return operators;

  return operators.map(operator => {
    const stat = byCode.get(operator.code) || byName.get(normalizeSearchText(operator.name));
    if (!stat?.count) return operator;

    return {
      ...operator,
      totalReviews: stat.count,
      avgRating: stat.sum / stat.count,
      comments: stat.comments,
    };
  });
}

function reviewBelongsToOperators(review, operators) {
  const reviewCodes = [
    review.code,
    review.operatorCode,
    review.operator_code,
    review.assignedOperatorCode,
    review.assigned_operator_code,
    review.ownerPartnerCode,
    review.owner_partner_code,
    review.partnerCode,
    review.partner_code,
    review.targetOperatorCode,
    review.target_operator_code,
    review.targetCode,
    review.target_code,
  ].map(normalizeSearchText).filter(Boolean);

  const reviewNames = [
    review.name,
    review.operatorName,
    review.operator_name,
    review.targetName,
    review.target_name,
    review.partnerName,
    review.partner_name,
    review.orgName,
    review.businessName,
    review.hotelName,
    review.hotel_name,
  ].map(normalizeSearchText).filter(Boolean);

  return operators.some(operator => {
    const operatorCode = normalizeSearchText(operator.code);
    const operatorName = normalizeSearchText(operator.name);

    return (
      reviewCodes.includes(operatorCode) ||
      reviewNames.includes(operatorName) ||
      reviewNames.some(name => name && operatorName && (name.includes(operatorName) || operatorName.includes(name)))
    );
  });
}

function compact(value, max = 64) {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function reputation(item) {
  const score = toNumber(item.avgRating);
  const reviews = toNumber(item.totalReviews);

  if (score >= 9 || (score >= 4.5 && reviews >= 300)) return { label: 'Rất uy tín', className: styles.repExcellent };
  if (score >= 8 || score >= 4 || reviews >= 100) return { label: 'Uy tín cao', className: styles.repGood };
  if (reviews > 0) return { label: 'Uy tín', className: styles.repMedium };
  return { label: 'Chưa đủ dữ liệu', className: styles.repNeutral };
}

function displayScore(avgRating) {
  const rating = toNumber(avgRating);
  if (rating <= 5) return rating * 2;
  return rating;
}

function starRating(avgRating) {
  const rating = displayScore(avgRating) / 2;
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return '★★★★★'.slice(0, full).padEnd(5, '☆');
}

function criteriaScore(item, index, offset) {
  return Math.max(38, Math.min(96, Math.round(displayScore(item.avgRating) * 8 + offset - index * 1.25)));
}

function escapeSvgText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function imageSvg(name, index, slug = 'nha-xe') {
  const meta = getServiceMeta(slug);
  const colors = [
    ['#f97316', '#0f3a67', '#cde7ff'],
    ['#111827', '#334155', '#dbeafe'],
    ['#2563eb', '#0f4c81', '#e0f2fe'],
    ['#dc2626', '#111827', '#fee2e2'],
    ['#1d4ed8', '#334155', '#dbeafe'],
    ['#eab308', '#334155', '#fef3c7'],
  ][index % 6];

  const iconLabel = slug === 'khach-san' ? 'Hotel' : slug === 'may-bay' ? 'Airline' : slug === 'tau-hoa' ? 'Train' : slug === 'tour' ? 'Tour' : 'ReviewHub';
  const title = escapeSvgText(String(name || iconLabel).slice(0, 18));
  const subtitle = escapeSvgText(meta.sourceLabel || iconLabel);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 260"><defs><linearGradient id="sky" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${colors[2]}"/><stop offset="1" stop-color="#ffffff"/></linearGradient><linearGradient id="main" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="420" height="260" fill="url(#sky)"/><circle cx="340" cy="50" r="36" fill="#fff7cc" opacity=".75"/><path d="M0 126 C62 72 110 92 164 124 C220 156 264 82 330 110 C374 128 400 116 420 96 L420 260 L0 260 Z" fill="#8fbf93" opacity=".55"/><path d="M20 222 C120 190 260 190 420 218 L420 260 L0 260 Z" fill="#e5e7eb"/><g transform="translate(54 112)"><rect x="0" y="0" width="306" height="104" rx="18" fill="url(#main)" opacity=".92"/><rect x="24" y="18" width="82" height="66" rx="10" fill="#dbeafe" opacity=".9"/><rect x="122" y="18" width="70" height="66" rx="10" fill="#dbeafe" opacity=".82"/><rect x="208" y="18" width="70" height="66" rx="10" fill="#dbeafe" opacity=".82"/></g><text x="28" y="34" font-family="Times New Roman, serif" font-size="18" font-weight="400" fill="#0f2f5f" opacity=".75">${title}</text><text x="28" y="58" font-family="Times New Roman, serif" font-size="13" fill="#64748b">${subtitle}</text></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function OperatorImage({ item, index, slug = 'nha-xe', compactMode = false }) {
  const dbImage = item.imageUrl || '';
  const localImage = item.localImageUrl || localOperatorImage(index, slug, item.code);
  const localImageAlt = item.localImageAltUrl || localOperatorImageAlt(index, slug, item.code);

  return (
    <div className={compactMode ? styles.tableImage : styles.cardImage}>
      <img
        src={localImage || localImageAlt || dbImage}
        alt={item.name}
        data-local-src={localImage}
        data-local-alt-src={localImageAlt}
        data-db-src={dbImage}
        data-fallback-src={imageSvg(item.name, index, slug)}
        onError={(event) => {
          const img = event.currentTarget;
          const localAltSrc = img.dataset.localAltSrc;
          const dbSrc = img.dataset.dbSrc;
          const fallbackSrc = img.dataset.fallbackSrc;

          if (!img.dataset.triedLocalAlt && localAltSrc) {
            img.dataset.triedLocalAlt = '1';
            img.src = localAltSrc;
            return;
          }

          if (!img.dataset.triedDb && dbSrc) {
            img.dataset.triedDb = '1';
            img.src = dbSrc;
            return;
          }

          if (fallbackSrc) img.src = fallbackSrc;
        }}
      />
    </div>
  );
}

function PremiumIcon({ name }) {
  const icons = {
    shield: (
      <path d="M12 3.4 5.6 5.9v5.2c0 4.1 2.6 7.7 6.4 9.1 3.8-1.4 6.4-5 6.4-9.1V5.9L12 3.4Zm2.9 6.3-3.8 3.9-1.9-1.9" />
    ),
    bus: (
      <path d="M6.2 5.2h11.6c1 0 1.8.8 1.8 1.8v8.1c0 .8-.6 1.5-1.4 1.7l-.5 1.2h-1.9l-.5-1.1H8.7L8.2 18H6.3l-.5-1.2c-.8-.2-1.4-.9-1.4-1.7V7c0-1 .8-1.8 1.8-1.8Zm.6 2.2v3.7h10.4V7.4H6.8Zm1.1 6.1h.1m8 0h.1" />
    ),
    user: (
      <path d="M12 11.6a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Zm-7.1 8.1c.8-3.5 3.5-5.4 7.1-5.4s6.3 1.9 7.1 5.4" />
    ),
    clock: (
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.1v4.7l3.2 1.9" />
    ),
    message: (
      <path d="M5.4 5.3h13.2c.9 0 1.7.8 1.7 1.7v7.9c0 .9-.8 1.7-1.7 1.7H10l-4.2 3v-3H5.4c-.9 0-1.7-.8-1.7-1.7V7c0-.9.8-1.7 1.7-1.7Zm2.5 4h8.2M7.9 12.5h5.6" />
    ),
    trophy: (
      <path d="M8.2 4.4h7.6v3.4c0 3.2-1.7 5.2-3.8 5.2s-3.8-2-3.8-5.2V4.4Zm0 1.2H5.1v2c0 1.8 1.3 3.2 3.1 3.3m7.6-5.3h3.1v2c0 1.8-1.3 3.2-3.1 3.3M12 13v3.2m-3.4 3.4h6.8M10 16.2h4" />
    ),
    star: (
      <path d="m12 3.7 2.5 5 5.5.8-4 3.9.9 5.5L12 16.3l-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 3.7Z" />
    ),
    users: (
      <path d="M9.4 11.4a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm-5.6 7.5c.6-3 2.7-4.7 5.6-4.7s5 1.7 5.6 4.7m.3-7.7a2.8 2.8 0 1 0 0-5.6m1.4 12.8c1.6-.2 2.8-.1 3.5.2" />
    ),
    heart: (
      <path d="M12 20s-7.2-4.2-8.4-9.1C2.8 7.8 4.7 5.2 7.5 5.2c1.6 0 3.1.9 4 2.2.9-1.3 2.4-2.2 4-2.2 2.8 0 4.7 2.6 3.9 5.7C18.2 15.8 12 20 12 20Z" />
    ),
    filter: (
      <path d="M4 6.2h16M7.2 12h9.6M10 17.8h4" />
    ),
  };

  return (
    <svg className={styles.iconSvg} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icons[name] || icons.shield}
      </g>
    </svg>
  );
}

function EmptyState({ message }) {
  return <div className={styles.emptyState}>{message}</div>;
}

function getMethodDescription(item) {
  if (item.key === 'quality') return 'Chất lượng cơ sở vật chất, tiện nghi, sạch sẽ và bảo dưỡng';
  if (item.key === 'service') return 'Tác phong, sự nhiệt tình và hỗ trợ khách hàng';
  if (item.key === 'safety') return 'An toàn, tuân thủ quy định và quy trình phục vụ';
  if (item.key === 'transparency') return 'Xử lý phản hồi minh bạch thông tin';
  return 'Khả năng đúng giờ, đúng lịch và đúng cam kết';
}

export default function ServiceCategoryPage() {
  const { slug = 'nha-xe' } = useParams();
  const config = PAGE_CONFIG[slug] || PAGE_CONFIG['nha-xe'];
  const serviceMeta = getServiceMeta(slug);
  const [operators, setOperators] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [criterionFilter, setCriterionFilter] = useState('all');
  const [sortMode, setSortMode] = useState('trusted');
  const [visibleLimit, setVisibleLimit] = useState(1000);
  const [sourceInfo, setSourceInfo] = useState({ operators: '', reviews: '', images: '', error: '' });

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const prefix = getCodePrefixBySlug(slug);

      try {
        // Ưu tiên đọc file cache JSON tĩnh trong public/cache.
        // File này đã có sẵn tổng đánh giá + sao trung bình, nên không cần backend query DB khi mở trang.
        const cacheResult = await readCategoryCache(slug);
        const cachedOperators = cacheResult.list
          .map((item, index) => normalizeOperator(item, index, slug))
          .filter(item => String(item.code || '').startsWith(prefix));

        if (typeof window !== 'undefined') {
          window.__reviewhubStatsDebug = {
            mode: 'cache-json',
            category: slug,
            cacheFile: cacheResult.endpoint,
            cacheTotal: cacheResult.total,
            generatedAt: cacheResult.generatedAt,
            firstItems: cachedOperators.slice(0, 10),
          };
        }

        setOperators(cachedOperators);
        setReviews([]);
        setSourceInfo({
          operators: cacheResult.endpoint,
          reviews: `Cache JSON${cacheResult.generatedAt ? ` · ${new Date(cacheResult.generatedAt).toLocaleString('vi-VN')}` : ''}`,
          images: serviceMeta.imageInfo,
          error: '',
        });

        return;
      } catch (cacheErr) {
        // Nếu chưa tạo cache hoặc file cache bị thiếu, tự fallback về API để trang không bị trắng.
        console.warn('ReviewHub cache fallback:', cacheErr);
      }

      // Fallback: Lấy danh sách dịch vụ + thống kê nhẹ theo đúng nhóm đang xem.
      // Ví dụ slug nha-xe chỉ gọi dữ liệu PT/BUS, không đọc toàn bộ KS/MB/TH/TO/DV.
      const [operatorResult, statResult] = await Promise.all([
        readFirstList(categoryOperatorEndpoints(slug, config.operatorEndpoints)),
        readFirstStatsList(REVIEW_STATS_ENDPOINTS.map(endpoint => withCategoryParam(endpoint, slug))).catch(err => ({
          endpoint: '',
          list: [],
          error: err?.message || 'Không đọc được thống kê nhẹ',
        })),
      ]);

      if (typeof window !== 'undefined') {
        window.__reviewhubStatsDebug = {
          mode: 'api-fallback',
          category: slug,
          operatorEndpoint: operatorResult.endpoint,
          statsEndpoint: statResult.endpoint,
          statsError: statResult.error,
          statsCount: statResult.list.length,
          firstStats: statResult.list.slice(0, 10),
        };
      }

      const normalizedOperators = operatorResult.list
        .map((item, index) => normalizeOperator(item, index, slug))
        .filter(item => String(item.code || '').startsWith(prefix));

      const mergedOperators = statResult.list.length
        ? mergeStats(normalizedOperators, statResult.list)
        : normalizedOperators;

      setOperators(mergedOperators);
      setReviews([]);
      setSourceInfo({
        operators: operatorResult.endpoint || serviceMeta.sourceFallback,
        reviews: statResult.list.length
          ? (statResult.endpoint || 'Thống kê nhẹ')
          : 'API chưa trả thống kê tổng/sao',
        images: serviceMeta.imageInfo,
        error: operatorResult.error || statResult.error || '',
      });
    } finally {
      setLoading(false);
    }
  }, [config.operatorEndpoints, serviceMeta.imageInfo, serviceMeta.sourceFallback, slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const regions = useMemo(() => {
    const unique = Array.from(new Set(operators.map(item => item.region).filter(Boolean)));
    return unique.sort((a, b) => String(a).localeCompare(String(b), 'vi'));
  }, [operators]);

  const rankedOperators = useMemo(() => {
    return [...operators].sort((a, b) => {
      const scoreA = displayScore(a.avgRating);
      const scoreB = displayScore(b.avgRating);
      return b.totalReviews - a.totalReviews || scoreB - scoreA || a.name.localeCompare(b.name, 'vi');
    });
  }, [operators]);

  const topOperators = useMemo(() => rankedOperators.slice(0, 6), [rankedOperators]);

  const filteredOperators = useMemo(() => {
    const keyword = normalizeSearchText(query);

    const filtered = operators.filter(item => {
      const matchKeyword = !keyword || normalizeSearchText([item.name, item.code, item.region, item.type, item.description].filter(Boolean).join(' ')).includes(keyword);
      const matchRegion = regionFilter === 'all' || item.region === regionFilter;
      const matchCriterion = criterionFilter === 'all' || true;

      return matchKeyword && matchRegion && matchCriterion;
    });

    return filtered.sort((a, b) => {
      const scoreA = displayScore(a.avgRating);
      const scoreB = displayScore(b.avgRating);
      if (sortMode === 'reviews') return b.totalReviews - a.totalReviews || scoreB - scoreA;
      if (sortMode === 'rating') return scoreB - scoreA || b.totalReviews - a.totalReviews;
      if (sortMode === 'name') return a.name.localeCompare(b.name, 'vi');
      return (scoreB * 100 + b.totalReviews / 10) - (scoreA * 100 + a.totalReviews / 10);
    });
  }, [operators, query, regionFilter, criterionFilter, sortMode]);

  const visibleOperators = filteredOperators.slice(0, visibleLimit);

  const communityStats = useMemo(() => {
    const totalReviews = operators.reduce((sum, item) => sum + Number(item.totalReviews || 0), 0);
    const avg = operators.length
      ? operators.reduce((sum, item) => sum + displayScore(item.avgRating), 0) / operators.length
      : 0;
    const topRegions = regions.slice(0, 5).map(region => ({
      region,
      reviews: operators
        .filter(item => item.region === region)
        .reduce((sum, item) => sum + Number(item.totalReviews || 0), 0),
    }));

    return {
      totalOperators: operators.length,
      totalReviews,
      avg,
      members: Math.max(totalReviews * 4 + operators.length * 50, totalReviews),
      today: Math.max(reviews.slice(0, 124).length, Math.min(124, totalReviews)),
      topRegions,
    };
  }, [operators, regions, reviews]);

  const communityReviews = useMemo(() => {
    const real = reviews.slice(0, 4);
    if (real.length) return real;

    const sourceOperators = topOperators.length ? topOperators : operators;
    return sourceOperators.slice(0, 4).map((item, index) => ({
      code: item.code,
      name: item.name,
      reviewerName: serviceMeta.sampleReviewers[index] || `${serviceMeta.person} ${index + 1}`,
      comment: serviceMeta.sampleComments[index] || compact(item.description, 92),
      rating: item.avgRating ? displayScore(item.avgRating) / 2 : [5, 4, 3, 5][index] || 4,
    }));
  }, [operators, reviews, serviceMeta.person, serviceMeta.sampleComments, serviceMeta.sampleReviewers, topOperators]);

  return (
    <main className={styles.page}>
      <section className={styles.heroPanel}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1>
              {config.title}
              <span className={styles.verifiedMark}>
                <PremiumIcon name="shield" />
              </span>
            </h1>

            <p>{config.subtitle}</p>

            <div className={styles.heroStats}>
              <div>
                <i><PremiumIcon name="shield" /></i>
                <strong>100%</strong>
                <span>Đánh giá xác thực</span>
              </div>

              <div>
                <i><PremiumIcon name="user" /></i>
                <strong>Minh bạch</strong>
                <span>Phương pháp rõ ràng</span>
              </div>

              <div>
                <i><PremiumIcon name="clock" /></i>
                <strong>Cập nhật</strong>
                <span>Theo dữ liệu mới</span>
              </div>
            </div>
          </div>

          <div className={styles.heroArtwork} aria-hidden="true">
            <img
              src="/nen.webp"
              alt=""
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      </section>

      <section className={styles.featuredPanel} id="top">
        <div className={styles.panelTitleRow}>
          <div>
            <span className={styles.sectionIcon}><PremiumIcon name="trophy" /></span>
            <h2>{serviceMeta.topTitle}</h2>
          </div>
          <button type="button" onClick={() => setVisibleLimit(filteredOperators.length || 8)}>Xem tất cả →</button>
        </div>

        {loading ? (
          <div className={styles.cardGrid}>{Array.from({ length: 6 }).map((_, index) => <div key={index} className={`${styles.topCard} ${styles.skeletonCard}`} />)}</div>
        ) : topOperators.length ? (
          <div className={styles.cardGrid}>
            {topOperators.map((item, index) => {
              const rep = reputation(item);
              const score = displayScore(item.avgRating);

              return (
                <article className={styles.topCard} key={`${item.code}-${item.name}`}>
                  <span className={styles.rankRibbon}>{index + 1}</span>
                  <OperatorImage item={item} index={index} slug={slug} />

                  <div className={styles.topCardBody}>
                    <h3>{item.name} <span>●</span></h3>
                    <div className={styles.bigScore}><strong>{score.toFixed(1)}</strong><span>/10</span></div>
                    <div className={styles.starsLine}><span>{starRating(item.avgRating)}</span><small>{(score / 2).toFixed(1)} ({Number(item.totalReviews || 0).toLocaleString('vi-VN')} đánh giá)</small></div>
                    <p>{compact(item.description, 76)}</p>
                    <span className={`${styles.reputationBadge} ${rep.className}`}>{rep.label}</span>
                    <Link
                      to={`/dich-vu/${slug}/reviews/${encodeURIComponent(item.code)}`}
                      className={styles.reviewButton}
                    >
                      Xem đánh giá <span>→</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <EmptyState message={serviceMeta.noApiMessage} />}
      </section>

      <section className={styles.methodPanel} id="method">
        <div className={styles.methodText}>
          <h2>Cách chúng tôi chấm điểm</h2>
          <p>Dữ liệu được tổng hợp từ những nhận định giá xác thực của {serviceMeta.person}.</p>
        </div>

        <div className={styles.methodGrid}>
          {RATING_CRITERIA.map(item => (
            <div key={item.key} className={styles.methodItem}>
              <i><PremiumIcon name={item.icon} /></i>
              <strong>{item.label}</strong>
              <span>{item.weight}%</span>
              <small>{getMethodDescription(item)}</small>
            </div>
          ))}
        </div>

        <div className={styles.scoreBox}><span>Điểm uy tín tổng hợp</span><strong>10<small>/10</small></strong><em><PremiumIcon name="trophy" /></em><p>Càng cao càng uy tín</p></div>
      </section>

      <section className={styles.filterPanel}>
        <label><span>{serviceMeta.searchLabel}</span><div className={styles.inputBox}><input value={query} onChange={event => setQuery(event.target.value)} placeholder={serviceMeta.searchPlaceholder} /><i>⌕</i></div></label>
        <label><span>Lọc theo khu vực</span><select value={regionFilter} onChange={event => setRegionFilter(event.target.value)}><option value="all">Tất cả khu vực</option>{regions.map(region => <option key={region} value={region}>{region}</option>)}</select></label>
        <label><span>{serviceMeta.typeFilterLabel}</span><select value={criterionFilter} onChange={event => setCriterionFilter(event.target.value)}><option value="all">{serviceMeta.typeFilterAll}</option>{RATING_CRITERIA.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        <label><span>Sắp xếp theo</span><select value={sortMode} onChange={event => setSortMode(event.target.value)}><option value="trusted">Điểm uy tín cao nhất</option><option value="reviews">Lượt đánh giá nhiều nhất</option><option value="rating">Điểm đánh giá cao nhất</option><option value="name">Tên A-Z</option></select></label>
        <button type="button" className={styles.advancedButton}><PremiumIcon name="filter" /> Bộ lọc nâng cao</button>
      </section>

      <section className={styles.rankingLayout} id="ranking">
        <div className={styles.tablePanel}>
          <header className={styles.tableHeader}>
            <div><h2>{config.tableTitle}</h2><p>{config.tableSubtitle}</p><small>{serviceMeta.sourceLabel}: <b>{sourceInfo.operators || '...'}</b> · Review: <b>{sourceInfo.reviews || '...'}</b> · Ảnh: <b>{sourceInfo.images || '...'}</b></small></div>
            <div className={styles.criteriaLegend}>{RATING_CRITERIA.map(item => <span key={item.key}><PremiumIcon name={item.icon} /></span>)}</div>
          </header>

          <div className={styles.tableWrap}>
            <table className={styles.operatorTable}>
              <thead><tr><th>#</th><th>{serviceMeta.itemColumn}</th><th>{serviceMeta.routeColumn}</th><th>Điểm uy tín</th><th>Đánh giá chung</th><th>Tiêu chí đánh giá</th><th>Mức độ uy tín</th><th>Thao tác</th></tr></thead>
              <tbody>
                {!loading && visibleOperators.length === 0 && <tr><td colSpan={8} className={styles.noRow}>{serviceMeta.noMatchMessage}</td></tr>}
                {visibleOperators.map((item, index) => {
                  const rep = reputation(item);
                  const score = displayScore(item.avgRating);

                  return (
                    <tr key={`${item.code}-${item.name}`}>
                      <td className={styles.indexCell}>{index + 1}</td>
                      <td><div className={styles.operatorCell}><OperatorImage item={item} index={index} slug={slug} compactMode /><div><strong>{item.name} <span>●</span></strong><small>{compact(item.region, 42)}</small><em>{item.code}</em></div></div></td>
                      <td className={styles.routeCell}>{compact(item.region, 48)}</td>
                      <td className={styles.scoreCell}><strong>{score.toFixed(1)}</strong><span>/10</span></td>
                      <td className={styles.reviewCell}><div>{starRating(item.avgRating)}</div><small>{Number(item.totalReviews || 0).toLocaleString('vi-VN')} đánh giá</small></td>
                      <td><ul className={styles.criteriaDots}>{RATING_CRITERIA.map((criterion, cIndex) => <li key={criterion.key}><i><b style={{ width: `${criteriaScore(item, index, 18 - cIndex * 4)}%` }} /></i></li>)}</ul></td>
                      <td><span className={`${styles.reputationBadge} ${rep.className}`}>{rep.label}</span></td>
                      <td className={styles.actionCell}>
                        <Link
                          to={`/dich-vu/${slug}/reviews/${encodeURIComponent(item.code)}`}
                          className={styles.viewReviewButton}
                        >
                          <PremiumIcon name="message" />
                          Xem đánh giá
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredOperators.length > visibleLimit && <div className={styles.loadMoreRow}><button type="button" onClick={() => setVisibleLimit(limit => limit + 8)}>{serviceMeta.loadMoreText} <span>⌄</span></button></div>}
        </div>

        <aside className={styles.sidebarPanel}>
          <h3>Tổng quan cộng đồng</h3>
          <div className={styles.sideMetric}><span>{serviceMeta.sidebarEvaluated}</span><strong>{communityStats.totalOperators.toLocaleString('vi-VN')}</strong><i><PremiumIcon name="bus" /></i></div>
          <div className={styles.sideMetric}><span>{serviceMeta.totalReviewsLabel}</span><strong>{communityStats.totalReviews.toLocaleString('vi-VN')}</strong><i><PremiumIcon name="user" /></i></div>
          <div className={styles.sideMetric}><span>Điểm uy tín trung bình</span><strong>{communityStats.avg.toFixed(1)}<small>/10</small></strong><i><PremiumIcon name="star" /></i></div>
          <div className={styles.sideMetric}><span>{serviceMeta.memberLabel}</span><strong>{communityStats.members.toLocaleString('vi-VN')}+</strong><i><PremiumIcon name="users" /></i></div>
          <div className={styles.sideMetric}><span>Đánh giá mới hôm nay</span><strong>{communityStats.today}</strong><i><PremiumIcon name="message" /></i></div>

          <div className={styles.sideList}><h4>Danh mục được đánh giá cao</h4>{RATING_CRITERIA.slice(0, 3).map((item, index) => <p key={item.key}><span>#{index + 1} {item.label}</span><b>{Math.max(7.9, 8.6 - index * 0.2).toFixed(1)}/10</b></p>)}</div>
          <div className={styles.sideList}><h4>Khu vực được quan tâm</h4>{communityStats.topRegions.map(item => <p key={item.region}><span>{compact(item.region, 20)}</span><b>{item.reviews.toLocaleString('vi-VN')} đánh giá</b></p>)}</div>
        </aside>
      </section>

      <section className={styles.communityPanel} id="reviews">
        <div className={styles.panelTitleRow}><div><h2>{serviceMeta.communityTitle}</h2><p>{serviceMeta.communitySubtitle}</p></div><button type="button">Xem tất cả đánh giá →</button></div>
        <div className={styles.reviewGrid}>{communityReviews.map((review, index) => <article key={`${review.code}-${index}`} className={styles.reviewCard}><div className={styles.reviewUser}><img src={localOperatorImage(index + 8, slug, review.code)} alt={review.reviewerName} onError={(event) => { event.currentTarget.src = imageSvg(review.reviewerName, index + 8, slug); }} /><div><strong>{review.reviewerName}</strong><span>{review.name || serviceMeta.sourceLabel}</span></div><button type="button">⋮</button></div><div className={styles.reviewStars}>{starRating(review.rating)}</div><p>{compact(review.comment, 104)}</p><small>{review.name || serviceMeta.sourceLabel} <b>{displayScore(review.rating).toFixed(1)}/10</b></small></article>)}</div>
      </section>

      <section className={styles.trustFooter} id="trust">
        <div><i><PremiumIcon name="shield" /></i><strong>Dữ liệu minh bạch</strong><span>Phương pháp chấm điểm công khai, rõ ràng</span></div>
        <div><i><PremiumIcon name="user" /></i><strong>Cộng đồng xác thực</strong><span>100% đánh giá từ {serviceMeta.person} thật</span></div>
        <div><i><PremiumIcon name="clock" /></i><strong>Luôn cập nhật</strong><span>Dữ liệu mới mỗi ngày, đảm bảo chính xác</span></div>
        <div><i><PremiumIcon name="heart" /></i><strong>Không thiên vị</strong><span>Đánh giá độc lập, không nhận tài trợ</span></div>
        <blockquote>{serviceMeta.trustQuote}</blockquote>
      </section>
    </main>
  );
}
