const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const { Pool } = require("pg");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function loadOperatorsFromSeed() {
  const seedPath = path.join(__dirname, "seed-operators.js");

  if (!fs.existsSync(seedPath)) {
    throw new Error("Không tìm thấy seed-operators.js");
  }

  const content = fs.readFileSync(seedPath, "utf8");

  const regex =
    /\{\s*code:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]/g;

  const operators = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    operators.push({
      operatorCode: match[1],
      operatorName: match[2],
    });
  }

  if (!operators.length) {
    throw new Error("Không đọc được nhà xe nào trong seed-operators.js");
  }

  return operators;
}

function findOperator(operators, inputName) {
  const keyword = normalizeText(inputName);

  let found = operators.find(
    op => normalizeText(op.operatorName) === keyword
  );

  if (found) return found;

  found = operators.find(
    op => normalizeText(op.operatorName).includes(keyword)
  );

  if (found) return found;

  found = operators.find(
    op => keyword.includes(normalizeText(op.operatorName))
  );

  if (found) return found;

  found = operators.find(
    op => normalizeText(op.operatorCode) === keyword
  );

  if (found) return found;

  return null;
}

async function main() {
  const EMAIL = process.argv[2];
  const OPERATOR_NAME = process.argv[3];

  if (!EMAIL || !OPERATOR_NAME) {
    console.log("Thiếu EMAIL hoặc tên nhà xe.");
    console.log('Ví dụ: node fix_account.js "minhquan@reviewhub.vn" "Xe Minh Quân"');
    process.exit(1);
  }

  const operators = loadOperatorsFromSeed();
  const operator = findOperator(operators, OPERATOR_NAME);

  if (!operator) {
    console.log("Không tìm thấy nhà xe trong seed-operators.js:", OPERATOR_NAME);
    process.exit(1);
  }

  console.log("====================================");
  console.log("AUTO FIX PARTNER ACCOUNT");
  console.log("====================================");
  console.log("Email :", EMAIL);
  console.log("Name  :", operator.operatorName);
  console.log("Code  :", operator.operatorCode);
  console.log("====================================");

  const result = await db.query(
    `
    UPDATE public.users
    SET
      partner_code = $1,
      assigned_operator_code = $1,
      org_name = $2,
      updated_at = now()
    WHERE email = $3
    RETURNING
      email,
      partner_code,
      assigned_operator_code,
      org_name
    `,
    [
      operator.operatorCode,
      operator.operatorName,
      EMAIL,
    ]
  );

  if (!result.rows.length) {
    console.log("Không tìm thấy user với email:", EMAIL);
  } else {
    console.log("Đã update partner:");
    console.log(result.rows);
  }

  await db.end();
}

main().catch(async (err) => {
  console.error(err.message || err);
  await db.end();
});