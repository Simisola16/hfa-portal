import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, Clock, FileText, Building2,
  Calendar, ShieldCheck, MapPin, Phone, Mail, User,
  Award, Download, AlertCircle, RefreshCw, Eye
} from 'lucide-react';

const CLIENT_STAGES = [
  { key: 'submitted', title: 'Submit Extension Form', desc: 'Extension form submitted to certification committee' },
  { key: 'under_review_1', title: 'Under Review', desc: 'Initial review of facility justification and audit history' },
  { key: 'under_review_2', title: 'Under Review', desc: 'Executive committee evaluation & signature processing' },
  { key: 'extension_approved', title: 'Extension Certificate Approve', desc: 'Certificate approved and updated validity issued' }
];

export default function ClientExtensionTrack() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApp = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get(`/api/extension-applications/${id}`);
      setApp(res.data?.data || res.data);
    } catch (err) {
      console.error('Error fetching extension application:', err);
      toast.error('Failed to load application details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApp();
  }, [id]);

  // Determine stage progress (1 to 4)
  const getStageIndex = () => {
    if (!app) return 1;
    const s = app.status;
    if (s === 'extension_approved') return 4;
    if (s === 'waiting_signature') return 3;
    if (s === 'under_review' || s === 'logsheet_created') return 2;
    return 1; // submitted
  };

  const currentStage = getStageIndex();
  const isApproved = app?.status === 'extension_approved';
  const isRejected = app?.status === 'rejected';

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #dcfce7', borderTop: '3px solid #008744', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Loading extension status...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontFamily: 'Inter, sans-serif' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Application Not Found</h2>
        <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>The requested extension application could not be found.</p>
        <Link to="/extension-applications" style={{ display: 'inline-block', marginTop: 16, color: '#008744', fontWeight: 600 }}>
          ← Back to Extension Applications
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60, fontFamily: 'Inter, "Segoe UI", sans-serif' }}>
      
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button
          onClick={() => navigate('/extension-applications')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#475569',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: 0
          }}
        >
          <ArrowLeft size={16} /> Back to Extension Applications
        </button>

        <button
          onClick={() => fetchApp(true)}
          disabled={refreshing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'white', border: '1px solid #e2e8f0', color: '#475569',
            padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh Status
        </button>
      </div>

      {/* ── Main Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 20, padding: '28px 32px', color: 'white', marginBottom: 28,
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                background: 'rgba(0, 200, 83, 0.2)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)',
                padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em'
              }}>
                EXTENSION APPLICATION
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                Submitted on {new Date(app.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              {app.site_name}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: '#cbd5e1' }}>
              Application Reference: <strong style={{ color: 'white' }}>{app.application_number}</strong>
            </p>
          </div>

          <div>
            {isApproved ? (
              <div style={{
                background: '#059669', color: 'white', padding: '8px 16px', borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13
              }}>
                <CheckCircle size={16} /> Extension Approved
              </div>
            ) : isRejected ? (
              <div style={{
                background: '#dc2626', color: 'white', padding: '8px 16px', borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13
              }}>
                <AlertCircle size={16} /> Rejected
              </div>
            ) : (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white', padding: '8px 16px', borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13
              }}>
                <Clock size={16} color="#fbbf24" /> Under Review
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Grid (Left: Details & Actions, Right: Processing Stage Timeline) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 380px',
        gap: 24,
        alignItems: 'start'
      }}>

        {/* ── Left Column: Submission Details & Action Panels ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Approved Certificate Banner (If Approved) */}
          {isApproved && (
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              borderRadius: 16, padding: '24px 28px', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Award size={26} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Extension Certificate Issued</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.95 }}>
                    Certificate: <strong>{app.certificate_number || 'EXT-CERT'}</strong> • Extended Valid Until: <strong>{app.extended_until ? new Date(app.extended_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Active'}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/certificates')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'white', color: '#047857', border: 'none',
                  padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                <Award size={16} /> View Certificate
              </button>
            </div>
          )}

          {/* Rejection Notice (If Rejected) */}
          {isRejected && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 16, padding: 24,
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#991b1b' }}>
                    Extension Request Rejected
                  </h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>
                    {app.rejection_reason || 'Your extension request could not be approved by the committee at this time. Please contact support or your account manager for further assistance.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submission Details Card */}
          <div style={{
            background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
            padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Submitted Request Details
              </h3>
              <span style={{ fontSize: 11.5, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: 10, fontWeight: 700 }}>
                {app.company_name || 'Client Request'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Site Name</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{app.site_name}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Person</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{app.contact_person}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Email</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{app.contact_email}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Number</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{app.contact_phone}</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Description &amp; Justification
              </div>
              <div style={{
                background: '#f8fafc', padding: '16px 18px', borderRadius: 10, border: '1px solid #f1f5f9',
                fontSize: 13.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap'
              }}>
                {app.description}
              </div>
            </div>
          </div>

          {/* Application Summary Card */}
          <div style={{
            background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
            padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
              Application Metadata
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Reference</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{app.application_number}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Submitted Date</div>
                <div style={{ fontSize: 13, color: '#0f172a', marginTop: 2 }}>{new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Scheme</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#008744', marginTop: 2 }}>HFA Standard Scheme</div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right Column: Processing Stage Timeline (Matching Application Processing UI) ── */}
        <div style={{
          background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
          padding: '24px 26px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          position: 'sticky', top: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Processing Stage
              </h2>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                Live certification progress
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
              color: isApproved ? '#059669' : (isRejected ? '#dc2626' : '#008744'),
              background: isApproved ? '#ecfdf5' : (isRejected ? '#fef2f2' : '#f0fdf4'),
              border: `1px solid ${isApproved ? '#a7f3d0' : (isRejected ? '#fca5a5' : '#bbf7d0')}`,
              padding: '3px 8px', borderRadius: 12
            }}>
              {isApproved ? 'Approved' : (isRejected ? 'Rejected' : 'In Progress')}
            </span>
          </div>

          <div style={{ padding: '6px 0 0' }}>
            {(() => {
              const historyMap = {};
              (app.statusHistory || []).forEach(entry => {
                if (entry.status && !historyMap[entry.status]) {
                  historyMap[entry.status] = entry;
                }
              });

              // Map steps for Extension Applications
              const steps = [
                {
                  key: 'submitted',
                  title: 'Application Submitted',
                  defaultNote: 'Extension form submitted by client.',
                  matchStatuses: ['submitted'],
                  order: 1
                },
                {
                  key: 'under_review',
                  title: 'Under Review',
                  defaultNote: 'Initial review of facility justification and audit history.',
                  matchStatuses: ['under_review', 'logsheet_created'],
                  order: 2
                },
                {
                  key: 'waiting_signature',
                  title: 'Under Review',
                  defaultNote: 'Extension logsheet under evaluation and signatory approval.',
                  matchStatuses: ['waiting_signature', 'logsheet_signed'],
                  order: 3
                },
                {
                  key: 'extension_approved',
                  title: 'Extension Certificate Approved',
                  defaultNote: app.certificate_number ? `Certificate approved and issued (${app.certificate_number}).` : 'Certificate approved and updated validity issued.',
                  matchStatuses: ['extension_approved'],
                  order: 4
                }
              ];

              if (isRejected) {
                steps.push({
                  key: 'rejected',
                  title: 'Application Rejected',
                  defaultNote: app.rejection_reason || 'Extension request rejected by committee.',
                  matchStatuses: ['rejected'],
                  order: 5
                });
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

              return steps.map((stg, idx) => {
                const isLast = idx === steps.length - 1;
                const isStepCompleted = isApproved
                  ? true
                  : (isRejected && stg.key === 'rejected')
                    ? false
                    : stg.order < currentStage;

                const isStepCurrent = isApproved
                  ? false
                  : (isRejected && stg.key === 'rejected')
                    ? true
                    : stg.order === currentStage;

                const isStepPending = isApproved
                  ? false
                  : isRejected
                    ? (stg.key !== 'rejected' && stg.order > currentStage)
                    : stg.order > currentStage;

                let histEntry = null;
                for (const ms of stg.matchStatuses) {
                  if (historyMap[ms]) {
                    histEntry = historyMap[ms];
                    break;
                  }
                }

                const timestamp = histEntry?.changedAt || (stg.key === 'submitted' ? app.created_at : null);
                const noteText = histEntry?.note || (isStepCompleted || isStepCurrent ? stg.defaultNote : null);

                let circleBg = '#f1f5f9';
                let circleBorder = '#e2e8f0';
                let lineColor = isStepCompleted ? '#86efac' : '#e2e8f0';

                if (isStepCompleted) {
                  circleBg = '#008744';
                  circleBorder = '#008744';
                } else if (isStepCurrent) {
                  if (isRejected && stg.key === 'rejected') {
                    circleBg = '#dc2626';
                    circleBorder = '#dc2626';
                  } else {
                    circleBg = '#008744';
                    circleBorder = '#008744';
                  }
                }

                return (
                  <div key={stg.key} style={{ display: 'flex', alignItems: 'flex-start' }}>
                    {/* Left: Indicator Icon & Connecting Line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 34, flexShrink: 0 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: circleBg,
                        border: isStepCurrent
                          ? `3px solid ${isRejected ? '#dc2626' : '#008744'}`
                          : `2px solid ${circleBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isStepCurrent
                          ? `0 0 0 4px ${isRejected ? 'rgba(220, 38, 38, 0.18)' : 'rgba(0, 135, 68, 0.18)'}`
                          : 'none',
                        position: 'relative', zIndex: 1, flexShrink: 0
                      }}>
                        {isStepCompleted ? (
                          <CheckCircle size={16} color="white" strokeWidth={2.5} />
                        ) : isStepCurrent ? (
                          isRejected && stg.key === 'rejected' ? (
                            <AlertCircle size={16} color="white" />
                          ) : (
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white', animation: 'pulse 1.5s ease-in-out infinite' }} />
                          )
                        ) : (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />
                        )}
                      </div>

                      {!isLast && (
                        <div style={{
                          width: 2, flex: 1, minHeight: 44,
                          background: lineColor,
                          margin: '2px 0'
                        }} />
                      )}
                    </div>

                    {/* Right: Step Details */}
                    <div style={{
                      marginLeft: 12,
                      paddingBottom: isLast ? 4 : 20,
                      flex: 1,
                      paddingTop: 3
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 13.5,
                          fontWeight: isStepCompleted || isStepCurrent ? 700 : 500,
                          color: isStepPending ? '#94a3b8' : (isRejected && stg.key === 'rejected' ? '#991b1b' : '#0f172a')
                        }}>
                          {stg.title}
                        </span>

                        {isStepCurrent && !isApproved && (
                          <span style={{
                            fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                            color: isRejected ? '#dc2626' : '#008744',
                            background: isRejected ? '#fef2f2' : '#f0fdf4',
                            border: `1px solid ${isRejected ? '#fca5a5' : '#bbf7d0'}`,
                            padding: '1px 6px', borderRadius: 12
                          }}>
                            {isRejected ? 'Rejected' : 'Current'}
                          </span>
                        )}
                      </div>

                      {(isStepCompleted || isStepCurrent) && (
                        <>
                          {timestamp && (
                            <div style={{
                              fontSize: 11.5, color: '#64748b',
                              display: 'flex', alignItems: 'center', gap: 4,
                              marginTop: 3
                            }}>
                              <Clock size={11} color="#64748b" />
                              <span>{formatDate(timestamp)}</span>
                            </div>
                          )}

                          {noteText && (
                            <div style={{
                              marginTop: 6,
                              padding: '7px 11px',
                              background: isRejected && stg.key === 'rejected' ? '#fef2f2' : '#f8fafc',
                              borderRadius: 7,
                              border: `1px solid ${isRejected && stg.key === 'rejected' ? '#fecaca' : '#f1f5f9'}`,
                              fontSize: 12,
                              fontStyle: 'italic',
                              color: isRejected && stg.key === 'rejected' ? '#991b1b' : '#475569',
                              lineHeight: 1.45
                            }}>
                              {noteText}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </div>

    </div>
  );
}

