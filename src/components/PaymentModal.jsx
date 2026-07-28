import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function PaymentModal({ isOpen, onClose, invoice: propInvoice, app: propApp, appId: propAppId, onSuccess }) {
  const [invoice, setInvoice] = useState(propInvoice || null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = propAppId || propApp?._id || propApp?.id || propInvoice?.application_id;

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      if (!propInvoice && targetAppId) {
        setLoading(true);
        api.get(`/api/invoices/application/${targetAppId}`)
          .then(res => setInvoice(res.data || null))
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
      const formData = new FormData();
      if (file) formData.append('payment_proof', file);

      await api.put(`/api/invoices/${invoice._id || invoice.id}/pay`, formData, true);
      toast.success('Payment confirmed! Admin will verify it shortly.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit payment proof.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f0fdf4, #fff)', borderBottom: '2px solid #86efac' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>💰 Confirm Payment</div>
            {invoice && (
              <div style={{ fontSize: 12, color: '#15803d', marginTop: 4, fontWeight: 600 }}>
                Invoice #{invoice.invoice_number} (£{invoice.amount})
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              Loading invoice details...
            </div>
          ) : !invoice ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>
              No invoice details found for this application.
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Please confirm that you have made the payment of <strong>£{invoice.amount}</strong>. You can optionally upload a proof of payment receipt.
              </p>

              <div className="form-group">
                <label className="form-label">Proof of Payment Document (PDF/Image) <span>(Optional)</span></label>
                <div
                  onClick={() => document.getElementById('payment-proof-file-input-shared').click()}
                  style={{
                    border: '2px dashed #e2e8f0', padding: '28px 24px', borderRadius: '12px',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    background: file ? '#f0fdf4' : '#fff'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#16a34a'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <FileText size={36} style={{ color: file ? '#16a34a' : '#94a3b8', marginBottom: 10, margin: '0 auto' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginTop: 8 }}>
                    {file ? file.name : 'Click to upload receipt'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>PDF, PNG, JPG, or DOCX allowed</div>
                  <input
                    id="payment-proof-file-input-shared"
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={e => setFile(e.target.files[0])}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span>This will notify the HFA admin team to verify your payment.</span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', padding: '10px 24px' }}
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
