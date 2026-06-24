/**
 * seed-operators.js
 * Seed danh sách nhà xe vào bảng transport_operators
 * Chạy: node seed-operators.js
 */

require('dotenv').config();

const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const OPERATORS = [
  // === Đã có, upsert để cập nhật ===
  { code: 'PT-001', name: 'VeXeNhanh', region: 'Toàn quốc', type: 'Limousine / Ghế ngồi', hotline: '1900 6067', website: 'vexenhanh.vn', description: 'Nhà xe công nghệ chuyên tuyến HCM đi các tỉnh miền Nam và Tây Nguyên' },
  { code: 'PT-002', name: 'FUTA Bus Lines', region: 'Toàn quốc', type: 'Giường nằm / Limousine', hotline: '1900 6067', website: 'futabus.vn', description: 'Hệ thống xe khách lớn nhất Việt Nam, tuyến Bắc - Trung - Nam' },
  { code: 'PT-003', name: 'An Vui', region: 'HCM - Vũng Tàu', type: 'Cabin / Limousine', hotline: '028 3512 3456', website: 'anvui.vn', description: 'Nhà xe chuyên tuyến HCM - Vũng Tàu, xe cabin cao cấp' },

  // === Nhà xe mới ===
  { code: 'PT-004', name: 'Phương Trang', region: 'Toàn quốc', type: 'Giường nằm / Ghế ngồi', hotline: '1900 1165', website: 'futabus.vn', description: 'Xe khách đường dài uy tín, phủ khắp 60 tỉnh thành' },
  { code: 'PT-005', name: 'Thành Bưởi', region: 'HCM - Đà Lạt / Nha Trang', type: 'Giường nằm', hotline: '028 3838 9766', website: 'thanhbuoi.vn', description: 'Nhà xe truyền thống chuyên tuyến HCM - Đà Lạt, Nha Trang' },
  { code: 'PT-006', name: 'Hoàng Long', region: 'Bắc - Trung', type: 'Giường nằm / Ghế ngồi', hotline: '024 3833 1338', website: 'hoanglongasia.com', description: 'Hệ thống xe khách lớn khu vực phía Bắc và miền Trung' },
  { code: 'PT-007', name: 'Kumho Samco', region: 'Toàn quốc', type: 'Giường nằm / VIP Cabin', hotline: '1900 6899', website: 'kumhosamco.com.vn', description: 'Liên doanh Hàn - Việt, xe hiện đại, tuyến dài Bắc Nam' },
  { code: 'PT-008', name: 'Trung Nghĩa', region: 'HCM - Đà Lạt', type: 'Limousine / Ghế ngồi', hotline: '028 3558 1234', website: 'xetrungnghia.vn', description: 'Nhà xe chuyên tuyến HCM - Đà Lạt, xe mới và sạch sẽ' },
  { code: 'PT-009', name: 'Cúc Tùng', region: 'HCM - Đà Lạt / Nha Trang', type: 'Giường nằm', hotline: '028 6250 1234', website: 'xecuctung.vn', description: 'Xe giường nằm chất lượng cao tuyến HCM - Tây Nguyên' },
  { code: 'PT-010', name: 'Mai Linh Express', region: 'Toàn quốc', type: 'Ghế ngồi / Limousine', hotline: '1900 6666', website: 'mailinh.vn', description: 'Thương hiệu vận tải lớn, nhiều tuyến toàn quốc' },
  { code: 'PT-011', name: 'Xe Hạnh', region: 'HCM - Cần Thơ / Mekong', type: 'Ghế ngồi / Limousine', hotline: '0292 3812 345', description: 'Nhà xe uy tín tuyến HCM - đồng bằng sông Cửu Long' },
  { code: 'PT-012', name: 'Tân Phước Khánh', region: 'HCM - Bình Dương - Đà Lạt', type: 'Ghế ngồi / Limousine', hotline: '0274 3512 789', description: 'Nhà xe chuyên khu vực Bình Dương và các tỉnh miền Đông' },
  { code: 'PT-013', name: 'Sao Việt', region: 'Hà Nội - các tỉnh phía Bắc', type: 'Giường nằm / VIP', hotline: '024 6685 1234', website: 'saoviet.net.vn', description: 'Xe khách cao cấp tuyến Hà Nội - Bắc Ninh - Quảng Ninh' },
  { code: 'PT-014', name: 'Đức Thanh', region: 'HCM - Long An - Tiền Giang', type: 'Ghế ngồi', hotline: '0272 3512 456', description: 'Nhà xe tuyến HCM - Long An và các tỉnh lân cận' },
  { code: 'PT-015', name: 'Thuận Thảo', region: 'HCM - Quy Nhơn / Phú Yên', type: 'Giường nằm', hotline: '028 3933 1234', website: 'xethuanthao.vn', description: 'Xe giường nằm chất lượng cao tuyến HCM - miền Trung' },
  { code: 'PT-016', name: 'Vạn Xuân', region: 'HCM - Bình Thuận / Phan Thiết', type: 'Limousine / Ghế ngồi', hotline: '028 3612 5678', description: 'Nhà xe chuyên tuyến HCM - Phan Thiết, Mũi Né' },
  { code: 'PT-017', name: 'Xe Phương Nam', region: 'Toàn quốc', type: 'Giường nằm', hotline: '028 3755 1234', description: 'Xe khách truyền thống nhiều năm, tuyến dài Bắc - Nam' },
  { code: 'PT-018', name: 'Hoa Phượng', region: 'Hà Nội - Hải Phòng / Quảng Ninh', type: 'Ghế ngồi / Limousine', hotline: '0225 3812 123', description: 'Nhà xe uy tín khu vực phía Bắc, tuyến Hà Nội - Hải Phòng' },

  // === MIỀN NAM ===
  { code: 'PT-019', name: 'Sinh Tourist', region: 'Toàn quốc', type: 'Giường nằm / Ghế ngồi', hotline: '028 3838 9597', website: 'thesinhtourist.vn', description: 'Hãng xe du lịch - khách lớn, nhiều tuyến toàn quốc và quốc tế' },
  { code: 'PT-020', name: 'Eva Express', region: 'HCM - Đà Lạt / Nha Trang / Vũng Tàu', type: 'Limousine / VIP Cabin', hotline: '028 3620 8686', website: 'evaexpress.vn', description: 'Xe Limousine cao cấp tuyến HCM - Đà Lạt, Nha Trang' },
  { code: 'PT-021', name: 'Hanh Café', region: 'HCM - Mũi Né / Phan Thiết', type: 'Sleeper / Open Tour', hotline: '028 3838 1234', description: 'Xe open tour phong cách backpacker, tuyến HCM - Mũi Né' },
  { code: 'PT-022', name: 'Liên Hưng', region: 'HCM - Tiền Giang / Vĩnh Long / Cần Thơ', type: 'Ghế ngồi / Limousine', hotline: '0292 3812 000', description: 'Nhà xe quen thuộc tuyến HCM - đồng bằng sông Cửu Long' },
  { code: 'PT-023', name: 'Tấn Phát', region: 'HCM - Cà Mau / Bạc Liêu', type: 'Giường nằm / Ghế ngồi', hotline: '0290 3812 567', description: 'Xe khách tuyến HCM - miền Tây sâu (Cà Mau, Bạc Liêu)' },
  { code: 'PT-024', name: 'Thiện Trường', region: 'HCM - Kiên Giang / Phú Quốc', type: 'Giường nằm', hotline: '0297 3812 888', description: 'Chuyên tuyến HCM - Rạch Giá, kết hợp tàu ra Phú Quốc' },
  { code: 'PT-025', name: 'Xe Minh Quân', region: 'HCM - Sóc Trăng / Trà Vinh', type: 'Ghế ngồi / Limousine', hotline: '0299 3812 456', description: 'Nhà xe uy tín tuyến HCM - Sóc Trăng, Trà Vinh' },
  { code: 'PT-026', name: 'Mê Kông Express', region: 'HCM - Cần Thơ / Cà Mau', type: 'VIP Cabin / Limousine', hotline: '028 3710 3456', website: 'mekongexpress.com', description: 'Xe cao cấp chuyên tuyến đồng bằng sông Cửu Long' },

  // === MIỀN TRUNG ===
  { code: 'PT-027', name: 'Thùy Dương', region: 'Đà Nẵng - Hội An / Huế', type: 'Ghế ngồi / Limousine', hotline: '0236 3812 345', description: 'Nhà xe uy tín khu vực Đà Nẵng - Hội An - Huế' },
  { code: 'PT-028', name: 'Phú Quý', region: 'Đà Nẵng - Quảng Ngãi / Quảng Nam', type: 'Ghế ngồi', hotline: '0255 3812 678', description: 'Xe khách nội tỉnh và liên tỉnh khu vực miền Trung' },
  { code: 'PT-029', name: 'Tiến Thành', region: 'Đà Nẵng - Huế - Quảng Trị', type: 'Giường nằm / Ghế ngồi', hotline: '0234 3812 999', description: 'Xe khách miền Trung, nhiều tuyến Huế - Đà Nẵng - Quảng Trị' },
  { code: 'PT-030', name: 'Minh Châu', region: 'HCM - Quảng Ngãi / Bình Định', type: 'Giường nằm', hotline: '028 3933 5678', description: 'Nhà xe tuyến HCM - miền Trung dài ngày' },
  { code: 'PT-031', name: 'Quang Vinh', region: 'Huế - Hà Nội / Đà Nẵng', type: 'Giường nằm / VIP', hotline: '0234 3812 111', description: 'Xe khách từ Huế đi các tỉnh miền Bắc và miền Trung' },
  { code: 'PT-032', name: 'Trường Tiến', region: 'Đà Nẵng - Kon Tum / Gia Lai', type: 'Ghế ngồi / Limousine', hotline: '0260 3812 234', description: 'Nhà xe kết nối Đà Nẵng với Tây Nguyên' },
  { code: 'PT-033', name: 'Phúc Lộc', region: 'HCM - Đà Nẵng - Huế', type: 'Giường nằm', hotline: '028 3612 7890', description: 'Xe giường nằm chất lượng cao tuyến HCM - miền Trung' },

  // === MIỀN BẮC ===
  { code: 'PT-034', name: 'Hùng Cường', region: 'Hà Nội - Lạng Sơn / Cao Bằng', type: 'Ghế ngồi / Limousine', hotline: '024 3833 2345', description: 'Nhà xe uy tín tuyến Hà Nội - các tỉnh đông bắc' },
  { code: 'PT-035', name: 'Việt Thanh', region: 'Hà Nội - Thái Nguyên / Bắc Kạn', type: 'Ghế ngồi', hotline: '024 3912 5678', description: 'Xe khách tuyến Hà Nội - miền núi phía Bắc' },
  { code: 'PT-036', name: 'Đức Dương', region: 'Hà Nội - Nam Định / Thái Bình', type: 'Ghế ngồi / Limousine', hotline: '0228 3812 456', description: 'Nhà xe tuyến Hà Nội - Nam Định, Thái Bình' },
  { code: 'PT-037', name: 'Tân Hải Long', region: 'Hà Nội - Hải Dương / Hưng Yên', type: 'Ghế ngồi', hotline: '0220 3812 789', description: 'Xe khách kết nối Hà Nội với các tỉnh đồng bằng Bắc Bộ' },
  { code: 'PT-038', name: 'Minh Hiếu', region: 'Hà Nội - Thanh Hóa / Nghệ An', type: 'Giường nằm / Ghế ngồi', hotline: '024 3833 6789', description: 'Nhà xe tuyến Hà Nội - miền Trung Bắc, đi Thanh Hóa, Nghệ An' },
  { code: 'PT-039', name: 'Trung Trang', region: 'Hà Nội - Hải Phòng / Cát Bà', type: 'Limousine / VIP', hotline: '0225 3812 999', description: 'Xe limousine cao cấp tuyến Hà Nội - Hải Phòng - Cát Bà' },
  
  { code: 'PT-040', name: 'Như Vinh', region: 'Lâm Đồng - các tỉnh phía Nam', type: 'Ghế ngồi / Giường nằm', hotline: '0225 3911 234', description: 'Nhà xe lớn khu vực Hải Phòng, nhiều tuyến nội vùng' },
  { code: 'PT-041', name: 'Anh Tuyên', region: 'Hải Phòng - các tỉnh phía Bắc', type: 'Ghế ngồi / Giường nằm', hotline: '0225 3911 534', description: 'Nhà xe lớn khu vực Hải Phòng, nhiều tuyến nội vùng' },
  { code: 'PT-042', name: 'Vũ Linh', region: 'Hà Nội - Hải Dương / Hưng Yên', type: 'Ghế ngồi', hotline: '0220 3812 489', description: 'Xe khách kết nối Hà Nội với các tỉnh đồng bằng Bắc Bộ' },
  { code: 'PT-043', name: 'Thiện Trí', region: 'Hà Nội - Thanh Hóa / Nghệ An', type: 'Giường nằm / Ghế ngồi', hotline: '044 3833 6789', description: 'Nhà xe tuyến Hà Nội - miền Trung Bắc, đi Thanh Hóa, Nghệ An' },
  { code: 'PT-044', name: 'Trọng Minh', region: 'Hà Nội - Hải Phòng / Cát Bà', type: 'Limousine / VIP', hotline: '0125 3812 999', description: 'Xe limousine cao cấp tuyến Hà Nội - Hải Phòng - Cát Bà' },
  { code: 'PT-045', name: 'Toàn Thắng', region: 'Lâm Đồng - các tỉnh phía Nam', type: 'Ghế ngồi / Giường nằm', hotline: '02255 391 234', description: 'Nhà xe lớn khu vực Hải Phòng, nhiều tuyến nội vùng' },
  { code: 'PT-046', name: 'Dũng Lệ', region: 'Hải Phòng - các tỉnh phía Bắc', type: 'Ghế ngồi / Giường nằm', hotline: '0245 3911 234', description: 'Nhà xe lớn khu vực Hải Phòng, nhiều tuyến nội vùng' },
  
  { code: 'PT-047', name: 'Minh Nghĩa', region: 'Hà Nội - Thanh Hóa / Nghệ An', type: 'Giường nằm / Ghế ngồi', hotline: '0913854573', description: 'Nhà xe tuyến Hà Nội - miền Trung Bắc, đi Thanh Hóa, Nghệ An' },
  { code: 'PT-048', name: 'Tiến Oanh', region: 'Hà Nội - Hải Phòng / Cát Bà', type: 'Limousine / VIP', hotline: '1900996618', description: 'Xe limousine cao cấp tuyến Hà Nội - Hải Phòng - Cát Bà' },
  { code: 'PT-049', name: 'Võ Cúc Phương ', region: 'Lâm Đồng - các tỉnh phía Nam', type: 'Ghế ngồi / Giường nằm', hotline: '02519999975', description: 'Nhà xe lớn khu vực Hải Phòng, nhiều tuyến nội vùng' },
  { code: 'PT-050', name: 'Hoà Liêm', region: 'Hải Phòng - các tỉnh phía Bắc', type: 'Ghế ngồi / Giường nằm', hotline: '0919832222', description: 'Nhà xe lớn khu vực Hải Phòng, nhiều tuyến nội vùng' },
  { code: 'PT-051', name: 'Đức Minh', region: 'Hà Nội - Thanh Hóa / Nghệ An', type: 'Giường nằm / Ghế ngồi', hotline: '1900996609', description: 'Nhà xe tuyến Hà Nội - miền Trung Bắc, đi Thanh Hóa, Nghệ An' },
   // === KHÁCH SẠN ===
  { code: 'KS-001', name: 'Mường Thanh Luxury Đà Nẵng', region: 'Đà Nẵng', type: 'Khách sạn 5 sao', hotline: '1900 1833', website: 'muongthanh.com', description: 'Khách sạn cao cấp tại Đà Nẵng, phù hợp nghỉ dưỡng, công tác và du lịch gia đình.' },
  { code: 'KS-002', name: 'Vinpearl Resort Nha Trang', region: 'Nha Trang', type: 'Resort / Khách sạn nghỉ dưỡng', hotline: '1900 6677', website: 'vinpearl.com', description: 'Khu nghỉ dưỡng cao cấp tại Nha Trang với nhiều tiện ích, phù hợp gia đình và khách du lịch.' },
  { code: 'KS-003', name: 'FLC Grand Hotel Hạ Long', region: 'Hạ Long', type: 'Khách sạn nghỉ dưỡng', hotline: '1900 5454', website: 'flchotelsresorts.com', description: 'Khách sạn nghỉ dưỡng view biển, phù hợp hội nghị, du lịch gia đình và nghỉ dưỡng cuối tuần.' },
  { code: 'KS-004', name: 'InterContinental Hanoi Westlake', region: 'Hà Nội', type: 'Khách sạn 5 sao', hotline: '024 6270 8888', website: 'ihg.com', description: 'Khách sạn cao cấp tại khu vực Hồ Tây, nổi bật với không gian sang trọng và dịch vụ chuyên nghiệp.' },
  { code: 'KS-005', name: 'Hotel Nikko Saigon', region: 'TP. Hồ Chí Minh', type: 'Khách sạn 5 sao', hotline: '028 3925 7777', website: 'hotelnikkosaigon.com.vn', description: 'Khách sạn trung tâm TP. Hồ Chí Minh, phù hợp công tác, du lịch và hội nghị.' },
  { code: 'KS-006', name: 'Saigon Morin Hotel Huế', region: 'Huế', type: 'Khách sạn di sản', hotline: '0234 3823 526', website: 'morinhotel.com.vn', description: 'Khách sạn lâu đời tại Huế, nổi bật với kiến trúc cổ điển và vị trí thuận tiện.' },
  { code: 'KS-007', name: 'Pullman Danang Beach Resort', region: 'Đà Nẵng', type: 'Resort biển', hotline: '0236 395 8888', website: 'pullman-danang.com', description: 'Resort biển cao cấp, phù hợp nghỉ dưỡng gia đình, cặp đôi và khách quốc tế.' },
  { code: 'KS-008', name: 'Lotte Hotel Saigon', region: 'TP. Hồ Chí Minh', type: 'Khách sạn 5 sao', hotline: '028 3823 3333', website: 'lottehotel.com', description: 'Khách sạn trung tâm thành phố, nổi bật với dịch vụ chuyên nghiệp và vị trí thuận tiện.' },
  { code: 'KS-009', name: 'Sapa Jade Hill Resort', region: 'Sa Pa', type: 'Resort nghỉ dưỡng', hotline: '0214 3888 888', website: 'sapajadehill.com', description: 'Khu nghỉ dưỡng tại Sa Pa, phù hợp du lịch thiên nhiên, nghỉ dưỡng và trải nghiệm văn hóa.' },
  { code: 'KS-010', name: 'Dalat Palace Heritage Hotel', region: 'Đà Lạt', type: 'Khách sạn di sản', hotline: '0263 3825 444', website: 'dalatpalace.vn', description: 'Khách sạn phong cách cổ điển tại Đà Lạt, nổi bật với không gian sang trọng và lịch sử lâu đời.' },
  { code: 'KS-011', name: 'Novotel Phu Quoc Resort', region: 'Phú Quốc', type: 'Resort biển', hotline: '0297 6260 999', website: 'novotelphuquoc.com', description: 'Resort biển tại Phú Quốc, phù hợp nghỉ dưỡng gia đình và du lịch dài ngày.' },
  { code: 'KS-012', name: 'Melia Ba Vi Mountain Retreat', region: 'Ba Vì', type: 'Resort núi', hotline: '024 3200 9999', website: 'melia.com', description: 'Khu nghỉ dưỡng trên núi, phù hợp nghỉ dưỡng cuối tuần, thiên nhiên và trải nghiệm yên tĩnh.' },
  { code: 'KS-013', name: 'Sofitel Legend Metropole Hanoi', region: 'Hà Nội', type: 'Khách sạn 5 sao / Khách sạn di sản', hotline: 'Đang cập nhật', website: 'sofitel-legend-metropole-hanoi.com', description: 'Khách sạn di sản nổi tiếng tại trung tâm Hà Nội, phong cách cổ điển sang trọng, phù hợp khách nghỉ dưỡng cao cấp, công tác và du lịch văn hóa.' },
  { code: 'KS-014', name: 'JW Marriott Hotel Hanoi', region: 'Hà Nội', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'marriott.com', description: 'Khách sạn 5 sao cao cấp tại Hà Nội, nổi bật với không gian hiện đại, dịch vụ chuyên nghiệp, phù hợp hội nghị, công tác và nghỉ dưỡng.' },
  { code: 'KS-015', name: 'Sheraton Saigon Grand Opera Hotel', region: 'TP. Hồ Chí Minh', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'marriott.com', description: 'Khách sạn 5 sao tại trung tâm Quận 1, gần Nhà hát Thành phố, phù hợp khách công tác, du lịch cao cấp và khách quốc tế.' },
  { code: 'KS-016', name: 'InterContinental Danang Sun Peninsula Resort', region: 'Đà Nẵng', type: 'Resort biển 5 sao', hotline: 'Đang cập nhật', website: 'ihg.com', description: 'Resort biển cao cấp tại bán đảo Sơn Trà, nổi bật với kiến trúc độc đáo, không gian nghỉ dưỡng sang trọng và dịch vụ quốc tế.' },
  { code: 'KS-017', name: 'Meliá Hanoi', region: 'Hà Nội', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'melia.com', description: 'Khách sạn 5 sao tại trung tâm Hà Nội, vị trí thuận tiện, phù hợp khách công tác, hội nghị và du lịch thành phố.' },
  { code: 'KS-018', name: 'Caravelle Saigon', region: 'TP. Hồ Chí Minh', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'caravellehotel.com', description: 'Khách sạn lâu đời tại trung tâm Sài Gòn, gần Nhà hát Thành phố, nổi bật với vị trí đẹp, dịch vụ chuyên nghiệp và phong cách sang trọng.' },
  { code: 'KS-019', name: 'New World Saigon Hotel', region: 'TP. Hồ Chí Minh', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'newworldhotels.com', description: 'Khách sạn 5 sao tại trung tâm TP. Hồ Chí Minh, gần chợ Bến Thành và các điểm du lịch, phù hợp công tác, sự kiện và nghỉ dưỡng.' },
  { code: 'KS-020', name: 'Pan Pacific Hanoi', region: 'Hà Nội', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'panpacific.com', description: 'Khách sạn 5 sao gần Hồ Tây và trung tâm Hà Nội, phù hợp khách công tác, nghỉ dưỡng và du lịch cao cấp.' },

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

];

async function seed() {
  console.log(` Bắt đầu seed ${OPERATORS.length} dịch vụ...\n`);
  let inserted = 0;
  let updated = 0;

  for (const op of OPERATORS) {
    const res = await db.query(
      `INSERT INTO public.transport_operators (operator_code, operator_name, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (operator_code) DO UPDATE SET operator_name = EXCLUDED.operator_name, updated_at = now()
       RETURNING xmax`,
      [op.code, op.name]
    );

    const isNew = res.rows[0].xmax === '0';
    if (isNew) {
      console.log(`  ✓ INSERT ${op.code} — ${op.name} [${op.region}]`);
      inserted++;
    } else {
      console.log(`  ↻ UPDATE ${op.code} — ${op.name}`);
      updated++;
    }
  }

  // Xem tổng kết
  const total = await db.query('SELECT COUNT(*) FROM public.transport_operators');
  console.log(`\n Xong: ${inserted} mới, ${updated} cập nhật`);
  console.log(` Tổng dịch vụ trong DB: ${total.rows[0].count}`);
  await db.end();
}

seed().catch(console.error);
