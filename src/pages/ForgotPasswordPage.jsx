import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset email sent!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 48, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Reset your password</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Enter your email and we'll send a reset link</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <Mail size={48} style={{ color: 'var(--primary)', marginBottom: 16 }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
            </p>
            <Link to="/login" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-control" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Send Reset Link'}
            </button>
            <Link to="/login" className="btn btn-ghost w-full" style={{ justifyContent: 'center', marginTop: 12 }}>
              <ArrowLeft size={15} /> Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
