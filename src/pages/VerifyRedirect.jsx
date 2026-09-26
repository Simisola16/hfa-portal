import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';

export default function VerifyRedirect() {
  const { certNumber, '*': wildcard } = useParams();
  const targetCert = certNumber || wildcard || '';

  useEffect(() => {
    if (targetCert) {
      window.location.replace(`${API_URL}/api/certificates/public/${encodeURIComponent(targetCert)}`);
    } else {
      window.location.replace('/');
    }
  }, [targetCert]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      backgroundColor: '#f8fafc',
      color: '#0f172a'
    }}>
      <div style={{
        background: '#ffffff',
        padding: '32px 40px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        textAlign: 'center',
        border: '1px solid #e2e8f0',
        maxWidth: '420px',
        width: '90%'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#15803d',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
          Opening Halal Certificate…
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Redirecting to the authentic certificate document.
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
