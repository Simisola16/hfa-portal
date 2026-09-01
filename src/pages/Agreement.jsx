import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { FileCheck, X, Download, CheckCircle, FileText, MessageSquare, Upload } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${API_URL}${url}`;
  }
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const cleanApi = API_URL.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanApi}${cleanPath}`;
};

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
          <div className="card-subtitle">Review, sign, and view all certification agreements with HFA</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : agreements.length === 0 ? (
            <div className="empty-state">
              <FileCheck size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title">No Agreements Found</div>
              <div className="empty-state-text">Agreements sent by HFA will appear here for your review and sign-off</div>
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
                      <span className={`badge ${
                        a.client_signed ? 'badge-green' : 'badge-yellow'
                      }`} style={{ textTransform: 'capitalize' }}>
                        {a.client_signed ? 'Signed' : 'Pending Signature'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        setSelected(a);
                        setSignName(a.client_sign_name || '');
                        setSignedFile(null);
                        setComment(a.client_comment || '');
                      }}>
                        {a.client_signed ? 'View Details' : 'View & Sign'}
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
        <div className="modal-overlay" onClick={() => !submitting && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: 'var(--primary)' }} /> Review &amp; Sign Agreement
              </span>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={18} /></button>
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

              <div style={{ display: 'grid', gridTemplateColumns: selected.agreement_url ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr', gap: 12, marginBottom: 20 }}>
                {selected.agreement_url && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 14, borderRadius: 10 }}>
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
                {selected.signed_agreement_url && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 14, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 4 }}>Signed Copy Uploaded</div>
                    <a 
                      href={getPdfUrl(selected.signed_agreement_url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', marginTop: 8, justifyContent: 'center', borderColor: '#16a34a', color: '#16a34a' }}
                    >
                      <Download size={14} /> View Signed Document
                    </a>
                  </div>
                )}
                {selected.final_agreement_url && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: 14, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: 4 }}>Final Countersigned Copy</div>
                    <a 
                      href={getPdfUrl(selected.final_agreement_url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', marginTop: 8, justifyContent: 'center', borderColor: '#0284c7', color: '#0284c7' }}
                    >
                      <Download size={14} /> Download Countersigned Copy
                    </a>
                  </div>
                )}
              </div>

              {selected.details && (
                <div style={{ marginBottom: 20, background: '#fff', border: '1px solid #e2e8f0', padding: 14, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Agreement Terms / Details</div>
                  <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {selected.details}
                  </div>
                </div>
              )}

              {/* IF ALREADY SIGNED */}
              {selected.client_signed ? (
                <div style={{ border: '1.5px dashed #bbf7d0', background: '#f0fdf4', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#15803d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={15} /> Signed Agreement Verified
                  </div>
                  <div style={{ fontSize: 13.5, color: '#1e293b' }}>
                    <div>Signed by: <strong style={{ fontWeight: 700 }}>{selected.client_sign_name}</strong></div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Date: {selected.client_sign_date ? new Date(selected.client_sign_date).toLocaleString('en-GB') : 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                /* SIGNING & DOCUMENT UPLOAD FORM */
                <form onSubmit={handleSignAgreement} style={{ background: '#f8fafc', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Upload size={16} style={{ color: 'var(--primary)' }} /> Upload Signed Agreement Document
                  </h4>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label">Full Name of Authorized Signee <span>*</span></label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={signName}
                      onChange={e => setSignName(e.target.value)}
                      placeholder="e.g. John Doe (Managing Director)"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label">Upload Signed Agreement Document (PDF / Document) <span>*</span></label>
                    <div
                      onClick={() => document.getElementById('page-signed-agreement-upload').click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        padding: '22px 18px',
                        borderRadius: 10,
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: signedFile ? '#f0fdf4' : '#fff',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      <Upload size={28} style={{ color: signedFile ? '#16a34a' : '#94a3b8', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: signedFile ? '#15803d' : '#334155' }}>
                        {signedFile ? signedFile.name : 'Click to select signed agreement file'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Supported formats: PDF, DOC, DOCX, PNG, JPG
                      </div>
                      <input 
                        id="page-signed-agreement-upload"
                        type="file" 
                        accept=".pdf,application/pdf,image/*,.doc,.docx" 
                        style={{ display: 'none' }}
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setSignedFile(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Feedback / Client Comments (Optional)</label>
                    <textarea 
                      className="form-control"
                      rows={2}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Add any comments or notes regarding this agreement..."
                    />
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => setSelected(null)} disabled={submitting}>Close</button>
              {!selected.client_signed && (
                <button 
                  className="btn btn-primary"
                  onClick={handleSignAgreement}
                  disabled={submitting}
                  style={{ background: '#0e7490', borderColor: '#0e7490' }}
                >
                  {submitting ? 'Uploading Signed Copy...' : 'Upload & Submit Signed Agreement'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
