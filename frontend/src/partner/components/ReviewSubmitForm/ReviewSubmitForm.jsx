import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { postReview } from "../../../services/reviewService";
import api from "../../../services/api";
import styles from "./ReviewSubmitForm.module.css";

const categories = [
  "Nhà xe",
  "Khách sạn",
  "Máy bay",
  "Tàu hỏa",
  "Tour",
  "Dịch vụ khác",
];

const CATEGORY_TO_SERVICE_SLUG = {
  "Nhà xe": "nha-xe",
  "Khách sạn": "khach-san",
  "Máy bay": "may-bay",
  "Tàu hỏa": "tau-hoa",
  "Tour": "tour",
  "Dịch vụ khác": "dich-vu-khac",
};

const CATEGORY_TO_IMAGE_FOLDER = {
  "Nhà xe": "nhaxe",
  "Khách sạn": "khachsan",
  "Máy bay": "maybay",
  "Tàu hỏa": "tauhoa",
  "Tour": "tour",
  "Dịch vụ khác": "dichvukhac",
};

const CODE_PREFIX_TO_CATEGORY = {
  PT: "Nhà xe",
  KS: "Khách sạn",
  MB: "Máy bay",
  TH: "Tàu hỏa",
  TO: "Tour",
  DV: "Dịch vụ khác",
};

function splitAssignedCodes(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[|,;\n]+/)
        .map((item) => normalizeCode(item))
        .filter(Boolean)
    )
  );
}

function inferCategoryFromCode(code) {
  const prefix = normalizeCode(code).split("-")[0];
  return CODE_PREFIX_TO_CATEGORY[prefix] || "Dịch vụ khác";
}

function pickOperatorCode(item) {
  return normalizeCode(
    item?.operatorCode ||
      item?.operator_code ||
      item?.serviceCode ||
      item?.service_code ||
      item?.code ||
      item?.id
  );
}

function pickOperatorName(item) {
  return (
    item?.operatorName ||
    item?.operator_name ||
    item?.serviceName ||
    item?.service_name ||
    item?.name ||
    ""
  );
}

function getServiceOptionByCode(code, operators, fallbackName = "") {
  const safeCode = normalizeCode(code);
  const matched = operators.find((item) => pickOperatorCode(item) === safeCode);
  const category = matched?.category || matched?.serviceCategory || inferCategoryFromCode(safeCode);
  const name = pickOperatorName(matched) || getDefaultTargetNameByCode(safeCode, fallbackName) || safeCode;

  return {
    code: safeCode,
    name,
    category,
    serviceSlug: CATEGORY_TO_SERVICE_SLUG[category] || "dich-vu-khac",
  };
}

const PUBLIC_REVIEW_STORAGE_KEY = "reviewhub-public-service-reviews";

const OPERATOR_NAME_BY_CODE = {
  "PT-001": "VeXeNhanh",
  "PT-002": "FUTA",
  "PT-003": "An Vui",
  "PT-004": "Thành Bưởi",
  "PT-005": "Phương Trang",
  "PT-006": "Kumho Samco",
  "PT-007": "Mai Linh Express",
  "PT-008": "Hoàng Long",
  "PT-009": "Hải Vân",
  "PT-010": "G8 Sapa Open Tour",
  "PT-011": "Sao Việt",
  "PT-012": "Inter Bus Lines",
  "PT-013": "Sao Việt",
};

function getDefaultTargetNameByCode(code, fallbackName = "") {
  const normalizedCode = normalizeCode(code);
  return OPERATOR_NAME_BY_CODE[normalizedCode] || fallbackName || "";
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function makeFallbackReviewId(operatorCode) {
  const safeCode = normalizeCode(operatorCode) || "PT-000";
  const randomPart =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
      : Math.random().toString(16).slice(2, 10).toUpperCase();

  return `${safeCode}-${randomPart}`;
}

function parseReviewId(reviewId, fallbackOperatorCode = "") {
  const value = String(reviewId || "").trim();
  const match = value.match(/^([A-Z]{2}-\d{3})-(.+)$/i);

  if (match) {
    return {
      operatorCode: match[1].toUpperCase(),
      imageCode: match[2],
      imageFileName: `${match[2]}.webp`,
    };
  }

  const operatorCode = normalizeCode(fallbackOperatorCode);
  const imageCode = value || Math.random().toString(16).slice(2, 10).toUpperCase();

  return {
    operatorCode,
    imageCode,
    imageFileName: `${imageCode}.webp`,
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
      reject(new Error("Không đọc được ảnh."));
    };

    image.src = objectUrl;
  });
}

async function convertToWebpFile(file, outputName) {
  try {
    const image = await fileToImage(file);

    const maxSize = 1200;
    const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.82);
    });

    if (!blob) {
      return new File([file], outputName, {
        type: file.type || "application/octet-stream",
      });
    }

    return new File([blob], outputName, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return new File([file], outputName, {
      type: file.type || "application/octet-stream",
    });
  }
}

function readStoredReviews(key) {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeStoredReviews(key, reviews) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(reviews));
}

function upsertReviewToLocalHub(review) {
  if (typeof window === "undefined" || !review) return;

  const serviceSlug = review.serviceSlug || CATEGORY_TO_SERVICE_SLUG[review.category] || "nha-xe";

  const keys = [
    PUBLIC_REVIEW_STORAGE_KEY,
    `${PUBLIC_REVIEW_STORAGE_KEY}:${serviceSlug}`,
  ];

  keys.forEach((key) => {
    const current = readStoredReviews(key);
    const stableId = String(review.id || "");
    const next = current.filter((item) => String(item.id || item.reviewId || "") !== stableId);

    next.unshift(review);

    writeStoredReviews(key, next);
  });

  window.dispatchEvent(
    new CustomEvent("reviewhub:public-review-created", {
      detail: review,
    })
  );

  window.dispatchEvent(new Event("storage"));
}

async function uploadReviewImage({ createdReview, selectedImage, category, fallbackOperatorCode }) {
  if (!selectedImage || !createdReview?.id) return null;

  const { operatorCode, imageFileName } = parseReviewId(createdReview.id, fallbackOperatorCode);
  const categoryFolder = CATEGORY_TO_IMAGE_FOLDER[category] || "nhaxe";

  if (!operatorCode || !imageFileName) {
    throw new Error("Không tách được mã review để đặt tên ảnh.");
  }

  const webpFile = await convertToWebpFile(selectedImage, imageFileName);

  const formData = new FormData();
  formData.append("file", webpFile, imageFileName);
  formData.append("reviewId", createdReview.id);
  formData.append("operatorCode", operatorCode);
  formData.append("categoryFolder", categoryFolder);
  formData.append("imageFileName", imageFileName);
  formData.append("publicPath", `/anhdanggia/${categoryFolder}/${operatorCode}/${imageFileName}`);

  const uploadCandidates = [
    `/api/reviews/${encodeURIComponent(createdReview.id)}/image`,
    `/api/partner/reviews/${encodeURIComponent(createdReview.id)}/image`,
    `/api/review-images/upload`,
  ];

  let lastError = null;

  for (const url of uploadCandidates) {
    try {
      const response = await api.post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000,
      });

      return {
        ...response.data,
        imageUrl:
          response.data?.imageUrl ||
          `/anhdanggia/${categoryFolder}/${operatorCode}/${imageFileName}`,
        imageFileName,
        operatorCode,
        categoryFolder,
        uploadOk: true,
      };
    } catch (error) {
      lastError = error;

      // Nếu không phải 404 thì có thể là lỗi thật như file quá lớn/server lỗi.
      // Vẫn thử endpoint tiếp theo để tránh sai route.
      continue;
    }
  }

  const status = lastError?.response?.status;
  const message =
    status === 404
      ? "Backend chưa có API upload ảnh hoặc chưa restart backend sau khi thêm controller."
      : lastError?.response?.data?.message ||
        lastError?.response?.data?.detail ||
        lastError?.message ||
        "Upload ảnh lỗi.";

  const error = new Error(message);
  error.cause = lastError;
  error.uploadMeta = {
    imageUrl: `/anhdanggia/${categoryFolder}/${operatorCode}/${imageFileName}`,
    imageFileName,
    operatorCode,
    categoryFolder,
  };

  throw error;
}


const EXCEL_TEMPLATE_HEADERS = [
  "ma_dich_vu",
  "ten_dich_vu",
  "danh_muc",
  "nguoi_review",
  "rating",
  "noi_dung_review",
];

const EXCEL_HEADER_ALIASES = {
  madichvu: "ma_dich_vu",
  madv: "ma_dich_vu",
  maservice: "ma_dich_vu",
  matuyen: "ma_dich_vu",
  manhaxe: "ma_dich_vu",
  makhachsan: "ma_dich_vu",
  servicecode: "ma_dich_vu",
  operatorcode: "ma_dich_vu",
  targetcode: "ma_dich_vu",

  tendichvu: "ten_dich_vu",
  tenservice: "ten_dich_vu",
  tendoituong: "ten_dich_vu",
  tennhaxe: "ten_dich_vu",
  tenkhachsan: "ten_dich_vu",
  servicename: "ten_dich_vu",
  operatorname: "ten_dich_vu",
  targetname: "ten_dich_vu",

  danhmuc: "danh_muc",
  loaidichvu: "danh_muc",
  category: "danh_muc",

  nguoireview: "nguoi_review",
  tennguoireview: "nguoi_review",
  tenkhach: "nguoi_review",
  khachhang: "nguoi_review",
  reviewer: "nguoi_review",
  reviewername: "nguoi_review",
  customername: "nguoi_review",

  rating: "rating",
  sosao: "rating",
  diem: "rating",
  danhgia: "rating",
  stars: "rating",
  score: "rating",

  noidungreview: "noi_dung_review",
  noidung: "noi_dung_review",
  binhluan: "noi_dung_review",
  comment: "noi_dung_review",
  content: "noi_dung_review",
  reviewtext: "noi_dung_review",
  text: "noi_dung_review",
};

function normalizeExcelHeader(value) {
  const compact = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

  return EXCEL_HEADER_ALIASES[compact] || compact;
}

function normalizeExcelRow(rawRow) {
  const normalized = {};

  Object.entries(rawRow || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeExcelHeader(key);
    if (!normalizedKey) return;
    normalized[normalizedKey] = value;
  });

  return normalized;
}

function cleanExcelText(value) {
  return String(value ?? "").trim();
}

function parseExcelRating(value) {
  const number = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number)) return 5;
  return Math.min(5, Math.max(1, Math.round(number)));
}

function downloadExcelBlob(workbook, fileName) {
  XLSX.writeFile(workbook, fileName);
}

function makeReviewTemplateWorkbook(selectedService) {
  const service = selectedService || {};
  const code = service.code || "PT-013";
  const name = service.name || "Sao Việt";
  const category = service.category || inferCategoryFromCode(code);

  const sampleRows = [
    [code, name, category, "Nguyễn Văn A", 5, "Xe sạch, tài xế lịch sự và khởi hành đúng giờ."],
    [code, name, category, "Trần Thị B", 4, "Dịch vụ ổn, nhân viên hỗ trợ nhiệt tình."],
    [code, name, category, "", 5, ""],
    [code, name, category, "", 5, ""],
    [code, name, category, "", 5, ""],
    [code, name, category, "", 5, ""],
    [code, name, category, "", 5, ""],
    [code, name, category, "", 5, ""],
    [code, name, category, "", 5, ""],
    [code, name, category, "", 5, ""],
  ];

  const workbook = XLSX.utils.book_new();
  const reviewSheet = XLSX.utils.aoa_to_sheet([
    EXCEL_TEMPLATE_HEADERS,
    ...sampleRows,
  ]);

  reviewSheet["!cols"] = [
    { wch: 14 },
    { wch: 26 },
    { wch: 16 },
    { wch: 22 },
    { wch: 10 },
    { wch: 55 },
  ];

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ["Hướng dẫn nhập review hàng loạt"],
    ["1", "Không đổi tên cột ở dòng đầu tiên."],
    ["2", "Khách chỉ cần điền nguoi_review và noi_dung_review. Rating có thể để 5 nếu không cần đổi."],
    ["3", "Excel import không đi kèm ảnh. Muốn gửi ảnh thì dùng form gửi 1 review bên ngoài."],
    ["4", "Mỗi dòng hợp lệ sẽ được gửi vào hàng chờ admin duyệt."],
    ["5", "ma_dich_vu phải là dịch vụ đã mua / đã được admin gán cho tài khoản."],
  ]);

  guideSheet["!cols"] = [{ wch: 10 }, { wch: 90 }];

  XLSX.utils.book_append_sheet(workbook, reviewSheet, "Review");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Huong_dan");

  return workbook;
}

function readExcelWorkbook(file) {
  return file.arrayBuffer().then((buffer) => XLSX.read(buffer, { type: "array" }));
}

function parseExcelReviewsFromWorkbook(workbook, selectedService, assignedServiceOptions) {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    return {
      rows: [],
      errors: ["File Excel không có sheet dữ liệu."],
    };
  }

  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  const rows = [];
  const errors = [];

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const row = normalizeExcelRow(rawRow);

    const hasAnyValue = Object.values(row).some((value) => cleanExcelText(value));
    if (!hasAnyValue) return;

    const rawCode = normalizeCode(row.ma_dich_vu || selectedService?.code || "");
    const service =
      assignedServiceOptions.find((item) => item.code === rawCode) ||
      assignedServiceOptions.find((item) => item.code === selectedService?.code);

    const reviewerName = cleanExcelText(row.nguoi_review);
    const comment = cleanExcelText(row.noi_dung_review);
    const rating = parseExcelRating(row.rating);

    const rowErrors = [];

    if (!service) {
      rowErrors.push(`Dòng ${rowNumber}: mã dịch vụ "${rawCode || "trống"}" không thuộc dịch vụ đã đăng ký.`);
    }

    if (!reviewerName) {
      rowErrors.push(`Dòng ${rowNumber}: thiếu tên người review.`);
    }

    if (!comment) {
      rowErrors.push(`Dòng ${rowNumber}: thiếu nội dung review.`);
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    rows.push({
      rowNumber,
      service,
      reviewerName,
      rating,
      comment,
    });
  });

  if (!rows.length && !errors.length) {
    errors.push("File Excel chưa có dòng review hợp lệ.");
  }

  return { rows, errors };
}

export default function ReviewSubmitForm({
  partnerName = "Đối tác",
  operatorCode = "",
  targetCode = "",
  targetName = "",
  serviceSlug = "nha-xe",
  onSubmitSuccess,
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [operators, setOperators] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelRows, setExcelRows] = useState([]);
  const [excelErrors, setExcelErrors] = useState([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const defaultCode = normalizeCode(targetCode || operatorCode || "PT-013");
  const defaultName = getDefaultTargetNameByCode(defaultCode, targetName || partnerName || "");

  const [form, setForm] = useState({
    category: "Nhà xe",
    targetCode: defaultCode,
    targetName: defaultName,
    reviewerName: "Nguyễn Văn A",
    rating: 5,
    comment: "Xe sạch, tài xế lịch sự và khởi hành đúng giờ.",
    visibility: "private",
  });

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.get("/api/auth/me"),
      api.get("/api/operators"),
    ])
      .then(([meResult, operatorsResult]) => {
        if (!mounted) return;

        if (meResult.status === "fulfilled") {
          setCurrentUser(meResult.value?.data || null);
        }

        if (operatorsResult.status === "fulfilled") {
          setOperators(Array.isArray(operatorsResult.value?.data) ? operatorsResult.value.data : []);
        }
      })
      .finally(() => {
        if (mounted) setLoadingServices(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const assignedCodes = useMemo(() => {
    const raw =
      currentUser?.assignedOperatorCode ||
      currentUser?.assigned_operator_code ||
      currentUser?.partnerCode ||
      currentUser?.partner_code ||
      targetCode ||
      operatorCode ||
      defaultCode;

    return splitAssignedCodes(raw);
  }, [currentUser, targetCode, operatorCode, defaultCode]);

  const assignedServiceOptions = useMemo(() => {
    return assignedCodes.map((code) =>
      getServiceOptionByCode(
        code,
        operators,
        targetName || currentUser?.orgName || currentUser?.businessName || partnerName
      )
    );
  }, [assignedCodes, operators, targetName, currentUser, partnerName]);

  const selectedService = useMemo(() => {
    const currentCode = normalizeCode(form.targetCode);
    return (
      assignedServiceOptions.find((item) => item.code === currentCode) ||
      assignedServiceOptions[0] ||
      getServiceOptionByCode(currentCode || defaultCode, operators, targetName || partnerName)
    );
  }, [assignedServiceOptions, form.targetCode, defaultCode, operators, targetName, partnerName]);

  useEffect(() => {
    if (!assignedServiceOptions.length) return;

    setForm((prev) => {
      const selected =
        assignedServiceOptions.find((item) => item.code === normalizeCode(prev.targetCode)) ||
        assignedServiceOptions[0];

      if (!selected) return prev;

      const alreadySynced =
        normalizeCode(prev.targetCode) === selected.code &&
        prev.targetName === selected.name &&
        prev.category === selected.category &&
        prev.visibility === "private";

      if (alreadySynced) return prev;

      return {
        ...prev,
        targetCode: selected.code,
        targetName: selected.name,
        category: selected.category,
        visibility: "private",
      };
    });
  }, [assignedServiceOptions]);

  const normalizedTargetCode = selectedService?.code || normalizeCode(form.targetCode || targetCode || operatorCode);
  const normalizedServiceSlug = selectedService?.serviceSlug || CATEGORY_TO_SERVICE_SLUG[form.category] || serviceSlug || "nha-xe";

  const payload = useMemo(() => {
    const safeCode = normalizedTargetCode || "PT-000";
    const safeName = selectedService?.name || form.targetName || targetName || partnerName || "Không rõ đối tượng";
    const ownerCode = currentUser?.id || currentUser?.email || currentUser?.partnerCode || currentUser?.partner_code || safeCode;

    return {
      ...form,

      id: undefined,

      category: form.category,
      serviceSlug: normalizedServiceSlug,
      service_slug: normalizedServiceSlug,

      targetCode: safeCode,
      target_code: safeCode,
      operatorCode: safeCode,
      operator_code: safeCode,
      partnerCode: safeCode,
      partner_code: safeCode,
      ownerPartnerCode: ownerCode,
      owner_partner_code: ownerCode,
      code: safeCode,

      targetName: safeName,
      target_name: safeName,
      operatorName: safeName,
      operator_name: safeName,
      partnerName: safeName,
      partner_name: safeName,
      name: safeName,

      reviewerName: form.reviewerName,
      userName: form.reviewerName,
      authorName: form.reviewerName,
      customerName: form.reviewerName,

      rating: Number(form.rating || 0),
      score: Number(form.rating || 0),
      stars: Number(form.rating || 0),

      comment: form.comment,
      content: form.comment,
      reviewText: form.comment,
      text: form.comment,

      sourceSystem: "partner-web",
      source: "partner-web",
      visibility: "private",
      moderationStatus: "pending_review",
      status: "pending_review",
      reviewStatus: "pending_review",

      partnerName,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
  }, [form, normalizedTargetCode, normalizedServiceSlug, targetName, partnerName, selectedService, currentUser]);

  function handleChange(field, value) {
    setForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === "targetCode") {
        const selected = assignedServiceOptions.find((item) => item.code === normalizeCode(value));

        if (selected) {
          next.targetCode = selected.code;
          next.targetName = selected.name;
          next.category = selected.category;
          next.visibility = "private";
        }
      }

      return next;
    });
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    if (!file) {
      setSelectedImage(null);
      setImagePreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("File được chọn không phải ảnh.");
      event.target.value = "";
      setSelectedImage(null);
      setImagePreviewUrl("");
      return;
    }

    const maxSizeMb = 8;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setMessage(`Ảnh không được vượt quá ${maxSizeMb}MB.`);
      event.target.value = "";
      setSelectedImage(null);
      setImagePreviewUrl("");
      return;
    }

    setMessage("");
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImage(null);
    setImagePreviewUrl("");
  }

  function buildExcelPayload(row) {
    const safeCode = row.service?.code || normalizedTargetCode || "PT-000";
    const safeName = row.service?.name || selectedService?.name || form.targetName || targetName || partnerName || "Không rõ đối tượng";
    const category = row.service?.category || selectedService?.category || form.category;
    const slug = row.service?.serviceSlug || CATEGORY_TO_SERVICE_SLUG[category] || normalizedServiceSlug;
    const ownerCode = currentUser?.id || currentUser?.email || currentUser?.partnerCode || currentUser?.partner_code || safeCode;
    const now = new Date().toISOString();

    return {
      category,
      serviceSlug: slug,
      service_slug: slug,

      targetCode: safeCode,
      target_code: safeCode,
      operatorCode: safeCode,
      operator_code: safeCode,
      partnerCode: safeCode,
      partner_code: safeCode,
      ownerPartnerCode: ownerCode,
      owner_partner_code: ownerCode,
      code: safeCode,

      targetName: safeName,
      target_name: safeName,
      operatorName: safeName,
      operator_name: safeName,
      partnerName: safeName,
      partner_name: safeName,
      name: safeName,

      reviewerName: row.reviewerName,
      userName: row.reviewerName,
      authorName: row.reviewerName,
      customerName: row.reviewerName,

      rating: Number(row.rating || 5),
      score: Number(row.rating || 5),
      stars: Number(row.rating || 5),

      comment: row.comment,
      content: row.comment,
      reviewText: row.comment,
      text: row.comment,

      sourceSystem: "partner-web",
      source: "partner-web",
      visibility: "private",
      moderationStatus: "pending_review",
      status: "pending_review",
      reviewStatus: "pending_review",

      createdAt: now,
      created_at: now,
    };
  }

  function handleDownloadExcelTemplate() {
    if (!selectedService?.code) {
      setMessage("Chưa có dịch vụ được gán nên chưa thể tải file mẫu.");
      return;
    }

    const workbook = makeReviewTemplateWorkbook(selectedService);
    const fileName = `mau-review-${selectedService.code}.xlsx`;
    downloadExcelBlob(workbook, fileName);
  }

  async function handleExcelFileChange(event) {
    const file = event.target.files?.[0];

    setExcelRows([]);
    setExcelErrors([]);
    setExcelFileName(file?.name || "");

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["xlsx", "xls"].includes(extension || "")) {
      setExcelErrors(["Chỉ hỗ trợ file Excel .xlsx hoặc .xls."]);
      event.target.value = "";
      return;
    }

    try {
      const workbook = await readExcelWorkbook(file);
      const result = parseExcelReviewsFromWorkbook(
        workbook,
        selectedService,
        assignedServiceOptions
      );

      setExcelRows(result.rows);
      setExcelErrors(result.errors);
    } catch (error) {
      setExcelRows([]);
      setExcelErrors([
        error?.message || "Không đọc được file Excel. Vui lòng tải lại file mẫu và nhập lại.",
      ]);
    }
  }

  function handleClearExcelFile() {
    setExcelFileName("");
    setExcelRows([]);
    setExcelErrors([]);
  }

  async function handleBulkSubmit() {
    if (bulkSubmitting || submitting) return;

    if (excelErrors.length) {
      setMessage("File Excel còn lỗi, vui lòng sửa rồi tải lại.");
      return;
    }

    if (!excelRows.length) {
      setMessage("Chưa có review hợp lệ trong file Excel.");
      return;
    }

    setBulkSubmitting(true);
    setMessage("");

    const failed = [];
    const successItems = [];

    for (const row of excelRows) {
      try {
        const rowPayload = buildExcelPayload(row);
        let created = await postReview(rowPayload);

        if (!created || typeof created !== "object") {
          created = {};
        }

        const finalId = created.id || created.reviewId || makeFallbackReviewId(rowPayload.targetCode);
        const finalReview = {
          ...rowPayload,
          ...created,
          id: finalId,
          reviewId: finalId,
          sourceSystem: created.sourceSystem || created.source || "partner-web",
          visibility: created.visibility || "private",
          moderationStatus: created.moderationStatus || created.status || "pending_review",
          status: created.status || created.moderationStatus || "pending_review",
          hasImage: false,
          imageUrl: "",
          reviewImage: "",
        };

        successItems.push(finalReview);
        onSubmitSuccess?.(finalReview);
      } catch (error) {
        failed.push({
          rowNumber: row.rowNumber,
          message:
            error?.response?.data?.message ||
            error?.response?.data?.detail ||
            error?.message ||
            "Không gửi được review.",
        });
      }
    }

    setBulkSubmitting(false);

    if (failed.length) {
      setExcelErrors(
        failed.map((item) => `Dòng ${item.rowNumber}: ${item.message}`)
      );
      setMessage(`Đã gửi thành công ${successItems.length}/${excelRows.length} review. ${failed.length} dòng bị lỗi.`);
      return;
    }

    setMessage(`Đã gửi thành công ${successItems.length} review từ Excel vào hàng chờ admin duyệt. Import Excel không kèm hình ảnh.`);
    setExcelFileName("");
    setExcelRows([]);
    setExcelErrors([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setMessage("");

    try {
      let created = await postReview(payload);

      if (!created || typeof created !== "object") {
        created = {};
      }

      const finalId = created.id || created.reviewId || makeFallbackReviewId(payload.targetCode);

      created = {
        ...payload,
        ...created,
        id: finalId,
        reviewId: finalId,

        targetCode: created.targetCode || created.target_code || payload.targetCode,
        target_code: created.target_code || created.targetCode || payload.targetCode,
        operatorCode: created.operatorCode || created.operator_code || payload.operatorCode,
        operator_code: created.operator_code || created.operatorCode || payload.operatorCode,
        partnerCode: created.partnerCode || created.partner_code || payload.partnerCode,
        partner_code: created.partner_code || created.partnerCode || payload.partnerCode,
        ownerPartnerCode: created.ownerPartnerCode || created.owner_partner_code || payload.ownerPartnerCode,
        owner_partner_code: created.owner_partner_code || created.ownerPartnerCode || payload.ownerPartnerCode,

        targetName: created.targetName || created.target_name || payload.targetName,
        target_name: created.target_name || created.targetName || payload.targetName,
        operatorName: created.operatorName || created.operator_name || payload.operatorName,
        operator_name: created.operator_name || created.operatorName || payload.operatorName,
        partnerName: created.partnerName || created.partner_name || payload.partnerName,
        partner_name: created.partner_name || created.partnerName || payload.partnerName,

        sourceSystem: created.sourceSystem || created.source || "partner-web",
        source: created.source || created.sourceSystem || "partner-web",
        serviceSlug: created.serviceSlug || created.service_slug || normalizedServiceSlug,
        service_slug: created.service_slug || created.serviceSlug || normalizedServiceSlug,
        visibility: created.visibility || payload.visibility || "private",
        moderationStatus: created.moderationStatus || created.status || "pending_review",
        status: created.status || created.moderationStatus || "pending_review",
        createdAt: created.createdAt || created.created_at || payload.createdAt,
        created_at: created.created_at || created.createdAt || payload.createdAt,
      };

      let uploadedImage = null;
      let imageUploadWarning = "";

      if (selectedImage) {
        try {
          uploadedImage = await uploadReviewImage({
            createdReview: created,
            selectedImage,
            category: form.category,
            fallbackOperatorCode: created.targetCode,
          });
        } catch (uploadError) {
          // Không cho upload ảnh làm hỏng việc gửi review.
          // Review vẫn vào hàng chờ duyệt; không hiển thị ở partner khi chưa approved.
          imageUploadWarning =
            uploadError?.message ||
            "Review đã gửi nhưng upload ảnh chưa thành công.";

          uploadedImage = {
            ...(uploadError?.uploadMeta || {}),
            imageUrl: "",
            uploadOk: false,
          };
        }
      }

      const finalReview = {
        ...created,
        imageUrl: uploadedImage?.uploadOk ? uploadedImage?.imageUrl : created.imageUrl || "",
        reviewImage: uploadedImage?.uploadOk ? uploadedImage?.imageUrl : created.reviewImage || "",
        imageFileName: uploadedImage?.imageFileName || "",
        hasImage: Boolean(uploadedImage?.uploadOk && uploadedImage?.imageUrl),
        localImagePreviewUrl: imagePreviewUrl || "",
      };

      // Không ghi vào localStorage/public hub nữa. Review partner phải chờ admin duyệt mới được hiển thị.

      setMessage(
        selectedImage
          ? imageUploadWarning
            ? `Đã gửi review ${finalReview.id || ""} vào hàng chờ admin duyệt. Ảnh chưa lưu được: ${imageUploadWarning}`
            : `Đã gửi review ${finalReview.id || ""} vào hàng chờ admin duyệt. Ảnh đã lưu tên ${finalReview.imageFileName || ""}.`
          : `Đã gửi review ${finalReview.id || ""} vào hàng chờ admin duyệt. Partner sẽ chỉ thấy sau khi admin duyệt.`
      );

      onSubmitSuccess?.(finalReview);

      setSelectedImage(null);
      setImagePreviewUrl("");
    } catch (error) {
      const detail =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        "";

      setMessage(
        detail
          ? `Gửi review thất bại hoặc upload ảnh lỗi: ${detail}`
          : "Gửi review thất bại."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.surface}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.kicker}>Partner review</p>

          <h2>Gửi review mới</h2>

          <p className={styles.description}>
            Gửi lẻ vẫn hỗ trợ ảnh như cũ. Excel chỉ dùng để gửi nhiều review cùng lúc và không kèm hình ảnh.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.templateTopBtn}
            onClick={handleDownloadExcelTemplate}
            disabled={!selectedService?.code || loadingServices}
          >
            Tải mẫu Excel
          </button>

          <span>Nhập nhiều review</span>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>01</span>

            <div>
              <h3>Thông tin phân loại</h3>

              <p>Danh mục và mã dịch vụ cần gắn với đánh giá.</p>
            </div>
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Dịch vụ / địa điểm đã đăng ký</span>

              <select
                value={form.targetCode}
                onChange={(e) => handleChange("targetCode", e.target.value)}
                disabled={loadingServices || assignedServiceOptions.length === 0}
              >
                {assignedServiceOptions.length === 0 ? (
                  <option value="">Chưa có dịch vụ được gán</option>
                ) : (
                  assignedServiceOptions.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name} — {item.code}
                    </option>
                  ))
                )}
              </select>

              <small className={styles.fieldHint}>
                Chỉ hiện các nhà xe, khách sạn hoặc dịch vụ đã mua / đã được admin gán cho tài khoản này.
              </small>
            </label>

            <div className={styles.pendingBox}>
              <span>Luồng kiểm duyệt</span>
              <strong>Chờ admin duyệt</strong>
              <small>Review này là dữ liệu riêng của tài khoản partner. Chỉ sau khi admin duyệt, đúng tài khoản này mới nhìn thấy.</small>
            </div>
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Mã dịch vụ</span>
              <input value={form.targetCode || ""} readOnly disabled />
            </label>

            <label className={styles.field}>
              <span>Danh mục</span>
              <input value={form.category || ""} readOnly disabled />
            </label>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>02</span>

            <div>
              <h3>Thông tin review</h3>

              <p>Thông tin đánh giá từ khách hàng.</p>
            </div>
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Tên dịch vụ</span>

              <input
                value={form.targetName}
                readOnly
                disabled
                placeholder="Dịch vụ được gán cho tài khoản"
              />
            </label>

            <label className={styles.field}>
              <span>Người review</span>

              <input
                value={form.reviewerName}
                onChange={(e) =>
                  handleChange("reviewerName", e.target.value)
                }
                placeholder="Nguyễn Văn A"
              />
            </label>
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Rating</span>

              <select
                value={form.rating}
                onChange={(e) =>
                  handleChange("rating", e.target.value)
                }
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} sao
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>Nội dung review</span>

            <textarea
              rows={5}
              value={form.comment}
              onChange={(e) =>
                handleChange("comment", e.target.value)
              }
              placeholder="Nhập nội dung review..."
            />
          </label>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>03</span>

            <div>
              <h3>Ảnh đánh giá</h3>

              <p>Chọn 1 ảnh khi gửi lẻ. Import Excel sẽ không đi kèm hình ảnh.</p>
            </div>
          </div>

          <label className={styles.uploadBox}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleImageChange}
            />

            {imagePreviewUrl ? (
              <div className={styles.uploadPreview}>
                <img src={imagePreviewUrl} alt="Ảnh review đã chọn" />

                <div>
                  <strong>{selectedImage?.name}</strong>
                  <span>
                    Ví dụ review PT-013-1F9021D0 thì ảnh sẽ lưu là
                    {" "}1F9021D0.webp trong folder PT-013.
                  </span>
                </div>
              </div>
            ) : (
              <div className={styles.uploadEmpty}>
                <span>+</span>
                <div>
                  <strong>Chọn ảnh đánh giá</strong>
                  <small>JPG, PNG, WEBP · tối đa 8MB · tự convert sang .webp</small>
                </div>
              </div>
            )}
          </label>

          {imagePreviewUrl && (
            <button
              type="button"
              className={styles.removeImageBtn}
              onClick={handleRemoveImage}
            >
              Xóa ảnh đã chọn
            </button>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>04</span>

            <div>
              <h3>Gửi nhiều review bằng Excel</h3>

              <p>Dùng cho import hàng loạt. File Excel không kèm hình ảnh, còn gửi lẻ phía trên vẫn giữ ảnh như cũ.</p>
            </div>
          </div>

          <div className={styles.excelPanel}>
            <div className={styles.excelIntro}>
              <div>
                <strong>File mẫu theo dịch vụ đang chọn</strong>
                <span>
                  Mã dịch vụ, tên dịch vụ và danh mục đã được điền sẵn. Import Excel không hỗ trợ ảnh đi kèm.
                </span>
              </div>

              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleDownloadExcelTemplate}
                disabled={!selectedService?.code || loadingServices}
              >
                Tải file mẫu Excel
              </button>
            </div>

            <label className={styles.excelUploadBox}>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleExcelFileChange}
              />

              <div>
                <strong>{excelFileName || "Upload file Excel đã điền review"}</strong>
                <span>.xlsx hoặc .xls · nhiều review cùng lúc · không kèm hình ảnh</span>
              </div>
            </label>

            {(excelRows.length > 0 || excelErrors.length > 0) && (
              <div className={styles.excelResultBox}>
                <div className={styles.excelSummary}>
                  <span>Hợp lệ</span>
                  <strong>{excelRows.length}</strong>
                  <small>review sẵn sàng gửi</small>
                </div>

                <div className={`${styles.excelSummary} ${excelErrors.length ? styles.excelSummaryError : ""}`}>
                  <span>Lỗi</span>
                  <strong>{excelErrors.length}</strong>
                  <small>dòng cần kiểm tra</small>
                </div>
              </div>
            )}

            {excelRows.length > 0 && (
              <div className={styles.excelPreview}>
                <strong>Xem trước {Math.min(excelRows.length, 5)} dòng đầu</strong>

                <div className={styles.excelPreviewTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>Dòng</th>
                        <th>Dịch vụ</th>
                        <th>Người review</th>
                        <th>Sao</th>
                        <th>Nội dung</th>
                      </tr>
                    </thead>

                    <tbody>
                      {excelRows.slice(0, 5).map((row) => (
                        <tr key={`${row.rowNumber}-${row.reviewerName}`}>
                          <td>{row.rowNumber}</td>
                          <td>{row.service?.name || row.service?.code}</td>
                          <td>{row.reviewerName}</td>
                          <td>{row.rating}</td>
                          <td>{row.comment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {excelErrors.length > 0 && (
              <div className={styles.excelErrors}>
                <strong>Cần sửa trong file Excel</strong>
                <ul>
                  {excelErrors.slice(0, 6).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
                {excelErrors.length > 6 && <small>Còn {excelErrors.length - 6} lỗi khác...</small>}
              </div>
            )}

            <div className={styles.excelActions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleBulkSubmit}
                disabled={bulkSubmitting || submitting || excelRows.length === 0 || excelErrors.length > 0}
              >
                {bulkSubmitting ? "Đang gửi Excel..." : `Gửi ${excelRows.length || ""} review từ Excel`}
              </button>

              {(excelRows.length > 0 || excelFileName || excelErrors.length > 0) && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleClearExcelFile}
                  disabled={bulkSubmitting}
                >
                  Xóa file Excel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={submitting || assignedServiceOptions.length === 0}
          >
            {submitting ? "Đang gửi..." : "Gửi review chờ duyệt"}
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => console.log(payload)}
          >
            Xem JSON
          </button>
        </div>

        {message && (
          <div className={styles.notice}>{message}</div>
        )}
      </form>
    </section>
  );
}
