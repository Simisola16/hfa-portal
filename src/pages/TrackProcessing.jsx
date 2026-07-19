import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Building2, Calendar,
  FileText, AlertTriangle, CheckCircle, XCircle,
  Receipt, Users, FileCheck, PenTool, Download, X
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ProcessingTimeline from '../components/ProcessingTimeline';
import { STATUS_LABELS, STATUS_BADGE } from '../lib/applicationStatuses';

// Client-side Detail Cards
import ProposalCard from '../components/ProposalCard';
import InvoiceCard from '../components/InvoiceCard';
import AuditCard from '../components/AuditCard';
import AgreementCard from '../components/AgreementCard';

// Client-side Modals
import PaymentModal from '../components/PaymentModal';
import ClientAuditModal from '../components/ClientAuditModal';
import ClientAgreementModal from '../components/ClientAgreementModal';

export default function TrackProcessing() {
  const { appId } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Core records for child components
  const [proposal, setProposal] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [audit, setAudit] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [signatures, setSignatures] = useState([]);

  // Modal Visibility States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Inline forms/submission states
  const [rejectReason, setRejectReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchApp = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [appRes, propRes, invRes, auditRes, agreementRes, sigRes] = await Promise.all([
        api.get(`/api/applications/${appId}`),
        api.get(`/api/proposals/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/audits/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/agreements/application/${appId}`).catch(() => ({ data: null })),
        api.get('/api/signatures').catch(() => ({ data: [] }))
      ]);

      setApp(appRes.data);
      setProposal(propRes.data || null);
      setInvoice(invRes.data || null);
      setAudit(auditRes.data || null);
      setAgreement(agreementRes.data?.data || agreementRes.data || null);
      setSignatures(sigRes.data || sigRes.data?.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) toast.error('Failed to load application details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchApp();
    const interval = setInterval(() => fetchApp(true), 20000);
    return () => clearInterval(interval);
  }, [fetchApp]);

  const handleApproveProposal = async () => {
    if (!proposal) return;
    setActionSubmitting(true);
    try {
      await api.put(`/api/proposals/${proposal._id || proposal.id}`, { status: 'accepted' });
      const res = await api.put(`/api/applications/${appId}/status`, {
        status: 'proposal_approved',
        note: 'Proposal approved by client.',
      });
      setApp(res.data);
      setShowApproveModal(false);
      toast.success('Proposal approved successfully!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Approval failed.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!proposal) return;
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setActionSubmitting(true);
    try {
      await api.put(`/api/proposals/${proposal._id || proposal.id}`, { status: 'rejected', client_comment: rejectReason.trim() });
      const res = await api.put(`/api/applications/${appId}/status`, {
        status: 'proposal_rejected',
        note: `Proposal rejected by client: ${rejectReason.trim()}`,
      });
      setApp(res.data);
      setShowRejectModal(false);
      setRejectReason('');
      toast.success('Proposal rejected.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Rejection failed.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleNcResolve = async (auditId, reportId) => {
    try {
      const res = await api.post('/api/audits/resolve-nc', { audit_id: auditId, report_id: reportId });
      // Update local audit state so the NC flips to 'corrected' immediately
      setAudit(res.data);
      toast.success('NC report marked as corrected — HFA Admin has been notified.');
    } catch (err) {
      toast.error(err.message || 'Failed to resolve NC report');
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid #dcfce7',
            borderTop: '3px solid var(--primary)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading application…</div>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <AlertTriangle size={48} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
          <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Application Not Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            This application may have been removed or you may not have access.
          </p>
          <Link to="/applications" className="btn btn-primary">
            <ArrowLeft size={16} /> Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  const status = app.status || 'submitted';
  const isRejected = status === 'rejected';
  const isApproved = status === 'approved' || status === 'certificate_issued';
  const rejectionEntry = (app.status_history || app.statusHistory || []).find(e => e.status === 'rejected');

  // Helper flags for action stepper
  const showProposalAction = status === 'proposal_sent';
  const showPaymentAction = status === 'invoice_sent' && invoice && invoice.status !== 'client_paid' && invoice.status !== 'paid';
  const showPaymentPending = (status === 'invoice_sent' && invoice && invoice.status === 'client_paid') || (status === 'payment_received' && invoice && invoice.status !== 'paid');
  const showPaymentConfirmed = (status === 'payment_received' || (invoice && invoice.status === 'paid' && status === 'invoice_sent')) && (!audit || audit.status === 'pending');
  const showAuditAction = status === 'dates_proposed' || audit?.status === 'dates_proposed';
  const showAuditDatesRejected = status === 'dates_rejected' || audit?.status === 'dates_rejected';
  const showAuditDatesAccepted = status === 'dates_accepted' || audit?.status === 'dates_accepted';
  const showAuditScheduled = status === 'date_finalized' || status === 'audit_assigned' || audit?.status === 'date_finalized' || audit?.status === 'auditors_assigned';
  const showAgreementAction = status === 'agreement_sent';

  return (
    <div className="page-content">
      {/* Breadcrumbs & Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => navigate('/applications')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, padding: '4px 0',
            }}
          >
            <ArrowLeft size={15} /> Applications
          </button>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Track Progress</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              {app.application_number}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={`badge ${STATUS_BADGE[status] || 'badge-blue'}`}>
                {STATUS_LABELS[status] || status.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Submitted {new Date(app.created_at).toLocaleDateString('en-GB')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {refreshing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Updating…
              </div>
            )}
            {lastUpdated && !refreshing && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => fetchApp(true)}
              style={{
                background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8,
                padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)',
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Action Banner Panel */}
      {showProposalAction && proposal && (
        <div style={{
          background: 'linear-gradient(135deg, #fef9c3, #fffbeb)',
          border: '1.5px solid #fef08a', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={22} style={{ color: '#854d0e' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#854d0e', marginBottom: 4 }}>Proposal Received (v{proposal.version || 1})</div>
              <div style={{ fontSize: 13, color: '#713f12', lineHeight: 1.6 }}>
                HFA has sent a proposal for your certification. Estimated cost is <strong>£{Number(proposal.estimated_cost).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong>.
                Please review the details below and approve or reject the proposal.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn"
              style={{ background: '#fef2f2', color: '#991b1b', border: '1.5px solid #fecaca' }}
              onClick={() => setShowRejectModal(true)}
            >
              <XCircle size={15} /> Reject Proposal
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowApproveModal(true)}
            >
              <CheckCircle size={15} /> Approve Proposal
            </button>
          </div>
        </div>
      )}

      {showPaymentAction && invoice && (
        <div style={{
          background: 'linear-gradient(135deg, #ffedd5, #fffbeb)',
          border: '1.5px solid #fed7aa', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Receipt size={20} style={{ color: '#ea580c' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#ea580c', marginBottom: 4 }}>Action Required: Pay Invoice</div>
              <div style={{ fontSize: 13, color: '#c2410c', lineHeight: 1.6 }}>
                An invoice ({invoice.invoice_number}) has been issued for certification fees. Amount Due: <strong>£{Number(invoice.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong>.
              </div>
            </div>
          </div>
          <div>
            <button className="btn btn-primary" style={{ background: '#ea580c' }} onClick={() => setShowPaymentModal(true)}>
              Pay Now
            </button>
          </div>
        </div>
      )}

      {/* Payment submitted — awaiting admin confirmation */}
      {showPaymentPending && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #fffbeb)',
          border: '1.5px solid #86efac', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 16
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={22} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#15803d', marginBottom: 4 }}>Payment Proof Submitted</div>
            <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
              Your payment receipt has been submitted. The HFA finance team is currently reviewing and confirming your payment.
              You will receive a notification once it has been verified.
            </div>
          </div>
        </div>
      )}

      {/* Payment confirmed — awaiting admin date proposal */}
      {showPaymentConfirmed && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #fffbeb)',
          border: '1.5px solid #86efac', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 16
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={22} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#15803d', marginBottom: 4 }}>Payment Confirmed</div>
            <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
              Your payment has been successfully verified by HFA. Our administration team is preparing your audit schedule. We will propose three available audit dates for your selection shortly.
            </div>
          </div>
        </div>
      )}

      {/* Audit dates rejected — waiting for admin to re-propose */}
      {showAuditDatesRejected && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2, #fff5f5)',
          border: '1.5px solid #fecaca', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 16
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={22} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#991b1b', marginBottom: 4 }}>Audit Dates Rejected</div>
            <div style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.6 }}>
              You indicated that you were unavailable for the proposed audit dates. HFA Admin has been notified and is preparing 3 new date options for you.
            </div>
          </div>
        </div>
      )}

      {/* Audit dates chosen — awaiting admin final date confirmation */}
      {showAuditDatesAccepted && (
        <div style={{
          background: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)',
          border: '1.5px solid #bae6fd', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 16
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={22} style={{ color: '#0284c7' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0369a1', marginBottom: 4 }}>Preferred Audit Dates Selected</div>
            <div style={{ fontSize: 13, color: '#075985', lineHeight: 1.6 }}>
              You have submitted your preferred audit dates. HFA is currently coordinating with our auditors to lock in the final audit date. We will notify you once finalized.
            </div>
          </div>
        </div>
      )}

      {/* Audit scheduled / finalized */}
      {showAuditScheduled && audit && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
          border: '1.5px solid #a7f3d0', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 16
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={22} style={{ color: '#10b981' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#065f46', marginBottom: 4 }}>Audit Scheduled</div>
            <div style={{ fontSize: 13, color: '#047857', lineHeight: 1.6 }}>
              Your audit has been finalized and scheduled for: <strong>{audit.finalized_date || audit.scheduled_date ? new Date(audit.finalized_date || audit.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Pending final date'}</strong>. Please ensure all relevant documentation and staff are prepared for this date.
            </div>
          </div>
        </div>
      )}

      {showAuditAction && audit && (
        <div style={{
          background: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)',
          border: '1.5px solid #bae6fd', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={20} style={{ color: '#0284c7' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0369a1', marginBottom: 4 }}>Action Required: Select Audit Dates</div>
              <div style={{ fontSize: 13, color: '#075985', lineHeight: 1.6 }}>
                Please select exactly 2 dates you are available for HFA to finalize your audit session.
              </div>
            </div>
          </div>
          <div>
            <button className="btn btn-primary" style={{ background: '#0284c7' }} onClick={() => setShowAuditModal(true)}>
              Select Dates
            </button>
          </div>
        </div>
      )}

      {showAgreementAction && agreement && (
        <div style={{
          background: 'linear-gradient(135deg, #ecfeff, #f0fdfa)',
          border: '1.5px solid #a5f3fc', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#cffafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileCheck size={22} style={{ color: '#0891b2' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0891b2', marginBottom: 4 }}>Action Required: Sign Certification Agreement</div>
              <div style={{ fontSize: 13, color: '#0e7490', lineHeight: 1.6 }}>
                Please review and execute your agreement: <strong>{agreement.title}</strong>.
              </div>
            </div>
          </div>
          <div>
            <button className="btn btn-primary" style={{ background: '#0e7490' }} onClick={() => setShowAgreementModal(true)}>
              <PenTool size={14} /> Review &amp; Sign
            </button>
          </div>
        </div>
      )}

      {isRejected && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2, #fff5f5)',
          border: '1.5px solid #fecaca', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 16,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <XCircle size={22} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#991b1b', marginBottom: 4 }}>Application Not Approved</div>
            <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>
              {rejectionEntry?.note
                ? <><strong>Reason:</strong> {rejectionEntry.note}</>
                : 'Your application was not approved. Please contact us for more information.'}
            </div>
            <div style={{ marginTop: 12 }}>
              <Link to="/applications/new" className="btn btn-primary" style={{ fontSize: 12 }}>
                Submit New Application
              </Link>
            </div>
          </div>
        </div>
      )}

      {status === 'certificate_issued' && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #f7fffe)',
          border: '1.5px solid #bbf7d0', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 16,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={22} style={{ color: '#15803d' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#15803d', marginBottom: 4 }}>Halal Certification Complete!</div>
            <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
              Your certificate has been issued and is ready. You can view or download it under your{' '}
              <Link to="/certificates" style={{ color: 'var(--primary)', fontWeight: 700 }}>Certificates</Link> page.
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Progress Stack Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Proposal Card */}
          <ProposalCard app={app} proposal={proposal} />

          {/* Invoice Card */}
          <InvoiceCard
            invoice={invoice}
            status={status}
            onPayClick={() => setShowPaymentModal(true)}
          />

          {/* Audit Card */}
          <AuditCard
            audit={audit}
            status={status}
            onSelectDatesClick={() => setShowAuditModal(true)}
            onNcResolve={handleNcResolve}
          />

          {/* Agreement Card */}
          <AgreementCard
            agreement={agreement}
            status={status}
            onSignClick={() => setShowAgreementModal(true)}
          />
        </div>

        {/* Right Column: Timeline and Details */}
        <div>
          {/* Stepper Timeline */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Processing Status</div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <ProcessingTimeline status={status} statusHistory={app.status_history || app.statusHistory} />
            </div>
          </div>

          {/* Application Details Card — full info to replace the old modal's Tab 1 */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Application Details</div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gap: 16 }}>

                {/* Establishment */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>Establishment</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{app.establishment_name}</div>
                  {app.establishment_address && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{app.establishment_address}</div>}
                </div>

                {/* Category + Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>App Type</div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{app.application_type}</div>
                  </div>
                  {app.employee_count && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>Staff Count</div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{app.employee_count}</div>
                    </div>
                  )}
                </div>

                {/* Category full label */}
                {app.category && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>Category</div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{app.category}</div>
                  </div>
                )}

                {/* Personnel */}
                {(app.halal_coordinator || app.qa_contact || app.finance_contact) && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Key Personnel</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {app.halal_coordinator && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Halal Coordinator</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{app.halal_coordinator}</span>
                        </div>
                      )}
                      {app.qa_contact && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)' }}>QA Contact</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{app.qa_contact}</span>
                        </div>
                      )}
                      {app.finance_contact && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Finance Contact</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{app.finance_contact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scope of Certification */}
                {app.scope && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Scope of Certification</div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#334155', lineHeight: 1.6, fontStyle: 'italic' }}>
                      &ldquo;{app.scope}&rdquo;
                    </div>
                  </div>
                )}

                {/* Porcine / Intoxicants flags */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span
                    className={`badge ${app.has_porcine ? 'badge-red' : 'badge-green'}`}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    {app.has_porcine ? '⚠ Porcine Handling' : '✓ No Porcine'}
                  </span>
                  <span
                    className={`badge ${app.has_intoxicants ? 'badge-red' : 'badge-green'}`}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    {app.has_intoxicants ? '⚠ Intoxicants Used' : '✓ No Intoxicants'}
                  </span>
                </div>

                {/* Products list */}
                {app.products && app.products.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                      Products ({app.products.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                      {app.products.map((p, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-primary)', padding: '6px 10px', background: i % 2 === 0 ? '#f8fafc' : '#fff', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                          <span style={{ fontWeight: 700 }}>{p.name}</span>
                          {p.brand && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>— {p.brand}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submitted date */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>Submitted</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowApproveModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '2px solid #86efac', background: '#f0fdf4' }}>
              <div className="modal-title" style={{ color: '#166534' }}>Approve Certification Proposal</div>
              <button className="modal-close" onClick={() => setShowApproveModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Are you sure you want to approve this proposal? By approving, you agree to the estimated cost of <strong>£{Number(proposal?.estimated_cost).toFixed(2)}</strong>. This will notify HFA to issue an invoice.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowApproveModal(false)} disabled={actionSubmitting}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#16a34a' }} onClick={handleApproveProposal} disabled={actionSubmitting}>
                {actionSubmitting ? 'Approving...' : 'Yes, Approve Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowRejectModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '2px solid #fecaca', background: '#fef2f2' }}>
              <div className="modal-title" style={{ color: '#b91c1c' }}>Reject Proposal</div>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                Please tell HFA why you are rejecting this proposal so they can revise and resend it to you.
              </p>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                disabled={actionSubmitting}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)} disabled={actionSubmitting}>Cancel</button>
              <button className="btn btn-danger" style={{ background: '#dc2626' }} onClick={handleRejectProposal} disabled={actionSubmitting || !rejectReason.trim()}>
                {actionSubmitting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Shared Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={invoice}
        onSuccess={() => fetchApp(true)}
      />

      <ClientAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        audit={audit}
        onSuccess={() => fetchApp(true)}
      />

      <ClientAgreementModal
        isOpen={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        agreement={agreement}
        signatures={signatures}
        onSuccess={() => fetchApp(true)}
      />
    </div>
  );
}
