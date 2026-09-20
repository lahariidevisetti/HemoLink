// src/components/ui/Button.jsx
import './UI.css';

export function Button({
  children,
  variant = 'primary', // primary | secondary | outline | ghost
  size = 'md',
  icon: Icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={`ui-btn ui-btn--${variant} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {children}
    </button>
  );
}
