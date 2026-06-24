import { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import styles from './AdminSyncReviewPage.module.css';

export default function AdminSyncReviewPage() {
  const [operators, setOperators] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [log, setLog] = useState([]);
  const [result, setResult] = useState(null);
  const logRef = useRef(null);
  const logTimerRef = useRef(null);

  function now() {
    return new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function normalizeLogLine(line) {
    const text = String(line || '').trim();

    if (!text) return null;

    if (text.startsWith('[')) {
      return text;
    }

    return `[${now()}] ${text}`;
  }

  async function fetchLiveLog() {
    try {
      const res = await api.get('/api/admin/sync-reviews/log', {
        timeout: 10000,
      });

      const lines = Array.isArray(res.data?.lines) ? res.data.lines : [];

      if (!lines.length) return;

      const mapped = lines
        .map(normalizeLogLine)
        .filter(Boolean);

      if (mapped.length) {
        setLog(mapped);
      }
    } catch (err) {
      console.log('Không đọc được live log:', err);
    }
  }

  function startLiveLog() {
    if (logTimerRef.current) {
      clearInterval(logTimerRef.current);
    }

    logTimerRef.current = setInterval(() => {
      fetchLiveLog();
    }, 1500);
  }

  function stopLiveLog() {
    if (logTimerRef.current) {
      clearInterval(logTimerRef.current);
      logTimerRef.current = null;
    }
  }

  useEffect(() => {
    api
      .get('/api/operators')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];

        setOperators(list);

        if (list.length) {
          setSelectedCode(list[0].operatorCode);
        }
      })
      .catch(err => {
        console.error('LOAD OPERATORS ERROR:', err);
      });
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  useEffect(() => {
    return () => {
      stopLiveLog();
    };
  }, []);

  async function handleSync() {
    if (!selectedCode || syncing) return;

    setSyncing(true);
    setResult(null);
    setLog([]);

    const op = operators.find(o => o.operatorCode === selectedCode);
    const name = op ? op.operatorName : selectedCode;

    setLog([
      `[${now()}] Bắt đầu crawl Google Maps cho nhà xe: ${name} (${selectedCode})`,
      `[${now()}] Đang mở Chrome và tìm kiếm...`,
      `[${now()}] Đang chờ log realtime từ backend...`,
    ]);

    startLiveLog();

    try {
      let url = `/api/admin/sync-reviews?operatorCode=${encodeURIComponent(selectedCode)}`;

      if (partnerEmail.trim()) {
        url += `&partnerEmail=${encodeURIComponent(partnerEmail.trim())}`;
      }

      const res = await api.post(url, null, {
        timeout: 900000,
      });

      await fetchLiveLog();

      const data = res.data || {};

      const finalLines = [
        `[${now()}] ✓ Crawl hoàn tất.`,
        `[${now()}] ✓ Import vào database xong.`,
        ...(partnerEmail.trim()
          ? [`[${now()}] ✓ Đã gán tài khoản ${partnerEmail.trim()} vào nhà xe.`]
          : []),
        `[${now()}] Kết quả: ${data.inserted ?? 0} review mới, ${data.skipped ?? 0} bỏ qua, ${data.failed ?? 0} lỗi.`,
      ];

      setLog(prev => {
        const merged = [...prev];

        finalLines.forEach(line => {
          if (!merged.includes(line)) {
            merged.push(line);
          }
        });

        return merged;
      });

      setResult({
        ok: true,
        inserted: data.inserted ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
        message: data.message || 'Đồng bộ review hoàn tất.',
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Lỗi không xác định.';

      setLog(prev => [...prev, `[${now()}] ✗ Lỗi: ${msg}`]);

      setResult({
        ok: false,
        message: msg,
      });
    } finally {
      stopLiveLog();

      try {
        await fetchLiveLog();
      } catch {
        // bỏ qua
      }

      setSyncing(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Lấy Review từ Google Maps</h1>

        <p className={styles.sub}>
          Chọn nhà xe, nhấn <strong>Lấy Review</strong> — hệ thống sẽ crawl Google Maps
          và đưa dữ liệu vào database. Đối tác nhà xe đó sẽ thấy review trong trang của họ.
        </p>
      </div>

      <div className={styles.panel}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="emailInput">
            Email tài khoản partner{' '}
            <span className={styles.optional}>
              (tuỳ chọn — để gán partner vào nhà xe)
            </span>
          </label>

          <input
            id="emailInput"
            type="email"
            className={styles.input}
            placeholder="vd: partner@email.com"
            value={partnerEmail}
            onChange={e => setPartnerEmail(e.target.value)}
            disabled={syncing}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="opSelect">
            Nhà xe
          </label>

          <select
            id="opSelect"
            className={styles.select}
            value={selectedCode}
            onChange={e => setSelectedCode(e.target.value)}
            disabled={syncing}
          >
            <option value="">-- Chọn nhà xe --</option>

            {operators.map(op => (
              <option key={op.operatorCode} value={op.operatorCode}>
                {op.operatorCode} — {op.operatorName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={styles.btn}
          onClick={handleSync}
          disabled={syncing || !selectedCode}
        >
          {syncing ? (
            <>
              <span className={styles.spinner} /> Đang crawl...
            </>
          ) : (
            '⬇ Lấy Review'
          )}
        </button>
      </div>

      {result && (
        <div className={result.ok ? styles.resultOk : styles.resultErr}>
          {result.ok
            ? `✓ ${result.message}`
            : `✗ ${result.message}`}
        </div>
      )}

      {log.length > 0 && (
        <div className={styles.logWrap}>
          <div className={styles.logHeader}>
            <span>📋 Log tiến trình</span>
            {syncing && <span className={styles.liveTag}>● LIVE</span>}
          </div>

          <div className={styles.logBody} ref={logRef}>
            {log.map((line, index) => (
              <div
                key={`${line}_${index}`}
                className={
                  line.includes('✗')
                    ? styles.logErr
                    : line.includes('✓')
                    ? styles.logOk
                    : line.includes('Scroll') ||
                      line.includes('scroll') ||
                      line.includes('bình luận') ||
                      line.includes('reviews')
                    ? styles.logProgress
                    : styles.logLine
                }
              >
                {line}
              </div>
            ))}

            {syncing && (
              <div className={styles.logWaiting}>
                ⏳ Selenium đang crawl, vui lòng chờ...
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.infoBox}>
        <strong>Lưu ý:</strong>

        <ul>
          <li>
            Quá trình crawl mất khoảng <strong>2–5 phút</strong> vì Selenium mở Chrome thật.
          </li>
          <li>
            Review mới sẽ ở trạng thái <strong>Chờ duyệt</strong> — cần kiểm duyệt trước khi public.
          </li>
          <li>
            Đối tác của nhà xe sẽ thấy review trong trang <em>Lấy Review</em> của họ sau khi crawl xong.
          </li>
        </ul>
      </div>
    </div>
  );
}