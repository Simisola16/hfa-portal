import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, FileText, ArrowRight, ShieldCheck, Check, X,
  Sparkles, Building2, ChevronRight, Award, Zap, Clock
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
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          maxWidth: 840,
          width: '100%',
          padding: 0,
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 35px 80px -20px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.15)',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Hero Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #093b3b 0%, #1B7A7A 50%, #0d9488 100%)',
            padding: '44px 44px 38px',
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.15)'
          }}
        >
          {/* Close X */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 22,
              right: 22,
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={20} />
          </button>

          {/* Celebratory Icon with Ambient Glow */}
          <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 20px' }}>
            <div
              style={{
                position: 'absolute',
                inset: -8,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.3)',
                filter: 'blur(12px)',
                animation: 'pulse 2s infinite'
              }}
            />
            <div
              style={{
                position: 'relative',
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.22)',
                border: '3.5px solid rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)'
              }}
            >
              <CheckCircle2 size={50} color="#ffffff" strokeWidth={2.5} />
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(6px)',
              color: '#dcfce7',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '6px 18px',
              borderRadius: 30,
              marginBottom: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}
          >
            <Sparkles size={14} /> Manufacturing Site Registered
          </span>

          <h2
            style={{
              fontSize: 30,
              fontWeight: 800,
              margin: '8px 0 0',
              lineHeight: 1.25,
              color: '#ffffff',
              letterSpacing: '-0.025em'
            }}
          >
            Next Step: Create Your Certification Application
          </h2>

          <p
            style={{
              fontSize: 16,
              color: 'rgba(240, 253, 250, 0.95)',
              margin: '12px auto 0',
              maxWidth: 620,
              lineHeight: 1.55,
              fontWeight: 400
            }}
          >
            Your manufacturing facility has been registered and verified on your portal account. Submit your formal Halal Certification Application to begin technical assessment and audit scheduling.
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '36px 44px 30px', background: '#fafbfc' }}>

          {/* Registered Facility Overview Banner */}
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #bbf7d0',
              borderRadius: 18,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              boxShadow: '0 4px 16px rgba(22, 101, 52, 0.06)',
              marginBottom: 24
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a',
                  flexShrink: 0
                }}
              >
                <Building2 size={26} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.06em' }}>
                  Registered Facility
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {siteName || 'Primary Manufacturing Site'}
                </div>
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#dcfce7',
                color: '#15803d',
                fontSize: 13,
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: 10,
                whiteSpace: 'nowrap'
              }}
            >
              <Check size={16} strokeWidth={3} /> Ready for Application
            </span>
          </div>

          {/* Value Highlights Cards (No Steps, Just Clear Features) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 }}>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '22px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <FileText size={22} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                  Attach Products &amp; Scope
                </div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                  Select your certification category (Meat, Food &amp; General Processing, or UAE/GSO) and list your product lines.
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '22px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: '#f0fdfa',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Zap size={22} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                  Fast-Track Assessment
                </div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                  Your submission is instantly queued for Halal technical assessment, proposal generation, and audit scheduling.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            padding: '24px 44px 32px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleGoToDashboard}
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#64748b',
              padding: '14px 24px',
              borderRadius: 12
            }}
          >
            Explore Dashboard First
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGoToApplication}
            style={{
              background: 'linear-gradient(135deg, #1B7A7A 0%, #115e5e 100%)',
              borderColor: '#1B7A7A',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 800,
              padding: '16px 36px',
              borderRadius: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 8px 24px rgba(27, 122, 122, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(27, 122, 122, 0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(27, 122, 122, 0.4)';
            }}
          >
            <FileText size={20} />
            <span>Create Halal Application</span>
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
