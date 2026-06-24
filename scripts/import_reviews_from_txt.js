const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const TXT_FILE = path.join(__dirname, "google_maps_reviews.txt");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function syncOperator(operatorCode, operatorName) {
  await db.query(
    `
    INSERT INTO public.transport_operators (
      operator_code,
      operator_name,
      created_at,
      updated_at
    )
    VALUES ($1, $2, now(), now())
    ON CONFLICT (operator_code)
    DO UPDATE SET
      operator_name = EXCLUDED.operator_name,
      updated_at = now()
    `,
    [operatorCode, operatorName]
  );

  console.log(`✓ Synced operator -> ${operatorCode} - ${operatorName}`);
}

async function importReviews() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Thiếu DATABASE_URL trong scripts/.env");
  }

  if (!fs.existsSync(TXT_FILE)) {
    throw new Error(`Không tìm thấy file: ${TXT_FILE}`);
  }

  const content = fs.readFileSync(TXT_FILE, "utf8");

  const lines = content
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  console.log(`Đang import ${lines.length} reviews từ TXT...\n`);

  if (lines.length === 0) return;

  const firstReview = JSON.parse(lines[0]);

  await syncOperator(firstReview.operatorCode, firstReview.targetName);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const line of lines) {
    let r;

    try {
      r = JSON.parse(line);
    } catch {
      failed++;
      continue;
    }

    try {
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
          source_system,
          moderation_status,
          created_at,
          owner_partner_code,
          raw_payload
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        )
        ON CONFLICT (id)
        DO UPDATE SET
          operator_code = EXCLUDED.operator_code,
          category = EXCLUDED.category,
          target_code = EXCLUDED.target_code,
          target_name = EXCLUDED.target_name,
          reviewer_name = EXCLUDED.reviewer_name,
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          source_system = EXCLUDED.source_system,
          moderation_status = 'pending_review',
          owner_partner_code = EXCLUDED.owner_partner_code,
          raw_payload = EXCLUDED.raw_payload
        WHERE public.reviews.moderation_status IS DISTINCT FROM 'approved'
        `,
        [
          r.id,
          r.operatorCode,
          r.category || "Nhà xe",
          r.targetCode,
          r.targetName,
          r.reviewerName,
          r.rating,
          r.comment,
          r.sourceSystem || "google-maps",
          "pending_review",
          r.createdAt,
          r.ownerPartnerCode || r.operatorCode,
          JSON.stringify(r.rawPayload || {}),
        ]
      );

      if (result.rowCount > 0) {
        console.log(`✓ Pending ${r.id} - ${r.reviewerName}`);
        inserted++;
      } else {
        console.log(`⚠ Skipped ${r.id}`);
        skipped++;
      }
    } catch (err) {
      console.error(`✗ Lỗi import ${r.id}:`, err.message);
      failed++;
    }
  }

  console.log("\nHoàn tất import:");
  console.log(`Inserted/Updated pending: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

async function main() {
  try {
    await importReviews();
  } catch (err) {
    console.error("Lỗi:", err.message);
  } finally {
    await db.end();
  }
}

main();