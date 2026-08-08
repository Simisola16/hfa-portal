import React from 'react';
import { Receipt, Download, Lock, CheckCircle, Clock } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function InvoiceCard({ invoice, status, isInitial, isFinal, onPayClick }) {
  const normStatus = (status || '').toLowerCase().replace(/ /g, '_');
  const isAvailable = isFinal
    ? ['agreement_signed', 'agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued'].includes(normStatus) || invoice
    : ['proposal_approved', 'invoice_sent', 'payment_received', 'dates_proposed', 'dates_accepted', 'date_finalized', 'audit_assigned', 'nc_flagged', 'nc_closed', 'audit_report_submitted', 'on_hold', 'audit_successful', 'logsheet_created', 'logsheet_signed', 'application_successful', 'agreement_sent', 'agreement_signed', 'agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued'].includes(normStatus) || invoice;

  const cardTitle = isFinal ? 'Final Halal Certificate Fee Invoice' : 'Initial Certification Invoice';
  const cardSubtitle = isFinal ? 'Final Halal Certificate Fee' : 'Stage 1 Application & Audit Fee';

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>{cardTitle} (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          {isFinal ? 'Available once final agreement is signed' : 'Available once proposal is accepted'}
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center' }}>
        <Receipt size={28} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>{cardTitle} Pending</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          {isFinal ? 'Your final certificate fee invoice will be generated shortly.' : 'Your invoice will be generated shortly.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: isFinal ? '#faf5ff' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={18} style={{ color: isFinal ? '#7e22ce' : '#ea580c' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: isFinal ? '#581c87' : 'var(--text-primary)' }}>{cardTitle}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No: {invoice.invoice_number} &middot; Status: <span style={{
              fontWeight: 700,
              color: invoice.status === 'paid' ? '#15803d' : invoice.status === 'client_paid' ? '#b45309' : '#b91c1c'
            }}>{invoice.status === 'paid' ? 'Paid' : invoice.status === 'client_paid' ? 'Paid (Awaiting Confirmation)' : 'Unpaid'}</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {invoice.invoice_url && (
            <a href={getPdfUrl(invoice.invoice_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ color: '#ea580c', borderColor: '#fed7aa' }}>
              <Download size={13} /> View Invoice
            </a>
          )}
          {(invoice.status === 'paid' || status === 'payment_received' || status === 'final_invoice_paid') ? (
            <span
              style={{
                background: '#f0fdf4',
                color: '#15803d',
                border: '1.5px solid #bbf7d0',
                padding: '5px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <CheckCircle size={14} style={{ color: '#16a34a' }} /> Paid
            </span>
          ) : (status === 'invoice_sent' || status === 'final_invoice_sent') && invoice.status !== 'client_paid' ? (
            <button className="btn btn-primary btn-sm" style={{ background: '#ea580c' }} onClick={onPayClick}>
              Paid
            </button>
          ) : null}
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Title</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{invoice.title}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Amount Due</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)' }}>£{Number(invoice.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {invoice.payment_proof_url && (
          <div style={{ marginBottom: 20, background: '#f0fdf4', padding: 14, borderRadius: 10, border: '1.5px dashed #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {invoice.status === 'paid' ? <CheckCircle size={16} style={{ color: '#16a34a' }} /> : <Clock size={16} style={{ color: '#b45309' }} />}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>Payment Receipt Uploaded</div>
                <div style={{ fontSize: 11, color: '#15803d' }}>Our finance team is currently verifying this transaction.</div>
              </div>
            </div>
            <a href={getPdfUrl(invoice.payment_proof_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ color: '#166534', borderColor: '#bbf7d0' }}>
              View Uploaded Copy
            </a>
          </div>
        )}

        {invoice.notes && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Payment Notes</div>
            <div style={{ background: '#fafafb', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.5 }}>
              {invoice.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
