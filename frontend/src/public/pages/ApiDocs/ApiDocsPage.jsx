import Card from '../../../shared/ui/Card/Card';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from './ApiDocsPage.module.css';

const endpoints = [
  {
    method: 'GET',
    title: '/v1/reviews',
    permission: 'READ_PUBLIC',
    text: 'Lấy danh sách review theo danh mục, đối tượng, trạng thái public/private, moderation và điểm số.',
    code: 'GET /v1/reviews?category=bus&targetCode=BUS-FUTA-001&visibility=public',
  },
  {
    method: 'POST',
    title: '/v1/reviews',
    permission: 'WRITE_REVIEW',
    text: 'Gửi review mới từ hệ thống partner về ReviewHub. Review sẽ đi qua AI moderation trước khi công bố.',
    code: `POST /v1/reviews
{
  "category": "bus",
  "targetCode": "BUS-FUTA-001",
  "reviewerName": "Nguyễn Văn A",
  "rating": 5,
  "comment": "Xe sạch, tài xế thân thiện",
  "visibility": "public"
}`,
  },
  {
    method: 'GET',
    title: '/v1/reviews/ranking',
    permission: 'READ_ANALYTICS',
    text: 'Lấy bảng xếp hạng tổng hợp theo loại dịch vụ, đối tượng được review hoặc partner sở hữu dữ liệu.',
    code: 'GET /v1/reviews/ranking?category=hotel&sort=rating_desc',
  },
];

const apiInfo = [
  {
    label: 'Base URL',
    value: 'https://api.reviewhub.vn',
  },
  {
    label: 'Version',
    value: 'v1',
  },
  {
    label: 'Auth',
    value: 'API Key',
  },
  {
    label: 'Format',
    value: 'JSON',
  },
];

const plans = [
  {
    name: 'Basic',
    desc: 'Đọc dữ liệu review public.',
  },
  {
    name: 'Standard',
    desc: 'Đọc public và gửi review mới.',
  },
  {
    name: 'Premium',
    desc: 'Truy cập nâng cao, ranking và AI moderation.',
  },
];

export default function ApiDocsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.bgGlowOne}></div>
      <div className={styles.bgGlowTwo}></div>

      <div className={`pageContainer ${styles.inner}`}>
        <SectionTitle
          eyebrow="Tài liệu API"
          title="Tích hợp ReviewHub API nhanh, rõ quyền và dễ demo"
          description="Partner sử dụng API key để lấy review, gửi review mới, xem ranking và đồng bộ dữ liệu review theo gói dịch vụ."
        />

        <div className={styles.overview}>
          <div className={styles.overviewContent}>
            <span className={styles.badge}>ReviewHub API Platform</span>
            <h2>Một bộ API chung cho mọi hệ thống cần dữ liệu đánh giá</h2>
            <p>
              ReviewHub không bán vé, khách sạn hay tour. Hệ thống cung cấp API
              để partner đọc dữ liệu review có sẵn, gửi review mới về hub và kiểm
              soát dữ liệu theo quyền public/private.
            </p>

            <div className={styles.quickActions}>
              <button>Get API Key</button>
              <button className={styles.secondaryBtn}>Xem endpoint</button>
            </div>
          </div>

          <div className={styles.apiPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <strong>reviewhub.config.json</strong>
            </div>

            <pre>{`{
  "baseUrl": "https://api.reviewhub.vn",
  "version": "v1",
  "auth": "x-api-key",
  "responseFormat": "json",
  "visibility": ["public", "private"],
  "moderation": "ai_enabled"
}`}</pre>
          </div>
        </div>

        <div className={styles.infoGrid}>
          {apiInfo.map((item) => (
            <div className={styles.infoCard} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className={styles.sectionHeader}>
          <span>Core Endpoints</span>
          <h3>Các API chính phục vụ luồng Review Data Hub</h3>
        </div>

        <div className={styles.grid}>
          {endpoints.map((item) => (
            <Card key={item.title} className={styles.endpointCard}>
              <div className={styles.endpointTop}>
                <div className={`${styles.method} ${styles[item.method.toLowerCase()]}`}>
                  {item.method}
                </div>
                <div className={styles.permission}>{item.permission}</div>
              </div>

              <h3>{item.title}</h3>
              <p>{item.text}</p>

              <pre className={styles.code}>{item.code}</pre>
            </Card>
          ))}
        </div>

        <div className={styles.consoleSection}>
          <div className={styles.consoleText}>
            <span>Live Demo Console</span>
            <h3>Mô phỏng response khi partner gọi API lấy review</h3>
            <p>
              Khi partner gọi API, hệ thống kiểm tra API key, gói dịch vụ,
              quota còn lại và phạm vi dữ liệu trước khi trả kết quả.
            </p>
          </div>

          <div className={styles.responseBox}>
            <div className={styles.responseHeader}>
              <strong>Response 200 OK</strong>
              <span>124ms</span>
            </div>

            <pre>{`{
  "success": true,
  "data": [
    {
      "targetCode": "BUS-FUTA-001",
      "category": "bus",
      "rating": 4.8,
      "comment": "Dịch vụ tốt, xe sạch",
      "visibility": "public",
      "moderationStatus": "approved"
    }
  ],
  "quotaRemaining": 842
}`}</pre>
          </div>
        </div>

        <div className={styles.planGrid}>
          {plans.map((item) => (
            <div className={styles.planCard} key={item.name}>
              <strong>{item.name}</strong>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}