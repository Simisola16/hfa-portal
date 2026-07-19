import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { FileCheck, X, Download, CheckCircle, FileText, MessageSquare, PenTool } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AgreementPage() {
  const [agreements, setAgreements] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [signName, setSignName] = useState('');
  const [selectedSigId, setSelectedSigId] = useState('');
  const [sigFile, setSigFile] = useState(null);
  const [comment, setComment] = useState('');

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const [agRes, sigRes] = await Promise.all([
        api.get('/api/agreements'),
        api.get('/api/signatures').catch(() => ({ data: [] }))
      ]);
      setAgreements(agRes.data || agRes.data?.data || []);
      setSignatures(sigRes.data || sigRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load agreement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, []);

  const handleSignAgreement = async (e) => {
    e.preventDefault();
    if (!signName.trim()) {
      toast.error('Please enter your full name as signee');
      return;
    }

    if (!selectedSigId && !sigFile) {
      toast.error('Please select an existing signature or upload a signature image file');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', 'signed');
      formData.append('client_sign_name', signName);
      if (comment) formData.append('client_comment', comment);

      if (sigFile) {
        formData.append('signature_file', sigFile);
      } else {
        const selectedSig = signatures.find(s => s._id === selectedSigId || s.id === selectedSigId);
        if (selectedSig) {
          formData.append('signature_url', selectedSig.signature_url);
        }
      }

      await api.put(`/api/agreements/${selected._id || selected.id}`, formData, true);
      toast.success('Agreement signed and submitted successfully!');
      setSelected(null);
      setSignName('');
      setSelectedSigId('');
      setSigFile(null);
      setComment('');
      fetchAgreements();
    } catch (err) {
      toast.error(err.message || 'Failed to submit agreement signature');
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
                  <th>Application Ref</th>
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
                    <td>{a.application_id?.application_number || '—'}</td>
                    <td>{new Date(a.createdAt || a.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <span className={`badge ${
                        a.client_signed ? 'badge-green' : 'badge-yellow'
                      }`}>
                        {a.client_signed ? 'signed' : 'pending signature'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelected(a)}>
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
              <span className="modal-title">Review &amp; Sign Agreement</span>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{selected.title}</h3>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Application Ref: {selected.application_id?.application_number || 'N/A'}
                  </div>
                </div>
              </div>

              {selected.admin_comment && (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={12} /> HFA Admin Message
                  </div>
                  <div style={{ fontSize: 14, color: '#334155', fontStyle: 'italic' }}>"{selected.admin_comment}"</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: selected.agreement_url ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
                {selected.agreement_url && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Agreement Document</div>
                    <a 
                      href={getPdfUrl(selected.agreement_url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                    >
                      <Download size={14} /> Download Agreement PDF
                    </a>
                  </div>
                )}
                {selected.signed_agreement_url && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Signed Copy</div>
                    <a 
                      href={getPdfUrl(selected.signed_agreement_url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', marginTop: 8, justifyContent: 'center', borderColor: '#16a34a', color: '#16a34a' }}
                    >
                      <Download size={14} /> Download Signed PDF
                    </a>
                  </div>
                )}
              </div>

              {selected.details && (
                <div style={{ marginBottom: 24, background: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Agreement Terms / Details</div>
                  <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {selected.details}
                  </div>
                </div>
              )}

              {/* RENDER INLINE SIGNATURE IF SIGNED */}
              {selected.client_signed ? (
                <div style={{ border: '1.5px dashed #bbf7d0', background: '#f0fdf4', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                  <div style={{ fontSize: 10, color: '#15803d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                    Digital Signature Verified
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {selected.client_signature_url && (
                      <img 
                        src={getPdfUrl(selected.client_signature_url)} 
                        alt="Client Signature" 
                        style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain', background: 'white', padding: 4, borderRadius: 6, border: '1px solid #cbd5e1' }}
                      />
                    )}
                    <div style={{ fontSize: 14, color: '#1e293b' }}>
                      <div>Signed by: <strong style={{ fontWeight: 700 }}>{selected.client_sign_name}</strong></div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Date: {selected.client_sign_date ? new Date(selected.client_sign_date).toLocaleString('en-GB') : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* SIGNING FORM IF NOT SIGNED */
                <form onSubmit={handleSignAgreement} style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: '#334155', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PenTool size={16} style={{ color: 'var(--primary)' }} /> Sign Certification Agreement
                  </h4>

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Full Name of Signee <span>*</span></label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={signName}
                      onChange={e => setSignName(e.target.value)}
                      placeholder="e.g. John Doe (Managing Director)"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Select Saved Profile Signature</label>
                    <select 
                      className="form-control"
                      value={selectedSigId}
                      onChange={e => {
                        setSelectedSigId(e.target.value);
                        if (e.target.value) setSigFile(null); // clear file if profile signature chosen
                      }}
                    >
                      <option value="">-- Choose signature from profile --</option>
                      {signatures.map(s => (
                        <option key={s._id || s.id} value={s._id || s.id}>{s.name} (Profile)</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
                    <div style={{ flex: 1, borderTop: '1px solid #cbd5e1' }} />
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>OR UPLOAD SIGNATURE IMAGE</span>
                    <div style={{ flex: 1, borderTop: '1px solid #cbd5e1' }} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Upload Signature File (PNG/JPG)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="form-control"
                      onChange={e => {
                        setSigFile(e.target.files[0]);
                        if (e.target.files[0]) setSelectedSigId(''); // clear profile selection if file uploaded
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Feedback / Client Comments (Optional)</label>
                    <textarea 
                      className="form-control"
                      rows={3}
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
                  disabled={submitting || !signName.trim() || (!selectedSigId && !sigFile)}
                >
                  {submitting ? 'Submitting Signature...' : 'Sign & Submit Agreement'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
