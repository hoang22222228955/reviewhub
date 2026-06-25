/**
 * generate-service-ranking-cache.js
 *
 * Tạo cache JSON sẵn cho trang danh mục:
 * - Nhà xe
 * - Khách sạn
 * - Máy bay
 * - Tàu hỏa
 * - Tour
 * - Dịch vụ khác
 *
 * Chạy:
 * cd C:\reviewhub-api-platform2-master
 * node scripts/generate-service-ranking-cache.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
});

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Không tìm thấy DATABASE_URL trong scripts/.env');
  process.exit(1);
}

const db = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const CATEGORIES = {
  'nha-xe': {
    prefix: 'PT-',
    output: 'service-ranking-nha-xe.json',
  },
  'khach-san': {
    prefix: 'KS-',
    output: 'service-ranking-khach-san.json',
  },
  'may-bay': {
    prefix: 'MB-',
    output: 'service-ranking-may-bay.json',
  },
  'tau-hoa': {
    prefix: 'TH-',
    output: 'service-ranking-tau-hoa.json',
  },
  tour: {
    prefix: 'TO-',
    output: 'service-ranking-tour.json',
  },
  'dich-vu-khac': {
    prefix: 'DV-',
    output: 'service-ranking-dich-vu-khac.json',
  },
};

const OUTPUT_DIR = path.join(__dirname, '..', 'frontend', 'public', 'cache');

function normalizeCode(rawCode) {
  const code = String(rawCode || '').trim();

  let match = code.match(/^BUS-(\d+)-001$/i);
  if (match) return `PT-${match[1].padStart(3, '0')}`;

  match = code.match(/^HOTEL-(\d+)-001$/i);
  if (match) return `KS-${match[1].padStart(3, '0')}`;

  match = code.match(/^AIR-(\d+)-001$/i);
  if (match) return `MB-${match[1].padStart(3, '0')}`;

  match = code.match(/^RAIL-(\d+)-001$/i);
  if (match) return `TH-${match[1].padStart(3, '0')}`;

  match = code.match(/^TOUR-(\d+)-001$/i);
  if (match) return `TO-${match[1].padStart(3, '0')}`;

  match = code.match(/^SERVICE-(\d+)-001$/i);
  if (match) return `DV-${match[1].padStart(3, '0')}`;

  return code;
}

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 0;

  // Nếu dữ liệu là thang 10 thì đổi về thang 5.
  if (rating > 5) return rating / 2;

  return rating;
}

async function columnExists(tableName, columnName) {
  const res = await db.query(
    `
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    `,
    [tableName, columnName]
  );

  return Number(res.rows[0]?.count || 0) > 0;
}

async function findReviewTable() {
  const candidates = [
    'reviews',
    'review',
    'public_reviews',
    'service_reviews',
    'pending_review',
    'pending_reviews',
    'review_ai',
  ];

  for (const table of candidates) {
    const res = await db.query(
      `
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      `,
      [table]
    );

    if (Number(res.rows[0]?.count || 0) > 0) {
      return table;
    }
  }

  return null;
}

async function getExistingColumns(tableName, candidates) {
  const result = [];

  for (const column of candidates) {
    if (await columnExists(tableName, column)) {
      result.push(column);
    }
  }

  return result;
}

function quote(column) {
  return `"${String(column).replace(/"/g, '""')}"`;
}

function coalesce(columns) {
  return `COALESCE(${columns.map(col => `${quote(col)}::text`).join(', ')})`;
}

async function loadOperators() {
  const hasRegion = await columnExists('transport_operators', 'region');
  const hasType = await columnExists('transport_operators', 'type');
  const hasHotline = await columnExists('transport_operators', 'hotline');
  const hasWebsite = await columnExists('transport_operators', 'website');
  const hasDescription = await columnExists('transport_operators', 'description');
  const hasImageUrl = await columnExists('transport_operators', 'image_url');

  const sql = `
    SELECT
      operator_code AS "code",
      operator_name AS "name",
      ${hasRegion ? 'region' : "'Đang cập nhật'"} AS "region",
      ${hasType ? 'type' : "'Đang cập nhật'"} AS "type",
      ${hasHotline ? 'hotline' : "''"} AS "hotline",
      ${hasWebsite ? 'website' : "''"} AS "website",
      ${hasDescription ? 'description' : "''"} AS "description",
      ${hasImageUrl ? 'image_url' : "''"} AS "imageUrl"
    FROM public.transport_operators
    ORDER BY operator_code ASC
  `;

  const res = await db.query(sql);

  return res.rows.map(row => ({
    code: normalizeCode(row.code),
    rawCode: row.code,
    name: row.name || '',
    region: row.region || 'Đang cập nhật',
    type: row.type || 'Đang cập nhật',
    hotline: row.hotline || '',
    website: row.website || '',
    description: row.description || '',
    imageUrl: row.imageUrl || '',
  }));
}

async function loadReviewStats() {
  const tableName = await findReviewTable();

  if (!tableName) {
    console.warn('Không tìm thấy bảng review. Stats sẽ là 0.');
    return new Map();
  }

  const ratingColumns = await getExistingColumns(tableName, [
    'rating',
    'score',
    'stars',
    'star',
    'diem',
    'diem_so',
  ]);

  if (!ratingColumns.length) {
    console.warn(`Bảng ${tableName} không có cột điểm sao.`);
    return new Map();
  }

  const codeColumns = await getExistingColumns(tableName, [
    'target_code',
    'operator_code',
    'assigned_operator_code',
    'owner_partner_code',
    'partner_code',
    'hotel_code',
    'service_code',
    'code',
    'targetcode',
    'operatorcode',
    'assignedoperatorcode',
    'ownerpartnercode',
    'partnercode',
  ]);

  if (!codeColumns.length) {
    console.warn(`Bảng ${tableName} không có cột mã dịch vụ.`);
    return new Map();
  }

  const nameColumns = await getExistingColumns(tableName, [
    'target_name',
    'operator_name',
    'partner_name',
    'hotel_name',
    'service_name',
    'name',
    'title',
    'targetname',
    'operatorname',
    'partnername',
    'hotelname',
    'servicename',
  ]);

  const statusColumns = await getExistingColumns(tableName, [
    'moderation_status',
    'status',
    'review_status',
    'moderationstatus',
    'reviewstatus',
  ]);

  const visibilityColumns = await getExistingColumns(tableName, [
    'visibility',
  ]);

  const codeExpr = coalesce(codeColumns);
  const nameExpr = nameColumns.length ? coalesce(nameColumns) : codeExpr;
  const ratingExpr = `${quote(ratingColumns[0])}::numeric`;

  let statusWhere = '';

  if (statusColumns.length || visibilityColumns.length) {
    const statusExpr = statusColumns.length ? `LOWER(${coalesce(statusColumns)})` : null;
    const visibilityExpr = visibilityColumns.length ? `LOWER(${coalesce(visibilityColumns)})` : null;

    const parts = [];

    if (statusExpr) {
      parts.push(`
        ${statusExpr} IS NULL
        OR ${statusExpr} = ''
        OR ${statusExpr} IN (
          'approved',
          'approve',
          'published',
          'active',
          'success',
          'pending_review',
          'pending',
          'hidden'
        )
      `);
    }

    if (visibilityExpr) {
      parts.push(`
        ${visibilityExpr} IS NULL
        OR ${visibilityExpr} = ''
        OR ${visibilityExpr} IN ('public', 'hidden')
      `);
    }

    statusWhere = `AND (${parts.join(' OR ')})`;
  }

  const sql = `
    SELECT
      ${codeExpr} AS "rawCode",
      ${nameExpr} AS "name",
      ${ratingExpr} AS "rating"
    FROM public.${tableName}
    WHERE ${quote(ratingColumns[0])} IS NOT NULL
      AND ${codeExpr} IS NOT NULL
      AND TRIM(${codeExpr}) <> ''
      ${statusWhere}
  `;

  const res = await db.query(sql);

  const map = new Map();

  for (const row of res.rows) {
    const code = normalizeCode(row.rawCode);
    const rating = normalizeRating(row.rating);

    if (!code || !rating) continue;

    const current = map.get(code) || {
      code,
      name: row.name || '',
      totalReviews: 0,
      ratingSum: 0,
    };

    current.totalReviews += 1;
    current.ratingSum += rating;

    if (!current.name && row.name) {
      current.name = row.name;
    }

    map.set(code, current);
  }

  for (const [code, stat] of map.entries()) {
    stat.avgRating = Number((stat.ratingSum / stat.totalReviews).toFixed(2));
    delete stat.ratingSum;
    map.set(code, stat);
  }

  return map;
}

async function generate() {
  console.log('Đang tạo cache thống kê review...');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const operators = await loadOperators();
  const statsMap = await loadReviewStats();

  const allOutput = {
    generatedAt: new Date().toISOString(),
    totalOperators: operators.length,
    categories: {},
  };

  for (const [category, config] of Object.entries(CATEGORIES)) {
    const list = operators
      .filter(op => op.code.startsWith(config.prefix))
      .map(op => {
        const stat = statsMap.get(op.code);

        return {
          ...op,
          category,
          totalReviews: stat?.totalReviews || 0,
          avgRating: stat?.avgRating || 0,
        };
      })
      .sort((a, b) => {
        if (b.totalReviews !== a.totalReviews) {
          return b.totalReviews - a.totalReviews;
        }

        return a.code.localeCompare(b.code, 'vi');
      });

    const payload = {
      generatedAt: new Date().toISOString(),
      category,
      prefix: config.prefix,
      total: list.length,
      items: list,
    };

    const outputPath = path.join(OUTPUT_DIR, config.output);

    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');

    allOutput.categories[category] = {
      total: list.length,
      file: `/cache/${config.output}`,
    };

    console.log(`✓ ${category}: ${list.length} dịch vụ -> frontend/public/cache/${config.output}`);
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'service-ranking-all.json'),
    JSON.stringify(allOutput, null, 2),
    'utf8'
  );

  console.log('\nXong. Cache đã được tạo trong frontend/public/cache/');
}

generate()
  .catch(err => {
    console.error('Lỗi tạo cache:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.end();
  });