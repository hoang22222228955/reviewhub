/**
 * FloatingAITrainingData.js
 *
 * File này dùng như "bộ nhớ huấn luyện" cho FloatingAIChat.
 *
 * Ý tưởng:
 * - Những câu hỏi hay gặp sẽ được trả lời ngay tại frontend để nhanh hơn.
 * - Những câu chưa biết sẽ được lưu vào localStorage để admin xem lại và bổ sung vào file này.
 * - Có thể "dạy nhanh" trong lúc test bằng cú pháp:
 *   dạy ai: câu hỏi => câu trả lời
 *
 * Lưu ý quan trọng:
 * - Đây không phải fine-tune model thật.
 * - Dữ liệu học bằng localStorage chỉ thông minh hơn trên trình duyệt đang test.
 * - Muốn thông minh toàn hệ thống thì sau này đưa các câu hỏi chưa trả lời vào DB/admin để duyệt.
 */

const STORAGE_UNANSWERED = "reviewhub_ai_unanswered_questions_v1";
const STORAGE_LOCAL_TRAINING = "reviewhub_ai_local_training_v1";

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

function compactText(value) {
  return normalizeText(value).replace(/[\s-]+/g, "");
}

function safeReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage.
  }
}

export const AI_TRAINING_RULES = {
  tone: [
    "Trả lời tiếng Việt, thân thiện và dễ hiểu.",
    "Không dùng giọng quá máy móc.",
    "Không bịa số liệu. Nếu cần dữ liệu thật thì gọi API hoặc nói chưa có dữ liệu.",
    "Với bảng giá/gói, trả lời ngắn gọn theo nhu cầu của khách.",
    "Với review, chỉ trả bản tổng hợp, không trả raw review.",
  ],
  publicReviewRule:
    "Người dùng public chỉ được xem top dịch vụ, điểm tổng hợp và tóm tắt review đã kiểm duyệt.",
  partnerRule:
    "Đối tác dùng API key để gửi review, lấy summary, dùng quota và chỉ thao tác trong dịch vụ được cấp quyền.",
};

export const AI_TRAINING_QA = [
  {
    id: "smalltalk-thanks",
    category: "smalltalk",
    keywords: ["cảm ơn", "cam on", "thanks", "thank you"],
    question: "Cảm ơn bạn",
    answer: "Vâng, không có gì ạ. Chúc bạn một ngày tốt lành ạ 😊",
  },
  {
    id: "smalltalk-greeting",
    category: "smalltalk",
    keywords: ["xin chào", "xin chao", "chào bạn", "chao ban", "hello"],
    question: "Xin chào",
    answer: "Chào bạn ạ 😊 Bạn cần tôi tư vấn gói, xem dịch vụ uy tín hay tóm tắt review dịch vụ nào không ạ?",
  },
  {
    id: "smalltalk-identity",
    category: "smalltalk",
    keywords: ["bạn là ai", "ban la ai", "ai là gì", "tro ly", "trợ lý"],
    question: "Bạn là ai?",
    answer: "Tôi là AI hỗ trợ nhanh của ReviewHub. Tôi có thể tư vấn gói/bảng giá, giải thích quota/API key, gợi ý dịch vụ uy tín và tóm tắt review theo dữ liệu đã kiểm duyệt.",
  },
  {
    id: "smalltalk-capability",
    category: "smalltalk",
    keywords: ["bạn làm được gì", "ban lam duoc gi", "có thể làm gì", "co the lam gi", "hướng dẫn hỏi", "huong dan hoi"],
    question: "Bạn làm được gì?",
    answer: "Bạn có thể hỏi tôi theo 3 hướng: tư vấn gói/bảng giá, xem top dịch vụ uy tín hoặc tóm tắt review của một dịch vụ cụ thể. Ví dụ: ‘Gói nào có API key?’, ‘Top nhà xe uy tín’, hoặc ‘Tóm tắt review Sao Việt’. ",
  },
  {
    id: "pricing-basic",
    category: "pricing",
    keywords: ["gói cơ bản", "goi co ban", "starter", "mới bắt đầu", "moi bat dau"],
    question: "Tôi mới bắt đầu thì nên chọn gói nào?",
    answer:
      "Nếu bạn mới bắt đầu, nên chọn gói cơ bản để thử luồng lấy review, xem dữ liệu và kiểm tra quota. Khi lượng request hoặc nhu cầu AI moderation tăng, bạn có thể nâng lên gói cao hơn.",
  },
  {
    id: "pricing-api-key",
    category: "pricing",
    keywords: ["api key", "khóa api", "khoa api", "nhúng ai", "ai summary", "tóm tắt review"],
    question: "Gói nào có API key và AI tóm tắt review?",
    answer:
      "Tính năng API key và AI tóm tắt review nên đặt ở gói cao hoặc gói doanh nghiệp. Đối tác sẽ được cấp khóa API, chọn đúng dịch vụ đã đăng ký, gửi review về hệ thống và gắn nút AI lên website riêng.",
  },
  {
    id: "pricing-quota",
    category: "pricing",
    keywords: ["quota", "request", "lượt gọi", "luot goi", "bao nhiêu request"],
    question: "Quota dùng để làm gì?",
    answer:
      "Quota là số lượt gọi API hoặc AI trong một chu kỳ gói. Mỗi lần đối tác gọi API lấy dữ liệu, gửi review hoặc kiểm tra AI Summary thành công có thể tính vào quota tùy cấu hình hệ thống.",
  },
  {
    id: "payment-pending",
    category: "payment",
    keywords: ["thanh toán rồi", "thanh toan roi", "chưa thấy gói", "chua thay goi", "chưa kích hoạt", "chua kich hoat"],
    question: "Tôi thanh toán rồi nhưng chưa thấy gói thì làm sao?",
    answer:
      "Bạn vui lòng kiểm tra lại trạng thái thanh toán trong tài khoản. Nếu đã chuyển khoản nhưng gói chưa kích hoạt, hãy gửi mã giao dịch hoặc ảnh chuyển khoản để admin kiểm tra và duyệt thanh toán.",
  },
  {
    id: "ai-moderation",
    category: "ai",
    keywords: ["ai moderation", "kiểm duyệt ai", "kiem duyet ai", "duyệt review", "duyet review"],
    question: "AI moderation dùng để làm gì?",
    answer:
      "AI moderation giúp đọc review mới, phát hiện nội dung rủi ro, spam hoặc đánh giá cần xem lại. Admin vẫn là người quyết định cuối cùng để tránh duyệt nhầm.",
  },
  {
    id: "public-top-service",
    category: "public_review",
    keywords: ["dịch vụ uy tín", "dich vu uy tin", "top nhà xe", "top nha xe", "top khách sạn", "top khach san"],
    question: "Làm sao xem dịch vụ uy tín?",
    answer:
      "Bạn có thể chọn mục Phân tích dịch vụ uy tín, sau đó chọn nhóm như nhà xe, khách sạn, máy bay hoặc tour. Hệ thống sẽ xếp hạng dựa trên điểm trung bình, số review, tỷ lệ review tốt và review cần theo dõi.",
  },
  {
    id: "review-summary",
    category: "public_review",
    keywords: ["tóm tắt review", "tom tat review", "sao việt", "sao viet", "review nhà xe", "review nha xe"],
    question: "AI tóm tắt review hoạt động như thế nào?",
    answer:
      "Bạn nhập tên dịch vụ, ví dụ Sao Việt hoặc xe Sao Việt. Hệ thống sẽ tìm dịch vụ gần đúng, hỏi bạn xác nhận rồi trả về tổng review, điểm tốt, vấn đề cần theo dõi và gợi ý tham khảo.",
  },
  {
    id: "raw-review",
    category: "security",
    keywords: ["raw review", "dữ liệu thô", "du lieu tho", "có trả review gốc", "co tra review goc"],
    question: "AI có trả raw review không?",
    answer:
      "Không. AI Summary chỉ trả bản tổng hợp như tổng review, tỷ lệ tốt/xấu, điểm được khen và vấn đề cần theo dõi. Hệ thống không trả danh sách raw review cho người dùng public.",
  },
  {
    id: "partner-flow",
    category: "partner",
    keywords: ["đối tác dùng như nào", "doi tac dung nhu nao", "liên kết website", "lien ket website", "gắn web", "gan web"],
    question: "Đối tác muốn gắn AI vào website thì làm gì?",
    answer:
      "Đối tác vào trang Khóa API, chọn dịch vụ đã đăng ký, kiểm tra AI Summary rồi copy mã nhúng. Người làm website dán đoạn script đó vào website của đối tác để khách có thể bấm nút AI xem tóm tắt review.",
  },
  {
    id: "cors",
    category: "technical",
    keywords: ["cors", "blocked by cors", "không kết nối được", "khong ket noi duoc", "failed to fetch"],
    question: "Vì sao gắn web bị lỗi CORS?",
    answer:
      "Lỗi CORS xảy ra khi domain website đối tác chưa được backend cho phép gọi API. Khi chạy thật, cần mở CORS cho domain đối tác và không dùng localhost trong data-api-base.",
  },
];

export function getLocalTrainingPairs() {
  return safeReadJson(STORAGE_LOCAL_TRAINING, []);
}

export function addLocalTrainingPair(question, answer) {
  const q = String(question || "").trim();
  const a = String(answer || "").trim();

  if (!q || !a) {
    return {
      ok: false,
      message: "Cú pháp dạy AI chưa đúng. Ví dụ: dạy ai: hỏi quota là gì => Quota là số lượt gọi API trong tháng.",
    };
  }

  const pairs = getLocalTrainingPairs();
  const now = new Date().toISOString();
  const key = compactText(q);
  const exists = pairs.find((item) => compactText(item.question) === key);

  if (exists) {
    exists.answer = a;
    exists.updatedAt = now;
  } else {
    pairs.unshift({
      id: `local-${Date.now()}`,
      question: q,
      answer: a,
      keywords: [q],
      category: "local",
      createdAt: now,
      updatedAt: now,
    });
  }

  safeWriteJson(STORAGE_LOCAL_TRAINING, pairs.slice(0, 100));

  return {
    ok: true,
    message: "Đã học câu trả lời mới trên trình duyệt này. Lần sau hỏi lại, AI sẽ trả lời theo dữ liệu vừa dạy.",
  };
}

export function parseTrainingCommand(message) {
  const raw = String(message || "").trim();
  const normalized = normalizeText(raw);

  if (!normalized.startsWith("day ai") && !normalized.startsWith("train")) {
    return null;
  }

  const content = raw
    .replace(/^dạy\s*ai\s*:/i, "")
    .replace(/^day\s*ai\s*:/i, "")
    .replace(/^train\s*:/i, "")
    .trim();

  const parts = content.split("=>");

  if (parts.length < 2) {
    return {
      ok: false,
      message: "Cú pháp dạy AI: dạy ai: câu hỏi => câu trả lời",
    };
  }

  const question = parts.shift().trim();
  const answer = parts.join("=>").trim();

  return addLocalTrainingPair(question, answer);
}

function scoreItem(item, question) {
  const q = normalizeText(question);
  const qCompact = compactText(question);
  const keywords = item.keywords || [];
  let score = 0;

  const itemQuestion = normalizeText(item.question);
  const itemQuestionCompact = compactText(item.question);

  if (qCompact && qCompact === itemQuestionCompact) score += 100;
  if (q && itemQuestion.includes(q)) score += 60;
  if (qCompact && itemQuestionCompact.includes(qCompact)) score += 60;

  keywords.forEach((keyword) => {
    const k = normalizeText(keyword);
    const kCompact = compactText(keyword);

    if (!k) return;
    if (q.includes(k)) score += 35;
    if (qCompact.includes(kCompact)) score += 35;

    const tokens = k.split(" ").filter((token) => token.length >= 2);
    const hits = tokens.filter((token) => q.includes(token)).length;
    if (tokens.length && hits === tokens.length) score += 20;
    else if (hits > 0) score += hits * 5;
  });

  return score;
}

export function findTrainingAnswer(question, options = {}) {
  const localPairs = getLocalTrainingPairs();
  const localItems = localPairs.map((item) => ({
    ...item,
    keywords: item.keywords || [item.question],
    source: "local",
  }));

  const items = [...localItems, ...AI_TRAINING_QA];
  const ranked = items
    .map((item) => ({
      item,
      score: scoreItem(item, question),
    }))
    .filter((entry) => entry.score >= (options.minScore || 45))
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return null;

  const best = ranked[0].item;

  return {
    answer: best.answer,
    source: best.source || "training-file",
    category: best.category || "general",
    matchedQuestion: best.question,
  };
}

export function rememberUnansweredQuestion(question, meta = {}) {
  const q = String(question || "").trim();
  if (!q) return;

  const items = safeReadJson(STORAGE_UNANSWERED, []);
  const key = compactText(q);
  const now = new Date().toISOString();
  const exists = items.find((item) => compactText(item.question) === key);

  if (exists) {
    exists.count = Number(exists.count || 1) + 1;
    exists.lastAskedAt = now;
    exists.mode = meta.mode || exists.mode;
  } else {
    items.unshift({
      question: q,
      mode: meta.mode || "",
      count: 1,
      firstAskedAt: now,
      lastAskedAt: now,
    });
  }

  safeWriteJson(STORAGE_UNANSWERED, items.slice(0, 200));
}

export function getUnansweredQuestions() {
  return safeReadJson(STORAGE_UNANSWERED, []);
}

export function buildTrainingContext(question) {
  const matched = findTrainingAnswer(question, { minScore: 30 });

  if (!matched) {
    return "";
  }

  return [
    "Dữ liệu huấn luyện nội bộ của ReviewHub:",
    `Câu hỏi gần nhất: ${matched.matchedQuestion}`,
    `Câu trả lời mẫu: ${matched.answer}`,
    "Hãy dựa vào dữ liệu này để trả lời tự nhiên, ngắn gọn, dễ hiểu.",
  ].join("\n");
}
