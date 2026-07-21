import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Award, Download, Search, RefreshCw, Eye, EyeOff, Calendar, AlertCircle, FileText } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function CertificatesPage() {
  const [certs, setCerts] = useState([]);
  const [survRequests, setSurvRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCertId, setExpandedCertId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [certsRes, survRes] = await Promise.all([
        api.get('/api/certificates'),
        api.get('/api/surveillance/my').catch(() => ({ data: [] }))
      ]);
      setCerts(certsRes.data || []);
      setSurvRequests(survRes.data?.data || survRes.data || []);
    } catch (err) {
      toast.error('Failed to load certificates data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = certs.filter(c =>
    !search || c.certificate_number?.toLowerCase().includes(search.toLowerCase()) || c.certificate_type?.toLowerCase().includes(search.toLowerCase())
  );

  const isExpiringSoon = (expiry) => {
    if (!expiry) return false;
    const diff = new Date(expiry) - new Date();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000; // within 60 days
  };

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
                    const pendingReq = certReqs.find(r => r.status === 'requested');
                    const fulfilledReqs = certReqs.filter(r => r.status === 'fulfilled');

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
                            <span style={{ color: isExpiringSoon(cert.expiry_date) ? 'var(--warning)' : 'inherit' }}>
                              {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : '—'}
                            </span>
                            {isExpiringSoon(cert.expiry_date) && <span className="badge badge-orange" style={{ marginLeft: 6, fontSize: 10 }}>Expiring Soon</span>}
                          </td>
                          <td>
                            <span className={`badge ${cert.status === 'active' ? 'badge-green' : cert.status === 'revoked' ? 'badge-red' : 'badge-gray'}`}>
                              {cert.status}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            {cert.status === 'active' && (
                              <a href={`${api.defaults?.baseURL || ''}/api/certificates/${cert.id || cert._id}/download`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                                <Download size={13} /> Download
                              </a>
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
                                        {pendingReq ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fefce8', borderRadius: 8, border: '1px solid #fde68a', fontSize: 12, color: '#854d0e' }}>
                                            <AlertCircle size={14} style={{ color: '#a16207' }} />
                                            <span>Surveillance request pending administrator review.</span>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <button
                                              className="btn btn-primary btn-sm"
                                              onClick={() => handleRequestSurveillance(cert.id || cert._id)}
                                            >
                                              Request Surveillance Letter
                                            </button>
                                            <span style={{ fontSize: 11, color: '#64748b' }}>Submit request to schedule your annual review.</span>
                                          </div>
                                        )}

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
    </div>
  );
}
