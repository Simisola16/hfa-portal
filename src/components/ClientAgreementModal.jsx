import React, { useState } from 'react';
import { X, PenTool } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ClientAgreementModal({ isOpen, onClose, agreement, signatures, onSuccess }) {
  const [signName, setSignName] = useState('');
  const [selectedSigId, setSelectedSigId] = useState('');
  const [sigFile, setSigFile] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !agreement) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      await api.put(`/api/agreements/${agreement._id || agreement.id}`, formData, true);
      toast.success('Agreement signed and submitted successfully!');
      onSuccess();
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
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !signName.trim() || (!selectedSigId && !sigFile)}
            style={{ background: '#0e7490' }}
          >
            {submitting ? 'Signing...' : 'Sign & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
