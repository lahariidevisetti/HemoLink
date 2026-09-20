// src/components/ui/Badge.jsx
import './UI.css';

export function Badge({
  children,
  variant = 'default', // default | primary | success | warning | danger | outline | glow
  pulse = false,
  pulseColor = 'red',
  className = '',
  ...props
}) {
  return (
    <span className={`ui-badge ui-badge--${variant} ${className}`} {...props}>
      {pulse && <span className={`pulse-dot pulse-dot--${pulseColor}`} />}
      {children}
    </span>
  );
}
