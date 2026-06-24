import Card from '../../../shared/ui/Card/Card';
import Badge from '../../../shared/ui/Badge/Badge';
import ProgressBar from '../../../shared/ui/ProgressBar/ProgressBar';
import { daysLeft, formatNumber, quotaPercent } from '../../../shared/lib/format';

export default function QuotaCard({ user, title = 'Gói hiện tại' }) {
  const total = user?.quotaTotal || 0;
  const used = user?.quotaUsed || 0;
  const percent = quotaPercent(used, total);
  const days = user?.planExpiresAt ? daysLeft(user.planExpiresAt) : 0;

  return (
    <Card title={title} headerRight={<Badge tone={days <= 7 ? 'warning' : 'success'}>Còn {days} ngày</Badge>}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span className="muted">Quota tổng</span>
            <strong>{formatNumber(total)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span className="muted">Đã dùng</span>
            <strong>{formatNumber(used)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span className="muted">Còn lại</span>
            <strong>{formatNumber(Math.max(total - used, 0))}</strong>
          </div>
        </div>
        <ProgressBar value={percent} />
        <div style={{ color: 'var(--text-soft)' }}>Mức sử dụng: <strong style={{ color: 'var(--text-strong)' }}>{percent}%</strong></div>
      </div>
    </Card>
  );
}
