import styles from './Card.module.css';

export default function Card({ title, description, headerRight, className = '', children }) {
  return (
    <section className={`${styles.card} ${className}`.trim()}>
      {(title || description || headerRight) && (
        <div className={styles.header}>
          <div>
            {title && <h3 className={styles.title}>{title}</h3>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {headerRight}
        </div>
      )}
      {children}
    </section>
  );
}
