// src/pages/auth/Signup.jsx — Interactive signup with role cards, badges & toast

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Heart, ShieldCheck } from 'lucide-react';
import './Auth.css';

export default function Signup() {
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const roleParam = searchParams.get('role') || '';

  const { login } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirmPassword: '', role: roleParam || '',
  });
  const [showPwd, setShowPwd]   = useState(false);
  const [error,   setError]     = useState('');
  const [loading, setLoading]   = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    if (!form.full_name.trim()) return 'Full name is required.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return 'Valid email is required.';
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (!form.role) return 'Please select your role (Donor or Receiver).';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      const data = await authApi.signup({
        full_name: form.full_name.trim(),
        email:     form.email.trim(),
        password:  form.password,
        role:      form.role,
      });
      login(data.token, data.user);
      addToast({
        title: 'Account Created Successfully! 🎉',
        message: `Welcome to HemoLink as a ${form.role.toUpperCase()}.`,
        type: 'success',
      });
      if (redirect) {
        navigate(redirect, { replace: true });
      } else if (data.user.role === 'donor') {
        navigate('/donor/dashboard', { replace: true });
      } else {
        navigate('/receiver/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message);
      addToast({ title: 'Signup Error', message: err.message, type: 'error' });
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page auth-page--right">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Badge variant="success" pulse pulseColor="green">
            Join 10,000+ Life Savers Across the Nation
          </Badge>
        </div>

        {/* Logo & Headline */}
        <div className="auth-logo-wrap">
          <h1 className="auth-brand">🩸 HemoLink</h1>
        </div>

        <h2 className="auth-title">Begin Your Journey</h2>
        <p className="auth-subtitle">Every drop connects a heart. Join the network today.</p>

        {redirect && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.4 }}>
            <span>🩸</span>
            <span>Create your Donor account to complete your blood donation offer. Your action will automatically resume right after!</span>
          </div>
        )}

        {error && <div className="auth-error">⚠️ {error}</div>}

        {/* Role Selector with Interactive Cards */}
        <div className="role-selector">
          <p className="role-label">Choose your account type:</p>
          <div className="role-cards">
            <button
              type="button"
              className={`role-card ${form.role === 'donor' ? 'role-card--active' : ''}`}
              onClick={() => {
                set('role', 'donor');
                addToast({ title: 'Donor Selected 🩸', message: 'You are registering to give blood and save lives.' });
              }}
            >
              <span className="role-icon">🩸</span>
              <span className="role-name">Blood Donor</span>
              <span className="role-desc">I want to give blood & answer emergency requests</span>
            </button>

            <button
              type="button"
              className={`role-card ${form.role === 'receiver' ? 'role-card--active' : ''}`}
              onClick={() => {
                set('role', 'receiver');
                addToast({ title: 'Receiver Selected 🏥', message: 'You are registering to request blood when needed.' });
              }}
            >
              <span className="role-icon">🏥</span>
              <span className="role-name">Patient / Receiver</span>
              <span className="role-desc">I need blood for patients or emergency hospital care</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Legal Name</label>
            <input type="text" placeholder="e.g. Rahul Verma" value={form.full_name}
              onChange={e => set('full_name', e.target.value)} className="auth-input" required />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="e.g. yourname@example.com" value={form.email}
              onChange={e => set('email', e.target.value)} className="auth-input" required />
          </div>

          <div className="form-group">
            <label>Create Password</label>
            <div className="password-wrapper">
              <input type={showPwd ? 'text' : 'password'} placeholder="At least 6 characters"
                value={form.password} onChange={e => set('password', e.target.value)}
                className="auth-input" required />
              <button type="button" className="eye-btn" onClick={() => setShowPwd(p => !p)}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input type={showPwd ? 'text' : 'password'} placeholder="Repeat your password"
              value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
              className="auth-input" required />
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Creating your account...' : 'Complete Sign Up →'}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>Log In to Account</Link>
        </p>
      </div>
    </div>
  );
}
