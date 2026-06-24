import styles from './Badge.module.css';

export default function Badge({ children, tone = 'primary' }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
