import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../shared/ui/Button/Button';
import Input from '../../../shared/ui/Input/Input';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const result = await login(form.email, form.password);

    if (!result.success) {
      setError(result.message);
      return;
    }

    const role = result.user?.role;

    if (role === 'admin') navigate('/quan-tri');
    else if (role === 'partner') navigate('/doi-tac');
    else navigate('/tai-khoan');
  };

  return (
    <div className={styles.page}>
      <div className={`pageContainer ${styles.inner}`}>
        <div className={styles.authShell}>
          <section className={styles.leftPanel}>
            <div className={styles.leftContent}>
              <div className={styles.productTag}>
                <span></span>
                ReviewHub Secure Access
              </div>

              <h1>Đăng nhập vào trung tâm quản lý dữ liệu review.</h1>

              <p>
                Theo dõi API key, quota, dữ liệu public/private và trạng thái
                kiểm duyệt review trong một dashboard thống nhất.
              </p>

              <div className={styles.metricGrid}>
                <div>
                  <strong>API</strong>
                  <span>Read / Write review</span>
                </div>

                <div>
                  <strong>AI</strong>
                  <span>Moderation control</span>
                </div>

                <div>
                  <strong>Data</strong>
                  <span>Private / Public scope</span>
                </div>
              </div>

              <div className={styles.secureLine}>
                <span></span>
                API key được quản lý riêng theo từng partner
              </div>
            </div>
          </section>

          <section className={styles.rightPanel}>
            <div className={styles.formBox}>
              <div className={styles.formHeader}>
                <div className={styles.formBadge}>Đăng nhập</div>

                <h2>Chào mừng quay lại</h2>

                <p>
                  Truy cập tài khoản để tiếp tục quản lý ReviewHub.
                </p>
              </div>

              <form className={styles.form} onSubmit={onSubmit}>
                <Input
                  label="Email"
                  placeholder="hoang@reviewhub.vn"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />

                <Input
                  label="Mật khẩu"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  error={error}
                />

                <div className={styles.formOptions}>
                  <label className={styles.remember}>
                    <input type="checkbox" />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>

                  <Link to="/quen-mat-khau">
                    Quên mật khẩu?
                  </Link>
                </div>

                <Button type="submit">
                  Đăng nhập
                </Button>
              </form>

              <div className={styles.securityNote}>
                <span></span>
                <p>
                  Thông tin đăng nhập được bảo vệ và chỉ dùng để truy cập hệ thống
                  ReviewHub.
                </p>
              </div>

              <div className={styles.registerBox}>
                <span>Chưa có tài khoản?</span>
                <Link to="/dang-ky">Đăng ký ngay</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}