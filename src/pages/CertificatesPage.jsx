import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Award, Download, Search, RefreshCw, Eye, EyeOff, Calendar, AlertCircle, FileText, RotateCcw, Upload, X, CheckCircle, ShieldCheck, Lock } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const cleanApi = API_URL.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanApi}${cleanPath}`;
};

export default function CertificatesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [certs, setCerts] = useState([]);
  const [survRequests, setSurvRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedCertId, setExpandedCertId] = useState(null);

  // Renewal modal state
  const [renewModal, setRenewModal] = useState(null); // cert object or null
  const [renewForm, setRenewForm] = useState({ contact_person: '', files: [] });
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [renewSuccess, setRenewSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [certsRes, survRes] = await Promise.all([
        api.get('/api/certificates'),
        api.get('/api/surveillance/my').catch(() => ({ data: [] }))
      ]);
      const loadedCerts = certsRes.data || [];
      setCerts(loadedCerts);
      setSurvRequests(survRes.data?.data || survRes.data || []);

      const renewId = searchParams.get('renewCertId');
      if (renewId) {
        const target = loadedCerts.find(c => String(c._id || c.id) === String(renewId));
        if (target) {
          openRenewModal(target);
        }
      }
    } catch (err) {
      toast.error('Failed to load certificates data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatusFilter(s);
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const isExpiringSoon = (expiry) => {
    if (!expiry) return false;
    const diff = new Date(expiry) - new Date();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000; // within 60 days
  };

  const filtered = certs.filter(c => {
    const matchSearch = !search || c.certificate_number?.toLowerCase().includes(search.toLowerCase()) || c.certificate_type?.toLowerCase().includes(search.toLowerCase());
    
    let matchStatus = true;
    if (statusFilter) {
      const isExp = isExpiringSoon(c.expiry_date);
      const isPast = c.status === 'expired' || (c.expiry_date && new Date(c.expiry_date) < new Date());
      if (statusFilter === 'expired') {
        matchStatus = isPast;
      } else if (statusFilter === 'expiring') {
        matchStatus = isExp && !isPast;
      } else if (statusFilter === 'active') {
        matchStatus = c.status === 'active' && !isPast;
      }
    }

    return matchSearch && matchStatus;
  });

  const isThreeYearCert = (cert) => {
    if (!cert.issue_date || !cert.expiry_date) return false;
    const diffYears = (new Date(cert.expiry_date) - new Date(cert.issue_date)) / (365 * 24 * 60 * 60 * 1000);
    return diffYears > 1.5; // > 1.5 years means it's a 3-year certificate
  };

  const getSurveillanceDates = (cert) => {
    if (!cert.issue_date) return { y1: null, y2: null };
    const d1 = new Date(cert.issue_date);
    d1.setFullYear(d1.getFullYear() + 1);
    const d2 = new Date(cert.issue_date);
    d2.setFullYear(d2.getFullYear() + 2);
    return { y1: d1, y2: d2 };
  };

  const openRenewModal = (cert) => {
    setRenewModal(cert);
    setRenewForm({
      contact_person: cert.primary_contact_name || cert.contact_person || '',
      contact_email: cert.primary_email || cert.contact_email || '',
      contact_phone: cert.primary_work_tel || cert.primary_mobile || cert.contact_phone || ''
    });
    setRenewSuccess(false);
  };

  const closeRenewModal = () => {
    setRenewModal(null);
    setRenewForm({ contact_person: '', contact_email: '', contact_phone: '' });
    setRenewSuccess(false);
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!renewForm.contact_person.trim()) {
      toast.error('Please enter the contact person name.');
      return;
    }
    if (!renewForm.contact_email.trim()) {
      toast.error('Please enter the contact person email.');
      return;
    }
    if (!renewForm.contact_phone.trim()) {
      toast.error('Please enter the contact person phone number.');
      return;
    }
    setRenewSubmitting(true);
    try {
      await api.post('/api/applications/renew', {
        certificate_id: renewModal._id || renewModal.id,
        contact_person: renewForm.contact_person.trim(),
        contact_email: renewForm.contact_email.trim(),
        contact_phone: renewForm.contact_phone.trim()
      });
      setRenewSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit renewal.');
    } finally {
      setRenewSubmitting(false);
    }
  };

  const handleRequestSurveillance = async (certId) => {
    try {
      await api.post('/api/surveillance', { certificate_id: certId });
      toast.success('Surveillance letter requested successfully!');
      // Reload requests
      const res = await api.get('/api/surveillance/my');
      setSurvRequests(res.data?.data || res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to request surveillance');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search certificates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchData}><RefreshCw size={14} /></button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">My Certificates ({filtered.length})</div>
          <div className="card-subtitle">Active and historical halal certificates</div>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Award /></div>
                <div className="empty-state-title">No Certificates Found</div>
                <div className="empty-state-text">Your certificates will appear here once issued by HFA</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Certificate No.</th><th>Type</th><th>Site</th>
                    <th>Issue Date</th><th>Expiry Date</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(cert => {
                    const isExpanded = expandedCertId === (cert.id || cert._id);
                    const is3Yr = isThreeYearCert(cert);
                    const dates = getSurveillanceDates(cert);
                    const certReqs = survRequests.filter(r => (r.certificate_id?._id || r.certificate_id) === (cert.id || cert._id));
                    const effectiveStatus =
                      cert.is_renewed || cert.status === 'renewed'
                        ? 'renewed'
                        : cert.status === 'active' && cert.expiry_date && new Date(cert.expiry_date) < new Date()
                          ? 'expired'
                          : cert.status;

                    return (
                      <React.Fragment key={cert.id || cert._id}>
                        <tr style={{ background: isExpanded ? '#f8fafc' : 'inherit' }}>
                          <td style={{ fontWeight: 700 }}>{cert.certificate_number}</td>
                          <td>
                            {cert.certificate_type}
                            {is3Yr && <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 10 }}>3-Year Expiry</span>}
                          </td>
                          <td>{cert.sites?.name || '—'}</td>
                          <td>{cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : '—'}</td>
                          <td>
                            <span style={{ color: isExpiringSoon(cert.expiry_date) && effectiveStatus !== 'renewed' ? 'var(--warning)' : 'inherit' }}>
                              {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : '—'}
                            </span>
                            {isExpiringSoon(cert.expiry_date) && effectiveStatus === 'active' && (
                              <span className="badge badge-orange" style={{ marginLeft: 6, fontSize: 10 }}>Expiring Soon</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              effectiveStatus === 'active' ? 'badge-green' :
                              effectiveStatus === 'renewed' ? 'badge-blue' :
                              effectiveStatus === 'revoked' ? 'badge-red' :
                              'badge-gray'
                            }`}>
                              {effectiveStatus}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            {effectiveStatus === 'active' && (
                              <a
                                href={getPdfUrl(cert.certificate_url || cert.document_url || cert.pdf_url || `/api/certificates/${cert.id || cert._id}/download?token=${localStorage.getItem('hfa_token') || ''}`)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-sm"
                                onClick={e => e.stopPropagation()}
                              >
                                <Download size={13} /> Download
                              </a>
                            )}
                            {(effectiveStatus === 'expired' || isExpiringSoon(cert.expiry_date)) && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                  color: '#fff', border: 'none', fontWeight: 700,
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '6px 14px', borderRadius: 8, fontSize: 12,
                                  boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
                                  cursor: 'pointer',
                                }}
                                onClick={e => { e.stopPropagation(); openRenewModal(cert); }}
                              >
                                <RotateCcw size={12} /> Renew
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setExpandedCertId(isExpanded ? null : (cert.id || cert._id))}
                            >
                              {isExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
                              {isExpanded ? 'Hide Details' : 'Details'}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ background: '#f8fafc', padding: '24px 32px', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: is3Yr ? '1.2fr 1fr' : '1fr', gap: 32 }}>
                                
                                {/* Certificate Metadata */}
                                <div>
                                  <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>Certificate Details</h4>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                    <div>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Scope of Certification</div>
                                      <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 2 }}>{cert.products_covered?.join(', ') || 'General Halal Certification'}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Site Associated</div>
                                      <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 2 }}>{cert.sites?.name || '—'}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Issue Date</div>
                                      <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 2 }}>{cert.issue_date ? new Date(cert.issue_date).toDateString() : '—'}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Expiry Date</div>
                                      <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 2 }}>{cert.expiry_date ? new Date(cert.expiry_date).toDateString() : '—'}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Annual Surveillance Section for 3-Year Certificates */}
                                {is3Yr && (
                                  <div>
                                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <Calendar size={15} style={{ color: 'var(--primary)' }} />
                                      Annual Surveillance Schedule
                                    </h4>
                                    <div style={{ display: 'grid', gap: 12 }}>
                                      
                                      {/* Surveillance Year 1 */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                        <div>
                                          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Year 1 Surveillance</div>
                                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Due by: {dates.y1 ? dates.y1.toLocaleDateString('en-GB') : '—'}</div>
                                        </div>
                                        <div>
                                          {fulfilledReqs.some(r => new Date(r.fulfilled_at) <= dates.y1 || !dates.y2) ? (
                                            <span className="badge badge-green" style={{ fontSize: 10 }}>Completed</span>
                                          ) : (
                                            <span className="badge badge-gray" style={{ fontSize: 10 }}>Pending</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Surveillance Year 2 */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                        <div>
                                          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Year 2 Surveillance</div>
                                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Due by: {dates.y2 ? dates.y2.toLocaleDateString('en-GB') : '—'}</div>
                                        </div>
                                        <div>
                                          {fulfilledReqs.length >= 2 ? (
                                            <span className="badge badge-green" style={{ fontSize: 10 }}>Completed</span>
                                          ) : (
                                            <span className="badge badge-gray" style={{ fontSize: 10 }}>Pending</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Surveillance Actions & Statuses */}
                                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 12, marginTop: 4 }}>
                                        {(() => {
                                          if (pendingReq) {
                                            return (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fefce8', borderRadius: 8, border: '1px solid #fde68a', fontSize: 12, color: '#854d0e' }}>
                                                <AlertCircle size={14} style={{ color: '#a16207' }} />
                                                <span>Surveillance request pending administrator review.</span>
                                              </div>
                                            );
                                          }

                                          // Calculate next surveillance due date
                                          let nextDueDate = dates.y1;
                                          if (fulfilledReqs.length === 1 && dates.y2) {
                                            nextDueDate = dates.y2;
                                          } else if (fulfilledReqs.length >= 2 || !nextDueDate) {
                                            nextDueDate = cert.expiry_date ? new Date(cert.expiry_date) : null;
                                          }

                                          if (!nextDueDate) {
                                            return null;
                                          }

                                          const now = new Date();
                                          const diffMs = nextDueDate.getTime() - now.getTime();
                                          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                                          const availableDate = new Date(nextDueDate.getTime() - 90 * 24 * 60 * 60 * 1000);

                                          if (diffDays > 90) {
                                            // More than 3 months out: Locked state
                                            return (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                                <Lock size={14} style={{ color: '#94a3b8' }} />
                                                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                                  Surveillance Request Locked — Available starting {availableDate.toLocaleDateString('en-GB')} (3 months before due date)
                                                </span>
                                              </div>
                                            );
                                          } else if (diffDays <= 60) {
                                            // 2 months or less out: Urgent flag + Request button
                                            return (
                                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span className="badge badge-red" style={{ padding: '6px 10px', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                                  🚨 URGENT: Surveillance Due in {diffDays <= 0 ? '0' : diffDays} Days!
                                                </span>
                                                <button
                                                  className="btn btn-primary btn-sm"
                                                  style={{ background: '#dc2626', borderColor: '#dc2626', fontWeight: 700 }}
                                                  onClick={() => handleRequestSurveillance(cert.id || cert._id)}
                                                >
                                                  Request Surveillance Letter
                                                </button>
                                                <span style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>Submit request urgently before deadline.</span>
                                              </div>
                                            );
                                          } else {
                                            // 3 to 2 months out: Standard request button available
                                            return (
                                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <button
                                                  className="btn btn-primary btn-sm"
                                                  onClick={() => handleRequestSurveillance(cert.id || cert._id)}
                                                >
                                                  Request Surveillance Letter
                                                </button>
                                                <span style={{ fontSize: 11, color: '#64748b' }}>Surveillance window open ({diffDays} days left until due date).</span>
                                              </div>
                                            );
                                          }
                                        })()}

                                        {/* Download fulfilled letter */}
                                        {fulfilledReqs.length > 0 && (
                                          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Issued Surveillance Letters:</div>
                                            {fulfilledReqs.map((req, rIdx) => (
                                              <div key={req._id || rIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <FileText size={13} style={{ color: '#16a34a' }} />
                                                <a href={getPdfUrl(req.letter_file_url)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                                                  Download Letter ({new Date(req.fulfilled_at).toLocaleDateString('en-GB')})
                                                </a>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                    </div>
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
            )
          }
        </div>
      </div>

      {/* ─── Renewal Modal ─── */}
      {renewModal && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999, padding: 20,
          }}
          onClick={e => e.target === e.currentTarget && closeRenewModal()}
        >
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            overflow: 'hidden', animation: 'fadeSlideUp 0.25s ease',
          }}>

            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              padding: '28px 32px', display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: 16,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(220,38,38,0.2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <RotateCcw size={18} color="#fca5a5" />
                  </span>
                  <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>
                    Renew Certificate
                  </h2>
                </div>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: 13 }}>
                  Certificate <strong style={{ color: '#e2e8f0' }}>{renewModal.certificate_number}</strong>
                  {renewModal.expiry_date && (
                    <> &nbsp;·&nbsp; Expired/Expiring: <strong style={{ color: '#fca5a5' }}>{new Date(renewModal.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></>
                  )}
                </p>
              </div>
              <button
                onClick={closeRenewModal}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <X size={16} color="#94a3b8" />
              </button>
            </div>

            {renewSuccess ? (
              /* Success State */
              <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(21,128,61,0.35)',
                }}>
                  <CheckCircle size={36} color="#fff" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
                  Renewal Submitted!
                </h3>
                <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
                  Your renewal application has been submitted successfully. The HFA team will review it and get back to you shortly.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => { closeRenewModal(); navigate('/applications'); }}
                  >
                    <ShieldCheck size={15} /> Track Application
                  </button>
                  <button className="btn btn-ghost" onClick={closeRenewModal}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleRenewSubmit}>
                <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Info Banner */}
                  <div style={{
                    background: '#fef9c3', border: '1px solid #fde047',
                    borderRadius: 10, padding: '12px 16px',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <AlertCircle size={16} style={{ color: '#a16207', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ margin: 0, fontSize: 13, color: '#713f12', lineHeight: 1.6 }}>
                      We'll pre-fill your renewal using your existing application records. Just confirm the contact person details below.
                    </p>
                  </div>

                  {/* Contact Person Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                      Contact Person Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Full name of the main contact for this renewal"
                      value={renewForm.contact_person}
                      onChange={e => setRenewForm(f => ({ ...f, contact_person: e.target.value }))}
                      required
                      style={{ fontSize: 14 }}
                    />
                  </div>

                  {/* Contact Person Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                      Contact Person Email <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="contact@example.com"
                      value={renewForm.contact_email}
                      onChange={e => setRenewForm(f => ({ ...f, contact_email: e.target.value }))}
                      required
                      style={{ fontSize: 14 }}
                    />
                  </div>

                  {/* Contact Person Phone Number */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                      Contact Person Phone Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+44 7700 000000"
                      value={renewForm.contact_phone}
                      onChange={e => setRenewForm(f => ({ ...f, contact_phone: e.target.value }))}
                      required
                      style={{ fontSize: 14 }}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '20px 32px', borderTop: '1px solid #f1f5f9',
                  display: 'flex', justifyContent: 'flex-end', gap: 10,
                  background: '#fafafa',
                }}>
                  <button type="button" className="btn btn-ghost" onClick={closeRenewModal}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={renewSubmitting}
                    style={{
                      background: 'linear-gradient(135deg, #15803d, #166534)',
                      minWidth: 160,
                    }}
                  >
                    {renewSubmitting ? (
                      <><span className="spinner" style={{ width: 15, height: 15 }} /> Submitting...</>
                    ) : (
                      <><RotateCcw size={14} /> Submit Renewal</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      ` }} />
    </div>
  );
}
