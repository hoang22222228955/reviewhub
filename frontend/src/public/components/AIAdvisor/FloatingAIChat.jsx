import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./FloatingAIChat.module.css";
import {
  buildTrainingContext,
  findTrainingAnswer,
  parseTrainingCommand,
  rememberUnansweredQuestion,
} from "./FloatingAITrainingData";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "https://reviewhub-backend-ki8w.onrender.com";

const CATEGORIES = [
  { key: "nhaxe", label: "Top nhÃ  xe uy tín", short: "NhÃ  xe" },
  { key: "khachsan", label: "Top khách sạn uy tín", short: "Khách sạn" },
  { key: "maybay", label: "Top máy bay uy tín", short: "Máy bay" },
  { key: "tour", label: "Top tour uy tín", short: "Tour" },
  { key: "dichvu", label: "Top dịch vụ khác uy tín", short: "Dịch vụ khác" },
];

const TOP_SOURCE_CONFIG = {
  nhaxe: {
    prefix: "PT-",
    typeLabel: "Nhà xe",
    operatorEndpoints: [
      "/api/operators",
      "/api/public/operators",
      "/api/transport-operators",
      "/api/public/transport-operators",
    ],
  },
  khachsan: {
    prefix: "KS-",
    typeLabel: "Khách sạn",
    operatorEndpoints: [
      "/api/operators",
      "/api/public/operators",
      "/api/transport-operators",
      "/api/public/transport-operators",
    ],
  },
  maybay: {
    prefix: "MB-",
    typeLabel: "Máy bay",
    operatorEndpoints: [
      "/api/public/airlines",
      "/api/airlines",
      "/api/operators",
      "/api/public/operators",
    ],
  },
  tour: {
    prefix: "TO-",
    typeLabel: "Tour",
    operatorEndpoints: [
      "/api/public/tours",
      "/api/tours",
      "/api/operators",
      "/api/public/operators",
    ],
  },
  dichvu: {
    prefix: "DV-",
    typeLabel: "Dịch vụ",
    operatorEndpoints: [
      "/api/public/services",
      "/api/services",
      "/api/operators",
      "/api/public/operators",
    ],
  },
};

const TOP_REVIEW_ENDPOINTS = [
  "/api/admin/reviews?size=10000",
  "/api/admin/review-ai/all",
  "/api/reviews?size=10000",
  "/api/public/reviews?size=10000",
  "/api/reviews",
  "/api/public/reviews",
  "/api/admin/review-ai/pending",
];

const LOCAL_REVIEW_KEY = "reviewhub-public-service-reviews";

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random()}`;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isThanksOrClose(value) {
  const text = normalizeText(value);
  if (!text) return false;

  const exactTexts = [
    "on",
    "cam",
    "cam on",
    "cam on ban",
    "cam on nhe",
    "cam on ban nhe",
    "cam on a",
    "cam on anh",
    "cam on chi",
    "cam on ad",
    "thanks",
    "thank you",
    "ok",
    "oke",
    "oki",
    "duoc roi",
    "xong",
    "xong roi",
    "tam biet",
    "bye",
  ];

  return exactTexts.includes(text) || /^(cam on|thanks|thank you|ok|oke|oki|duoc roi|xong roi|tam biet|bye)(\s|$)/.test(text);
}

function isGreeting(value) {
  const text = normalizeText(value);
  if (!text) return false;

  return [
    "xin chao",
    "chao",
    "hello",
    "hi",
    "alo",
  ].some((item) => text === item || text.startsWith(item + " "));
}

function looksLikeServiceQuery(value) {
  const text = normalizeText(value);
  if (!text) return false;
  if (isThanksOrClose(text) || isGreeting(text)) return false;

  if (/^(pt|ks|mb|to|dv|bus|hotel)[-\s]?\d+/i.test(text)) return true;

  const serviceWords = [
    "nha xe",
    "xe ",
    "khach san",
    "hotel",
    "tour",
    "may bay",
    "hang bay",
    "tau hoa",
    "sao viet",
    "nhu vinh",
    "an vui",
    "phuong trang",
    "futa",
    "flc",
  ];

  if (serviceWords.some((word) => text.includes(word))) return true;

  const genericPhrases = [
    "nhan tin",
    "hoi gi do",
    "hoi gi",
    "test",
    "thu xem",
    "ban la ai",
    "lam duoc gi",
    "giup toi",
    "tu van cho toi",
  ];

  if (genericPhrases.some((word) => text.includes(word))) return false;

  const tokens = text.split(/\s+/).filter((token) => token.length >= 3);
  const stopWords = new Set([
    "toi", "ban", "minh", "can", "muon", "hoi", "xem", "cho", "giup", "nhe", "nha", "mot", "cai", "nay", "kia", "gi", "do"
  ]);
  const usefulTokens = tokens.filter((token) => !stopWords.has(token));

  // Chỉ cho tìm tên riêng ngắn khi câu rất ngắn, tránh câu xã giao/chung chung bị nhảy sang nhà xe.
  return usefulTokens.length > 0 && usefulTokens.length <= 3 && text.length <= 32;
}

function percent(part, total) {
  const p = Number(part || 0);
  const t = Number(total || 0);

  if (!t) return "0%";

  return `${((p / t) * 100).toFixed(1).replace(".", ",")}%`;
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function getStoredAuthToken() {
  if (typeof window === "undefined") return "";

  const keys = [
    "token",
    "accessToken",
    "authToken",
    "jwt",
    "reviewhub_token",
    "reviewhub-access-token",
  ];

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }

  return "";
}

function authHeaders() {
  const token = getStoredAuthToken();
  return token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {};
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

function topNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function topRound1(value) {
  return Math.round(topNumber(value) * 10) / 10;
}

function firstText(...values) {
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item).trim() !== ""
  );

  return value === undefined ? "" : String(value).trim();
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isApprovedTopReview(review) {
  const status = normalizeStatus(review?.moderationStatus || review?.status || review?.reviewStatus);
  const visibility = normalizeStatus(review?.visibility);

  if (!status && !visibility) return true;

  return (
    [
      "approved",
      "approve",
      "published",
      "active",
      "success",
      "pending_review",
      "pending",
      "hidden",
    ].includes(status) ||
    visibility === "hidden" ||
    visibility === "public"
  );
}

function getTopCode(item, fallback = "") {
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
    fallback
  );
}

function getTopName(item, fallback = "") {
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
    fallback
  );
}

function displayScore(avgRating) {
  const rating = topNumber(avgRating);
  return rating <= 5 ? rating * 2 : rating;
}

function normalizeTopOperator(item, index, config) {
  const embeddedReviews = Array.isArray(item?.reviews)
    ? item.reviews.filter(isApprovedTopReview)
    : [];

  const embeddedTotal = embeddedReviews.length;
  const embeddedSum = embeddedReviews.reduce(
    (sum, review) => sum + topNumber(review.rating || review.score || review.stars),
    0
  );

  const code = getTopCode(item, `${config.prefix}${String(index + 1).padStart(3, "0")}`);
  const name = getTopName(item, `${config.typeLabel} ${index + 1}`);

  return {
    raw: item,
    code,
    name,
    category: config.typeLabel,
    avgRating: topNumber(
      firstText(
        item?.avgRating,
        item?.averageRating,
        item?.overallRating,
        item?.ratingAvg,
        item?.ratingAverage,
        item?.rating,
        embeddedTotal ? embeddedSum / embeddedTotal : 0
      ),
      0
    ),
    totalReviews: topNumber(
      firstText(
        item?.totalReviews,
        item?.reviewCount,
        item?.total_reviews,
        item?.reviewsCount,
        item?.totalReview,
        embeddedTotal
      ),
      0
    ),
  };
}

function normalizeTopReview(review, index) {
  const code = getTopCode(review, `REVIEW-${index + 1}`);
  const name = getTopName(review);

  return {
    ...review,
    code,
    name,
    rating: topNumber(
      firstText(review?.rating, review?.score, review?.stars, review?.avgRating, review?.averageRating),
      0
    ),
    count: topNumber(
      firstText(review?.totalReviews, review?.reviewCount, review?.total_reviews, review?.count, review?.total),
      1
    ),
  };
}

function buildTopReviewMaps(reviews) {
  const byCode = new Map();
  const byName = new Map();

  reviews
    .filter(isApprovedTopReview)
    .map(normalizeTopReview)
    .forEach((review) => {
      if (!review.rating) return;

      const count = Math.max(review.count, 1);
      const update = (map, key) => {
        if (!key) return;
        const current = map.get(key) || { count: 0, sum: 0 };
        current.count += count;
        current.sum += review.rating * count;
        map.set(key, current);
      };

      update(byCode, review.code);
      update(byName, normalizeSearchText(review.name));
    });

  return { byCode, byName };
}

function mergeTopReviews(operators, reviews) {
  const { byCode, byName } = buildTopReviewMaps(reviews);
  if (!byCode.size && !byName.size) return operators;

  return operators.map((operator) => {
    const stat =
      byCode.get(operator.code) ||
      byName.get(normalizeSearchText(operator.name));

    if (!stat?.count) return operator;

    // Quan trọng: phải giống ServiceCategoryPage.
    // Khi review API có dữ liệu thật theo code/tên thì dùng số review thật đó,
    // không giữ totalReviews từ operator nếu operator đang là số demo/ảo.
    return {
      ...operator,
      totalReviews: stat.count,
      avgRating: stat.sum / stat.count,
      hasReviewData: true,
    };
  });
}

function readLocalTopReviews() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_REVIEW_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uniqueByReviewId(list = []) {
  const seen = new Set();

  return list.filter((item, index) => {
    const id = firstText(
      item?.id,
      item?.reviewId,
      item?.review_id,
      `${getTopCode(item)}-${getTopName(item)}-${item?.comment || item?.content || index}`
    );

    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function readFirstTopList(endpoints = []) {
  let lastError = "";

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(apiUrl(endpoint), {
        headers: {
          Accept: "application/json",
          ...authHeaders(),
        },
        credentials: "include",
      });

      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }

      const data = await res.json();
      const list = extractList(data);

      if (list.length) {
        return { endpoint, list };
      }
    } catch (err) {
      lastError = err?.message || endpoint;
    }
  }

  return { endpoint: "", list: [], error: lastError };
}

function toTopServiceItem(operator, config) {
  const averageRating = topRound1(operator.avgRating);
  const trustScore = topRound1(displayScore(operator.avgRating));
  const totalReviews = topNumber(operator.totalReviews);

  return {
    targetCode: operator.code,
    targetName: operator.name,
    category: config.typeLabel,
    label: `${operator.code} · ${config.typeLabel} ${operator.name}`,
    averageRating,
    trustDisplayScore: trustScore,
    totalReviews,
    goodReviews: 0,
    badReviews: 0,
    neutralReviews: 0,
    positiveRate: 0,
    source: "service-category-logic",
  };
}

function sortTopServicesLikeCategoryPage(items = []) {
  return [...items].sort((a, b) => {
    const scoreA = displayScore(a.averageRating);
    const scoreB = displayScore(b.averageRating);

    return (
      topNumber(b.totalReviews) - topNumber(a.totalReviews) ||
      scoreB - scoreA ||
      String(a.targetName || a.label || "").localeCompare(String(b.targetName || b.label || ""), "vi")
    );
  });
}

async function loadTopByCategoryPageLogic(category) {
  const config = TOP_SOURCE_CONFIG[category] || TOP_SOURCE_CONFIG.nhaxe;

  const [operatorResult, reviewResult] = await Promise.all([
    readFirstTopList(config.operatorEndpoints),
    readFirstTopList(TOP_REVIEW_ENDPOINTS),
  ]);

  const normalizedOperators = operatorResult.list
    .map((item, index) => normalizeTopOperator(item, index, config))
    .filter((item) => String(item.code || "").toUpperCase().startsWith(config.prefix));

  if (!normalizedOperators.length) return [];

  const reviewSourceList = uniqueByReviewId([
    ...readLocalTopReviews(),
    ...reviewResult.list,
  ]);

  const merged = mergeTopReviews(normalizedOperators, reviewSourceList);

  return sortTopServicesLikeCategoryPage(
    merged.map((operator) => toTopServiceItem(operator, config))
  );
}

function extractAIText(data) {
  if (typeof data === "string") return data;

  return (
    data?.reply ||
    data?.message ||
    data?.output?.[0]?.content?.[0]?.text ||
    data?.output_text ||
    data?.choices?.[0]?.message?.content ||
    JSON.stringify(data, null, 2)
  );
}

function welcomeMessage() {
  return {
    id: makeId(),
    role: "ai",
    kind: "menu",
    text:
      "Xin chÃ o! Tôi có thể tư vấn gói/bảng giá, đồng thời hỗ trợ bạn xem dịch vụ uy tín và tóm tắt review.",
  };
}


function parseSummaryTopic(item) {
  const raw = String(item || "").trim();
  const match = raw.match(/^(.*?)\s*\((\d+)\s*review\)\s*$/i);

  return {
    raw,
    label: match ? match[1].trim() : raw,
    count: match ? Number(match[2] || 0) : 0,
  };
}

function cleanSummaryLabel(label, lower = false) {
  const raw = String(label || "").trim();

  const mapped = {
    "Giá vé / chi phí": "Giá vé và chi phí",
    "Vệ sinh / sạch sẽ": "Vệ sinh sạch sẽ",
    "Không gian / tiện nghi": "Không gian, tiện nghi",
    "Giờ giấc / đúng giờ": "Giờ giấc đúng giờ",
    "Đặt chỗ / thủ tục": "Đặt chỗ và thủ tục",
    "Ăn uống / phục vụ kèm": "Ăn uống và dịch vụ kèm",
    "HÃ nh lý / đồ đạc": "HÃ nh lý và đồ đạc",
    "Tour / lịch trình": "Tour và lịch trình",
  };

  const text = mapped[raw] || raw.replace(/\s*\/\s*/g, " và ");
  return lower ? text.toLowerCase() : text;
}

function inferSummaryKind(data) {
  const category = normalizeText(data?.category || data?.label || data?.targetName || "");
  const code = String(data?.targetCode || "").toUpperCase();

  if (code.startsWith("PT-") || code.startsWith("BUS-") || category.includes("nha xe") || category.includes("bus")) return "bus";
  if (code.startsWith("KS-") || code.startsWith("HOTEL-") || category.includes("khach san") || category.includes("hotel")) return "hotel";
  if (code.startsWith("MB-") || code.startsWith("AIR-") || category.includes("may bay") || category.includes("hang bay") || category.includes("air")) return "air";
  if (code.startsWith("TH-") || code.startsWith("TRAIN-") || category.includes("tau hoa") || category.includes("train")) return "train";
  if (code.startsWith("TO-") || category.includes("tour")) return "tour";
  return "service";
}

function topicCountSuffix(count) {
  return count > 0 ? ` (${count} review)` : "";
}

function sameSummaryTopic(a, b) {
  return normalizeText(parseSummaryTopic(a).label) === normalizeText(parseSummaryTopic(b).label);
}

function topicSentence(topic, tone, kind) {
  const { label, count } = parseSummaryTopic(topic);
  const displayLabel = cleanSummaryLabel(label);
  const key = normalizeText(label);
  const suffix = topicCountSuffix(count);

  const textMap = {
    bus: {
      good: {
        "thai do phuc vu": "Nhân viên/tÃ i xế được khen hỗ trợ lịch sự, dễ trao đổi",
        "ve sinh sach se": "Xe hoặc khu vực sử dụng khá sạch, tạo cảm giác dễ chịu",
        "gia ve chi phi": "Một số khách thấy giá vé/chi phí ở mức chấp nhận được",
        "khong gian tien nghi": "Ghế/giường, máy lạnh hoặc tiện nghi được đánh giá ổn",
        "gio giac dung gio": "Có chuyến được ghi nhận chạy đúng hoặc gần đúng giờ",
        "an toan": "Một số khách cảm thấy chuyến đi khá an toÃ n",
        "don tra trung chuyen": "Điểm đón/trả hoặc trung chuyển được nhận xét thuận tiện",
        "dat cho thu tuc": "Đặt vé và xác nhận thông tin tương đối dễ theo dõi",
      },
      risk: {
        "thai do phuc vu": "Thái độ nhân viên/tÃ i xế còn bị phản ánh khi có phát sinh",
        "ve sinh sach se": "Cần kiểm tra mùi xe, ghế/giường và vệ sinh gần đây",
        "gia ve chi phi": "Nên hỏi rõ giá cuối, phụ phí và điều kiện hoàn/hủy",
        "khong gian tien nghi": "Cần kiểm tra loại xe, ghế, máy lạnh, ổ sạc hoặc wifi",
        "gio giac dung gio": "Dễ ảnh hưởng lịch trình nếu xe trễ giờ hoặc đổi giờ",
        "an toan": "Cần đọc kỹ phản ánh về chạy nhanh, vượt ẩu hoặc mất an tâm",
        "don tra trung chuyen": "Nên hỏi rõ điểm đón/trả để tránh chờ lâu hoặc đổi điểm",
        "dat cho thu tuc": "Nên lưu mã vé và xác nhận đặt chỗ trước khi lên xe",
      },
    },
    hotel: {
      good: {
        "thai do phuc vu": "Nhân viên/lễ tân được khen hỗ trợ lịch sự, dễ trao đổi",
        "ve sinh sach se": "Phòng hoặc khu vực chung được đánh giá sạch sẽ",
        "gia ve chi phi": "Giá phòng được xem là hợp lý so với tiện nghi nhận được",
        "khong gian tien nghi": "Phòng, giường, điều hòa hoặc view được nhắc tích cực",
        "an uong phuc vu kem": "Bữa sáng hoặc dịch vụ đi kèm được đánh giá ổn",
        "dat cho thu tuc": "Đặt phòng và check-in/check-out tương đối thuận tiện",
      },
      risk: {
        "thai do phuc vu": "Nên xem phản ánh về cách xử lý khiếu nại của nhân viên",
        "ve sinh sach se": "Cần kiểm tra vệ sinh phòng, ga giường và nhÃ  vệ sinh",
        "gia ve chi phi": "Nên hỏi rõ phụ phí, tiền cọc và chính sách hủy phòng",
        "khong gian tien nghi": "Cần đối chiếu ảnh thật, cách âm, wifi và tiện nghi",
        "an uong phuc vu kem": "Nên xem review mới nếu bạn quan trọng bữa sáng/dịch vụ kèm",
        "dat cho thu tuc": "Nên lưu xác nhận đặt phòng và giờ nhận/trả phòng",
      },
    },
    air: {
      good: {
        "thai do phuc vu": "Nhân viên hỗ trợ hoặc hướng dẫn được đánh giá ổn",
        "gia ve chi phi": "Giá vé có thể hợp lý nếu đặt đúng thời điểm",
        "gio giac dung gio": "Một số chuyến được ghi nhận đúng giờ hoặc ít lệch giờ",
        "dat cho thu tuc": "Đặt vé/check-in được nhận xét khá dễ theo dõi",
        "hanh ly do dac": "Xử lý hÃ nh lý được một số khách đánh giá ổn",
        "khong gian tien nghi": "Ghế ngồi hoặc tiện nghi cơ bản được nhắc tích cực",
      },
      risk: {
        "thai do phuc vu": "Cần xem kỹ hỗ trợ khi đổi vé, hoÃ n vé hoặc phát sinh",
        "gia ve chi phi": "Nên kiểm tra phí hÃ nh lý, đổi vé và điều kiện hoÃ n vé",
        "gio giac dung gio": "Delay, đổi giờ hoặc hủy chuyến có thể ảnh hưởng lịch trình",
        "dat cho thu tuc": "Nên chuẩn bị mã đặt chỗ và kiểm tra quy định check-in",
        "hanh ly do dac": "Cần kiểm tra cân nặng/kích thước hÃ nh lý trước khi bay",
        "khong gian tien nghi": "Nên xem loại ghế và tiện nghi nếu bạn cần thoải mái",
      },
    },
    tour: {
      good: {
        "thai do phuc vu": "Hướng dẫn viên/nhân sự được khen nhiệt tình, dễ hỗ trợ",
        "gia ve chi phi": "Giá tour được xem là hợp lý so với lịch trình",
        "tour lich trinh": "Lịch trình tham quan được đánh giá dễ theo dõi",
        "an uong phuc vu kem": "Ăn uống hoặc dịch vụ kèm được một số khách đánh giá ổn",
        "dat cho thu tuc": "Đặt tour và xác nhận lịch tương đối rõ rÃ ng",
        "khong gian tien nghi": "Phương tiện hoặc nơi nghỉ trong tour được nhận xét ổn",
      },
      risk: {
        "thai do phuc vu": "Nên xem phản ánh về hướng dẫn viên và điều phối tour",
        "gia ve chi phi": "Cần hỏi rõ giá đã bao gồm gì và các khoản phụ thu",
        "tour lich trinh": "Nên kiểm tra lịch trình thực tế và thời gian ở từng điểm",
        "an uong phuc vu kem": "Nếu quan trọng bữa ăn, nên xem review mới về suất ăn",
        "dat cho thu tuc": "Nên lưu lịch trình, xác nhận tour và điều kiện hoàn/hủy",
        "khong gian tien nghi": "Cần hỏi rõ loại xe, nơi nghỉ và tiện nghi đi kèm",
      },
    },
    train: {
      good: {
        "thai do phuc vu": "Nhân viên hỗ trợ được một số khách đánh giá lịch sự",
        "gia ve chi phi": "Giá vé phù hợp nếu ưu tiên chi phí ổn định",
        "gio giac dung gio": "Lịch trình được ghi nhận khá đúng giờ trong một số chuyến",
        "ve sinh sach se": "Khoang ngồi/giường được khen sạch hơn kỳ vọng",
        "khong gian tien nghi": "Ghế/giường và tiện nghi cơ bản được đánh giá ổn",
      },
      risk: {
        "thai do phuc vu": "Nên xem phản ánh về hỗ trợ tại ga hoặc trên tÃ u",
        "gia ve chi phi": "Cần kiểm tra hạng vé, phí đổi/trả và hoÃ n vé",
        "gio giac dung gio": "Chậm chuyến có thể ảnh hưởng lịch nối chuyến",
        "ve sinh sach se": "Nên xem vệ sinh khoang tÃ u và nhÃ  vệ sinh gần đây",
        "khong gian tien nghi": "Nếu đi xa, nên kiểm tra ghế/giường và điều hòa",
      },
    },
    service: {
      good: {
        "thai do phuc vu": "Dịch vụ được khen về cách hỗ trợ và phản hồi khách",
        "gia ve chi phi": "Chi phí được đánh giá tương đối phù hợp",
        "ve sinh sach se": "Sự sạch sẽ hoặc chỉn chu được nhắc tích cực",
        "khong gian tien nghi": "Không gian hoặc tiện ích sử dụng được đánh giá ổn",
        "dat cho thu tuc": "Đặt lịch/xác nhận dịch vụ khá dễ theo dõi",
      },
      risk: {
        "thai do phuc vu": "Nên kiểm tra cách hỗ trợ khi có phát sinh",
        "gia ve chi phi": "Cần hỏi rõ giá cuối, phụ phí và điều kiện hoàn/hủy",
        "ve sinh sach se": "Nên xem review gần đây về mức độ sạch sẽ",
        "khong gian tien nghi": "Cần đối chiếu ảnh thật, mô tả và review mới",
        "dat cho thu tuc": "Nên lưu xác nhận đặt lịch và thông tin hỗ trợ",
      },
    },
  };

  const selected = textMap[kind] || textMap.service;
  const sentence = selected[tone]?.[key];

  if (sentence) return `${sentence}${suffix}`;

  return tone === "good"
    ? `Dịch vụ được khen ở nhóm ${displayLabel}, có thể xem là điểm cộng khi cân nhắc${suffix}`
    : `Cần theo dõi nhóm ${displayLabel} vì có thể ảnh hưởng trải nghiệm thực tế${suffix}`;
}

function fallbackTopicSentences(tone, kind, usedLabels = new Set()) {
  const fallbacks = {
    bus: {
      good: ["Thái độ phục vụ (0 review)", "Vệ sinh / sạch sẽ (0 review)", "Không gian / tiện nghi (0 review)", "Giờ giấc / đúng giờ (0 review)"],
      risk: ["Giờ giấc / đúng giờ (0 review)", "An toÃ n (0 review)", "Giá vé / chi phí (0 review)", "Vệ sinh / sạch sẽ (0 review)"],
    },
    hotel: {
      good: ["Vệ sinh / sạch sẽ (0 review)", "Thái độ phục vụ (0 review)", "Không gian / tiện nghi (0 review)", "Ăn uống / phục vụ kèm (0 review)"],
      risk: ["Vệ sinh / sạch sẽ (0 review)", "Không gian / tiện nghi (0 review)", "Giá vé / chi phí (0 review)", "Đặt chỗ / thủ tục (0 review)"],
    },
    air: {
      good: ["Giờ giấc / đúng giờ (0 review)", "Thái độ phục vụ (0 review)", "Đặt chỗ / thủ tục (0 review)", "HÃ nh lý / đồ đạc (0 review)"],
      risk: ["Giờ giấc / đúng giờ (0 review)", "HÃ nh lý / đồ đạc (0 review)", "Giá vé / chi phí (0 review)", "Đặt chỗ / thủ tục (0 review)"],
    },
    tour: {
      good: ["Tour / lịch trình (0 review)", "Thái độ phục vụ (0 review)", "Ăn uống / phục vụ kèm (0 review)", "Giá vé / chi phí (0 review)"],
      risk: ["Tour / lịch trình (0 review)", "Giá vé / chi phí (0 review)", "Thái độ phục vụ (0 review)", "Ăn uống / phục vụ kèm (0 review)"],
    },
    train: {
      good: ["Giờ giấc / đúng giờ (0 review)", "Vệ sinh / sạch sẽ (0 review)", "Không gian / tiện nghi (0 review)", "Thái độ phục vụ (0 review)"],
      risk: ["Giờ giấc / đúng giờ (0 review)", "Vệ sinh / sạch sẽ (0 review)", "Không gian / tiện nghi (0 review)", "Giá vé / chi phí (0 review)"],
    },
    service: {
      good: ["Thái độ phục vụ (0 review)", "Giá vé / chi phí (0 review)", "Đặt chỗ / thủ tục (0 review)", "Không gian / tiện nghi (0 review)"],
      risk: ["Thái độ phục vụ (0 review)", "Giá vé / chi phí (0 review)", "Đặt chỗ / thủ tục (0 review)", "Vệ sinh / sạch sẽ (0 review)"],
    },
  };

  return (fallbacks[kind]?.[tone] || fallbacks.service[tone])
    .filter((item) => !usedLabels.has(normalizeText(parseSummaryTopic(item).label)));
}

function buildSummaryBullets(items = [], tone, kind, oppositeItems = []) {
  const oppositeLabels = new Set(oppositeItems.map((item) => normalizeText(parseSummaryTopic(item).label)));
  const usedLabels = new Set();
  const result = [];

  for (const item of items) {
    const parsed = parseSummaryTopic(item);
    const labelKey = normalizeText(parsed.label);
    if (!labelKey || usedLabels.has(labelKey)) continue;

    let sentence = topicSentence(item, tone, kind);
    result.push(sentence);
    usedLabels.add(labelKey);

    if (result.length >= 4) break;
  }

  if (result.length < 4) {
    for (const fallback of fallbackTopicSentences(tone, kind, usedLabels)) {
      result.push(topicSentence(fallback, tone, kind).replace(" (0 review)", ""));
      usedLabels.add(normalizeText(parseSummaryTopic(fallback).label));
      if (result.length >= 4) break;
    }
  }

  return result.slice(0, 4);
}

function buildAdviceBullets(data, kind) {
  const total = Number(data?.totalReviews || 0);
  const good = Number(data?.goodReviews || 0);
  const bad = Number(data?.badReviews || 0);
  const badRate = total ? bad * 100 / total : 0;
  const topGood = parseSummaryTopic(data?.goodPoints?.[0]);
  const topBad = parseSummaryTopic(data?.badPoints?.[0]);
  const result = [];

  if (badRate >= 50) {
    result.push(`Tỷ lệ cần theo dõi rất cao (${percent(bad, total)}), chưa nên chọn vội nếu cần trải nghiệm ổn định.`);
  } else if (badRate >= 30) {
    result.push(`Có thể cân nhắc, nhưng nên đọc kỹ review gần đây vì phản ánh tiêu cực chiếm ${percent(bad, total)}.`);
  } else {
    result.push(`Có thể ưu tiên nếu nhu cầu khớp với điểm mạnh chính của dịch vụ.`);
  }

  if (kind === "bus") {
    result.push(topBad.label ? `Trước khi đặt vé, kiểm tra kỹ ${cleanSummaryLabel(topBad.label, true)}, giờ đón/trả và loại xe.` : "Trước khi đặt vé, hỏi rõ giờ đón/trả, loại xe và điểm trung chuyển.");
    result.push(topGood.label ? `Nếu vẫn chọn, hãy tận dụng điểm mạnh về ${cleanSummaryLabel(topGood.label, true)} nhưng xem review mới.` : "Nếu vẫn chọn, ưu tiên chuyến có thông tin rõ về xe, giờ chạy và điểm đón.");
    result.push("Nên so sánh thêm 1-2 nhÃ  xe cùng tuyến trước khi quyết định.");
  } else if (kind === "hotel") {
    result.push(topBad.label ? `Trước khi đặt phòng, kiểm tra kỹ ${cleanSummaryLabel(topBad.label, true)}, ảnh thật và phụ phí.` : "Trước khi đặt phòng, kiểm tra ảnh thật, vị trí, phụ phí và chính sách hủy.");
    result.push(topGood.label ? `Nếu ${cleanSummaryLabel(topGood.label, true)} đúng nhu cầu, có thể giữ là m phương án tham khảo.` : "Nếu vị trí, vệ sinh và tiện nghi phù hợp, có thể giữ là m phương án tham khảo.");
    result.push("Nên so sánh thêm khách sạn cùng khu vực có review mới ổn định.");
  } else if (kind === "air") {
    result.push(topBad.label ? `Trước khi mua vé, kiểm tra kỹ ${cleanSummaryLabel(topBad.label, true)}, hÃ nh lý và điều kiện đổi vé.` : "Trước khi mua vé, kiểm tra hÃ nh lý, đổi vé, hoÃ n vé và lịch bay gần đây.");
    result.push(topGood.label ? `Có thể tận dụng điểm mạnh về ${cleanSummaryLabel(topGood.label, true)}, nhưng cần phương án dự phòng nếu lịch gấp.` : "Nếu lịch trình gấp, nên chọn chuyến có hỗ trợ và giờ bay an toàn.");
    result.push("Nên so sánh thêm chuyến/hãng khác cùng khung giờ.");
  } else if (kind === "tour") {
    result.push(topBad.label ? `Trước khi đặt tour, hỏi rõ ${cleanSummaryLabel(topBad.label, true)}, phụ thu và dịch vụ đã bao gồm.` : "Trước khi đặt tour, hỏi rõ lịch trình, phụ thu và điều kiện hoàn/hủy.");
    result.push(topGood.label ? `Nếu ${cleanSummaryLabel(topGood.label, true)} phù hợp phong cách đi, có thể cân nhắc.` : "Nếu lịch trình và dịch vụ kèm phù hợp, có thể cân nhắc sau khi xem review mới.");
    result.push("Nên so sánh thêm tour cùng điểm đến trước khi đặt.");
  } else if (kind === "train") {
    result.push(topBad.label ? `Trước khi đặt vé, kiểm tra kỹ ${cleanSummaryLabel(topBad.label, true)}, hạng ghế và giờ chạy.` : "Trước khi đặt vé, kiểm tra hạng ghế/giường, giờ chạy và điều kiện đổi trả.");
    result.push(topGood.label ? `Có thể tận dụng điểm mạnh về ${cleanSummaryLabel(topGood.label, true)}, nhất là khi đi đường dài.` : "Nếu đi xa, ưu tiên chuyến có tiện nghi và giờ chạy phù hợp.");
    result.push("Nên so sánh thêm lựa chọn cùng tuyến để tránh rủi ro lịch trình.");
  } else {
    result.push(topBad.label ? `Trước khi dùng, kiểm tra kỹ ${cleanSummaryLabel(topBad.label, true)}, giá cuối và hỗ trợ phát sinh.` : "Trước khi dùng, hỏi rõ giá cuối, quy trình và hỗ trợ khi phát sinh.");
    result.push(topGood.label ? `Nếu ${cleanSummaryLabel(topGood.label, true)} đúng nhu cầu, có thể đưa và o danh sách cân nhắc.` : "Nếu dịch vụ đáp ứng đúng nhu cầu chính, có thể đưa và o danh sách cân nhắc.");
    result.push("Nên so sánh thêm 1-2 đơn vị khác có review mới rõ rÃ ng.");
  }

  return result.slice(0, 4);
}

function ServiceSummary({ data }) {
  if (!data) return null;

  const total = Number(data.totalReviews || 0);
  const good = Number(data.goodReviews || 0);
  const bad = Number(data.badReviews || 0);
  const neutral = Number(data.neutralReviews || 0);
  const kind = inferSummaryKind(data);
  const goodBullets = buildSummaryBullets(data.goodPoints || [], "good", kind, data.badPoints || []);
  const badBullets = buildSummaryBullets(data.badPoints || [], "risk", kind, data.goodPoints || []);
  const adviceBullets = buildAdviceBullets(data, kind);

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHead}>
        <span>AI tóm tắt review</span>
        <strong>{data.label || data.targetName}</strong>
      </div>

      <div className={styles.summaryStats}>
        <div>
          <span>Tổng</span>
          <strong>{total}</strong>
          <small>review</small>
        </div>

        <div className={styles.goodStat}>
          <span>Tốt</span>
          <strong>{good}</strong>
          <small>{percent(good, total)}</small>
        </div>

        <div className={styles.badStat}>
          <span>Cần theo dõi</span>
          <strong>{bad}</strong>
          <small>{percent(bad, total)}</small>
        </div>

        <div>
          <span>Trung lập</span>
          <strong>{neutral}</strong>
          <small>{percent(neutral, total)}</small>
        </div>

        <div className={styles.scoreStat}>
          <span>Điểm TB</span>
          <strong>{data.averageRating}/5</strong>
          <small>trung bình</small>
        </div>
      </div>

      <div className={styles.summaryGroups}>
        <section>
          <h4>Điểm được khen</h4>
          <ul>{goodBullets.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section>
          <h4>Vấn đề cần theo dõi</h4>
          <ul>{badBullets.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section>
          <h4>Gợi ý cho bạn</h4>
          <ul>{adviceBullets.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}

function TopServices({ items, onSummary }) {
  const rankedItems = sortTopServicesLikeCategoryPage(items);

  if (!rankedItems.length) {
    return <div className={styles.emptyResult}>Chưa có dữ liệu đủ để xếp hạng nhóm nÃ y.</div>;
  }

  return (
    <div className={styles.rankingList}>
      {rankedItems.slice(0, 10).map((item, index) => (
        <article key={item.targetCode || `${item.targetName}-${index}`} className={styles.rankingItem}>
          <div className={styles.rankNo}>#{index + 1}</div>

          <div className={styles.rankingBody}>
            <strong>{item.label || item.targetName}</strong>
            <div className={styles.rankingMeta}>
              <span>â­ {item.averageRating}/5</span>
              <span>Uy tín {item.trustDisplayScore}/10</span>
              <span>{item.totalReviews} review</span>
            </div>
          </div>

          <button type="button" onClick={() => onSummary(item)}>
            Tóm tắt
          </button>
        </article>
      ))}
    </div>
  );
}

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("menu");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([welcomeMessage()]);
  const [loading, setLoading] = useState(false);
  const chatBodyRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollTimersRef = useRef([]);

  const headerText = useMemo(() => {
    if (mode === "package") return "AI tư vấn gói & bảng giá";
    if (mode === "top") return "Phân tích dịch vụ uy tín";
    if (mode === "summary") return "Phân tích tóm tắt review";
    if (mode === "compare") return "So sánh dịch vụ";
    if (mode === "need") return "Gợi ý theo nhu cầu";
    return "BLU Review AI";
  }, [mode]);

  function clearScrollTimers() {
    scrollTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    scrollTimersRef.current = [];
  }

  function scrollBottom(behavior = "smooth") {
    if (typeof window === "undefined") return;

    clearScrollTimers();

    const run = () => {
      const body = chatBodyRef.current;

      if (body) {
        body.scrollTo({
          top: body.scrollHeight,
          behavior,
        });
      }

      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });
    };

    window.requestAnimationFrame(run);

    // Card/menu/top/tóm tắt có chiều cao thay đổi sau khi render,
    // nên cuộn thêm và i nhịp để luôn xuống đúng tin nhắn cuối.
    [40, 120, 260, 520].forEach((delay) => {
      const timerId = window.setTimeout(run, delay);
      scrollTimersRef.current.push(timerId);
    });
  }

  useEffect(() => {
    if (!open) return undefined;

    scrollBottom("smooth");

    return () => {
      clearScrollTimers();
    };
  }, [messages.length, loading, open]);

  function pushMessage(item) {
    setMessages((prev) => [...prev, { id: makeId(), ...item }]);
    scrollBottom("smooth");
  }

  function resetChat() {
    setMode("menu");
    setMessage("");
    setMessages([welcomeMessage()]);
  }

  async function fetchJson(path, options) {
    const res = await fetch(apiUrl(path), options);
    const raw = await res.text();
    let data = raw;

    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

    if (!res.ok) {
      throw new Error(data?.message || data?.error || data || `HTTP ${res.status}`);
    }

    return data;
  }

  async function askPackageAdvisor(text) {
    const trained = findTrainingAnswer(text, { minScore: 45 });

    if (trained) {
      pushMessage({
        role: "ai",
        text: trained.answer,
      });
      return;
    }

    setLoading(true);

    try {
      const trainingContext = buildTrainingContext(text);
      const finalMessage = trainingContext
        ? `${trainingContext}

Câu hỏi người dùng: ${text}`
        : text;

      const data = await fetchJson("/api/ai/advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: finalMessage }),
      });

      pushMessage({
        role: "ai",
        text: extractAIText(data),
      });
    } catch {
      rememberUnansweredQuestion(text, { mode: "package" });

      pushMessage({
        role: "ai",
        text:
          "Hiện AI tư vấn gói chưa kết nối được. Tôi đã ghi nhận câu hỏi này để admin bổ sung và o file huấn luyện sau.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadTop(category) {
    const picked = CATEGORIES.find((item) => item.key === category);

    setLoading(true);
    pushMessage({ role: "user", text: picked?.label || "Xem top dịch vụ uy tín" });

    try {
      let items = await loadTopByCategoryPageLogic(category);

      // Fallback: nếu không đọc được danh sách operator như ServiceCategoryPage
      // thì mới dùng API AI cũ. Trường hợp bình thường sẽ không dùng fallback nÃ y.
      if (!items.length) {
        const data = await fetchJson(
          `/api/public/ai/top-services?category=${encodeURIComponent(category)}&limit=10`
        );

        items = sortTopServicesLikeCategoryPage(
          (data.data || []).map((item) => ({
            ...item,
            trustDisplayScore: topRound1(displayScore(item.averageRating)),
          }))
        );
      }

      pushMessage({
        role: "ai",
        kind: "topServices",
        text: `Đây là top ${picked?.short || "dịch vụ"} theo đúng dữ liệu đang dùng ở trang xếp hạng:`,
        items,
      });
    } catch (err) {
      pushMessage({ role: "ai", text: `Không tải được bảng xếp hạng: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function searchService(query) {
    const data = await fetchJson(`/api/public/ai/search-service?q=${encodeURIComponent(query)}`);
    return data.matches || [];
  }

  async function loadSummary(service) {
    setLoading(true);

    try {
      const data = await fetchJson(
        `/api/public/ai/review-summary?targetCode=${encodeURIComponent(service.targetCode)}`
      );

      pushMessage({
        role: "ai",
        kind: "summary",
        text: `Đây là bản tóm tắt review của ${service.label || service.targetName}:`,
        data: data.data,
      });
    } catch (err) {
      pushMessage({
        role: "ai",
        text:
          `Không tóm tắt được review: ${err.message}. ` +
          "Phần xếp hạng vẫn dùng đúng điểm/tổng review từ trang bảng xếp hạng, nhưng dịch vụ này chưa có nội dung review công khai đủ để AI tóm tắt chi tiết.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSummaryQuery(text) {
    if (isThanksOrClose(text)) {
      pushMessage({
        role: "ai",
        text: "Vâng, không có gì ạ. Chúc bạn một ngày tốt là nh ạ ðŸ˜Š",
      });
      return;
    }

    if (isGreeting(text)) {
      pushMessage({
        role: "ai",
        text: "Chào bạn ạ ðŸ˜Š Bạn cần tôi tư vấn gói, xem dịch vụ uy tín hay tóm tắt review dịch vụ nÃ o không ạ?",
      });
      return;
    }

    if (!looksLikeServiceQuery(text)) {
      pushMessage({
        role: "ai",
        kind: "summaryHelp",
        text: "Bạn vui lòng nhập rõ tên dịch vụ cần xem review, ví dụ: Sao Việt, xe Sao Việt, FLC Hạ Long hoặc mã PT-013.",
      });
      return;
    }

    setLoading(true);

    try {
      const matches = await searchService(text);

      if (!matches.length) {
        rememberUnansweredQuestion(text, { mode: "summary" });
        pushMessage({
          role: "ai",
          text: "Tôi chưa tìm thấy dịch vụ phù hợp. Bạn thử nhập rõ hơn tên nhÃ  xe, khách sạn hoặc mã dịch vụ nhé.",
        });
        return;
      }

      const best = matches[0];

      pushMessage({
        role: "ai",
        kind: "confirmService",
        text: `Bạn cần hỏi về ${best.label} đúng không ạ?`,
        service: best,
        alternatives: matches.slice(1, 4),
      });
    } catch (err) {
      pushMessage({ role: "ai", text: `Không tìm được dịch vụ: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare(text) {
    const parts = text.split(",").map((item) => item.trim()).filter(Boolean);

    if (parts.length < 2) {
      pushMessage({
        role: "ai",
        text: "Bạn vui lòng nhập 2 dịch vụ, cách nhau bằng dấu phẩy. Ví dụ: Sao Việt, Như Vinh",
      });
      return;
    }

    setLoading(true);

    try {
      const firstMatches = await searchService(parts[0]);
      const secondMatches = await searchService(parts[1]);

      if (!firstMatches[0] || !secondMatches[0]) {
        pushMessage({
          role: "ai",
          text: "Tôi chưa tìm đủ 2 dịch vụ để so sánh. Bạn thử nhập rõ hơn tên dịch vụ nhé.",
        });
        return;
      }

      const [aRes, bRes] = await Promise.all([
        fetchJson(`/api/public/ai/review-summary?targetCode=${encodeURIComponent(firstMatches[0].targetCode)}`),
        fetchJson(`/api/public/ai/review-summary?targetCode=${encodeURIComponent(secondMatches[0].targetCode)}`),
      ]);

      pushMessage({
        role: "ai",
        kind: "compare",
        text: `So sánh nhanh ${aRes.data.label || aRes.data.targetName} và ${bRes.data.label || bRes.data.targetName}:`,
        data: [aRes.data, bRes.data],
      });
    } catch (err) {
      pushMessage({ role: "ai", text: `Không so sánh được: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  function chooseMain(action) {
    if (action === "package") {
      setMode("package");
      pushMessage({
        role: "ai",
        kind: "packageQuick",
        text:
          "Bạn muốn tôi tư vấn gói theo nhu cầu nào? Bạn có thể nhập quota/tháng, AI moderation, API key hoặc ngân sách dự kiến.",
      });
      return;
    }

    if (action === "top") {
      setMode("top");
      pushMessage({
        role: "ai",
        kind: "categoryMenu",
        text: "Bạn muốn xem top dịch vụ uy tín ở nhóm nÃ o?",
      });
      return;
    }

    if (action === "summary") {
      setMode("summary");
      pushMessage({
        role: "ai",
        text: "Bạn cần tham khảo review của dịch vụ nào ạ? Ví dụ: Sao Việt, xe Sao Việt, FLC Hạ Long...",
      });
      return;
    }

    if (action === "compare") {
      setMode("compare");
      pushMessage({
        role: "ai",
        text: "Bạn nhập 2 dịch vụ muốn so sánh, cách nhau bằng dấu phẩy. Ví dụ: Sao Việt, Như Vinh",
      });
      return;
    }

    if (action === "need") {
      setMode("need");
      pushMessage({
        role: "ai",
        kind: "needMenu",
        text: "Bạn đang cần gợi ý theo nhu cầu nào?",
      });
    }
  }

  async function sendMessage() {
    const text = message.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { id: makeId(), role: "user", text }]);
    setMessage("");

    const trainingCommand = parseTrainingCommand(text);
    if (trainingCommand) {
      pushMessage({
        role: "ai",
        text: trainingCommand.message,
      });
      return;
    }

    if (mode !== "summary" && mode !== "compare") {
      const trained = findTrainingAnswer(text, { minScore: 62 });
      if (trained) {
        pushMessage({
          role: "ai",
          text: trained.answer,
        });
        return;
      }
    }

    if (isThanksOrClose(text)) {
      pushMessage({
        role: "ai",
        text: "Vâng, không có gì ạ. Chúc bạn một ngày tốt là nh ạ ðŸ˜Š",
      });
      return;
    }

    if (isGreeting(text)) {
      pushMessage({
        role: "ai",
        text: "Chào bạn ạ ðŸ˜Š Bạn cần tôi tư vấn gói, xem dịch vụ uy tín hay tóm tắt review dịch vụ nÃ o không ạ?",
      });
      return;
    }

    if (mode === "package") {
      await askPackageAdvisor(text);
      return;
    }

    if (mode === "summary") {
      await handleSummaryQuery(text);
      return;
    }

    if (mode === "compare") {
      await handleCompare(text);
      return;
    }

    const normalized = normalizeText(text);

    if (
      normalized.includes("goi") ||
      normalized.includes("bang gia") ||
      normalized.includes("quota") ||
      normalized.includes("moderation") ||
      normalized.includes("api")
    ) {
      setMode("package");
      await askPackageAdvisor(text);
      return;
    }

    if (normalized.includes("top") || normalized.includes("uy tin")) {
      setMode("top");
      pushMessage({
        role: "ai",
        kind: "categoryMenu",
        text: "Bạn muốn xem top dịch vụ uy tín ở nhóm nÃ o?",
      });
      return;
    }

    if (looksLikeServiceQuery(text)) {
      setMode("summary");
      await handleSummaryQuery(text);
      return;
    }

    rememberUnansweredQuestion(text, { mode: "general" });
    pushMessage({
      role: "ai",
      text: "Tôi chưa hiểu rõ ý bạn. Bạn có thể bấm Menu để chọn mục hỗ trợ, hoặc nhập rõ hơn câu hỏi về gói, dịch vụ uy tín hay tóm tắt review nhé.",
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function quickPackage(text) {
    setMode("package");
    setMessage(text);
  }

  function renderOptionCard({ title, subtitle, items }) {
    return (
      <div className={styles.optionCard}>
        <div className={styles.optionIntro}>
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>

        <div className={styles.optionList}>
          {items.map((option) => (
            <button key={option.key} type="button" onClick={option.onClick}>
              <span className={styles.optionText}>
                <strong>{option.title}</strong>
                {option.desc && <small>{option.desc}</small>}
              </span>
              <i>›</i>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderActions(item) {
    if (item.kind === "menu") {
      const mainItems = [
        {
          key: "package",
          title: "AI tư vấn gói / bảng giá",
          desc: "Tư vấn gói, quota, API key và ngân sách",
        },
        {
          key: "top",
          title: "Phân tích dịch vụ uy tín",
          desc: "Xem top dịch vụ theo từng nhóm đánh giá",
        },
        {
          key: "summary",
          title: "Phân tích tóm tắt review",
          desc: "Tóm tắt ưu điểm, nhược điểm và lời khuyên",
        },
      ];

      const chipItems = [
        { key: "compare", label: "So sánh nhanh 2 dịch vụ" },
        { key: "need", label: "Gợi ý theo nhu cầu" },
      ];

      return (
        <div className={styles.menuCard}>
          <div className={styles.menuIntro}>
            <strong>AI hỗ trợ nhanh</strong>
            <span>Chọn một mục, AI sẽ gợi ý câu hỏi và trả lời ngay.</span>
          </div>

          <div className={styles.menuList}>
            {mainItems.map((menuItem) => (
              <button
                key={menuItem.key}
                type="button"
                onClick={() => chooseMain(menuItem.key)}
              >
                <span className={styles.menuText}>
                  <strong>{menuItem.title}</strong>
                  <small>{menuItem.desc}</small>
                </span>
                <i>›</i>
              </button>
            ))}
          </div>

          <div className={styles.menuMore}>
            <span>HỖ TRỢ THÊM</span>
            <div className={styles.menuChips}>
              {chipItems.map((chip) => (
                <button key={chip.key} type="button" onClick={() => chooseMain(chip.key)}>
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (item.kind === "packageQuick") {
      return renderOptionCard({
        title: "AI tư vấn gói / bảng giá",
        subtitle: "Chọn nhanh nhu cầu của bạn hoặc nhập trực tiếp ở ô chat.",
        items: [
          {
            key: "moderation",
            title: "Cần AI moderation",
            desc: "Tư vấn gói phù hợp cho kiểm duyệt review",
            onClick: () => quickPackage("Tôi cần AI moderation cho app review"),
          },
          {
            key: "request-20000",
            title: "20.000 request/tháng",
            desc: "Ước tính gói theo quota sử dụng mỗi tháng",
            onClick: () => quickPackage("Tôi cần khoảng 20000 request mỗi tháng"),
          },
          {
            key: "discount",
            title: "Hỏi ưu đãi",
            desc: "Tư vấn giảm giá khi mua nhiều hoặc dùng lâu dÃ i",
            onClick: () => quickPackage("Mua nhiều có được giảm giá không?"),
          },
          {
            key: "api-summary",
            title: "API key + AI tóm tắt review",
            desc: "Gói có API key và chức năng tóm tắt review",
            onClick: () => quickPackage("Tôi muốn gói có API key và AI tóm tắt review"),
          },
        ],
      });
    }

    if (item.kind === "categoryMenu") {
      return renderOptionCard({
        title: "Phân tích dịch vụ uy tín",
        subtitle: "Chọn nhóm dịch vụ muốn xem bảng xếp hạng.",
        items: CATEGORIES.map((category) => ({
          key: category.key,
          title: category.label,
          desc: `Xem danh sách ${category.short.toLowerCase()} được đánh giá tốt`,
          onClick: () => loadTop(category.key),
        })),
      });
    }

    if (item.kind === "needMenu") {
      return renderOptionCard({
        title: "Gợi ý theo nhu cầu",
        subtitle: "Chọn nhu cầu để AI gợi ý dịch vụ phù hợp.",
        items: [
          {
            key: "need-bus",
            title: "Tôi cần nhà xe được đánh giá cao",
            desc: "Ưu tiên nhÃ  xe có nhiều review tốt",
            onClick: () => loadTop("nhaxe"),
          },
          {
            key: "need-hotel",
            title: "Tôi cần khách sạn nhiều review tốt",
            desc: "Ưu tiên khách sạn có điểm đánh giá ổn định",
            onClick: () => loadTop("khachsan"),
          },
          {
            key: "need-tour",
            title: "Tôi cần tour uy tín",
            desc: "Xem nhóm tour được đánh giá tốt",
            onClick: () => loadTop("tour"),
          },
          {
            key: "need-specific",
            title: "Tôi muốn hỏi một dịch vụ cụ thể",
            desc: "Nhập tên hoặc mã dịch vụ để tóm tắt review",
            onClick: () => chooseMain("summary"),
          },
        ],
      });
    }

    if (item.kind === "summaryHelp") {
      return renderOptionCard({
        title: "Phân tích tóm tắt review",
        subtitle: "Chọn ví dụ nhanh hoặc nhập tên dịch vụ ở ô chat.",
        items: [
          {
            key: "summary-saoviet",
            title: "Nhà xe Sao Việt",
            desc: "Điền nhanh tên dịch vụ để tra cứu",
            onClick: () => setMessage("Sao Việt"),
          },
          {
            key: "summary-nhuvinh",
            title: "Nhà xe Như Vinh",
            desc: "Điền nhanh tên dịch vụ để tra cứu",
            onClick: () => setMessage("Như Vinh"),
          },
          {
            key: "summary-flc",
            title: "Khách sạn FLC Hạ Long",
            desc: "Điền nhanh tên dịch vụ để tra cứu",
            onClick: () => setMessage("FLC Hạ Long"),
          },
          {
            key: "summary-top",
            title: "Xem top dịch vụ uy tín",
            desc: "Chọn nhóm dịch vụ để xem xếp hạng",
            onClick: () => chooseMain("top"),
          },
        ],
      });
    }

    if (item.kind === "confirmService") {
      return (
        <div className={styles.confirmBox}>
          <button className={styles.primaryConfirm} onClick={() => loadSummary(item.service)}>
            Đúng, tóm tắt review
          </button>

          {item.alternatives?.length > 0 && (
            <div className={styles.altList}>
              <span>Hoặc chọn dịch vụ khác:</span>
              {item.alternatives.map((service) => (
                <button key={service.targetCode} onClick={() => loadSummary(service)}>
                  {service.label}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  function renderMessageContent(item) {
    if (item.kind === "topServices") {
      return <TopServices items={item.items} onSummary={loadSummary} />;
    }

    if (item.kind === "summary") {
      return <ServiceSummary data={item.data} />;
    }

    if (item.kind === "compare") {
      const [a, b] = item.data || [];

      return (
        <div className={styles.compareBox}>
          {[a, b].filter(Boolean).map((service) => (
            <article key={service.targetCode}>
              <strong>{service.label || service.targetName}</strong>
              <span>â­ {service.averageRating}/5</span>
              <span>{service.totalReviews} review</span>
              <span>Tốt: {percent(service.goodReviews, service.totalReviews)}</span>
              <span>Cần theo dõi: {percent(service.badReviews, service.totalReviews)}</span>
            </article>
          ))}
        </div>
      );
    }

    return null;
  }

  return (
    <>
      {!open && (
        <button className={styles.floatingButton} onClick={() => setOpen(true)}>
          <span className={styles.botIcon}>AI</span>
          <span className={styles.pulse}></span>
        </button>
      )}

      {open && (
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.avatar}>AI</div>
              <div>
                <h3>{headerText}</h3>
                <p>Tư vấn gói, bảng giá và chọn dịch vụ uy tín</p>
              </div>
            </div>

            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

          <div ref={chatBodyRef} className={styles.chatBody}>
            {messages.map((m) => {
              const isMenuMessage = ["menu", "packageQuick", "categoryMenu", "needMenu", "summaryHelp"].includes(m.kind) && m.role === "ai";

              return (
                <div
                  key={m.id}
                  className={`${styles.messageRow} ${
                    m.role === "user" ? styles.userRow : styles.aiRow
                  } ${isMenuMessage ? styles.menuMessageRow : ""}`}
                >
                  {m.role === "ai" && (
                    <div className={`${styles.smallAvatar} ${isMenuMessage ? styles.menuSmallAvatar : ""}`}>
                      AI
                    </div>
                  )}

                  <div
                    className={`${styles.bubble} ${
                      m.role === "user" ? styles.userBubble : styles.aiBubble
                    } ${isMenuMessage ? styles.menuBubble : ""}`}
                  >
                    {m.text && !isMenuMessage && <p>{m.text}</p>}
                    {renderActions(m)}
                    {renderMessageContent(m)}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className={`${styles.messageRow} ${styles.aiRow}`}>
                <div className={styles.smallAvatar}>AI</div>
                <div className={`${styles.bubble} ${styles.aiBubble}`}>
                  <div className={styles.typing}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className={styles.quickReplies}>
            <button onClick={() => chooseMain("package")}>Tư vấn gói</button>
            <button onClick={() => chooseMain("top")}>Dịch vụ uy tín</button>
            <button onClick={() => chooseMain("summary")}>Tóm tắt review</button>
          </div>

          <div className={styles.inputArea}>
            <button className={styles.menuBtn} onClick={resetChat}>
              Menu
            </button>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === "package"
                  ? "Nhập nhu cầu gói, quota hoặc ngân sách..."
                  : mode === "summary"
                    ? "Nhập tên dịch vụ, ví dụ: Sao Việt..."
                    : "Hỏi AI..."
              }
              rows={1}
            />

            <button onClick={sendMessage} disabled={loading || !message.trim()}>
              Gửi
            </button>
          </div>
        </div>
      )}
    </>
  );
}

