import React, { useState, useEffect } from 'react';
import { X, FileText, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function ClientProposalModal({ isOpen, onClose, proposal: propProposal, app: propApp, appId: propAppId, onSuccess }) {
  const [proposal, setProposal] = useState(propProposal || null);
  const [app, setApp] = useState(propApp || null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const targetAppId = propAppId || propApp?._id || propApp?.id || propProposal?.application_id;

  useEffect(() => {
    if (isOpen) {
      setShowRejectForm(false);
      setRejectReason('');
      
      if (!propProposal && targetAppId) {
        setLoading(true);
        Promise.all([
          api.get(`/api/proposals/application/${targetAppId}`).catch(() => ({ data: null })),
          !propApp ? api.get(`/api/applications/${targetAppId}`).catch(() => ({ data: null })) : Promise.resolve({ data: propApp })
        ])
          .then(([pRes, aRes]) => {
            setProposal(pRes.data || null);
            if (aRes.data) setApp(aRes.data);
          })
          .finally(() => setLoading(false));
      } else {
        setProposal(propProposal || null);
        setApp(propApp || null);
      }
    }
  }, [isOpen, propProposal, propApp, targetAppId]);

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!proposal) return;
    setSubmitting(true);
    try {
      const pId = proposal._id || proposal.id;
      const aId = targetAppId || proposal.application_id;
      
      await api.put(`/api/proposals/${pId}`, { status: 'accepted' });
      await api.put(`/api/applications/${aId}/status`, {
        status: 'proposal_approved',
        note: 'Proposal approved by client via quick action.',
      });
      
      toast.success('Proposal approved successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to approve proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    if (!rejectReason.trim()) {
      toast.error('Please enter a reason for rejecting the proposal.');
      return;
    }
    setSubmitting(true);
    try {
      const pId = proposal._id || proposal.id;
      const aId = targetAppId || proposal.application_id;

      await api.put(`/api/proposals/${pId}`, {
        status: 'rejected',
        client_comment: rejectReason.trim()
      });
      await api.put(`/api/applications/${aId}/status`, {
        status: 'proposal_rejected',
        note: `Proposal rejected by client: ${rejectReason.trim()}`,
      });

      toast.success('Proposal rejection submitted.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit rejection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, width: '92%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20} style={{ color: 'var(--primary)' }} />
            <div className="modal-title">Review &amp; Respond to Proposal</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              Loading proposal details...
            </div>
          ) : !proposal ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              No proposal found for this application.
            </div>
          ) : (
            <div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Application #{app?.application_number || 'N/A'} &middot; {app?.establishment_name}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '6px 0 12px' }}>
                  {proposal.title || 'Halal Certification Proposal'}
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Scope</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{proposal.scope || app?.scope || 'Certification Scope'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Proposed Amount</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
                      £{Number(proposal.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {proposal.proposal_url && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                    <a
                      href={getPdfUrl(proposal.proposal_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', justifyContent: 'center', gap: 8, borderColor: '#cbd5e1', color: '#0f172a', background: 'white' }}
                    >
                      <Download size={14} /> Download Proposal Document (PDF)
                    </a>
                  </div>
                )}
              </div>

              {proposal.details && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
                    Proposal Details &amp; Notes
                  </div>
                  <div style={{ background: '#fafafb', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {proposal.details}
                  </div>
                </div>
              )}

              {showRejectForm && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={15} /> Reason for Rejection <span>*</span>
                  </div>
                  <textarea
                    className="form-control"
                    rows={3}
                    style={{ fontSize: 13, background: 'white' }}
                    placeholder="Please explain why you are rejecting this proposal..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {proposal && (
          <div className="modal-footer" style={{ gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            
            {!showRejectForm ? (
              <>
                <button
                  className="btn btn-danger"
                  style={{ gap: 6 }}
                  onClick={() => setShowRejectForm(true)}
                  disabled={submitting}
                >
                  <XCircle size={16} /> Reject Proposal
                </button>
                <button
                  className="btn btn-primary"
                  style={{ gap: 6, background: '#16a34a', borderColor: '#16a34a' }}
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  <CheckCircle size={16} /> {submitting ? 'Approving...' : 'Approve Proposal'}
                </button>
              </>
            ) : (
              <button
                className="btn btn-danger"
                style={{ gap: 6 }}
                onClick={handleReject}
                disabled={submitting || !rejectReason.trim()}
              >
                <XCircle size={16} /> {submitting ? 'Submitting Rejection...' : 'Confirm Rejection'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
