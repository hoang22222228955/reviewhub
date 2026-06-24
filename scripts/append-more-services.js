const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, 'seed-operators.js');

if (!fs.existsSync(seedPath)) {
  console.error('Không tìm thấy seed-operators.js trong thư mục scripts');
  process.exit(1);
}

let content = fs.readFileSync(seedPath, 'utf8');

const MORE_SERVICES = `
  // === MÁY BAY ===
  { code: 'MB-001', name: 'Vietnam Airlines', region: 'Toàn quốc / Quốc tế', type: 'Hãng hàng không quốc gia', hotline: '1900 1100', website: 'vietnamairlines.com', description: 'Hãng hàng không quốc gia Việt Nam, khai thác nhiều đường bay nội địa và quốc tế, phù hợp khách công tác và du lịch.' },
  { code: 'MB-002', name: 'Vietjet Air', region: 'Toàn quốc / Quốc tế', type: 'Hãng hàng không giá tốt', hotline: '1900 1886', website: 'vietjetair.com', description: 'Hãng bay phổ biến với mạng bay rộng, nhiều chuyến nội địa, mức giá linh hoạt và tần suất bay cao.' },
  { code: 'MB-003', name: 'Bamboo Airways', region: 'Toàn quốc', type: 'Hãng hàng không dịch vụ', hotline: '1900 1166', website: 'bambooairways.com', description: 'Hãng bay nội địa tập trung vào trải nghiệm dịch vụ, phù hợp các tuyến du lịch và công tác.' },
  { code: 'MB-004', name: 'Vietravel Airlines', region: 'Toàn quốc', type: 'Hãng bay du lịch', hotline: '1900 6686', website: 'vietravelairlines.vn', description: 'Hãng bay định hướng du lịch, kết nối các điểm đến nổi bật trong nước và một số tuyến quốc tế.' },
  { code: 'MB-005', name: 'Pacific Airlines', region: 'Toàn quốc', type: 'Hãng hàng không phổ thông', hotline: '1900 1550', website: 'pacificairlines.com', description: 'Hãng bay phục vụ nhu cầu di chuyển phổ thông với các tuyến nội địa chính.' },
  { code: 'MB-006', name: 'VASCO', region: 'Miền Nam / Đảo', type: 'Hãng bay khu vực', hotline: '1900 1100', website: 'vasco.com.vn', description: 'Đơn vị khai thác các đường bay khu vực, đặc biệt phù hợp tuyến đảo và địa phương.' },
  { code: 'MB-007', name: 'Singapore Airlines', region: 'Quốc tế', type: 'Hãng hàng không 5 sao', hotline: '028 3823 1588', website: 'singaporeair.com', description: 'Hãng bay quốc tế nổi tiếng với chất lượng dịch vụ cao, phù hợp các chuyến bay quốc tế đường dài.' },
  { code: 'MB-008', name: 'Qatar Airways', region: 'Quốc tế', type: 'Hãng hàng không 5 sao', hotline: '028 3827 8788', website: 'qatarairways.com', description: 'Hãng bay quốc tế kết nối Việt Nam với Trung Đông, châu Âu và nhiều điểm đến toàn cầu.' },
  { code: 'MB-009', name: 'Emirates', region: 'Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3911 3099', website: 'emirates.com', description: 'Hãng hàng không quốc tế nổi bật với dịch vụ đường dài, trung chuyển qua Dubai.' },
  { code: 'MB-010', name: 'Thai Airways', region: 'Đông Nam Á / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3822 3365', website: 'thaiairways.com', description: 'Hãng bay Thái Lan kết nối Việt Nam với Bangkok và nhiều điểm đến quốc tế.' },
  { code: 'MB-011', name: 'AirAsia', region: 'Đông Nam Á', type: 'Hãng bay giá tốt', hotline: '1900 636 065', website: 'airasia.com', description: 'Hãng bay phổ biến ở Đông Nam Á, phù hợp khách du lịch tự túc và hành trình ngắn.' },
  { code: 'MB-012', name: 'Korean Air', region: 'Hàn Quốc / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3824 2878', website: 'koreanair.com', description: 'Hãng hàng không Hàn Quốc, phù hợp tuyến Việt Nam - Hàn Quốc và nối chuyến quốc tế.' },
  { code: 'MB-013', name: 'Asiana Airlines', region: 'Hàn Quốc / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3822 6111', website: 'flyasiana.com', description: 'Hãng bay Hàn Quốc với nhiều tuyến kết nối châu Á, phù hợp khách du lịch và công tác.' },
  { code: 'MB-014', name: 'Cathay Pacific', region: 'Hong Kong / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3822 3203', website: 'cathaypacific.com', description: 'Hãng bay quốc tế trung chuyển qua Hong Kong, phù hợp các hành trình châu Á, Úc, châu Âu.' },
  { code: 'MB-015', name: 'EVA Air', region: 'Đài Loan / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3822 4488', website: 'evaair.com', description: 'Hãng hàng không Đài Loan có nhiều chuyến bay nối Việt Nam với Đài Bắc và quốc tế.' },
  { code: 'MB-016', name: 'China Airlines', region: 'Đài Loan / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3827 8888', website: 'china-airlines.com', description: 'Hãng bay Đài Loan phục vụ các tuyến châu Á và nối chuyến quốc tế.' },
  { code: 'MB-017', name: 'Japan Airlines', region: 'Nhật Bản / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3827 9155', website: 'jal.co.jp', description: 'Hãng hàng không Nhật Bản, phù hợp tuyến Việt Nam - Nhật Bản và các hành trình quốc tế.' },
  { code: 'MB-018', name: 'All Nippon Airways', region: 'Nhật Bản / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3822 9612', website: 'ana.co.jp', description: 'Hãng bay Nhật Bản nổi bật về dịch vụ, đúng giờ và trải nghiệm bay quốc tế.' },
  { code: 'MB-019', name: 'Turkish Airlines', region: 'Châu Âu / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3827 8888', website: 'turkishairlines.com', description: 'Hãng bay quốc tế kết nối Việt Nam với châu Âu, Trung Đông và nhiều điểm đến toàn cầu.' },
  { code: 'MB-020', name: 'Lufthansa', region: 'Châu Âu / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3822 8898', website: 'lufthansa.com', description: 'Hãng hàng không Đức phục vụ hành trình quốc tế, phù hợp khách công tác và du lịch châu Âu.' },

  // === TÀU HỎA ===
  { code: 'TH-001', name: 'Tuyến SE1 Hà Nội - TP. Hồ Chí Minh', region: 'Bắc - Nam', type: 'Tàu Thống Nhất', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu Thống Nhất chiều Hà Nội đi TP. Hồ Chí Minh, phù hợp hành trình xuyên Việt.' },
  { code: 'TH-002', name: 'Tuyến SE2 TP. Hồ Chí Minh - Hà Nội', region: 'Nam - Bắc', type: 'Tàu Thống Nhất', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu Thống Nhất chiều TP. Hồ Chí Minh đi Hà Nội, phục vụ hành trình dài Bắc Nam.' },
  { code: 'TH-003', name: 'Tuyến SE3 Hà Nội - Sài Gòn', region: 'Bắc - Nam', type: 'Tàu nhanh', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu nhanh Bắc Nam, phù hợp hành khách cần di chuyển đường dài bằng đường sắt.' },
  { code: 'TH-004', name: 'Tuyến SE4 Sài Gòn - Hà Nội', region: 'Nam - Bắc', type: 'Tàu nhanh', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu nhanh từ Sài Gòn ra Hà Nội, phục vụ khách du lịch và công tác.' },
  { code: 'TH-005', name: 'Tuyến Hà Nội - Hải Phòng', region: 'Hà Nội - Hải Phòng', type: 'Tàu địa phương', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu ngắn kết nối Hà Nội và Hải Phòng, phù hợp đi lại cuối tuần.' },
  { code: 'TH-006', name: 'Tuyến Hải Phòng - Hà Nội', region: 'Hải Phòng - Hà Nội', type: 'Tàu địa phương', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu địa phương từ Hải Phòng về Hà Nội, giá tốt và lịch chạy ổn định.' },
  { code: 'TH-007', name: 'Tuyến Hà Nội - Lào Cai', region: 'Hà Nội - Lào Cai / Sa Pa', type: 'Tàu du lịch', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu du lịch kết nối Hà Nội với Lào Cai, phù hợp khách đi Sa Pa.' },
  { code: 'TH-008', name: 'Tuyến Lào Cai - Hà Nội', region: 'Lào Cai - Hà Nội', type: 'Tàu du lịch', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu đêm từ Lào Cai về Hà Nội, thường được khách du lịch Sa Pa lựa chọn.' },
  { code: 'TH-009', name: 'Tuyến Hà Nội - Vinh', region: 'Hà Nội - Nghệ An', type: 'Tàu Bắc Trung Bộ', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu kết nối Hà Nội và Vinh, phục vụ khách đi Nghệ An và khu vực lân cận.' },
  { code: 'TH-010', name: 'Tuyến Vinh - Hà Nội', region: 'Nghệ An - Hà Nội', type: 'Tàu Bắc Trung Bộ', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu Vinh đi Hà Nội, phù hợp sinh viên, người lao động và khách công tác.' },
  { code: 'TH-011', name: 'Tuyến Sài Gòn - Nha Trang', region: 'TP. Hồ Chí Minh - Nha Trang', type: 'Tàu du lịch biển', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu từ Sài Gòn đi Nha Trang, phù hợp du lịch biển và nghỉ dưỡng.' },
  { code: 'TH-012', name: 'Tuyến Nha Trang - Sài Gòn', region: 'Nha Trang - TP. Hồ Chí Minh', type: 'Tàu du lịch biển', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu từ Nha Trang về Sài Gòn, có nhiều lựa chọn ghế và giường nằm.' },
  { code: 'TH-013', name: 'Tuyến Sài Gòn - Phan Thiết', region: 'TP. Hồ Chí Minh - Bình Thuận', type: 'Tàu du lịch', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu ngắn đến Phan Thiết, phù hợp du lịch Mũi Né và cuối tuần.' },
  { code: 'TH-014', name: 'Tuyến Phan Thiết - Sài Gòn', region: 'Bình Thuận - TP. Hồ Chí Minh', type: 'Tàu du lịch', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu từ Phan Thiết về Sài Gòn, thuận tiện cho khách du lịch cuối tuần.' },
  { code: 'TH-015', name: 'Tuyến Đà Nẵng - Huế', region: 'Đà Nẵng - Huế', type: 'Tàu di sản miền Trung', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu ngắn qua cung đường ven biển miền Trung, phù hợp trải nghiệm du lịch.' },
  { code: 'TH-016', name: 'Tuyến Huế - Đà Nẵng', region: 'Huế - Đà Nẵng', type: 'Tàu di sản miền Trung', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu Huế đi Đà Nẵng, được khách du lịch yêu thích nhờ cảnh quan đẹp.' },
  { code: 'TH-017', name: 'Tuyến Đà Nẵng - Quy Nhơn', region: 'Đà Nẵng - Bình Định', type: 'Tàu miền Trung', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu ven biển miền Trung, phù hợp khách du lịch muốn trải nghiệm chậm và an toàn.' },
  { code: 'TH-018', name: 'Tuyến Quy Nhơn - Đà Nẵng', region: 'Bình Định - Đà Nẵng', type: 'Tàu miền Trung', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến tàu từ Quy Nhơn đi Đà Nẵng, kết nối các điểm du lịch miền Trung.' },
  { code: 'TH-019', name: 'Tuyến Sài Gòn - Đà Lạt', region: 'TP. Hồ Chí Minh - Lâm Đồng', type: 'Tuyến kết hợp tàu/xe', hotline: '1900 6469', website: 'dsvn.vn', description: 'Dịch vụ hành trình kết hợp đường sắt và trung chuyển đến Đà Lạt, phù hợp du lịch nghỉ dưỡng.' },
  { code: 'TH-020', name: 'Tuyến Hà Nội - Hạ Long', region: 'Hà Nội - Quảng Ninh', type: 'Tàu du lịch', hotline: '1900 6469', website: 'dsvn.vn', description: 'Tuyến du lịch kết nối Hà Nội và Hạ Long, phù hợp khách đi biển đảo phía Bắc.' },

  // === TOUR ===
  { code: 'TO-001', name: 'Tour Sa Pa 3 ngày 2 đêm', region: 'Hà Nội - Sa Pa', type: 'Tour miền núi', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour khám phá Sa Pa, bản Cát Cát, Fansipan và văn hóa Tây Bắc, phù hợp gia đình và nhóm bạn.' },
  { code: 'TO-002', name: 'Tour Hạ Long 2 ngày 1 đêm', region: 'Hà Nội - Hạ Long', type: 'Tour biển đảo', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour vịnh Hạ Long nghỉ đêm hoặc tham quan du thuyền, phù hợp khách du lịch miền Bắc.' },
  { code: 'TO-003', name: 'Tour Ninh Bình Tràng An - Bái Đính', region: 'Hà Nội - Ninh Bình', type: 'Tour văn hóa', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour khám phá Tràng An, chùa Bái Đính và cảnh quan cố đô, phù hợp đi trong ngày hoặc 2 ngày.' },
  { code: 'TO-004', name: 'Tour Hà Giang 3 ngày 2 đêm', region: 'Hà Nội - Hà Giang', type: 'Tour khám phá', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour cung đường Hà Giang, Đồng Văn, Mã Pì Lèng, phù hợp khách thích trải nghiệm thiên nhiên.' },
  { code: 'TO-005', name: 'Tour Đà Nẵng - Hội An - Huế', region: 'Miền Trung', type: 'Tour di sản', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour kết hợp Đà Nẵng, phố cổ Hội An và cố đô Huế, phù hợp gia đình và khách đoàn.' },
  { code: 'TO-006', name: 'Tour Bà Nà Hills 1 ngày', region: 'Đà Nẵng', type: 'Tour vui chơi', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour tham quan Bà Nà Hills, cầu Vàng và khu vui chơi, phù hợp chuyến đi ngắn tại Đà Nẵng.' },
  { code: 'TO-007', name: 'Tour Cù Lao Chàm 1 ngày', region: 'Hội An - Quảng Nam', type: 'Tour biển đảo', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour biển đảo Cù Lao Chàm, lặn ngắm san hô và trải nghiệm hải sản địa phương.' },
  { code: 'TO-008', name: 'Tour Nha Trang 3 ngày 2 đêm', region: 'Nha Trang', type: 'Tour biển', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour nghỉ dưỡng biển Nha Trang, tham quan đảo, tắm biển và trải nghiệm ẩm thực.' },
  { code: 'TO-009', name: 'Tour Đà Lạt 3 ngày 2 đêm', region: 'Đà Lạt', type: 'Tour nghỉ dưỡng', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour Đà Lạt khám phá thác, hồ, nông trại và không khí cao nguyên, phù hợp mọi lứa tuổi.' },
  { code: 'TO-010', name: 'Tour Phú Quốc 4 ngày 3 đêm', region: 'Phú Quốc', type: 'Tour nghỉ dưỡng biển', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour Phú Quốc nghỉ dưỡng, tham quan Nam đảo, cáp treo Hòn Thơm và chợ đêm.' },
  { code: 'TO-011', name: 'Tour Côn Đảo 3 ngày 2 đêm', region: 'Côn Đảo', type: 'Tour biển đảo', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour Côn Đảo kết hợp nghỉ dưỡng biển, lịch sử và trải nghiệm thiên nhiên hoang sơ.' },
  { code: 'TO-012', name: 'Tour Miền Tây 2 ngày 1 đêm', region: 'TP. Hồ Chí Minh - Miền Tây', type: 'Tour sông nước', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour trải nghiệm chợ nổi, vườn trái cây và văn hóa sông nước miền Tây Nam Bộ.' },
  { code: 'TO-013', name: 'Tour Củ Chi - Mekong 1 ngày', region: 'TP. Hồ Chí Minh - Củ Chi - Mỹ Tho', type: 'Tour trong ngày', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour kết hợp địa đạo Củ Chi và trải nghiệm sông nước Mekong trong ngày.' },
  { code: 'TO-014', name: 'Tour Mũi Né 2 ngày 1 đêm', region: 'TP. Hồ Chí Minh - Mũi Né', type: 'Tour biển', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour Mũi Né tham quan đồi cát, làng chài và nghỉ dưỡng biển cuối tuần.' },
  { code: 'TO-015', name: 'Tour Quy Nhơn - Phú Yên 4 ngày 3 đêm', region: 'Bình Định - Phú Yên', type: 'Tour biển miền Trung', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour khám phá Kỳ Co, Eo Gió, Gành Đá Đĩa và cung đường biển miền Trung.' },
  { code: 'TO-016', name: 'Tour Mộc Châu 2 ngày 1 đêm', region: 'Hà Nội - Mộc Châu', type: 'Tour cao nguyên', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour Mộc Châu ngắm đồi chè, thác Dải Yếm và không gian cao nguyên Tây Bắc.' },
  { code: 'TO-017', name: 'Tour Mai Châu 2 ngày 1 đêm', region: 'Hà Nội - Mai Châu', type: 'Tour cộng đồng', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour Mai Châu trải nghiệm văn hóa bản làng, nhà sàn và cảnh quan thung lũng.' },
  { code: 'TO-018', name: 'Tour Singapore 4 ngày 3 đêm', region: 'Quốc tế', type: 'Tour quốc tế', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour Singapore tham quan Marina Bay, Sentosa và các điểm đến nổi bật.' },
  { code: 'TO-019', name: 'Tour Thái Lan Bangkok - Pattaya', region: 'Quốc tế', type: 'Tour quốc tế', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour Thái Lan kết hợp Bangkok, Pattaya, mua sắm và trải nghiệm văn hóa.' },
  { code: 'TO-020', name: 'Tour Hàn Quốc Seoul - Nami', region: 'Quốc tế', type: 'Tour quốc tế', hotline: '1900 2024', website: 'reviewhub.vn/tours', description: 'Tour Hàn Quốc tham quan Seoul, đảo Nami, mua sắm và trải nghiệm ẩm thực.' },

  // === DỊCH VỤ KHÁC ===
  { code: 'DV-001', name: 'Dịch vụ đưa đón sân bay', region: 'Toàn quốc', type: 'Airport transfer', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ đặt xe đưa đón sân bay, hỗ trợ theo chuyến bay, phù hợp khách công tác và du lịch.' },
  { code: 'DV-002', name: 'Dịch vụ thuê xe tự lái', region: 'Toàn quốc', type: 'Thuê xe', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ thuê xe tự lái theo ngày, hỗ trợ nhiều dòng xe, phù hợp gia đình và nhóm bạn.' },
  { code: 'DV-003', name: 'Dịch vụ thuê xe có tài xế', region: 'Toàn quốc', type: 'Thuê xe du lịch', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ thuê xe kèm tài xế cho du lịch, công tác và đưa đón sự kiện.' },
  { code: 'DV-004', name: 'Dịch vụ đặt vé tham quan', region: 'Toàn quốc', type: 'Vé tham quan', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ hỗ trợ đặt vé khu vui chơi, điểm tham quan, cáp treo và bảo tàng.' },
  { code: 'DV-005', name: 'Dịch vụ bảo hiểm du lịch', region: 'Toàn quốc / Quốc tế', type: 'Bảo hiểm', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ tư vấn và đặt bảo hiểm du lịch nội địa, quốc tế cho cá nhân và nhóm.' },
  { code: 'DV-006', name: 'Dịch vụ làm visa du lịch', region: 'Quốc tế', type: 'Visa', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ hỗ trợ hồ sơ visa du lịch, lịch hẹn và tư vấn thủ tục theo từng quốc gia.' },
  { code: 'DV-007', name: 'Dịch vụ hộ chiếu và giấy tờ du lịch', region: 'Toàn quốc', type: 'Hồ sơ du lịch', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ tư vấn chuẩn bị giấy tờ, hồ sơ du lịch và các thủ tục liên quan.' },
  { code: 'DV-008', name: 'Dịch vụ eSIM du lịch', region: 'Quốc tế', type: 'Kết nối internet', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ cung cấp eSIM du lịch quốc tế, hỗ trợ truy cập internet khi đi nước ngoài.' },
  { code: 'DV-009', name: 'Dịch vụ đổi tiền du lịch', region: 'Toàn quốc / Quốc tế', type: 'Tài chính du lịch', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ hỗ trợ đổi ngoại tệ, tư vấn thanh toán và chi tiêu khi đi du lịch.' },
  { code: 'DV-010', name: 'Dịch vụ gửi hành lý', region: 'Sân bay / Trung tâm du lịch', type: 'Hành lý', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ gửi giữ hành lý tại sân bay, nhà ga, khách sạn và khu du lịch.' },
  { code: 'DV-011', name: 'Dịch vụ giao hành lý tận nơi', region: 'Thành phố lớn', type: 'Hành lý', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ vận chuyển hành lý từ sân bay hoặc khách sạn đến địa chỉ yêu cầu.' },
  { code: 'DV-012', name: 'Dịch vụ hướng dẫn viên địa phương', region: 'Toàn quốc', type: 'Hướng dẫn viên', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ thuê hướng dẫn viên địa phương theo ngày, phù hợp khách cá nhân và nhóm.' },
  { code: 'DV-013', name: 'Dịch vụ phiên dịch du lịch', region: 'Toàn quốc / Quốc tế', type: 'Phiên dịch', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ phiên dịch hỗ trợ khách du lịch, hội nghị, công tác và đoàn quốc tế.' },
  { code: 'DV-014', name: 'Dịch vụ đặt nhà hàng du lịch', region: 'Toàn quốc', type: 'Ẩm thực', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ hỗ trợ đặt bàn nhà hàng, set menu đoàn và trải nghiệm ẩm thực địa phương.' },
  { code: 'DV-015', name: 'Dịch vụ đặt du thuyền', region: 'Hạ Long / Nha Trang / Phú Quốc', type: 'Du thuyền', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ tư vấn và đặt du thuyền nghỉ đêm, tham quan vịnh, tiệc riêng và sự kiện.' },
  { code: 'DV-016', name: 'Dịch vụ booking engine OTA', region: 'Toàn quốc', type: 'Công nghệ du lịch', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ tích hợp booking engine cho đối tác du lịch, khách sạn và đơn vị vận chuyển.' },
  { code: 'DV-017', name: 'Dịch vụ quản lý đánh giá OTA', region: 'Toàn quốc', type: 'Quản lý review', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ tổng hợp, phân tích và hỗ trợ quản lý đánh giá từ nhiều nền tảng OTA.' },
  { code: 'DV-018', name: 'Dịch vụ chăm sóc khách hàng du lịch', region: 'Toàn quốc', type: 'CSKH', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ hỗ trợ tổng đài, phản hồi khách hàng và xử lý khiếu nại cho đối tác du lịch.' },
  { code: 'DV-019', name: 'Dịch vụ thiết kế lịch trình du lịch', region: 'Toàn quốc / Quốc tế', type: 'Tư vấn lịch trình', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ thiết kế lịch trình cá nhân hóa theo ngân sách, thời gian và sở thích.' },
  { code: 'DV-020', name: 'Dịch vụ hỗ trợ khẩn cấp du lịch', region: 'Toàn quốc / Quốc tế', type: 'Hỗ trợ 24/7', hotline: '1900 3030', website: 'reviewhub.vn/services', description: 'Dịch vụ hỗ trợ khách du lịch trong tình huống khẩn cấp, thay đổi lịch trình hoặc thất lạc giấy tờ.' },
`;

if (content.includes("code: 'MB-001'") || content.includes('code: "MB-001"')) {
  console.log('File seed-operators.js đã có MB-001 rồi. Không chèn lại để tránh trùng.');
  process.exit(0);
}

const marker = '\n\n];';

if (!content.includes(marker)) {
  console.error('Không tìm thấy vị trí cuối mảng OPERATORS. Hãy kiểm tra file seed-operators.js có kết thúc bằng ]; không.');
  process.exit(1);
}

content = content.replace(marker, `\n${MORE_SERVICES}\n];`);

content = content.replace('Bắt đầu seed ${OPERATORS.length} nhà xe', 'Bắt đầu seed ${OPERATORS.length} dịch vụ');
content = content.replace('Tổng nhà xe trong DB', 'Tổng dịch vụ trong DB');

fs.writeFileSync(seedPath, content, 'utf8');

console.log('Đã thêm 20 máy bay, 20 tàu hỏa, 20 tour, 20 dịch vụ khác vào seed-operators.js');
console.log('Bây giờ chạy: node seed-operators.js');