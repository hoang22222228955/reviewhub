import styles from './PublicFooter.module.css';

export default function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`pageContainer ${styles.inner}`}>
        <div className={styles.glow}></div>

        <div className={styles.links}>
          <div>
            <h4>Sản phẩm</h4>
            <a href="/pricing">Bảng giá</a>
            <a href="/docs">Tài liệu API</a>
            <a href="/guides">Hướng dẫn</a>
            <a href="/status">Status</a>
          </div>

          <div>
            <h4>Cộng đồng</h4>
            <a href="/blog">Blog</a>
            <a href="/changelog">Changelog</a>
            <a href="/resources">Tài nguyên</a>
          </div>

          <div>
            <h4>Công ty</h4>
            <a href="/about">Giới thiệu</a>
            <a href="/careers">Tuyển dụng</a>
            <a href="/contact">Liên hệ</a>
          </div>

          <div>
            <h4>Pháp lý</h4>
            <a href="/terms">Điều khoản</a>
            <a href="/privacy">Chính sách bảo mật</a>
            <a href="/cookies">Cookie Policy</a>
          </div>

          <div>
            <h4>Liên hệ</h4>
            <a href="mailto:hello@reviewhub.vn">hello@reviewhub.vn</a>
            <a href="tel:+84123456789">+84 123 456 789</a>
            <span>Hà Nội, Việt Nam</span>
          </div>
        </div>

        <div className={styles.bottom}>
          <div className={styles.brand}>
            <div className={styles.logo}>RH</div>

            <div>
              <span className={styles.brandName}>ReviewHub</span>
              <p>© 2025 ReviewHub. All rights reserved.</p>
            </div>
          </div>

          <div className={styles.socials}>
            <a href="#">GitHub</a>
            <a href="#">Facebook</a>
            <a href="#">LinkedIn</a>
            <a href="#">X</a>
          </div>
        </div>
      </div>
    </footer>
  );
}