import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, Download, Receipt, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function PaymentModal({ isOpen, onClose, invoice: propInvoice, app: propApp, appId: propAppId, onSuccess }) {
  const [invoice, setInvoice] = useState(propInvoice || null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propInvoice?.application_id);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      if (!propInvoice && targetAppId) {
        setLoading(true);
        Promise.all([
          api.get(`/api/invoices/application/${targetAppId}/all`).catch(() => ({ data: [] })),
          api.get(`/api/invoices/application/${targetAppId}`).catch(() => ({ data: null }))
        ])
          .then(([allRes, singleRes]) => {
            const all = allRes.data?.data || allRes.data || [];
            const single = singleRes.data?.data || singleRes.data || null;
            const unpaid = all.find(i => i.status !== 'paid' && i.status !== 'client_paid') || all.find(i => i.status !== 'paid') || single || all[0] || null;
            setInvoice(unpaid);
          })
          .catch(() => setInvoice(null))
          .finally(() => setLoading(false));
      } else if (!propInvoice && !targetAppId) {
        setLoading(true);
        api.get('/api/invoices')
          .then(res => {
            const list = res.data?.data || res.data || [];
            const active = list.find(inv => inv.status !== 'paid') || list[0] || null;
            setInvoice(active);
          })
          .catch(() => setInvoice(null))
          .finally(() => setLoading(false));
      } else {
        setInvoice(propInvoice || null);
      }
    }
  }, [isOpen, propInvoice, targetAppId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!invoice) return;
    setSubmitting(true);
    try {
      const invId = getCleanId(invoice._id || invoice.id || invoice);
      const formData = new FormData();
      if (file) formData.append('payment_proof', file);

      await api.put(`/api/invoices/${invId}/pay`, formData, true);
      toast.success('Payment confirmed! Admin will verify it shortly.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit payment proof.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFinal = invoice?.invoice_type === 'final';

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540, padding: 0 }} onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffffff)', borderBottom: '2px solid #fed7aa', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Receipt size={20} style={{ color: '#ea580c' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#9a3412' }}>
                {isFinal ? 'Final Certification Invoice' : 'Initial Application Fee Invoice'}
              </div>
              {invoice && (
                <div style={{ fontSize: 12, color: '#c2410c', marginTop: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Invoice #{invoice.invoice_number}</span>
                  {invoice.version > 1 && (
                    <span style={{ fontSize: 10, background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                      Revised (v{invoice.version})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
              <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>Loading invoice details...</div>
            </div>
          ) : !invoice ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>No invoice details found for this application.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* ── INVOICE DISPLAY CARD ── */}
              <div 
                style={{ 
                  background: '#fff7ed', 
                  borderRadius: 14, 
                  border: '1.5px solid #fed7aa', 
                  padding: '20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 16 
                }}
              >
                {/* Invoice Title & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#ea580c', letterSpacing: '0.05em', marginBottom: 2 }}>
                      {isFinal ? 'Final Invoice' : 'Initial Invoice'}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                      {invoice.title || (isFinal ? 'Final Halal Certification Fee' : 'Initial Application Processing Fee')}
                    </div>
                  </div>

                  <span 
                    style={{
                      fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 12, textTransform: 'uppercase',
                      background: invoice.status === 'paid' ? '#dcfce7' : invoice.status === 'client_paid' ? '#fef3c7' : '#fee2e2',
                      color: invoice.status === 'paid' ? '#15803d' : invoice.status === 'client_paid' ? '#b45309' : '#dc2626',
                      border: `1px solid ${invoice.status === 'paid' ? '#bbf7d0' : invoice.status === 'client_paid' ? '#fde68a' : '#fecaca'}`
                    }}
                  >
                    {invoice.status === 'paid' ? 'Paid' : invoice.status === 'client_paid' ? 'Pending Verification' : 'Unpaid'}
                  </span>
                </div>

                {/* Amount & Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#ffffff', padding: '14px 16px', borderRadius: 10, border: '1px solid #ffedd5' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>Amount Due</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#ea580c' }}>
                      £{Number(invoice.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>Due Date</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Calendar size={13} style={{ color: '#ea580c' }} />
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB') : 'Upon Receipt'}
                    </div>
                  </div>
                </div>

                {/* Description or Admin Notes */}
                {(invoice.description || invoice.notes) && (
                  <div style={{ fontSize: 12, color: '#475569', background: '#ffffff', padding: '12px 14px', borderRadius: 8, border: '1px solid #fed7aa', lineHeight: 1.5 }}>
                    <strong>Admin Notes:</strong> {invoice.description || invoice.notes}
                  </div>
                )}

                {/* ── PROMINENT INVOICE DOCUMENT VIEW / DOWNLOAD BUTTON ── */}
                {invoice.invoice_url ? (
                  <a
                    href={getPdfUrl(invoice.invoice_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: 8,
                      background: '#ffffff',
                      border: '2px solid #ea580c',
                      color: '#ea580c',
                      padding: '12px 16px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 13,
                      textDecoration: 'none',
                      boxShadow: '0 2px 4px rgba(234,88,12,0.08)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Download size={16} /> View &amp; Download Official Invoice PDF
                  </a>
                ) : (
                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingTop: 4 }}>
                    Invoice Reference: #{invoice.invoice_number}
                  </div>
                )}
              </div>

              {/* ── PAYMENT CONFIRMATION SECTION ── */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                  Confirm Payment &amp; Upload Receipt
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
                  Please confirm that you have transferred <strong>£{Number(invoice.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong> for invoice #{invoice.invoice_number}. You can attach your proof of payment receipt below.
                </p>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>
                    Proof of Payment Document (PDF/Image) <span>(Optional)</span>
                  </label>
                  <div
                    onClick={() => document.getElementById('payment-proof-file-input-shared').click()}
                    style={{
                      border: '2px dashed #cbd5e1', padding: '20px', borderRadius: '12px',
                      textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                      background: file ? '#f0fdf4' : '#f8fafc',
                      borderColor: file ? '#16a34a' : '#cbd5e1'
                    }}
                  >
                    <FileText size={28} style={{ color: file ? '#16a34a' : '#94a3b8', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                      {file ? file.name : 'Click to select payment receipt / transfer proof'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>PDF, PNG, JPG, or DOCX allowed</div>
                    <input
                      id="payment-proof-file-input-shared"
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={e => setFile(e.target.files[0])}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#166534', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <CheckCircle size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span>Notifies HFA Admin to verify payment.</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', padding: '9px 22px', fontWeight: 700 }}
              disabled={submitting || !invoice || loading}
              onClick={handleSubmit}
            >
              {submitting ? 'Confirming...' : 'Confirm Payment'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
