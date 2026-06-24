import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar/AdminSidebar';
import AdminTopbar from '../components/AdminTopbar/AdminTopbar';
import ChatWidget from '../../shared/ui/Chat/ChatWidget';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  return (
    <div className={styles.shell}>
      <AdminSidebar />

      <div className={styles.body}>
        <AdminTopbar />
        <Outlet />
      </div>

      <ChatWidget />
    </div>
  );
}