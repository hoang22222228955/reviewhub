import { useEffect, useMemo, useState } from 'react';
import QuotaCard from '../../components/QuotaCard/QuotaCard';
import { useAuth } from '../../../auth/context/AuthContext';
import { fetchUsageLogs } from '../../../services/partnerService';
import { fetchReviews } from '../../../services/reviewService';
import { fetchOperators } from '../../../services/operatorService';
import styles from './PartnerDashboardPage.module.css';

function formatPercent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getStatusTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('success') || normalized.includes('ok') || normalized.includes('200')) return styles.success;
  if (normalized.includes('fail') || normalized.includes('error') || normalized.includes('500')) return styles.danger;
  return styles.neutral;
}

export default function PartnerDashboardPage() {
  const { currentUser, refreshUser } = useAuth();
  const [logs, setLogs] = useState([]);

  useEffect(() => { refreshUser(); }, []);

  useEffect(() => {
    if (!currentUser?.apiKey) return;
    fetchUsageLogs(currentUser.apiKey, 20).then(setLogs);
  }, [currentUser?.apiKey]);

  const [reviewStats, setReviewStats] = useState({
    total: 0,
    avg: 0,
    good: 0,
    bad: 0,
  });

  const [operatorName, setOperatorName] = useState(null);

  useEffect(() => {
    if (!currentUser?.assignedOperatorCode) return;

    fetchOperators()
      .then((ops) => {
        const op = ops.find(
          (o) => o.operatorCode === currentUser.assignedOperatorCode
        );

        if (op) setOperatorName(op.operatorName);
      })
      .catch(() => {});

    fetchReviews({
      size: 1000,
      assignedOperatorCode: currentUser.assignedOperatorCode,
    })
      .then((data) => {
        const items = data.content || [];

        const total = items.length;
        const avg = total
          ? items.reduce((s, r) => s + Number(r.rating || 0), 0) / total
          : 0;

        const good = items.filter((r) => Number(r.rating) >= 4).length;
        const bad = items.filter((r) => Number(r.rating) <= 2).length;

        setReviewStats({
          total,
          avg: avg.toFixed(1),
          good,
          bad,
        });
      })
      .catch(() => {
        setReviewStats({
          total: 0,
          avg: 0,
          good: 0,
          bad: 0,
        });
      });
  }, [currentUser]);

  const qualityPercent = useMemo(
    () => formatPercent(reviewStats.good, reviewStats.total),
    [reviewStats.good, reviewStats.total]
  );

  const riskPercent = useMemo(
    () => formatPercent(reviewStats.bad, reviewStats.total),
    [reviewStats.bad, reviewStats.total]
  );

  const kpis = [
    {
      title: 'Nhà xe được gán',
      desc: currentUser?.assignedOperatorCode
        ? `Mã đối tác: ${currentUser.assignedOperatorCode}`
        : 'Chưa có nhà xe phụ trách',
      value: currentUser?.assignedOperatorCode
        ? operatorName || currentUser.assignedOperatorCode
        : 'Chưa gán',
      icon: '◆',
      tone: currentUser?.assignedOperatorCode ? styles.violet : styles.orange,
      compact: true,
    },
    {
      title: 'Tổng review',
      desc: 'Dữ liệu từ nhà xe được phân công',
      value: reviewStats.total,
      icon: '◇',
      tone: styles.blue,
    },
    {
      title: 'Điểm trung bình',
      desc: `/ 5 sao trên ${reviewStats.total} review`,
      value: reviewStats.avg,
      icon: '★',
      tone: styles.green,
    },
    {
      title: 'Tốt / xấu',
      desc: '4-5 sao / 1-2 sao',
      value: `${reviewStats.good} / ${reviewStats.bad}`,
      icon: '◎',
      tone: styles.rose,
    },
  ];

  return (
    <main className={styles.pageShell}>
      <section className={styles.dashboardPanel}>
        <header className={styles.heroHeader}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>Partner workspace</span>
            <h1>Partner Dashboard</h1>
            <p>
              Theo dõi quota, chất lượng review và lịch sử gọi API trong một giao diện tinh gọn, chuyên nghiệp.
            </p>
            <div className={styles.heroMeta}>
              <span>Dashboard</span>
              <i />
              <span>Partner</span>
              <i />
              <span>{currentUser?.assignedOperatorCode || 'Chưa gán nhà xe'}</span>
            </div>
          </div>

          <div className={styles.heroBadge}>
            <small>Điểm chất lượng</small>
            <strong>{qualityPercent}%</strong>
            <span>review tốt</span>
          </div>
        </header>

        <div className={styles.kpiGrid}>
          {kpis.map((item, index) => (
            <article
              key={item.title}
              className={`${styles.kpiCard} ${item.tone}`}
              style={{ animationDelay: `${index * 65}ms` }}
            >
              <div className={styles.kpiText}>
                <span>{item.title}</span>
                <small>{item.desc}</small>
                <strong className={item.compact ? styles.compactValue : undefined}>{item.value}</strong>
              </div>
              <div className={styles.kpiIcon}>{item.icon}</div>
            </article>
          ))}
        </div>

        <div className={styles.insightGrid}>
          <article className={styles.scoreCard}>
            <div className={styles.cardHeading}>
              <div>
                <span className={styles.eyebrow}>Review insight</span>
                <h2>Chất lượng đánh giá</h2>
              </div>
              <strong>{reviewStats.avg}/5</strong>
            </div>

            <div className={styles.progressGroup}>
              <div className={styles.progressRow}>
                <div>
                  <span>Đánh giá tốt</span>
                  <small>{reviewStats.good} review</small>
                </div>
                <b>{qualityPercent}%</b>
              </div>
              <div className={styles.progressTrack}>
                <span style={{ width: `${qualityPercent}%` }} />
              </div>
            </div>

            <div className={styles.progressGroup}>
              <div className={styles.progressRow}>
                <div>
                  <span>Cần chú ý</span>
                  <small>{reviewStats.bad} review thấp</small>
                </div>
                <b>{riskPercent}%</b>
              </div>
              <div className={`${styles.progressTrack} ${styles.riskTrack}`}>
                <span style={{ width: `${riskPercent}%` }} />
              </div>
            </div>
          </article>

          <div className={styles.quotaShell}>
            <QuotaCard user={currentUser} />
          </div>
        </div>

        <article className={styles.tableCard}>
          <div className={styles.cardHeading}>
            <div>
              <span className={styles.eyebrow}>API activity</span>
              <h2>Lịch sử gọi API gần đây</h2>
            </div>
            <span className={styles.tableCount}>{logs.length} bản ghi</span>
          </div>

          <div className={styles.tableShell}>
            <table className={styles.tableBase}>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Endpoint</th>
                  <th>Trạng thái</th>
                  <th>Số bản ghi</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-soft)', padding: '20px' }}>Chưa có lịch sử gọi API</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.calledAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })}</td>
                    <td><code>{log.endpoint}</code></td>
                    <td>
                      <span className={`${styles.statusPill} ${getStatusTone(String(log.status))}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>{log.resultCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
