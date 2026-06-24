/**
 * seed-hotels.js
 * Seed danh sách khách sạn vào bảng public.hotels
 *
 * Cách chạy:
 * cd C:\Users\Admin\Downloads\reviewhub-api-platform2-master\scripts
 * node seed-hotels.js
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

const HOTELS = [
  {
    code: "KS-001",
    name: "Mường Thanh Luxury Đà Nẵng",
    region: "Đà Nẵng",
    address: "Đà Nẵng, Việt Nam",
    phone: "1900 1833",
    website: "muongthanh.com",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn cao cấp tại Đà Nẵng, phù hợp nghỉ dưỡng, công tác và du lịch gia đình.",
    imageUrl: "/anhkhachsan/1.jpg",
    avgRating: 4.6,
    totalReviews: 1280,
  },
  {
    code: "KS-002",
    name: "Vinpearl Resort Nha Trang",
    region: "Nha Trang",
    address: "Nha Trang, Khánh Hòa",
    phone: "1900 6677",
    website: "vinpearl.com",
    type: "Resort / Khách sạn nghỉ dưỡng",
    description:
      "Khu nghỉ dưỡng cao cấp tại Nha Trang với nhiều tiện ích, phù hợp gia đình và khách du lịch.",
    imageUrl: "/anhkhachsan/2.jpg",
    avgRating: 4.8,
    totalReviews: 2450,
  },
  {
    code: "KS-003",
    name: "FLC Grand Hotel Hạ Long",
    region: "Hạ Long",
    address: "Hạ Long, Quảng Ninh",
    phone: "1900 5454",
    website: "flchotelsresorts.com",
    type: "Khách sạn nghỉ dưỡng",
    description:
      "Khách sạn nghỉ dưỡng view biển, phù hợp hội nghị, du lịch gia đình và nghỉ dưỡng cuối tuần.",
    imageUrl: "/anhkhachsan/3.jpg",
    avgRating: 4.4,
    totalReviews: 980,
  },
  {
    code: "KS-004",
    name: "InterContinental Hanoi Westlake",
    region: "Hà Nội",
    address: "Hồ Tây, Hà Nội",
    phone: "024 6270 8888",
    website: "ihg.com",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn cao cấp tại khu vực Hồ Tây, nổi bật với không gian sang trọng và dịch vụ chuyên nghiệp.",
    imageUrl: "/anhkhachsan/4.jpg",
    avgRating: 4.7,
    totalReviews: 1740,
  },
  {
    code: "KS-005",
    name: "Hotel Nikko Saigon",
    region: "TP. Hồ Chí Minh",
    address: "Quận 1, TP. Hồ Chí Minh",
    phone: "028 3925 7777",
    website: "hotelnikkosaigon.com.vn",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn trung tâm TP. Hồ Chí Minh, phù hợp công tác, du lịch và hội nghị.",
    imageUrl: "/anhkhachsan/5.jpg",
    avgRating: 4.6,
    totalReviews: 1530,
  },
  {
    code: "KS-006",
    name: "Saigon Morin Hotel Huế",
    region: "Huế",
    address: "Huế, Thừa Thiên Huế",
    phone: "0234 3823 526",
    website: "morinhotel.com.vn",
    type: "Khách sạn di sản",
    description:
      "Khách sạn lâu đời tại Huế, nổi bật với kiến trúc cổ điển và vị trí thuận tiện.",
    imageUrl: "/anhkhachsan/6.jpg",
    avgRating: 4.3,
    totalReviews: 720,
  },
  {
    code: "KS-007",
    name: "Pullman Danang Beach Resort",
    region: "Đà Nẵng",
    address: "Bắc Mỹ An, Đà Nẵng",
    phone: "0236 395 8888",
    website: "pullman-danang.com",
    type: "Resort biển",
    description:
      "Resort biển cao cấp, phù hợp nghỉ dưỡng gia đình, cặp đôi và khách quốc tế.",
    imageUrl: "/anhkhachsan/7.jpg",
    avgRating: 4.5,
    totalReviews: 1120,
  },
  {
    code: "KS-008",
    name: "Lotte Hotel Saigon",
    region: "TP. Hồ Chí Minh",
    address: "Quận 1, TP. Hồ Chí Minh",
    phone: "028 3823 3333",
    website: "lottehotel.com",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn trung tâm thành phố, nổi bật với dịch vụ chuyên nghiệp và vị trí thuận tiện.",
    imageUrl: "/anhkhachsan/8.jpg",
    avgRating: 4.5,
    totalReviews: 1390,
  },
  {
    code: "KS-009",
    name: "Sapa Jade Hill Resort",
    region: "Sa Pa",
    address: "Sa Pa, Lào Cai",
    phone: "0214 3888 888",
    website: "sapajadehill.com",
    type: "Resort nghỉ dưỡng",
    description:
      "Khu nghỉ dưỡng tại Sa Pa, phù hợp du lịch thiên nhiên, nghỉ dưỡng và trải nghiệm văn hóa.",
    imageUrl: "/anhkhachsan/9.jpg",
    avgRating: 4.4,
    totalReviews: 860,
  },
  {
    code: "KS-010",
    name: "Dalat Palace Heritage Hotel",
    region: "Đà Lạt",
    address: "Đà Lạt, Lâm Đồng",
    phone: "0263 3825 444",
    website: "dalatpalace.vn",
    type: "Khách sạn di sản",
    description:
      "Khách sạn phong cách cổ điển tại Đà Lạt, nổi bật với không gian sang trọng và lịch sử lâu đời.",
    imageUrl: "/anhkhachsan/10.jpg",
    avgRating: 4.5,
    totalReviews: 930,
  },
  {
    code: "KS-011",
    name: "Novotel Phu Quoc Resort",
    region: "Phú Quốc",
    address: "Phú Quốc, Kiên Giang",
    phone: "0297 6260 999",
    website: "novotelphuquoc.com",
    type: "Resort biển",
    description:
      "Resort biển tại Phú Quốc, phù hợp nghỉ dưỡng gia đình và du lịch dài ngày.",
    imageUrl: "/anhkhachsan/11.jpg",
    avgRating: 4.4,
    totalReviews: 1210,
  },
  {
    code: "KS-012",
    name: "Melia Ba Vi Mountain Retreat",
    region: "Ba Vì",
    address: "Ba Vì, Hà Nội",
    phone: "024 3200 9999",
    website: "melia.com",
    type: "Resort núi",
    description:
      "Khu nghỉ dưỡng trên núi, phù hợp nghỉ dưỡng cuối tuần, thiên nhiên và trải nghiệm yên tĩnh.",
    imageUrl: "/anhkhachsan/12.jpg",
    avgRating: 4.6,
    totalReviews: 790,
  },
    {
    code: "KS-013",
    name: "Sofitel Legend Metropole Hanoi",
    region: "Hà Nội",
    address: "15 Ngô Quyền, Hoàn Kiếm, Hà Nội",
    phone: "Đang cập nhật",
    website: "sofitel-legend-metropole-hanoi.com",
    type: "Khách sạn 5 sao / Khách sạn di sản",
    description:
      "Khách sạn di sản nổi tiếng tại trung tâm Hà Nội, phong cách cổ điển sang trọng, phù hợp khách nghỉ dưỡng cao cấp, công tác và du lịch văn hóa.",
    imageUrl: "/anhkhachsan/13.jpg",
    avgRating: 4.7,
    totalReviews: 6070,
  },
  {
    code: "KS-014",
    name: "JW Marriott Hotel Hanoi",
    region: "Hà Nội",
    address: "Nam Từ Liêm, Hà Nội",
    phone: "Đang cập nhật",
    website: "marriott.com",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn 5 sao cao cấp tại Hà Nội, nổi bật với không gian hiện đại, dịch vụ chuyên nghiệp, phù hợp hội nghị, công tác và nghỉ dưỡng.",
    imageUrl: "/anhkhachsan/14.jpg",
    avgRating: 4.7,
    totalReviews: 3340,
  },
  {
    code: "KS-015",
    name: "Sheraton Saigon Grand Opera Hotel",
    region: "TP. Hồ Chí Minh",
    address: "Đồng Khởi, Quận 1, TP. Hồ Chí Minh",
    phone: "Đang cập nhật",
    website: "marriott.com",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn 5 sao tại trung tâm Quận 1, gần Nhà hát Thành phố, phù hợp khách công tác, du lịch cao cấp và khách quốc tế.",
    imageUrl: "/anhkhachsan/15.jpg",
    avgRating: 4.6,
    totalReviews: 2300,
  },
  {
    code: "KS-016",
    name: "InterContinental Danang Sun Peninsula Resort",
    region: "Đà Nẵng",
    address: "Sơn Trà, Đà Nẵng",
    phone: "Đang cập nhật",
    website: "ihg.com",
    type: "Resort biển 5 sao",
    description:
      "Resort biển cao cấp tại bán đảo Sơn Trà, nổi bật với kiến trúc độc đáo, không gian nghỉ dưỡng sang trọng và dịch vụ quốc tế.",
    imageUrl: "/anhkhachsan/16.jpg",
    avgRating: 4.8,
    totalReviews: 7600,
  },
  {
    code: "KS-017",
    name: "Meliá Hanoi",
    region: "Hà Nội",
    address: "Hoàn Kiếm, Hà Nội",
    phone: "Đang cập nhật",
    website: "melia.com",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn 5 sao tại trung tâm Hà Nội, vị trí thuận tiện, phù hợp khách công tác, hội nghị và du lịch thành phố.",
    imageUrl: "/anhkhachsan/17.jpg",
    avgRating: 4.6,
    totalReviews: 7580,
  },
  {
    code: "KS-018",
    name: "Caravelle Saigon",
    region: "TP. Hồ Chí Minh",
    address: "Quận 1, TP. Hồ Chí Minh",
    phone: "Đang cập nhật",
    website: "caravellehotel.com",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn lâu đời tại trung tâm Sài Gòn, gần Nhà hát Thành phố, nổi bật với vị trí đẹp, dịch vụ chuyên nghiệp và phong cách sang trọng.",
    imageUrl: "/anhkhachsan/18.jpg",
    avgRating: 4.6,
    totalReviews: 1800,
  },
  {
    code: "KS-019",
    name: "New World Saigon Hotel",
    region: "TP. Hồ Chí Minh",
    address: "Quận 1, TP. Hồ Chí Minh",
    phone: "Đang cập nhật",
    website: "newworldhotels.com",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn 5 sao tại trung tâm TP. Hồ Chí Minh, gần chợ Bến Thành và các điểm du lịch, phù hợp công tác, sự kiện và nghỉ dưỡng.",
    imageUrl: "/anhkhachsan/19.jpg",
    avgRating: 4.5,
    totalReviews: 2600,
  },
  {
    code: "KS-020",
    name: "Pan Pacific Hanoi",
    region: "Hà Nội",
    address: "Ba Đình, Hà Nội",
    phone: "Đang cập nhật",
    website: "panpacific.com",
    type: "Khách sạn 5 sao",
    description:
      "Khách sạn 5 sao gần Hồ Tây và trung tâm Hà Nội, phù hợp khách công tác, nghỉ dưỡng và du lịch cao cấp.",
    imageUrl: "/anhkhachsan/20.jpg",
    avgRating: 4.6,
    totalReviews: 2500,
  },
];

async function seedHotels() {
  console.log(`Bắt đầu seed ${HOTELS.length} khách sạn...\n`);

  let inserted = 0;
  let updated = 0;

  for (const hotel of HOTELS) {
    const result = await db.query(
      `
      INSERT INTO public.hotels
        (
          hotel_code,
          hotel_name,
          region,
          address,
          phone,
          website,
          type,
          description,
          image_url,
          avg_rating,
          total_reviews,
          created_at,
          updated_at
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
      ON CONFLICT (hotel_code)
      DO UPDATE SET
        hotel_name = EXCLUDED.hotel_name,
        region = EXCLUDED.region,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        website = EXCLUDED.website,
        type = EXCLUDED.type,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        avg_rating = EXCLUDED.avg_rating,
        total_reviews = EXCLUDED.total_reviews,
        updated_at = now()
      RETURNING xmax
      `,
      [
        hotel.code,
        hotel.name,
        hotel.region,
        hotel.address,
        hotel.phone,
        hotel.website,
        hotel.type,
        hotel.description,
        hotel.imageUrl,
        hotel.avgRating,
        hotel.totalReviews,
      ]
    );

    const isNew = result.rows[0].xmax === "0";

    if (isNew) {
      inserted += 1;
      console.log(`✓ INSERT ${hotel.code} - ${hotel.name}`);
    } else {
      updated += 1;
      console.log(`↻ UPDATE ${hotel.code} - ${hotel.name}`);
    }
  }

  const total = await db.query(`
    SELECT COUNT(*) AS total
    FROM public.hotels;
  `);

  console.log("");
  console.log(`Xong: ${inserted} mới, ${updated} cập nhật`);
  console.log(`Tổng khách sạn trong DB: ${total.rows[0].total}`);
}

async function main() {
  try {
    await seedHotels();
    console.log("Hoàn tất.");
  } catch (error) {
    console.error("Seed khách sạn thất bại:");
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
