export const DEFAULT_PLANS = [
  {
    id: 'starter',
    name: 'Khởi đầu',
    price: 400000,
    cycle: 'tháng',
    quota: 5000,
    durationDays: 30,
    status: 'Đang bán',
    features: [
      '1 khóa sandbox + 1 khóa live',
      'Đọc dữ liệu public',
      'Giới hạn 5.000 request/tháng',
      'Bộ lọc cơ bản theo danh mục',
    ],
    privileges: ['READ_PUBLIC'],
  },
  {
    id: 'growth',
    name: 'Tăng trưởng',
    price: 2490000,
    cycle: 'tháng',
    quota: 50000,
    durationDays: 30,
    status: 'Đang bán',
    featured: true,
    features: [
      'Đọc dữ liệu public + private của chính đối tác',
      'Gửi review mới về hub',
      'AI moderation văn bản',
      'Báo cáo chất lượng dữ liệu',
    ],
    privileges: ['READ_PUBLIC', 'READ_PRIVATE', 'WRITE_REVIEW', 'AI_MODERATION'],
  },
  {
    id: 'enterprise',
    name: 'Doanh nghiệp',
    price: 9990000,
    cycle: 'tháng',
    quota: 300000,
    durationDays: 30,
    status: 'Đang bán',
    features: [
      'Quota lớn + ưu tiên tốc độ',
      'Theo dõi SLA',
      'Mở rộng domain',
      'Hỗ trợ kỹ thuật riêng',
    ],
    privileges: ['READ_PUBLIC', 'READ_PRIVATE', 'WRITE_REVIEW', 'AI_MODERATION', 'SUPPORT_PRIVATE', 'SLA', 'DOMAIN_EXPAND'],
  },
]

export const DEFAULT_REVIEWS = [
  {
    id: 'RV-2026-001',
    category: 'Nhà xe',
    targetCode: 'BUS-FUTA-001',
    targetName: 'FUTA Limousine Premium',
    reviewerName: 'Nguyễn Văn A',
    rating: 5,
    comment: 'Xe sạch sẽ, tài xế lịch sự, khởi hành đúng giờ.',
    visibility: 'public',
    sourceSystem: 'partner-web',
    moderationStatus: 'approved',
    createdAt: '2026-04-13T08:15:00.000Z',
    partnerName: 'VeXeNhanh',
  },
  {
    id: 'RV-2026-002',
    category: 'Khách sạn',
    targetCode: 'HOTEL-DALAT-009',
    targetName: 'SkyStay Đà Lạt Center',
    reviewerName: 'Lê Thu B',
    rating: 4,
    comment: 'Phòng đẹp, nhân viên thân thiện, nhưng check-in hơi lâu.',
    visibility: 'private',
    sourceSystem: 'partner-app',
    moderationStatus: 'approved',
    createdAt: '2026-04-13T10:30:00.000Z',
    partnerName: 'SkyStay',
  },
  {
    id: 'RV-2026-003',
    category: 'Tour',
    targetCode: 'TOUR-DL-2N1D',
    targetName: 'GoTour Đà Lạt 2N1Đ',
    reviewerName: 'Trần Minh C',
    rating: 3,
    comment: 'Lịch trình ổn nhưng phần ăn trưa chưa tốt.',
    visibility: 'public',
    sourceSystem: 'partner-web',
    moderationStatus: 'flagged',
    createdAt: '2026-04-14T01:45:00.000Z',
    partnerName: 'GoTour',
  },
]

export const TRUSTED_NAMES = ['VeXeNhanh', 'SkyStay', 'GoTour', 'HotelPro', 'TripFlow', 'BlueBus']

/**
 * ẢNH MINH HỌA:
 * - Dùng link ảnh Internet (Pexels) để bạn chạy demo nhanh.
 * - Khuyến nghị: tải về và bỏ vào /public/assets/categories để demo offline ổn định hơn.
 */
export const CATEGORIES = [
  {
    image: 'https://images.pexels.com/photos/5790052/pexels-photo-5790052.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: 'Nhà xe',
    description: 'Review tuyến chạy, loại ghế, chất lượng phục vụ và mức độ đúng giờ của nhà xe.',
  },
  {
    image: 'https://images.pexels.com/photos/7746950/pexels-photo-7746950.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: 'Khách sạn',
    description: 'Review phòng, vị trí, vệ sinh, tiện ích và trải nghiệm lưu trú theo từng cơ sở.',
  },
  {
    image: 'https://images.pexels.com/photos/15194497/pexels-photo-15194497.png?auto=compress&cs=tinysrgb&w=1200',
    title: 'Máy bay',
    description: 'Review hãng bay, giờ bay, check-in, tiếp viên và trải nghiệm chuyến bay.',
  },
  {
    image: 'https://images.pexels.com/photos/9999667/pexels-photo-9999667.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: 'Tàu hỏa',
    description: 'Review toa tàu, chỗ ngồi, hành trình, độ sạch sẽ và chất lượng dịch vụ trên tàu.',
  },
  {
    image: 'https://images.pexels.com/photos/1194233/pexels-photo-1194233.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: 'Tour',
    description: 'Review lịch trình, hướng dẫn viên, ăn ở và trải nghiệm tổng thể của tour.',
  },
  {
    image: 'https://images.pexels.com/photos/7709189/pexels-photo-7709189.jpeg?auto=compress&cs=tinysrgb&w=1200',
    title: 'Dịch vụ khác',
    description: 'Mở rộng cho OTA, booking engine và các hệ thống dịch vụ cần tích hợp review qua API.',
  },
]

export const TESTIMONIALS = [
  {
    name: 'Nguyễn Minh Quân',
    role: 'Quản lý tích hợp · VeXeNhanh',
    quote:
      'Chỉ cần đúng API key và đúng gói dịch vụ, bên mình lấy được review theo từng domain, không phải tự dựng kho dữ liệu từ con số 0.',
  },
  {
    name: 'Lê Thùy Dương',
    role: 'Điều phối đối tác · SkyStay',
    quote:
      'Public/private tách rõ giúp vận hành đúng quyền: dữ liệu riêng không lộ, dữ liệu chung vẫn dùng được khi đủ điều kiện.',
  },
  {
    name: 'Phạm Anh Tú',
    role: 'Technical Lead · GoTour',
    quote:
      'Điểm mạnh là API thống nhất + quota rõ + moderation có kiểm soát. Nhìn trang chủ là hiểu đúng nghiệp vụ hệ thống.',
  },
]
