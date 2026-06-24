import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './AdminSidebar.module.css';

const items = [
  { to: '/quan-tri', label: 'Tổng quan', icon: 'dashboard' },
  { to: '/quan-tri/goi-dich-vu', label: 'Quản lý gói', icon: 'package' },
  { to: '/quan-tri/doi-tac', label: 'Quản lý đối tác', icon: 'partners' },
  { to: '/quan-tri/mua-goi', label: 'Lịch sử mua gói', icon: 'receipt' },
  { to: '/quan-tri/kiem-duyet', label: 'Kiểm duyệt review', icon: 'shield' },
  { to: '/quan-tri/ngan-hang', label: 'Cấu hình ngân hàng', icon: 'bank' },
];

function Icon({ name }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...props}>
          <path d="M4.5 13.5h6v6h-6v-6Z" />
          <path d="M13.5 4.5h6v6h-6v-6Z" />
          <path d="M4.5 4.5h6v6h-6v-6Z" />
          <path d="M13.5 13.5h6v6h-6v-6Z" />
        </svg>
      );
    case 'package':
      return (
        <svg {...props}>
          <path d="M12 3.8 20 8.2v8.9l-8 4.4-8-4.4V8.2l8-4.4Z" />
          <path d="M4.5 8.4 12 12.6l7.5-4.2" />
          <path d="M12 12.6v8.5" />
          <path d="m8 6 8 4.5" />
        </svg>
      );
    case 'partners':
      return (
        <svg {...props}>
          <path d="M8.2 11.4a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Z" />
          <path d="M3.8 19.2c.5-2.8 2.1-4.2 4.4-4.2s3.9 1.4 4.4 4.2" />
          <path d="M16.4 10.8a2.6 2.6 0 1 0 0-5.2" />
          <path d="M14.7 14.6c2.6.2 4.3 1.7 4.8 4.6" />
        </svg>
      );
    case 'receipt':
      return (
        <svg {...props}>
          <path d="M6 3.8h12v16.4l-2.2-1.4-2.1 1.4-2.2-1.4-2.1 1.4-2.2-1.4L6 20.2V3.8Z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h3.8" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 3.8 19 6.5v5.6c0 4.3-2.7 7.2-7 8.5-4.3-1.3-7-4.2-7-8.5V6.5l7-2.7Z" />
          <path d="m8.7 12.2 2.1 2.1 4.6-5" />
        </svg>
      );
    case 'bank':
      return (
        <svg {...props}>
          <path d="M4 9.2 12 4l8 5.2H4Z" />
          <path d="M5.6 10.8v6.5" />
          <path d="M10 10.8v6.5" />
          <path d="M14 10.8v6.5" />
          <path d="M18.4 10.8v6.5" />
          <path d="M4.5 19.5h15" />
        </svg>
      );
    case 'crawl':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 19.5c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
          <path d="M12 14v5.5" />
          <path d="M9.5 17l2.5 2.5 2.5-2.5" />
        </svg>
      );
    default:
      return null;
  }
}

function ToggleIcon({ collapsed }) {
  if (collapsed) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="3.5" />
        <path d="M10 8v8" />
        <path d="M13.5 9.2h2" />
        <path d="M13.5 12h2" />
        <path d="M13.5 14.8h2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6.5 8h11" />
      <path d="M6.5 12h11" />
      <path d="M6.5 16h11" />
    </svg>
  );
}

function appendGridTransition(currentTransition) {
  const gridTransition = 'grid-template-columns 240ms ease';

  if (!currentTransition) return gridTransition;
  if (currentTransition.includes('grid-template-columns')) return currentTransition;

  return `${currentTransition}, ${gridTransition}`;
}


export default function AdminSidebar() {
  const sidebarRef = useRef(null);
  const layoutMetaRef = useRef(null);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('adminSidebarCollapsed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('adminSidebarCollapsed', collapsed ? '1' : '0');
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage.
    }
  }, [collapsed]);

  useEffect(() => {
    const sidebarEl = sidebarRef.current;
    const layoutEl = sidebarEl?.parentElement;

    if (!layoutEl) return undefined;

    layoutMetaRef.current = {
      layoutEl,
      originalGridTemplateColumns: layoutEl.style.gridTemplateColumns,
      originalTransition: layoutEl.style.transition,
    };

    return () => {
      const meta = layoutMetaRef.current;
      if (!meta?.layoutEl) return;

      if (meta.originalGridTemplateColumns) {
        meta.layoutEl.style.gridTemplateColumns = meta.originalGridTemplateColumns;
      } else {
        meta.layoutEl.style.removeProperty('grid-template-columns');
      }

      if (meta.originalTransition) {
        meta.layoutEl.style.transition = meta.originalTransition;
      } else {
        meta.layoutEl.style.removeProperty('transition');
      }

      meta.layoutEl.style.removeProperty('--admin-sidebar-track-width');
      meta.layoutEl.style.removeProperty('--admin-sidebar-free-space');
      delete meta.layoutEl.dataset.adminSidebarCollapsed;
      document.documentElement.removeAttribute('data-admin-sidebar');
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const openWidth = '286px';
    const collapsedWidth = '78px';
    const width = collapsed ? collapsedWidth : openWidth;
    const freeSpace = collapsed ? '208px' : '0px';

    function syncLayoutWidth() {
      const sidebarEl = sidebarRef.current;
      const layoutEl = sidebarEl?.parentElement;

      root.setAttribute('data-admin-sidebar', collapsed ? 'collapsed' : 'expanded');
      root.style.setProperty('--admin-sidebar-track-width', width);
      root.style.setProperty('--admin-sidebar-free-space', freeSpace);

      if (!layoutEl) return;

      if (!layoutMetaRef.current || layoutMetaRef.current.layoutEl !== layoutEl) {
        layoutMetaRef.current = {
          layoutEl,
          originalGridTemplateColumns: layoutEl.style.gridTemplateColumns,
          originalTransition: layoutEl.style.transition,
        };
      }

      layoutEl.dataset.adminSidebarCollapsed = collapsed ? 'true' : 'false';
      layoutEl.style.setProperty('--admin-sidebar-track-width', width);
      layoutEl.style.setProperty('--admin-sidebar-free-space', freeSpace);

      const isDesktop = window.matchMedia('(min-width: 1081px)').matches;
      const computedDisplay = window.getComputedStyle(layoutEl).display;
      const isGridLayout = computedDisplay.includes('grid');
      const meta = layoutMetaRef.current;

      if (!isDesktop || !isGridLayout) {
        if (meta.originalGridTemplateColumns) {
          layoutEl.style.gridTemplateColumns = meta.originalGridTemplateColumns;
        } else {
          layoutEl.style.removeProperty('grid-template-columns');
        }

        if (meta.originalTransition) {
          layoutEl.style.transition = meta.originalTransition;
        } else {
          layoutEl.style.removeProperty('transition');
        }

        return;
      }

      layoutEl.style.gridTemplateColumns = `${width} minmax(0, 1fr)`;
      layoutEl.style.transition = appendGridTransition(meta.originalTransition);
    }

    syncLayoutWidth();
    window.addEventListener('resize', syncLayoutWidth);
    window.dispatchEvent(new CustomEvent('admin-sidebar-change', { detail: { collapsed } }));

    return () => {
      window.removeEventListener('resize', syncLayoutWidth);
    };
  }, [collapsed]);

  const toggleLabel = collapsed ? 'Mở thanh bên' : 'Đóng sidebar';

  return (
    <aside ref={sidebarRef} className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarTop}>
        <div className={styles.brand}>
          <div className={styles.logo}>AD</div>
          <div className={styles.brandContent}>
            <div className={styles.title}>Admin control</div>
            <p className={styles.text}>Khu vực chỉnh giá gói, quản lý đối tác và kiểm duyệt dữ liệu.</p>
          </div>
        </div>

        <div className={styles.miniLogo}>AD</div>

        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setCollapsed((value) => !value)}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <ToggleIcon collapsed={collapsed} />
          <span className={styles.toggleTooltip}>{toggleLabel}</span>
        </button>
      </div>

      <nav className={styles.nav} aria-label="Admin menu">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/quan-tri'}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.iconWrap}>
              <Icon name={item.icon} />
            </span>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.linkTooltip}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
