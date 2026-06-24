import { useState } from 'react';
import { formatCurrency, formatNumber } from '../../../shared/lib/format';
import { PRIVILEGE_META, PRIVILEGE_ORDER, DEFAULT_PLAN_PRIVILEGES } from '../../../shared/lib/privileges';
import styles from './PlanEditor.module.css';

const PLAN_EYEBROW = {
  starter: 'Gói cơ bản',
  growth: 'Phổ biến nhất',
  enterprise: 'Doanh nghiệp lớn',
};

export default function PlanEditor({ plan, onSave }) {
  const [draft, setDraft] = useState({
    name: plan.name,
    price: String(plan.price),
    quota: String(plan.quota),
    durationDays: String(plan.durationDays),
    status: plan.status,
    privileges: Array.isArray(plan.privileges) ? plan.privileges : DEFAULT_PLAN_PRIVILEGES[plan.id] ?? [],
  });
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  const update = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  function togglePrivilege(key) {
    setDraft(prev => ({
      ...prev,
      privileges: prev.privileges.includes(key)
        ? prev.privileges.filter(k => k !== key)
        : [...prev.privileges, key],
    }));
  }

  function handleSave() {
    onSave(plan.id, {
      name: draft.name.trim(),
      price: Number(String(draft.price).replace(/[^0-9]/g, '') || 0),
      quota: Number(String(draft.quota).replace(/[^0-9]/g, '') || 0),
      durationDays: Number(String(draft.durationDays).replace(/[^0-9]/g, '') || 0),
      status: draft.status,
      privileges: draft.privileges,
    });
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const isFeatured = plan.featured || plan.id === 'growth';
  const isOut = draft.status !== 'Đang bán';
  const displayPrice = Number(String(draft.price).replace(/[^0-9]/g, '') || 0);
  const displayQuota = Number(String(draft.quota).replace(/[^0-9]/g, '') || 0);

  return (
    <div className={`${styles.card} ${isFeatured ? styles.cardFeatured : ''} ${isOut ? styles.cardOut : ''}`}>
      {/* Out of stock banner */}
      {isOut && (
        <div className={styles.outBanner}>
          {draft.status}
        </div>
      )}

      {/* Top badges */}
      <div className={styles.cardBadgeRow}>
        <span className={`${styles.tierBadge} ${isFeatured ? styles.tierFeatured : styles.tierStandard}`}>
          {PLAN_EYEBROW[plan.id] || 'Gói đối tác'}
        </span>
        {!isOut ? (
          <span className={styles.stockBadge}>
            <span className={styles.stockDot} /> Đang bán
          </span>
        ) : (
          <span className={styles.outBadge}>{draft.status}</span>
        )}
        {saved && <span className={styles.savedBadge}>✓ Đã lưu</span>}
      </div>

      {/* Plan name */}
      <div className={styles.cardName}>{draft.name}</div>

      {/* Tier dots */}
      <div className={styles.tierDots}>
        <span className={`${styles.dot} ${styles.dotGreen}`} title="Starter" />
        <span className={`${styles.dot} ${plan.id !== 'starter' ? styles.dotAmber : styles.dotDim}`} title="Growth" />
        <span className={`${styles.dot} ${plan.id === 'enterprise' ? styles.dotBlue : styles.dotDim}`} title="Enterprise" />
        <span className={styles.tierLabel}>
          {plan.id === 'starter' ? '1/3 gói' : plan.id === 'growth' ? '2/3 gói' : '3/3 gói'}
        </span>
      </div>

      {/* Price */}
      <div className={styles.priceBlock}>
        <div className={styles.priceRow}>
          <span className={styles.priceMain}>{formatCurrency(displayPrice)}</span>
          <span className={styles.priceCycle}>/ {plan.cycle || 'tháng'}</span>
        </div>
        <div className={styles.priceMeta}>
          {formatNumber(displayQuota)} request · {draft.durationDays} ngày
        </div>
      </div>

      {/* Edit toggle */}
      <button
        className={`${styles.editToggle} ${editing ? styles.editToggleOpen : ''}`}
        onClick={() => setEditing(e => !e)}
      >
        {editing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa gói này'}
      </button>

      {/* Edit form */}
      {editing && (
        <div className={styles.editForm}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Tên gói</label>
            <input
              className={styles.fieldInput}
              value={draft.name}
              onChange={e => update('name', e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Giá (VND)</label>
            <input
              className={styles.fieldInput}
              value={draft.price}
              onChange={e => update('price', e.target.value)}
              placeholder="vd: 299000"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Quota (request/tháng)</label>
            <input
              className={styles.fieldInput}
              value={draft.quota}
              onChange={e => update('quota', e.target.value)}
              placeholder="vd: 10000"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Thời hạn (ngày)</label>
            <input
              className={styles.fieldInput}
              value={draft.durationDays}
              onChange={e => update('durationDays', e.target.value)}
              placeholder="vd: 30"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Trạng thái</label>
            <select
              className={styles.fieldSelect}
              value={draft.status}
              onChange={e => update('status', e.target.value)}
            >
              <option value="Đang bán">Đang bán</option>
              <option value="Liên hệ">Liên hệ</option>
              <option value="Tạm ẩn">Tạm ẩn</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Tính năng gói (Privileges)</label>
            <div className={styles.privilegeList}>
              {PRIVILEGE_ORDER.map(key => {
                const meta = PRIVILEGE_META[key];
                const checked = draft.privileges.includes(key);
                return (
                  <label key={key} className={`${styles.privilegeItem} ${checked ? styles.privilegeChecked : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePrivilege(key)}
                      className={styles.privilegeCheckbox}
                    />
                    <span className={styles.privilegeIcon}>{meta.icon}</span>
                    <span className={styles.privilegeLabel}>{meta.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <button className={styles.btnSave} onClick={handleSave}>
              Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
}
