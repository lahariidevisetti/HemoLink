// src/pages/auth/ForgotPassword.jsx — Interactive 2-step OTP password reset flow

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/ui/Badge';
import { KeyRound, Mail, Lock, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import './Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Step 1: 'EMAIL', Step 2: 'VERIFY_OTP'
  const [step, setStep] = useState('EMAIL');

  const [email, setEmail]               = useState('');
  const [code, setCode]                 = useState('');
  const [newPassword, setNewPassword]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]           = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  // Step 1: Send 6-digit verification code
  async function handleSendCode(e) {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await authApi.forgotPassword({ email });
      setStep('VERIFY_OTP');
      addToast({
        title: 'Verification Code Sent! 📧',
        message: `Check your inbox (${email}) for your 6-digit code.`,
        type: 'success',
      });
      // If resetCode is provided (for dev convenience), auto-fill or log
      if (data.resetCode) {
        console.log(`[DEV HELPER] Your 6-digit OTP code is: ${data.resetCode}`);
      }
    } catch (err) {
      setError(err.message);
      addToast({ title: 'Request Failed', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify 6-digit code & update password
  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
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

    setLoading(true);
    try {
      const data = await authApi.resetPassword({
        code: code.trim(),
        newPassword,
      });
      addToast({
        title: 'Password Updated! 🎉',
        message: 'Your password has been changed. Please log in.',
        type: 'success',
      });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
      addToast({ title: 'Verification Error', message: err.message, type: 'error' });
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
            {step === 'EMAIL' ? 'Security Verification' : 'Step 2: Enter 6-Digit Code'}
          </Badge>
        </div>

        {/* Logo */}
        <div className="auth-logo-wrap">
          <h1 className="auth-brand">🩸 HemoLink</h1>
        </div>

        <h2 className="auth-title">
          {step === 'EMAIL' ? 'Reset Your Password' : 'Enter Verification Code'}
        </h2>
        <p className="auth-subtitle">
          {step === 'EMAIL'
            ? "Enter your account email and we'll send a 6-digit security code."
            : `We sent a 6-digit code to ${email}. Enter it below.`}
        </p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        {/* ── STEP 1: Enter Email ── */}
        {step === 'EMAIL' && (
          <form onSubmit={handleSendCode} className="auth-form">
            <div className="form-group">
              <label>Registered Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="e.g. donor@test.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Sending Verification Code...' : 'Send 6-Digit Code 🩸'}
            </button>
          </form>
        )}

        {/* ── STEP 2: Enter 6-Digit Code & New Password ── */}
        {step === 'VERIFY_OTP' && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label style={{ textAlign: 'center', display: 'block', marginBottom: 8 }}>
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
                  fontSize: 28,
                  fontWeight: 900,
                  letterSpacing: 10,
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  color: '#b91c1c',
                  background: '#fef2f2',
                  borderColor: '#fca5a5',
                }}
                required
                autoFocus
              />
              <p style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', margin: '6px 0 0' }}>
                ⏱️ Code valid for 15 minutes
              </p>
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
              {loading ? 'Updating Password...' : 'Verify Code & Update Password →'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setStep('EMAIL')}
                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', padding: 0 }}
              >
                ← Change Email
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        <p className="auth-switch">
          Remembered your password? <Link to="/login">Back to Log In</Link>
        </p>
      </div>
    </div>
  );
}
