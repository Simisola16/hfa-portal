import React from 'react';
import { Calendar, Users, Lock, AlertCircle, CheckCircle, FileText } from 'lucide-react';

export default function AuditCard({ audit, status, onSelectDatesClick, onNcResolve }) {
  const normStatus = (status || '').toLowerCase().replace(/ /g, '_');
  const isAvailable = ['invoice_sent', 'payment_received', 'dates_proposed', 'dates_accepted', 'date_finalized', 'audit_assigned', 'audit_report_submitted', 'logsheet_created', 'logsheet_signed', 'agreement_sent', 'agreement_signed', 'certificate_issued'].includes(normStatus) || audit;

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Audit &amp; Schedule Details (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once invoice is sent</div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center' }}>
        <Calendar size={28} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>Audit Schedule Pending</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>The HFA team is preparing proposed dates for your audit session.</div>
      </div>
    );
  }

  const roleLabels = { lead_auditor: 'Lead Auditor', sharia_board: 'Sharia Board', audit_trainee: 'Audit Trainee' };
  const roleColors = {
    lead_auditor: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    sharia_board: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    audit_trainee: { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  };

  const hasNcReports = audit.nc_reports && audit.nc_reports.length > 0;
  const showNcSection = ['auditors_assigned', 'audit_completed'].includes(audit.status);

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      {/* Card Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} style={{ color: '#1d4ed8' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Assigned Audit Team</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status: <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{audit.status.replace(/_/g, ' ')}</span></div>
          </div>
        </div>
        {audit.status === 'dates_proposed' && (
          <button className="btn btn-primary btn-sm" onClick={onSelectDatesClick}>
            Select Dates
          </button>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '20px 24px' }}>
        {/* Date Section */}
        {audit.finalized_date ? (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} style={{ color: '#15803d' }} />
            <span style={{ fontSize: 14, color: '#15803d', fontWeight: 700 }}>Confirmed Audit Date: {new Date(audit.finalized_date).toDateString()}</span>
          </div>
        ) : audit.status === 'dates_proposed' ? (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fefce8', borderRadius: 10, border: '1px solid #fde68a' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a16207' }}>Proposed Audit Dates Available</div>
            <div style={{ fontSize: 11, color: '#a16207', marginTop: 2 }}>Please choose exactly 2 options that suit you.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {audit.proposed_dates?.map((d, idx) => (
                <span key={idx} style={{ fontSize: 11, background: '#fff', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 6, color: '#854d0e', fontWeight: 600 }}>{new Date(d).toLocaleDateString()}</span>
              ))}
            </div>
          </div>
        ) : audit.status === 'dates_accepted' ? (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 12, color: '#166534' }}>
            <strong>Selected Dates:</strong> {audit.selected_dates?.map(d => new Date(d).toLocaleDateString()).join(' and ')}. Awaiting HFA admin to confirm the final date.
          </div>
        ) : (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, color: '#64748b' }}>
            Dates proposed will show here.
          </div>
        )}

        {/* Auditors Section */}
        {audit.auditors && audit.auditors.length > 0 ? (
          <div style={{ display: 'grid', gap: 10, marginBottom: showNcSection ? 20 : 0 }}>
            {audit.auditors.map((a, i) => {
              const rc = roleColors[a.role] || roleColors.audit_trainee;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{a.name}</div>
                    {a.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.email} {a.contact_number ? `• ${a.contact_number}` : ''}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {a.role && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, padding: '3px 10px', borderRadius: 12 }}>
                        {roleLabels[a.role] || a.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0', marginBottom: showNcSection ? 20 : 0 }}>
            No auditors assigned to this session yet.
          </div>
        )}

        {/* ── NC Reports Section ── */}
        {showNcSection && (
          <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: 20 }}>
            <div style={{
              fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
              color: hasNcReports ? '#b91c1c' : '#64748b',
              marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <AlertCircle size={14} style={{ color: hasNcReports ? '#dc2626' : '#94a3b8' }} />
              Non-Conformity (NC) Reports
            </div>

            {hasNcReports ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {audit.nc_reports.map((nc, i) => {
                  const isCorrected = nc.status === 'corrected';
                  return (
                    <div
                      key={i}
                      style={{
                        background: isCorrected ? '#f0fdf4' : '#fef2f2',
                        border: `1.5px solid ${isCorrected ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: 14, padding: '14px 16px',
                      }}
                    >
                      {/* NC Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isCorrected
                            ? <CheckCircle size={14} style={{ color: '#16a34a' }} />
                            : <AlertCircle size={14} style={{ color: '#dc2626' }} />
                          }
                          <span style={{
                            fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                            color: isCorrected ? '#166534' : '#b91c1c'
                          }}>
                            {isCorrected ? 'Corrected' : '⚠ Outstanding NC'}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                          {new Date(nc.flagged_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      {/* NC Description */}
                      <p style={{ fontSize: 13, margin: '0 0 12px 0', color: '#334155', lineHeight: 1.5 }}>
                        {nc.text}
                      </p>

                      {/* Actions Row */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {nc.document_url && (
                          <a
                            href={nc.document_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, background: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <FileText size={11} /> View Document
                          </a>
                        )}
                        {!isCorrected && onNcResolve && (
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: 11, padding: '5px 14px', borderRadius: 20,
                              background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              if (window.confirm('Have you resolved this Non-Conformity? This will notify HFA Admin.')) {
                                onNcResolve(audit._id || audit.id, nc._id || nc.id);
                              }
                            }}
                          >
                            Mark as Corrected
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '16px 12px',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 12, color: '#166534', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
                <CheckCircle size={14} style={{ color: '#16a34a' }} />
                No NC reports — clean audit session
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
