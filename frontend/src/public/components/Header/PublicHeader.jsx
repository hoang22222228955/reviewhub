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

const PUBLIC_NAV_LINKS = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/bang-gia', label: 'Bảng giá' },
  { to: '/tai-lieu-api', label: 'Tài liệu API' },
  { to: '/luong-he-thong', label: 'Luồng hệ thống' },
]

export default function PublicHeader() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const menuRef = useRef(null)
  const mobileMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileNavOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const closeAllMenus = () => {
    setMenuOpen(false)
    setMobileNavOpen(false)
  }

  const handleLogout = () => {
    closeAllMenus()
    logout()
    navigate('/')
  }

  const goToAccountTab = (tab) => {
    closeAllMenus()
    navigate(`/tai-khoan?tab=${tab}`)
  }

  const initials = getInitials(currentUser?.name || '')

  const roleLabel =
    currentUser?.role === 'partner'
      ? 'Đối tác'
      : currentUser?.role === 'admin'
        ? 'Quản trị'
        : 'Người dùng'

  const renderNavLinks = (mobile = false) =>
    PUBLIC_NAV_LINKS.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => {
          if (mobile) setMobileNavOpen(false)
        }}
        className={({ isActive }) =>
          `${mobile ? styles.mobileNavLink : styles.navLink} ${
            isActive
              ? mobile
                ? styles.mobileNavLinkActive
                : styles.navLinkActive
              : ''
          }`
        }
      >
        {item.label}
      </NavLink>
    ))

  return (
    <header className={styles.header}>
      <div className={`pageContainer ${styles.inner}`}>
        <Link to="/" className={styles.brand} onClick={closeAllMenus}>
          <div className={styles.logo}>
            <img
              src="/logo.webp"
              alt="ReviewHub Logo"
              onError={(event) => {
                event.currentTarget.src = '/logo.png'
              }}
            />
          </div>

          <div className={styles.brandText}>
            <span className={styles.brandTop}>ReviewHub API</span>
            <strong className={styles.brandName}>BLU Review</strong>
          </div>
        </Link>

        <nav className={styles.nav}>{renderNavLinks(false)}</nav>

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
                        closeAllMenus()
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
                        closeAllMenus()
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

        <div className={styles.mobileMenu} ref={mobileMenuRef}>
          <button
            type="button"
            className={`${styles.mobileMenuButton} ${
              mobileNavOpen ? styles.mobileMenuButtonOpen : ''
            }`}
            onClick={() => setMobileNavOpen((prev) => !prev)}
            aria-label={mobileNavOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileNavOpen}
          >
            <span className={styles.mobileMenuIcon} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          {mobileNavOpen && (
            <div className={styles.mobileNavPanel}>
              {renderNavLinks(true)}

              {!currentUser && (
                <Link
                  to="/dang-nhap"
                  className={`${styles.mobileNavLink} ${styles.mobileLoginLink}`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
