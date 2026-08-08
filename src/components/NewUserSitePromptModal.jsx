import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Building2, ArrowRight, ShieldCheck, Check, X,
  Sparkles, FileCheck, LayoutDashboard
} from 'lucide-react';

export default function NewUserSitePromptModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToAddSite = () => {
    onClose();
    navigate('/add-site');
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

          {/* Icon with Ambient Glow */}
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
              <Building2 size={30} color="#ffffff" strokeWidth={2.3} />
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
            <Sparkles size={12} /> Welcome to HFA Certification Portal
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
            First Step: Register Your Manufacturing Site
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
            To begin your Halal certification process, please add your primary manufacturing facility details. This enables you to attach product lines and submit certification applications.
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 28px', background: '#fafbfc', overflowY: 'auto', flex: 1 }}>

          {/* Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 14,
                padding: '16px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                  1. Facility Details
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                  Enter your establishment address, local authority registration, and operating contacts.
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 14,
                padding: '16px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <FileCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                  2. Apply for Certification
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                  Instantly choose your certification standard (Meat, Food &amp; Processing, UAE/GSO) and submit products.
                </div>
              </div>
            </div>
          </div>

          {/* Helpful Guidance Notice */}
          <div
            style={{
              background: '#f0fdfa',
              border: '1.5px solid #99f6e4',
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#0f766e',
              fontSize: 12.5,
              fontWeight: 500
            }}
          >
            <ShieldCheck size={18} style={{ color: '#0d9488', flexShrink: 0 }} />
            <span>
              Takes less than 2 minutes to complete. All information is securely stored under your verified company profile.
            </span>
          </div>

        </div>

        {/* Modal Actions Footer */}
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
            onClick={handleGoToAddSite}
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
            <Building2 size={18} />
            <span>Create Manufacturing Site</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

