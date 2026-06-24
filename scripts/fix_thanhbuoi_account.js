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

  // EMAIL tài khoản Thành Bưởi
  const EMAIL = "hungcuong@reviewhub.vn";

  const result = await db.query(
    `
    UPDATE public.users
    SET
      partner_code = 'PT-006',
      assigned_operator_code = 'PT-006',
      org_name = 'Hùng Cường',
      updated_at = now()
    WHERE email = $1

    RETURNING
      email,
      partner_code,
      assigned_operator_code
    `,
    [EMAIL]
  );

  console.log(result.rows);

  await db.end();
}

main().catch(console.error);