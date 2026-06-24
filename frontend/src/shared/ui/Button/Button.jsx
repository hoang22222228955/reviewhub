import styles from './Button.module.css';

export default function Button({ as = 'button', variant = 'primary', className = '', children, ...props }) {
  const Comp = as;
  return (
    <Comp className={`${styles.button} ${styles[variant]} ${className}`.trim()} {...props}>
      {children}
    </Comp>
  );
}
