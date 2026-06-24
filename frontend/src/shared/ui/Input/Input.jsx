import styles from './Input.module.css';

export default function Input({ label, helper, error, textarea = false, className = '', ...props }) {
  const Comp = textarea ? 'textarea' : 'input';
  return (
    <label className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <Comp className={`${styles.input} ${textarea ? styles.textarea : ''} ${className}`.trim()} {...props} />
      {error ? <span className={styles.error}>{error}</span> : helper ? <span className={styles.helper}>{helper}</span> : null}
    </label>
  );
}
