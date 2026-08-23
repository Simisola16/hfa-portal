import React, { useState, useEffect } from 'react';
import { X, FileText, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

export default function ClientProposalModal({ isOpen, onClose, proposal: propProposal, app: propApp, appId: propAppId, onSuccess }) {
  const [proposal, setProposal] = useState(propProposal || null);
  const [app, setApp] = useState(propApp || null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propProposal?.application_id);

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
            const fetchedProp = pRes.data?.data !== undefined ? pRes.data.data : (pRes.data || null);
            const fetchedApp = aRes.data?.data !== undefined ? aRes.data.data : (aRes.data || null);
            setProposal(fetchedProp);
            if (fetchedApp) setApp(fetchedApp);
          })
          .finally(() => setLoading(false));
      } else if (!propProposal && !targetAppId) {
        setLoading(true);
        api.get('/api/proposals')
          .then(res => {
            const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            const active = list.find(p => p.status === 'pending') || list[0] || null;
            setProposal(active);
            if (active?.application_id) {
              setApp(typeof active.application_id === 'object' ? active.application_id : null);
            }
          })
          .catch(() => setProposal(null))
          .finally(() => setLoading(false));
      } else {
        const pObj = propProposal?.data !== undefined ? propProposal.data : propProposal;
        const aObj = propApp?.data !== undefined ? propApp.data : propApp;
        setProposal(pObj || null);
        setApp(aObj || null);
      }
    }
  }, [isOpen, propProposal, propApp, targetAppId]);

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!proposal) return;
    setSubmitting(true);
    try {
      const pId = getCleanId(proposal._id || proposal.id);
      const aId = getCleanId(targetAppId) || getCleanId(proposal.application_id?._id || proposal.application_id) || getCleanId(app?._id || app?.id);
      
      if (pId) {
        await api.put(`/api/proposals/${pId}`, { status: 'accepted' });
      }
      if (aId) {
        await api.put(`/api/applications/${aId}/status`, {
          status: 'proposal_approved',
          note: 'Proposal approved by client via quick action.',
        }).catch(() => {});
      }
      
      toast.success('Proposal accepted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to accept proposal');
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
      const pId = getCleanId(proposal._id || proposal.id);
      const aId = getCleanId(targetAppId) || getCleanId(proposal.application_id?._id || proposal.application_id) || getCleanId(app?._id || app?.id);

      if (pId) {
        await api.put(`/api/proposals/${pId}`, {
          status: 'rejected',
          client_comment: rejectReason.trim()
        });
      }
      if (aId) {
        await api.put(`/api/applications/${aId}/status`, {
          status: 'proposal_rejected',
          note: `Proposal rejected by client: ${rejectReason.trim()}`,
        }).catch(() => {});
      }

      toast.success('Proposal rejection submitted.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit rejection.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayCost = proposal?.estimated_cost !== undefined && proposal?.estimated_cost !== null && proposal?.estimated_cost !== ''
    ? Number(proposal.estimated_cost)
    : (proposal?.amount !== undefined && proposal?.amount !== null && proposal?.amount !== '' ? Number(proposal.amount) : 0);

  const companyName = app?.profiles?.company_name || app?.client_id?.company_name || app?.company_name || app?.establishment_name || 'Client Company';
  const siteName = app?.site_name || app?.establishment_name || app?.site?.name || 'Main Facility';

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580, width: '94%' }} onClick={e => e.stopPropagation()}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    {companyName} &bull; <span style={{ color: '#0f172a' }}>{siteName}</span>
                  </div>
                  {(app?.application_number || proposal?.reference_number) && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6 }}>
                      Ref: {app?.application_number || proposal?.reference_number}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '4px 0 14px' }}>
                  {proposal.title || 'Halal Certification Proposal'}
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Scope</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{proposal.scope || app?.scope || 'Certification Scope'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Estimated Cost</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginTop: 2 }}>
                      £{displayCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
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
                      <Download size={14} /> {/\.(png|jpg|jpeg|webp)$/i.test(proposal.proposal_url) ? 'View / Download Proposal Image' : 'Download Proposal Document (PDF)'}
                    </a>
                  </div>
                )}
              </div>

              {proposal.admin_comment && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#15803d', marginBottom: 4 }}>
                    💬 HFA Note / Guidance
                  </div>
                  <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                    {proposal.admin_comment}
                  </div>
                </div>
              )}

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
              Close
            </button>
            
            {['accepted', 'approved'].includes(proposal.status) ? (
              <span className="badge badge-green" style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} /> ✓ Proposal Accepted
              </span>
            ) : proposal.status === 'rejected' ? (
              <span className="badge badge-red" style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <XCircle size={16} /> Proposal Rejected
              </span>
            ) : !showRejectForm ? (
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
                  <CheckCircle size={16} /> {submitting ? 'Accepting...' : 'Accept Proposal'}
                </button>
              </>
            ) : (
              <button
                className="btn btn-danger"
                style={{ gap: 6 }}
                onClick={handleReject}
                disabled={submitting}
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
