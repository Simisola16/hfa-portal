import { getPdfUrl } from '../lib/pdfUtils';
import React from 'react';
import { FileCheck, Download, Lock } from 'lucide-react';


export default function AgreementCard({ agreement, status, onSignClick }) {
  const isAvailable = ['application_successful', 'logsheet_signed', 'agreement_sent', 'agreement_signed', 'agreement_finalised', 'ready_for_certificate', 'certificate_issued'].includes(status) || agreement;

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Certification Agreement (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once application is successful</div>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center' }}>
        <FileCheck size={28} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>Agreement Pending</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Your agreement will be generated and uploaded soon.</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileCheck size={18} style={{ color: '#10b981' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Certification Agreement</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Status: <span style={{ fontWeight: 700, color: '#15803d' }}>
                Agreement Received
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {agreement.agreement_url && (
            <a href={getPdfUrl(agreement.agreement_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              <Download size={13} /> View &amp; Download Agreement PDF
            </a>
          )}
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: agreement.details ? 20 : 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Title</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{agreement.title}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Date Received</div>
            <div style={{ fontSize: 14 }}>{new Date(agreement.createdAt || agreement.created_at).toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        {agreement.details && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Agreement Details</div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {agreement.details}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
