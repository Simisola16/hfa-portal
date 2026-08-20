import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { FileBarChart, Eye, Download, CreditCard } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = () => {
    setLoading(true);
    api.get('/api/invoices')
      .then(d => setInvoices(d.data || []))
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Invoices</div>
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
              {invoices.map(inv => (
                <tr key={inv._id || inv.id}>
                  <td style={{ fontWeight: 700 }}>{inv.invoice_number}</td>
                  <td>{inv.description || inv.title || 'Certification Invoice'}</td>
                  <td style={{ fontWeight: 600 }}>£{parseFloat(inv.amount || 0).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${inv.status === 'paid' ? 'badge-green' : inv.status === 'client_paid' ? 'badge-orange' : inv.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>
                      {inv.status === 'client_paid' ? 'paid (awaiting confirmation)' : inv.status}
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
                      {inv.status !== 'paid' && inv.status !== 'client_paid' && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: 12, gap: 4 }}
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          <CreditCard size={13} /> Respond & Pay
                        </button>
                      )}
                      {inv.status === 'client_paid' && (
                        <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>Proof Submitted</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
  );
}
