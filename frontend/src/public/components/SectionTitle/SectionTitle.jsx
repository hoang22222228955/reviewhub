import styles from './SectionTitle.module.css';

export default function SectionTitle({ eyebrow, title, description, center = false }) {
  return (
    <div className={`${styles.wrap} ${center ? styles.center : ''}`}>
      {eyebrow && (
        <div className={styles.eyebrowLine}>
          <span className={styles.eyebrowDash} />
          <span className={styles.eyebrowText}>{eyebrow}</span>
        </div>
      )}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.desc}>{description}</p>}
    </div>
  );
}
