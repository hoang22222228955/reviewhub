import Card from '../../../shared/ui/Card/Card';
import Badge from '../../../shared/ui/Badge/Badge';
import { useAuth } from '../../../auth/context/AuthContext';
import { getPlanById } from '../../../services/planService';
import { daysLeft } from '../../../shared/lib/format';
import { PRIVILEGE_META } from '../../../shared/lib/privileges';
import styles from './PartnerPrivilegesPage.module.css';

const partnerPrivileges = [
  {
    title: 'Cổng đối tác riêng',
    text: 'Không còn dùng chung với giao diện marketing, thao tác tập trung hơn.',
    icon: 'portal',
  },
  {
    title: 'API sandbox & live',
    text: 'Xem khóa API sandbox và live để tích hợp, kiểm thử và vận hành.',
    icon: 'api',
  },
  {
    title: 'Gửi review nhanh',
    text: 'Gửi review về hub bằng biểu mẫu rõ ràng, dễ thao tác.',
    icon: 'review',
  },
  {
    title: 'Lọc dữ liệu theo quyền',
    text: 'Xem dữ liệu theo bộ lọc và phạm vi quyền của gói hiện tại.',
    icon: 'filter',
  },
  {
    title: 'Theo dõi quota',
    text: 'Theo dõi quota, thời gian còn lại và lịch sử sử dụng.',
    icon: 'quota',
  },
];

const iconMap = {
  portal: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.75 6.75A2 2 0 0 1 6.75 4.75h10.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V6.75Z" />
      <path d="M8.25 9.25h7.5M8.25 12h7.5M8.25 14.75h4.75" />
    </svg>
  ),
  api: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 8.25 5.25 12 9 15.75M15 8.25 18.75 12 15 15.75" />
      <path d="m13.25 6.75-2.5 10.5" />
    </svg>
  ),
  review: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.25 6.75A2.5 2.5 0 0 1 7.75 4.25h8.5a2.5 2.5 0 0 1 2.5 2.5v5.8a2.5 2.5 0 0 1-2.5 2.5h-4.8l-4.2 3.2v-3.2A2.5 2.5 0 0 1 5.25 12.55v-5.8Z" />
      <path d="m8.9 10.6 1.9 1.9 4.3-4.3" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.75 6.25h14.5l-5.55 6.35v4.15l-3.4 1.7V12.6L4.75 6.25Z" />
    </svg>
  ),
  quota: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19.25a7.25 7.25 0 1 0-7.25-7.25" />
      <path d="M12 7.75V12l3 2" />
      <path d="M4.75 19.25h4.5" />
    </svg>
  ),
  plan: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.75 4.75h10.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" />
      <path d="M8.25 9h7.5M8.25 12h7.5M8.25 15h4.2" />
    </svg>
  ),
};

export default function PartnerPrivilegesPage() {
  const { currentUser } = useAuth();
  const plan = getPlanById(currentUser?.currentPlanId);
  const remainingDays = daysLeft(currentUser?.planExpiresAt);
  const isExpiringSoon = remainingDays <= 7;

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        <Card
          className={styles.card}
          title="Đặc quyền tài khoản đối tác"
          description="Các quyền mở rộng dành riêng cho tài khoản partner khi quản lý API, review và dữ liệu."
        >
          <div className={styles.privilegeList}>
            {partnerPrivileges.map((item, index) => (
              <article
                key={item.title}
                className={styles.privilegeItem}
                style={{ '--delay': `${index * 55}ms` }}
              >
                <div className={styles.iconBox}>{iconMap[item.icon]}</div>

                <div className={styles.privilegeText}>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </article>
            ))}
          </div>
        </Card>

        <Card
          className={`${styles.card} ${styles.planCard}`}
          title="Quyền của gói đang dùng"
          headerRight={
            <Badge tone={isExpiringSoon ? 'warning' : 'success'}>
              {isExpiringSoon ? 'Sắp hết hạn' : 'Đang hoạt động'}
            </Badge>
          }
        >
          {plan ? (
            <div className={styles.planContent}>
              <div className={styles.planSummary}>
                <div className={styles.planIcon}>{iconMap.plan}</div>

                <div>
                  <span>Gói hiện tại</span>
                  <strong>{plan.name || 'Partner plan'}</strong>
                </div>
              </div>

              <div className={styles.daysBox}>
                <span>Thời gian còn lại</span>
                <strong>{remainingDays > 0 ? remainingDays : 0}</strong>
                <small>ngày</small>
              </div>

              <div className={styles.planPrivileges}>
                {plan.privileges.map((item, index) => {
                  const meta = PRIVILEGE_META[item];
                  const displayLabel = meta ? meta.label : item;
                  return (
                    <div
                      key={item}
                      className={styles.planPrivilegeItem}
                      style={{ '--delay': `${index * 45}ms` }}
                    >
                      <span className={styles.checkIcon}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m6.75 12.25 3.3 3.3 7.2-7.2" />
                        </svg>
                      </span>
                      <span>{displayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>{iconMap.plan}</div>
              <strong>Bạn chưa kích hoạt gói đối tác.</strong>
              <span>Hãy kích hoạt gói để mở quyền API, quota và quản lý review.</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
