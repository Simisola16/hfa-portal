import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, FileText, ArrowRight, ShieldCheck, Check, X,
  Sparkles, Building2, Zap, LayoutDashboard
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

  // Clean site name fallback if missing or literally "name"
  const cleanSiteName = siteName && siteName.trim().toLowerCase() !== 'name' && siteName.trim().toLowerCase() !== 'undefined'
    ? siteName.trim()
    : 'Primary Manufacturing Facility';

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 1400,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(10px)',
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
          maxWidth: 720,
          width: '100%',
          maxHeight: 'min(92vh, 680px)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15)',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Hero Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #093b3b 0%, #1B7A7A 55%, #0d9488 100%)',
            padding: '24px 30px 20px',
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            flexShrink: 0,
            boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.12)'
          }}
        >
          {/* Close X */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={18} />
          </button>

          {/* Celebratory Icon with Soft Ambient Glow */}
          <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 12px' }}>
            <div
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.3)',
                filter: 'blur(8px)'
              }}
            />
            <div
              style={{
                position: 'relative',
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                border: '2.5px solid rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)'
              }}
            >
              <CheckCircle2 size={32} color="#ffffff" strokeWidth={2.5} />
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(6px)',
              color: '#dcfce7',
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '4px 14px',
              borderRadius: 20,
              marginBottom: 8
            }}
          >
            <Sparkles size={12} /> Manufacturing Site Registered
          </span>

          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: '4px 0 0',
              lineHeight: 1.25,
              color: '#ffffff',
              letterSpacing: '-0.02em'
            }}
          >
            Next Step: Create Your Certification Application
          </h2>

          <p
            style={{
              fontSize: 13.5,
              color: 'rgba(240, 253, 250, 0.95)',
              margin: '8px auto 0',
              maxWidth: 580,
              lineHeight: 1.45,
              fontWeight: 400
            }}
          >
            Your manufacturing facility has been registered and verified on your portal account. Submit your formal Halal Certification Application to begin technical assessment and audit scheduling.
          </p>
        </div>

        {/* Modal Body (Scrollable if needed) */}
        <div style={{ padding: '20px 28px', background: '#fafbfc', overflowY: 'auto', flex: 1 }}>

          {/* Registered Facility Overview Banner */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #bbf7d0',
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              boxShadow: '0 2px 8px rgba(22, 101, 52, 0.04)',
              marginBottom: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
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
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
                  Registered Facility
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
                  {cleanSiteName}
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
                fontWeight: 800,
                padding: '5px 12px',
                borderRadius: 8,
                whiteSpace: 'nowrap'
              }}
            >
              <Check size={14} strokeWidth={3} /> Ready for Application
            </span>
          </div>

          {/* Value Highlights Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <FileText size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                  Attach Products &amp; Scope
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                  Select your certification category (Meat, Food &amp; General Processing, or UAE/GSO) and list product lines.
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: '#f0fdfa',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Zap size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                  Fast-Track Assessment
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                  Your submission is instantly queued for technical review, proposal issuance, and audit scheduling.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer - Always Pinned & Perfectly Visible */}
        <div
          style={{
            padding: '16px 28px 20px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexShrink: 0
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleGoToDashboard}
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: '#64748b',
              padding: '10px 18px',
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGoToApplication}
            style={{
              background: 'linear-gradient(135deg, #1B7A7A 0%, #115e5e 100%)',
              borderColor: '#1B7A7A',
              color: '#ffffff',
              fontSize: 14.5,
              fontWeight: 800,
              padding: '12px 28px',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 4px 16px rgba(27, 122, 122, 0.35)',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(27, 122, 122, 0.45)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(27, 122, 122, 0.35)';
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

