/**
 * seed-vexenhanh-50.js
 * Insert 50 reviews VeXeNhanh (nguồn: vexere) vào DB
 * Chạy: node seed-vexenhanh-50.js
 */

const { Pool } = require('pg');

const db = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'NEWHUB',
  user: 'postgres',
  password: 'nhatpham12',
});

const REVIEWS = [
  // === Tuyến HCM - Đà Lạt ===
  { id: 'VXN-VX-001', reviewer: 'Nguyễn V. A.', rating: 5, comment: 'Xe sạch sẽ, tài xế lịch sự và khởi hành đúng giờ. Ghế limousine rất thoải mái, điều hòa vừa phải. Sẽ tiếp tục ủng hộ VeXeNhanh.', route: 'HCM - Đà Lạt', date: '2026-04-15T07:30:00Z' },
  { id: 'VXN-VX-002', reviewer: 'Trần T. Hương', rating: 4, comment: 'Chuyến đi ổn, xe đến đúng giờ. Tuy nhiên trạm dừng chân hơi lâu khoảng 30 phút. Nhìn chung vẫn hài lòng.', route: 'HCM - Đà Lạt', date: '2026-04-14T08:00:00Z' },
  { id: 'VXN-VX-003', reviewer: 'Lê M. Khoa', rating: 5, comment: 'Lần đầu đi VeXeNhanh tuyến Đà Lạt, rất ấn tượng. Xe mới, ghế êm, nhân viên thân thiện. Giá vé hợp lý so với chất lượng.', route: 'HCM - Đà Lạt', date: '2026-04-13T06:45:00Z' },
  { id: 'VXN-VX-004', reviewer: 'Phạm Q. Bảo', rating: 3, comment: 'Xe đến trễ 20 phút so với giờ khởi hành. Điều hòa hơi lạnh nhưng không có chăn. Tài xế lái khá nhanh ở đoạn đường núi.', route: 'HCM - Đà Lạt', date: '2026-04-12T09:15:00Z' },
  { id: 'VXN-VX-005', reviewer: 'Hoàng T. Linh', rating: 5, comment: 'Tuyệt vời! Ghế giường nằm rộng, có màn riêng, điều hòa dễ chịu. Tài xế lái êm, không bóp còi inh ỏi. Đúng giờ 100%.', route: 'HCM - Đà Lạt', date: '2026-04-11T07:00:00Z' },
  { id: 'VXN-VX-006', reviewer: 'Võ T. Mai', rating: 4, comment: 'Xe sạch, không có mùi khó chịu. Nhân viên hỗ trợ tận tình. Chỉ tiếc là wifi không ổn định trong đoạn đường núi.', route: 'HCM - Đà Lạt', date: '2026-04-10T08:30:00Z' },
  { id: 'VXN-VX-007', reviewer: 'Đặng V. Tuấn', rating: 2, comment: 'Xe trễ 45 phút, không có thông báo trước. Gọi điện tổng đài chờ mãi không nghe máy. Chất lượng không như quảng cáo.', route: 'HCM - Đà Lạt', date: '2026-04-09T10:00:00Z' },
  { id: 'VXN-VX-008', reviewer: 'Bùi T. Lan', rating: 5, comment: 'Đặt vé online rất dễ, thanh toán nhanh. Lên xe đúng giờ, ghế sạch có gối. Đến Đà Lạt đúng giờ dự kiến. Recommend!', route: 'HCM - Đà Lạt', date: '2026-04-08T07:15:00Z' },
  { id: 'VXN-VX-009', reviewer: 'Ngô T. Phương', rating: 4, comment: 'Lái xe an toàn, không phóng nhanh vượt ẩu. Xe tương đối sạch. Ghế hơi cứng nhưng chấp nhận được với giá vé này.', route: 'HCM - Đà Lạt', date: '2026-04-07T06:30:00Z' },
  { id: 'VXN-VX-010', reviewer: 'Dương M. Đức', rating: 5, comment: 'Dịch vụ 5 sao! Xe limousine cabin riêng cực kỳ thoải mái. Có USB sạc điện thoại. Nước uống miễn phí. Sẽ đi lần nữa.', route: 'HCM - Đà Lạt', date: '2026-04-06T07:45:00Z' },

  // === Tuyến HCM - Nha Trang ===
  { id: 'VXN-VX-011', reviewer: 'Phan T. Cúc', rating: 5, comment: 'Chuyến đi HCM-Nha Trang rất tốt. Xe rộng, ghế êm, điều hòa dễ chịu. Tài xế kinh nghiệm, lái cẩn thận. Đến đúng giờ.', route: 'HCM - Nha Trang', date: '2026-04-15T20:00:00Z' },
  { id: 'VXN-VX-012', reviewer: 'Lý T. Nga', rating: 4, comment: 'Xe giường nằm khá thoải mái cho chuyến đêm. Có chăn gối đầy đủ. Tài xế lái êm. Chỉ tiếc toilet trên xe không được sạch lắm.', route: 'HCM - Nha Trang', date: '2026-04-14T21:00:00Z' },
  { id: 'VXN-VX-013', reviewer: 'Trương V. Nam', rating: 3, comment: 'Xe đến trễ 15 phút. Chỗ để hành lý hơi chật khi đi cùng vali lớn. Nhân viên thái độ bình thường, không nhiệt tình.', route: 'HCM - Nha Trang', date: '2026-04-13T19:30:00Z' },
  { id: 'VXN-VX-014', reviewer: 'Vũ T. Hạnh', rating: 5, comment: 'Đặt vé rất dễ trên app. Xe đến đúng điểm đón, đúng giờ. Ghế limousine rộng thoải mái. Nhân viên thân thiện. 5 sao!', route: 'HCM - Nha Trang', date: '2026-04-12T20:30:00Z' },
  { id: 'VXN-VX-015', reviewer: 'Cao T. Thủy', rating: 4, comment: 'Xe sạch đẹp, mới. Điều hòa mát vừa phải. Tài xế lịch sự. Trạm dừng nghỉ giữa đường ổn. Sẽ đi lại.', route: 'HCM - Nha Trang', date: '2026-04-11T21:15:00Z' },
  { id: 'VXN-VX-016', reviewer: 'Đinh Q. Hùng', rating: 2, comment: 'Chất lượng đi xuống so với trước. Xe cũ, điều hòa yếu. Tài xế lái nhanh và phanh gấp nhiều lần. Không thoải mái.', route: 'HCM - Nha Trang', date: '2026-04-10T20:00:00Z' },
  { id: 'VXN-VX-017', reviewer: 'Tô T. Xuân', rating: 5, comment: 'Rất hài lòng! Xe cabin riêng có khóa, an toàn. Có ổ cắm điện và USB. Wifi ok. Tài xế chuyên nghiệp.', route: 'HCM - Nha Trang', date: '2026-04-09T19:45:00Z' },
  { id: 'VXN-VX-018', reviewer: 'Mai V. Long', rating: 4, comment: 'Lần thứ 3 đi VeXeNhanh tuyến Nha Trang, vẫn ổn. Xe sạch, đúng giờ. Nhân viên nhắc nhở hành khách đúng mực.', route: 'HCM - Nha Trang', date: '2026-04-08T20:45:00Z' },
  { id: 'VXN-VX-019', reviewer: 'Hà T. Thanh', rating: 5, comment: 'Tuyệt vời, xe limousine sang trọng. Có màn hình riêng, có nước, có khăn lạnh. Cảm giác như đi máy bay hạng thương gia.', route: 'HCM - Nha Trang', date: '2026-04-07T21:00:00Z' },
  { id: 'VXN-VX-020', reviewer: 'Kiều V. Khang', rating: 3, comment: 'Xe ổn nhưng tài xế bóp còi liên tục trong đêm làm khó ngủ. Hy vọng VeXeNhanh nhắc nhở tài xế về điều này.', route: 'HCM - Nha Trang', date: '2026-04-06T22:00:00Z' },

  // === Tuyến HCM - Phan Thiết ===
  { id: 'VXN-VX-021', reviewer: 'Lâm T. Bích', rating: 5, comment: 'Tuyến HCM Phan Thiết rất tiện. Xe đến điểm đón đúng giờ, đến Phan Thiết sớm hơn dự kiến. Tài xế thân thiện.', route: 'HCM - Phan Thiết', date: '2026-04-15T05:30:00Z' },
  { id: 'VXN-VX-022', reviewer: 'Hồ Q. Minh', rating: 4, comment: 'Đặt vé dễ, lên xe nhanh. Xe sạch, ghế ổn. Chuyến sáng sớm thoải mái không kẹt xe. Hài lòng.', route: 'HCM - Phan Thiết', date: '2026-04-14T06:00:00Z' },
  { id: 'VXN-VX-023', reviewer: 'Châu T. Kim', rating: 5, comment: 'Xe mới tinh, có USB sạc. Tài xế lịch sự chào hỏi khách. Đường cao tốc chạy êm. Đến Phan Thiết đúng giờ.', route: 'HCM - Phan Thiết', date: '2026-04-13T05:45:00Z' },
  { id: 'VXN-VX-024', reviewer: 'La T. Uyên', rating: 4, comment: 'Chuyến đi tốt, xe sạch và mát. Nhân viên bán vé tận tình hướng dẫn điểm đón. Sẽ đặt lại cho chuyến sau.', route: 'HCM - Phan Thiết', date: '2026-04-12T06:30:00Z' },
  { id: 'VXN-VX-025', reviewer: 'Đỗ V. Phát', rating: 3, comment: 'Xe bình thường, không có gì nổi bật. Điểm trừ là điều hòa hơi yếu vào buổi trưa nóng. Nhìn chung chấp nhận được.', route: 'HCM - Phan Thiết', date: '2026-04-11T07:00:00Z' },
  { id: 'VXN-VX-026', reviewer: 'Quách T. Tuyết', rating: 5, comment: 'Hay lắm! Đặt vé qua app nhanh, không cần ra bến xe. Xe đến tận cửa nhà đón. Tiện lợi tuyệt vời.', route: 'HCM - Phan Thiết', date: '2026-04-10T05:15:00Z' },
  { id: 'VXN-VX-027', reviewer: 'Tiêu V. Lộc', rating: 4, comment: 'Chuyến đi êm, không say xe dù đường có vài đoạn gập ghềnh. Tài xế có kinh nghiệm. Xe khá sạch sẽ.', route: 'HCM - Phan Thiết', date: '2026-04-09T06:00:00Z' },
  { id: 'VXN-VX-028', reviewer: 'Nhan T. Diệu', rating: 1, comment: 'Trải nghiệm tệ. Xe trễ 1 tiếng không báo trước. Gọi điện tổng đài không nghe máy. Đến nơi còn bị nhầm điểm trả khách.', route: 'HCM - Phan Thiết', date: '2026-04-08T08:00:00Z' },
  { id: 'VXN-VX-029', reviewer: 'Sầm T. Hoa', rating: 5, comment: 'Rất tốt! Xe limousine sạch đẹp, có nước uống. Nhân viên vui vẻ. Tài xế lái êm và cẩn thận. Đúng giờ.', route: 'HCM - Phan Thiết', date: '2026-04-07T05:30:00Z' },
  { id: 'VXN-VX-030', reviewer: 'Lục V. Tài', rating: 4, comment: 'Đi lần này thấy xe mới hơn lần trước. Ghế thoải mái hơn. Dịch vụ ổn, không có gì phàn nàn.', route: 'HCM - Phan Thiết', date: '2026-04-06T06:15:00Z' },

  // === Tuyến HCM - Cần Thơ ===
  { id: 'VXN-VX-031', reviewer: 'Mạch T. Thùy', rating: 5, comment: 'Tuyến HCM Cần Thơ đi VeXeNhanh rất ổn. Xe đúng giờ, ghế thoải mái, điều hòa dễ chịu. Sẽ tiếp tục ủng hộ.', route: 'HCM - Cần Thơ', date: '2026-04-15T13:00:00Z' },
  { id: 'VXN-VX-032', reviewer: 'Nghiêm Q. Vinh', rating: 4, comment: 'Chuyến chiều đi Cần Thơ. Xe sạch, có USB sạc. Tài xế lái ổn. Chỉ tắc đường chút ở đầu HCM nhưng không phải lỗi xe.', route: 'HCM - Cần Thơ', date: '2026-04-14T14:00:00Z' },
  { id: 'VXN-VX-033', reviewer: 'Quan T. Phúc', rating: 5, comment: 'Ấn tượng với dịch vụ VeXeNhanh. Đặt vé nhanh, điểm đón thuận tiện. Xe sạch và mới. Nhân viên thân thiện.', route: 'HCM - Cần Thơ', date: '2026-04-13T12:30:00Z' },
  { id: 'VXN-VX-034', reviewer: 'Kha T. Hải', rating: 3, comment: 'Xe ổn nhưng ghế hơi cứng khi ngồi 3-4 tiếng. Trạm dừng chân vệ sinh không được sạch. Tài xế bình thường.', route: 'HCM - Cần Thơ', date: '2026-04-12T13:15:00Z' },
  { id: 'VXN-VX-035', reviewer: 'Ung T. Ngọc', rating: 4, comment: 'Hay hơn tôi nghĩ. Xe đúng giờ, sạch sẽ. Có nước uống miễn phí. Tài xế lái cẩn thận. Sẽ đi lại.', route: 'HCM - Cần Thơ', date: '2026-04-11T14:00:00Z' },
  { id: 'VXN-VX-036', reviewer: 'Tăng V. Quý', rating: 5, comment: 'Xe cabin riêng cực kỳ thoải mái. Có rèm che riêng tư. Yên tĩnh, ít tiếng ồn. Ngủ được trên xe. Tuyệt!', route: 'HCM - Cần Thơ', date: '2026-04-10T13:00:00Z' },
  { id: 'VXN-VX-037', reviewer: 'Diệp T. Châu', rating: 2, comment: 'Xe đến trễ 30 phút. Điều hòa lúc nóng lúc lạnh. Nhân viên trên xe không nhiệt tình. Cần cải thiện nhiều.', route: 'HCM - Cần Thơ', date: '2026-04-09T15:00:00Z' },
  { id: 'VXN-VX-038', reviewer: 'Liêu T. Duyên', rating: 5, comment: 'Rất hài lòng! Đây là lần thứ 5 tôi đi VeXeNhanh tuyến này. Luôn đúng giờ và xe sạch. Giá cả phải chăng.', route: 'HCM - Cần Thơ', date: '2026-04-08T12:00:00Z' },
  { id: 'VXN-VX-039', reviewer: 'Tiền V. Đạt', rating: 4, comment: 'Chuyến đi tốt, xe sạch. Tài xế chuyên nghiệp. Điểm cộng là có app dễ dùng để đặt và theo dõi xe.', route: 'HCM - Cần Thơ', date: '2026-04-07T13:30:00Z' },
  { id: 'VXN-VX-040', reviewer: 'Mã T. Loan', rating: 5, comment: 'Xe sạch, mới, hiện đại. Ghế massage rất thoải mái. Nhân viên phục vụ chu đáo. Giá hơi cao nhưng xứng đáng.', route: 'HCM - Cần Thơ', date: '2026-04-06T14:00:00Z' },

  // === Tuyến HCM - Vũng Tàu ===
  { id: 'VXN-VX-041', reviewer: 'Trần V. Bình', rating: 5, comment: 'Tuyến Vũng Tàu rất tiện. Xe đến tận phòng đón, thả tận nơi. Không phải ra bến. Thoải mái và tiết kiệm thời gian.', route: 'HCM - Vũng Tàu', date: '2026-04-15T09:00:00Z' },
  { id: 'VXN-VX-042', reviewer: 'Lê T. Hiền', rating: 4, comment: 'Đi cuối tuần vẫn có chỗ. Xe sạch, điều hòa mát. Đến Vũng Tàu đúng giờ dù đường khá đông xe.', route: 'HCM - Vũng Tàu', date: '2026-04-13T08:30:00Z' },
  { id: 'VXN-VX-043', reviewer: 'Nguyễn T. Oanh', rating: 5, comment: 'Lần nào đi VeXeNhanh cũng hài lòng. Xe luôn sạch, đúng giờ. Nhân viên nhiệt tình. Recommend cho mọi người.', route: 'HCM - Vũng Tàu', date: '2026-04-12T07:45:00Z' },
  { id: 'VXN-VX-044', reviewer: 'Phạm T. Liên', rating: 3, comment: 'Chuyến đi bình thường. Xe cũ hơn tôi kỳ vọng. Điều hòa đủ mát nhưng có mùi nhẹ. Tài xế lái ổn.', route: 'HCM - Vũng Tàu', date: '2026-04-11T09:15:00Z' },
  { id: 'VXN-VX-045', reviewer: 'Hoàng V. Khoa', rating: 4, comment: 'Đặt vé 1 ngày trước vẫn còn chỗ. Xe đến đúng giờ, sạch sẽ. Tài xế lịch sự chào khách lên xe.', route: 'HCM - Vũng Tàu', date: '2026-04-10T08:00:00Z' },
  { id: 'VXN-VX-046', reviewer: 'Đặng T. Hoa', rating: 5, comment: 'Tuyệt vời! Cabin riêng có rèm, rất yên tĩnh. Tài xế lái êm không giật. Đến Vũng Tàu nghỉ ngơi thoải mái.', route: 'HCM - Vũng Tàu', date: '2026-04-09T07:30:00Z' },
  { id: 'VXN-VX-047', reviewer: 'Bùi V. Tuấn', rating: 4, comment: 'Hay lắm! Xe sạch, ghế thoải mái. Wifi ổn. Nhân viên thân thiện. Chỉ trừ 1 sao vì xe đến trễ 10 phút.', route: 'HCM - Vũng Tàu', date: '2026-04-08T08:45:00Z' },
  { id: 'VXN-VX-048', reviewer: 'Vũ T. Hương', rating: 5, comment: 'Đi cùng gia đình 4 người, rất hài lòng. Xe rộng, thoải mái. Con nhỏ không bị say xe. Sẽ đi lại.', route: 'HCM - Vũng Tàu', date: '2026-04-07T09:00:00Z' },
  { id: 'VXN-VX-049', reviewer: 'Ngô T. Phú', rating: 3, comment: 'Chuyến đi ổn nhưng phụ xe thái độ hơi khó tính khi tôi hỏi về hành lý. Xe sạch. Đúng giờ.', route: 'HCM - Vũng Tàu', date: '2026-04-06T08:15:00Z' },
  { id: 'VXN-VX-050', reviewer: 'Cao T. Hà', rating: 5, comment: 'Cực kỳ hài lòng với VeXeNhanh. Đặt vé dễ, xe đúng giờ, sạch đẹp. Nhân viên chuyên nghiệp. 5 sao xứng đáng!', route: 'HCM - Vũng Tàu', date: '2026-04-05T07:00:00Z' },
];

async function seed() {
  console.log('🚀 Bắt đầu insert 50 reviews VeXeNhanh (nguồn: vexere)...\n');
  let inserted = 0;
  let skipped = 0;

  for (const r of REVIEWS) {
    const targetCode = `BUS-VXN-${r.route.replace(/\s/g, '').toUpperCase().substring(4, 10)}`;
    const rawPayload = {
      id: r.id,
      source: 'vexere',
      reviewerName: r.reviewer,
      rating: r.rating,
      comment: r.comment,
      route: r.route,
      operatorName: 'VeXeNhanh',
    };

    const res = await db.query(
      `INSERT INTO public.reviews (
        id, operator_code, category, target_code, target_name,
        reviewer_name, rating, comment, visibility,
        source_system, moderation_status, created_at,
        owner_partner_code, raw_payload
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO NOTHING`,
      [
        r.id, 'PT-001', 'Nhà xe', targetCode, `VeXeNhanh Tuyến ${r.route}`,
        r.reviewer, r.rating, r.comment, 'public',
        'vexere', 'approved', r.date,
        'PT-001', JSON.stringify(rawPayload),
      ]
    );

    if (res.rowCount > 0) {
      console.log(`  ✓ ${r.id} — ${r.route} (${r.rating}⭐) — ${r.reviewer}`);
      inserted++;
    } else {
      console.log(`  ⚠ ${r.id} đã tồn tại`);
      skipped++;
    }
  }

  // Cập nhật tổng rating VeXeNhanh
  const avg = REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length;
  await db.query(
    `UPDATE public.transport_operators SET overall_rating=$2, total_reviews=$3, updated_at=now() WHERE operator_code=$1`,
    ['PT-001', avg.toFixed(2), 50]
  );

  console.log(`\n✅ Xong: ${inserted} inserted, ${skipped} skipped`);
  console.log(`📊 Rating trung bình VeXeNhanh: ${avg.toFixed(2)}/5`);
  await db.end();
}

seed().catch(console.error);
