import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, FileText, ArrowRight, ShieldCheck, Check, X,
  Sparkles, Building2, ChevronRight, Award, Calendar, Layers
} from 'lucide-react';

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
        zIndex: 1400,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          maxWidth: 720,
          width: '100%',
          padding: 0,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Hero Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f4848 0%, #1B7A7A 55%, #0d9488 100%)',
            padding: '36px 36px 30px',
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.12)'
          }}
        >
          {/* Close X */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={18} />
          </button>

          {/* Celebratory Icon with Glow */}
          <div style={{ position: 'relative', width: 76, height: 76, margin: '0 auto 16px' }}>
            <div
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                filter: 'blur(8px)',
                animation: 'pulse 2s infinite'
              }}
            />
            <div
              style={{
                position: 'relative',
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '3px solid rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
              }}
            >
              <CheckCircle2 size={42} color="#ffffff" strokeWidth={2.4} />
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(4px)',
              color: '#dcfce7',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '5px 14px',
              borderRadius: 30,
              marginBottom: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            <Sparkles size={13} /> Facility Registered Successfully
          </span>

          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              margin: '6px 0 0',
              lineHeight: 1.25,
              color: '#ffffff',
              letterSpacing: '-0.02em'
            }}
          >
            Next Step: Create Your Certification Application
          </h2>

          <p
            style={{
              fontSize: 15,
              color: 'rgba(240, 253, 250, 0.9)',
              margin: '8px auto 0',
              maxWidth: 540,
              lineHeight: 1.5,
              fontWeight: 400
            }}
          >
            Your manufacturing site has been saved to your account. To proceed with Halal certification, submit your formal application below.
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '30px 36px 24px', background: '#fafbfc' }}>

          {/* Registered Site Confirmation Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #dcfce7',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              boxShadow: '0 4px 12px rgba(22, 101, 52, 0.05)',
              marginBottom: 24
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a',
                  flexShrink: 0
                }}
              >
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
                  Registered Site Facility
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {siteName || 'Primary Manufacturing Site'}
                </div>
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#dcfce7',
                color: '#15803d',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 8,
                whiteSpace: 'nowrap'
              }}
            >
              <Check size={14} strokeWidth={3} /> Ready for Application
            </span>
          </div>

          {/* 3-Step Process Guide */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: 12 }}>
              How the Certification Process Works:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {/* Step 1: Completed */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>
                    STEP 1
                  </span>
                  <CheckCircle2 size={16} color="#16a34a" />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  Register Facility
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                  Facility address, contacts and company registration saved.
                </div>
              </div>

              {/* Step 2: Active Next Step */}
              <div
                style={{
                  background: '#f0fdfa',
                  border: '2px solid #1B7A7A',
                  borderRadius: 14,
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  boxShadow: '0 6px 16px rgba(27, 122, 122, 0.12)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#ffffff', background: '#1B7A7A', padding: '2px 8px', borderRadius: 6 }}>
                    STEP 2 &middot; NEXT
                  </span>
                  <FileText size={16} color="#1B7A7A" />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                  Create Application
                </div>
                <div style={{ fontSize: 12, color: '#0f766e', lineHeight: 1.45, fontWeight: 500 }}>
                  Select standard (Food, Meat, UAE/GSO) and attach products.
                </div>
              </div>

              {/* Step 3: Upcoming */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                    STEP 3
                  </span>
                  <Award size={16} color="#94a3b8" />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#475569' }}>
                  Audit &amp; Certificate
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.45 }}>
                  Accept proposal, schedule audit date, and receive certificate.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            padding: '20px 36px 28px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleGoToDashboard}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#64748b',
              padding: '12px 20px',
              borderRadius: 10
            }}
          >
            Continue to Dashboard
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGoToApplication}
            style={{
              background: 'linear-gradient(135deg, #1B7A7A 0%, #155e5e 100%)',
              borderColor: '#1B7A7A',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 800,
              padding: '14px 28px',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 6px 18px rgba(27, 122, 122, 0.35)',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(27, 122, 122, 0.45)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(27, 122, 122, 0.35)';
            }}
          >
            <FileText size={18} />
            <span>Create Halal Application</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
