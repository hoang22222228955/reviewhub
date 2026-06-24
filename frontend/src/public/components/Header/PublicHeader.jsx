import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../auth/context/AuthContext'
import styles from './PublicHeader.module.css'

function getInitials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'U'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

export default function PublicHeader() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/')
  }

  const goToAccountTab = (tab) => {
    setMenuOpen(false)
    navigate(`/tai-khoan?tab=${tab}`)
  }

  const initials = getInitials(currentUser?.name || '')

  const roleLabel =
    currentUser?.role === 'partner'
      ? 'Đối tác'
      : currentUser?.role === 'admin'
        ? 'Quản trị'
        : 'Người dùng'

  return (
    <header className={styles.header}>
      <div className={`pageContainer ${styles.inner}`}>
        <Link to="/" className={styles.brand}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="ReviewHub Logo" />
          </div>

          <div className={styles.brandText}>
            <span className={styles.brandTop}>ReviewHub API</span>
            <strong className={styles.brandName}>BLU Review</strong>
          </div>
        </Link>

        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            Trang chủ
          </NavLink>

          <NavLink
            to="/bang-gia"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            Bảng giá
          </NavLink>

          <NavLink
            to="/tai-lieu-api"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            Tài liệu API
          </NavLink>

          <NavLink
            to="/luong-he-thong"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            Luồng hệ thống
          </NavLink>

        </nav>

        <div className={styles.actions}>
          {currentUser ? (
            <div className={styles.accountMenu} ref={menuRef}>
              <button
                type="button"
                className={styles.accountTrigger}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <div className={styles.accountAvatar}>{initials}</div>

                <div className={styles.accountMeta}>
                  <strong className={styles.accountName}>
                    {currentUser.name || 'Tài khoản'}
                  </strong>
                  <span className={styles.accountRole}>{roleLabel}</span>
                </div>

                <div
                  className={`${styles.accountArrow} ${
                    menuOpen ? styles.accountArrowOpen : ''
                  }`}
                >
                  ▾
                </div>
              </button>

              {menuOpen && (
                <div className={styles.accountDropdown}>
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => goToAccountTab('profile')}
                  >
                    Hồ sơ người dùng
                  </button>

                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => goToAccountTab('plan')}
                  >
                    Gói hiện tại
                  </button>

                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => goToAccountTab('purchase')}
                  >
                    Lịch sử mua hàng
                  </button>

                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => goToAccountTab('payment')}
                  >
                    Lịch sử thanh toán
                  </button>

                  {currentUser.role === 'partner' && (
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setMenuOpen(false)
                        navigate('/doi-tac')
                      }}
                    >
                      Cổng đối tác
                    </button>
                  )}

                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setMenuOpen(false)
                        navigate('/quan-tri')
                      }}
                    >
                      Trang admin
                    </button>
                  )}

                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.guestActions}>
              <Link to="/dang-nhap" className={styles.loginLink}>
                Đăng nhập
              </Link>

              <Link to="/dang-ky" className={styles.signupButton}>
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}