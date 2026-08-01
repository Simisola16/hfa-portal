import React, { useState, useEffect } from 'react';
import { X, PenTool } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

export default function ClientAgreementModal({ isOpen, onClose, agreement: propAgreement, app: propApp, appId: propAppId, signatures: propSignatures, onSuccess }) {
  const [agreement, setAgreement] = useState(propAgreement || null);
  const [signatures, setSignatures] = useState(propSignatures || []);
  const [loading, setLoading] = useState(false);
  const [signName, setSignName] = useState('');
  const [selectedSigId, setSelectedSigId] = useState('');
  const [sigFile, setSigFile] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propAgreement?.application_id);

  useEffect(() => {
    if (isOpen) {
      setSignName('');
      setSelectedSigId('');
      setSigFile(null);
      setComment('');

      if (!propAgreement && targetAppId) {
        setLoading(true);
        Promise.all([
          api.get(`/api/agreements/application/${targetAppId}`).catch(() => ({ data: null })),
          !propSignatures || propSignatures.length === 0 ? api.get('/api/signatures').catch(() => ({ data: [] })) : Promise.resolve({ data: propSignatures })
        ])
          .then(([agRes, sigRes]) => {
            setAgreement(agRes.data || null);
            if (sigRes.data) setSignatures(sigRes.data?.data || sigRes.data || []);
          })
          .finally(() => setLoading(false));
      } else if (!propAgreement && !targetAppId) {
        setLoading(true);
        Promise.all([
          api.get('/api/agreements').catch(() => ({ data: [] })),
          !propSignatures || propSignatures.length === 0 ? api.get('/api/signatures').catch(() => ({ data: [] })) : Promise.resolve({ data: propSignatures })
        ])
          .then(([agRes, sigRes]) => {
            const list = agRes.data?.data || agRes.data || [];
            const active = list.find(a => a.status === 'sent') || list[0] || null;
            setAgreement(active);
            if (sigRes.data) setSignatures(sigRes.data?.data || sigRes.data || []);
          })
          .finally(() => setLoading(false));
      } else {
        setAgreement(propAgreement || null);
        if (!propSignatures || propSignatures.length === 0) {
          api.get('/api/signatures')
            .then(res => setSignatures(res.data?.data || res.data || []))
            .catch(() => setSignatures([]));
        } else {
          setSignatures(propSignatures || []);
        }
      }
    }
  }, [isOpen, propAgreement, propSignatures, targetAppId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!agreement) return;

    if (!signName.trim()) {
      toast.error('Please enter your full name.');
      return;
    }
    if (!selectedSigId && !sigFile) {
      toast.error('Please choose a signature or upload a signature image file.');
      return;
    }

    setSubmitting(true);
    try {
      const agreeId = getCleanId(agreement._id || agreement.id || agreement);
      const formData = new FormData();
      formData.append('status', 'signed');
      formData.append('client_sign_name', signName);
      if (comment) formData.append('client_comment', comment);

      if (sigFile) {
        formData.append('signature_file', sigFile);
      } else {
        const selectedSig = signatures.find(s => String(s._id || s.id) === String(selectedSigId));
        if (selectedSig) {
          formData.append('signature_url', selectedSig.signature_url);
        }
      }

      await api.put(`/api/agreements/${agreeId}`, formData, true);
      toast.success('Agreement signed and submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Signature submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 550 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Sign Certification Agreement</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              Loading agreement details...
            </div>
          ) : !agreement ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>
              No agreement details found for this application.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{agreement.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Please sign below to execute the agreement.</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name of Signee <span>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Jane Smith (Director)"
                    value={signName}
                    onChange={e => setSignName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Choose Saved Profile Signature</label>
                  <select
                    className="form-control"
                    value={selectedSigId}
                    onChange={e => {
                      setSelectedSigId(e.target.value);
                      if (e.target.value) setSigFile(null);
                    }}
                    disabled={submitting}
                  >
                    <option value="">-- Choose signature from profile --</option>
                    {signatures.map(s => (
                      <option key={s._id || s.id} value={s._id || s.id}>{s.name} (Profile)</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
                  <div style={{ flex: 1, borderTop: '1px solid #e2e8f0' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>OR UPLOAD SIGNATURE IMAGE</span>
                  <div style={{ flex: 1, borderTop: '1px solid #e2e8f0' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Signature Image file</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={e => {
                      setSigFile(e.target.files[0]);
                      if (e.target.files[0]) setSelectedSigId('');
                    }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Client Comments / Notes</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Any notes or feedback..."
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
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !agreement || loading || !signName.trim() || (!selectedSigId && !sigFile)}
            style={{ background: '#0e7490' }}
          >
            {submitting ? 'Signing...' : 'Sign & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
