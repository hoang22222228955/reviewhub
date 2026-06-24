import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../shared/ui/Button/Button';
import Input from '../../../shared/ui/Input/Input';
import { useAuth } from '../../context/AuthContext';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
    };

    const result = await register(payload);

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
                ReviewHub Partner Access
              </div>

              <h1>Tạo tài khoản để bắt đầu khai thác ReviewHub.</h1>

              <p>
                Sau khi đăng ký, bạn có thể mua gói dịch vụ, nhận API key,
                theo dõi quota và sử dụng dữ liệu review theo phạm vi được cấp.
              </p>

              <div className={styles.stepList}>
                <div>
                  <strong>01</strong>
                  <span>Tạo tài khoản</span>
                </div>

                <div>
                  <strong>02</strong>
                  <span>Chọn gói dịch vụ</span>
                </div>

                <div>
                  <strong>03</strong>
                  <span>Nhận API key</span>
                </div>
              </div>

              <div className={styles.secureLine}>
                <span></span>
                Public / Private data access ready
              </div>
            </div>
          </section>

          <section className={styles.rightPanel}>
            <div className={styles.formBox}>
              <div className={styles.formHeader}>
                <div className={styles.formBadge}>Đăng ký</div>

                <h2>Tạo tài khoản mới</h2>

                <p>
                  Nhập thông tin để bắt đầu sử dụng nền tảng ReviewHub.
                </p>
              </div>

              <form className={styles.form} onSubmit={onSubmit}>
                <Input
                  label="Họ và tên"
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />

                <div className={styles.twoCol}>
                  <Input
                    label="Email"
                    placeholder="partner@company.vn"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />

                  <Input
                    label="Số điện thoại"
                    placeholder="0909 888 999"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>

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

                <Input
                  label="Nhập lại mật khẩu"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                />

                {form.confirmPassword && (
                  <div
                    className={
                      form.password === form.confirmPassword
                        ? styles.passwordMatch
                        : styles.passwordError
                    }
                  >
                    {form.password === form.confirmPassword
                      ? '✓ Mật khẩu khớp'
                      : '✕ Mật khẩu chưa khớp'}
                  </div>
                )}

                <div className={styles.policyBox}>
                  <span></span>
                  <p>
                    Tài khoản sau khi tạo có thể nâng cấp thành partner để mua gói
                    API, xem quota và quản lý dữ liệu review.
                  </p>
                </div>

                <Button type="submit">
                  Tạo tài khoản
                </Button>
              </form>

              <div className={styles.loginBox}>
                <span>Đã có tài khoản?</span>
                <Link to="/dang-nhap">Đăng nhập</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}