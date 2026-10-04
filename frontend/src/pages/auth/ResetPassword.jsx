// src/pages/auth/ResetPassword.jsx — Code-based & link-based password reset

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/ui/Badge';
import './Auth.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const codeFromUrl = searchParams.get('code') || searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';

  const [code, setCode]                       = useState(codeFromUrl);
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]                 = useState(false);
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await authApi.resetPassword({
        code: code.trim(),
        newPassword,
      });
      addToast({
        title: 'Password Updated! 🎉',
        message: data.message || 'You can now log in with your new password.',
        type: 'success',
      });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
      addToast({ title: 'Reset Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page auth-page--right">
      <div className="auth-card">
        {/* Status Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Badge variant="glow" pulse pulseColor="red">
            Security Authorization
          </Badge>
        </div>

        <div className="auth-logo-wrap">
          <img src="/helpblood.png" alt="HemoLink" className="auth-logo" onError={e => { e.target.style.display='none'; }} />
          <h1 className="auth-brand"> HemoLink</h1>
        </div>

        <h2 className="auth-title">Set New Password</h2>
        <p className="auth-subtitle">
          {emailFromUrl ? `Account: ${emailFromUrl}` : 'Enter your 6-digit code and choose a new password.'}
        </p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label style={{ textAlign: 'center', display: 'block', marginBottom: 6 }}>
              6-Digit Security Code
            </label>
            <input
              type="text"
              maxLength={6}
              className="auth-input"
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 10,
                textAlign: 'center',
                fontFamily: 'monospace',
                color: '#b91c1c',
                background: '#fef2f2',
                borderColor: '#fca5a5',
              }}
              required
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <div className="password-wrapper">
              <input
                type={showPwd ? 'text' : 'password'}
                className="auth-input"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <button type="button" className="eye-btn" onClick={() => setShowPwd(p => !p)}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              className="auth-input"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Updating Password...' : 'Save New Password & Log In →'}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login">← Back to Log In</Link>
        </p>
      </div>
    </div>
  );
}
