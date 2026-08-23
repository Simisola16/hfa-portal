import React from 'react';
import { CheckCircle, Circle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { STATUS_ORDER, STATUS_LABELS } from '../lib/applicationStatuses';

/**
 * ProcessingTimeline — Reusable vertical stepper component.
 *
 * Props:
 *   status        (string)  — current application status
 *   statusHistory (array)   — [{ status, changedAt, changedBy, note }]
 *
 * Phases 5–9 automatically get new stages by extending STATUS_ORDER in applicationStatuses.js.
 * No changes to this component needed.
 */
export default function ProcessingTimeline({ status, statusHistory = [], category = '', applicationType = '' }) {
  const isRejected = status === 'rejected';
  const isSurveillance = (applicationType || '').toLowerCase() === 'surveillance';
  const isRenewal = (applicationType || '').toLowerCase() === 'renewal' || isSurveillance;
  const isGSO = category === 'UAE/GSO Approved Halal Certification For Exporters To UAE' || isSurveillance;

  // Build a lookup from statusHistory entries for quick timestamp/note access
  const historyMap = {};
  (statusHistory || []).forEach(entry => {
    if (!historyMap[entry.status]) {
      historyMap[entry.status] = entry;
    }
  });

  // Dynamically build the list of steps to display
  const stepsToShow = [];
  stepsToShow.push('submitted');
  stepsToShow.push('under_review');

  // If application was rejected, show rejected. Otherwise, show approved.
  const appRejectedInHistory = status === 'rejected' || statusHistory.some(h => h.status === 'rejected');
  if (appRejectedInHistory) {
    stepsToShow.push('rejected');
  } else {
    stepsToShow.push('approved');
  }

  // If application is not rejected, we can show subsequent stages
  if (!appRejectedInHistory) {
    if (isRenewal) {
      // Renewal & GSO Renewal Flow:
      // Direct to Audit Scheduling after Application Accepted (No Proposal, No Pre-Audit Invoice, No Agreement)
      stepsToShow.push(
        'dates_proposed',
        'dates_accepted',
        'date_finalized',
        'audit_assigned',
        'audit_successful'
      );

      // After Audit Complete: Flag NC (if active/in history) and NC Closed
      const isNcFlagged = status === 'nc_flagged' || statusHistory.some(h => h.status === 'nc_flagged');
      if (isNcFlagged) {
        stepsToShow.push('nc_flagged');
      }

      const isNcClosedOrBeyond = status === 'nc_closed' || status === 'audit_report_submitted' || STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf('nc_closed');
      if (isNcClosedOrBeyond || isNcFlagged) {
        stepsToShow.push('nc_closed');
        // Downstream renewal/surveillance steps (Invoice -> Payment -> Logsheet -> Application Successful -> Letter / Certificate)
        if (status !== 'on_hold') {
          stepsToShow.push(
            'invoice_sent',
            'payment_received',
            'logsheet_created',
            'logsheet_signed',
            'application_successful',
            'certificate_issued'
          );
        }
      }
    } else {
      // Non-Renewal (Initial) flow:
      stepsToShow.push('proposal_sent');

      const proposalRejectedInHistory = status === 'proposal_rejected' || statusHistory.some(h => h.status === 'proposal_rejected');
      const proposalApprovedInHistory = status === 'proposal_approved' || STATUS_ORDER.indexOf(status) > STATUS_ORDER.indexOf('proposal_approved');

      if (status === 'proposal_rejected') {
        stepsToShow.push('proposal_rejected');
      } else if (proposalApprovedInHistory) {
        stepsToShow.push('proposal_approved');
      } else {
        // If proposal is sent but not decided, show proposal_approved as target
        stepsToShow.push('proposal_approved');
      }

      // Rest of the flow
      const restFlow = [
        'invoice_sent',
        'payment_received',
        'dates_proposed',
        'dates_accepted',
        'date_finalized',
        'audit_assigned',
        'audit_successful',
      ];
      stepsToShow.push(...restFlow);

      // After Audit Complete: Flag NC (if active/in history) and NC Closed
      const isNcFlagged = status === 'nc_flagged' || statusHistory.some(h => h.status === 'nc_flagged');
      if (isNcFlagged) {
        stepsToShow.push('nc_flagged');
      }

      const isNcClosedOrBeyond = status === 'nc_closed' || status === 'audit_report_submitted' || STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf('nc_closed');
      if (isNcClosedOrBeyond || isNcFlagged) {
        stepsToShow.push('nc_closed');
      }

      // If currently on hold, don't show downstream steps as pending. If NOT on hold, show normal flow.
      if (status !== 'on_hold') {
        const downstreamSteps = [
          'application_successful',
          'agreement_sent',
          'agreement_signed',
          'agreement_finalised',
          'final_invoice_sent',
          'final_invoice_paid',
          'ready_for_certificate',
          'certificate_issued'
        ];
        stepsToShow.push(...downstreamSteps);
      }
    }
  }

  const getStepLabel = (stepKey) => {
    if (isSurveillance) {
      if (stepKey === 'submitted') return 'Surveillance Application Submitted';
      if (stepKey === 'approved') return 'Surveillance Application Accepted';
      if (stepKey === 'invoice_sent') return 'Surveillance Invoice Received';
      if (stepKey === 'payment_received') return 'Surveillance Payment Confirmed';
      if (stepKey === 'ready_for_certificate' || stepKey === 'application_successful') return 'Application Successful';
      if (stepKey === 'certificate_issued') return 'Surveillance Letter Issued';
    }
    if (isRenewal) {
      if (stepKey === 'submitted') return 'Renewal Application Submitted';
      if (stepKey === 'approved') return 'Renewal Application Accepted';
      if (stepKey === 'invoice_sent') return 'Renewal Invoice Received';
      if (stepKey === 'payment_received') return 'Renewal Payment Confirmed';
      if (stepKey === 'ready_for_certificate' || stepKey === 'application_successful') return 'Application Successful';
      if (stepKey === 'certificate_issued') return 'Certificate Issued';
    }
    return STATUS_LABELS[stepKey] || stepKey.replace(/_/g, ' ');
  };

  const normStatus = (status || 'submitted').toLowerCase().replace(/ /g, '_');
  let effectiveStatus = (normStatus === 'audit_completed') ? 'audit_successful' : normStatus;
  if (normStatus === 'dates_rejected') effectiveStatus = 'dates_proposed';
  if (normStatus === 'audit_report_submitted') effectiveStatus = 'nc_closed';
  
  // Helper to map status to step index in stepsToShow
  const getStepIndex = (st) => {
    let s = (st || '').toLowerCase().replace(/ /g, '_');
    if (s === 'audit_completed') s = 'audit_successful';
    if (s === 'dates_rejected') s = 'dates_proposed';
    if (s === 'audit_report_submitted') s = 'nc_closed';
    if (s === 'ready_for_certificate' && stepsToShow.includes('application_successful')) s = 'application_successful';
    if (s === 'application_successful' && stepsToShow.includes('ready_for_certificate')) s = 'ready_for_certificate';
    return stepsToShow.indexOf(s);
  };

  let maxStepIdx = getStepIndex(effectiveStatus);

  (statusHistory || []).forEach(h => {
    const idx = getStepIndex(h.status);
    if (idx > maxStepIdx) {
      maxStepIdx = idx;
    }
  });

  let currentIndex = maxStepIdx;

  // Fallback if status is not in stepsToShow: find nearest preceding step in STATUS_ORDER
  if (currentIndex === -1) {
    const currentOrderIdx = STATUS_ORDER.indexOf(effectiveStatus);
    if (currentOrderIdx !== -1) {
      for (let i = stepsToShow.length - 1; i >= 0; i--) {
        const stepOrder = STATUS_ORDER.indexOf(stepsToShow[i]);
        if (stepOrder !== -1 && stepOrder <= currentOrderIdx) {
          currentIndex = i;
          break;
        }
      }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {stepsToShow.map((s, idx) => {
        const histEntry = historyMap[s] || 
          (s === 'dates_proposed' ? (historyMap['dates_rejected'] || historyMap['dates_proposed']) : null) ||
          (s === 'audit_successful' ? (historyMap['audit_completed'] || historyMap['audit_successful']) : null) ||
          (s === 'nc_closed' ? (historyMap['nc_closed'] || historyMap['audit_report_submitted']) : null) ||
          (s === 'application_successful' ? (historyMap['application_successful'] || historyMap['ready_for_certificate']) : null) ||
          (s === 'ready_for_certificate' ? (historyMap['ready_for_certificate'] || historyMap['application_successful']) : null);
        
        let isComplete = false;
        let isCurrent = false;
        let isPending = false;

        if (currentIndex !== -1) {
          isComplete = currentIndex > idx;
          isCurrent = currentIndex === idx;
          isPending = currentIndex < idx;
        } else {
          const stepOrderIdx = STATUS_ORDER.indexOf(s);
          const currentOrderIdx = STATUS_ORDER.indexOf(effectiveStatus);
          isComplete = stepOrderIdx < currentOrderIdx;
          isCurrent = stepOrderIdx === currentOrderIdx;
          isPending = stepOrderIdx > currentOrderIdx;
        }

        // Special handling for rejected step
        const isRejectedStep = s === 'rejected' || s === 'proposal_rejected';
        const isDatesRejectedStep = s === 'dates_proposed' && (status === 'dates_rejected' || historyMap['dates_rejected']);

        let dotBg = '#f1f5f9';
        let dotBorder = '#cbd5e1';
        let dotColor = '#94a3b8';
        let labelColor = 'var(--text-muted)';
        let IconComponent = Circle;

        if (isDatesRejectedStep) {
          dotBg = '#fef2f2';
          dotBorder = '#dc2626';
          dotColor = '#dc2626';
          labelColor = '#dc2626';
          IconComponent = XCircle;
        } else if (isRejectedStep && (isComplete || isCurrent)) {
          dotBg = '#fef2f2';
          dotBorder = '#dc2626';
          dotColor = '#dc2626';
          labelColor = '#dc2626';
          IconComponent = XCircle;
        } else if (isComplete) {
          dotBg = '#16a34a';
          dotBorder = '#16a34a';
          dotColor = '#ffffff';
          labelColor = 'var(--text-primary)';
          IconComponent = CheckCircle;
        } else if (isCurrent) {
          dotBg = '#2563eb';
          dotBorder = '#2563eb';
          dotColor = '#ffffff';
          labelColor = 'var(--text-primary)';
          IconComponent = Circle;
        }

        const isLast = idx === stepsToShow.length - 1;

        return (
          <div key={s} style={{ display: 'flex', position: 'relative' }}>
            {/* Left connector line and dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
              {/* Dot */}
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: dotBg,
                border: `2px solid ${dotBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: dotColor,
                zIndex: 2,
                boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none',
                transition: 'all 0.2s',
              }}>
                {isComplete ? (
                  <CheckCircle size={14} />
                ) : isDatesRejectedStep ? (
                  <XCircle size={14} />
                ) : isCurrent ? (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }} />
                )}
              </div>

              {/* Line connector */}
              {!isLast && (
                <div style={{
                  width: 2,
                  flexGrow: 1,
                  background: isComplete ? '#16a34a' : '#e2e8f0',
                  margin: '4px 0',
                  minHeight: 28,
                }} />
              )}
            </div>

            {/* Right content */}
            <div style={{
              marginLeft: 12,
              paddingBottom: isLast ? 0 : 24,
              flex: 1,
              paddingTop: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: isCurrent ? 800 : isComplete ? 700 : 500,
                  color: labelColor,
                }}>
                  {isDatesRejectedStep
                    ? 'Audit Dates Rejected'
                    : (s === 'logsheet_created' && isGSO
                      ? 'Waiting for Shari\'a Board Approval'
                      : getStepLabel(s))}
                </span>
                {isCurrent && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', 
                    color: isDatesRejectedStep ? '#dc2626' : '#1d4ed8',
                    background: isDatesRejectedStep ? '#fef2f2' : '#eff6ff', 
                    border: `1px solid ${isDatesRejectedStep ? '#fca5a5' : '#bfdbfe'}`, 
                    padding: '2px 8px', borderRadius: 20,
                  }}>
                    {isDatesRejectedStep ? 'Dates Rejected' : 'Current'}
                  </span>
                )}
              </div>

              {(isComplete || isCurrent) && histEntry && (
                <div style={{ marginTop: 4 }}>
                  {histEntry.changedAt && (
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />
                      {formatDate(histEntry.changedAt)}
                    </div>
                  )}
                  {histEntry.note && histEntry.note !== 'Application submitted by client.' && (
                    <div style={{
                      marginTop: 4, fontSize: 12, color: isRejectedStep && isRejected ? '#991b1b' : '#475569',
                      fontStyle: 'italic',
                      background: isRejectedStep && isRejected ? '#fef2f2' : '#f8fafc',
                      padding: '4px 10px', borderRadius: 6,
                      borderLeft: `3px solid ${isRejectedStep && isRejected ? '#fca5a5' : '#cbd5e1'}`,
                    }}>
                      {histEntry.note}
                    </div>
                  )}
                </div>
              )}

              {isPending && (
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Pending</div>
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
