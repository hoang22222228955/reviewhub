/**
 * seed-reviews.js
 * 
 * Seed dữ liệu review Google Maps mô phỏng
 * Hỗ trợ Neon PostgreSQL
 */

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

console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL ? "FOUND" : "NOT FOUND"
);

// ============================================================
// OPERATORS
// ============================================================

const OPERATORS = [
  {
    operatorCode: "PT-001",
    operatorName: "VeXeNhanh",
    googlePlaceId: "ChIJ_mock_vexenhanh",
    overallRating: 4.2,
    totalReviews: 1240,
  },

  {
    operatorCode: "PT-002",
    operatorName: "FUTA",
    googlePlaceId: "ChIJ_mock_futa",
    overallRating: 4.5,
    totalReviews: 3820,
  },

  {
    operatorCode: "PT-003",
    operatorName: "An Vui",
    googlePlaceId: "ChIJ_mock_anvui",
    overallRating: 4.0,
    totalReviews: 680,
  },

  {
    operatorCode: "PT-004",
    operatorName: "Phương Trang",
    googlePlaceId: "ChIJ_mock_phuongtrang",
    overallRating: 4.3,
    totalReviews: 2500,
  },
];

// ============================================================
// REVIEWS
// ============================================================

const REVIEWS_DATA = [
  {
    id: "GM-PT-001",
    operatorCode: "PT-004",
    targetCode: "BUS-PT-001",
    targetName: "Phương Trang HCM - Đà Lạt",
    reviewerName: "Nguyễn Văn A",
    rating: 5,
    comment: "Xe sạch sẽ, nhân viên nhiệt tình.",
    visibility: "public",
    sourceSystem: "google-maps",
    moderationStatus: "approved",
    createdAt: "2026-04-15T08:30:00Z",
    ownerPartnerCode: "PT-004",
  },

  {
    id: "GM-PT-002",
    operatorCode: "PT-004",
    targetCode: "BUS-PT-001",
    targetName: "Phương Trang HCM - Đà Lạt",
    reviewerName: "Trần Thị B",
    rating: 4,
    comment: "Xe chạy êm, ghế nằm thoải mái.",
    visibility: "public",
    sourceSystem: "google-maps",
    moderationStatus: "approved",
    createdAt: "2026-04-14T10:00:00Z",
    ownerPartnerCode: "PT-004",
  },

  {
    id: "GM-PT-003",
    operatorCode: "PT-004",
    targetCode: "BUS-PT-002",
    targetName: "Phương Trang HCM - Nha Trang",
    reviewerName: "Lê Văn C",
    rating: 5,
    comment: "Tài xế thân thiện, đúng giờ.",
    visibility: "public",
    sourceSystem: "google-maps",
    moderationStatus: "approved",
    createdAt: "2026-04-13T09:00:00Z",
    ownerPartnerCode: "PT-004",
  },
];

// ============================================================
// UPDATE OPERATORS
// ============================================================

async function updateOperators() {
  console.log("📍 Update operators...");

  for (const op of OPERATORS) {
    await db.query(
      `
      INSERT INTO public.transport_operators (
        operator_code,
        operator_name,
        google_place_id,
        overall_rating,
        total_reviews,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,now(),now())

      ON CONFLICT (operator_code)
      DO UPDATE SET
        operator_name = EXCLUDED.operator_name,
        google_place_id = EXCLUDED.google_place_id,
        overall_rating = EXCLUDED.overall_rating,
        total_reviews = EXCLUDED.total_reviews,
        updated_at = now()
      `,
      [
        op.operatorCode,
        op.operatorName,
        op.googlePlaceId,
        op.overallRating,
        op.totalReviews,
      ]
    );

    console.log(
      `✓ ${op.operatorName} (${op.operatorCode})`
    );
  }
}

// ============================================================
// INSERT REVIEWS
// ============================================================

async function insertReviews() {
  console.log("\n📝 Insert reviews...");

  let inserted = 0;
  let skipped = 0;

  for (const r of REVIEWS_DATA) {
    const rawPayload = {
      id: r.id,
      targetCode: r.targetCode,
      targetName: r.targetName,
      reviewerName: r.reviewerName,
      rating: r.rating,
      comment: r.comment,
    };

    const result = await db.query(
      `
      INSERT INTO public.reviews (
        id,
        operator_code,
        category,
        target_code,
        target_name,
        reviewer_name,
        rating,
        comment,
        visibility,
        source_system,
        moderation_status,
        created_at,
        owner_partner_code,
        raw_payload
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14
      )

      ON CONFLICT (id)
      DO NOTHING
      `,
      [
        r.id,
        r.operatorCode,
        "Nhà xe",
        r.targetCode,
        r.targetName,
        r.reviewerName,
        r.rating,
        r.comment,
        r.visibility,
        r.sourceSystem,
        r.moderationStatus,
        r.createdAt,
        r.ownerPartnerCode,
        JSON.stringify(rawPayload),
      ]
    );

    if (result.rowCount > 0) {
      inserted++;
      console.log(`✓ ${r.id}`);
    } else {
      skipped++;
      console.log(`⚠ ${r.id} exists`);
    }
  }

  console.log(`\nInserted: ${inserted}`);
  console.log(`Skipped : ${skipped}`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("🚀 Start seed reviews...\n");

  try {
    await updateOperators();
    await insertReviews();

    console.log("\n🎉 DONE");
  } catch (err) {
    console.error("\n❌ FULL ERROR:");
    console.error(err);
  } finally {
    await db.end();
  }
}

main();