import { Outlet, useLocation } from 'react-router-dom';
import PublicHeader from '../components/Header/PublicHeader';
import PublicFooter from '../components/Footer/PublicFooter';
import FloatingAIChat from '../components/AIAdvisor/FloatingAIChat';
import styles from './PublicLayout.module.css';

export default function PublicLayout({ compact = false }) {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className={styles.shell}>
      <PublicHeader compact={compact} />

      <main className={styles.main}>
        <Outlet />
      </main>

      {isHome && <PublicFooter />}

      <FloatingAIChat />
    </div>
  );
}