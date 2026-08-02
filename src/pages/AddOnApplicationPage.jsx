import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Award, PlusCircle, Trash2, Upload, FileText,
  CheckCircle, Clock, AlertCircle, Lock, Package, X
} from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
  return `${API_URL}${url.startsWith('/') ? url : '/' + url}`;
};

const getSiteName = (c) => {
  if (!c) return 'Site';
  const siteObj = c.site_id;
  if (siteObj && typeof siteObj === 'object') {
    if (siteObj.name) return siteObj.name;
    if (siteObj.est_name) return siteObj.est_name;
    if (siteObj.trading_name) return siteObj.trading_name;
  }
  const appObj = c.application_id;
  if (appObj && typeof appObj === 'object') {
    if (appObj.establishment_name) return appObj.establishment_name;
    if (appObj.site_name) return appObj.site_name;
  }
  return c.certificate_number ? `Site (${c.certificate_number})` : 'Site';
};

const PRODUCT_TYPES = ['Add product', 'Remove product', 'Change name/code', 'Change ingredients'];

const STATUS_LABELS = {
  submitted: 'Submitted',
  accepted: 'Application Accepted',
  rejected: 'Application Rejected',
  ft_assigned: 'FT Assigned',
  product_approval_form_enabled: 'Product Approval Form Enabled',
  all_forms_received: 'All Product Approval Form Received',
  logsheet_created: 'Logsheet Created',
  waiting_sharia_signature: 'Waiting For Shari\'a Board Signature',
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
  logsheet_created: 'badge-blue',
  waiting_sharia_signature: 'badge-orange',
  product_form_approved: 'badge-green',
  ready_for_certificate: 'badge-teal',
  completed: 'badge-green'
};

const emptyProduct = () => ({ name: '', code: '', type: 'Add product' });

export default function AddOnApplicationPage() {
  const navigate = useNavigate();
  const [certs, setCerts] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    certificate_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    message: '',
    products: [emptyProduct()]
  });

  // Product Approval Form submission state
  const [formResponseApp, setFormResponseApp] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseFile, setResponseFile] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);
  const responseFileRef = useRef(null);

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

  // ─── Products table helpers ──────────────────────────────────────────────
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

  // ─── Submit new application ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.certificate_id) return toast.error('Please select a certificate / site.');
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

  // ─── Submit Product Approval Form response ───────────────────────────────
  const handleFormResponse = async () => {
    if (!responseText.trim() && !responseFile) {
      return toast.error('Please upload your completed form document or type your response.');
    }
    setSubmittingForm(true);
    try {
      const fd = new FormData();
      if (responseFile) fd.append('response_file', responseFile);
      if (responseText.trim()) fd.append('response_text', responseText);
      await api.put(`/api/add-on-applications/${formResponseApp._id}/submit-form`, fd, true);
      toast.success('Product Approval Form response submitted!');
      setFormResponseApp(null);
      setResponseText('');
      setResponseFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit form response.');
    } finally {
      setSubmittingForm(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 80, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  }

  if (certs.length === 0) {
    return (
      <div style={{ maxWidth: 650, margin: '40px auto', padding: '32px', background: 'white', borderRadius: 24, border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <Award size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Add-on Application Unavailable</h3>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Add-on applications are available once you hold an active certificate. Please wait for your main certification to be issued.
        </p>
        <button className="btn btn-outline" onClick={() => navigate('/applications')}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/applications')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', margin: 0 }}>Add-on Product Applications</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Track and manage product additions, removals, and changes to your certificate</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlusCircle size={15} /> New Add-on Application
        </button>
      </div>

      {/* My Applications List */}
      {myApps.length > 0 && (
        <div className="card shadow-sm" style={{ marginBottom: 32 }}>
          <div className="card-header">
            <div className="card-title">My Add-on Applications ({myApps.length})</div>
            <div className="card-subtitle">Track the status of each submitted request</div>
          </div>
          <div style={{ padding: '0 0 8px' }}>
            {myApps.map(app => {
              const certNo = app.certificate_id?.certificate_number || '—';
              const statusLabel = STATUS_LABELS[app.status] || app.status;
              const badgeClass = STATUS_BADGE[app.status] || 'badge-gray';
              const needsFormSubmit = app.status === 'product_approval_form_enabled';

              return (
                <div key={app._id} style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>{statusLabel}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cert: {certNo}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>• {new Date(app.createdAt).toLocaleDateString('en-GB')}</span>
                      </div>

                      {/* Products summary */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {(app.products || []).map((p, i) => (
                          <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: '#f1f5f9', borderRadius: 6, border: '1px solid #e2e8f0', color: '#475569' }}>
                            {p.sn || i + 1}. {p.name} <span style={{ color: '#94a3b8' }}>({p.type})</span>
                          </span>
                        ))}
                      </div>

                      {app.status === 'rejected' && app.rejection_reason && (
                        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
                          <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                          Rejected: {app.rejection_reason}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {/* Product Approval Form action */}
                      {needsFormSubmit && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, animation: 'pulse 2s infinite' }}
                          onClick={() => { setFormResponseApp(app); setResponseText(''); setResponseFile(null); }}
                        >
                          <FileText size={13} /> Submit Product Approval Form
                        </button>
                      )}
                      {app.status === 'completed' && (
                        <span className="badge badge-green" style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Certificate Updated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Approval Form — view admin form content if enabled */}
                  {needsFormSubmit && app.product_approval_form && (
                    <div style={{ marginTop: 12, padding: 14, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', marginBottom: 8 }}>
                        📋 Product Approval Form — Please Review and Submit Your Response
                      </div>
                      {app.product_approval_form.form_file_url && (
                        <a
                          href={getPdfUrl(app.product_approval_form.form_file_url)}
                          target="_blank" rel="noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ marginBottom: 8 }}
                        >
                          <FileText size={13} style={{ marginRight: 6 }} /> View Form Document
                        </a>
                      )}
                      {app.product_approval_form.form_text && (
                        <div style={{ fontSize: 13, color: '#475569', background: 'white', padding: 12, borderRadius: 8, border: '1px solid #fde68a', whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                          {app.product_approval_form.form_text}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show submitted form receipt */}
                  {app.status !== 'product_approval_form_enabled' && app.product_approval_form?.submitted_at && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} /> Product Approval Form submitted on {new Date(app.product_approval_form.submitted_at).toLocaleDateString('en-GB')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myApps.length === 0 && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Package size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 4 }}>No Add-on Applications</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Click "New Add-on Application" to request changes to your certificate's product list.</div>
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
                    ℹ️ This contact email will receive updates at every stage — enter the person directly handling this request (may differ from your account email).
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
                              <input
                                className="form-control"
                                style={{ margin: 0, fontSize: 13, padding: '7px 10px' }}
                                value={p.name}
                                onChange={e => updateProduct(idx, 'name', e.target.value)}
                                placeholder="Product name"
                                required
                              />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <input
                                className="form-control"
                                style={{ margin: 0, fontSize: 13, padding: '7px 10px' }}
                                value={p.code}
                                onChange={e => updateProduct(idx, 'code', e.target.value)}
                                placeholder="Optional"
                              />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <select
                                className="form-control"
                                style={{ margin: 0, fontSize: 13, padding: '7px 10px' }}
                                value={p.type}
                                onChange={e => updateProduct(idx, 'type', e.target.value)}
                                required
                              >
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

      {/* ─── Product Approval Form Submission Modal ────────────────────────── */}
      {formResponseApp && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">Submit Product Approval Form Response</span>
              <button className="modal-close" onClick={() => setFormResponseApp(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ marginBottom: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, fontSize: 13, color: '#166534' }}>
                <strong>Application:</strong> {formResponseApp.certificate_id?.certificate_number} &mdash; {(formResponseApp.products || []).length} product(s)
              </div>

              {/* View admin form content */}
              {formResponseApp.product_approval_form?.form_file_url && (
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Admin's Form Document:</label>
                  <a href={getPdfUrl(formResponseApp.product_approval_form.form_file_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={13} /> View Form Document
                  </a>
                </div>
              )}
              {formResponseApp.product_approval_form?.form_text && (
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Form Content:</label>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                    {formResponseApp.product_approval_form.form_text}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <label className="form-label">Your Response</label>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 0, marginBottom: 12 }}>Upload your completed form document AND/OR type your written response below.</p>

                {/* File upload */}
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    ref={responseFileRef}
                    style={{ display: 'none' }}
                    onChange={e => setResponseFile(e.target.files[0] || null)}
                  />
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => responseFileRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Upload size={13} /> {responseFile ? responseFile.name : 'Upload Completed Form (PDF/Image)'}
                  </button>
                  {responseFile && (
                    <button type="button" onClick={() => setResponseFile(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Text response */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Written Response / Acknowledgement</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Type your response, acknowledgement, or any comments here..."
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setFormResponseApp(null)} disabled={submittingForm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFormResponse} disabled={submittingForm || (!responseText.trim() && !responseFile)}>
                {submittingForm ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
