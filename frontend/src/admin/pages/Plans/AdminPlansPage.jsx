import { useEffect, useMemo, useState } from 'react';
import PlanEditor from '../../components/PlanEditor/PlanEditor';
import { fetchPlans, savePlan, updatePlan } from '../../../services/planService';
import styles from './AdminPlansPage.module.css';

const PLAN_ORDER = ['starter', 'growth', 'enterprise'];

const PLAN_META = {
  starter: {
    label: 'Khởi đầu',
    eyebrow: 'Gói cơ bản',
    tone: 'green',
    note: 'Phù hợp partner mới bắt đầu triển khai',
    accent: 'Starter',
  },
  growth: {
    label: 'Tăng trưởng',
    eyebrow: 'Phổ biến',
    tone: 'amber',
    note: 'Gói cân bằng giữa quota và chi phí',
    accent: 'Growth',
  },
  enterprise: {
    label: 'Doanh nghiệp',
    eyebrow: 'Nâng cao',
    tone: 'blue',
    note: 'Dành cho hệ thống vận hành quy mô lớn',
    accent: 'Enterprise',
  },
};

function formatNumber(value) {
  const number = Number(value || 0);
  return number.toLocaleString('vi-VN');
}

function formatMoney(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString('vi-VN')} đ`;
}

function getPlanMeta(plan) {
  return PLAN_META[plan?.id] || {
    label: plan?.name || plan?.id || 'Gói tùy chỉnh',
    eyebrow: 'Tùy chỉnh',
    tone: 'purple',
    note: 'Gói dịch vụ được cấu hình riêng',
    accent: 'Custom',
  };
}

function getPlanTitle(plan) {
  return plan?.name || plan?.title || plan?.id || 'Gói dịch vụ';
}

function getActiveState(plan) {
  const status = String(plan?.status || '').trim().toLowerCase();
  const inactive = plan?.isActive === false || status === 'inactive' || status === 'ngừng bán' || status === 'tạm ngưng';

  return {
    active: !inactive,
    label: inactive ? 'Đang tắt' : 'Đang bật',
  };
}

function getPrivileges(plan) {
  if (Array.isArray(plan?.privileges)) return plan.privileges;
  if (Array.isArray(plan?.features)) return plan.features;
  if (Array.isArray(plan?.benefits)) return plan.benefits;
  return [];
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activePlanId, setActivePlanId] = useState(null);

  useEffect(() => {
    fetchPlans()
      .then(data => setPlans(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activePlanId) return undefined;

    document.body.classList.add(styles.modalOpenBody);

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setActivePlanId(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove(styles.modalOpenBody);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePlanId]);

  async function handleSave(planId, payload) {
    setSavingId(planId);
    try {
      await savePlan(planId, payload);
      const next = updatePlan(planId, payload);
      setPlans(next);
    } catch {
      setPlans(prev => prev.map(p => (p.id === planId ? { ...p, ...payload } : p)));
    } finally {
      setSavingId(null);
    }
  }

  function closeEditor() {
    if (savingId === activePlanId) return;
    setActivePlanId(null);
  }

  const orderedPlans = useMemo(() => {
    const ordered = PLAN_ORDER.map(id => plans.find(p => p.id === id)).filter(Boolean);
    const rest = plans.filter(p => !PLAN_ORDER.includes(p.id));
    return [...ordered, ...rest];
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return orderedPlans.filter(plan => {
      const { active } = getActiveState(plan);
      const activeText = active ? 'active' : 'inactive';
      const meta = getPlanMeta(plan);

      const matchKeyword = !q || [
        plan.id,
        plan.name,
        plan.title,
        plan.description,
        meta.label,
        meta.eyebrow,
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || activeText === statusFilter;

      return matchKeyword && matchStatus;
    });
  }, [orderedPlans, keyword, statusFilter]);

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter(p => getActiveState(p).active).length;
    const totalQuota = plans.reduce((sum, p) => sum + Number(p.quota || p.quotaTotal || 0), 0);
    const highestPrice = plans.reduce((max, p) => Math.max(max, Number(p.price || p.amount || 0)), 0);

    return { total, active, totalQuota, highestPrice };
  }, [plans]);

  const activePlan = useMemo(
    () => plans.find(plan => plan.id === activePlanId),
    [plans, activePlanId]
  );

  const activePlanMeta = activePlan ? getPlanMeta(activePlan) : null;
  const activePlanState = activePlan ? getActiveState(activePlan) : null;

  if (loading) {
    return (
      <div className={styles.page}>
        <section className={styles.heroSkeleton} />
        <div className={styles.skeletonGrid}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroPanel}>
        <div className={styles.heroContent}>
          <span className={styles.consoleBadge}>ADMIN PACKAGE CENTER</span>
          <h1>Quản lý gói dịch vụ</h1>
          <p>
             Thiết lập và quản lý các gói dịch vụ của ReviewHub, bao gồm giá bán, quota,
             thời hạn sử dụng, trạng thái hoạt động và quyền lợi hiển thị cho đối tác.
         </p>
        </div>

        <div className={styles.heroActions}>
          <button className={styles.secondaryButton} type="button">
            {filteredPlans.length} gói hiển thị
          </button>
          <button className={styles.primaryButton} type="button" onClick={() => setKeyword('')}>
            Làm mới bộ lọc
          </button>
        </div>
      </section>

      <section className={styles.metricGrid} aria-label="Tổng quan gói dịch vụ">
        <article className={`${styles.metricCard} ${styles.metricBlue}`}>
          <span>Tổng số gói</span>
          <strong>{stats.total}</strong>
          <small>Đang cấu hình trên hệ thống</small>
        </article>
        <article className={`${styles.metricCard} ${styles.metricGreen}`}>
          <span>Gói đang bật</span>
          <strong>{stats.active}</strong>
          <small>Sẵn sàng hiển thị cho partner</small>
        </article>
        <article className={`${styles.metricCard} ${styles.metricViolet}`}>
          <span>Tổng quota</span>
          <strong>{formatNumber(stats.totalQuota)}</strong>
          <small>Cộng dồn toàn bộ gói</small>
        </article>
        <article className={`${styles.metricCard} ${styles.metricAmber}`}>
          <span>Giá cao nhất</span>
          <strong>{formatMoney(stats.highestPrice)}</strong>
          <small>Gói cao cấp nhất hiện tại</small>
        </article>
      </section>

      <section className={styles.controlPanel}>
        <div>
          <span className={styles.panelBadge}>PLAN CONFIGURATION</span>
          <h2>Danh sách gói</h2>
          <p>Chọn một gói để mở khung chỉnh sửa. Nút X trong khung chỉnh sửa chỉ đóng, không tự lưu thay đổi.</p>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <span aria-hidden="true">⌕</span>
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tìm gói, mô tả, mã gói..."
            />
          </label>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang bật</option>
            <option value="inactive">Đang tắt</option>
          </select>
        </div>
      </section>

      <div className={styles.cardsRow}>
        {filteredPlans.length === 0 && (
          <div className={styles.emptyState}>
            <strong>Không tìm thấy gói phù hợp</strong>
            <span>Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</span>
          </div>
        )}

        {filteredPlans.map(plan => {
          const meta = getPlanMeta(plan);
          const state = getActiveState(plan);
          const price = Number(plan.price || plan.amount || 0);
          const quota = Number(plan.quota || plan.quotaTotal || 0);
          const privileges = getPrivileges(plan).slice(0, 3);

          return (
            <article
              key={plan.id}
              className={`${styles.planCard} ${styles[`tone_${meta.tone}`] || styles.tone_green}`}
            >
              <div className={styles.planAccent}>{meta.accent}</div>

              <div className={styles.cardBadgeRow}>
                <span className={styles.tierBadge}>{meta.eyebrow}</span>
                <span className={`${styles.stockBadge} ${state.active ? styles.statusOn : styles.statusOff}`}>
                  {state.label}
                </span>
              </div>

              <div className={styles.planMain}>
                <h3>{getPlanTitle(plan)}</h3>
                <p>{plan.description || meta.note}</p>
              </div>

              <div className={styles.priceBlock}>
                <span className={styles.priceMain}>{formatMoney(price)}</span>
                <span className={styles.priceSub}>/{plan.cycle || 'tháng'} · {formatNumber(quota)} quota</span>
              </div>

              <div className={styles.planInfoGrid}>
                <span>
                  <small>Mã gói</small>
                  <strong>{plan.id}</strong>
                </span>
                <span>
                  <small>Thời hạn</small>
                  <strong>{Number(plan.durationDays || 30)} ngày</strong>
                </span>
              </div>

              <div className={styles.scopeBox}>
                <strong>Điểm cấu hình</strong>
                {privileges.length > 0 ? (
                  privileges.map((item, index) => (
                    <span key={`${plan.id}-${index}`}>
                      <i>✓</i>
                      {item}
                    </span>
                  ))
                ) : (
                  <span>
                    <i>✓</i>
                    Có thể chỉnh giá, quota, thời hạn và quyền lợi trong khung quản trị.
                  </span>
                )}
              </div>

              <button
                type="button"
                className={styles.editButton}
                onClick={() => setActivePlanId(plan.id)}
              >
                Chỉnh gói này
                <span>→</span>
              </button>
            </article>
          );
        })}
      </div>

      {activePlan && activePlanMeta && activePlanState && (
        <div className={styles.modalOverlay} role="presentation">
          <section
            className={`${styles.modalPanel} ${styles[`tone_${activePlanMeta.tone}`] || styles.tone_green}`}
            role="dialog"
            aria-modal="true"
            aria-label={`Chỉnh gói ${getPlanTitle(activePlan)}`}
          >
            <header className={styles.modalHeader}>
              <div>
                <span className={styles.modalBadge}>{activePlanMeta.eyebrow}</span>
                <h2>{getPlanTitle(activePlan)}</h2>
                <p>
                  Nút X chỉ đóng khung chỉnh sửa và không tự lưu. Muốn lưu thay đổi, hãy bấm nút lưu trong form bên dưới.
                </p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={closeEditor}
                aria-label="Đóng khung chỉnh sửa gói"
                title="Đóng - không lưu thay đổi"
                disabled={savingId === activePlan.id}
              >
                ×
              </button>
            </header>

            <div className={styles.modalSummary}>
              <span>
                <small>Trạng thái</small>
                <strong>{activePlanState.label}</strong>
              </span>
              <span>
                <small>Giá hiện tại</small>
                <strong>{formatMoney(activePlan.price || activePlan.amount || 0)}</strong>
              </span>
              <span>
                <small>Quota</small>
                <strong>{formatNumber(activePlan.quota || activePlan.quotaTotal || 0)}</strong>
              </span>
              <span>
                <small>Mã gói</small>
                <strong>{activePlan.id}</strong>
              </span>
            </div>

            <div className={styles.editorSurface}>
              <PlanEditor
                plan={activePlan}
                onSave={(planId, payload) => handleSave(planId, payload)}
              />
            </div>

            {savingId === activePlan.id && (
              <div className={styles.savingOverlay}>
                <span />
                Đang lưu thay đổi...
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
