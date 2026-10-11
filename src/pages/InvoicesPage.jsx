import { getPdfUrl } from '../lib/pdfUtils';
import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { FileBarChart, Eye, Download, CreditCard, Receipt, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
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

  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'confirmed');
  const totalUnpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);

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

      {/* DEDICATED UNPAID INVOICES SECTION */}
      {unpaidInvoices.length > 0 && (
        <div className="card" style={{ marginBottom: 28, borderRadius: 16, border: '1.5px solid #fed7aa', boxShadow: '0 4px 12px -2px rgba(234, 88, 12, 0.08)', overflow: 'hidden' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #fff7ed, #fffbeb)', padding: '18px 24px', borderBottom: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#9a3412', display: 'flex', alignItems: 'center', gap: 10 }}>
                  Outstanding Invoices Awaiting Payment ({unpaidInvoices.length})
                  <span style={{ fontSize: 12, background: '#ea580c', color: '#fff', padding: '2px 10px', borderRadius: 12, fontWeight: 700 }}>
                    £{totalUnpaidAmount.toFixed(2)} Due
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#c2410c', marginTop: 2 }}>
                  Please review and submit payment confirmation receipts below.
                </div>
              </div>
            </div>
          </div>

          {/* Reassurance Banner for Existing Clients */}
          <div style={{ padding: '12px 24px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#166534' }}>
            <span style={{ fontSize: 15 }}>ℹ️</span>
            <div>
              <strong>Existing HFA Client Notice:</strong> For Renewal and Surveillance applications, your certification processing and evaluation continue without interruption while payment is processed.
            </div>
          </div>

          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Invoice No.</th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Amount Due</th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {unpaidInvoices.map(inv => {
                  const isAwaiting = inv.status === 'client_paid';
                  return (
                    <tr key={`unpaid-${inv._id || inv.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a' }}>{inv.invoice_number}</td>
                      <td style={{ padding: '14px 20px', color: '#334155' }}>{inv.description || inv.title || 'Certification Invoice'}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 800, color: '#ea580c', fontSize: 14 }}>
                        £{parseFloat(inv.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`badge ${isAwaiting ? 'badge-orange' : inv.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>
                          {isAwaiting ? 'Proof Submitted (Awaiting Confirmation)' : inv.status === 'overdue' ? 'Overdue' : 'Unpaid'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          {inv.invoice_url && (
                            <a
                              href={getPdfUrl(inv.invoice_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#0284c7', padding: '6px 10px', gap: 4, borderRadius: 6, border: '1px solid #e0f2fe', background: '#f0f9ff' }}
                              title="View Invoice PDF"
                            >
                              <Eye size={13} /> View
                            </a>
                          )}
                          {!isAwaiting ? (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '6px 14px', fontSize: 12.5, fontWeight: 700, gap: 5, borderRadius: 6, background: '#ea580c', borderColor: '#ea580c' }}
                              onClick={() => setSelectedInvoice(inv)}
                            >
                              <CreditCard size={13} /> Pay & Submit Proof
                            </button>
                          ) : (
                            <span style={{ fontSize: 11.5, color: '#d97706', fontWeight: 600, background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: 6 }}>
                              Receipt Submitted
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
