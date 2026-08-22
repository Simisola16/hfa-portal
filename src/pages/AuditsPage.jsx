import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Search, RefreshCw, AlertTriangle, CheckCircle2, Clock, 
  FileText, Download, ChevronRight, ChevronDown, User, MapPin, 
  ExternalLink, MessageSquare, AlertCircle, Eye, ShieldCheck
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ClientAuditModal from '../components/ClientAuditModal';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';
    return `${API_URL}${url}`;
  }
  return url;
};

const AUDIT_STATUS_MAP = {
  dates_proposed: { label: 'Dates Proposed', badge: 'badge-yellow', bg: '#fef3c7', text: '#92400e' },
  dates_accepted: { label: 'Dates Selected', badge: 'badge-blue', bg: '#e0f2fe', text: '#0369a1' },
  dates_rejected: { label: 'Dates Rejected', badge: 'badge-red', bg: '#fee2e2', text: '#b91c1c' },
  date_finalized: { label: 'Date Finalized', badge: 'badge-green', bg: '#dcfce7', text: '#15803d' },
  audit_assigned: { label: 'Scheduled', badge: 'badge-green', bg: '#dcfce7', text: '#15803d' },
  in_progress: { label: 'Audit In Progress', badge: 'badge-blue', bg: '#e0f2fe', text: '#0369a1' },
  nc_flagged: { label: 'NC Flagged', badge: 'badge-red', bg: '#fee2e2', text: '#b91c1c' },
  nc_corrected: { label: 'NC Under Review', badge: 'badge-yellow', bg: '#fef3c7', text: '#92400e' },
  nc_closed: { label: 'NC Resolved', badge: 'badge-green', bg: '#dcfce7', text: '#15803d' },
  audit_completed: { label: 'Audit Completed', badge: 'badge-green', bg: '#dcfce7', text: '#15803d' },
  completed: { label: 'Audit Completed', badge: 'badge-green', bg: '#dcfce7', text: '#15803d' },
  audit_successful: { label: 'Audit Successful', badge: 'badge-green', bg: '#dcfce7', text: '#15803d' },
  scheduled: { label: 'Scheduled', badge: 'badge-blue', bg: '#e0f2fe', text: '#0369a1' },
};

export default function AuditsPage() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  // Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [modalMode, setModalMode] = useState('select_dates'); // 'select_dates' | 'nc_upload'
  const [selectedReportId, setSelectedReportId] = useState(null);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/audits');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setAudits(list);
    } catch (err) {
      toast.error('Failed to load audits');
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  // Derived statistics
  const actionRequiredAudits = audits.filter(a => {
    const hasNc = a.nc_reports?.some(nc => nc.status === 'flagged');
    const needsDateSelection = a.status === 'dates_proposed';
    return hasNc || needsDateSelection;
  });

  const scheduledAudits = audits.filter(a => 
    ['audit_assigned', 'date_finalized', 'scheduled', 'dates_accepted'].includes(a.status)
  );

  const completedAudits = audits.filter(a => 
    ['audit_completed', 'completed', 'audit_successful', 'nc_closed'].includes(a.status)
  );

  // Filtered List
  const filteredAudits = audits.filter(a => {
    const q = search.toLowerCase();
    const siteName = (a.site_name || a.sites?.name || a.application_id?.site_name || a.application_id?.establishment_name || '').toLowerCase();
    const appNum = (a.application_id?.application_number || a.applications?.application_number || '').toLowerCase();
    const auditorNames = (a.auditors?.map(aud => aud.name).join(' ') || a.inspectors?.full_name || '').toLowerCase();
    const auditType = (a.audit_type || '').toLowerCase();

    const matchSearch = !search || siteName.includes(q) || appNum.includes(q) || auditorNames.includes(q) || auditType.includes(q);

    if (!matchSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'action_required') {
      return a.status === 'dates_proposed' || a.nc_reports?.some(nc => nc.status === 'flagged');
    }
    if (statusFilter === 'dates_proposed') return a.status === 'dates_proposed';
    if (statusFilter === 'scheduled') {
      return ['audit_assigned', 'date_finalized', 'scheduled', 'dates_accepted'].includes(a.status);
    }
    if (statusFilter === 'nc') {
      return a.status === 'nc_flagged' || a.nc_reports?.length > 0;
    }
    if (statusFilter === 'completed') {
      return ['audit_completed', 'completed', 'audit_successful'].includes(a.status);
    }

    return true;
  });

  const openSelectDatesModal = (audit) => {
    setSelectedAudit(audit);
    setModalMode('select_dates');
    setSelectedReportId(null);
    setModalOpen(true);
  };

  const openNcModal = (audit, reportId = null) => {
    setSelectedAudit(audit);
    setModalMode('nc_upload');
    setSelectedReportId(reportId);
    setModalOpen(true);
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={28} style={{ color: 'var(--primary)' }} /> Halal Audit Management
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          Manage your audit schedules, select proposed dates, and review or submit Non-Conformity (NC) resolution reports.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Total Audits</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>{audits.length}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Facility inspections & surveillance</div>
        </div>

        <div className="stat-card" style={{ background: actionRequiredAudits.length > 0 ? '#fef2f2' : '#fff', border: actionRequiredAudits.length > 0 ? '1.5px solid #fecaca' : '1px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: actionRequiredAudits.length > 0 ? '#dc2626' : '#64748b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
            {actionRequiredAudits.length > 0 && <AlertTriangle size={14} />} Action Required
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: actionRequiredAudits.length > 0 ? '#b91c1c' : '#0f172a', marginTop: 6 }}>
            {actionRequiredAudits.length}
          </div>
          <div style={{ fontSize: 12, color: actionRequiredAudits.length > 0 ? '#dc2626' : '#94a3b8', marginTop: 4 }}>
            {actionRequiredAudits.length > 0 ? 'Dates to choose or NCs to resolve' : 'All clear — No pending actions'}
          </div>
        </div>

        <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#0284c7', letterSpacing: '0.05em' }}>Scheduled / Confirmed</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0369a1', marginTop: 6 }}>{scheduledAudits.length}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Upcoming site inspections</div>
        </div>

        <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.05em' }}>Completed Audits</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d', marginTop: 6 }}>{completedAudits.length}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Successfully conducted</div>
        </div>
      </div>

      {/* Urgent Action Banner if any NCs or Proposed Dates */}
      {actionRequiredAudits.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
          border: '1.5px solid #fca5a5',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#dc2626', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#991b1b' }}>
                You have {actionRequiredAudits.length} audit{actionRequiredAudits.length > 1 ? 's' : ''} requiring your immediate response
              </div>
              <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>
                Please select your preferred dates or submit your Non-Conformity (NC) corrective action document to prevent certification delays.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-primary"
            style={{ background: '#dc2626', borderColor: '#dc2626', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '8px 16px' }}
            onClick={() => setStatusFilter('action_required')}
          >
            View Pending Actions
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder="Search by site, application number, auditor..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <select 
          className="form-control w-auto" 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Audits</option>
          <option value="action_required">⚠️ Action Required</option>
          <option value="dates_proposed">Dates Proposed</option>
          <option value="scheduled">Scheduled / Finalized</option>
          <option value="nc">Non-Conformity (NC)</option>
          <option value="completed">Completed</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={fetchAudits} title="Refresh audits">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Audits Card / Table */}
      <div className="card" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div className="card-header" style={{ padding: '20px 24px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title" style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              My Halal Audits ({filteredAudits.length})
            </div>
            <div className="card-subtitle" style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Audit schedule history and corrective action tracking
            </div>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filteredAudits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Calendar size={48} color="#94a3b8" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 6 }}>No Audits Found</h4>
              <p style={{ fontSize: 13, color: '#64748b', maxWidth: 400, margin: '0 auto' }}>
                {search || statusFilter !== 'all' 
                  ? 'No audits matched your search filters. Try clearing search criteria.' 
                  : 'Audits will appear here once scheduled for your halal applications.'}
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Facility / Site</th>
                  <th>Application Ref</th>
                  <th>Audit Stage</th>
                  <th>Schedule / Date</th>
                  <th>Lead Auditor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.map(audit => {
                  const auditId = audit._id || audit.id;
                  const isExpanded = expandedAuditId === auditId;
                  const siteStr = audit.site_name || audit.sites?.name || audit.application_id?.site_name || audit.application_id?.establishment_name || 'Manufacturing Site';
                  const appNum = audit.application_id?.application_number || audit.applications?.application_number || '—';
                  const stageStr = `Stage ${audit.stage || 1} Audit (${audit.audit_type || 'Initial'})`;
                  const auditorsList = audit.auditors?.length > 0 
                    ? audit.auditors.map(a => a.name).join(', ') 
                    : (audit.inspectors?.full_name || 'Assigned by HFA');

                  const hasFlaggedNc = audit.nc_reports?.some(nc => nc.status === 'flagged');
                  const hasNc = audit.nc_reports && audit.nc_reports.length > 0;
                  const needsDateResponse = audit.status === 'dates_proposed';
                  const statusInfo = AUDIT_STATUS_MAP[audit.status] || { label: audit.status ? audit.status.replace(/_/g, ' ') : 'Scheduled', badge: 'badge-blue' };

                  const displayDate = audit.finalized_date 
                    ? new Date(audit.finalized_date).toLocaleDateString('en-GB')
                    : (audit.scheduled_date 
                      ? new Date(audit.scheduled_date).toLocaleDateString('en-GB')
                      : (audit.proposed_dates?.length > 0 ? `${audit.proposed_dates.length} Dates Proposed` : 'TBD'));

                  return (
                    <React.Fragment key={auditId}>
                      <tr 
                        style={{ 
                          background: isExpanded ? '#f8fafc' : (hasFlaggedNc || needsDateResponse ? '#fffdfa' : 'inherit'),
                          cursor: 'pointer',
                          borderLeft: hasFlaggedNc ? '4px solid #dc2626' : (needsDateResponse ? '4px solid #f59e0b' : 'none')
                        }}
                        onClick={() => setExpandedAuditId(isExpanded ? null : auditId)}
                      >
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <span>{siteStr}</span>
                          </div>
                          {audit.application_id?.category && (
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, marginLeft: 20 }}>
                              Category: {audit.application_id.category}
                            </div>
                          )}
                        </td>

                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {appNum}
                        </td>

                        <td>
                          <span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{stageStr}</span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                            <Calendar size={14} style={{ color: '#0284c7' }} />
                            <span>{displayDate}</span>
                          </div>
                          {needsDateResponse && (
                            <span className="badge badge-orange" style={{ fontSize: 10, marginTop: 4, display: 'inline-block' }}>
                              ⚡ Choose 2 Dates
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155' }}>
                            <User size={14} style={{ color: '#64748b' }} />
                            <span>{auditorsList}</span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            <span className={`badge ${statusInfo.badge}`} style={{ textTransform: 'capitalize', fontSize: 11, fontWeight: 700 }}>
                              {statusInfo.label}
                            </span>
                            {hasFlaggedNc && (
                              <span className="badge badge-red" style={{ fontSize: 10, fontWeight: 800 }}>
                                ⚠️ NC Flagged
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                            {needsDateResponse && (
                              <button 
                                className="btn btn-primary btn-sm"
                                style={{ background: '#f59e0b', borderColor: '#f59e0b', fontSize: 12, fontWeight: 700 }}
                                onClick={() => openSelectDatesModal(audit)}
                              >
                                Select Dates
                              </button>
                            )}

                            {hasFlaggedNc && (
                              <button 
                                className="btn btn-primary btn-sm"
                                style={{ background: '#dc2626', borderColor: '#dc2626', fontSize: 12, fontWeight: 700 }}
                                onClick={() => openNcModal(audit)}
                              >
                                Resolve NC
                              </button>
                            )}

                            <button 
                              className="btn btn-ghost btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                              onClick={() => setExpandedAuditId(isExpanded ? null : auditId)}
                            >
                              {isExpanded ? 'Hide Details' : 'Details'}
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Audit Details Row */}
                      {isExpanded && (
                        <tr style={{ background: '#f8fafc' }}>
                          <td colSpan={7} style={{ padding: '20px 24px', borderBottom: '2px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gap: 20 }}>
                              
                              {/* Schedule and Date Options */}
                              <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Calendar size={16} style={{ color: '#0284c7' }} /> Audit Schedule &amp; Team Details
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                  <div>
                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Finalized Date</div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: audit.finalized_date ? '#15803d' : '#0f172a', marginTop: 2 }}>
                                      {audit.finalized_date ? new Date(audit.finalized_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Awaiting Final Confirmation'}
                                    </div>
                                  </div>

                                  <div>
                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Proposed Dates by Admin</div>
                                    <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>
                                      {audit.proposed_dates && audit.proposed_dates.length > 0 ? (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                          {audit.proposed_dates.map((d, i) => (
                                            <span key={i} style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                                              {new Date(d).toLocaleDateString('en-GB')}
                                            </span>
                                          ))}
                                        </div>
                                      ) : 'None proposed'}
                                    </div>
                                  </div>

                                  <div>
                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Your Selected Preferences</div>
                                    <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>
                                      {audit.selected_dates && audit.selected_dates.length > 0 ? (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                          {audit.selected_dates.map((d, i) => (
                                            <span key={i} style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                                              ✓ {new Date(d).toLocaleDateString('en-GB')}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (audit.client_unavailable ? <span style={{ color: '#dc2626', fontWeight: 700 }}>Marked as Unavailable</span> : 'Not submitted yet')}
                                    </div>
                                  </div>

                                  <div>
                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Assigned Auditor(s)</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                                      {auditorsList}
                                    </div>
                                  </div>
                                </div>

                                {needsDateResponse && (
                                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                    <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                                      Action Required: Please pick 2 preferred dates or inform HFA if unavailable.
                                    </span>
                                    <button 
                                      className="btn btn-primary btn-sm"
                                      style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 700 }}
                                      onClick={() => openSelectDatesModal(audit)}
                                    >
                                      Select Audit Dates
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Non-Conformity (NC) Findings Section */}
                              <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: hasFlaggedNc ? '1.5px solid #fca5a5' : '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                  <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: hasFlaggedNc ? '#b91c1c' : '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertTriangle size={16} style={{ color: hasFlaggedNc ? '#dc2626' : '#64748b' }} /> 
                                    Non-Conformity (NC) Findings &amp; Corrective Actions ({audit.nc_reports?.length || 0})
                                  </div>
                                  
                                  {hasFlaggedNc && (
                                    <button 
                                      className="btn btn-primary btn-sm"
                                      style={{ background: '#dc2626', borderColor: '#dc2626', fontWeight: 700, fontSize: 12 }}
                                      onClick={() => openNcModal(audit)}
                                    >
                                      + Upload NC Correction
                                    </button>
                                  )}
                                </div>

                                {audit.nc_reports && audit.nc_reports.length > 0 ? (
                                  <div style={{ display: 'grid', gap: 14 }}>
                                    {audit.nc_reports.map((nc, idx) => {
                                      const isNcOpen = nc.status === 'flagged';
                                      const isCorrected = nc.status === 'corrected';
                                      const isClosed = nc.status === 'closed';

                                      return (
                                        <div 
                                          key={nc._id || idx} 
                                          style={{ 
                                            background: isNcOpen ? '#fef2f2' : '#f8fafc', 
                                            borderRadius: 10, 
                                            padding: 16, 
                                            border: isNcOpen ? '1px solid #fecaca' : '1px solid #e2e8f0' 
                                          }}
                                        >
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                              <span style={{ fontSize: 12, fontWeight: 800, color: isNcOpen ? '#dc2626' : '#334155' }}>
                                                Observation #{idx + 1}
                                              </span>
                                              <span className={`badge ${isClosed ? 'badge-green' : (isCorrected ? 'badge-yellow' : 'badge-red')}`} style={{ fontSize: 10 }}>
                                                {isClosed ? 'Resolved & Closed' : (isCorrected ? 'Correction Submitted' : 'Action Required')}
                                              </span>
                                            </div>
                                            {nc.flagged_at && (
                                              <span style={{ fontSize: 11, color: '#64748b' }}>
                                                Flagged: {new Date(nc.flagged_at).toLocaleDateString('en-GB')}
                                              </span>
                                            )}
                                          </div>

                                          {/* NC Auditor Text */}
                                          <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                                              Auditor Observation / Non-Conformity:
                                            </div>
                                            {nc.text || 'Non-Conformity flagged during site inspection.'}
                                          </div>

                                          {/* Auditor Attached Document */}
                                          {(nc.document_url || nc.url) && (
                                            <div style={{ marginTop: 8 }}>
                                              <a 
                                                href={getPdfUrl(nc.document_url || nc.url)} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="btn btn-outline btn-sm"
                                                style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                              >
                                                <Download size={12} /> View Auditor Attachment
                                              </a>
                                            </div>
                                          )}

                                          {/* Client Response */}
                                          {nc.client_response && (
                                            <div style={{ marginTop: 10, background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                                              <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                                                Your Corrective Action Explanation:
                                              </div>
                                              <div style={{ fontSize: 13, color: '#14532d' }}>
                                                {nc.client_response}
                                              </div>
                                              {(nc.correction_document_url || nc.client_response_url) && (
                                                <div style={{ marginTop: 8 }}>
                                                  <a 
                                                    href={getPdfUrl(nc.correction_document_url || nc.client_response_url)} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="btn btn-outline btn-sm"
                                                    style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                                  >
                                                    <Download size={12} /> View Uploaded Resolution Document
                                                  </a>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Admin Reply */}
                                          {nc.admin_reply && (
                                            <div style={{ marginTop: 10, background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                                              <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                                                HFA Auditor Review Reply:
                                              </div>
                                              <div style={{ fontSize: 13, color: '#1e3a8a' }}>
                                                {nc.admin_reply}
                                              </div>
                                            </div>
                                          )}

                                          {/* Action button if open */}
                                          {isNcOpen && (
                                            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                                              <button 
                                                className="btn btn-primary btn-sm"
                                                style={{ background: '#dc2626', borderColor: '#dc2626', fontSize: 12, fontWeight: 700 }}
                                                onClick={() => openNcModal(audit, nc._id)}
                                              >
                                                Submit Corrective Action for Observation #{idx + 1}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: 8, color: '#64748b', fontSize: 13 }}>
                                    <CheckCircle2 size={24} style={{ color: '#16a34a', margin: '0 auto 6px' }} />
                                    No Non-Conformity reports flagged for this audit.
                                  </div>
                                )}
                              </div>

                              {/* Audit Report Document Download if available */}
                              {audit.report_url && (
                                <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <FileText size={20} style={{ color: 'var(--primary)' }} />
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Official Audit Inspection Report</div>
                                      <div style={{ fontSize: 11, color: '#64748b' }}>Generated and signed by the HFA Halal Audit Committee</div>
                                    </div>
                                  </div>
                                  <a 
                                    href={getPdfUrl(audit.report_url)} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="btn btn-outline btn-sm"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                  >
                                    <Download size={14} /> Download Audit Report PDF
                                  </a>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Client Audit Action Modal (Select Dates & Upload NC) */}
      <ClientAuditModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        audit={selectedAudit}
        mode={modalMode}
        reportId={selectedReportId}
        onSuccess={() => {
          fetchAudits();
        }}
      />
    </div>
  );
}
