import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { CheckCircle, XCircle, Loader2, RefreshCw, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSent, setResendSent] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in this link.');
      return;
    }

    api.get(`/api/auth/verify/${token}`)
      .then(res => {
        setStatus('success');
        setMessage(res.message || 'Email verified successfully!');
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.error || err.message || 'Verification failed. The link may be expired or already used.');
      });
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail.trim()) return toast.error('Please enter your email address.');
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    try {
      const res = await api.post('/api/auth/resend-verification', { email: resendEmail.trim() });
      setResendSent(true);
      setResendCooldown(60);
      toast.success(res.message || 'New verification email sent!');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 20 }}>
      <div style={{ maxWidth: 460, width: '100%', background: 'white', borderRadius: 24, padding: '48px 40px', boxShadow: '0 10px 40px -8px rgba(0,0,0,0.12)', textAlign: 'center' }}>

        {/* Icon */}
        <div style={{ marginBottom: 24 }}>
          {status === 'verifying' && (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Loader2 size={36} style={{ color: '#15803d', animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          {status === 'success' && (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle size={40} style={{ color: '#15803d' }} />
            </div>
          )}
          {status === 'error' && (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <XCircle size={40} style={{ color: '#ef4444' }} />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
          {status === 'verifying' && 'Verifying your email…'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </h2>

        {/* Message */}
        <p style={{ color: '#4b5563', lineHeight: 1.65, marginBottom: 28, fontSize: 14 }}>
          {message || 'Please wait while we process your verification link.'}
        </p>

        {/* Success CTA */}
        {status === 'success' && (
          <Link
            to="/login"
            className="btn btn-primary"
            style={{ display: 'block', padding: '13px 20px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15, background: '#15803d', color: 'white' }}
          >
            Continue to Login →
          </Link>
        )}

        {/* Error state: request a new link */}
        {status === 'error' && (
          <div>
            {resendSent ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left' }}>
                <Mail size={18} style={{ color: '#15803d', flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: '#166534', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  New verification email sent! Check your inbox (and spam folder). The link expires in 24 hours.
                  {resendCooldown > 0 && <><br /><span style={{ color: '#94a3b8', fontSize: 12 }}>You can request another in {resendCooldown}s.</span></>}
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10, textAlign: 'left' }}>
                  Enter your email to receive a new verification link:
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleResend()}
                    placeholder="your@email.com"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                  />
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 16px', borderRadius: 8,
                      background: resendCooldown > 0 ? '#f1f5f9' : '#15803d',
                      color: resendCooldown > 0 ? '#94a3b8' : 'white',
                      border: 'none', fontWeight: 700, fontSize: 13,
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {resendLoading
                      ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                      : <RefreshCw size={14} />
                    }
                    {resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Send'}
                  </button>
                </div>
              </div>
            )}

            <Link
              to="/login"
              style={{ display: 'block', marginTop: 8, padding: '12px 20px', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: 14, color: '#64748b', border: '1.5px solid #e2e8f0', transition: 'all 0.2s' }}
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
