import { Outlet } from 'react-router-dom';
import PartnerSidebar from '../components/PartnerSidebar/PartnerSidebar';
import PartnerTopbar from '../components/PartnerTopbar/PartnerTopbar';
import PartnerChatWidget from '../components/PartnerChatWidget/PartnerChatWidget';
import styles from './PartnerLayout.module.css';

export default function PartnerLayout() {
  return (
    <div className={styles.shell}>
      <PartnerSidebar />

      <div className={styles.body}>
        <PartnerTopbar />
        <Outlet />
      </div>

      <PartnerChatWidget />
    </div>
  );
}