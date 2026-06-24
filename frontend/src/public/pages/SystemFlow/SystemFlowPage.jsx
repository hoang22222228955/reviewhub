import Card from '../../../shared/ui/Card/Card';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from './SystemFlowPage.module.css';

const flows = [
  {
    tag: 'DATA HUB',
    title: 'Admin nhập dữ liệu review ban đầu',
    desc: 'Import file CSV, Excel hoặc crawl dữ liệu mẫu để tạo kho review sẵn cho từng đối tượng.',
  },
  {
    tag: 'PARTNER',
    title: 'Partner đăng ký và được cấp API key',
    desc: 'Admin phê duyệt partner, gán gói dịch vụ, quota request và cấp API key để tích hợp.',
  },
  {
    tag: 'READ API',
    title: 'Partner lấy review từ Hub',
    desc: 'Hệ thống trả review theo đúng loại dịch vụ, đúng đối tượng và đúng phạm vi quyền đọc.',
  },
  {
    tag: 'WRITE API',
    title: 'Partner gửi review mới về Hub',
    desc: 'Review gồm điểm số, bình luận, hình ảnh, nguồn gửi và trạng thái public hoặc private.',
  },
  {
    tag: 'AI CHECK',
    title: 'AI moderation kiểm duyệt nội dung',
    desc: 'AI hỗ trợ phát hiện spam, nội dung không phù hợp hoặc review bất thường trước khi công bố.',
  },
  {
    tag: 'ADMIN',
    title: 'Admin theo dõi toàn hệ thống',
    desc: 'Theo dõi partner, gói dịch vụ, lịch sử gọi API, quota và dữ liệu public/private.',
  },
];

const highlights = [
  {
    value: 'Public',
    label: 'Review có thể chia sẻ cho partner khác theo quyền.',
  },
  {
    value: 'Private',
    label: 'Review chỉ thuộc về partner sở hữu dữ liệu.',
  },
  {
    value: 'API',
    label: 'Đối tác đọc và ghi review thông qua API key.',
  },
];

export default function SystemFlowPage() {
  return (
    <div className={styles.page}>
      <div className={styles.bgGlowOne}></div>
      <div className={styles.bgGlowTwo}></div>

      <div className={`pageContainer ${styles.inner}`}>
        <SectionTitle
          eyebrow="Luồng hệ thống"
          title="ReviewHub vận hành như một nền tảng dữ liệu review qua API"
          description="Hệ thống tập trung vào việc quản lý review, phân quyền public/private, cấp API key và kiểm duyệt nội dung bằng AI."
        />

        <div className={styles.pipeline}>
          <div className={styles.pipelineItem}>Partner</div>
          <span></span>
          <div className={styles.pipelineItem}>API Gateway</div>
          <span></span>
          <div className={styles.pipelineItem}>AI Moderation</div>
          <span></span>
          <div className={styles.pipelineItem}>Review Data Hub</div>
        </div>

        <div className={styles.grid}>
          {flows.map((item, index) => (
            <Card key={item.title} className={styles.step}>
              <div className={styles.stepTop}>
                <div className={styles.stepNum}>Bước {index + 1}</div>
                <div className={styles.stepTag}>{item.tag}</div>
              </div>

              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </Card>
          ))}
        </div>

        <div className={styles.highlightBox}>
          <div className={styles.highlightContent}>
            <span>Data Access Control</span>

            <h3>
              Phân biệt rõ dữ liệu public và private
            </h3>

            <p>
              ReviewHub không phải website bán vé, khách sạn hay tour.
              Hệ thống là kho dữ liệu review trung tâm, cho phép partner
              mua API để lấy dữ liệu, gửi review mới và kiểm soát
              phạm vi chia sẻ.
            </p>
          </div>

          <div className={styles.highlightGrid}>
            {highlights.map((item) => (
              <div
                className={styles.highlightCard}
                key={item.value}
              >
                <strong>{item.value}</strong>
                <p>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}