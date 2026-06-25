import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../../../services/api';
import styles from './ServiceOperatorReviewsPage.module.css';

const REVIEW_ENDPOINTS = [
  // Giữ lại luồng lấy dữ liệu cũ để trang public không bị mất review đã có.
  '/api/admin/reviews?size=10000',
  '/api/admin/review-ai/all',
  '/api/reviews?size=10000&visibility=public&sourceSystem=all',
  '/api/reviews?size=10000',
  '/api/public/reviews?size=10000',
  '/api/reviews',
  '/api/public/reviews',
  '/api/admin/review-ai/pending',
];

const OPERATOR_ENDPOINTS = [
  '/api/operators',
  '/api/public/operators',
  '/api/transport-operators',
  '/api/public/transport-operators',
];

const REVIEW_POST_ENDPOINTS = [
  // Review khách gửi từ trang public phải đi vào hàng chờ Admin Moderation,
  // không gửi sang Partner SLA và không hiển thị ngay trên trang public.
  '/api/reviews',
  '/api/reviews/submit',
  '/api/public/reviews',
  '/api/public/reviews/submit',
];

const LOCAL_REVIEW_KEY = 'reviewhub-public-service-reviews';
const LOCAL_IMAGE_TOTAL = 50;
const REVIEWS_PER_PAGE = 15;

const REVIEW_IMAGE_FOLDER_BY_SLUG = {
  'nha-xe': 'nhaxe',
  'khach-san': 'khachsan',
  'may-bay': 'maybay',
  'tau-hoa': 'tauhoa',
  tour: 'tour',
  'dich-vu-khac': 'dichvukhac',
};

const SERVICE_META = {
  'nha-xe': {
    slug: 'nha-xe',
    category: 'Nhà xe',
    itemLabel: 'nhà xe',
    itemLabelTitle: 'Nhà xe',
    pluralLabel: 'nhà xe',
    defaultName: 'Nhà xe',
    defaultType: 'Công ty dịch vụ xe buýt',
    defaultDescription: 'Thông tin nhà xe được tổng hợp từ hệ thống và phản hồi của hành khách. Người dùng có thể xem đánh giá, tìm kiếm bình luận và gửi trải nghiệm thực tế.',
    defaultLocation: 'Vị trí nhà xe đang được cập nhật',
    imageFolder: '/anhxe',
    backgroundImageFolder: '/anhnenxe',
    serviceOptions: ['Dịch vụ tại chỗ', 'Nhận giữ hành lý', 'Hỗ trợ đặt vé', 'Có quầy bán vé', 'Hỗ trợ đổi trả vé'],
    amenities: ['Nhà vệ sinh', 'Phòng chờ', 'Bãi đỗ xe miễn phí', 'Thanh toán qua thẻ', 'Hỗ trợ qua điện thoại', 'Thông tin tuyến rõ ràng'],
  },
  'khach-san': {
    slug: 'khach-san',
    category: 'Khách sạn',
    itemLabel: 'khách sạn',
    itemLabelTitle: 'Khách sạn',
    pluralLabel: 'khách sạn',
    defaultName: 'Khách sạn',
    defaultType: 'Cơ sở lưu trú',
    defaultDescription: 'Thông tin khách sạn được tổng hợp từ hệ thống và phản hồi của khách lưu trú. Người dùng có thể xem đánh giá, hình ảnh, tiện nghi và gửi trải nghiệm thực tế sau mỗi chuyến đi.',
    defaultLocation: 'Vị trí khách sạn đang được cập nhật',
    imageFolder: '/anhkhachsan',
    backgroundImageFolder: '/anhnenkhachsan',
    serviceOptions: ['Dịch vụ phòng', 'Lễ tân 24/7', 'Nhận giữ hành lý', 'Đặt phòng trực tuyến', 'Hỗ trợ nhận/trả phòng'],
    amenities: ['Nhà vệ sinh riêng', 'Wifi', 'Nước uống miễn phí', 'Điều hòa', 'Ổ cắm sạc', 'Bãi đỗ xe'],
  },
  'may-bay': {
    slug: 'may-bay',
    category: 'Hãng bay',
    itemLabel: 'hãng bay',
    itemLabelTitle: 'Hãng bay',
    pluralLabel: 'hãng bay',
    defaultName: 'Hãng bay',
    defaultType: 'Dịch vụ hàng không',
    defaultDescription: 'Thông tin hãng bay được tổng hợp từ hệ thống và phản hồi của hành khách sau chuyến bay.',
    defaultLocation: 'Thông tin hãng bay đang được cập nhật',
    imageFolder: '/anhmaybay',
    backgroundImageFolder: '/anhnenmaybay',
    serviceOptions: ['Check-in trực tuyến', 'Hỗ trợ đổi vé', 'Hành lý ký gửi', 'Phòng chờ', 'Hỗ trợ khách hàng'],
    amenities: ['Quầy hỗ trợ', 'Ghế chờ', 'Wifi sân bay', 'Nước uống', 'Hỗ trợ hành lý', 'Thông tin chuyến bay'],
  },
  'tau-hoa': {
    slug: 'tau-hoa',
    category: 'Tàu hỏa',
    itemLabel: 'tuyến tàu',
    itemLabelTitle: 'Tuyến tàu',
    pluralLabel: 'tuyến tàu',
    defaultName: 'Tuyến tàu',
    defaultType: 'Dịch vụ đường sắt',
    defaultDescription: 'Thông tin tuyến tàu được tổng hợp từ hệ thống và phản hồi của hành khách.',
    defaultLocation: 'Tuyến tàu đang được cập nhật',
    imageFolder: '/anhtauhoa',
    backgroundImageFolder: '/anhnentauhoa',
    serviceOptions: ['Đặt vé tàu', 'Chọn chỗ ngồi', 'Hỗ trợ đổi vé', 'Thông tin hành trình', 'Hỗ trợ hành lý'],
    amenities: ['Nhà vệ sinh', 'Khoang chờ', 'Ổ cắm sạc', 'Điều hòa', 'Ghế/giường nằm', 'Thông tin ga đến'],
  },
  tour: {
    slug: 'tour',
    category: 'Tour',
    itemLabel: 'tour',
    itemLabelTitle: 'Tour',
    pluralLabel: 'tour',
    defaultName: 'Tour',
    defaultType: 'Dịch vụ tour',
    defaultDescription: 'Thông tin tour được tổng hợp từ hệ thống và phản hồi của khách du lịch.',
    defaultLocation: 'Lịch trình tour đang được cập nhật',
    imageFolder: '/anhtour',
    backgroundImageFolder: '/anhnentour',
    serviceOptions: ['Hướng dẫn viên', 'Lịch trình rõ ràng', 'Hỗ trợ đặt tour', 'Xe đưa đón', 'Tư vấn hành trình'],
    amenities: ['Bảo hiểm du lịch', 'Nước uống', 'Hỗ trợ ảnh', 'Bữa ăn', 'Vé tham quan', 'Hỗ trợ 24/7'],
  },
  'dich-vu-khac': {
    slug: 'dich-vu-khac',
    category: 'Dịch vụ khác',
    itemLabel: 'dịch vụ',
    itemLabelTitle: 'Dịch vụ',
    pluralLabel: 'dịch vụ',
    defaultName: 'Dịch vụ',
    defaultType: 'Dịch vụ du lịch',
    defaultDescription: 'Thông tin dịch vụ được tổng hợp từ hệ thống và phản hồi của người dùng. Người dùng có thể xem đánh giá, tìm kiếm bình luận và gửi trải nghiệm thực tế.',
    defaultLocation: 'Thông tin dịch vụ đang được cập nhật',
    imageFolder: '/anhdichvu',
    backgroundImageFolder: '/anhnendichvu',
    imageFolderAlt: '/anhdichvukhac',
    serviceOptions: ['Tư vấn dịch vụ', 'Hỗ trợ đặt lịch', 'Hỗ trợ trực tuyến', 'Chăm sóc khách hàng', 'Thông tin minh bạch'],
    amenities: ['Hỗ trợ 24/7', 'Thanh toán linh hoạt', 'Thông tin rõ ràng', 'Xác nhận nhanh', 'Hỗ trợ khiếu nại', 'Bảo mật thông tin'],
  },
};

function getServiceMeta(slug = 'nha-xe') {
  return SERVICE_META[slug] || SERVICE_META['nha-xe'];
}

function getCodePrefixBySlug(slug = 'nha-xe') {
  if (slug === 'khach-san') return 'KS-';
  if (slug === 'tau-hoa') return 'TH-';
  if (slug === 'may-bay') return 'MB-';
  if (slug === 'tour') return 'TO-';
  if (slug === 'dich-vu-khac') return 'DV-';
  return 'PT-';
}

function getReviewImageFolderBySlug(slug = 'nha-xe') {
  return REVIEW_IMAGE_FOLDER_BY_SLUG[slug] || REVIEW_IMAGE_FOLDER_BY_SLUG['nha-xe'];
}

function normalizeOperatorCode(value = '') {
  return String(value || '').trim().toUpperCase();
}

function getOperatorCodeFolderVariants(value = '') {
  const code = normalizeOperatorCode(value);
  if (!code) return [];

  const variants = [code];

  const matched = code.match(/^([A-Z]{2})-(\d+)$/);
  if (matched) {
    const prefix = matched[1];
    const number = Number(matched[2]);

    if (Number.isFinite(number) && number > 0) {
      variants.push(`${prefix}-${number}`);
      variants.push(`${prefix}-${String(number).padStart(3, '0')}`);
    }
  }

  return Array.from(new Set(variants));
}


function makeReviewId(operatorCode = '') {
  const safeCode = normalizeOperatorCode(operatorCode) || 'PT-000';
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
      : Math.random().toString(16).slice(2, 10).toUpperCase();

  return `${safeCode}-${randomPart}`;
}

function parseReviewImageName(reviewId = '', fallbackOperatorCode = '') {
  const value = String(reviewId || '').trim();
  const match = value.match(/^([A-Z]{2}-\d{3})-(.+)$/i);

  if (match) {
    return {
      operatorCode: match[1].toUpperCase(),
      imageToken: match[2],
      imageFileName: `${match[2]}.webp`,
    };
  }

  const fallbackCode = normalizeOperatorCode(fallbackOperatorCode);
  const imageToken = value || makeReviewId(fallbackCode).split('-').pop();

  return {
    operatorCode: fallbackCode,
    imageToken,
    imageFileName: `${imageToken}.webp`,
  };
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không đọc được ảnh.'));
    };

    image.src = objectUrl;
  });
}

async function convertImageToWebpFile(file, outputName) {
  try {
    const image = await fileToImage(file);
    const maxSize = 1200;
    const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));

    if (!blob) {
      return new File([file], outputName, { type: file.type || 'application/octet-stream' });
    }

    return new File([blob], outputName, { type: 'image/webp', lastModified: Date.now() });
  } catch (_err) {
    return new File([file], outputName, { type: file.type || 'application/octet-stream' });
  }
}

async function uploadPublicReviewImage({ reviewId, operatorCode, serviceSlug, file }) {
  if (!file || !reviewId || !operatorCode) return null;

  const categoryFolder = getReviewImageFolderBySlug(serviceSlug);
  const imageInfo = parseReviewImageName(reviewId, operatorCode);
  const imageFileName = imageInfo.imageFileName;
  const safeOperatorCode = imageInfo.operatorCode || normalizeOperatorCode(operatorCode);
  const publicImageUrl = `/anhdanggia/${categoryFolder}/${safeOperatorCode}/${imageFileName}`;
  const webpFile = await convertImageToWebpFile(file, imageFileName);

  const formData = new FormData();
  formData.append('file', webpFile, imageFileName);
  formData.append('reviewId', reviewId);
  formData.append('operatorCode', safeOperatorCode);
  formData.append('categoryFolder', categoryFolder);
  formData.append('imageFileName', imageFileName);
  formData.append('publicPath', publicImageUrl);

  const uploadEndpoints = [
    `/api/reviews/${encodeURIComponent(reviewId)}/image`,
    `/api/partner/reviews/${encodeURIComponent(reviewId)}/image`,
    '/api/review-images/upload',
  ];

  let lastError = null;

  for (const endpoint of uploadEndpoints) {
    try {
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      return {
        ...(response.data || {}),
        uploadOk: true,
        imageUrl: response.data?.imageUrl || publicImageUrl,
        reviewImage: response.data?.imageUrl || publicImageUrl,
        imageFileName,
        categoryFolder,
        operatorCode: safeOperatorCode,
      };
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error(
    lastError?.response?.status === 404
      ? 'Backend chưa nhận API upload ảnh. Hãy kiểm tra ReviewImageUploadController.java và restart backend.'
      : lastError?.response?.data?.message || lastError?.message || 'Upload ảnh thất bại.'
  );

  error.uploadMeta = {
    imageUrl: publicImageUrl,
    reviewImage: publicImageUrl,
    imageFileName,
    categoryFolder,
    operatorCode: safeOperatorCode,
  };

  throw error;
}

function getExplicitReviewImages(review = {}) {
  const list = [];

  const pushValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    const text = String(value).trim();
    if (text && !list.includes(text)) list.push(text);
  };

  pushValue(review.imageUrl);
  pushValue(review.image_url);
  pushValue(review.reviewImage);
  pushValue(review.review_image);
  pushValue(review.photoUrl);
  pushValue(review.photo_url);
  pushValue(review.localImagePreviewUrl);
  pushValue(review.images);
  pushValue(review.imageUrls);
  pushValue(review.image_urls);

  return list;
}


function getReviewImageFileNameFromReview(review = {}) {
  const value = firstText(
    review.imageFileName,
    review.image_file_name,
    review.imageName,
    review.image_name,
    review.photoFileName,
    review.photo_file_name,
  );

  if (!value) return '';

  return String(value).trim().toLowerCase().endsWith('.webp')
    ? String(value).trim()
    : `${String(value).trim()}.webp`;
}

function getReviewImageCandidateUrls(review = {}, operator = {}, serviceMeta = getServiceMeta(), sequentialIndex = 0) {
  const urls = [];

  const push = (url) => {
    const text = String(url || '').trim();
    if (text && !urls.includes(text)) urls.push(text);
  };

  const serviceSlug = getReviewServiceSlug(review, serviceMeta) || serviceMeta.slug;
  const categoryFolder = getReviewImageFolderBySlug(serviceSlug);

  /*
   * QUAN TRỌNG:
   * Trang public đang xem 1 nhà xe cụ thể, nên folder ảnh phải lấy theo operator.code hiện tại.
   * Không lấy review.id / GM-xxx / review.code trước, vì Google review cũ có thể mang mã GM
   * làm sai folder ảnh.
   */
  const operatorCode = normalizeOperatorCode(firstText(
    operator?.code,
    review.targetCode,
    review.target_code,
    review.operatorCode,
    review.operator_code,
    review.partnerCode,
    review.partner_code,
    review.ownerPartnerCode,
    review.owner_partner_code,
    review.code,
  ));

  const folderCodes = getOperatorCodeFolderVariants(operatorCode);
  if (!folderCodes.length) return urls;

  // Nếu backend/localStorage có tên file ảnh thật.
  const imageFileName = getReviewImageFileNameFromReview(review);
  if (imageFileName) {
    folderCodes.forEach((folderCode) => {
      push(`/anhdanggia/${categoryFolder}/${folderCode}/${imageFileName}`);
    });
  }

  // Nếu review mới có id dạng PT-013-1F9021D0 thì ảnh là 1F9021D0.webp.
  // Không áp dụng với GM-025-067 vì Google review cũ của bạn đánh ảnh theo thứ tự cmt.
  const reviewId = firstText(review.id, review.reviewId, review.review_id);
  const tokenMatch = String(reviewId || '').trim().match(/^(PT|KS|MB|TH|TO|DV)-\d{3}-(.+)$/i);
  if (tokenMatch?.[2]) {
    folderCodes.forEach((folderCode) => {
      push(`/anhdanggia/${categoryFolder}/${folderCode}/${tokenMatch[2]}.webp`);
    });
  }

  /*
   * LOGIC CHÍNH BẠN YÊU CẦU:
   * Cmt cũ nhất = 1.webp
   * Cmt tiếp theo = 2.webp
   * Cmt thứ 200 = 200.webp
   *
   * sequentialIndex phải được tính từ danh sách reviews gốc theo createdAt tăng dần,
   * không được tính theo trang hiện tại hoặc sort "Mới nhất".
   */
  const safeIndex = Number(sequentialIndex);
  if (Number.isFinite(safeIndex) && safeIndex > 0) {
    folderCodes.forEach((folderCode) => {
      push(`/anhdanggia/${categoryFolder}/${folderCode}/${Math.trunc(safeIndex)}.webp`);
    });
  }

  return urls;
}


function ReviewImageGallery({ review, operator, serviceMeta, sequentialIndex }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const explicitImages = getExplicitReviewImages(review);
  const candidateImages = explicitImages.length
    ? explicitImages
    : getReviewImageCandidateUrls(review, operator, serviceMeta, sequentialIndex);

  if (!candidateImages.length) return null;

  const currentImage = candidateImages[activeImageIndex];

  if (!currentImage) return null;

  return (
    <div className={styles.reviewGallery}>
      <img
        key={currentImage}
        className={styles.reviewThumb}
        src={currentImage}
        alt={`Ảnh đánh giá ${sequentialIndex || ''}`}
        loading="lazy"
        onError={() => {
          setActiveImageIndex((prev) => {
            const next = prev + 1;
            return next < candidateImages.length ? next : candidateImages.length;
          });
        }}
      />
    </div>
  );
}

function getReviewStorageKey(slug = 'nha-xe') {
  return `${LOCAL_REVIEW_KEY}:${slug}`;
}

function getSlugFromCategory(value = '') {
  const text = normalizeSearchText(value);
  if (!text) return '';
  if (text.includes('khach san') || text.includes('hotel') || text.includes('luu tru') || text.includes('accommodation')) return 'khach-san';
  if (text.includes('hang bay') || text.includes('may bay') || text.includes('flight') || text.includes('airline') || text.includes('aviation')) return 'may-bay';
  if (text.includes('tau hoa') || text.includes('duong sat') || text.includes('train') || text.includes('rail')) return 'tau-hoa';
  if (text.includes('tour')) return 'tour';
  if (text.includes('dich vu khac') || text.includes('other')) return 'dich-vu-khac';
  if (
    text.includes('nha xe') ||
    text.includes('xe khach') ||
    text.includes('bus') ||
    text.includes('transport') ||
    text.includes('operator') ||
    text.includes('vehicle') ||
    text.includes('coach') ||
    text === 'pt' ||
    text === 'pt-'
  ) return 'nha-xe';
  return '';
}

function getSlugFromCode(value = '') {
  const code = String(value || '').trim().toUpperCase();
  if (code.startsWith('KS-')) return 'khach-san';
  if (code.startsWith('MB-')) return 'may-bay';
  if (code.startsWith('TH-')) return 'tau-hoa';
  if (code.startsWith('TO-')) return 'tour';
  if (code.startsWith('DV-')) return 'dich-vu-khac';
  if (code.startsWith('PT-')) return 'nha-xe';
  return '';
}

function getReviewServiceSlug(raw, serviceMeta = getServiceMeta()) {
  const explicitSlug = firstText(
    raw?.serviceSlug,
    raw?.service_slug,
    raw?.targetSlug,
    raw?.target_slug,
  );

  const categorySlug = getSlugFromCategory(firstText(
    raw?.category,
    raw?.serviceCategory,
    raw?.service_category,
    raw?.targetTypeName,
    raw?.target_type_name,
    raw?.reviewTargetType,
    raw?.review_target_type,
    raw?.targetType,
    raw?.target_type,
    raw?.serviceType,
    raw?.service_type,
  ));

  const codeSlug = getSlugFromCode(firstText(
    raw?.targetCode,
    raw?.target_code,
    raw?.operatorCode,
    raw?.operator_code,
    raw?.partnerCode,
    raw?.partner_code,
    raw?.code,
  ));

  return firstText(explicitSlug, categorySlug, codeSlug, serviceMeta.slug);
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

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstText(...values) {
  const value = values.find(v => v !== undefined && v !== null && String(v).trim() !== '');
  return value === undefined ? '' : String(value).trim();
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getCode(item, fallback = '') {
  return firstText(
    item?.operatorCode,
    item?.operator_code,
    item?.targetCode,
    item?.target_code,
    item?.partnerCode,
    item?.partner_code,
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
    item?.orgName,
    item?.businessName,
    item?.name,
    item?.title,
    fallback,
  );
}

function getReviewCode(item, fallback = '') {
  return firstText(
    item?.operatorCode,
    item?.operator_code,
    item?.assignedOperatorCode,
    item?.assigned_operator_code,
    item?.ownerPartnerCode,
    item?.owner_partner_code,
    item?.partnerCode,
    item?.partner_code,
    item?.hotelCode,
    item?.hotel_code,
    item?.serviceCode,
    item?.service_code,
    item?.targetCode,
    item?.target_code,
    item?.code,
    item?.id,
    fallback,
  );
}

function getReviewName(item, fallback = '') {
  return firstText(
    item?.operatorName,
    item?.operator_name,
    item?.partnerName,
    item?.partner_name,
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

function getWebsite(item) {
  return firstText(item?.website, item?.webUrl, item?.url, item?.homepage, item?.domain, '');
}

function getPhone(item) {
  return firstText(item?.phone, item?.hotline, item?.phoneNumber, item?.contactPhone, item?.supportPhone, '');
}

function getAddress(item) {
  return firstText(item?.address, item?.fullAddress, item?.location, item?.officeAddress, getRegion(item));
}

function getDescription(item, serviceMeta = getServiceMeta()) {
  return firstText(
    item?.description,
    item?.note,
    item?.summary,
    item?.shortDescription,
    serviceMeta.defaultDescription,
  );
}

function imageNumberFromCode(code, fallbackIndex = 0, offset = 0) {
  const text = String(code || '').trim();
  const match = text.match(/(\d+)$/);
  const safeOffset = Number.isFinite(Number(offset)) ? Number(offset) : 0;

  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return (((parsed - 1 + safeOffset) % LOCAL_IMAGE_TOTAL) + LOCAL_IMAGE_TOTAL) % LOCAL_IMAGE_TOTAL + 1;
    }
  }

  const safeIndex = Number.isFinite(Number(fallbackIndex)) ? Number(fallbackIndex) : 0;
  return (((safeIndex + safeOffset) % LOCAL_IMAGE_TOTAL) + LOCAL_IMAGE_TOTAL) % LOCAL_IMAGE_TOTAL + 1;
}

function localOperatorImage(index, slug = 'nha-xe', code = '', offset = 0) {
  const serviceMeta = getServiceMeta(slug);
  const imageNumber = imageNumberFromCode(code, index, offset);
  return `${serviceMeta.imageFolder}/${imageNumber}.webp`;
}

function localOperatorImageAlt(index, slug = 'nha-xe', code = '', offset = 0) {
  const serviceMeta = getServiceMeta(slug);
  if (!serviceMeta.imageFolderAlt) return '';

  const imageNumber = imageNumberFromCode(code, index, offset);
  return `${serviceMeta.imageFolderAlt}/${imageNumber}.webp`;
}


function localOperatorBackgroundImage(index, slug = 'nha-xe', code = '', offset = 0) {
  const serviceMeta = getServiceMeta(slug);
  const imageNumber = imageNumberFromCode(code, index, offset);
  const backgroundFolder = serviceMeta.backgroundImageFolder || serviceMeta.imageFolder;
  return `${backgroundFolder}/${imageNumber}.webp`;
}

function localOperatorBackgroundImageAlt(index, slug = 'nha-xe', code = '', offset = 0) {
  const serviceMeta = getServiceMeta(slug);
  if (!serviceMeta.backgroundImageFolderAlt) return '';

  const imageNumber = imageNumberFromCode(code, index, offset);
  return `${serviceMeta.backgroundImageFolderAlt}/${imageNumber}.webp`;
}

function normalizeOperator(item, index, serviceMeta = getServiceMeta()) {
  const code = getCode(item, `OP-${index + 1}`);
  const name = getName(item, `${serviceMeta.defaultName} ${index + 1}`);

  return {
    ...item,
    id: firstText(item?.id, code),
    code,
    name,
    region: getRegion(item),
    address: getAddress(item),
    website: getWebsite(item),
    phone: getPhone(item),
    description: getDescription(item, serviceMeta),
    type: firstText(item?.type, item?.serviceType, item?.category, item?.vehicleType, item?.businessType, serviceMeta.defaultType),
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
    localImageUrl: localOperatorImage(index, serviceMeta.slug, code),
    localImageAltUrl: localOperatorImageAlt(index, serviceMeta.slug, code),
    serviceSlug: serviceMeta.slug,
  };
}

function makeSyntheticReviewDate(index = 0) {
  const safeIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  const date = new Date();
  date.setDate(date.getDate() - (safeIndex * 11 + 2));
  date.setHours((8 + safeIndex * 3) % 24, (safeIndex * 13) % 60, 0, 0);
  return date.toISOString();
}

function reviewCreatedAt(raw, index = 0) {
  return firstText(
    raw?.createdAt,
    raw?.created_at,
    raw?.date,
    raw?.time,
    raw?.reviewedAt,
    raw?.reviewed_at,
    raw?.updatedAt,
    raw?.updated_at,
    makeSyntheticReviewDate(index),
  );
}

function normalizeReview(raw, index = 0, serviceMeta = getServiceMeta()) {
  const code = getReviewCode(raw, '');
  const name = getReviewName(raw, '');
  const id = firstText(raw?.id, raw?.reviewId, raw?.review_id, `local-${Date.now()}-${index}`);
  const rawTargetCode = firstText(raw?.targetCode, raw?.target_code);
  const rawOperatorCode = firstText(raw?.operatorCode, raw?.operator_code);
  const rawPartnerCode = firstText(raw?.partnerCode, raw?.partner_code, raw?.ownerPartnerCode, raw?.owner_partner_code);
  const serviceSlug = getReviewServiceSlug(raw, serviceMeta);
  const category = firstText(raw?.category, raw?.serviceCategory, raw?.service_category, serviceMeta.category);

  return {
    ...raw,
    id,
    serviceSlug,
    service_slug: serviceSlug,
    serviceCategory: category,
    service_category: category,
    targetType: serviceSlug,
    target_type: serviceSlug,
    reviewTargetType: serviceSlug,
    review_target_type: serviceSlug,
    targetTypeName: serviceMeta.category,
    target_type_name: serviceMeta.category,
    category,
    targetCode: rawTargetCode || code || rawOperatorCode || rawPartnerCode,
    operatorCode: rawOperatorCode || rawPartnerCode || code || rawTargetCode,
    partnerCode: rawPartnerCode,
    targetName: name || firstText(raw?.operatorName, raw?.operator_name),
    operatorName: firstText(raw?.operatorName, raw?.operator_name, name),
    reviewerName: firstText(raw?.reviewerName, raw?.userName, raw?.authorName, raw?.customerName, 'Hành khách ẩn danh'),
    comment: firstText(raw?.comment, raw?.content, raw?.reviewText, raw?.text, 'Không có nội dung đánh giá.'),
    rating: toNumber(firstText(raw?.rating, raw?.score, raw?.stars, raw?.avgRating, raw?.averageRating), 0),
    createdAt: reviewCreatedAt(raw, index),
    visibility: firstText(raw?.visibility, 'public'),
    moderationStatus: firstText(raw?.moderationStatus, raw?.moderation_status, raw?.status, raw?.reviewStatus, raw?.review_status, 'pending_review'),
    sourceSystem: firstText(raw?.sourceSystem, raw?.source_system, raw?.source, 'google-maps'),
    imageUrl: firstText(raw?.imageUrl, raw?.image_url, raw?.reviewImage, raw?.review_image, raw?.photoUrl, raw?.photo_url, ''),
    reviewImage: firstText(raw?.reviewImage, raw?.review_image, raw?.imageUrl, raw?.image_url, raw?.photoUrl, raw?.photo_url, ''),
    imageFileName: firstText(raw?.imageFileName, raw?.image_file_name, raw?.imageName, raw?.image_name, ''),
    localImagePreviewUrl: firstText(raw?.localImagePreviewUrl, raw?.imagePreviewUrl, raw?.image_preview_url, ''),
    images: Array.isArray(raw?.images) ? raw.images : Array.isArray(raw?.imageUrls) ? raw.imageUrls : [],
    hasImage: Boolean(firstText(raw?.imageUrl, raw?.image_url, raw?.reviewImage, raw?.review_image, raw?.photoUrl, raw?.photo_url, raw?.localImagePreviewUrl, '')),
  };
}

async function readFirstList(endpoints) {
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      const list = extractList(response.data);
      if (list.length) return { endpoint, list };
    } catch (_err) {
      // continue
    }
  }

  return { endpoint: '', list: [] };
}

function readLocalReviews(slug = 'nha-xe') {
  if (typeof window === 'undefined') return [];

  const readKey = (key) => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  };

  const scopedReviews = readKey(getReviewStorageKey(slug));
  const legacyReviews = readKey(LOCAL_REVIEW_KEY);

  return [...scopedReviews, ...legacyReviews].filter(
    (item, index, list) => list.findIndex(other => String(other.id) === String(item.id)) === index
  );
}

function writeLocalReview(review, slug = 'nha-xe') {
  if (typeof window === 'undefined') return;

  const scopedKey = getReviewStorageKey(slug);

  const readKey = (key) => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  };

  const mergeIntoKey = (key) => {
    const current = readKey(key);
    const next = [review, ...current.filter(item => String(item.id) !== String(review.id))].slice(0, 500);
    window.localStorage.setItem(key, JSON.stringify(next));
  };

  // Lưu theo slug để trang dịch vụ lọc đúng loại.
  mergeIntoKey(scopedKey);

  // Đồng thời lưu vào key cũ để PartnerReviewQueryPage và các màn hình cũ vẫn đọc được
  // trong trường hợp backend chưa nhận hoặc chưa đồng bộ review.
  mergeIntoKey(LOCAL_REVIEW_KEY);
}

function reviewMatchesService(review, serviceMeta = getServiceMeta()) {
  const currentSlug = normalizeSearchText(serviceMeta.slug);
  const explicitSlug = normalizeSearchText(firstText(
    review.serviceSlug,
    review.service_slug,
    review.targetSlug,
    review.target_slug,
  ));

  if (explicitSlug && explicitSlug !== currentSlug) return false;

  const detectedSlug = normalizeSearchText(getSlugFromCategory(firstText(
    review.category,
    review.serviceCategory,
    review.service_category,
    review.targetTypeName,
    review.target_type_name,
    review.reviewTargetType,
    review.review_target_type,
    review.targetType,
    review.target_type,
    review.serviceType,
    review.service_type,
  )));

  if (detectedSlug && detectedSlug !== currentSlug) return false;

  const reviewCodeSlug = getSlugFromCode(firstText(
    review.targetCode,
    review.target_code,
    review.operatorCode,
    review.operator_code,
    review.partnerCode,
    review.partner_code,
    review.code,
  ));

  if (reviewCodeSlug && normalizeSearchText(reviewCodeSlug) !== currentSlug) return false;

  return true;
}

function reviewMatchesOperator(review, operator) {
  const operatorCode = normalizeSearchText(operator?.code);
  const operatorName = normalizeSearchText(operator?.name);
  const operatorId = normalizeSearchText(operator?.id);

  const reviewIds = [
    review.targetId,
    review.target_id,
    review.operatorId,
    review.operator_id,
    review.partnerId,
    review.partner_id,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);

  const reviewCodes = [
    review.operatorCode,
    review.operator_code,
    review.assignedOperatorCode,
    review.assigned_operator_code,
    review.ownerPartnerCode,
    review.owner_partner_code,
    review.partnerCode,
    review.partner_code,
    review.code,
    review.targetCode,
    review.target_code,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);

  const reviewNames = [
    review.targetName,
    review.target_name,
    review.operatorName,
    review.operator_name,
    review.partnerName,
    review.partner_name,
    review.name,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);

  const idMatches = Boolean(operatorId && reviewIds.some(id => id === operatorId));
  const codeMatches = Boolean(operatorCode && reviewCodes.some(code => code === operatorCode));
  const nameMatches = Boolean(operatorName && reviewNames.some(name => name === operatorName));

  // Nếu review có đủ mã + tên thì bắt buộc phải khớp cả hai.
  // Trường hợp này xử lý đúng yêu cầu: PT-004 + Phương Trang chỉ hiện ở đúng nhà xe đó,
  // không tràn sang nhà xe khác dù nhà xe khác cũng có mã PT-004.
  if (operatorCode && operatorName && reviewCodes.length && reviewNames.length) {
    return codeMatches && nameMatches;
  }

  // Nếu backend có ID riêng cho đối tác thì ưu tiên dùng ID để phân biệt các bản ghi trùng mã.
  if (operatorId && reviewIds.length) return idMatches;

  // Fallback cho dữ liệu cũ thiếu tên hoặc thiếu mã.
  return codeMatches || nameMatches;
}

function reviewMatchesOperatorCodeOnly(review, operator) {
  const operatorCode = normalizeSearchText(operator?.code);
  if (!operatorCode) return true;

  const primaryCodes = [
    review.targetCode,
    review.target_code,
    review.operatorCode,
    review.operator_code,
    review.assignedOperatorCode,
    review.assigned_operator_code,
    review.ownerPartnerCode,
    review.owner_partner_code,
    review.partnerCode,
    review.partner_code,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);

  return primaryCodes.some(code => code === operatorCode);
}

async function postReview(payload) {
  let lastError = null;

  for (const endpoint of REVIEW_POST_ENDPOINTS) {
    try {
      const response = await api.post(endpoint, payload);
      return response.data || payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}


const ALLOW_DB_REVIEW_FALLBACK = false;
const REVIEW_CACHE_POLL_MS = 5000;

function getCacheOperatorCode(value = '') {
  return normalizeOperatorCode(value).replace(/[^A-Z0-9-]/g, '');
}

async function fetchJsonFile(url) {
  if (typeof window === 'undefined') return null;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return null;
  return response.json();
}

function extractCacheReviews(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.reviews)) return payload.reviews;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

async function readPublicReviewCache({ serviceSlug, operatorCode }) {
  const safeSlug = String(serviceSlug || 'nha-xe').trim();
  const safeCode = getCacheOperatorCode(operatorCode);

  if (!safeCode) {
    return { source: '', list: [], meta: null };
  }

  const endpoint =
    `/api/public/review-cache/${encodeURIComponent(safeSlug)}/${encodeURIComponent(safeCode)}?v=${Date.now()}`;

  try {
    const response = await api.get(endpoint);
    const payload = response.data;
    const list = extractCacheReviews(payload);

    return {
      source: endpoint,
      list,
      meta: payload,
    };
  } catch (error) {
    console.warn('Không đọc được public review cache:', error);
    return { source: '', list: [], meta: null };
  }
}

function makeStars(value) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(value || 0))));
  return '★★★★★'.slice(0, rounded).padEnd(5, '☆');
}

function formatDate(value) {
  if (!value) return 'Chưa có thời gian';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (_err) {
    return String(value);
  }
}

function formatDateParts(value) {
  if (!value) return { date: 'Chưa có ngày', time: '' };
  try {
    const date = new Date(value);
    return {
      date: date.toLocaleDateString('vi-VN'),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch (_err) {
    return { date: String(value), time: '' };
  }
}

function reputation(avg) {
  if (avg >= 4.5) return 'Xuất sắc';
  if (avg >= 4) return 'Rất tốt';
  if (avg >= 3) return 'Ổn định';
  return 'Trung bình';
}

function ratingBreakdown(reviews) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(review => {
    const rounded = Math.max(1, Math.min(5, Math.round(Number(review.rating || 0))));
    counts[rounded] += 1;
  });
  const total = Math.max(reviews.length, 1);

  return [5, 4, 3, 2, 1].map(star => ({
    star,
    count: counts[star],
    percent: (counts[star] / total) * 100,
  }));
}

function makeInitials(value) {
  return String(value || 'KH')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

function sourceLabel(value) {
  const source = String(value || '').toLowerCase();
  if (source.includes('google')) return 'Google Maps';
  if (source.includes('vexere')) return 'Vexere';
  if (source.includes('partner')) return 'Partner';
  if (source.includes('public') || source.includes('user') || source.includes('community')) return 'Người dùng';
  return 'Cộng đồng';
}

function statusInfo(review) {
  const raw = String(review?.moderationStatus || '').toLowerCase();
  if (review?.localOnly) return { label: 'pending', className: 'statusPending' };
  if (raw.includes('approved') || raw.includes('public')) return { label: 'approved', className: 'statusApproved' };
  if (raw.includes('flag') || raw.includes('reject')) return { label: 'flagged', className: 'statusFlagged' };
  return { label: 'pending', className: 'statusPending' };
}

function isApprovedVisibleReview(review) {
  const status = String(
    review?.moderationStatus ||
    review?.moderation_status ||
    review?.status ||
    review?.reviewStatus ||
    review?.review_status ||
    ''
  ).toLowerCase();

  const source = String(
    review?.sourceSystem ||
    review?.source_system ||
    review?.source ||
    ''
  ).toLowerCase();

  if (status.includes('reject') || status.includes('decline') || status.includes('refuse')) {
    return false;
  }

  // Review do khách ngoài public hoặc tài khoản partner gửi phải chờ admin duyệt,
  // nên pending_review không được hiện ngay ở trang public.
  if (source.includes('public') || source.includes('partner')) {
    return status.includes('approved') || status.includes('public');
  }

  // Dữ liệu Google Maps / dữ liệu cũ giữ cách hiển thị cũ để không làm mất dữ liệu đang có.
  // Nếu backend đã lọc approved thì vẫn đúng; nếu dữ liệu cũ thiếu status thì vẫn hiện.
  return true;
}

function sentimentStats(reviews) {
  const total = Math.max(reviews.length, 1);
  const positive = reviews.filter(item => Number(item.rating || 0) >= 4).length;
  const neutral = reviews.filter(item => Math.round(Number(item.rating || 0)) === 3).length;
  const negative = reviews.filter(item => Number(item.rating || 0) <= 2).length;

  return {
    positive,
    neutral,
    negative,
    positivePercent: Math.round((positive / total) * 100),
    neutralPercent: Math.round((neutral / total) * 100),
    negativePercent: Math.round((negative / total) * 100),
  };
}

function PremiumIcon({ name }) {
  const icons = {
    back: <path d="M15 18 9 12l6-6" />,
    review: <path d="M5.4 5.3h13.2c.9 0 1.7.8 1.7 1.7v7.9c0 .9-.8 1.7-1.7 1.7H10l-4.2 3v-3H5.4c-.9 0-1.7-.8-1.7-1.7V7c0-.9.8-1.7 1.7-1.7Zm2.5 4h8.2M7.9 12.5h5.6" />,
    star: <path d="m12 3.7 2.5 5 5.5.8-4 3.9.9 5.5L12 16.3l-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 3.7Z" />,
    send: <path d="M21 3 10.8 13.2M21 3l-6.4 18-3.8-7.8L3 9.4 21 3Z" />,
    user: <path d="M12 11.6a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Zm-7.1 8.1c.8-3.5 3.5-5.4 7.1-5.4s6.3 1.9 7.1 5.4" />,
    filter: <path d="M4 6.2h16M7.2 12h9.6M10 17.8h4" />,
    search: <path d="m21 21-4.3-4.3M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    phone: <path d="M7.4 4.8 9.2 9c.3.6.1 1.3-.4 1.7l-1.2 1c1.1 2.1 2.6 3.6 4.7 4.7l1-1.2c.4-.5 1.1-.7 1.7-.4l4.2 1.8c.7.3 1.1 1 .9 1.8l-.6 2.1c-.2.7-.8 1.2-1.6 1.2C10 21.7 2.3 14 2.3 6.1c0-.8.5-1.4 1.2-1.6l2.1-.6c.8-.2 1.5.2 1.8.9Z" />,
    location: <><path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" /></>,
    website: <><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3c2.1 2.4 3.2 5.4 3.2 9s-1.1 6.6-3.2 9c-2.1-2.4-3.2-5.4-3.2-9S9.9 5.4 12 3Z" /></>,
    bookmark: <path d="M7 4.3h10c.6 0 1 .4 1 1V20l-6-3.2L6 20V5.3c0-.6.4-1 1-1Z" />,
    share: <path d="M18 8a3 3 0 1 0-2.8-4M6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 4a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.7 15.4l6.6-3.2M8.7 18.6l6.6 3.2" />,
    map: <path d="M9 18 3.5 20.5V6L9 3.5 15 6l5.5-2.5V18L15 20.5 9 18Zm0 0V3.5M15 20.5V6" />,
    check: <path d="M20 6 9 17l-5-5" />,
    image: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4.8 17 4.4-4.4 3.1 3.1 2.4-2.4 4.5 4.5" /></>,
    briefcase: <><rect x="4" y="7" width="16" height="11" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M4 11h16" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    dots: <><circle cx="6" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18" cy="12" r="1.4" /></>,
    external: <><path d="M14 5h5v5" /><path d="M10 14 19 5" /><path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" /></>,
    sort: <><path d="M7 5h10M7 12h7M7 19h4" /><path d="m17 16 2 3 2-3" /></>,
    funnel: <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" />,
    comment2: <><path d="M4 5.5h16c.8 0 1.5.7 1.5 1.5v9c0 .8-.7 1.5-1.5 1.5H9l-4.5 3v-3H4c-.8 0-1.5-.7-1.5-1.5V7c0-.8.7-1.5 1.5-1.5Z" /><path d="M8 10h8M8 13h5" /></>,
    thumbs: <path d="M9.5 10.5 12 4.8a1.7 1.7 0 0 1 3.1.8v4h3.1c1 0 1.8.9 1.6 1.9l-1.2 5.4c-.2.8-.9 1.4-1.7 1.4H9.5m0-7.8H6.1c-.6 0-1.1.5-1.1 1.1v6.4c0 .6.5 1.1 1.1 1.1h3.4Z" />,
    gallery: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="m6 15 3.3-3.3 2.7 2.7 2.2-2.2 3.8 3.8" /><circle cx="9" cy="9" r="1.2" /></>,
    verified: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.2 2.3 2.3 4.7-5" /></>,
  };

  return (
    <svg className={styles.iconSvg} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icons[name] || icons.review}
      </g>
    </svg>
  );
}


function SentimentFace({ mood = 'neutral' }) {
  const mouthPath =
    mood === 'positive'
      ? 'M8.2 13.8c.9 1.15 2.15 1.75 3.8 1.75s2.9-.6 3.8-1.75'
      : mood === 'negative'
        ? 'M8.2 15.25c.9-1.05 2.15-1.55 3.8-1.55s2.9.5 3.8 1.55'
        : 'M8.7 14.55h6.6';

  return (
    <svg className={styles.sentimentFaceSvg} viewBox="0 0 24 24" aria-hidden="true">
      <circle className={styles.sentimentFaceEye} cx="9" cy="10" r="1" />
      <circle className={styles.sentimentFaceEye} cx="15" cy="10" r="1" />
      <path className={styles.sentimentFaceMouth} d={mouthPath} />
    </svg>
  );
}

function OperatorImage({ src, alt, fallback, fallbackAlt, className = '' }) {
  return (
    <div className={className}>
      <img
        src={src || fallback || fallbackAlt}
        alt={alt || 'Dịch vụ'}
        data-fallback-src={fallback}
        data-fallback-alt-src={fallbackAlt}
        onError={(event) => {
          const img = event.currentTarget;
          const fallbackSrc = img.dataset.fallbackSrc;
          const fallbackAltSrc = img.dataset.fallbackAltSrc;

          if (!img.dataset.triedFallback && fallbackSrc && img.src !== fallbackSrc) {
            img.dataset.triedFallback = '1';
            img.src = fallbackSrc;
            return;
          }

          if (!img.dataset.triedFallbackAlt && fallbackAltSrc) {
            img.dataset.triedFallbackAlt = '1';
            img.src = fallbackAltSrc;
          }
        }}
      />
    </div>
  );
}

export default function ServiceOperatorReviewsPage() {
  const { slug = 'nha-xe', operatorCode = '' } = useParams();
  const location = useLocation();
  const stateOperator = location.state?.operator || null;

  const [operator, setOperator] = useState(stateOperator);
  const [reviews, setReviews] = useState([]);
  const [allOperators, setAllOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [cacheSource, setCacheSource] = useState('');
  const [cacheMessage, setCacheMessage] = useState('');
  const [keyword, setKeyword] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortMode, setSortMode] = useState('newest');
  const [activeTab, setActiveTab] = useState('reviews');
  const [submitState, setSubmitState] = useState('idle');
  const [message, setMessage] = useState('');
  const [reviewPage, setReviewPage] = useState(1);
  const [form, setForm] = useState({ reviewerName: '', rating: '5', comment: '' });
  const [reviewImageFile, setReviewImageFile] = useState(null);
  const [reviewImagePreview, setReviewImagePreview] = useState('');
  const [reviewInteractions, setReviewInteractions] = useState({});

  const decodedCode = decodeURIComponent(operatorCode || '');
  const serviceMeta = useMemo(() => getServiceMeta(slug), [slug]);

  const refreshReviewsFromCache = useCallback(async (targetOperator, options = {}) => {
    const safeOperator = targetOperator;
    if (!safeOperator?.code && !decodedCode) return;

    const silent = Boolean(options.silent);
    if (!silent) setReviewsLoading(true);

    try {
      const cacheResult = await readPublicReviewCache({
        serviceSlug: serviceMeta.slug,
        operatorCode: safeOperator?.code || decodedCode,
      });

      let remoteReviews = cacheResult.list.map((item, index) => normalizeReview(item, index, serviceMeta));

      // Production giữ false để KHÔNG quay lại lỗi cũ: public page gọi DB size=10000.
      // Chỉ bật tạm khi dev cache chưa có dữ liệu.
      if (!remoteReviews.length && ALLOW_DB_REVIEW_FALLBACK) {
        const reviewResult = await readFirstList(REVIEW_ENDPOINTS);
        remoteReviews = reviewResult.list.map((item, index) => normalizeReview(item, index, serviceMeta));
      }

      const localReviews = readLocalReviews(serviceMeta.slug).map((item, index) => normalizeReview(item, index, serviceMeta));

      /*
       * QUAN TRỌNG:
       * Review đọc từ cache endpoint /api/public/review-cache/{slug}/{code}
       * đã được backend lấy đúng theo mã dịch vụ rồi. Không được lọc bắt buộc theo TÊN operator nữa,
       * vì dữ liệu cũ có nhiều bản ghi PT-013 nhưng targetName/operatorName lệch nhau
       * như Sao Việt / Tên dịch vụ / BUS-013-001. Nếu bắt khớp cả code + name sẽ bị mất gần hết review,
       * có trường hợp từ hơn 200 review chỉ còn 1 review.
       */
      const safeRemoteReviews = remoteReviews
        .filter(review => reviewMatchesService(review, serviceMeta))
        .filter(review => reviewMatchesOperatorCodeOnly(review, safeOperator))
        .filter(isApprovedVisibleReview);

      const safeLocalReviews = localReviews
        .filter(review => reviewMatchesService(review, serviceMeta) && reviewMatchesOperator(review, safeOperator))
        .filter(isApprovedVisibleReview);

      // Ưu tiên cache backend trước localStorage để bản approved không bị pending local đè mất.
      const allReviews = [...safeRemoteReviews, ...safeLocalReviews]
        .filter((item, index, list) => list.findIndex(other => String(other.id) === String(item.id)) === index)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setCacheSource(cacheResult.source || '');
      setReviews(allReviews);

      // Không show dòng debug ngoài giao diện. Cache tự cập nhật khi admin duyệt.
      if (!allReviews.length && !cacheResult.source) {
        setCacheMessage('');
      }
    } finally {
      if (!silent) setReviewsLoading(false);
    }
  }, [decodedCode, serviceMeta]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setReviewsLoading(true);
    setCacheSource('');
    setCacheMessage('');
    setReviews([]);
    setReviewPage(1);

    try {
      // Chỉ lấy operator để hiện tên + ảnh trước. Không gọi review DB ở bước này.
      const operatorResult = await readFirstList(OPERATOR_ENDPOINTS);

      const prefix = getCodePrefixBySlug(slug);
      const normalizedOperators = operatorResult.list.map((item, index) => normalizeOperator(item, index, serviceMeta));
      const scopedOperators = normalizedOperators.filter(item => String(item.code || '').startsWith(prefix));
      const operatorPool = scopedOperators.length ? scopedOperators : normalizedOperators;
      const foundByCode = operatorPool.find(item => normalizeSearchText(item.code) === normalizeSearchText(decodedCode));
      const foundByName = operatorPool.find(item => normalizeSearchText(item.name) === normalizeSearchText(decodedCode));
      const stateOperatorMatchesUrl =
        stateOperator &&
        (
          normalizeSearchText(stateOperator.code) === normalizeSearchText(decodedCode) ||
          normalizeSearchText(stateOperator.name) === normalizeSearchText(decodedCode)
        );

      const foundOperator =
        foundByCode ||
        foundByName ||
        (stateOperatorMatchesUrl ? stateOperator : null);

      const safeOperator = foundOperator || {
        code: decodedCode,
        name: decodedCode || serviceMeta.defaultName,
        region: 'Đang cập nhật',
        address: 'Đang cập nhật',
        type: serviceMeta.defaultType,
        description: serviceMeta.defaultDescription,
        localImageUrl: localOperatorImage(0, serviceMeta.slug, decodedCode),
        localImageAltUrl: localOperatorImageAlt(0, serviceMeta.slug, decodedCode),
        serviceSlug: serviceMeta.slug,
      };

      setOperator(safeOperator);
      setAllOperators(operatorPool);
      setLoading(false);

      // Đọc cache sau khi giao diện chính đã hiện. Endpoint cache chỉ đọc file/cache, không query toàn bộ DB.
      await refreshReviewsFromCache(safeOperator, { silent: false });
    } finally {
      setLoading(false);
      setReviewsLoading(false);
    }
  }, [decodedCode, refreshReviewsFromCache, stateOperator, slug, serviceMeta]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  useEffect(() => {
    if (!operator?.code) return undefined;

    const timer = window.setInterval(() => {
      refreshReviewsFromCache(operator, { silent: true });
    }, REVIEW_CACHE_POLL_MS);

    return () => window.clearInterval(timer);
  }, [operator, refreshReviewsFromCache]);

  useEffect(() => () => {
    if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview);
  }, [reviewImagePreview]);

  useEffect(() => {
    setReviewPage(1);
  }, [keyword, ratingFilter, sortMode]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total : 0;
    const positive = reviews.filter(item => Number(item.rating || 0) >= 4).length;
    const pending = reviews.filter(item => String(item.moderationStatus || '').includes('pending')).length;
    const breakdown = ratingBreakdown(reviews);

    return { total, avg, positive, pending, breakdown };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const q = normalizeSearchText(keyword);

    const result = reviews.filter(review => {
      const matchKeyword = !q || normalizeSearchText([
        review.reviewerName,
        review.comment,
        review.targetName,
        review.targetCode,
        review.sourceSystem,
        review.moderationStatus,
      ].join(' ')).includes(q);

      const matchRating = ratingFilter === 'all' || Math.round(Number(review.rating || 0)) === Number(ratingFilter);

      return matchKeyword && matchRating;
    });

    return result.sort((a, b) => {
      if (sortMode === 'highest') return Number(b.rating || 0) - Number(a.rating || 0);
      if (sortMode === 'lowest') return Number(a.rating || 0) - Number(b.rating || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reviews, keyword, ratingFilter, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const safePage = Math.min(reviewPage, totalPages);

  useEffect(() => {
    if (reviewPage > totalPages) setReviewPage(totalPages);
  }, [reviewPage, totalPages]);

  const paginatedReviews = useMemo(() => {
    const start = (safePage - 1) * REVIEWS_PER_PAGE;
    return filteredReviews.slice(start, start + REVIEWS_PER_PAGE);
  }, [filteredReviews, safePage]);

  const reviewOldestIndexById = useMemo(() => {
    const oldestFirst = [...reviews].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();

      if (timeA !== timeB) return timeA - timeB;

      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    const map = new Map();

    oldestFirst.forEach((review, index) => {
      map.set(String(review.id), index + 1);
    });

    return map;
  }, [reviews]);

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, safePage + 2);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [safePage, totalPages]);

  const galleryImages = useMemo(() => {
    const currentIndex = allOperators.findIndex(item => normalizeSearchText(item.code) === normalizeSearchText(operator?.code));
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;

    return [
      operator?.imageUrl || localOperatorImage(baseIndex, serviceMeta.slug, operator?.code, 0),
      localOperatorImage(baseIndex, serviceMeta.slug, operator?.code, 1),
      localOperatorImage(baseIndex, serviceMeta.slug, operator?.code, 2),
      localOperatorImage(baseIndex, serviceMeta.slug, operator?.code, 3),
      localOperatorImage(baseIndex, serviceMeta.slug, operator?.code, 4),
      localOperatorImage(baseIndex, serviceMeta.slug, operator?.code, 5),
      localOperatorImage(baseIndex, serviceMeta.slug, operator?.code, 6),
      localOperatorImage(baseIndex, serviceMeta.slug, operator?.code, 7),
    ];
  }, [allOperators, operator, serviceMeta.slug]);

  const serviceOptions = useMemo(() => serviceMeta.serviceOptions, [serviceMeta]);
  const amenities = useMemo(() => serviceMeta.amenities, [serviceMeta]);
  const sentiment = useMemo(() => sentimentStats(reviews), [reviews]);
  const latestUpdated = reviews[0]?.createdAt ? formatDate(reviews[0].createdAt) : formatDate(new Date().toISOString());
  const coverIndex = allOperators.findIndex(item => normalizeSearchText(item.code) === normalizeSearchText(operator?.code));
  const safeCoverIndex = coverIndex >= 0 ? coverIndex : 0;
  const heroLogo = operator?.imageUrl || localOperatorImage(safeCoverIndex, serviceMeta.slug, operator?.code, 0);
  const heroCover = localOperatorBackgroundImage(safeCoverIndex, serviceMeta.slug, operator?.code, 0) || heroLogo;

  function handleReviewImageChange(event) {
    const file = event.target.files?.[0];

    if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview);

    if (!file) {
      setReviewImageFile(null);
      setReviewImagePreview('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSubmitState('warning');
      setMessage('File được chọn không phải ảnh. Vui lòng chọn JPG, PNG hoặc WEBP.');
      event.target.value = '';
      setReviewImageFile(null);
      setReviewImagePreview('');
      return;
    }

    const maxSizeMb = 8;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setSubmitState('warning');
      setMessage(`Ảnh không được vượt quá ${maxSizeMb}MB.`);
      event.target.value = '';
      setReviewImageFile(null);
      setReviewImagePreview('');
      return;
    }

    setSubmitState('idle');
    setMessage('');
    setReviewImageFile(file);
    setReviewImagePreview(URL.createObjectURL(file));
  }

  function removeReviewImage() {
    if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview);
    setReviewImageFile(null);
    setReviewImagePreview('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!operator?.code || submitState === 'submitting') return;

    const comment = form.comment.trim();
    const reviewerName = form.reviewerName.trim() || 'Hành khách ẩn danh';

    if (!comment) {
      setSubmitState('warning');
      setMessage('Vui lòng nhập nội dung đánh giá.');
      return;
    }

    setSubmitState('submitting');
    setMessage('');

    const fallbackReviewId = makeReviewId(operator.code);

    const payload = {
      id: fallbackReviewId,
      reviewId: fallbackReviewId,
      review_id: fallbackReviewId,
      serviceSlug: serviceMeta.slug,
      service_slug: serviceMeta.slug,
      serviceType: serviceMeta.slug,
      service_type: serviceMeta.slug,
      serviceCategory: serviceMeta.category,
      service_category: serviceMeta.category,
      category: serviceMeta.category,
      targetType: serviceMeta.slug,
      target_type: serviceMeta.slug,
      reviewTargetType: serviceMeta.slug,
      review_target_type: serviceMeta.slug,
      targetTypeName: serviceMeta.category,
      target_type_name: serviceMeta.category,
      targetId: operator.id,
      target_id: operator.id,
      operatorId: operator.id,
      operator_id: operator.id,
      partnerId: operator.id,
      partner_id: operator.id,
      targetCode: operator.code,
      target_code: operator.code,
      operatorCode: operator.code,
      operator_code: operator.code,
      partnerCode: operator.code,
      partner_code: operator.code,
      ownerPartnerCode: operator.code,
      owner_partner_code: operator.code,
      targetName: operator.name,
      target_name: operator.name,
      operatorName: operator.name,
      operator_name: operator.name,
      partnerName: operator.name,
      partner_name: operator.name,
      reviewerName,
      userName: reviewerName,
      authorName: reviewerName,
      customerName: reviewerName,
      rating: Number(form.rating),
      score: Number(form.rating),
      stars: Number(form.rating),
      comment,
      content: comment,
      reviewText: comment,
      text: comment,
      visibility: 'public',
      moderationStatus: 'pending_review',
      status: 'pending_review',
      sourceSystem: 'public-web',
      source: 'public-web',
      dataScope: 'shared',
      data_scope: 'shared',
      reviewScope: 'public-shared',
      review_scope: 'public-shared',
      submitChannel: 'public-page',
      submit_channel: 'public-page',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    try {
      const saved = await postReview(payload);
      const finalId = saved?.id || saved?.reviewId || saved?.review_id || fallbackReviewId;

      let uploadedImage = null;
      let uploadWarning = '';

      if (reviewImageFile) {
        try {
          uploadedImage = await uploadPublicReviewImage({
            reviewId: finalId,
            operatorCode: operator.code,
            serviceSlug: serviceMeta.slug,
            file: reviewImageFile,
          });
        } catch (uploadError) {
          uploadWarning = uploadError?.message || 'Upload ảnh chưa thành công.';
          uploadedImage = {
            ...(uploadError?.uploadMeta || {}),
            uploadOk: false,
          };
        }
      }

      setForm({ reviewerName: '', rating: '5', comment: '' });
      setReviewImageFile(null);
      setReviewImagePreview('');
      setSubmitState(uploadWarning ? 'warning' : 'success');
      setMessage(
        uploadWarning
          ? `Đã gửi đánh giá vào hàng chờ admin, nhưng ảnh chưa lưu được vào server: ${uploadWarning}`
          : reviewImageFile
            ? `Đã gửi đánh giá kèm ảnh ${uploadedImage?.imageFileName || ''}. Admin sẽ kiểm duyệt trước khi hiển thị.`
            : 'Đã gửi đánh giá. Nội dung sẽ được admin kiểm duyệt trước khi hiển thị công khai.'
      );
      setActiveTab('reviews');
      setReviewPage(1);
    } catch (err) {
      setSubmitState('warning');
      setMessage(
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Chưa gửi được đánh giá lên hệ thống. Vui lòng kiểm tra API /api/reviews.'
      );
    }
  }

  function getReviewInteraction(reviewId, index = 0) {
    const key = String(reviewId);
    const current = reviewInteractions[key] || {};
    const baseHelpful = Math.max(1, 12 - (index % 7));
    const baseComments = index % 5;

    return {
      liked: Boolean(current.liked),
      showCommentBox: Boolean(current.showCommentBox),
      commentDraft: current.commentDraft || '',
      helpfulCount: baseHelpful + (current.liked ? 1 : 0),
      comments: Array.isArray(current.comments) ? current.comments : [],
      commentCount: baseComments + (Array.isArray(current.comments) ? current.comments.length : 0),
    };
  }

  function toggleReviewLike(reviewId) {
    const key = String(reviewId);
    setReviewInteractions(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        liked: !prev[key]?.liked,
      },
    }));
  }

  function toggleReviewCommentBox(reviewId) {
    const key = String(reviewId);
    setReviewInteractions(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        showCommentBox: !prev[key]?.showCommentBox,
      },
    }));
  }

  function updateReviewCommentDraft(reviewId, value) {
    const key = String(reviewId);
    setReviewInteractions(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        commentDraft: value,
      },
    }));
  }

  function submitReviewComment(reviewId) {
    const key = String(reviewId);
    const draft = String(reviewInteractions[key]?.commentDraft || '').trim();
    if (!draft) return;

    const newComment = {
      id: `ui-comment-${Date.now()}`,
      author: 'Bạn',
      text: draft,
      createdAt: new Date().toISOString(),
    };

    setReviewInteractions(prev => {
      const current = prev[key] || {};
      return {
        ...prev,
        [key]: {
          ...current,
          comments: [...(Array.isArray(current.comments) ? current.comments : []), newComment],
          commentDraft: '',
          showCommentBox: true,
        },
      };
    });
  }

  function renderOverview() {
    return (
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Tổng quan {serviceMeta.itemLabel}</h2>
        <p className={styles.sectionDescription}>{operator?.description || serviceMeta.defaultDescription}</p>
        <div className={styles.overviewGrid}>
          <div className={styles.infoBadge}><PremiumIcon name="check" /> Minh bạch đánh giá</div>
          <div className={styles.infoBadge}><PremiumIcon name="review" /> {stats.total.toLocaleString('vi-VN')} bài đánh giá</div>
          <div className={styles.infoBadge}><PremiumIcon name="briefcase" /> {operator?.type || serviceMeta.defaultType}</div>
          <div className={styles.infoBadge}><PremiumIcon name="location" /> {operator?.region || serviceMeta.defaultLocation}</div>
        </div>
      </div>
    );
  }

  function renderGallery() {
    return (
      <div className={styles.galleryPanel}>
        {galleryImages.map((image, index) => (
          <figure className={styles.galleryFigure} key={`${image}-${index}`}>
            <img
              src={image}
              alt={`${operator?.name || serviceMeta.defaultName} ${index + 1}`}
              onError={(event) => {
                const alt = localOperatorImageAlt(index, serviceMeta.slug, operator?.code, index);
                event.currentTarget.src = alt || localOperatorImage(index, serviceMeta.slug, operator?.code, index);
              }}
            />
          </figure>
        ))}
      </div>
    );
  }

  function renderAbout() {
    return (
      <div className={styles.aboutGrid}>
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Các tùy chọn dịch vụ</h2>
          <div className={styles.checkList}>{serviceOptions.map(item => <span key={item}><PremiumIcon name="check" /> {item}</span>)}</div>
        </div>
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Tiện nghi</h2>
          <div className={styles.checkList}>{amenities.map(item => <span key={item}><PremiumIcon name="check" /> {item}</span>)}</div>
        </div>
      </div>
    );
  }

  function renderWrite() {
    return (
      <div className={styles.writePanel}>
        <div className={styles.writeIntro}>
          <div className={styles.writeIntroIcon}><PremiumIcon name="review" /></div>
          <div>
            <h2 className={styles.sectionTitle}>Viết bài đánh giá</h2>
            <p className={styles.sectionDescription}>Chia sẻ trải nghiệm thực tế của bạn. Đánh giá sẽ được gửi vào hàng chờ admin và chỉ hiển thị sau khi được duyệt.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.submitForm}>
          <div className={styles.formGrid}>
            <label>
              <span>Tên người đánh giá</span>
              <input value={form.reviewerName} onChange={event => setForm(prev => ({ ...prev, reviewerName: event.target.value }))} placeholder="Ví dụ: Nguyễn Văn A" />
            </label>

            <label>
              <span>Số sao</span>
              <select value={form.rating} onChange={event => setForm(prev => ({ ...prev, rating: event.target.value }))}>
                <option value="5">5 sao - Rất tốt</option>
                <option value="4">4 sao - Tốt</option>
                <option value="3">3 sao - Bình thường</option>
                <option value="2">2 sao - Chưa tốt</option>
                <option value="1">1 sao - Rất kém</option>
              </select>
            </label>
          </div>

          <label>
            <span>Nội dung đánh giá</span>
            <textarea value={form.comment} onChange={event => setForm(prev => ({ ...prev, comment: event.target.value }))} placeholder={`Chia sẻ trải nghiệm của bạn về ${serviceMeta.itemLabel} này...`} rows={7} />
          </label>

          <div className={styles.reviewImageUploadBlock}>
            <span className={styles.uploadLabel}>Ảnh đánh giá</span>

            <label className={styles.reviewImageUploadBox}>
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleReviewImageChange} />

              {reviewImagePreview ? (
                <div className={styles.reviewImageUploadPreview}>
                  <img src={reviewImagePreview} alt="Ảnh đánh giá đã chọn" />
                  <div>
                    <strong>{reviewImageFile?.name || 'Ảnh đã chọn'}</strong>
                    <small>Ảnh sẽ được convert sang .webp và lưu theo mã review.</small>
                  </div>
                </div>
              ) : (
                <div className={styles.reviewImageUploadEmpty}>
                  <span><PremiumIcon name="image" /></span>
                  <div>
                    <strong>Chọn ảnh kèm đánh giá</strong>
                    <small>JPG, PNG, WEBP · tối đa 8MB · chỉ 1 ảnh</small>
                  </div>
                </div>
              )}
            </label>

            {reviewImagePreview && (
              <button type="button" className={styles.removeReviewImageButton} onClick={removeReviewImage}>
                Xóa ảnh đã chọn
              </button>
            )}
          </div>

          <button type="submit" disabled={submitState === 'submitting'} className={styles.submitButton}>
            <PremiumIcon name="send" />
            {submitState === 'submitting' ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>

          {message && <p className={`${styles.submitMessage} ${styles[submitState] || ''}`}>{message}</p>}
        </form>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.heroSection}>
          <div className={styles.heroBanner}>
            <OperatorImage
              src={heroCover}
              alt={operator?.name || serviceMeta.defaultName}
              fallback={localOperatorBackgroundImage(safeCoverIndex, serviceMeta.slug, operator?.code, 2)}
              fallbackAlt={localOperatorBackgroundImageAlt(safeCoverIndex, serviceMeta.slug, operator?.code, 2)}
              className={styles.heroBackground}
            />
            <div className={styles.heroOverlay} />

            <div className={styles.heroContent}>
              <div className={styles.brandCard}>
                <img
                  src={heroLogo}
                  alt={operator?.name || serviceMeta.defaultName}
                  onError={(event) => {
                    const alt = localOperatorImageAlt(safeCoverIndex, serviceMeta.slug, operator?.code, 0);
                    event.currentTarget.src = alt || localOperatorImage(safeCoverIndex, serviceMeta.slug, operator?.code, 0);
                  }}
                />
              </div>

              <div className={styles.heroCopy}>
                <div className={styles.titleRow}>
                  <h1>{operator?.name || serviceMeta.defaultName}</h1>
                  <span className={styles.verifiedBadge}><PremiumIcon name="verified" /></span>
                </div>
                <p>{operator?.type || serviceMeta.defaultType}</p>
                <div className={styles.heroMetaRow}>
                  <span><PremiumIcon name="location" /> {operator?.region || 'TP. Hồ Chí Minh, Việt Nam'}</span>
                  <span><PremiumIcon name="website" /> {operator?.website || 'www.reviewhub.vn'}</span>
                </div>
              </div>

              <button type="button" className={styles.reviewHeroButton} onClick={() => setActiveTab('write')}>
                <PremiumIcon name="review" />
                Viết đánh giá
              </button>
            </div>
          </div>

          <div className={styles.statsRibbon}>
            <div className={styles.metricBlock}>
              <div className={styles.scoreBig}>{stats.avg ? stats.avg.toFixed(1).replace('.', ',') : '0,0'}</div>
              <div className={styles.scoreStars}>{makeStars(stats.avg)}</div>
              <div className={styles.scoreLabel}>{reputation(stats.avg)}</div>
              <div className={styles.scoreCount}>{stats.total.toLocaleString('vi-VN')} bài đánh giá</div>
            </div>

            <div className={styles.metricBlock}>
              <h3>Phân bố đánh giá</h3>
              <div className={styles.distributionList}>
                {stats.breakdown.map(item => (
                  <div className={styles.distributionRow} key={item.star}>
                    <span>{item.star}</span>
                    <PremiumIcon name="star" />
                    <div className={styles.distributionTrack}><i style={{ width: `${item.percent}%` }} /></div>
                    <strong>{Math.round(item.percent)}%</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.metricBlock}>
              <h3>Mức độ hài lòng</h3>
              <div className={styles.sentimentGrid}>
                <div className={`${styles.sentimentCard} ${styles.positive}`}>
                  <div className={styles.sentimentIcon}><SentimentFace mood="positive" /></div>
                  <div className={styles.sentimentText}>
                    <span>Tích cực</span>
                    <strong>{sentiment.positivePercent}%</strong>
                    <small>{sentiment.positive} đánh giá</small>
                  </div>
                </div>
                <div className={`${styles.sentimentCard} ${styles.neutral}`}>
                  <div className={styles.sentimentIcon}><SentimentFace mood="neutral" /></div>
                  <div className={styles.sentimentText}>
                    <span>Trung lập</span>
                    <strong>{sentiment.neutralPercent}%</strong>
                    <small>{sentiment.neutral} đánh giá</small>
                  </div>
                </div>
                <div className={`${styles.sentimentCard} ${styles.negative}`}>
                  <div className={styles.sentimentIcon}><SentimentFace mood="negative" /></div>
                  <div className={styles.sentimentText}>
                    <span>Tiêu cực</span>
                    <strong>{sentiment.negativePercent}%</strong>
                    <small>{sentiment.negative} đánh giá</small>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.metricBlock}>
              <div className={styles.totalReviewWrap}>
                <div className={styles.totalReviewIcon}><PremiumIcon name="comment2" /></div>
                <div>
                  <div className={styles.totalReviewValue}>{stats.total.toLocaleString('vi-VN')}</div>
                  <div className={styles.totalReviewLabel}>Tổng số đánh giá</div>
                  <div className={styles.totalReviewDate}>Cập nhật mới nhất {formatDateParts(reviews[0]?.createdAt || new Date()).date}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.contentShell}>
          <aside className={styles.sidebar}>
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Thông tin nhanh</h3>
              <div className={styles.quickList}>
                <div className={styles.quickItem}><span><PremiumIcon name="briefcase" /> Loại hình</span><strong>{operator?.type || serviceMeta.defaultType}</strong></div>
                <div className={styles.quickItem}><span><PremiumIcon name="calendar" /> Thành lập</span><strong>{firstText(operator?.foundedYear, operator?.establishedYear, '2001')}</strong></div>
                <div className={styles.quickItem}><span><PremiumIcon name="location" /> Trụ sở chính</span><strong>{operator?.region || 'TP. Hồ Chí Minh'}</strong></div>
                <div className={styles.quickItem}><span><PremiumIcon name="website" /> Website</span><strong>{operator?.website || 'reviewhub.vn'}</strong></div>
                <div className={styles.quickItem}><span><PremiumIcon name="phone" /> Tổng đài</span><strong>{operator?.phone || '1900 6067'}</strong></div>
              </div>
            </div>

            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Vị trí</h3>
              <a
                className={styles.miniMap}
                href={`https://www.google.com/maps/search/${encodeURIComponent(operator?.address || operator?.name || decodedCode || serviceMeta.itemLabel)}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className={styles.miniMapRoadA} />
                <span className={styles.miniMapRoadB} />
                <span className={styles.miniMapRoadC} />
                <span className={styles.miniMapPin}><PremiumIcon name="location" /></span>
                <span className={styles.miniMapButton}>Xem trên Google Maps</span>
              </a>
              <p className={styles.sideAddress}>{operator?.address || operator?.region || serviceMeta.defaultLocation}</p>
            </div>

            <div className={styles.darkStats}>
              <h3 className={styles.darkStatsHeader}>Thống kê nhanh</h3>
              <div className={styles.darkStatsGrid}>
                <div className={styles.darkStatItem}>
                  <div className={styles.darkStatIcon}><PremiumIcon name="comment2" /></div>
                  <strong>{stats.total.toLocaleString('vi-VN')}</strong>
                  <span>Tổng đánh giá</span>
                </div>
                <div className={styles.darkStatItem}>
                  <div className={styles.darkStatIcon}><PremiumIcon name="user" /></div>
                  <strong>{stats.positive.toLocaleString('vi-VN')}</strong>
                  <span>Lượt quan tâm</span>
                </div>
                <div className={styles.darkStatItem}>
                  <div className={styles.darkStatIcon}><PremiumIcon name="share" /></div>
                  <strong>{Math.max(1, Math.round(stats.total * 0.75)).toLocaleString('vi-VN')}</strong>
                  <span>Lượt theo dõi</span>
                </div>
              </div>
            </div>
          </aside>

          <section className={styles.mainPanel}>
            <div className={styles.panelTabs}>
              <button type="button" className={activeTab === 'overview' ? styles.panelTabActive : styles.panelTab} onClick={() => setActiveTab('overview')}>Tổng quan</button>
              <button type="button" className={activeTab === 'reviews' ? styles.panelTabActive : styles.panelTab} onClick={() => setActiveTab('reviews')}>Đánh giá</button>
              <button type="button" className={activeTab === 'gallery' ? styles.panelTabActive : styles.panelTab} onClick={() => setActiveTab('gallery')}>Hình ảnh</button>
              <button type="button" className={activeTab === 'about' ? styles.panelTabActive : styles.panelTab} onClick={() => setActiveTab('about')}>Giới thiệu</button>
            </div>

            {activeTab === 'reviews' && (
              <>
                <div className={styles.filterToolbar}>
                  <div className={styles.searchBox}>
                    <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm kiếm đánh giá..." />
                    <span className={styles.searchIcon}><PremiumIcon name="search" /></span>
                  </div>

                  <div className={styles.filterGroup}>
                    <label>Sắp xếp</label>
                    <select className={styles.filterSelect} value={sortMode} onChange={event => setSortMode(event.target.value)}>
                      <option value="newest">Mới nhất</option>
                      <option value="highest">Điểm cao nhất</option>
                      <option value="lowest">Điểm thấp nhất</option>
                    </select>
                  </div>

                  <div className={styles.filterGroup}>
                    <label>Lọc theo sao</label>
                    <select className={styles.filterSelect} value={ratingFilter} onChange={event => setRatingFilter(event.target.value)}>
                      <option value="all">Tất cả</option>
                      <option value="5">5 sao</option>
                      <option value="4">4 sao</option>
                      <option value="3">3 sao</option>
                      <option value="2">2 sao</option>
                      <option value="1">1 sao</option>
                    </select>
                  </div>

                  <button type="button" className={styles.advancedButton}><PremiumIcon name="funnel" /> Bộ lọc nâng cao</button>
                </div>

                {reviewsLoading && !paginatedReviews.length ? null : paginatedReviews.length ? (
                  <div className={styles.reviewStream}>
                    {paginatedReviews.map((review, index) => {
                      const status = statusInfo(review);
                      const dateInfo = formatDateParts(review.createdAt);
                      const imageBase = (safePage - 1) * REVIEWS_PER_PAGE + index;
                      const imageSequenceIndex = reviewOldestIndexById.get(String(review.id)) || (imageBase + 1);
                      const interaction = getReviewInteraction(review.id, index);
                      return (
                        <article key={review.id} className={styles.reviewCard}>
                          <div className={styles.reviewHeader}>
                            <div className={styles.reviewIdentity}>
                              <div className={styles.reviewAvatar}>{makeInitials(review.reviewerName)}</div>
                              <div className={styles.reviewMeta}>
                                <div className={styles.reviewName}>{review.reviewerName}</div>
                                <div className={styles.reviewSource}>{sourceLabel(review.sourceSystem)}</div>
                                <div className={styles.reviewTime}>{dateInfo.date} · {dateInfo.time}</div>
                              </div>
                            </div>

                            <div className={styles.reviewMain}>
                              <div className={styles.reviewScoreRow}>
                                <span className={styles.reviewStars}>{makeStars(review.rating)}</span>
                                <span className={`${styles.reviewStatus} ${styles[status.className]}`}>{status.label}</span>
                              </div>
                              <p className={styles.reviewText}>{review.comment}</p>

                              <ReviewImageGallery
                                review={review}
                                operator={operator}
                                serviceMeta={serviceMeta}
                                sequentialIndex={imageSequenceIndex}
                              />

                              <div className={styles.reviewFooter}>
                                <button
                                  type="button"
                                  className={`${styles.reviewAction} ${interaction.liked ? styles.reviewActionActive : ''}`}
                                  onClick={() => toggleReviewLike(review.id)}
                                >
                                  <PremiumIcon name="thumbs" /> Hữu ích ({interaction.helpfulCount})
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.reviewAction} ${interaction.showCommentBox ? styles.reviewActionActive : ''}`}
                                  onClick={() => toggleReviewCommentBox(review.id)}
                                >
                                  <PremiumIcon name="review" /> Bình luận ({interaction.commentCount})
                                </button>
                                <button type="button" className={styles.reviewAction}><PremiumIcon name="share" /> Chia sẻ</button>
                              </div>

                              {(interaction.showCommentBox || interaction.comments.length > 0) && (
                                <div className={styles.inlineComments}>
                                  {interaction.comments.length > 0 && (
                                    <div className={styles.inlineCommentList}>
                                      {interaction.comments.map(comment => {
                                        const commentDate = formatDateParts(comment.createdAt);
                                        return (
                                          <div className={styles.inlineCommentItem} key={comment.id}>
                                            <div className={styles.inlineCommentAvatar}>{makeInitials(comment.author)}</div>
                                            <div className={styles.inlineCommentBubble}>
                                              <div className={styles.inlineCommentMeta}>
                                                <strong>{comment.author}</strong>
                                                <span>{commentDate.date} · {commentDate.time}</span>
                                              </div>
                                              <p>{comment.text}</p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {interaction.showCommentBox && (
                                    <div className={styles.inlineCommentForm}>
                                      <input
                                        value={interaction.commentDraft}
                                        onChange={event => updateReviewCommentDraft(review.id, event.target.value)}
                                        onKeyDown={event => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault();
                                            submitReviewComment(review.id);
                                          }
                                        }}
                                        placeholder="Viết bình luận..."
                                      />
                                      <button type="button" onClick={() => submitReviewComment(review.id)}>Gửi</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <button type="button" className={styles.reviewMenu} aria-label="Tùy chọn"><PremiumIcon name="dots" /></button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>{serviceMeta.itemLabelTitle} này chưa có đánh giá phù hợp.</div>
                )}

                {filteredReviews.length > REVIEWS_PER_PAGE && (
                  <div className={styles.pagination}>
                    <button type="button" className={styles.paginationButton} disabled={safePage === 1} onClick={() => setReviewPage(prev => Math.max(1, prev - 1))}>Trước</button>
                    {safePage > 3 && <button type="button" className={styles.paginationNumber} onClick={() => setReviewPage(1)}>1</button>}
                    {safePage > 4 && <span className={styles.paginationEllipsis}>...</span>}
                    {pageNumbers.map(page => (
                      <button
                        type="button"
                        key={page}
                        className={page === safePage ? styles.activePage : styles.paginationNumber}
                        onClick={() => setReviewPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    {safePage < totalPages - 3 && <span className={styles.paginationEllipsis}>...</span>}
                    {safePage < totalPages - 2 && <button type="button" className={styles.paginationNumber} onClick={() => setReviewPage(totalPages)}>{totalPages}</button>}
                    <button type="button" className={styles.paginationButton} disabled={safePage === totalPages} onClick={() => setReviewPage(prev => Math.min(totalPages, prev + 1))}>Sau</button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'gallery' && renderGallery()}
            {activeTab === 'about' && renderAbout()}
            {activeTab === 'write' && renderWrite()}
          </section>
        </div>

        <div className={styles.backLinkRow}>
          <Link to={`/dich-vu/${slug}`} className={styles.backLink}><PremiumIcon name="back" /> Quay lại danh sách</Link>
          <span className={styles.updatedText}>Đồng bộ gần nhất: {latestUpdated}</span>
        </div>
      </div>
    </main>
  );
}
