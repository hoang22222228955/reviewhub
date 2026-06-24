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
  { key: "nhaxe", label: "Top nhÃ  xe uy tÃ­n", short: "NhÃ  xe" },
  { key: "khachsan", label: "Top khÃ¡ch sáº¡n uy tÃ­n", short: "KhÃ¡ch sáº¡n" },
  { key: "maybay", label: "Top mÃ¡y bay uy tÃ­n", short: "MÃ¡y bay" },
  { key: "tour", label: "Top tour uy tÃ­n", short: "Tour" },
  { key: "dichvu", label: "Top dá»‹ch vá»¥ khÃ¡c uy tÃ­n", short: "Dá»‹ch vá»¥ khÃ¡c" },
];

const TOP_SOURCE_CONFIG = {
  nhaxe: {
    prefix: "PT-",
    typeLabel: "NhÃ  xe",
    operatorEndpoints: [
      "/api/operators",
      "/api/public/operators",
      "/api/transport-operators",
      "/api/public/transport-operators",
    ],
  },
  khachsan: {
    prefix: "KS-",
    typeLabel: "KhÃ¡ch sáº¡n",
    operatorEndpoints: [
      "/api/operators",
      "/api/public/operators",
      "/api/transport-operators",
      "/api/public/transport-operators",
    ],
  },
  maybay: {
    prefix: "MB-",
    typeLabel: "MÃ¡y bay",
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
    typeLabel: "Dá»‹ch vá»¥",
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
    .replace(/Ä‘/g, "d")
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

  // Chá»‰ cho tÃ¬m tÃªn riÃªng ngáº¯n khi cÃ¢u ráº¥t ngáº¯n, trÃ¡nh cÃ¢u xÃ£ giao/chung chung bá»‹ nháº£y sang nhÃ  xe.
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
    .replace(/Ä‘/g, "d")
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

    // Quan trá»ng: pháº£i giá»‘ng ServiceCategoryPage.
    // Khi review API cÃ³ dá»¯ liá»‡u tháº­t theo code/tÃªn thÃ¬ dÃ¹ng sá»‘ review tháº­t Ä‘Ã³,
    // khÃ´ng giá»¯ totalReviews tá»« operator náº¿u operator Ä‘ang lÃ  sá»‘ demo/áº£o.
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
    label: `${operator.code} Â· ${config.typeLabel} ${operator.name}`,
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
      "Xin chÃ o! TÃ´i cÃ³ thá»ƒ tÆ° váº¥n gÃ³i/báº£ng giÃ¡, Ä‘á»“ng thá»i há»— trá»£ báº¡n xem dá»‹ch vá»¥ uy tÃ­n vÃ  tÃ³m táº¯t review.",
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
    "GiÃ¡ vÃ© / chi phÃ­": "GiÃ¡ vÃ© vÃ  chi phÃ­",
    "Vá»‡ sinh / sáº¡ch sáº½": "Vá»‡ sinh sáº¡ch sáº½",
    "KhÃ´ng gian / tiá»‡n nghi": "KhÃ´ng gian, tiá»‡n nghi",
    "Giá» giáº¥c / Ä‘Ãºng giá»": "Giá» giáº¥c Ä‘Ãºng giá»",
    "Äáº·t chá»— / thá»§ tá»¥c": "Äáº·t chá»— vÃ  thá»§ tá»¥c",
    "Ä‚n uá»‘ng / phá»¥c vá»¥ kÃ¨m": "Ä‚n uá»‘ng vÃ  dá»‹ch vá»¥ kÃ¨m",
    "HÃ nh lÃ½ / Ä‘á»“ Ä‘áº¡c": "HÃ nh lÃ½ vÃ  Ä‘á»“ Ä‘áº¡c",
    "Tour / lá»‹ch trÃ¬nh": "Tour vÃ  lá»‹ch trÃ¬nh",
  };

  const text = mapped[raw] || raw.replace(/\s*\/\s*/g, " vÃ  ");
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
        "thai do phuc vu": "NhÃ¢n viÃªn/tÃ i xáº¿ Ä‘Æ°á»£c khen há»— trá»£ lá»‹ch sá»±, dá»… trao Ä‘á»•i",
        "ve sinh sach se": "Xe hoáº·c khu vá»±c sá»­ dá»¥ng khÃ¡ sáº¡ch, táº¡o cáº£m giÃ¡c dá»… chá»‹u",
        "gia ve chi phi": "Má»™t sá»‘ khÃ¡ch tháº¥y giÃ¡ vÃ©/chi phÃ­ á»Ÿ má»©c cháº¥p nháº­n Ä‘Æ°á»£c",
        "khong gian tien nghi": "Gháº¿/giÆ°á»ng, mÃ¡y láº¡nh hoáº·c tiá»‡n nghi Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ á»•n",
        "gio giac dung gio": "CÃ³ chuyáº¿n Ä‘Æ°á»£c ghi nháº­n cháº¡y Ä‘Ãºng hoáº·c gáº§n Ä‘Ãºng giá»",
        "an toan": "Má»™t sá»‘ khÃ¡ch cáº£m tháº¥y chuyáº¿n Ä‘i khÃ¡ an toÃ n",
        "don tra trung chuyen": "Äiá»ƒm Ä‘Ã³n/tráº£ hoáº·c trung chuyá»ƒn Ä‘Æ°á»£c nháº­n xÃ©t thuáº­n tiá»‡n",
        "dat cho thu tuc": "Äáº·t vÃ© vÃ  xÃ¡c nháº­n thÃ´ng tin tÆ°Æ¡ng Ä‘á»‘i dá»… theo dÃµi",
      },
      risk: {
        "thai do phuc vu": "ThÃ¡i Ä‘á»™ nhÃ¢n viÃªn/tÃ i xáº¿ cÃ²n bá»‹ pháº£n Ã¡nh khi cÃ³ phÃ¡t sinh",
        "ve sinh sach se": "Cáº§n kiá»ƒm tra mÃ¹i xe, gháº¿/giÆ°á»ng vÃ  vá»‡ sinh gáº§n Ä‘Ã¢y",
        "gia ve chi phi": "NÃªn há»i rÃµ giÃ¡ cuá»‘i, phá»¥ phÃ­ vÃ  Ä‘iá»u kiá»‡n hoÃ n/há»§y",
        "khong gian tien nghi": "Cáº§n kiá»ƒm tra loáº¡i xe, gháº¿, mÃ¡y láº¡nh, á»• sáº¡c hoáº·c wifi",
        "gio giac dung gio": "Dá»… áº£nh hÆ°á»Ÿng lá»‹ch trÃ¬nh náº¿u xe trá»… giá» hoáº·c Ä‘á»•i giá»",
        "an toan": "Cáº§n Ä‘á»c ká»¹ pháº£n Ã¡nh vá» cháº¡y nhanh, vÆ°á»£t áº©u hoáº·c máº¥t an tÃ¢m",
        "don tra trung chuyen": "NÃªn há»i rÃµ Ä‘iá»ƒm Ä‘Ã³n/tráº£ Ä‘á»ƒ trÃ¡nh chá» lÃ¢u hoáº·c Ä‘á»•i Ä‘iá»ƒm",
        "dat cho thu tuc": "NÃªn lÆ°u mÃ£ vÃ© vÃ  xÃ¡c nháº­n Ä‘áº·t chá»— trÆ°á»›c khi lÃªn xe",
      },
    },
    hotel: {
      good: {
        "thai do phuc vu": "NhÃ¢n viÃªn/lá»… tÃ¢n Ä‘Æ°á»£c khen há»— trá»£ lá»‹ch sá»±, dá»… trao Ä‘á»•i",
        "ve sinh sach se": "PhÃ²ng hoáº·c khu vá»±c chung Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ sáº¡ch sáº½",
        "gia ve chi phi": "GiÃ¡ phÃ²ng Ä‘Æ°á»£c xem lÃ  há»£p lÃ½ so vá»›i tiá»‡n nghi nháº­n Ä‘Æ°á»£c",
        "khong gian tien nghi": "PhÃ²ng, giÆ°á»ng, Ä‘iá»u hÃ²a hoáº·c view Ä‘Æ°á»£c nháº¯c tÃ­ch cá»±c",
        "an uong phuc vu kem": "Bá»¯a sÃ¡ng hoáº·c dá»‹ch vá»¥ Ä‘i kÃ¨m Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ á»•n",
        "dat cho thu tuc": "Äáº·t phÃ²ng vÃ  check-in/check-out tÆ°Æ¡ng Ä‘á»‘i thuáº­n tiá»‡n",
      },
      risk: {
        "thai do phuc vu": "NÃªn xem pháº£n Ã¡nh vá» cÃ¡ch xá»­ lÃ½ khiáº¿u náº¡i cá»§a nhÃ¢n viÃªn",
        "ve sinh sach se": "Cáº§n kiá»ƒm tra vá»‡ sinh phÃ²ng, ga giÆ°á»ng vÃ  nhÃ  vá»‡ sinh",
        "gia ve chi phi": "NÃªn há»i rÃµ phá»¥ phÃ­, tiá»n cá»c vÃ  chÃ­nh sÃ¡ch há»§y phÃ²ng",
        "khong gian tien nghi": "Cáº§n Ä‘á»‘i chiáº¿u áº£nh tháº­t, cÃ¡ch Ã¢m, wifi vÃ  tiá»‡n nghi",
        "an uong phuc vu kem": "NÃªn xem review má»›i náº¿u báº¡n quan trá»ng bá»¯a sÃ¡ng/dá»‹ch vá»¥ kÃ¨m",
        "dat cho thu tuc": "NÃªn lÆ°u xÃ¡c nháº­n Ä‘áº·t phÃ²ng vÃ  giá» nháº­n/tráº£ phÃ²ng",
      },
    },
    air: {
      good: {
        "thai do phuc vu": "NhÃ¢n viÃªn há»— trá»£ hoáº·c hÆ°á»›ng dáº«n Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ á»•n",
        "gia ve chi phi": "GiÃ¡ vÃ© cÃ³ thá»ƒ há»£p lÃ½ náº¿u Ä‘áº·t Ä‘Ãºng thá»i Ä‘iá»ƒm",
        "gio giac dung gio": "Má»™t sá»‘ chuyáº¿n Ä‘Æ°á»£c ghi nháº­n Ä‘Ãºng giá» hoáº·c Ã­t lá»‡ch giá»",
        "dat cho thu tuc": "Äáº·t vÃ©/check-in Ä‘Æ°á»£c nháº­n xÃ©t khÃ¡ dá»… theo dÃµi",
        "hanh ly do dac": "Xá»­ lÃ½ hÃ nh lÃ½ Ä‘Æ°á»£c má»™t sá»‘ khÃ¡ch Ä‘Ã¡nh giÃ¡ á»•n",
        "khong gian tien nghi": "Gháº¿ ngá»“i hoáº·c tiá»‡n nghi cÆ¡ báº£n Ä‘Æ°á»£c nháº¯c tÃ­ch cá»±c",
      },
      risk: {
        "thai do phuc vu": "Cáº§n xem ká»¹ há»— trá»£ khi Ä‘á»•i vÃ©, hoÃ n vÃ© hoáº·c phÃ¡t sinh",
        "gia ve chi phi": "NÃªn kiá»ƒm tra phÃ­ hÃ nh lÃ½, Ä‘á»•i vÃ© vÃ  Ä‘iá»u kiá»‡n hoÃ n vÃ©",
        "gio giac dung gio": "Delay, Ä‘á»•i giá» hoáº·c há»§y chuyáº¿n cÃ³ thá»ƒ áº£nh hÆ°á»Ÿng lá»‹ch trÃ¬nh",
        "dat cho thu tuc": "NÃªn chuáº©n bá»‹ mÃ£ Ä‘áº·t chá»— vÃ  kiá»ƒm tra quy Ä‘á»‹nh check-in",
        "hanh ly do dac": "Cáº§n kiá»ƒm tra cÃ¢n náº·ng/kÃ­ch thÆ°á»›c hÃ nh lÃ½ trÆ°á»›c khi bay",
        "khong gian tien nghi": "NÃªn xem loáº¡i gháº¿ vÃ  tiá»‡n nghi náº¿u báº¡n cáº§n thoáº£i mÃ¡i",
      },
    },
    tour: {
      good: {
        "thai do phuc vu": "HÆ°á»›ng dáº«n viÃªn/nhÃ¢n sá»± Ä‘Æ°á»£c khen nhiá»‡t tÃ¬nh, dá»… há»— trá»£",
        "gia ve chi phi": "GiÃ¡ tour Ä‘Æ°á»£c xem lÃ  há»£p lÃ½ so vá»›i lá»‹ch trÃ¬nh",
        "tour lich trinh": "Lá»‹ch trÃ¬nh tham quan Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ dá»… theo dÃµi",
        "an uong phuc vu kem": "Ä‚n uá»‘ng hoáº·c dá»‹ch vá»¥ kÃ¨m Ä‘Æ°á»£c má»™t sá»‘ khÃ¡ch Ä‘Ã¡nh giÃ¡ á»•n",
        "dat cho thu tuc": "Äáº·t tour vÃ  xÃ¡c nháº­n lá»‹ch tÆ°Æ¡ng Ä‘á»‘i rÃµ rÃ ng",
        "khong gian tien nghi": "PhÆ°Æ¡ng tiá»‡n hoáº·c nÆ¡i nghá»‰ trong tour Ä‘Æ°á»£c nháº­n xÃ©t á»•n",
      },
      risk: {
        "thai do phuc vu": "NÃªn xem pháº£n Ã¡nh vá» hÆ°á»›ng dáº«n viÃªn vÃ  Ä‘iá»u phá»‘i tour",
        "gia ve chi phi": "Cáº§n há»i rÃµ giÃ¡ Ä‘Ã£ bao gá»“m gÃ¬ vÃ  cÃ¡c khoáº£n phá»¥ thu",
        "tour lich trinh": "NÃªn kiá»ƒm tra lá»‹ch trÃ¬nh thá»±c táº¿ vÃ  thá»i gian á»Ÿ tá»«ng Ä‘iá»ƒm",
        "an uong phuc vu kem": "Náº¿u quan trá»ng bá»¯a Äƒn, nÃªn xem review má»›i vá» suáº¥t Äƒn",
        "dat cho thu tuc": "NÃªn lÆ°u lá»‹ch trÃ¬nh, xÃ¡c nháº­n tour vÃ  Ä‘iá»u kiá»‡n hoÃ n/há»§y",
        "khong gian tien nghi": "Cáº§n há»i rÃµ loáº¡i xe, nÆ¡i nghá»‰ vÃ  tiá»‡n nghi Ä‘i kÃ¨m",
      },
    },
    train: {
      good: {
        "thai do phuc vu": "NhÃ¢n viÃªn há»— trá»£ Ä‘Æ°á»£c má»™t sá»‘ khÃ¡ch Ä‘Ã¡nh giÃ¡ lá»‹ch sá»±",
        "gia ve chi phi": "GiÃ¡ vÃ© phÃ¹ há»£p náº¿u Æ°u tiÃªn chi phÃ­ á»•n Ä‘á»‹nh",
        "gio giac dung gio": "Lá»‹ch trÃ¬nh Ä‘Æ°á»£c ghi nháº­n khÃ¡ Ä‘Ãºng giá» trong má»™t sá»‘ chuyáº¿n",
        "ve sinh sach se": "Khoang ngá»“i/giÆ°á»ng Ä‘Æ°á»£c khen sáº¡ch hÆ¡n ká»³ vá»ng",
        "khong gian tien nghi": "Gháº¿/giÆ°á»ng vÃ  tiá»‡n nghi cÆ¡ báº£n Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ á»•n",
      },
      risk: {
        "thai do phuc vu": "NÃªn xem pháº£n Ã¡nh vá» há»— trá»£ táº¡i ga hoáº·c trÃªn tÃ u",
        "gia ve chi phi": "Cáº§n kiá»ƒm tra háº¡ng vÃ©, phÃ­ Ä‘á»•i/tráº£ vÃ  hoÃ n vÃ©",
        "gio giac dung gio": "Cháº­m chuyáº¿n cÃ³ thá»ƒ áº£nh hÆ°á»Ÿng lá»‹ch ná»‘i chuyáº¿n",
        "ve sinh sach se": "NÃªn xem vá»‡ sinh khoang tÃ u vÃ  nhÃ  vá»‡ sinh gáº§n Ä‘Ã¢y",
        "khong gian tien nghi": "Náº¿u Ä‘i xa, nÃªn kiá»ƒm tra gháº¿/giÆ°á»ng vÃ  Ä‘iá»u hÃ²a",
      },
    },
    service: {
      good: {
        "thai do phuc vu": "Dá»‹ch vá»¥ Ä‘Æ°á»£c khen vá» cÃ¡ch há»— trá»£ vÃ  pháº£n há»“i khÃ¡ch",
        "gia ve chi phi": "Chi phÃ­ Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ tÆ°Æ¡ng Ä‘á»‘i phÃ¹ há»£p",
        "ve sinh sach se": "Sá»± sáº¡ch sáº½ hoáº·c chá»‰n chu Ä‘Æ°á»£c nháº¯c tÃ­ch cá»±c",
        "khong gian tien nghi": "KhÃ´ng gian hoáº·c tiá»‡n Ã­ch sá»­ dá»¥ng Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ á»•n",
        "dat cho thu tuc": "Äáº·t lá»‹ch/xÃ¡c nháº­n dá»‹ch vá»¥ khÃ¡ dá»… theo dÃµi",
      },
      risk: {
        "thai do phuc vu": "NÃªn kiá»ƒm tra cÃ¡ch há»— trá»£ khi cÃ³ phÃ¡t sinh",
        "gia ve chi phi": "Cáº§n há»i rÃµ giÃ¡ cuá»‘i, phá»¥ phÃ­ vÃ  Ä‘iá»u kiá»‡n hoÃ n/há»§y",
        "ve sinh sach se": "NÃªn xem review gáº§n Ä‘Ã¢y vá» má»©c Ä‘á»™ sáº¡ch sáº½",
        "khong gian tien nghi": "Cáº§n Ä‘á»‘i chiáº¿u áº£nh tháº­t, mÃ´ táº£ vÃ  review má»›i",
        "dat cho thu tuc": "NÃªn lÆ°u xÃ¡c nháº­n Ä‘áº·t lá»‹ch vÃ  thÃ´ng tin há»— trá»£",
      },
    },
  };

  const selected = textMap[kind] || textMap.service;
  const sentence = selected[tone]?.[key];

  if (sentence) return `${sentence}${suffix}`;

  return tone === "good"
    ? `Dá»‹ch vá»¥ Ä‘Æ°á»£c khen á»Ÿ nhÃ³m ${displayLabel}, cÃ³ thá»ƒ xem lÃ  Ä‘iá»ƒm cá»™ng khi cÃ¢n nháº¯c${suffix}`
    : `Cáº§n theo dÃµi nhÃ³m ${displayLabel} vÃ¬ cÃ³ thá»ƒ áº£nh hÆ°á»Ÿng tráº£i nghiá»‡m thá»±c táº¿${suffix}`;
}

function fallbackTopicSentences(tone, kind, usedLabels = new Set()) {
  const fallbacks = {
    bus: {
      good: ["ThÃ¡i Ä‘á»™ phá»¥c vá»¥ (0 review)", "Vá»‡ sinh / sáº¡ch sáº½ (0 review)", "KhÃ´ng gian / tiá»‡n nghi (0 review)", "Giá» giáº¥c / Ä‘Ãºng giá» (0 review)"],
      risk: ["Giá» giáº¥c / Ä‘Ãºng giá» (0 review)", "An toÃ n (0 review)", "GiÃ¡ vÃ© / chi phÃ­ (0 review)", "Vá»‡ sinh / sáº¡ch sáº½ (0 review)"],
    },
    hotel: {
      good: ["Vá»‡ sinh / sáº¡ch sáº½ (0 review)", "ThÃ¡i Ä‘á»™ phá»¥c vá»¥ (0 review)", "KhÃ´ng gian / tiá»‡n nghi (0 review)", "Ä‚n uá»‘ng / phá»¥c vá»¥ kÃ¨m (0 review)"],
      risk: ["Vá»‡ sinh / sáº¡ch sáº½ (0 review)", "KhÃ´ng gian / tiá»‡n nghi (0 review)", "GiÃ¡ vÃ© / chi phÃ­ (0 review)", "Äáº·t chá»— / thá»§ tá»¥c (0 review)"],
    },
    air: {
      good: ["Giá» giáº¥c / Ä‘Ãºng giá» (0 review)", "ThÃ¡i Ä‘á»™ phá»¥c vá»¥ (0 review)", "Äáº·t chá»— / thá»§ tá»¥c (0 review)", "HÃ nh lÃ½ / Ä‘á»“ Ä‘áº¡c (0 review)"],
      risk: ["Giá» giáº¥c / Ä‘Ãºng giá» (0 review)", "HÃ nh lÃ½ / Ä‘á»“ Ä‘áº¡c (0 review)", "GiÃ¡ vÃ© / chi phÃ­ (0 review)", "Äáº·t chá»— / thá»§ tá»¥c (0 review)"],
    },
    tour: {
      good: ["Tour / lá»‹ch trÃ¬nh (0 review)", "ThÃ¡i Ä‘á»™ phá»¥c vá»¥ (0 review)", "Ä‚n uá»‘ng / phá»¥c vá»¥ kÃ¨m (0 review)", "GiÃ¡ vÃ© / chi phÃ­ (0 review)"],
      risk: ["Tour / lá»‹ch trÃ¬nh (0 review)", "GiÃ¡ vÃ© / chi phÃ­ (0 review)", "ThÃ¡i Ä‘á»™ phá»¥c vá»¥ (0 review)", "Ä‚n uá»‘ng / phá»¥c vá»¥ kÃ¨m (0 review)"],
    },
    train: {
      good: ["Giá» giáº¥c / Ä‘Ãºng giá» (0 review)", "Vá»‡ sinh / sáº¡ch sáº½ (0 review)", "KhÃ´ng gian / tiá»‡n nghi (0 review)", "ThÃ¡i Ä‘á»™ phá»¥c vá»¥ (0 review)"],
      risk: ["Giá» giáº¥c / Ä‘Ãºng giá» (0 review)", "Vá»‡ sinh / sáº¡ch sáº½ (0 review)", "KhÃ´ng gian / tiá»‡n nghi (0 review)", "GiÃ¡ vÃ© / chi phÃ­ (0 review)"],
    },
    service: {
      good: ["ThÃ¡i Ä‘á»™ phá»¥c vá»¥ (0 review)", "GiÃ¡ vÃ© / chi phÃ­ (0 review)", "Äáº·t chá»— / thá»§ tá»¥c (0 review)", "KhÃ´ng gian / tiá»‡n nghi (0 review)"],
      risk: ["ThÃ¡i Ä‘á»™ phá»¥c vá»¥ (0 review)", "GiÃ¡ vÃ© / chi phÃ­ (0 review)", "Äáº·t chá»— / thá»§ tá»¥c (0 review)", "Vá»‡ sinh / sáº¡ch sáº½ (0 review)"],
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
    result.push(`Tá»· lá»‡ cáº§n theo dÃµi ráº¥t cao (${percent(bad, total)}), chÆ°a nÃªn chá»n vá»™i náº¿u cáº§n tráº£i nghiá»‡m á»•n Ä‘á»‹nh.`);
  } else if (badRate >= 30) {
    result.push(`CÃ³ thá»ƒ cÃ¢n nháº¯c, nhÆ°ng nÃªn Ä‘á»c ká»¹ review gáº§n Ä‘Ã¢y vÃ¬ pháº£n Ã¡nh tiÃªu cá»±c chiáº¿m ${percent(bad, total)}.`);
  } else {
    result.push(`CÃ³ thá»ƒ Æ°u tiÃªn náº¿u nhu cáº§u khá»›p vá»›i Ä‘iá»ƒm máº¡nh chÃ­nh cá»§a dá»‹ch vá»¥.`);
  }

  if (kind === "bus") {
    result.push(topBad.label ? `TrÆ°á»›c khi Ä‘áº·t vÃ©, kiá»ƒm tra ká»¹ ${cleanSummaryLabel(topBad.label, true)}, giá» Ä‘Ã³n/tráº£ vÃ  loáº¡i xe.` : "TrÆ°á»›c khi Ä‘áº·t vÃ©, há»i rÃµ giá» Ä‘Ã³n/tráº£, loáº¡i xe vÃ  Ä‘iá»ƒm trung chuyá»ƒn.");
    result.push(topGood.label ? `Náº¿u váº«n chá»n, hÃ£y táº­n dá»¥ng Ä‘iá»ƒm máº¡nh vá» ${cleanSummaryLabel(topGood.label, true)} nhÆ°ng xem review má»›i.` : "Náº¿u váº«n chá»n, Æ°u tiÃªn chuyáº¿n cÃ³ thÃ´ng tin rÃµ vá» xe, giá» cháº¡y vÃ  Ä‘iá»ƒm Ä‘Ã³n.");
    result.push("NÃªn so sÃ¡nh thÃªm 1-2 nhÃ  xe cÃ¹ng tuyáº¿n trÆ°á»›c khi quyáº¿t Ä‘á»‹nh.");
  } else if (kind === "hotel") {
    result.push(topBad.label ? `TrÆ°á»›c khi Ä‘áº·t phÃ²ng, kiá»ƒm tra ká»¹ ${cleanSummaryLabel(topBad.label, true)}, áº£nh tháº­t vÃ  phá»¥ phÃ­.` : "TrÆ°á»›c khi Ä‘áº·t phÃ²ng, kiá»ƒm tra áº£nh tháº­t, vá»‹ trÃ­, phá»¥ phÃ­ vÃ  chÃ­nh sÃ¡ch há»§y.");
    result.push(topGood.label ? `Náº¿u ${cleanSummaryLabel(topGood.label, true)} Ä‘Ãºng nhu cáº§u, cÃ³ thá»ƒ giá»¯ lÃ m phÆ°Æ¡ng Ã¡n tham kháº£o.` : "Náº¿u vá»‹ trÃ­, vá»‡ sinh vÃ  tiá»‡n nghi phÃ¹ há»£p, cÃ³ thá»ƒ giá»¯ lÃ m phÆ°Æ¡ng Ã¡n tham kháº£o.");
    result.push("NÃªn so sÃ¡nh thÃªm khÃ¡ch sáº¡n cÃ¹ng khu vá»±c cÃ³ review má»›i á»•n Ä‘á»‹nh.");
  } else if (kind === "air") {
    result.push(topBad.label ? `TrÆ°á»›c khi mua vÃ©, kiá»ƒm tra ká»¹ ${cleanSummaryLabel(topBad.label, true)}, hÃ nh lÃ½ vÃ  Ä‘iá»u kiá»‡n Ä‘á»•i vÃ©.` : "TrÆ°á»›c khi mua vÃ©, kiá»ƒm tra hÃ nh lÃ½, Ä‘á»•i vÃ©, hoÃ n vÃ© vÃ  lá»‹ch bay gáº§n Ä‘Ã¢y.");
    result.push(topGood.label ? `CÃ³ thá»ƒ táº­n dá»¥ng Ä‘iá»ƒm máº¡nh vá» ${cleanSummaryLabel(topGood.label, true)}, nhÆ°ng cáº§n phÆ°Æ¡ng Ã¡n dá»± phÃ²ng náº¿u lá»‹ch gáº¥p.` : "Náº¿u lá»‹ch trÃ¬nh gáº¥p, nÃªn chá»n chuyáº¿n cÃ³ há»— trá»£ vÃ  giá» bay an toÃ n.");
    result.push("NÃªn so sÃ¡nh thÃªm chuyáº¿n/hÃ£ng khÃ¡c cÃ¹ng khung giá».");
  } else if (kind === "tour") {
    result.push(topBad.label ? `TrÆ°á»›c khi Ä‘áº·t tour, há»i rÃµ ${cleanSummaryLabel(topBad.label, true)}, phá»¥ thu vÃ  dá»‹ch vá»¥ Ä‘Ã£ bao gá»“m.` : "TrÆ°á»›c khi Ä‘áº·t tour, há»i rÃµ lá»‹ch trÃ¬nh, phá»¥ thu vÃ  Ä‘iá»u kiá»‡n hoÃ n/há»§y.");
    result.push(topGood.label ? `Náº¿u ${cleanSummaryLabel(topGood.label, true)} phÃ¹ há»£p phong cÃ¡ch Ä‘i, cÃ³ thá»ƒ cÃ¢n nháº¯c.` : "Náº¿u lá»‹ch trÃ¬nh vÃ  dá»‹ch vá»¥ kÃ¨m phÃ¹ há»£p, cÃ³ thá»ƒ cÃ¢n nháº¯c sau khi xem review má»›i.");
    result.push("NÃªn so sÃ¡nh thÃªm tour cÃ¹ng Ä‘iá»ƒm Ä‘áº¿n trÆ°á»›c khi Ä‘áº·t.");
  } else if (kind === "train") {
    result.push(topBad.label ? `TrÆ°á»›c khi Ä‘áº·t vÃ©, kiá»ƒm tra ká»¹ ${cleanSummaryLabel(topBad.label, true)}, háº¡ng gháº¿ vÃ  giá» cháº¡y.` : "TrÆ°á»›c khi Ä‘áº·t vÃ©, kiá»ƒm tra háº¡ng gháº¿/giÆ°á»ng, giá» cháº¡y vÃ  Ä‘iá»u kiá»‡n Ä‘á»•i tráº£.");
    result.push(topGood.label ? `CÃ³ thá»ƒ táº­n dá»¥ng Ä‘iá»ƒm máº¡nh vá» ${cleanSummaryLabel(topGood.label, true)}, nháº¥t lÃ  khi Ä‘i Ä‘Æ°á»ng dÃ i.` : "Náº¿u Ä‘i xa, Æ°u tiÃªn chuyáº¿n cÃ³ tiá»‡n nghi vÃ  giá» cháº¡y phÃ¹ há»£p.");
    result.push("NÃªn so sÃ¡nh thÃªm lá»±a chá»n cÃ¹ng tuyáº¿n Ä‘á»ƒ trÃ¡nh rá»§i ro lá»‹ch trÃ¬nh.");
  } else {
    result.push(topBad.label ? `TrÆ°á»›c khi dÃ¹ng, kiá»ƒm tra ká»¹ ${cleanSummaryLabel(topBad.label, true)}, giÃ¡ cuá»‘i vÃ  há»— trá»£ phÃ¡t sinh.` : "TrÆ°á»›c khi dÃ¹ng, há»i rÃµ giÃ¡ cuá»‘i, quy trÃ¬nh vÃ  há»— trá»£ khi phÃ¡t sinh.");
    result.push(topGood.label ? `Náº¿u ${cleanSummaryLabel(topGood.label, true)} Ä‘Ãºng nhu cáº§u, cÃ³ thá»ƒ Ä‘Æ°a vÃ o danh sÃ¡ch cÃ¢n nháº¯c.` : "Náº¿u dá»‹ch vá»¥ Ä‘Ã¡p á»©ng Ä‘Ãºng nhu cáº§u chÃ­nh, cÃ³ thá»ƒ Ä‘Æ°a vÃ o danh sÃ¡ch cÃ¢n nháº¯c.");
    result.push("NÃªn so sÃ¡nh thÃªm 1-2 Ä‘Æ¡n vá»‹ khÃ¡c cÃ³ review má»›i rÃµ rÃ ng.");
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
        <span>AI tÃ³m táº¯t review</span>
        <strong>{data.label || data.targetName}</strong>
      </div>

      <div className={styles.summaryStats}>
        <div>
          <span>Tá»•ng</span>
          <strong>{total}</strong>
          <small>review</small>
        </div>

        <div className={styles.goodStat}>
          <span>Tá»‘t</span>
          <strong>{good}</strong>
          <small>{percent(good, total)}</small>
        </div>

        <div className={styles.badStat}>
          <span>Cáº§n theo dÃµi</span>
          <strong>{bad}</strong>
          <small>{percent(bad, total)}</small>
        </div>

        <div>
          <span>Trung láº­p</span>
          <strong>{neutral}</strong>
          <small>{percent(neutral, total)}</small>
        </div>

        <div className={styles.scoreStat}>
          <span>Äiá»ƒm TB</span>
          <strong>{data.averageRating}/5</strong>
          <small>trung bÃ¬nh</small>
        </div>
      </div>

      <div className={styles.summaryGroups}>
        <section>
          <h4>Äiá»ƒm Ä‘Æ°á»£c khen</h4>
          <ul>{goodBullets.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section>
          <h4>Váº¥n Ä‘á» cáº§n theo dÃµi</h4>
          <ul>{badBullets.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section>
          <h4>Gá»£i Ã½ cho báº¡n</h4>
          <ul>{adviceBullets.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}

function TopServices({ items, onSummary }) {
  const rankedItems = sortTopServicesLikeCategoryPage(items);

  if (!rankedItems.length) {
    return <div className={styles.emptyResult}>ChÆ°a cÃ³ dá»¯ liá»‡u Ä‘á»§ Ä‘á»ƒ xáº¿p háº¡ng nhÃ³m nÃ y.</div>;
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
              <span>Uy tÃ­n {item.trustDisplayScore}/10</span>
              <span>{item.totalReviews} review</span>
            </div>
          </div>

          <button type="button" onClick={() => onSummary(item)}>
            TÃ³m táº¯t
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
    if (mode === "package") return "AI tÆ° váº¥n gÃ³i & báº£ng giÃ¡";
    if (mode === "top") return "PhÃ¢n tÃ­ch dá»‹ch vá»¥ uy tÃ­n";
    if (mode === "summary") return "PhÃ¢n tÃ­ch tÃ³m táº¯t review";
    if (mode === "compare") return "So sÃ¡nh dá»‹ch vá»¥";
    if (mode === "need") return "Gá»£i Ã½ theo nhu cáº§u";
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

    // Card/menu/top/tÃ³m táº¯t cÃ³ chiá»u cao thay Ä‘á»•i sau khi render,
    // nÃªn cuá»™n thÃªm vÃ i nhá»‹p Ä‘á»ƒ luÃ´n xuá»‘ng Ä‘Ãºng tin nháº¯n cuá»‘i.
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

CÃ¢u há»i ngÆ°á»i dÃ¹ng: ${text}`
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
          "Hiá»‡n AI tÆ° váº¥n gÃ³i chÆ°a káº¿t ná»‘i Ä‘Æ°á»£c. TÃ´i Ä‘Ã£ ghi nháº­n cÃ¢u há»i nÃ y Ä‘á»ƒ admin bá»• sung vÃ o file huáº¥n luyá»‡n sau.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadTop(category) {
    const picked = CATEGORIES.find((item) => item.key === category);

    setLoading(true);
    pushMessage({ role: "user", text: picked?.label || "Xem top dá»‹ch vá»¥ uy tÃ­n" });

    try {
      let items = await loadTopByCategoryPageLogic(category);

      // Fallback: náº¿u khÃ´ng Ä‘á»c Ä‘Æ°á»£c danh sÃ¡ch operator nhÆ° ServiceCategoryPage
      // thÃ¬ má»›i dÃ¹ng API AI cÅ©. TrÆ°á»ng há»£p bÃ¬nh thÆ°á»ng sáº½ khÃ´ng dÃ¹ng fallback nÃ y.
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
        text: `ÄÃ¢y lÃ  top ${picked?.short || "dá»‹ch vá»¥"} theo Ä‘Ãºng dá»¯ liá»‡u Ä‘ang dÃ¹ng á»Ÿ trang xáº¿p háº¡ng:`,
        items,
      });
    } catch (err) {
      pushMessage({ role: "ai", text: `KhÃ´ng táº£i Ä‘Æ°á»£c báº£ng xáº¿p háº¡ng: ${err.message}` });
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
        text: `ÄÃ¢y lÃ  báº£n tÃ³m táº¯t review cá»§a ${service.label || service.targetName}:`,
        data: data.data,
      });
    } catch (err) {
      pushMessage({
        role: "ai",
        text:
          `KhÃ´ng tÃ³m táº¯t Ä‘Æ°á»£c review: ${err.message}. ` +
          "Pháº§n xáº¿p háº¡ng váº«n dÃ¹ng Ä‘Ãºng Ä‘iá»ƒm/tá»•ng review tá»« trang báº£ng xáº¿p háº¡ng, nhÆ°ng dá»‹ch vá»¥ nÃ y chÆ°a cÃ³ ná»™i dung review cÃ´ng khai Ä‘á»§ Ä‘á»ƒ AI tÃ³m táº¯t chi tiáº¿t.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSummaryQuery(text) {
    if (isThanksOrClose(text)) {
      pushMessage({
        role: "ai",
        text: "VÃ¢ng, khÃ´ng cÃ³ gÃ¬ áº¡. ChÃºc báº¡n má»™t ngÃ y tá»‘t lÃ nh áº¡ ðŸ˜Š",
      });
      return;
    }

    if (isGreeting(text)) {
      pushMessage({
        role: "ai",
        text: "ChÃ o báº¡n áº¡ ðŸ˜Š Báº¡n cáº§n tÃ´i tÆ° váº¥n gÃ³i, xem dá»‹ch vá»¥ uy tÃ­n hay tÃ³m táº¯t review dá»‹ch vá»¥ nÃ o khÃ´ng áº¡?",
      });
      return;
    }

    if (!looksLikeServiceQuery(text)) {
      pushMessage({
        role: "ai",
        kind: "summaryHelp",
        text: "Báº¡n vui lÃ²ng nháº­p rÃµ tÃªn dá»‹ch vá»¥ cáº§n xem review, vÃ­ dá»¥: Sao Viá»‡t, xe Sao Viá»‡t, FLC Háº¡ Long hoáº·c mÃ£ PT-013.",
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
          text: "TÃ´i chÆ°a tÃ¬m tháº¥y dá»‹ch vá»¥ phÃ¹ há»£p. Báº¡n thá»­ nháº­p rÃµ hÆ¡n tÃªn nhÃ  xe, khÃ¡ch sáº¡n hoáº·c mÃ£ dá»‹ch vá»¥ nhÃ©.",
        });
        return;
      }

      const best = matches[0];

      pushMessage({
        role: "ai",
        kind: "confirmService",
        text: `Báº¡n cáº§n há»i vá» ${best.label} Ä‘Ãºng khÃ´ng áº¡?`,
        service: best,
        alternatives: matches.slice(1, 4),
      });
    } catch (err) {
      pushMessage({ role: "ai", text: `KhÃ´ng tÃ¬m Ä‘Æ°á»£c dá»‹ch vá»¥: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare(text) {
    const parts = text.split(",").map((item) => item.trim()).filter(Boolean);

    if (parts.length < 2) {
      pushMessage({
        role: "ai",
        text: "Báº¡n vui lÃ²ng nháº­p 2 dá»‹ch vá»¥, cÃ¡ch nhau báº±ng dáº¥u pháº©y. VÃ­ dá»¥: Sao Viá»‡t, NhÆ° Vinh",
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
          text: "TÃ´i chÆ°a tÃ¬m Ä‘á»§ 2 dá»‹ch vá»¥ Ä‘á»ƒ so sÃ¡nh. Báº¡n thá»­ nháº­p rÃµ hÆ¡n tÃªn dá»‹ch vá»¥ nhÃ©.",
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
        text: `So sÃ¡nh nhanh ${aRes.data.label || aRes.data.targetName} vÃ  ${bRes.data.label || bRes.data.targetName}:`,
        data: [aRes.data, bRes.data],
      });
    } catch (err) {
      pushMessage({ role: "ai", text: `KhÃ´ng so sÃ¡nh Ä‘Æ°á»£c: ${err.message}` });
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
          "Báº¡n muá»‘n tÃ´i tÆ° váº¥n gÃ³i theo nhu cáº§u nÃ o? Báº¡n cÃ³ thá»ƒ nháº­p quota/thÃ¡ng, AI moderation, API key hoáº·c ngÃ¢n sÃ¡ch dá»± kiáº¿n.",
      });
      return;
    }

    if (action === "top") {
      setMode("top");
      pushMessage({
        role: "ai",
        kind: "categoryMenu",
        text: "Báº¡n muá»‘n xem top dá»‹ch vá»¥ uy tÃ­n á»Ÿ nhÃ³m nÃ o?",
      });
      return;
    }

    if (action === "summary") {
      setMode("summary");
      pushMessage({
        role: "ai",
        text: "Báº¡n cáº§n tham kháº£o review cá»§a dá»‹ch vá»¥ nÃ o áº¡? VÃ­ dá»¥: Sao Viá»‡t, xe Sao Viá»‡t, FLC Háº¡ Long...",
      });
      return;
    }

    if (action === "compare") {
      setMode("compare");
      pushMessage({
        role: "ai",
        text: "Báº¡n nháº­p 2 dá»‹ch vá»¥ muá»‘n so sÃ¡nh, cÃ¡ch nhau báº±ng dáº¥u pháº©y. VÃ­ dá»¥: Sao Viá»‡t, NhÆ° Vinh",
      });
      return;
    }

    if (action === "need") {
      setMode("need");
      pushMessage({
        role: "ai",
        kind: "needMenu",
        text: "Báº¡n Ä‘ang cáº§n gá»£i Ã½ theo nhu cáº§u nÃ o?",
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
        text: "VÃ¢ng, khÃ´ng cÃ³ gÃ¬ áº¡. ChÃºc báº¡n má»™t ngÃ y tá»‘t lÃ nh áº¡ ðŸ˜Š",
      });
      return;
    }

    if (isGreeting(text)) {
      pushMessage({
        role: "ai",
        text: "ChÃ o báº¡n áº¡ ðŸ˜Š Báº¡n cáº§n tÃ´i tÆ° váº¥n gÃ³i, xem dá»‹ch vá»¥ uy tÃ­n hay tÃ³m táº¯t review dá»‹ch vá»¥ nÃ o khÃ´ng áº¡?",
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
        text: "Báº¡n muá»‘n xem top dá»‹ch vá»¥ uy tÃ­n á»Ÿ nhÃ³m nÃ o?",
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
      text: "TÃ´i chÆ°a hiá»ƒu rÃµ Ã½ báº¡n. Báº¡n cÃ³ thá»ƒ báº¥m Menu Ä‘á»ƒ chá»n má»¥c há»— trá»£, hoáº·c nháº­p rÃµ hÆ¡n cÃ¢u há»i vá» gÃ³i, dá»‹ch vá»¥ uy tÃ­n hay tÃ³m táº¯t review nhÃ©.",
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
              <i>â€º</i>
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
          title: "AI tÆ° váº¥n gÃ³i / báº£ng giÃ¡",
          desc: "TÆ° váº¥n gÃ³i, quota, API key vÃ  ngÃ¢n sÃ¡ch",
        },
        {
          key: "top",
          title: "PhÃ¢n tÃ­ch dá»‹ch vá»¥ uy tÃ­n",
          desc: "Xem top dá»‹ch vá»¥ theo tá»«ng nhÃ³m Ä‘Ã¡nh giÃ¡",
        },
        {
          key: "summary",
          title: "PhÃ¢n tÃ­ch tÃ³m táº¯t review",
          desc: "TÃ³m táº¯t Æ°u Ä‘iá»ƒm, nhÆ°á»£c Ä‘iá»ƒm vÃ  lá»i khuyÃªn",
        },
      ];

      const chipItems = [
        { key: "compare", label: "So sÃ¡nh nhanh 2 dá»‹ch vá»¥" },
        { key: "need", label: "Gá»£i Ã½ theo nhu cáº§u" },
      ];

      return (
        <div className={styles.menuCard}>
          <div className={styles.menuIntro}>
            <strong>AI há»— trá»£ nhanh</strong>
            <span>Chá»n má»™t má»¥c, AI sáº½ gá»£i Ã½ cÃ¢u há»i vÃ  tráº£ lá»i ngay.</span>
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
                <i>â€º</i>
              </button>
            ))}
          </div>

          <div className={styles.menuMore}>
            <span>Há»– TRá»¢ THÃŠM</span>
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
        title: "AI tÆ° váº¥n gÃ³i / báº£ng giÃ¡",
        subtitle: "Chá»n nhanh nhu cáº§u cá»§a báº¡n hoáº·c nháº­p trá»±c tiáº¿p á»Ÿ Ã´ chat.",
        items: [
          {
            key: "moderation",
            title: "Cáº§n AI moderation",
            desc: "TÆ° váº¥n gÃ³i phÃ¹ há»£p cho kiá»ƒm duyá»‡t review",
            onClick: () => quickPackage("TÃ´i cáº§n AI moderation cho app review"),
          },
          {
            key: "request-20000",
            title: "20.000 request/thÃ¡ng",
            desc: "Æ¯á»›c tÃ­nh gÃ³i theo quota sá»­ dá»¥ng má»—i thÃ¡ng",
            onClick: () => quickPackage("TÃ´i cáº§n khoáº£ng 20000 request má»—i thÃ¡ng"),
          },
          {
            key: "discount",
            title: "Há»i Æ°u Ä‘Ã£i",
            desc: "TÆ° váº¥n giáº£m giÃ¡ khi mua nhiá»u hoáº·c dÃ¹ng lÃ¢u dÃ i",
            onClick: () => quickPackage("Mua nhiá»u cÃ³ Ä‘Æ°á»£c giáº£m giÃ¡ khÃ´ng?"),
          },
          {
            key: "api-summary",
            title: "API key + AI tÃ³m táº¯t review",
            desc: "GÃ³i cÃ³ API key vÃ  chá»©c nÄƒng tÃ³m táº¯t review",
            onClick: () => quickPackage("TÃ´i muá»‘n gÃ³i cÃ³ API key vÃ  AI tÃ³m táº¯t review"),
          },
        ],
      });
    }

    if (item.kind === "categoryMenu") {
      return renderOptionCard({
        title: "PhÃ¢n tÃ­ch dá»‹ch vá»¥ uy tÃ­n",
        subtitle: "Chá»n nhÃ³m dá»‹ch vá»¥ muá»‘n xem báº£ng xáº¿p háº¡ng.",
        items: CATEGORIES.map((category) => ({
          key: category.key,
          title: category.label,
          desc: `Xem danh sÃ¡ch ${category.short.toLowerCase()} Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ tá»‘t`,
          onClick: () => loadTop(category.key),
        })),
      });
    }

    if (item.kind === "needMenu") {
      return renderOptionCard({
        title: "Gá»£i Ã½ theo nhu cáº§u",
        subtitle: "Chá»n nhu cáº§u Ä‘á»ƒ AI gá»£i Ã½ dá»‹ch vá»¥ phÃ¹ há»£p.",
        items: [
          {
            key: "need-bus",
            title: "TÃ´i cáº§n nhÃ  xe Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ cao",
            desc: "Æ¯u tiÃªn nhÃ  xe cÃ³ nhiá»u review tá»‘t",
            onClick: () => loadTop("nhaxe"),
          },
          {
            key: "need-hotel",
            title: "TÃ´i cáº§n khÃ¡ch sáº¡n nhiá»u review tá»‘t",
            desc: "Æ¯u tiÃªn khÃ¡ch sáº¡n cÃ³ Ä‘iá»ƒm Ä‘Ã¡nh giÃ¡ á»•n Ä‘á»‹nh",
            onClick: () => loadTop("khachsan"),
          },
          {
            key: "need-tour",
            title: "TÃ´i cáº§n tour uy tÃ­n",
            desc: "Xem nhÃ³m tour Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ tá»‘t",
            onClick: () => loadTop("tour"),
          },
          {
            key: "need-specific",
            title: "TÃ´i muá»‘n há»i má»™t dá»‹ch vá»¥ cá»¥ thá»ƒ",
            desc: "Nháº­p tÃªn hoáº·c mÃ£ dá»‹ch vá»¥ Ä‘á»ƒ tÃ³m táº¯t review",
            onClick: () => chooseMain("summary"),
          },
        ],
      });
    }

    if (item.kind === "summaryHelp") {
      return renderOptionCard({
        title: "PhÃ¢n tÃ­ch tÃ³m táº¯t review",
        subtitle: "Chá»n vÃ­ dá»¥ nhanh hoáº·c nháº­p tÃªn dá»‹ch vá»¥ á»Ÿ Ã´ chat.",
        items: [
          {
            key: "summary-saoviet",
            title: "NhÃ  xe Sao Viá»‡t",
            desc: "Äiá»n nhanh tÃªn dá»‹ch vá»¥ Ä‘á»ƒ tra cá»©u",
            onClick: () => setMessage("Sao Viá»‡t"),
          },
          {
            key: "summary-nhuvinh",
            title: "NhÃ  xe NhÆ° Vinh",
            desc: "Äiá»n nhanh tÃªn dá»‹ch vá»¥ Ä‘á»ƒ tra cá»©u",
            onClick: () => setMessage("NhÆ° Vinh"),
          },
          {
            key: "summary-flc",
            title: "KhÃ¡ch sáº¡n FLC Háº¡ Long",
            desc: "Äiá»n nhanh tÃªn dá»‹ch vá»¥ Ä‘á»ƒ tra cá»©u",
            onClick: () => setMessage("FLC Háº¡ Long"),
          },
          {
            key: "summary-top",
            title: "Xem top dá»‹ch vá»¥ uy tÃ­n",
            desc: "Chá»n nhÃ³m dá»‹ch vá»¥ Ä‘á»ƒ xem xáº¿p háº¡ng",
            onClick: () => chooseMain("top"),
          },
        ],
      });
    }

    if (item.kind === "confirmService") {
      return (
        <div className={styles.confirmBox}>
          <button className={styles.primaryConfirm} onClick={() => loadSummary(item.service)}>
            ÄÃºng, tÃ³m táº¯t review
          </button>

          {item.alternatives?.length > 0 && (
            <div className={styles.altList}>
              <span>Hoáº·c chá»n dá»‹ch vá»¥ khÃ¡c:</span>
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
              <span>Tá»‘t: {percent(service.goodReviews, service.totalReviews)}</span>
              <span>Cáº§n theo dÃµi: {percent(service.badReviews, service.totalReviews)}</span>
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
                <p>TÆ° váº¥n gÃ³i, báº£ng giÃ¡ vÃ  chá»n dá»‹ch vá»¥ uy tÃ­n</p>
              </div>
            </div>

            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              Ã—
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
            <button onClick={() => chooseMain("package")}>TÆ° váº¥n gÃ³i</button>
            <button onClick={() => chooseMain("top")}>Dá»‹ch vá»¥ uy tÃ­n</button>
            <button onClick={() => chooseMain("summary")}>TÃ³m táº¯t review</button>
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
                  ? "Nháº­p nhu cáº§u gÃ³i, quota hoáº·c ngÃ¢n sÃ¡ch..."
                  : mode === "summary"
                    ? "Nháº­p tÃªn dá»‹ch vá»¥, vÃ­ dá»¥: Sao Viá»‡t..."
                    : "Há»i AI..."
              }
              rows={1}
            />

            <button onClick={sendMessage} disabled={loading || !message.trim()}>
              Gá»­i
            </button>
          </div>
        </div>
      )}
    </>
  );
}

