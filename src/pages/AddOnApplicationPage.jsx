import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Award, PlusCircle, Trash2, FileText,
  CheckCircle, AlertCircle, Package, X, Users, ChevronDown, ChevronUp
} from 'lucide-react';

const formatSiteName = (str) => {
  if (!str) return 'Site';
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
};

const getSiteName = (c) => {
  if (!c) return 'Site';
  let raw = '';
  const siteObj = c.site_id;
  if (siteObj && typeof siteObj === 'object') {
    raw = siteObj.name || siteObj.est_name || siteObj.trading_name;
  }
  if (!raw) {
    const appObj = c.application_id;
    if (appObj && typeof appObj === 'object') {
      raw = appObj.establishment_name || appObj.site_name;
    }
  }
  if (!raw) raw = c.site_name || 'Main Facility';
  return formatSiteName(raw);
};

const PRODUCT_TYPES = ['Add product', 'Remove product', 'Change name/code', 'Change ingredients'];

const STATUS_LABELS = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  ft_assigned: 'FT Assigned',
  product_approval_form_enabled: 'Form Enabled',
  all_forms_received: 'Forms Received',
  logsheet_created: 'Under Review',
  waiting_sharia_signature: 'Under Review',
  product_form_approved: 'Form Approved',
  ready_for_certificate: 'Ready For Certificate',
  completed: 'Certificate'
};

const STATUS_BADGE = {
  submitted: 'badge-yellow',
  accepted: 'badge-green',
  rejected: 'badge-red',
  ft_assigned: 'badge-blue',
  product_approval_form_enabled: 'badge-purple',
  all_forms_received: 'badge-teal',
  logsheet_created: 'badge-teal',
  waiting_sharia_signature: 'badge-teal',
  product_form_approved: 'badge-green',
  ready_for_certificate: 'badge-teal',
  completed: 'badge-green'
};

const STATUS_COLOR = {
  submitted: '#f59e0b',
  accepted: '#16a34a',
  rejected: '#ef4444',
  ft_assigned: '#2563eb',
  product_approval_form_enabled: '#7c3aed',
  all_forms_received: '#0d9488',
  logsheet_created: '#0d9488',
  waiting_sharia_signature: '#0d9488',
  product_form_approved: '#16a34a',
  ready_for_certificate: '#0d9488',
  completed: '#16a34a'
};

const ORDER = [
  'submitted', 'accepted', 'ft_assigned', 'product_approval_form_enabled',
  'all_forms_received', 'product_form_approved', 'ready_for_certificate', 'completed'
];

const getClientStepIdx = (status) => {
  if (['logsheet_created', 'waiting_sharia_signature'].includes(status)) {
    return ORDER.indexOf('all_forms_received');
  }
  return ORDER.indexOf(status);
};


const emptyProduct = () => ({ name: '', code: '', type: 'Add product' });

export default function AddOnApplicationPage() {
  const navigate = useNavigate();
  const [certs, setCerts] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [form, setForm] = useState({
    certificate_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    message: '',
    products: [emptyProduct()]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [certsRes, appsRes] = await Promise.all([
        api.get('/api/certificates'),
        api.get('/api/add-on-applications')
      ]);
      const active = (certsRes.data || []).filter(c =>
        c.status === 'active' && new Date(c.expiry_date) >= new Date()
      );
      setCerts(active);
      setMyApps(appsRes.data?.data || appsRes.data || []);
      if (active.length === 1) {
        setForm(f => ({ ...f, certificate_id: active[0]._id || active[0].id }));
      }
    } catch {
      toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateProduct = (idx, field, value) => {
    setForm(f => {
      const products = [...f.products];
      products[idx] = { ...products[idx], [field]: value };
      return { ...f, products };
    });
  };

  const addProduct = () => setForm(f => ({ ...f, products: [...f.products, emptyProduct()] }));

  const removeProduct = (idx) => {
    if (form.products.length === 1) return toast.error('At least one product is required.');
    setForm(f => ({ ...f, products: f.products.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.certificate_id) return toast.error('Please select a site.');
    if (!form.contact_name.trim()) return toast.error('Contact Person Name is required.');
    if (!form.contact_email.trim()) return toast.error('Contact Person Email is required.');
    for (const [i, p] of form.products.entries()) {
      if (!p.name.trim()) return toast.error(`Product row ${i + 1}: Product Name is required.`);
      if (!p.type) return toast.error(`Product row ${i + 1}: Type is required.`);
    }
    setSubmitting(true);
    try {
      await api.post('/api/add-on-applications', form);
      toast.success('Add-on application submitted successfully!');
      setShowForm(false);
      setForm({ certificate_id: certs.length === 1 ? (certs[0]._id || certs[0].id) : '', contact_name: '', contact_email: '', contact_phone: '', message: '', products: [emptyProduct()] });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 80, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  }

  // If no active cert but there are existing add-on apps (e.g., submitted alongside a new application), still show the page.
  // Only hide the "New Add-on Application" button — clients can still track in-progress requests.
  const hasNoCert = certs.length === 0;

  if (hasNoCert && myApps.length === 0) {
    return (
      <div style={{ maxWidth: 650, margin: '40px auto', padding: '32px', background: 'white', borderRadius: 24, border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <Award size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Add-on Application Unavailable</h3>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Add-on applications are available once you have an active site certificate. If you submitted products during your application, they will appear here once your application is processed.
        </p>
        <button className="btn btn-outline" onClick={() => navigate('/applications')}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/applications')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Add-on Product Applications</h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Track and manage product additions, removals, and changes for your site</p>
          </div>
        </div>
        {!hasNoCert && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <PlusCircle size={15} /> New Add-on Application
          </button>
        )}
      </div>

      {/* Info banner when no active cert but has submitted add-on apps (from new application) */}
      {hasNoCert && myApps.length > 0 && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <Package size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0c4a6e', marginBottom: 4 }}>Products Submitted Successfully</div>
            <div style={{ fontSize: 13, color: '#0369a1', lineHeight: 1.6 }}>
              Your product request has been submitted and is now in the <strong>Add-on Review Queue</strong>. HFA will review and accept or reject the request, assign a Food Tech specialist, issue you a product approval form to complete, create a Halal Logsheet, and then update your certificate when approved.
            </div>
          </div>
        </div>
      )}

      {/* Applications List */}
      {myApps.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            My Applications ({myApps.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myApps.map(app => {
              const certNo = app.certificate_id?.certificate_number || '—';
              const statusLabel = STATUS_LABELS[app.status] || app.status;
              const badgeClass = STATUS_BADGE[app.status] || 'badge-gray';
              const statusColor = STATUS_COLOR[app.status] || '#475569';
              const needsFormSubmit = app.status === 'product_approval_form_enabled';
              const isExpanded = expandedId === app._id;
              const stepIdx = getClientStepIdx(app.status);

              const ftNames = (() => {
                const arr = app.assigned_food_techs || [];
                if (arr.length > 0) return arr.map(ft => ft.full_name || ft).join(', ');
                if (app.assigned_food_tech?.full_name) return app.assigned_food_tech.full_name;
                return null;
              })();

              return (
                <div key={app._id} style={{
                  background: 'white', borderRadius: 14,
                  border: `1px solid ${needsFormSubmit ? '#e9d5ff' : '#e2e8f0'}`,
                  boxShadow: needsFormSubmit ? '0 0 0 3px #f5f3ff' : '0 1px 4px rgba(0,0,0,0.04)',
                  overflow: 'hidden', transition: 'box-shadow 0.2s'
                }}>
                  {/* Card header */}
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Status + cert/app reference */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>{statusLabel}</span>
                        {certNo !== '—' ? (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Cert: {certNo}</span>
                        ) : app.application_id?.application_number ? (
                          <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
                            For App: {app.application_id.application_number}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Pending Certificate</span>
                        )}
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>•</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(app.createdAt).toLocaleDateString('en-GB')}</span>
                      </div>

                      {/* Products chips */}
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: (ftNames || needsFormSubmit) ? 8 : 0 }}>
                        {(app.products || []).map((p, i) => (
                          <span key={i} style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                            background: p.type === 'Add product' ? '#f0fdf4' : p.type === 'Remove product' ? '#fef2f2' : '#f0f9ff',
                            color: p.type === 'Add product' ? '#166534' : p.type === 'Remove product' ? '#991b1b' : '#0369a1',
                            border: `1px solid ${p.type === 'Add product' ? '#bbf7d0' : p.type === 'Remove product' ? '#fecaca' : '#bae6fd'}`
                          }}>
                            {p.sn || i + 1}. {p.name} <span style={{ opacity: 0.6 }}>({p.type})</span>
                          </span>
                        ))}
                      </div>

                      {/* FT assigned */}
                      {ftNames && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                          <Users size={11} /> Food Technology Staff: {ftNames}
                        </div>
                      )}

                      {/* Rejection reason */}
                      {app.status === 'rejected' && app.rejection_reason && (
                        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                          Rejected: {app.rejection_reason}
                        </div>
                      )}
                    </div>

                    {/* Right actions */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {needsFormSubmit && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700 }}
                          onClick={() => navigate(`/addon-applications/${app._id}/approval-form`)}
                        >
                          <FileText size={13} /> Complete Form
                        </button>
                      )}
                      {app.status === 'completed' && (
                        <span className="badge badge-green" style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Certificate Updated
                        </span>
                      )}
                      {app.status !== 'product_approval_form_enabled' && app.product_approval_form?.submitted_at && (
                        <span style={{ fontSize: 11, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <CheckCircle size={11} /> Form Submitted
                        </span>
                      )}
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
                        onClick={() => setExpandedId(isExpanded ? null : app._id)}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 3, background: '#f1f5f9' }}>
                    <div style={{
                      height: '100%',
                      width: app.status === 'rejected' ? '10%' : `${app.status === 'completed' ? 100 : Math.round(((stepIdx + 1) / ORDER.length) * 100)}%`,
                      background: app.status === 'rejected' ? '#ef4444' : statusColor,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
                      {/* Action banner for form */}
                      {needsFormSubmit && app.product_approval_form && (
                        <div style={{ marginBottom: 16, padding: 14, background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={13} /> Product Approval Form — Action Required
                          </div>
                          {app.product_approval_form.form_text && (
                            <div style={{ fontSize: 12, color: '#6b21a8', background: 'white', padding: 10, borderRadius: 8, border: '1px solid #e9d5ff', whiteSpace: 'pre-wrap', marginBottom: 8, maxHeight: 80, overflow: 'hidden' }}>
                              {app.product_approval_form.form_text.length > 200
                                ? app.product_approval_form.form_text.slice(0, 200) + '…'
                                : app.product_approval_form.form_text}
                            </div>
                          )}
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ background: '#7c3aed', borderColor: '#7c3aed', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            onClick={() => navigate(`/addon-applications/${app._id}/approval-form`)}
                          >
                            <FileText size={13} /> Open Product Approval Form
                          </button>
                        </div>
                      )}

                      {/* Workflow progress (Client: 8 visible steps) */}
                      {app.status !== 'rejected' && (
                        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                            Workflow Progress
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
                            {[
                              { id: 'submitted', label: 'Submitted' },
                              { id: 'accepted', label: 'Accepted' },
                              { id: 'ft_assigned', label: 'FT Assigned' },
                              { id: 'product_approval_form_enabled', label: 'Form Enabled' },
                              { id: 'all_forms_received', label: 'Forms Received' },
                              { id: 'product_form_approved', label: 'Form Approved' },
                              { id: 'ready_for_certificate', label: 'Ready Cert' },
                              { id: 'completed', label: 'Certificate' }
                            ].map((step, idx, arr) => {
                              const sIdx = ORDER.indexOf(step.id);
                              const currentIdx = getClientStepIdx(app.status);
                              const isDone = currentIdx > sIdx || app.status === 'completed';
                              const isCurrent = currentIdx === sIdx && app.status !== 'completed';

                              return (
                                <React.Fragment key={step.id}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 52 }}>
                                    <div style={{
                                      width: 22, height: 22, borderRadius: '50%',
                                      background: isDone ? '#16a34a' : isCurrent ? statusColor : '#e2e8f0',
                                      color: isDone || isCurrent ? 'white' : '#94a3b8',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 10, fontWeight: 700, marginBottom: 4,
                                      boxShadow: isCurrent ? `0 0 0 3px ${statusColor}30` : 'none'
                                    }}>
                                      {isDone ? '✓' : idx + 1}
                                    </div>
                                    <span style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 400, textAlign: 'center', lineHeight: 1.2, color: isDone ? '#16a34a' : isCurrent ? statusColor : '#94a3b8' }}>
                                      {step.label}
                                    </span>
                                  </div>
                                  {idx < arr.length - 1 && (
                                    <div style={{ flex: '0 0 8px', height: 2, background: isDone ? '#16a34a' : '#e2e8f0', marginBottom: 12 }} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myApps.length === 0 && (
        <div style={{ padding: '64px 24px', textAlign: 'center', background: 'white', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Package size={24} style={{ color: '#94a3b8' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 6 }}>No Add-on Applications Yet</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Click "New Add-on Application" to request changes to your site's product list.</div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={14} /> New Add-on Application
          </button>
        </div>
      )}

      {/* ─── New Application Modal ─────────────────────────────────────────── */}
      {showForm && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <span className="modal-title">New Add-on Product Application</span>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: 28, display: 'grid', gap: 20 }}>

                {/* 1. Site */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>1. Site</div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select Site <span>*</span></label>
                    {certs.length === 1 ? (
                      <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, fontSize: 14 }}>
                        {getSiteName(certs[0])}
                      </div>
                    ) : (
                      <select className="form-control" value={form.certificate_id} onChange={e => setForm(f => ({ ...f, certificate_id: e.target.value }))} required>
                        <option value="">-- Select Site --</option>
                        {certs.map(c => (
                          <option key={c._id || c.id} value={c._id || c.id}>{getSiteName(c)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* 2. Contact Person */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>2. Contact Person</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, background: '#f0f9ff', padding: '8px 12px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                    ℹ️ This contact email will receive updates at every stage — enter the person directly handling this request.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Contact Person Name <span>*</span></label>
                      <input className="form-control" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="e.g. Jane Smith" required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Contact Person Number</label>
                      <input className="form-control" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="e.g. +44 7700 900077" />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: '12px 0 0' }}>
                    <label className="form-label">Contact Person E-mail <span>*</span></label>
                    <input type="email" className="form-control" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="e.g. jane@company.com" required />
                  </div>
                </div>

                {/* 3. Message */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>3. Message (Optional)</div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <textarea className="form-control" rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Any additional context or notes for the HFA team..." />
                  </div>
                </div>

                {/* 4. Products Table */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>4. Products</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'center', width: 40, color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' }}>S/N</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' }}>Product Name <span style={{ color: '#ef4444' }}>*</span></th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' }}>Code</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' }}>Type <span style={{ color: '#ef4444' }}>*</span></th>
                          <th style={{ padding: '8px 10px', width: 40, borderBottom: '2px solid #e2e8f0' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.products.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <input className="form-control" style={{ margin: 0, fontSize: 13, padding: '7px 10px' }} value={p.name} onChange={e => updateProduct(idx, 'name', e.target.value)} placeholder="Product name" required />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <input className="form-control" style={{ margin: 0, fontSize: 13, padding: '7px 10px' }} value={p.code} onChange={e => updateProduct(idx, 'code', e.target.value)} placeholder="Optional" />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <select className="form-control" style={{ margin: 0, fontSize: 13, padding: '7px 10px' }} value={p.type} onChange={e => updateProduct(idx, 'type', e.target.value)} required>
                                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <button type="button" onClick={() => removeProduct(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addProduct} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                    <PlusCircle size={13} /> Add Another Product
                  </button>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Add-on Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
