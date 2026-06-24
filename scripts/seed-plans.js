const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function parseProperties(text) {
  const out = {};
  text.split(/\r?\n/).forEach((line) => {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return;
    const idx = raw.indexOf('=');
    if (idx === -1) return;
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    out[key] = value;
  });
  return out;
}

function findApplicationProperties() {
  const candidates = [
    path.resolve(__dirname, '../backend/reviewhub/src/main/resources/application.properties'),
    path.resolve(__dirname, '../src/main/resources/application.properties'),
    path.resolve(__dirname, '../backend/src/main/resources/application.properties'),
    path.resolve(process.cwd(), '../backend/reviewhub/src/main/resources/application.properties'),
    path.resolve(process.cwd(), '../src/main/resources/application.properties'),
  ];

  return candidates.find((file) => fs.existsSync(file));
}

function maskConnectionInfo(text) {
  return String(text || '')
    .replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')
    .replace(/password=([^&\s]+)/gi, 'password=***');
}

function makePgConnectionString(jdbcUrl, username, password) {
  if (!jdbcUrl) return '';

  let url = String(jdbcUrl).trim();
  if (url.startsWith('jdbc:postgresql://')) {
    url = url.replace(/^jdbc:/, '');
  }

  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    throw new Error(`spring.datasource.url không phải PostgreSQL URL: ${jdbcUrl}`);
  }

  const parsed = new URL(url);
  if (username) parsed.username = encodeURIComponent(username);
  if (password) parsed.password = encodeURIComponent(password);

  // node-postgres không cần channel_binding trong connection string, bỏ để tránh driver cũ báo lỗi.
  parsed.searchParams.delete('channel_binding');

  if (!parsed.searchParams.has('sslmode')) {
    parsed.searchParams.set('sslmode', 'require');
  }

  return parsed.toString();
}

function getPoolConfig() {
  const envUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (envUrl) {
    const safeUrl = envUrl.replace(/^jdbc:/, '');
    console.log('🔌 Kết nối DB từ biến môi trường DATABASE_URL');
    console.log('   ', maskConnectionInfo(safeUrl));
    return {
      connectionString: safeUrl,
      ssl: { rejectUnauthorized: false },
    };
  }

  const propsPath = findApplicationProperties();
  if (propsPath) {
    const props = parseProperties(fs.readFileSync(propsPath, 'utf8'));
    const jdbcUrl = props['spring.datasource.url'];
    const username = props['spring.datasource.username'];
    const password = props['spring.datasource.password'];
    const connectionString = makePgConnectionString(jdbcUrl, username, password);

    console.log('🔌 Kết nối DB theo application.properties');
    console.log('   File:', propsPath);
    console.log('   DB:', maskConnectionInfo(connectionString));

    return {
      connectionString,
      ssl: { rejectUnauthorized: false },
    };
  }

  console.log('⚠️ Không tìm thấy DATABASE_URL hoặc application.properties. Thử local PostgreSQL localhost:5432');
  return {
    host: 'localhost',
    port: 5432,
    database: 'NEWHUB',
    user: 'postgres',
    password: 'nhatpham12',
  };
}

const plans = [
  {
    id: 'starter',
    name: 'Khởi đầu',
    price: 400000,
    quota_limit: 5000,
    duration_days: 30,
    cycle: 'tháng',
    status: 'Đang bán',
    featured: false,
    description: 'Theo dõi đánh giá của 1 dịch vụ du lịch. Phù hợp để bắt đầu kiểm tra chất lượng.',
    features: [
      'Theo dõi 1 dịch vụ đã chọn',
      'Xem điểm đánh giá và nội dung đánh giá cơ bản',
      'Dung lượng 5.000 lượt sử dụng mỗi tháng',
    ],
    privileges: ['Xem dữ liệu public', 'Có tài liệu API', 'Có dashboard quota'],
  },
  {
    id: 'growth',
    name: 'Tăng trưởng',
    price: 2490000,
    quota_limit: 50000,
    duration_days: 30,
    cycle: 'tháng',
    status: 'Đang bán',
    featured: true,
    description: 'Dành cho đơn vị cần theo dõi đánh giá thường xuyên và quản lý dữ liệu tốt hơn.',
    features: [
      'Theo dõi 1 dịch vụ đã chọn với dung lượng cao hơn',
      'Xem dữ liệu chi tiết hơn phục vụ quản lý chất lượng',
      'Dung lượng 50.000 lượt sử dụng mỗi tháng',
      'Có lịch sử sử dụng và công cụ hỗ trợ vận hành',
    ],
    privileges: ['Xem public/private', 'Gửi review', 'AI moderation text', 'Lịch sử API'],
  },
  {
    id: 'enterprise',
    name: 'Doanh nghiệp',
    price: 9990000,
    quota_limit: 300000,
    duration_days: 30,
    cycle: 'tháng',
    status: 'Đang bán',
    featured: false,
    description: 'Dành cho doanh nghiệp cần dung lượng lớn, báo cáo sâu và hỗ trợ riêng.',
    features: [
      'Theo dõi 1 dịch vụ đã chọn với dung lượng lớn',
      'Báo cáo nâng cao về chất lượng đánh giá',
      'Dung lượng 300.000 lượt sử dụng mỗi tháng',
      'Hỗ trợ riêng trong quá trình vận hành',
    ],
    privileges: ['Quota lớn', 'Hỗ trợ riêng', 'Báo cáo nâng cao', 'Mở rộng domain'],
  },
  {
    id: 'custom',
    name: 'Tự chọn',
    price: 0,
    quota_limit: 0,
    duration_days: 30,
    cycle: 'tháng',
    status: 'Đang bán',
    featured: false,
    description: 'Tự chọn nhiều dịch vụ du lịch cần theo dõi. Giá tính theo số dịch vụ, mức gói và số tháng.',
    features: [
      'Chọn nhiều dịch vụ thuộc nhà xe, khách sạn, máy bay, tàu hỏa, tour hoặc dịch vụ khác',
      'Chọn mức Khởi đầu, Tăng trưởng hoặc Doanh nghiệp cho nhóm dịch vụ đã chọn',
      'Từ 2 dịch vụ trở lên được giảm 10% so với giá gốc',
      'Tổng tiền tự cập nhật theo số dịch vụ, cấp gói và thời gian sử dụng',
    ],
    privileges: ['Chọn nhiều dịch vụ', 'Giảm 10% từ 2 dịch vụ', 'Tùy chọn mức gói', 'Theo dõi đúng phạm vi đã mua'],
  },
];

async function run() {
  const pool = new Pool(getPoolConfig());

  try {
    await pool.query('SELECT 1');
    console.log('✅ Kết nối PostgreSQL OK');

    await pool.query(`
      ALTER TABLE plans
        ADD COLUMN IF NOT EXISTS cycle VARCHAR(50) DEFAULT 'tháng',
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Đang bán',
        ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS features TEXT,
        ADD COLUMN IF NOT EXISTS privileges TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
    `);
    console.log('✅ Kiểm tra / bổ sung cột bảng plans - OK');

    for (const p of plans) {
      const res = await pool.query(
        `INSERT INTO plans
          (id, name, price, quota_limit, duration_days, cycle, status, featured, description, features, privileges, created_at, updated_at)
         VALUES
          (
            $1::varchar(100),
            $2::varchar,
            $3::integer,
            $4::integer,
            $5::integer,
            $6::varchar(50),
            $7::varchar(50),
            $8::boolean,
            $9::text,
            $10::text,
            $11::text,
            now(),
            now()
          )
         ON CONFLICT (id) DO UPDATE SET
          name=EXCLUDED.name,
          price=EXCLUDED.price,
          quota_limit=EXCLUDED.quota_limit,
          duration_days=EXCLUDED.duration_days,
          cycle=EXCLUDED.cycle,
          status=EXCLUDED.status,
          featured=EXCLUDED.featured,
          description=EXCLUDED.description,
          features=EXCLUDED.features,
          privileges=EXCLUDED.privileges,
          updated_at=now()
         RETURNING id, name, price`,
        [
          p.id,
          p.name,
          p.price,
          p.quota_limit,
          p.duration_days,
          p.cycle,
          p.status,
          p.featured,
          p.description,
          JSON.stringify(p.features),
          JSON.stringify(p.privileges),
        ]
      );

      const row = res.rows[0];
      console.log(`✓ UPSERT ${row.id} — ${row.name} — ${Number(row.price).toLocaleString('vi-VN')}đ`);
    }

    const total = await pool.query('SELECT COUNT(*) AS count FROM plans');
    console.log(`\n📊 Tổng gói trong DB: ${total.rows[0].count}`);
    console.log('✅ Seed plans xong. Đã có gói custom / Tự chọn.');
  } finally {
    await pool.end();
  }
}

run().catch((e) => {
  console.error('\n❌ Seed plans lỗi thật sự ở đây:');
  console.error('MESSAGE:', e);
  console.error('CODE:', e.code || 'không có');
  console.error('DETAIL:', e.detail || 'không có');
  console.error('STACK:', e.stack || 'không có');
  process.exit(1);
});
