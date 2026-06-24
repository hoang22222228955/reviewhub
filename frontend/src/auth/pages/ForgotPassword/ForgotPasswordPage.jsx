import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import styles from './ForgotPasswordPage.module.css';

// Bước 1: nhập SĐT → gửi OTP
// Bước 2: nhập OTP → xác minh → hiện dấu tích
// Bước 3: nhập mật khẩu mới + nhập lại → đổi mật khẩu

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep]           = useState(1); // 1 | 2 | 3
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // ── Bước 1: Gửi OTP ─────────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault();
    if (!phone.trim()) { setError('Vui lòng nhập số điện thoại.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/send-otp', { phone });
      if (res.data.success) {
        console.log('[OTP Demo]', res.data.otpDemo);
        setStep(2);
      } else {
        setError(res.data.message || 'Không gửi được OTP.');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  // ── Bước 2: Xác minh OTP ────────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!otp.trim()) { setError('Nhập mã OTP.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/verify-otp', { phone, otp });
      if (res.data.success) {
        setOtpVerified(true);
        setError('');
        setTimeout(() => setStep(3), 600); // Chờ tick animation rồi qua bước 3
      } else {
        setError(res.data.message || 'Mã OTP không đúng.');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  // ── Bước 3: Đổi mật khẩu ────────────────────────────────────
  async function handleResetPassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (newPassword !== confirmPw) { setError('Mật khẩu nhập lại không khớp.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/forgot-password', { phone, otp, newPassword });
      if (res.data.success) {
        setSuccess('Đổi mật khẩu thành công! Đang chuyển về đăng nhập…');
        setTimeout(() => navigate('/dang-nhap'), 2000);
      } else {
        setError(res.data.message || 'Đổi mật khẩu thất bại.');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={`pageContainer ${styles.inner}`}>
        <div className={styles.card}>

          {/* Header */}
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}>
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.2" fill="currentColor"/>
              </svg>
            </div>
            <h2>Quên mật khẩu</h2>
            <p>Xác minh số điện thoại để đặt lại mật khẩu của bạn.</p>
          </div>

          {/* Step indicator */}
          <div className={styles.steps}>
            {['Nhập SĐT', 'Xác minh OTP', 'Mật khẩu mới'].map((label, i) => (
              <div key={i} className={`${styles.step} ${step > i + 1 ? styles.stepDone : ''} ${step === i + 1 ? styles.stepActive : ''}`}>
                <span>{step > i + 1 ? '✓' : i + 1}</span>
                <p>{label}</p>
              </div>
            ))}
          </div>

          {/* ── Bước 1 ── */}
          {step === 1 && (
            <form className={styles.form} onSubmit={handleSendOtp}>
              <label className={styles.label}>
                Số điện thoại đã đăng ký
                <input className={styles.input} type="tel" placeholder="0909 888 999"
                  value={phone} onChange={e => { setPhone(e.target.value); setError(''); }} />
              </label>
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Đang gửi…' : 'Gửi mã OTP'}
              </button>
            </form>
          )}

          {/* ── Bước 2 ── */}
          {step === 2 && (
            <form className={styles.form} onSubmit={handleVerifyOtp}>
              <p className={styles.hint}>
                Mã OTP đã gửi đến <strong>{phone}</strong>. Nhập mã để tiếp tục.
              </p>
              <div className={styles.otpRow}>
                <input
                  className={`${styles.otpInput} ${otpVerified ? styles.otpOk : error ? styles.otpErr : ''}`}
                  placeholder="_ _ _ _ _ _"
                  maxLength={6}
                  value={otp}
                  onChange={e => { setOtp(e.target.value); setError(''); setOtpVerified(false); }}
                />
                {otpVerified && (
                  <span className={styles.tick}>
                    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#16a34a"/><path d="M7 12.5l3.5 3.5 6-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                )}
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className={styles.btn} disabled={loading || otp.length < 4}>
                {loading ? 'Đang xác minh…' : 'Xác minh'}
              </button>
              <button type="button" className={styles.linkBtn} onClick={() => { setStep(1); setOtp(''); setError(''); }}>
                ← Đổi số điện thoại
              </button>
            </form>
          )}

          {/* ── Bước 3 ── */}
          {step === 3 && (
            <form className={styles.form} onSubmit={handleResetPassword}>
              <label className={styles.label}>
                Mật khẩu mới
                <input className={styles.input} type="password" placeholder="Ít nhất 6 ký tự"
                  value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(''); }} />
              </label>
              <label className={styles.label}>
                Nhập lại mật khẩu
                <input
                  className={`${styles.input} ${confirmPw && newPassword !== confirmPw ? styles.inputErr : ''}`}
                  type="password" placeholder="••••••••"
                  value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                />
              </label>
              {confirmPw && (
                <p className={newPassword === confirmPw ? styles.matchOk : styles.matchErr}>
                  {newPassword === confirmPw ? '✓ Mật khẩu khớp' : '✕ Mật khẩu chưa khớp'}
                </p>
              )}
              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.successMsg}>{success}</p>}
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          )}

          <div className={styles.footer}>
            <span>Nhớ mật khẩu rồi?</span>
            <Link to="/dang-nhap">Đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
