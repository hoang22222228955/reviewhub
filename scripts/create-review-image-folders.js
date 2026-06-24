/**
 * create-review-image-folders.js
 *
 * Chức năng:
 * - Đọc file seed-operators.js
 * - Lấy toàn bộ mã dịch vụ: PT-001, KS-001, MB-001, TH-001, TO-001, DV-001...
 * - Tự tạo folder ảnh đánh giá trong:
 *
 * frontend/public/anhdanggia/
 *   nhaxe/PT-001/
 *   khachsan/KS-001/
 *   maybay/MB-001/
 *   tauhoa/TH-001/
 *   tour/TO-001/
 *   dichvukhac/DV-001/
 *
 * Chạy:
 * node scripts/create-review-image-folders.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Tự dò file seed ở vài vị trí hay dùng
const SEED_FILE_CANDIDATES = [
  path.join(ROOT, "seed-operators.js"),
  path.join(ROOT, "backend", "seed-operators.js"),
  path.join(ROOT, "database", "seed-operators.js"),
  path.join(ROOT, "scripts", "seed-operators.js"),
];

// Folder ảnh đầu ra
const OUTPUT_ROOT = path.join(ROOT, "frontend", "public", "anhdanggia");

const CATEGORY_BY_PREFIX = {
  PT: "nhaxe",
  KS: "khachsan",
  MB: "maybay",
  TH: "tauhoa",
  TO: "tour",
  DV: "dichvukhac",
};

function findSeedFile() {
  const found = SEED_FILE_CANDIDATES.find((filePath) => fs.existsSync(filePath));

  if (!found) {
    console.error("❌ Không tìm thấy file seed-operators.js.");
    console.log("\nHãy kiểm tra file seed của bạn nằm ở đâu.");
    console.log("Script đang dò các vị trí:");
    SEED_FILE_CANDIDATES.forEach((item) => console.log(" -", item));
    process.exit(1);
  }

  return found;
}

function extractCodes(seedContent) {
  const regex = /code\s*:\s*['"`]([A-Z]{2}-\d{3})['"`]/g;
  const codes = new Set();

  let match;
  while ((match = regex.exec(seedContent)) !== null) {
    codes.add(match[1].trim());
  }

  return Array.from(codes).sort((a, b) => a.localeCompare(b));
}

function getCategoryFromCode(code) {
  const prefix = code.split("-")[0];
  return CATEGORY_BY_PREFIX[prefix] || "khac";
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }

  return false;
}

function writeGitKeep(dirPath) {
  // Folder rỗng sẽ không được Git push lên, nên thêm .gitkeep
  const gitkeepPath = path.join(dirPath, ".gitkeep");

  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, "", "utf8");
  }
}

function main() {
  const seedFile = findSeedFile();
  const seedContent = fs.readFileSync(seedFile, "utf8");
  const codes = extractCodes(seedContent);

  if (!codes.length) {
    console.error("❌ Không tìm thấy mã nào trong seed-operators.js.");
    console.log("Ví dụ mã hợp lệ: PT-001, KS-001, MB-001...");
    process.exit(1);
  }

  console.log("📄 Seed file:", seedFile);
  console.log("📂 Output:", OUTPUT_ROOT);
  console.log(`🔎 Tìm thấy ${codes.length} mã dịch vụ.\n`);

  let created = 0;
  let existed = 0;

  // Tạo folder category cha trước
  Object.values(CATEGORY_BY_PREFIX).forEach((category) => {
    ensureDir(path.join(OUTPUT_ROOT, category));
  });

  for (const code of codes) {
    const category = getCategoryFromCode(code);
    const folderPath = path.join(OUTPUT_ROOT, category, code);

    const isCreated = ensureDir(folderPath);
    writeGitKeep(folderPath);

    if (isCreated) {
      console.log(`✅ CREATE ${category}/${code}`);
      created++;
    } else {
      console.log(`↻ EXISTS ${category}/${code}`);
      existed++;
    }
  }

  console.log("\n==============================");
  console.log(`✅ Tạo mới: ${created}`);
  console.log(`↻ Đã tồn tại: ${existed}`);
  console.log(`📦 Tổng folder mã: ${codes.length}`);
  console.log("==============================\n");

  console.log("Ví dụ đường dẫn ảnh sau này:");
  console.log("/anhdanggia/nhaxe/PT-001/1.webp");
  console.log("/anhdanggia/khachsan/KS-001/1.webp");
  console.log("/anhdanggia/maybay/MB-001/1.webp");
}

main();