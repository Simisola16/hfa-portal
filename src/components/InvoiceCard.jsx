import React from 'react';
import { Receipt, Download, Lock, CheckCircle, Clock } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function InvoiceCard({ invoice, status, isInitial, isFinal, onPayClick }) {
  const normStatus = (status || '').toLowerCase().replace(/ /g, '_');
  const isAvailable = isFinal
    ? Boolean(invoice) || ['agreement_signed', 'agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued'].includes(normStatus)
    : Boolean(invoice) || ['proposal_approved', 'invoice_sent', 'payment_received', 'dates_proposed', 'dates_accepted', 'date_finalized', 'audit_assigned', 'nc_flagged', 'nc_closed', 'audit_report_submitted', 'on_hold', 'audit_successful', 'logsheet_created', 'logsheet_signed', 'application_successful', 'agreement_sent', 'agreement_signed', 'agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued'].includes(normStatus);

  const cardTitle = isFinal ? 'Final Halal Certificate Fee Invoice' : 'Initial Certification Invoice';

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

  const isPaid = invoice.status === 'paid' || 
    status === 'payment_received' || 
    status === 'final_invoice_paid' || 
    (!isFinal && ['dates_proposed', 'dates_accepted', 'date_finalized', 'audit_assigned', 'nc_flagged', 'nc_closed', 'audit_report_submitted', 'audit_successful', 'logsheet_created', 'logsheet_signed', 'application_successful', 'agreement_sent', 'agreement_signed', 'agreement_finalised', 'ready_for_certificate', 'certificate_issued'].includes(normStatus)) ||
    (isFinal && ['ready_for_certificate', 'certificate_issued'].includes(normStatus));

  const isAwaiting = invoice.status === 'client_paid' && !isPaid;

  return (
    <div style={{
      background: 'white',
      borderRadius: 20,
      border: isPaid ? '1.5px solid #86efac' : isAwaiting ? '1.5px solid #fed7aa' : '1px solid #e2e8f0',
      boxShadow: isPaid ? '0 4px 12px -2px rgba(22, 163, 74, 0.08)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '20px 24px',
        borderBottom: isPaid ? '1px solid #f0fdf4' : '1px solid #f1f5f9',
        background: isPaid ? 'linear-gradient(to right, #f0fdf4, #ffffff)' : '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: isPaid ? '#dcfce7' : isAwaiting ? '#fef3c7' : isFinal ? '#faf5ff' : '#fff7ed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isPaid ? (
              <CheckCircle size={18} style={{ color: '#16a34a' }} />
            ) : (
              <Receipt size={18} style={{ color: isAwaiting ? '#d97706' : isFinal ? '#7e22ce' : '#ea580c' }} />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: isPaid ? '#14532d' : isFinal ? '#581c87' : 'var(--text-primary)' }}>
              {cardTitle}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              No: {invoice.invoice_number} &middot; Status:{' '}
              <span style={{
                fontWeight: 800,
                color: isPaid ? '#15803d' : isAwaiting ? '#b45309' : '#b91c1c'
              }}>
                {isPaid ? 'Paid' : isAwaiting ? 'Paid (Awaiting Confirmation)' : 'Unpaid'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {invoice.invoice_url && (
            <a
              href={getPdfUrl(invoice.invoice_url)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
              style={{
                color: isPaid ? '#15803d' : isAwaiting ? '#b45309' : '#ea580c',
                borderColor: isPaid ? '#86efac' : isAwaiting ? '#fed7aa' : '#fed7aa',
                background: isPaid ? '#f0fdf4' : '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700
              }}
            >
              <Download size={13} /> View Invoice
            </a>
          )}

          {isPaid ? (
            <span
              style={{
                background: '#dcfce7',
                color: '#15803d',
                border: '1.5px solid #86efac',
                padding: '5px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <CheckCircle size={14} style={{ color: '#16a34a' }} /> Paid
            </span>
          ) : isAwaiting ? (
            <span
              style={{
                background: '#fef3c7',
                color: '#92400e',
                border: '1.5px solid #fde68a',
                padding: '5px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Clock size={14} style={{ color: '#d97706' }} /> Awaiting Confirmation
            </span>
          ) : (status === 'invoice_sent' || status === 'final_invoice_sent') ? (
            <button className="btn btn-primary btn-sm" style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 700 }} onClick={onPayClick}>
              Pay Now
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
              Title
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: isPaid ? '#1e293b' : 'inherit' }}>
              {invoice.title}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isPaid ? '#15803d' : 'var(--text-muted)',
              marginBottom: 4
            }}>
              {isPaid ? 'Amount Paid' : 'Amount Due'}
            </div>
            <div style={{
              fontWeight: 800,
              fontSize: 16,
              color: isPaid ? '#15803d' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              £{Number(invoice.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              {isPaid && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: 6
                }}>
                  Settled
                </span>
              )}
            </div>
          </div>
        </div>

        {invoice.payment_proof_url && (
          <div style={{
            marginBottom: 20,
            background: isPaid ? '#f0fdf4' : '#fffbeb',
            padding: 14,
            borderRadius: 10,
            border: isPaid ? '1.5px solid #86efac' : '1.5px dashed #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isPaid ? <CheckCircle size={18} style={{ color: '#16a34a' }} /> : <Clock size={18} style={{ color: '#b45309' }} />}
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: isPaid ? '#14532d' : '#92400e' }}>
                  {isPaid ? 'Payment Confirmed by HFA Finance' : 'Payment Receipt Uploaded'}
                </div>
                <div style={{ fontSize: 11, color: isPaid ? '#15803d' : '#b45309' }}>
                  {isPaid ? 'Your transaction has been verified and confirmed.' : 'Our finance team is currently verifying this transaction.'}
                </div>
              </div>
            </div>
            <a
              href={getPdfUrl(invoice.payment_proof_url)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
              style={{
                color: isPaid ? '#15803d' : '#92400e',
                borderColor: isPaid ? '#86efac' : '#fde68a',
                background: '#ffffff',
                fontWeight: 600
              }}
            >
              View Uploaded Copy
            </a>
          </div>
        )}

        {invoice.notes && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
              Payment Notes
            </div>
            <div style={{ background: '#fafafb', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.5 }}>
              {invoice.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
