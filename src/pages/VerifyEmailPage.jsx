import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    api.get(`/api/auth/verify/${token}`)
      .then(res => {
        setStatus('success');
        setMessage(res.message || 'Email verified successfully!');
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may be expired.');
      });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 20 }}>
      <div style={{ maxWidth: 450, width: '100%', background: 'white', borderRadius: 24, padding: 48, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          {status === 'verifying' && <Loader2 className="animate-spin" size={64} style={{ margin: '0 auto', color: 'var(--primary)' }} />}
          {status === 'success' && <CheckCircle size={64} style={{ margin: '0 auto', color: '#15803d' }} />}
          {status === 'error' && <XCircle size={64} style={{ margin: '0 auto', color: '#ef4444' }} />}
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 16 }}>
          {status === 'verifying' && 'Verifying your email...'}
          {status === 'success' && 'Verification Complete!'}
          {status === 'error' && 'Verification Failed'}
        </h2>

        <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 32 }}>
          {message || 'Please wait while we process your verification link.'}
        </p>

        {(status === 'success' || status === 'error') && (
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block', width: '100%', padding: '14px 20px', borderRadius: 12, textDecoration: 'none' }}>
            Back to Login
          </Link>
        )}
      </div>
    </div>
  );
}
