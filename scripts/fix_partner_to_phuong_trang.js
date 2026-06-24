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

async function main() {
  console.log("Đang kết nối DB...");

  if (!process.env.DATABASE_URL) {
    throw new Error("Thiếu DATABASE_URL trong scripts/.env");
  }

  console.log("DB connected.");

  // 1. Đảm bảo Phương Trang tồn tại trong transport_operators
  await db.query(
    `
    INSERT INTO public.transport_operators (
      operator_code,
      operator_name,
      created_at,
      updated_at
    )
    VALUES (
      'PT-004',
      'Phương Trang',
      now(),
      now()
    )
    ON CONFLICT (operator_code)
    DO UPDATE SET
      operator_name = EXCLUDED.operator_name,
      updated_at = now()
    `
  );

  console.log("Đã tạo/cập nhật operator PT-004 - Phương Trang");

  // 2. Gán tất cả user partner đang là PT-001 sang PT-004
  const users = await db.query(
    `
    UPDATE public.users
    SET
      assigned_operator_code = 'PT-004',
      updated_at = now()
    WHERE role = 'partner'
    RETURNING id, email, partner_code, assigned_operator_code
    `
  );

  console.log(`Đã cập nhật ${users.rowCount} partner user:`);

  for (const u of users.rows) {
    console.log(
      `- ${u.email} | partner_code=${u.partner_code} | assigned_operator_code=${u.assigned_operator_code}`
    );
  }

  // 3. Kiểm tra review Phương Trang
  const reviewCount = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM public.reviews
    WHERE operator_code = 'PT-004'
       OR owner_partner_code = 'PT-004'
    `
  );

  console.log(`Review Phương Trang hiện có: ${reviewCount.rows[0].total}`);

  console.log("\nDONE. Hãy logout rồi login lại frontend.");
}

main()
  .catch((err) => {
    console.error("Lỗi:", err.message);
  })
  .finally(async () => {
    await db.end();
  });