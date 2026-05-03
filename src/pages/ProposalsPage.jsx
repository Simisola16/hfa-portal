import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ClipboardList, X, Download, CheckCircle, XCircle, FileText, MessageSquare } from 'lucide-react';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetch = () => { 
    setLoading(true); 
    api.get('/api/proposals')
      .then(d => setProposals(d.data?.data || []))
      .catch(() => toast.error('Failed to load proposals'))
      .finally(() => setLoading(false)); 
  };

  useEffect(() => { fetch(); }, []);

  const handleStatusUpdate = async (id, status, comment = '') => {
    if (status === 'rejected' && !comment) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/api/proposals/${id}`, { status, client_comment: comment });
      
      // If accepted, update application status to PROPOSAL ACCEPTED
      if (status === 'accepted' && selected?.application_id?._id) {
        await api.put(`/api/applications/${selected.application_id._id}/status`, { status: 'PROPOSAL ACCEPTED/REJECTED' });
      } else if (status === 'rejected' && selected?.application_id?._id) {
         await api.put(`/api/applications/${selected.application_id._id}/status`, { status: 'PROPOSAL ACCEPTED/REJECTED' });
      }

      toast.success(`Proposal ${status === 'accepted' ? 'accepted' : 'rejected'} successfully`);
      setShowRejectModal(false);
      setSelected(null);
      fetch();
    } catch (err) {
      toast.error(err.message || 'Failed to update proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-title" style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>Certification Proposals</div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">My Received Proposals ({proposals.length})</div>
          <div className="card-subtitle">Review and respond to certification proposals from HFA</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : proposals.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title">No Proposals Found</div>
              <div className="empty-state-text">Proposals sent by HFA will appear here for your review</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Proposal Title</th>
                  <th>Application Ref</th>
                  <th>Amount</th>
                  <th>Date Received</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.title || 'Certification Proposal'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{p.reference_number || 'No Ref'}</div>
                    </td>
                    <td>{p.application_id?.application_number || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{p.currency || 'GBP'} {p.amount || '—'}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                    <td>
                      <span className={`badge ${
                        p.status === 'accepted' ? 'badge-green' : 
                        p.status === 'rejected' ? 'badge-red' : 
                        'badge-yellow'
                      }`}>
                        {p.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelected(p)}>
                        View & Respond
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
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Review Proposal</span>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{selected.title}</h3>
                <div style={{ fontSize: 13, color: '#64748b' }}>Reference: {selected.reference_number || 'N/A'}</div>
              </div>

              {selected.admin_comment && (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={12} /> HFA Admin Message
                  </div>
                  <div style={{ fontSize: 14, color: '#334155', fontStyle: 'italic' }}>"{selected.admin_comment}"</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: selected.proposal_url ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
                {selected.proposal_url && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Proposal Document</div>
                    <a 
                      href={selected.proposal_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                    >
                      <Download size={14} /> Download Proposal
                    </a>
                  </div>
                )}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Estimated Cost</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                    {selected.currency || 'GBP'} {selected.amount || '—'}
                  </div>
                </div>
              </div>

              {selected.details && !selected.proposal_url && (
                <div style={{ marginBottom: 24, background: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Proposal Details</div>
                  <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {selected.details}
                  </div>
                </div>
              )}

              {selected.status === 'rejected' && selected.client_comment && (
                <div style={{ background: '#fef2f2', padding: 16, borderRadius: 12, border: '1px solid #fecaca', marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#dc2626', marginBottom: 8 }}>My Rejection Reason</div>
                  <div style={{ fontSize: 14, color: '#991b1b' }}>{selected.client_comment}</div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'pending' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ color: '#dc2626', borderColor: '#fecaca' }}
                    onClick={() => setShowRejectModal(true)}
                  >
                    <XCircle size={16} /> Reject Proposal
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleStatusUpdate(selected.id, 'accepted')}
                  >
                    <CheckCircle size={16} /> Accept Proposal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <span className="modal-title">Reject Proposal</span>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Why are you rejecting this proposal? <span>*</span></label>
                <textarea 
                  className="form-control" 
                  rows={4}
                  value={rejectComment}
                  onChange={e => setRejectComment(e.target.value)}
                  placeholder="Please provide details on why you are rejecting this proposal so we can assist you better..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#dc2626' }}
                disabled={!rejectComment || submitting}
                onClick={() => handleStatusUpdate(selected.id, 'rejected', rejectComment)}
              >
                {submitting ? 'Submitting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
