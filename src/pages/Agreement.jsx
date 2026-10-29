import { getPdfUrl } from '../lib/pdfUtils';
import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { FileCheck, X, Download, CheckCircle, FileText, MessageSquare, Upload } from 'lucide-react';


export default function AgreementPage() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [signName, setSignName] = useState('');
  const [signedFile, setSignedFile] = useState(null);
  const [comment, setComment] = useState('');

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const agRes = await api.get('/api/agreements');
      setAgreements(Array.isArray(agRes) ? agRes : (agRes?.data || agRes?.data?.data || []));
    } catch (err) {
      console.error('Agreement fetch error:', err);
      toast.error('Failed to load agreement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, []);

  const handleSignAgreement = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selected) return;

    if (!signName.trim()) {
      toast.error('Please enter the full name of the authorized signee');
      return;
    }

    if (!signedFile && !selected.signed_agreement_url) {
      toast.error('Please upload the signed certification agreement document');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', 'signed');
      formData.append('client_sign_name', signName.trim());
      if (comment) formData.append('client_comment', comment.trim());

      if (signedFile) {
        formData.append('signed_agreement_file', signedFile);
      }

      await api.put(`/api/agreements/${selected._id || selected.id}`, formData, true);
      toast.success('Signed agreement uploaded and submitted successfully!');
      setSelected(null);
      setSignName('');
      setSignedFile(null);
      setComment('');
      fetchAgreements();
    } catch (err) {
      toast.error(err.message || 'Failed to submit signed agreement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-title" style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>Certification Agreements</div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">My Received Agreements ({agreements.length})</div>
          <div className="card-subtitle">View and download certification agreements sent by HFA</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : agreements.length === 0 ? (
            <div className="empty-state">
              <FileCheck size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title">No Agreements Found</div>
              <div className="empty-state-text">Agreements sent by HFA will appear here for you to view and download</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Agreement Title</th>
                  <th>Site Name</th>
                  <th>Date Received</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agreements.map(a => (
                  <tr key={a._id || a.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{a.title || 'Certification Agreement'}</div>
                    </td>
                    <td>{a.application_id?.site_name || a.application_id?.establishment_name || '—'}</td>
                    <td>{new Date(a.createdAt || a.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>
                        Received
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {a.agreement_url && (
                        <a
                          href={getPdfUrl(a.agreement_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        >
                          <Download size={13} /> Download PDF
                        </a>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelected(a)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: 'var(--primary)' }} /> Certification Agreement Details
              </span>
              <button type="button" className="modal-close" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{selected.title}</h3>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Site: <strong>{selected.application_id?.site_name || selected.application_id?.establishment_name || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {selected.admin_comment && (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={12} /> HFA Admin Message
                  </div>
                  <div style={{ fontSize: 13.5, color: '#334155', fontStyle: 'italic' }}>"{selected.admin_comment}"</div>
                </div>
              )}

              {selected.agreement_url && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 14, borderRadius: 10, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Agreement Document</div>
                  <a 
                    href={getPdfUrl(selected.agreement_url)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                  >
                    <Download size={14} /> Download Agreement (PDF)
                  </a>
                </div>
              )}

              {selected.details && (
                <div style={{ marginBottom: 10, background: '#fff', border: '1px solid #e2e8f0', padding: 14, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Agreement Terms / Details</div>
                  <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {selected.details}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
