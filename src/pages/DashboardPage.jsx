import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { FileText, Award, Package, Ship, Clock, CheckCircle, AlertCircle, Plus, RefreshCw, Download, X, MapPin, RotateCcw, ChevronRight } from 'lucide-react';
import ActionsNeededWidget from '../components/ActionsNeededWidget';

const STATUS_BADGE = {
  submitted: 'badge-blue',
  under_review: 'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red',
  on_hold: 'badge-orange',
  audit_scheduled: 'badge-purple',
  audit_completed: 'badge-green',
  certificate_issued: 'badge-green',
};

const OFFICIAL_FORMS = [
  { name: 'No Pork Policy Declaration', type: 'PDF', size: '1.2 MB' },
  { name: 'Audit Preparation Questionnaire', type: 'DOCX', size: '850 KB' },
  { name: 'Halal Assurance System Manual Template', type: 'PDF', size: '2.4 MB' },
  { name: 'Product Ingredients List Format', type: 'XLSX', size: '420 KB' },
  { name: 'Raw Material Approval Form', type: 'PDF', size: '1.1 MB' },
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ applications: [], certificates: [], products: [], messages_count: 0, sites: [] });
  const [loading, setLoading] = useState(true);
  const [showForms, setShowForms] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [certFilterTab, setCertFilterTab] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/api/applications'),
      api.get('/api/certificates'),
      api.get('/api/products'),
      api.get('/api/messages/unread-count'),
      api.get('/api/sites'),
    ]).then(([apps, certs, prods, msgs, sitesRes]) => {
      const userSites = sitesRes.data || [];
      setData({
        applications: apps.data || [],
        certificates: certs.data || [],
        products: prods.data || [],
        messages_count: msgs.count || 0,
        sites: userSites,
      });

      const isDismissed = sessionStorage.getItem('dismissed_site_prompt') === 'true';
      if (userSites.length === 0 && !isDismissed) {
        setShowSiteModal(true);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleDismissSiteModal = () => {
    sessionStorage.setItem('dismissed_site_prompt', 'true');
    setShowSiteModal(false);
  };

  const now = new Date();

  // Helper: check if a certificate has already been renewed or has a renewal in-progress
  const isCertRenewed = (cert) => {
    if (!cert) return false;
    if (cert.is_renewed || cert.status === 'renewed') return true;

    // Check if there is an active renewal application in progress for this certificate or site
    const hasOngoingRenewalApp = data.applications.some(app => {
      const isNotFinished = !['rejected', 'certificate_issued'].includes(app.status?.toLowerCase());
      const isRenewal = app.application_type === 'renewal';
      const matchesCert = app.renewed_certificate_id && String(app.renewed_certificate_id) === String(cert._id || cert.id);
      const matchesSite = app.site_id && String(app.site_id?._id || app.site_id) === String(cert.site_id?._id || cert.site_id);
      return isNotFinished && isRenewal && (matchesCert || matchesSite);
    });
    if (hasOngoingRenewalApp) return true;

    // Check if there is a newer active certificate for the same site
    const hasNewerActiveCert = data.certificates.some(other => {
      if (String(other._id || other.id) === String(cert._id || cert.id)) return false;
      const sameSite = cert.site_id && String(other.site_id?._id || other.site_id || '') === String(cert.site_id?._id || cert.site_id || '');
      const isOtherActive = other.status === 'active' && (!other.expiry_date || new Date(other.expiry_date) >= now);
      return sameSite && isOtherActive && (!cert.expiry_date || !other.expiry_date || new Date(other.expiry_date) >= new Date(cert.expiry_date));
    });

    return hasNewerActiveCert;
  };

  // Active certificates (status active & not in past & not superseded)
  const activeCertList = data.certificates.filter(c => {
    const isPast = c.expiry_date && new Date(c.expiry_date) < now;
    return c.status === 'active' && !isPast && !c.is_renewed;
  });

  // Expiring soon (within 90 days, not already renewed)
  const expiringSoonCertList = data.certificates.filter(c => {
    if (!c.expiry_date || isCertRenewed(c)) return false;
    const diff = new Date(c.expiry_date) - now;
    return diff > 0 && diff <= 90 * 24 * 60 * 60 * 1000 && c.status === 'active';
  });

  // Expired certificates that have NOT been renewed yet
  const expiredCertList = data.certificates.filter(c => {
    if (isCertRenewed(c)) return false;
    return c.status === 'expired' || (c.expiry_date && new Date(c.expiry_date) < now);
  });

  // Most urgent un-renewed certificate (expired first, then expiring soon)
  const urgentRenewalCert = expiredCertList[0] || expiringSoonCertList[0] || null;
  const daysToUrgent = urgentRenewalCert?.expiry_date ? Math.ceil((new Date(urgentRenewalCert.expiry_date) - now) / (1000 * 60 * 60 * 24)) : null;

  const recentApps = data.applications.slice(0, 5);
  const pendingApps = data.applications.filter(a => ['submitted', 'under_review'].includes(a.status)).length;

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate) - now) / (1000 * 60 * 60 * 24));
  };

  // Filtered certificates for table
  const displayedCerts = data.certificates.filter(c => {
    const isRenewed = isCertRenewed(c);
    const isPast = c.status === 'expired' || (c.expiry_date && new Date(c.expiry_date) < now);
    const diff = c.expiry_date ? new Date(c.expiry_date) - now : null;
    const isExpiringSoon = diff !== null && diff > 0 && diff <= 90 * 24 * 60 * 60 * 1000;

    if (certFilterTab === 'active') return c.status === 'active' && !isPast && !isRenewed;
    if (certFilterTab === 'expiring') return isExpiringSoon && !isPast && !isRenewed;
    if (certFilterTab === 'expired') return isPast && !isRenewed;
    if (certFilterTab === 'renewed') return isRenewed;
    return !isRenewed || certFilterTab === 'all';
  });

  return (
    <div>
      {/* Welcome Banner */}
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
          </h2>
          <p style={{ opacity: 0.85, fontSize: 13 }}>
            {profile?.company_name} — Here's your certification overview
          </p>
        </div>
        <Link to="/applications/new" className="btn" style={{ background: 'white', color: 'var(--primary)', fontWeight: 700, padding: '10px 20px' }}>
          <Plus size={16} /> New Application
        </Link>
      </div>

      {/* Persistent Actions Needed Widget */}
      <ActionsNeededWidget />

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/applications')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}><FileText size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Applications</div>
            <div className="stat-value">{loading ? '—' : data.applications.length}</div>
          </div>
        </div>

        {/* Certificate Overview Stat Card (Active / Expiring Soon / Expired & Clickable Renewal) */}
        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            border: urgentRenewalCert ? '1.5px solid #fbcfe8' : '1px solid var(--border)',
            background: urgentRenewalCert ? 'linear-gradient(135deg, #fff, #fdf4ff)' : '#fff',
            position: 'relative'
          }}
          onClick={() => navigate('/certificates')}
        >
          <div className="stat-icon" style={{ background: urgentRenewalCert ? '#fae8ff' : '#dcfce7', color: urgentRenewalCert ? '#a21caf' : '#15803d' }}>
            <Award size={22} />
          </div>
          <div className="stat-info" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stat-label">Certificates</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 12 }}>
                {activeCertList.length} Active
              </span>
            </div>
            <div className="stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <span>{loading ? '—' : activeCertList.length}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>active certs</span>
            </div>

            {/* Clickable Status Breakdown Pills */}
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
              <span
                onClick={() => navigate('/certificates?status=active')}
                style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                  background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', cursor: 'pointer'
                }}
                title="View active certificates"
              >
                ✓ {activeCertList.length} Active
              </span>

              {expiringSoonCertList.length > 0 && (
                <span
                  onClick={() => navigate('/certificates?status=expiring')}
                  style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                    background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', cursor: 'pointer'
                  }}
                  title="View certificates expiring soon"
                >
                  ⚠️ {expiringSoonCertList.length} Expiring Soon
                </span>
              )}

              {expiredCertList.length > 0 && (
                <span
                  onClick={() => navigate('/certificates?status=expired')}
                  style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                    background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', cursor: 'pointer'
                  }}
                  title="View expired certificates"
                >
                  🔴 {expiredCertList.length} Expired
                </span>
              )}
            </div>

            {/* Urgent Renewal Callout */}
            {urgentRenewalCert && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/certificates?renewCertId=${urgentRenewalCert._id || urgentRenewalCert.id}`);
                }}
                style={{
                  marginTop: 8, padding: '4px 8px', borderRadius: 6, background: daysToUrgent <= 0 ? '#fee2e2' : '#fef3c7',
                  border: daysToUrgent <= 0 ? '1px solid #fca5a5' : '1px solid #fde68a',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 11, fontWeight: 700, color: daysToUrgent <= 0 ? '#991b1b' : '#92400e', cursor: 'pointer'
                }}
              >
                <span>
                  {daysToUrgent <= 0 ? `Expired ${Math.abs(daysToUrgent)}d ago` : `Expires in ${daysToUrgent}d`}
                </span>
                <span style={{ textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 2 }}>
                  Renew <ChevronRight size={12} />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/applications')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Clock size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Pending Review</div>
            <div className="stat-value">{loading ? '—' : pendingApps}</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}><Package size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Products Registered</div>
            <div className="stat-value">{loading ? '—' : data.products.length}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Recent Applications */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Applications</div>
              <div className="card-subtitle">Your latest certification requests</div>
            </div>
            <Link to="/applications" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div>
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              recentApps.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><FileText /></div>
                  <div className="empty-state-title">No Applications Yet</div>
                  <div className="empty-state-text">Start by submitting a new application</div>
                  <Link to="/applications/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                    <Plus size={14} /> New Application
                  </Link>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr><th>App No.</th><th>Category</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {recentApps.map(app => (
                      <tr key={app.id || app._id}>
                        <td><Link to={`/applications?appId=${app.id || app._id}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>{app.application_number}</Link></td>
                        <td style={{ fontSize: 12, maxWidth: 150 }}><span className="truncate" style={{ display: 'block' }}>{app.category}</span></td>
                        <td><span className={`badge ${STATUS_BADGE[app.status] || 'badge-gray'}`}>{app.status?.replace(/_/g, ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>

        {/* Certificates with Expiry Periods & Direct Renewal */}
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="card-title">My Certificates ({data.certificates.length})</div>
              <div className="card-subtitle">Active, expiring, and historical halal certifications</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Filter Tabs */}
              <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 8 }}>
                {[
                  { id: 'all', label: `All (${data.certificates.length})` },
                  { id: 'active', label: `Active (${activeCertList.length})` },
                  { id: 'expiring', label: `Expiring (${expiringSoonCertList.length})` },
                  { id: 'expired', label: `Expired (${expiredCertList.length})` },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCertFilterTab(t.id)}
                    style={{
                      background: certFilterTab === t.id ? '#fff' : 'transparent',
                      color: certFilterTab === t.id ? 'var(--primary)' : '#64748b',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: certFilterTab === t.id ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: certFilterTab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Link to="/certificates" className="btn btn-ghost btn-sm">Manage</Link>
            </div>
          </div>
          <div>
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              displayedCerts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Award /></div>
                  <div className="empty-state-title">No Certificates in this view</div>
                  <div className="empty-state-text">Certificates will appear here once issued by HFA</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Certificate No.</th><th>Type</th><th>Expires / Period</th><th>Status & Action</th></tr>
                  </thead>
                  <tbody>
                    {displayedCerts.slice(0, 5).map(cert => {
                      const daysLeft = getDaysRemaining(cert.expiry_date);
                      const isPast = cert.status === 'expired' || (daysLeft !== null && daysLeft <= 0);
                      const isExpSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 90;

                      return (
                        <tr key={cert.id || cert._id}>
                          <td>
                            <Link to={`/certificates`} style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>
                              {cert.certificate_number}
                            </Link>
                          </td>
                          <td style={{ fontSize: 12 }}>{cert.certificate_type}</td>
                          <td style={{ fontSize: 12 }}>
                            <div>{cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : '—'}</div>
                            {cert.expiry_date && (
                              <div style={{ marginTop: 2 }}>
                                {isPast ? (
                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626' }}>
                                    Expired {Math.abs(daysLeft)}d ago
                                  </span>
                                ) : isExpSoon ? (
                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#d97706' }}>
                                    ⚠️ {daysLeft} days left
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#16a34a' }}>
                                    {daysLeft} days left
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className={`badge ${isPast ? 'badge-red' : isExpSoon ? 'badge-orange' : 'badge-green'}`}>
                                {isPast ? 'Expired' : isExpSoon ? 'Expiring Soon' : 'Active'}
                              </span>
                              {(isPast || isExpSoon) && (
                                <button
                                  className="btn btn-sm"
                                  onClick={() => navigate(`/certificates?renewCertId=${cert._id || cert.id}`)}
                                  style={{
                                    padding: '3px 8px', fontSize: 10.5, fontWeight: 700, borderRadius: 6,
                                    background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: 4
                                  }}
                                  title="Renew this certificate"
                                >
                                  <RotateCcw size={11} /> Renew
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Quick Actions</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'New Application', icon: <FileText size={20} />, path: '/applications/new', color: '#15803d', bg: '#dcfce7' },
              { label: 'View Certificates', icon: <Award size={20} />, path: '/certificates', color: '#7c3aed', bg: '#f3e8ff' },
              { label: 'Add Product', icon: <Package size={20} />, path: '/products/new', color: '#d97706', bg: '#fef3c7' },
              { label: 'Export Certificate', icon: <Ship size={20} />, path: '/export/new', color: '#0891b2', bg: '#e0f2fe' },
              { label: 'Download Forms', icon: <Download size={20} />, onClick: () => setShowForms(true), color: '#334155', bg: '#f1f5f9' },
              { label: 'Send Message', icon: <RefreshCw size={20} />, path: '/messages/inbox', color: '#dc2626', bg: '#fee2e2' },
            ].map(a => (
              a.path ? (
                <Link key={a.label} to={a.path} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '20px 16px', borderRadius: 'var(--radius-md)',
                  background: a.bg, color: a.color, textDecoration: 'none',
                  fontWeight: 600, fontSize: 13, gap: 10, transition: 'var(--transition)',
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  {a.icon}
                  {a.label}
                </Link>
              ) : (
                <button key={a.label} onClick={a.onClick} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '20px 16px', borderRadius: 'var(--radius-md)',
                  background: a.bg, color: a.color, border: 'none',
                  fontWeight: 600, fontSize: 13, gap: 10, transition: 'var(--transition)',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  {a.icon}
                  {a.label}
                </button>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Forms Modal */}
      {showForms && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForms(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <span className="modal-title">Official HFA Forms &amp; Templates</span>
              <button className="modal-close" onClick={() => setShowForms(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
                Download the required templates to assist with your certification process.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {OFFICIAL_FORMS.map(f => (
                  <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                        <FileText size={18} color="var(--primary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.type} • {f.size}</div>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => toast.success(`Downloading ${f.name}...`)}>
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowForms(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DISMISSIBLE SITE ONBOARDING MODAL */}
      {showSiteModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => handleDismissSiteModal()}>
          <div className="modal" style={{ maxWidth: 480, padding: 0 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Add Manufacturing Site</div>
              </div>
              <button className="modal-close" onClick={() => handleDismissSiteModal()}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Get started by adding your first manufacturing site
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                Register your primary operating manufacturing site to begin applying for Halal certification.
              </p>
            </div>

            <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleDismissSiteModal()}
              >
                Maybe Later
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleDismissSiteModal();
                  navigate('/add-site');
                }}
              >
                Add Manufacturing Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
