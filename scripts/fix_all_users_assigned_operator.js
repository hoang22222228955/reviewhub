const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { Pool } = require("pg");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const result = await db.query(`
    UPDATE public.users
    SET
      assigned_operator_code = partner_code,
      updated_at = now()
    WHERE role = 'partner'
      AND partner_code IS NOT NULL
    RETURNING email, partner_code, assigned_operator_code
  `);

  console.log(`Đã sửa ${result.rowCount} tài khoản partner:`);

  for (const u of result.rows) {
    console.log(`${u.email}: ${u.partner_code} -> ${u.assigned_operator_code}`);
  }

  await db.end();
}

main().catch(async (err) => {
  console.error(err);
  await db.end();
});