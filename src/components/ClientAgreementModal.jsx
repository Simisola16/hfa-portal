import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, Download, Upload, ShieldCheck } from 'lucide-react';
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
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
  const cleanApi = API_URL.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanApi}${cleanPath}`;
};

export default function ClientAgreementModal({ isOpen, onClose, agreement: propAgreement, app: propApp, appId: propAppId, onSuccess }) {
  const [agreement, setAgreement] = useState(propAgreement || null);
  const [loading, setLoading] = useState(false);
  const [signName, setSignName] = useState('');
  const [signedFile, setSignedFile] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propAgreement?.application_id);

  useEffect(() => {
    if (isOpen) {
      setSignName('');
      setSignedFile(null);
      setComment('');

      if (!propAgreement && targetAppId) {
        setLoading(true);
        api.get(`/api/agreements/application/${targetAppId}`)
          .then(agRes => {
            setAgreement(agRes.data || null);
          })
          .catch(() => setAgreement(null))
          .finally(() => setLoading(false));
      } else if (!propAgreement && !targetAppId) {
        setLoading(true);
        api.get('/api/agreements')
          .then(agRes => {
            const list = agRes.data?.data || agRes.data || [];
            const active = list.find(a => a.status === 'sent') || list[0] || null;
            setAgreement(active);
          })
          .catch(() => setAgreement(null))
          .finally(() => setLoading(false));
      } else {
        setAgreement(propAgreement || null);
      }
    }
  }, [isOpen, propAgreement, targetAppId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!agreement) return;

    if (!signName.trim()) {
      toast.error('Please enter the full name of the authorized signee.');
      return;
    }
    if (!signedFile && !agreement.signed_agreement_url) {
      toast.error('Please upload the signed certification agreement document.');
      return;
    }

    setSubmitting(true);
    try {
      const agreeId = getCleanId(agreement._id || agreement.id || agreement);
      const formData = new FormData();
      formData.append('status', 'signed');
      formData.append('client_sign_name', signName.trim());
      if (comment) formData.append('client_comment', comment.trim());

      if (signedFile) {
        formData.append('signed_agreement_file', signedFile);
      }

      await api.put(`/api/agreements/${agreeId}`, formData, true);
      toast.success('Signed agreement uploaded and submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Signed agreement submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} style={{ color: 'var(--primary)' }} /> Sign & Upload Certification Agreement
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Loading agreement details...
            </div>
          ) : !agreement ? (
            <div style={{ padding: 28, textAlign: 'center', color: '#ef4444' }}>
              No agreement details found for this application.
            </div>
          ) : (
            <>
              {/* Header Info */}
              <div style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>{agreement.title || 'Certification Agreement'}</h3>
                <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 4, marginBottom: 12, lineHeight: 1.5 }}>
                  Please download the agreement document, have it signed by an authorized signatory, and upload the signed agreement copy below.
                </p>

                {agreement.agreement_url && (
                  <a
                    href={getPdfUrl(agreement.agreement_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ background: '#fff', borderColor: '#cbd5e1', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={14} /> Download Agreement Document (PDF)
                  </a>
                )}
              </div>

              {agreement.admin_comment && (
                <div style={{ marginBottom: 20, background: '#f0f9ff', border: '1px solid #bae6fd', padding: 14, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: 4 }}>
                    Admin Note / Instructions
                  </div>
                  <div style={{ fontSize: 13, color: '#0c4a6e', lineHeight: 1.5 }}>
                    {agreement.admin_comment}
                  </div>
                </div>
              )}

              {agreement.details && (
                <div style={{ marginBottom: 20, background: '#fff', border: '1px solid #e2e8f0', padding: 14, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                    Agreement Terms / Instructions
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {agreement.details}
                  </div>
                </div>
              )}

              {/* Signing Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name of Authorized Signee <span>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Jane Smith (Managing Director)"
                    value={signName}
                    onChange={e => setSignName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Signed Agreement Document (PDF / Document) <span>*</span></label>
                  <div
                    onClick={() => document.getElementById('client-signed-agreement-upload').click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      padding: '24px 20px',
                      borderRadius: 12,
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: signedFile ? '#f0fdf4' : '#fff',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                  >
                    <Upload size={32} style={{ color: signedFile ? '#16a34a' : '#94a3b8', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: signedFile ? '#15803d' : '#334155' }}>
                      {signedFile ? signedFile.name : 'Click to select signed agreement file'}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                      Supported formats: PDF, DOC, DOCX, PNG, JPG
                    </div>
                    <input
                      id="client-signed-agreement-upload"
                      type="file"
                      accept=".pdf,application/pdf,image/*,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setSignedFile(e.target.files[0]);
                        }
                      }}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Comments / Additional Notes (Optional)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Any notes regarding the signed agreement..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </form>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          {agreement?.client_signed ? (
            <span className="badge badge-green" style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={16} /> ✓ Agreement Already Signed
            </span>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !agreement || loading || !signName.trim() || !signedFile}
              style={{ background: '#0e7490', borderColor: '#0e7490' }}
            >
              {submitting ? 'Submitting Agreement...' : 'Upload & Submit Signed Agreement'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
