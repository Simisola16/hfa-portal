import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Award, PlusCircle, Trash2, FileText,
  CheckCircle, AlertCircle, Package, X, Users, ChevronDown, ChevronUp, ArrowUpRight, Activity
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
  product_approval_form_enabled: 'Product Form Enabled',
  all_forms_received: 'Product Form Received',
  logsheet_created: 'Under Review',
  waiting_sharia_signature: 'Under Review',
  product_form_approved: 'Product Form Approved',
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


const emptyProduct = () => ({ name: '', code: '', type: 'Add product', original_name: '', new_name: '', new_code: '' });

export default function AddOnApplicationPage() {
  const navigate = useNavigate();
  const [certs, setCerts] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [clientProducts, setClientProducts] = useState([]);
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
      const [certsRes, appsRes, prodsRes] = await Promise.all([
        api.get('/api/certificates'),
        api.get('/api/add-on-applications'),
        api.get('/api/products').catch(() => ({ data: [] }))
      ]);
      const active = (certsRes.data || []).filter(c =>
        c.status === 'active' && new Date(c.expiry_date) >= new Date()
      );
      setCerts(active);
      setMyApps(appsRes.data?.data || appsRes.data || []);
      setClientProducts(prodsRes.data?.data || prodsRes.data || []);
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

  const selectedCert = certs.find(c => String(c._id || c.id) === String(form.certificate_id));
  const certProducts = selectedCert?.products_covered || [];
  const availableProductNames = Array.from(new Set([
    ...certProducts,
    ...clientProducts.map(p => p.name).filter(Boolean)
  ]));

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
    <div className="animate-in" style={{ maxWidth: 1060, margin: '0 auto', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/applications')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>Add-on Product Applications</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Add, remove, or modify products covered under your existing Halal certificates.</p>
          </div>
        </div>
        {!hasNoCert && (
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontWeight: 700 }}
          >
            <PlusCircle size={16} /> New Add-on Application
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

      {/* Applications list */}
      {myApps.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 14 }}>
            Your Add-on Requests ({myApps.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                            {p.sn || i + 1}. {p.new_name || p.name} <span style={{ opacity: 0.6 }}>({p.type})</span>
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
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                      {needsFormSubmit && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700 }}
                          onClick={() => navigate(`/addon-applications/${app._id}/approval-form`)}
                        >
                          <FileText size={13} /> Complete Product Approval Form
                        </button>
                      )}
                      {app.status === 'completed' && (
                        <span className="badge badge-green" style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Certificate Updated
                        </span>
                      )}
                      
                      {/* Track Button matching Admin */}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/addon-applications/${app._id}/track`)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 12,
                          background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 12px',
                          color: '#1e293b', whiteSpace: 'nowrap'
                        }}
                      >
                        Track <ArrowUpRight size={13} />
                      </button>

                      <button
                        style={{ background: isExpanded ? '#f1f5f9' : 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
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
                                ? `${app.product_approval_form.form_text.slice(0, 200)}...`
                                : app.product_approval_form.form_text}
                            </div>
                          )}
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700 }}
                            onClick={() => navigate(`/addon-applications/${app._id}/approval-form`)}
                          >
                            Open Product Approval Form &rarr;
                          </button>
                        </div>
                      )}

                      {/* Detail fields */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12, marginBottom: 14 }}>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Contact Person:</span>{' '}
                          <strong>{app.contact_name}</strong> {app.contact_phone && `(${app.contact_phone})`}
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Contact Email:</span>{' '}
                          <strong>{app.contact_email}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Site:</span>{' '}
                          <strong>{getSiteName(app.certificate_id)}</strong>
                        </div>
                      </div>

                      {app.message && (
                        <div style={{ fontSize: 12, background: 'white', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600 }}>Message: </span>
                          <span style={{ color: '#334155' }}>{app.message}</span>
                        </div>
                      )}

                      {/* Products table */}
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Products in this Request:</div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={{ padding: '6px 10px', textAlign: 'left', width: 40 }}>S/N</th>
                              <th style={{ padding: '6px 10px', textAlign: 'left' }}>Product Name</th>
                              <th style={{ padding: '6px 10px', textAlign: 'left' }}>Code / SKU</th>
                              <th style={{ padding: '6px 10px', textAlign: 'left' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(app.products || []).map((p, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{p.sn || i + 1}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>{p.new_name || p.name}</td>
                                <td style={{ padding: '6px 10px', color: '#64748b' }}>{p.new_code || p.code || '—'}</td>
                                <td style={{ padding: '6px 10px' }}>
                                  <span style={{
                                    fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                                    background: p.type === 'Add product' ? '#f0fdf4' : p.type === 'Remove product' ? '#fef2f2' : '#f0f9ff',
                                    color: p.type === 'Add product' ? '#166534' : p.type === 'Remove product' ? '#991b1b' : '#0369a1'
                                  }}>
                                    {p.type}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Link to full tracking */}
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, borderRadius: 8 }}
                          onClick={() => navigate(`/addon-applications/${app._id}/track`)}
                        >
                          View Full Processing Timeline & Details <ArrowUpRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── New Application Modal ─────────────────────────────────────────── */}
      {showForm && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 840, maxHeight: '90vh', overflowY: 'auto' }}>
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
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {form.products.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>Item #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeProduct(idx)}
                            disabled={form.products.length === 1}
                            style={{
                              background: form.products.length === 1 ? '#f1f5f9' : '#fee2e2',
                              border: 'none', borderRadius: 6, width: 28, height: 28,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: form.products.length === 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Trash2 size={13} color={form.products.length === 1 ? '#cbd5e1' : '#dc2626'} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Action Type *</label>
                            <select
                              className="form-control"
                              style={{ margin: 0, fontSize: 13 }}
                              value={p.type}
                              onChange={e => updateProduct(idx, 'type', e.target.value)}
                              required
                            >
                              {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>

                          {p.type === 'Add product' && (
                            <>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Product Name *</label>
                                <input
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.name}
                                  onChange={e => updateProduct(idx, 'name', e.target.value)}
                                  placeholder="e.g. Halal Beef Sausage"
                                  required
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Code / SKU</label>
                                <input
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.code}
                                  onChange={e => updateProduct(idx, 'code', e.target.value)}
                                  placeholder="e.g. SKU-101"
                                />
                              </div>
                            </>
                          )}

                          {p.type === 'Remove product' && (
                            <div style={{ gridColumn: 'span 2' }}>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: 4 }}>Pick Product to Remove *</label>
                              <select
                                className="form-control"
                                style={{ margin: 0, fontSize: 13 }}
                                value={p.name || p.original_name || ''}
                                onChange={e => {
                                  updateProduct(idx, 'name', e.target.value);
                                  updateProduct(idx, 'original_name', e.target.value);
                                }}
                                required
                              >
                                <option value="">-- Select Product to Remove --</option>
                                {availableProductNames.map(name => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {p.type === 'Change name/code' && (
                            <>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Pick Existing Product *</label>
                                <select
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.original_name || p.name || ''}
                                  onChange={e => {
                                    updateProduct(idx, 'original_name', e.target.value);
                                    updateProduct(idx, 'name', e.target.value);
                                  }}
                                  required
                                >
                                  <option value="">-- Select Existing Product --</option>
                                  {availableProductNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: 4 }}>New Product Name *</label>
                                <input
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.new_name || ''}
                                  onChange={e => updateProduct(idx, 'new_name', e.target.value)}
                                  placeholder="New Product Name"
                                  required
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: 4 }}>New Code / SKU</label>
                                <input
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.new_code || ''}
                                  onChange={e => updateProduct(idx, 'new_code', e.target.value)}
                                  placeholder="New Code"
                                />
                              </div>
                            </>
                          )}

                          {p.type === 'Change ingredients' && (
                            <>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Pick Product *</label>
                                <select
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.original_name || p.name || ''}
                                  onChange={e => {
                                    updateProduct(idx, 'original_name', e.target.value);
                                    updateProduct(idx, 'name', e.target.value);
                                  }}
                                  required
                                >
                                  <option value="">-- Select Product --</option>
                                  {availableProductNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Notes / Ingredient Changes</label>
                                <input
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.code || ''}
                                  onChange={e => updateProduct(idx, 'code', e.target.value)}
                                  placeholder="e.g. Revised oil formulation"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addProduct} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--primary)', borderColor: 'var(--primary)' }}>
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
