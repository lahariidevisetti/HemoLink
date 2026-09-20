// src/pages/auth/Login.jsx — Interactive, animated login with demo autofill & toast

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Sparkles } from 'lucide-react';
import './Auth.css';

export default function Login() {
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const { login } = useAuth();
  const { addToast } = useToast();

  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 1-Click Demo Login helpers
  function fillDemo(role) {
    if (role === 'donor') {
      setForm({ email: 'donor@test.com', password: 'Test@1234' });
      addToast({ title: 'Donor Demo Loaded 🩸', message: 'Filled with donor@test.com' });
    } else {
      setForm({ email: 'receiver@test.com', password: 'Test@1234' });
      addToast({ title: 'Receiver Demo Loaded 🏥', message: 'Filled with receiver@test.com' });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const data = await authApi.login({ email: form.email, password: form.password });
      login(data.token, data.user);
      addToast({
        title: `Welcome back, ${data.user.full_name?.split(' ')[0]}! 👋`,
        message: 'Logged in successfully.',
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
      addToast({ title: 'Authentication Failed', message: err.message, type: 'error' });
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page auth-page--right">
      <div className="auth-card">
        {/* Status Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <Badge variant="glow" pulse pulseColor="red">
            ⚡ 100% Real-Time Donor Network
          </Badge>
        </div>

        {/* Logo & Headline */}
        <div className="auth-logo-wrap">
          <img src="/helpblood.png" alt="HemoLink" className="auth-logo" onError={e => { e.target.style.display='none'; }} />
          <h1 className="auth-brand">🩸 HemoLink</h1>
        </div>

        <h2 className="auth-title">Welcome Back, Hero</h2>
        <p className="auth-subtitle">Log in to save lives or find instant blood donors near you</p>

        {redirect && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.4 }}>
            <span>🩸</span>
            <span>Sign in to complete your blood donation offer. Your action will automatically resume right after!</span>
          </div>
        )}

        {/* Demo Fill Chips */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => fillDemo('donor')}
            style={{
              fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 20,
              background: '#fef2f2', border: '1px dashed #fca5a5', color: '#dc2626', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <Sparkles size={11} /> Donor Demo
          </button>
          <button
            type="button"
            onClick={() => fillDemo('receiver')}
            style={{
              fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 20,
              background: '#eff6ff', border: '1px dashed #93c5fd', color: '#2563eb', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <Sparkles size={11} /> Receiver Demo
          </button>
        </div>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="Enter your email" value={form.email}
              onChange={e => set('email', e.target.value)} className="auth-input" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input type={showPwd ? 'text' : 'password'} placeholder="Enter your password"
                value={form.password} onChange={e => set('password', e.target.value)}
                className="auth-input" required />
              <button type="button" className="eye-btn" onClick={() => setShowPwd(p => !p)}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="auth-options">
            <label className="remember-label">
              <input type="checkbox" defaultChecked /> Remember Me
            </label>
            <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Log In to HemoLink →'}
          </button>
        </form>

        <p className="auth-switch">
          New to HemoLink? <Link to={`/signup?role=donor${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`}>Create an Account</Link>
        </p>
      </div>
    </div>
  );
}
