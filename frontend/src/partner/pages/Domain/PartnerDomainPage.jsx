import { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import styles from './PartnerDomainPage.module.css';

function DomainRow({ domain, onDelete }) {
  return (
    <div className={styles.domainRow}>
      <span className={styles.domainIcon}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="7.25" />
          <path d="M12 4.75c-2 2-3.25 4.5-3.25 7.25s1.25 5.25 3.25 7.25M12 4.75c2 2 3.25 4.5 3.25 7.25S14 17.25 12 19.25M4.75 12h14.5" />
        </svg>
      </span>
      <span className={styles.domainName}>{domain.domain}</span>
      <span className={styles.domainDate}>
        {new Date(domain.createdAt).toLocaleDateString('vi-VN')}
      </span>
      <button
        className={styles.deleteBtn}
        onClick={() => onDelete(domain.id)}
        title="Xóa domain"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9.25 7.25v-1a2 2 0 0 1 2-2h1.5a2 2 0 0 1 2 2v1M4.75 7.25h14.5M8.75 10.25v6.5M15.25 10.25v6.5M5.75 7.25l1 11.5h10.5l1-11.5" />
        </svg>
        Xóa
      </button>
    </div>
  );
}

export default function PartnerDomainPage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addValue, setAddValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const inputRef = useRef(null);

  function loadDomains() {
    setLoading(true);
    api.get('/api/partner/domains')
      .then((res) => setDomains(res.data))
      .catch(() => setError('Không thể tải danh sách domain.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDomains();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const val = addValue.trim();
    if (!val) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await api.post('/api/partner/domains', { domain: val });
      setDomains((prev) => [res.data, ...prev]);
      setAddValue('');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Không thể thêm domain.';
      setAddError(msg);
    } finally {
      setAdding(false);
      inputRef.current?.focus();
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/partner/domains/${id}`);
      setDomains((prev) => prev.filter((d) => d.id !== id));
    } catch {
      alert('Không thể xóa domain. Vui lòng thử lại.');
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Mở rộng Domain</h1>
          <p className={styles.heroSub}>
            Quản lý danh sách domain được phép gọi API của bạn. Chỉ các domain trong
            danh sách này mới được xác thực khi gọi API từ trình duyệt.
          </p>
        </div>
        <span className={styles.heroBadge}>Enterprise</span>
      </div>

      {/* Add form */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Thêm domain mới</h2>
        <form className={styles.addForm} onSubmit={handleAdd}>
          <div className={styles.inputWrap}>
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              placeholder="Nhập domain, ví dụ: myapp.vn hoặc api.example.com"
              value={addValue}
              onChange={(e) => { setAddValue(e.target.value); setAddError(null); }}
              disabled={adding}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button className={styles.addBtn} type="submit" disabled={adding || !addValue.trim()}>
            {adding ? 'Đang thêm…' : 'Thêm domain'}
          </button>
        </form>
        {addError && <p className={styles.addError}>{addError}</p>}
        <p className={styles.hint}>
          Hỗ trợ tên miền đầy đủ (FQDN) và tên miền phụ, ví dụ:{' '}
          <code>dashboard.myapp.vn</code>, <code>partner.example.com</code>.
        </p>
      </div>

      {/* Domain list */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Danh sách domain
          <span className={styles.count}>{domains.length}</span>
        </h2>

        {loading && (
          <div className={styles.emptyState}>
            <div className={styles.spinner} />
            <p>Đang tải…</p>
          </div>
        )}

        {error && <p className={styles.errorBox}>{error}</p>}

        {!loading && !error && domains.length === 0 && (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7.25" />
              <path d="M12 4.75c-2 2-3.25 4.5-3.25 7.25s1.25 5.25 3.25 7.25M12 4.75c2 2 3.25 4.5 3.25 7.25S14 17.25 12 19.25M4.75 12h14.5" />
            </svg>
            <p>Chưa có domain nào được thêm.</p>
          </div>
        )}

        {!loading && !error && domains.length > 0 && (
          <div className={styles.domainList}>
            {domains.map((d) => (
              <DomainRow key={d.id} domain={d} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
