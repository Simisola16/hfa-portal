import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { Calendar, Users, AlertCircle, CheckCircle, FileText, ArrowRight, RefreshCw, Search, ShieldCheck, Clock, Download, Upload } from 'lucide-react';
import ClientAuditModal from '../components/ClientAuditModal';
import { STATUS_LABELS } from '../lib/applicationStatuses';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

const STATUS_BADGE = {
  dates_proposed: 'badge-yellow',
  dates_accepted: 'badge-blue',
  dates_rejected: 'badge-red',
  date_finalized: 'badge-purple',
  auditors_assigned: 'badge-blue',
  audit_completed: 'badge-green',
  on_hold: 'badge-red',
  scheduled: 'badge-purple',
  completed: 'badge-green',
};

const roleLabels = { lead_auditor: 'Lead Auditor', sharia_board: 'Sharia Board', audit_trainee: 'Audit Trainee', auditor: 'Auditor' };
const roleColors = {
  lead_auditor: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  sharia_board: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  audit_trainee: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  auditor: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
};

const formatProcessStatus = (s) => {
  if (!s) return 'Pending';
  const statusMap = {
    dates_proposed: 'Dates Proposed',
    dates_accepted: 'Dates Accepted',
    dates_rejected: 'Dates Rejected',
    date_finalized: 'Date Finalized',
    auditors_assigned: 'Auditors Assigned',
    audit_assigned: 'Auditors Assigned',
    audit_completed: 'Audit Completed',
    audit_successful: 'Audit Successful',
    on_hold: 'On Hold',
    pending: 'Pending',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    nc_flagged: 'NC Flagged',
    nc_closed: 'NC Closed',
    audit_report_submitted: 'Audit Report Submitted',
  };
  if (statusMap[s]) return statusMap[s];
  return s
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

export default function AuditsPage() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Shared Modal State
  const [activeModal, setActiveModal] = useState(null); // { type: 'dates' | 'nc', audit: obj, reportId?: str }

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/audits');
      setAudits(res.data || []);
    } catch (err) {
      console.error('Failed to load audits:', err);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAudits = audits.filter(a => {
    const appNum = a.applications?.application_number || a.application_id?.application_number || '';
    const compName = a.profiles?.company_name || a.sites?.name || '';
    const matchSearch = !search || 
      appNum.toLowerCase().includes(search.toLowerCase()) || 
      compName.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'all' || 
      (statusFilter === 'nc_flagged' && a.nc_reports?.some(nc => nc.status === 'flagged')) ||
      a.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="animate-fade-in">
      <div className="toolbar" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1B7A7A', marginBottom: 4 }}>Manage Audits</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            View assigned audit teams, confirm proposed dates, and resolve Non-Conformity (NC) reports.
          </p>
        </div>

        <button 
          className="btn btn-ghost btn-sm" 
          onClick={fetchData} 
          disabled={loading}
          style={{ gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by Application Ref or Company Name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, height: 40 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Status:</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ height: 40, width: 180 }}
            >
              <option value="all">All Statuses</option>
              <option value="dates_proposed">Dates Proposed</option>
              <option value="date_finalized">Date Confirmed</option>
              <option value="auditors_assigned">Auditors Assigned</option>
              <option value="nc_flagged">NC Outstanding ⚠️</option>
              <option value="audit_completed">Audit Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 20, border: '1px solid #e2e8f0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Loading your audit records...</div>
        </div>
      ) : filteredAudits.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: '50px 20px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Calendar size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>No Audits Found</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.5 }}>
            {search || statusFilter !== 'all' 
              ? 'No audit sessions match your search or filter criteria.' 
              : 'No audits yet — your audit schedule and assigned team will appear here once an application reaches the audit stage.'}
          </p>
          {(search || statusFilter !== 'all') && (
            <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {filteredAudits.map((item) => {
            const auditId = item._id || item.id;
            const appId = item.application_id?._id || item.application_id;
            const appNumber = item.applications?.application_number || item.application_id?.application_number || 'N/A';
            const companyName = item.profiles?.company_name || 'Operating Facility';
            const siteName = item.sites?.name || 'Primary Site';
            const hasNcFlagged = item.nc_reports?.some(nc => nc.status === 'flagged');

            return (
              <div 
                key={auditId} 
                className="card"
                style={{
                  borderRadius: 20,
                  border: hasNcFlagged ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  overflow: 'hidden'
                }}
              >
                {/* Header */}
                <div style={{ 
                  padding: '18px 24px', 
                  background: hasNcFlagged ? '#fff5f5' : '#f8fafc', 
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{siteName || companyName}</span>
                      <span className={`badge ${STATUS_BADGE[item.status] || 'badge-blue'}`} style={{ fontWeight: 700 }}>
                        {formatProcessStatus(item.status)}
                      </span>
                      {hasNcFlagged && (
                        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle size={12} /> Outstanding NC
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                      {companyName} &middot; <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{siteName}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {item.status === 'dates_proposed' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveModal({ type: 'dates', audit: item })}
                      >
                        Select Audit Dates
                      </button>
                    )}
                    
                    {hasNcFlagged && (
                      <button
                        className="btn btn-sm"
                        style={{ background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700 }}
                        onClick={() => setActiveModal({ type: 'nc', audit: item })}
                      >
                        Upload NC Correction
                      </button>
                    )}

                    {appId && (
                      <Link 
                        to={`/applications/${appId}/track`} 
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        Track Progress <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: '20px 24px', display: 'grid', gap: 20 }}>
                  
                  {/* Stages if Dual Stage */}
                  {item.stage > 1 && (
                    <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: 6, width: 'fit-content' }}>
                      Stage {item.stage} Session
                    </div>
                  )}

                  {/* Dates Banner */}
                  {item.finalized_date ? (
                    <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Calendar size={18} style={{ color: '#16a34a' }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#166534' }}>Confirmed Audit Date</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#14532d' }}>{new Date(item.finalized_date).toDateString()}</div>
                      </div>
                    </div>
                  ) : item.status === 'dates_proposed' ? (
                    <div style={{ padding: '12px 16px', background: '#fefce8', borderRadius: 12, border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#a16207' }}>Proposed Audit Dates Available</div>
                      <div style={{ fontSize: 12, color: '#854d0e', marginTop: 2 }}>
                        Admin proposed: {item.proposed_dates?.map(d => new Date(d).toLocaleDateString('en-GB')).join(', ')}. Please click <strong>Select Audit Dates</strong> to respond.
                      </div>
                    </div>
                  ) : item.status === 'dates_accepted' ? (
                    <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
                      <strong>Dates Selected:</strong> {item.selected_dates?.map(d => new Date(d).toLocaleDateString('en-GB')).join(' & ')}. Awaiting HFA Admin final confirmation.
                    </div>
                  ) : null}

                  {/* Assigned Audit Team */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 10 }}>
                      Assigned Audit Team ({item.auditors?.length || 0})
                    </div>

                    {item.auditors && item.auditors.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                        {item.auditors.map((aud, i) => {
                          const role = aud.role || 'lead_auditor';
                          const rc = roleColors[role] || roleColors.lead_auditor;
                          return (
                            <div key={i} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{aud.name || 'Auditor'}</div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{aud.email || 'Contact on portal'}</div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 800, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, padding: '3px 8px', borderRadius: 10 }}>
                                {roleLabels[role] || role}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        No auditors assigned to this session yet.
                      </div>
                    )}
                  </div>

                  {/* NC Reports Section if present */}
                  {item.nc_reports && item.nc_reports.length > 0 && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#b91c1c', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={14} color="#dc2626" /> Non-Conformity (NC) Reports ({item.nc_reports.length})
                      </div>

                      <div style={{ display: 'grid', gap: 10 }}>
                        {item.nc_reports.map((nc, idx) => {
                          const isCorrected = nc.status === 'corrected' || nc.status === 'closed';
                          const fileUrl = nc.document_url || nc.url;
                          const replyFileUrl = nc.correction_document_url || nc.client_response_url;

                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                padding: '14px 16px', 
                                background: isCorrected ? '#f0fdf4' : '#fff5f5', 
                                borderRadius: 12, 
                                border: `1px solid ${isCorrected ? '#bbf7d0' : '#fecaca'}`,
                                display: 'flex', flexDirection: 'column', gap: 8
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {isCorrected ? <CheckCircle size={15} color="#16a34a" /> : <AlertCircle size={15} color="#dc2626" />}
                                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: isCorrected ? '#166534' : '#b91c1c' }}>
                                    {isCorrected ? 'Closed / Resolved' : 'Action Required'}
                                  </span>
                                  {nc.flagged_at && (
                                    <span style={{ fontSize: 11, color: '#64748b' }}>&middot; {new Date(nc.flagged_at).toLocaleDateString('en-GB')}</span>
                                  )}
                                </div>

                                {!isCorrected && (
                                  <button
                                    className="btn btn-sm"
                                    style={{ background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px' }}
                                    onClick={() => setActiveModal({ type: 'nc', audit: item, reportId: nc._id || nc.id })}
                                  >
                                    <Upload size={13} /> Upload NC Correction
                                  </button>
                                )}
                              </div>

                              <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, lineHeight: 1.5 }}>
                                {nc.text || 'Non-Conformity flagged during audit inspection.'}
                              </div>

                              {fileUrl && (
                                <div>
                                  <a
                                    href={getPdfUrl(fileUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline btn-sm"
                                    style={{ color: '#dc2626', borderColor: '#fecaca', gap: 6, display: 'inline-flex', alignItems: 'center', fontSize: 11.5 }}
                                  >
                                    <Download size={13} /> View NC Report Sheet
                                  </a>
                                </div>
                              )}

                              {nc.client_response && (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#334155' }}>
                                  <div style={{ fontWeight: 700, color: '#475569', marginBottom: 2 }}>Your Response:</div>
                                  <div>{nc.client_response}</div>
                                  {replyFileUrl && (
                                    <div style={{ marginTop: 4 }}>
                                      <a href={getPdfUrl(replyFileUrl)} target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600 }}>
                                        📎 View Attached Evidence
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}

                              {nc.admin_reply && (
                                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0369a1' }}>
                                  <div style={{ fontWeight: 700, marginBottom: 2 }}>💬 HFA Response / Guidance:</div>
                                  <div>{nc.admin_reply}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Audit Modal for Date Selection or NC Upload */}
      {activeModal && (
        <ClientAuditModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          audit={activeModal.audit}
          mode={activeModal.type === 'nc' ? 'nc_upload' : 'select_dates'}
          onSuccess={() => {
            setActiveModal(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
