import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { FileText, Award, Package, Ship, Clock, CheckCircle, AlertCircle, Plus, RefreshCw, Download, X } from 'lucide-react';

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
  const [data, setData] = useState({ applications: [], certificates: [], products: [], messages_count: 0 });
  const [loading, setLoading] = useState(true);
  const [showForms, setShowForms] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/applications'),
      api.get('/api/certificates'),
      api.get('/api/products'),
      api.get('/api/messages/unread-count'),
    ]).then(([apps, certs, prods, msgs]) => {
      setData({
        applications: apps.data || [],
        certificates: certs.data || [],
        products: prods.data || [],
        messages_count: msgs.count || 0,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const recentApps = data.applications.slice(0, 5);
  const activeCerts = data.certificates.filter(c => c.status === 'active').length;
  const pendingApps = data.applications.filter(a => ['submitted', 'under_review'].includes(a.status)).length;
  const inProgressApps = data.applications.filter(a => a.status === 'audit_scheduled').length;

  const stats = [
    { label: 'Total Applications', value: data.applications.length, icon: <FileText size={22} />, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Active Certificates', value: activeCerts, icon: <Award size={22} />, color: '#15803d', bg: '#dcfce7' },
    { label: 'Pending Review', value: pendingApps, icon: <Clock size={22} />, color: '#d97706', bg: '#fef3c7' },
    { label: 'Products Registered', value: data.products.length, icon: <Package size={22} />, color: '#7c3aed', bg: '#f3e8ff' },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      {/* Stats */}
      <div className="stats-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{loading ? '—' : s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
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
                      <tr key={app.id}>
                        <td><Link to={`/applications/${app.id}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>{app.application_number}</Link></td>
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

        {/* Certificates */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">My Certificates</div>
              <div className="card-subtitle">Active halal certifications</div>
            </div>
            <Link to="/certificates" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div>
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              data.certificates.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Award /></div>
                  <div className="empty-state-title">No Certificates Yet</div>
                  <div className="empty-state-text">Certificates will appear here once issued</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Certificate No.</th><th>Type</th><th>Expires</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {data.certificates.slice(0, 5).map(cert => (
                      <tr key={cert.id}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{cert.certificate_number}</td>
                        <td style={{ fontSize: 12 }}>{cert.certificate_type}</td>
                        <td style={{ fontSize: 12 }}>{cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td><span className={`badge ${cert.status === 'active' ? 'badge-green' : 'badge-red'}`}>{cert.status}</span></td>
                      </tr>
                    ))}
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
              <span className="modal-title">Official HFA Forms & Templates</span>
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
                      <div style={{ width: 36, height: 36, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyCenter: 'center', border: '1px solid var(--border)' }}>
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
    </div>
  );
}
