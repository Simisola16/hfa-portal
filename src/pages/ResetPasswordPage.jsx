import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 48, textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Invalid Link</h2>
          <p>The password reset link is missing or invalid.</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ marginTop: 24 }}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 48, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Set new password</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Please enter your new password below</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: '#10b981', marginBottom: 16 }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Your password has been reset successfully! Redirecting you to login...
            </p>
            <button onClick={() => navigate('/login')} className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>Login Now</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ justifyContent: 'center', marginTop: 12 }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
