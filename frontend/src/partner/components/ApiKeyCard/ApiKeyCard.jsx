import { useState } from 'react';
import styles from './ApiKeyCard.module.css';

export default function ApiKeyCard({ title, value, helper, onRegenerate, regenerating }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <span className={styles.icon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15.5 7.5a4.5 4.5 0 1 0 1.2 4.2l3.3-3.3V6h-2.4l-2.1 1.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7.8 12.2h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <span className={styles.eyebrow}>Partner API Access</span>
            <h3>{title}</h3>
          </div>
        </div>

        <span className={styles.status}>
          <i /> Active
        </span>
      </div>

      <div className={styles.keyBox}>
        <code>{value || '—'}</code>
        <button type="button" onClick={handleCopy} aria-label="Copy khóa API">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
            <path d="M5 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className={styles.metaGrid}>
        <div>
          <span>Quyền truy cập</span>
          <strong>Partner scope</strong>
        </div>
        <div>
          <span>Trạng thái</span>
          <strong><i /> Đang hoạt động</strong>
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.copyBtn} onClick={handleCopy}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M8 8V6.8C8 5.8 8.8 5 9.8 5h7.4c1 0 1.8.8 1.8 1.8v7.4c0 1-.8 1.8-1.8 1.8H16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <rect x="5" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
          </svg>
          {copied ? 'Đã copy' : 'Copy khóa API'}
        </button>

        {onRegenerate && (
          <button
            type="button"
            className={styles.regenBtn}
            onClick={onRegenerate}
            disabled={regenerating}
            title="Tạo khóa mới — khóa cũ sẽ không còn dùng được"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4.75 12A7.25 7.25 0 0 1 17.3 6.5M19.25 12A7.25 7.25 0 0 1 6.7 17.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M16.75 4.75v3.5h3.5M3.75 15.75v3.5h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {regenerating ? 'Đang tạo…' : 'Tạo lại key'}
          </button>
        )}

        <p>{helper || 'Không chia sẻ khóa này với người không có quyền.'}</p>
      </div>
    </article>
  );
}

