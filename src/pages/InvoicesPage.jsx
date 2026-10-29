import { getPdfUrl } from '../lib/pdfUtils';
import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { FileBarChart, Eye, Download, CreditCard, Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = () => {
    setLoading(true);
    api.get('/api/invoices')
      .then(d => {
        const list = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
        setInvoices(list);
      })
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Receipt size={26} style={{ color: 'var(--primary)' }} />
          Invoices & Payments
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          View and download your official HFA invoices, and submit payment confirmation receipts.
        </p>
      </div>

      {/* ALL INVOICES CARD */}
      <div className="card" style={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="card-title" style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            All Invoices ({invoices.length})
          </div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : invoices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FileBarChart /></div>
              <div className="empty-state-title">No Invoices</div>
              <div className="empty-state-text">Invoices from HFA will appear here</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const isPaid = inv.status === 'paid';
                  const isClientPaid = inv.status === 'client_paid';
                  return (
                    <tr key={inv._id || inv.id}>
                      <td style={{ fontWeight: 700 }}>{inv.invoice_number}</td>
                      <td>{inv.description || inv.title || 'Certification Invoice'}</td>
                      <td style={{ fontWeight: 600 }}>£{parseFloat(inv.amount || 0).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${isPaid ? 'badge-green' : isClientPaid ? 'badge-orange' : inv.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`} style={{ textTransform: 'capitalize' }}>
                          {isPaid && <CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                          {isClientPaid ? 'Paid (Awaiting Confirmation)' : isPaid ? 'Paid' : inv.status === 'unpaid' ? 'Unpaid' : inv.status === 'overdue' ? 'Overdue' : (inv.status ? inv.status.charAt(0).toUpperCase() + inv.status.slice(1) : 'Unpaid')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {inv.invoice_url ? (
                            <>
                              <a
                                href={getPdfUrl(inv.invoice_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#16a34a', padding: '4px 8px', gap: 4 }}
                                title="View Invoice"
                              >
                                <Eye size={14} /> View
                              </a>
                              <a
                                href={getPdfUrl(inv.invoice_url)}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ padding: '4px 8px', gap: 4 }}
                                title="Download Invoice"
                              >
                                <Download size={14} /> Download
                              </a>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>No PDF</span>
                          )}
                          {!isPaid && !isClientPaid && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 10px', fontSize: 12, gap: 4 }}
                              onClick={() => setSelectedInvoice(inv)}
                            >
                              <CreditCard size={13} /> Respond & Pay
                            </button>
                          )}
                          {isClientPaid && (
                            <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>Proof Submitted</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {selectedInvoice && (
          <PaymentModal
            isOpen={true}
            onClose={() => setSelectedInvoice(null)}
            invoice={selectedInvoice}
            onSuccess={() => {
              fetchInvoices();
              setSelectedInvoice(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
