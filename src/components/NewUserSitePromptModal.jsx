import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Building2, ArrowRight, ShieldCheck, Check, X,
  Sparkles, Layers, Shield, FileCheck
} from 'lucide-react';

export default function NewUserSitePromptModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToAddSite = () => {
    onClose();
    navigate('/add-site');
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
          maxWidth: 820,
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

          {/* Icon with Ambient Glow */}
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
              <Building2 size={46} color="#ffffff" strokeWidth={2.3} />
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
            <Sparkles size={14} /> Welcome to HFA Certification Portal
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
            First Step: Register Your Manufacturing Site
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
            To begin your Halal certification process, please add your primary manufacturing facility details. This enables you to attach product lines and submit certification applications.
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '36px 44px 30px', background: '#fafbfc' }}>

          {/* Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 18,
                padding: '22px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <MapPin size={22} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                  1. Facility Details
                </div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                  Enter your establishment address, local authority registration, and operating contacts.
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 18,
                padding: '22px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <FileCheck size={22} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                  2. Apply for Certification
                </div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
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
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#0f766e',
              fontSize: 13.5,
              fontWeight: 500
            }}
          >
            <ShieldCheck size={20} style={{ color: '#0d9488', flexShrink: 0 }} />
            <span>
              Takes less than 2 minutes to complete. All information is securely stored under your verified company profile.
            </span>
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
            onClick={onClose}
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
            onClick={handleGoToAddSite}
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
            <Building2 size={20} />
            <span>Create Manufacturing Site</span>
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
