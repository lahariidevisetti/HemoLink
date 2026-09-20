// src/components/ui/Card.jsx
import './UI.css';

export function Card({ children, hover = false, className = '', ...props }) {
  return (
    <div className={`ui-card ${hover ? 'ui-card--hover' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div style={{ marginBottom: 16 }} className={className} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3
      style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#111827' }}
      className={className}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }} className={className} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
