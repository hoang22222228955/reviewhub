import { Link } from 'react-router-dom'
import { House } from 'lucide-react'
import { useAuth } from '../../../auth/context/AuthContext'
import styles from './PartnerTopbar.module.css'

function getInitials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean)

  if (!words.length) return 'U'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

export default function PartnerTopbar() {
  const { currentUser } = useAuth()

  const initials = getInitials(
    currentUser?.name ||
    currentUser?.orgName ||
    currentUser?.email ||
    'Partner'
  )

  const displayName =
    currentUser?.name ||
    currentUser?.orgName ||
    'Tài khoản đối tác'

  return (
    <div className={styles.topbar}>
      <div className={styles.content}>
        <div className={styles.eyebrow}>Partner workspace</div>

        <h1>Không gian đối tác ReviewHub</h1>

        <p>
          Theo dõi quota, API key, review đã gửi và quyền lợi gói dịch vụ trong khu vực
          quản lý riêng dành cho partner.
        </p>
      </div>

      <div className={styles.actions}>
        <Link to="/" className={styles.homeLink}>
          <House size={15} strokeWidth={1.9} />
          <span>Về trang chủ</span>
        </Link>

        <Link to="/tai-khoan" className={styles.accountCard}>
          <div className={styles.accountAvatar}>{initials}</div>

          <div className={styles.accountInfo}>
            <strong>{displayName}</strong>
            <span>Đối tác</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
