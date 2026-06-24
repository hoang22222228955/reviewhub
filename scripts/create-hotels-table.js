/**
 * create-hotels-table.js
 * Tạo bảng hotels trong Postgres.
 *
 * Cách chạy:
 * cd C:\Users\Admin\Downloads\reviewhub-api-platform2-master\scripts
 * npm install dotenv pg
 * node create-hotels-table.js
 */

const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Không tìm thấy DATABASE_URL trong file scripts/.env");
  console.error("Hãy tạo file scripts/.env với nội dung:");
  console.error("DATABASE_URL=postgresql://user:password@host:port/database");
  process.exit(1);
}

const db = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createHotelsTable() {
  console.log("Đang kết nối Postgres...");
  console.log("Đang tạo bảng public.hotels...");

  await db.query(`
    CREATE TABLE IF NOT EXISTS public.hotels (
      id BIGSERIAL PRIMARY KEY,

      hotel_code VARCHAR(50) UNIQUE NOT NULL,
      hotel_name VARCHAR(255) NOT NULL,

      region VARCHAR(255),
      address TEXT,
      phone VARCHAR(50),
      website VARCHAR(255),

      type VARCHAR(100),
      description TEXT,
      image_url TEXT,

      avg_rating DOUBLE PRECISION DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,

      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  console.log("Đã tạo hoặc kiểm tra xong bảng public.hotels.");

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_hotels_hotel_code
    ON public.hotels (hotel_code);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_hotels_hotel_name
    ON public.hotels (hotel_name);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_hotels_region
    ON public.hotels (region);
  `);

  console.log("Đã tạo index cho bảng hotels.");

  const result = await db.query(`
    SELECT COUNT(*) AS total
    FROM public.hotels;
  `);

  console.log(`Tổng khách sạn hiện có: ${result.rows[0].total}`);
}

async function main() {
  try {
    await createHotelsTable();
    console.log("Hoàn tất.");
  } catch (error) {
    console.error("Tạo bảng hotels thất bại:");
    console.error(error.message || error);

    if (
      String(error.message || "").includes("permission denied") ||
      String(error.message || "").includes("must be owner") ||
      String(error.message || "").includes("permission")
    ) {
      console.error("");
      console.error("Tài khoản Postgres trong DATABASE_URL không có quyền tạo bảng.");
      console.error("Bạn cần dùng tài khoản owner/admin hoặc dùng cách lưu khách sạn chung trong bảng transport_operators.");
    }

    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();