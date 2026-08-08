import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, ArrowRight, ShieldCheck, Check, X, Sparkles } from 'lucide-react';

export default function FirstSiteCreatedModal({ isOpen, onClose, siteName }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToApplication = () => {
    onClose();
    navigate('/applications?action=new');
  };

  const handleGoToDashboard = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 1300,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          maxWidth: 520,
          width: '100%',
          padding: 0,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top celebratory banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1B7A7A 0%, #155e5e 100%)',
            padding: '28px 24px 24px',
            color: 'white',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <X size={16} />
          </button>

          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
            }}
          >
            <CheckCircle size={36} color="#ffffff" strokeWidth={2.4} />
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#dcfce7',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: 20,
              marginBottom: 8
            }}
          >
            <Sparkles size={12} /> Site Registered Successfully
          </span>

          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 0', lineHeight: 1.25, color: '#ffffff' }}>
            Next Step: Create Your Application
          </h2>
        </div>

        {/* Modal body content */}
        <div style={{ padding: '24px 28px' }}>
          {siteName && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: '#166534',
                fontWeight: 600,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <ShieldCheck size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span>
                Site <strong>{siteName}</strong> is ready for certification.
              </span>
            </div>
          )}

          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.55, margin: 0 }}>
            Your manufacturing site has been saved to your account. The next step is to submit your <strong>Halal Certification Application</strong> so our team can review your scope, prepare your proposal, and schedule your audit.
          </p>

          <div
            style={{
              marginTop: 18,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
              What happens next:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', flexShrink: 0 }}>
                <Check size={12} strokeWidth={3} />
              </div>
              <span>Select your certification category (Meat, Food Processing, or UAE/GSO)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', flexShrink: 0 }}>
                <Check size={12} strokeWidth={3} />
              </div>
              <span>Add products &amp; review your establishment details</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', flexShrink: 0 }}>
                <Check size={12} strokeWidth={3} />
              </div>
              <span>Receive official HFA proposal &amp; audit dates</span>
            </div>
          </div>
        </div>

        {/* Modal actions */}
        <div
          style={{
            padding: '16px 28px 24px',
            background: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleGoToDashboard}
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: '#64748b',
              padding: '10px 16px'
            }}
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGoToApplication}
            style={{
              background: '#1B7A7A',
              borderColor: '#1B7A7A',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              padding: '11px 22px',
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(27, 122, 122, 0.25)',
              cursor: 'pointer'
            }}
          >
            <FileText size={16} />
            <span>Create Application</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
