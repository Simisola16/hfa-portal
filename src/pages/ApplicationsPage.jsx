import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, RefreshCw, X, Upload, Check, ChevronRight, ChevronLeft, Trash2, ShieldCheck, FileText, CheckCircle, Download, XCircle, CreditCard, AlertCircle, Calendar } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  if (url.includes('res.cloudinary.com')) {
    if (url.includes('/upload/') && !url.includes('fl_attachment')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
  }
  return url;
};

const ALL_STATUSES = [
  'APPLICATION RECEIVED',
  'APPLICATION APPROVED/REJECT',
  'PROPOSAL SENT',
  'PROPOSAL ACCEPTED/REJECTED',
  'INVOICE SENT',
  'PAYMENT RECEIVED',
  'AUDIT DATE FINALIZED',
  'AUDIT-SESSION',
  'NC REPORTS',
  'NC REPORTS CLOSED',
  'AUDIT REPORT SUBMITTED',
  'APPLICATION SUCCESSFUL/UNSUCCESSFUL',
  'AGREEMENT SENT',
  'SIGNED COPY OF AGREEMENT SENT',
  'AGREEMENT SIGNED COPY RECEIVED',
  'INVOICE FOR FINAL PAYMENT SENT',
  'FINAL PAYMENT RECEIVED',
  'CERTIFICATE PROCESSING',
  'SEND CERTIFICATE'
];

const CATEGORIES = [
  'Annual Certification – Food and General processing',
  'Annual Certification – Meat Processing',
  'UAE/GSO Approved Halal Certification For Exporters To UAE',
];

const CATEGORY_DETAILS = {
  'Annual Certification – Food and General processing': 'This certification applies to manufacturers and processors of food and general consumer products. It covers ingredient sourcing, production processes, hygiene controls, and halal management systems across all product lines handled at the facility.',
  'Annual Certification – Meat Processing': 'This certification is specifically designed for slaughterhouses, abattoirs, and meat processing facilities. It covers the full slaughter process, species handled, use of approved Muslim slaughtermen, stunning methods, and post-slaughter handling and processing in compliance with halal requirements.',
  'UAE/GSO Approved Halal Certification For Exporters To UAE': 'This certification is issued to exporters supplying halal products to the UAE and other GCC countries. It meets the requirements of the UAE/GSO halal standards and covers product compliance, traceability, labelling, and documentation required by UAE import authorities.',
};

const STATUS_BADGE = {
  submitted:'badge-blue', 
  under_review:'badge-yellow', 
  on_hold:'badge-orange',
  audit_scheduled:'badge-purple',
  audit_completed:'badge-green',
  approved:'badge-green',
  rejected:'badge-red',
  certificate_issued:'badge-green',
  'PROPOSAL SENT': 'badge-purple',
  'PROPOSAL ACCEPTED/REJECTED': 'badge-blue',
};

export default function ApplicationsPage({ openNew }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalStep, setModalStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  
  const fileRefs = {
    halal_policy: useRef(),
    ingredient_list: useRef(),
    floor_plan: useRef(),
    company_registration: useRef(),
    haccp_plan: useRef()
  };

  const [form, setForm] = useState({
    application_type: 'new',
    category: CATEGORIES[0],
    site_id: '',
    site_name: '',
    scope: '',
    establishment_name: '',
    establishment_address: '',
    managing_director: '',
    finance_contact: '',
    qa_contact: '',
    halal_coordinator: '',
    production_contact: '',
    production_schedule: '',
    employee_count: '',
    has_porcine: false,
    has_intoxicants: false,
    porcine_details: '',
    intoxicants_details: '',
    declared_true: false,
    notes: '',
    products: []
  });

  const [newProduct, setNewProduct] = useState({ name: '', brand: '', category: '' });
  const [files, setFiles] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, sitesRes] = await Promise.all([
        api.get('/api/applications'),
        api.get('/api/sites')
      ]);
      setApps(appsRes.data || []);
      setSites(sitesRes.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (openNew && sites.length > 0) {
      setShowModal(true);
    } else if (openNew && sites.length === 0 && !loading) {
      toast.error('You must add a business site before submitting an application.');
    }
  }, [openNew, sites, loading]);

  const handleSiteChange = (siteId) => {
    const selected = sites.find(s => s._id === siteId);
    if (selected) {
      setForm(f => ({
        ...f,
        site_id: siteId,
        site_name: selected.name,
        establishment_name: selected.name,
        establishment_address: `${selected.address || ''}, ${selected.address_2 || ''}, ${selected.city || ''}, ${selected.state || ''}`,
        managing_director: selected.contact_person || '',
      }));
    }
  };

  const addProduct = () => {
    if (!newProduct.name) return toast.error('Product name is required');
    setForm(f => ({
      ...f,
      products: [...f.products, { ...newProduct, id: Date.now() }]
    }));
    setNewProduct({ name: '', brand: '', category: '' });
  };

  const removeProduct = (id) => {
    setForm(f => ({
      ...f,
      products: f.products.filter(p => p.id !== id)
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      const submissionData = { ...form };
      submissionData.products = JSON.stringify(form.products);
      
      Object.entries(submissionData).forEach(([k, v]) => fd.append(k, v));
      Object.entries(files).forEach(([k, v]) => fd.append(k, v));

      await api.post('/api/applications', fd, true);
      toast.success('Application submitted successfully!');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      application_type: 'new', category: CATEGORIES[0], site_id: '', site_name: '', scope: '',
      establishment_name: '', establishment_address: '', managing_director: '',
      finance_contact: '', qa_contact: '', halal_coordinator: '', production_contact: '',
      production_schedule: '', employee_count: '', has_porcine: false, has_intoxicants: false,
      porcine_details: '', intoxicants_details: '', declared_true: false, notes: '', products: []
    });
    setFiles({});
    setModalStep(1);
  };

  const filtered = apps.filter(a => {
    const matchSearch = !search || a.application_number?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    const matchType = !filterType || a.application_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const [viewModal, setViewModal] = useState(false);
  const [viewStep, setViewStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [proposalData, setProposalData] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ title: '', amount: '', due_date: '', notes: '', file: null });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditForm, setAuditForm] = useState({ selectedDates: [], unavailable: false });
  const [auditSubmitting, setAuditSubmitting] = useState(false);

  const fetchProposalForApp = async (appId) => {
    setProposalLoading(true);
    setProposalData(null);
    try {
      const res = await api.get(`/api/proposals/application/${appId}`);
      if (res.data) setProposalData(res.data);
    } catch (err) {
      console.error('Failed to load proposal', err);
    } finally {
      setProposalLoading(false);
    }
  };

  const fetchInvoiceForApp = async (appId) => {
    setInvoiceLoading(true);
    setInvoiceData(null);
    try {
      const res = await api.get(`/api/invoices/application/${appId}`);
      if (res.data) setInvoiceData(res.data);
    } catch (err) {
      console.error('Failed to load invoice', err);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const fetchAuditForApp = async (appId) => {
    setAuditLoading(true);
    setAuditData(null);
    try {
      const res = await api.get(`/api/audits/application/${appId}`);
      if (res.data?.data) setAuditData(res.data.data);
    } catch (err) {
      console.error('Failed to load audit', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status, comment = '') => {
    if (status === 'rejected' && !comment) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/api/proposals/${id}`, { status, client_comment: comment });

      // Set the correct application status depending on what the client chose
      const newAppStatus = status === 'accepted' ? 'PROPOSAL ACCEPTED/REJECTED' : 'PROPOSAL REJECTED';
      await api.put(`/api/applications/${selectedApp._id || selectedApp.id}/status`, { status: newAppStatus });

      // Update local selectedApp state so the UI reflects the new status immediately
      setSelectedApp(prev => ({ ...prev, status: newAppStatus }));

      toast.success(`Proposal ${status === 'accepted' ? 'accepted' : 'rejected'} successfully`);
      setShowRejectModal(false);
      setRejectComment('');
      fetchProposalForApp(selectedApp._id || selectedApp.id);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpen = app => {
    setSelectedApp(app);
    setViewModal(true);
    setViewStep(1);
    const appId = app._id || app.id;
    fetchProposalForApp(appId);
    fetchInvoiceForApp(appId);
    fetchAuditForApp(appId);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedApp(null);
  };

  useEffect(() => {
    const appId = searchParams.get('appId');
    if (appId && apps.length > 0) {
      const targetApp = apps.find(a => a._id === appId || a.id === appId);
      if (targetApp) {
        handleOpen(targetApp);
      }
    }
  }, [apps, searchParams]);

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search applications..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.keys(STATUS_BADGE).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={fetchData}><RefreshCw size={14} /></button>
      <button className="btn btn-primary ml-auto" 
        onClick={() => {
          if (sites.length === 0) {
            toast.error('Please add a site in "Manage Sites" first.');
            return;
          }
          setShowModal(true);
        }}
      >
        <Plus size={15} /> New Application
      </button>

      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Applications ({filtered.length})</h3>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} color="var(--primary)" opacity={0.3} />
              <h4>No Applications Found</h4>
              <p>Start your certification process by creating a new application.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>App Number</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Site Name</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => (
                  <tr key={app._id}>
                    <td className="font-bold text-primary">{app.application_number}</td>
                    <td><span className="badge badge-gray capitalize">{app.application_type}</span></td>
                    <td className="truncate" style={{ maxWidth: 200 }}>{app.category}</td>
                    <td>{app.site_name}</td>
                    <td>{new Date(app.created_at).toLocaleDateString()}</td>
                    <td><span className={`badge ${STATUS_BADGE[app.status]}`}>{app.status?.replace(/_/g, ' ')}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpen(app)} title="Open Actions">
                          <Eye size={14} />
                        </button>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewModal && selectedApp && (
        <div className="modal-overlay" onClick={() => { setViewModal(false); setSelectedApp(null); }}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header" style={{ flexDirection:'column', alignItems:'flex-start', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:4 }}>My Application</div>
                  <h2 className="modal-title">{selectedApp.application_number}</h2>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{selectedApp.establishment_name} &middot; {new Date(selectedApp.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <button className="modal-close" onClick={() => { setViewModal(false); setSelectedApp(null); }}><X size={20}/></button>
              </div>
              {/* Audit Action Banner (Moved to top of Modal) */}
              {auditData && (
                <div style={{ margin: '16px 0', width: '100%' }}>
                  {auditData.status === 'dates_proposed' && (
                    <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fefce8)', border: '1.5px solid #fde68a', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AlertCircle size={20} style={{ color: '#d97706' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e', marginBottom: 3 }}>
                            🗓️ Action Required: Audit Dates Proposed
                          </div>
                          <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.4 }}>
                            Admin has proposed 3 dates. Please select exactly 2, or mark as unavailable.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', border: 'none', whiteSpace: 'nowrap', fontSize: 13, padding: '10px 18px' }}
                        onClick={() => {
                          setAuditForm({ selectedDates: [], unavailable: false });
                          setShowAuditModal(true);
                        }}
                      >
                        <Calendar size={14} style={{ marginRight: 4 }}/> Select Dates
                      </button>
                    </div>
                  )}

                  {auditData.status === 'dates_accepted' && (
                    <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#f7fef9)', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CheckCircle size={20} style={{ color: '#16a34a' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#166534', marginBottom: 3 }}>
                            ✓ Audit Dates Selected
                          </div>
                          <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.4 }}>
                            Waiting for Admin to assign an auditor for {auditData.selected_dates?.map(d => new Date(d).toLocaleDateString()).join(' or ')}.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(auditData.status === 'auditors_assigned' || auditData.status === 'audit_completed') && (
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 12, padding: '16px 20px', width: '100%' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 12 }}>👨‍💼 Assigned Auditors</div>
                      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                        {auditData.auditors?.map((a, i) => (
                          <div key={i} style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>{a.name}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{a.email} • {a.contact_number}</div>
                            </div>
                            <div style={{ fontSize: 11, background: '#e2e8f0', color: '#475569', padding: '4px 8px', borderRadius: '4px', height: 'fit-content' }}>{a.purpose || 'Audit'}</div>
                          </div>
                        ))}
                      </div>
                      
                      {auditData.nc_reports?.length > 0 && (
                        <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: 16 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#b91c1c', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertCircle size={16}/> Non-Conformity (NC) Reports
                          </div>
                          <div style={{ display: 'grid', gap: 12 }}>
                            {auditData.nc_reports.map((nc, i) => (
                              <div key={i} style={{ background: nc.status === 'corrected' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${nc.status === 'corrected' ? '#bbf7d0' : '#fecaca'}`, padding: '16px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: nc.status === 'corrected' ? '#166534' : '#b91c1c', textTransform: 'uppercase' }}>
                                    {nc.status === 'corrected' ? '✓ Corrected' : '⚠️ Action Required'}
                                  </span>
                                  <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(nc.flagged_at).toLocaleDateString()}</span>
                                </div>
                                <p style={{ fontSize: 13, margin: '0 0 12px 0', color: '#334155' }}>{nc.text}</p>
                                
                                <div style={{ display: 'flex', gap: 12 }}>
                                  {nc.document_url && (
                                    <a href={getPdfUrl(nc.document_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>View Document</a>
                                  )}
                                  {nc.status === 'flagged' && (
                                    <button
                                      className="btn btn-primary btn-sm"
                                      style={{ fontSize: 11, background: '#dc2626', borderColor: '#dc2626' }}
                                      onClick={async () => {
                                        if (window.confirm('Have you corrected this Non-Conformity? This will notify the admin.')) {
                                          try {
                                            const res = await api.post('/api/audits/resolve-nc', {
                                              audit_id: auditData._id || auditData.id,
                                              report_id: nc._id || nc.id
                                            });
                                            setAuditData(res.data);
                                            toast.success('NC Report marked as corrected!');
                                          } catch(err) {
                                            toast.error(err.message || 'Failed to resolve NC report');
                                          }
                                        }
                                      }}
                                    >
                                      Mark as Corrected
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div style={{ display:'flex', gap:0, borderBottom:'2px solid #f1f5f9', width:'100%', marginBottom:-20 }}>
                {[{id:1,label:'View Application'},{id:2,label:'Track Processing'},{id:3,label:'Proposal'},{id:4,label:'Audit Date'}].map(tab => (
                  <button key={tab.id} onClick={() => setViewStep(tab.id)} style={{
                    padding:'10px 20px', border:'none', background:'none', cursor:'pointer',
                    fontSize:13, fontWeight:700,
                    color: viewStep===tab.id ? 'var(--primary)' : '#94a3b8',
                    borderBottom: viewStep===tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                    marginBottom:-2, transition:'all 0.15s'
                  }}>{tab.label}</button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ maxHeight:'65vh', overflowY:'auto' }}>

              {/* ── VIEW APPLICATION TAB ── */}
              {viewStep === 1 && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                    <div className="detail-item"><label>Application Type</label><div className="capitalize">{selectedApp.application_type} Certification</div></div>
                    <div className="detail-item"><label>Category</label><div style={{ fontSize:13 }}>{selectedApp.category}</div></div>
                    <div className="detail-item"><label>Establishment</label><div>{selectedApp.establishment_name}</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>{selectedApp.establishment_address}</div></div>
                    <div className="detail-item"><label>Site Name</label><div>{selectedApp.site_name || '—'}</div></div>
                    <div className="detail-item"><label>Employees</label><div>{selectedApp.employee_count || '—'} staff</div></div>
                    <div className="detail-item"><label>Schedule</label><div>{selectedApp.production_schedule || '—'}</div></div>
                  </div>
                  <div className="detail-item" style={{ marginBottom:20 }}>
                    <label>Scope of Certification</label>
                    <div style={{ background:'#f0fdf4', padding:14, borderRadius:10, border:'1px solid #dcfce7', fontStyle:'italic', color:'#166534', fontSize:13 }}>
                      &ldquo;{selectedApp.scope || 'No scope defined'}&rdquo;
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
                    <div className="detail-item"><label>Halal Coordinator</label><div>{selectedApp.halal_coordinator || '—'}</div></div>
                    <div className="detail-item"><label>QA Manager</label><div>{selectedApp.qa_contact || '—'}</div></div>
                    <div className="detail-item"><label>Finance</label><div>{selectedApp.finance_contact || '—'}</div></div>
                  </div>
                  <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                    <span className={`badge ${selectedApp.has_porcine ? 'badge-red' : 'badge-green'}`}>{selectedApp.has_porcine ? '⚠ Porcine Handling' : '✓ No Porcine'}</span>
                    <span className={`badge ${selectedApp.has_intoxicants ? 'badge-red' : 'badge-green'}`}>{selectedApp.has_intoxicants ? '⚠ Intoxicants Used' : '✓ No Intoxicants'}</span>
                  </div>
                  {selectedApp.products?.length > 0 && (
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Products ({selectedApp.products.length})</div>
                      <div className="table-wrap" style={{ border:'1px solid #f1f5f9', borderRadius:10 }}>
                        <table><thead><tr><th>Name</th><th>Brand</th></tr></thead>
                          <tbody>{selectedApp.products.map((p,i) => <tr key={i}><td>{p.name}</td><td>{p.brand||'—'}</td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TRACK PROCESSING TAB ── */}
              {viewStep === 2 && (
                <div>
                  <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:24, marginBottom:20 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:32 }}>
                      {ALL_STATUSES.map((step, idx) => {
                        const statusToFind = selectedApp.processing_status || selectedApp.status?.toUpperCase() || 'APPLICATION RECEIVED';
                        let currentIdx = ALL_STATUSES.indexOf(statusToFind);
                        if (statusToFind === 'PROPOSAL REJECTED') currentIdx = 3;
                        const done = idx <= currentIdx;
                        const isProposalRejected = step === 'PROPOSAL SENT' && (selectedApp.status === 'PROPOSAL REJECTED' || proposalData?.status === 'rejected');
                        const isInvoiceStep = step === 'INVOICE SENT';
                        const isPaymentStep = step === 'PAYMENT RECEIVED';
                        const canPayInvoice = isPaymentStep && invoiceData && invoiceData.status !== 'paid';

                        return (
                          <div
                            key={step}
                            onClick={() => {
                              if (canPayInvoice) {
                                setShowPaymentModal(true);
                              }
                            }}
                            title={canPayInvoice ? 'Click to confirm payment' : undefined}
                            style={{ 
                              background: isProposalRejected ? '#fef2f2' : canPayInvoice ? 'linear-gradient(135deg,#f0fdf4,#f7fee7)' : done?'#f0fdf4':'#f1f5f9', 
                              border:`2px solid ${isProposalRejected ? '#fca5a5' : canPayInvoice ? '#86efac' : done?'#bbf7d0':'#e2e8f0'}`, 
                              borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', 
                              textAlign:'center', padding:'12px 6px', minHeight:75, position:'relative',
                              cursor: canPayInvoice ? 'pointer' : 'default',
                              boxShadow: isProposalRejected ? '0 0 0 3px rgba(239,68,68,0.12)' : canPayInvoice ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ width:'90%', height:8, background: isProposalRejected?'#ef4444': canPayInvoice ? '#16a34a' : done?'#22c55e':'#cbd5e1', borderRadius:4, marginBottom:10 }}/>
                            <div style={{ fontSize:10, fontWeight:700, color: isProposalRejected?'#dc2626': canPayInvoice ? '#166534' : done?'#0f172a':'#64748b', textTransform:'uppercase', display:'flex', gap:4, alignItems:'center', lineHeight:'1.2' }}>
                              {isProposalRejected ? <X size={12} style={{ color:'#ef4444', minWidth:12 }}/> : done && <CheckCircle size={12} style={{ color:'#22c55e', minWidth:12 }}/>}{step}
                            </div>
                            {isProposalRejected && <div style={{ position:'absolute', bottom:3, fontSize:'8px', fontWeight:800, color:'#ef4444', textTransform:'uppercase' }}>REJECTED</div>}
                            {canPayInvoice && <div style={{ position:'absolute', bottom:3, fontSize:'8px', fontWeight:800, color:'#16a34a', textTransform:'uppercase', display:'flex', alignItems:'center', gap:2 }}><Upload size={8}/>PAY NOW</div>}
                            {step === 'PAYMENT RECEIVED' && invoiceData?.status === 'paid' && <div style={{ position:'absolute', bottom:3, fontSize:'8px', fontWeight:800, color:'#15803d', textTransform:'uppercase' }}>✓ PAID</div>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Invoice Action Banner — shown when invoice is sent by admin */}
                    {invoiceData && (
                      <div style={{ background: invoiceData.status === 'paid' ? 'linear-gradient(135deg,#f0fdf4,#f7fef9)' : invoiceData.status === 'client_paid' ? 'linear-gradient(135deg,#eff6ff,#f8fafc)' : 'linear-gradient(135deg,#fffbeb,#fefce8)', border: `1.5px solid ${invoiceData.status === 'paid' ? '#86efac' : invoiceData.status === 'client_paid' ? '#bfdbfe' : '#fde68a'}`, borderRadius:12, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                          <div style={{ width:40, height:40, background: invoiceData.status === 'paid' ? '#dcfce7' : invoiceData.status === 'client_paid' ? '#dbeafe' : '#fef3c7', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {invoiceData.status === 'paid' ? <CheckCircle size={20} style={{ color:'#16a34a' }} /> : invoiceData.status === 'client_paid' ? <CheckCircle size={20} style={{ color:'#2563eb' }} /> : <AlertCircle size={20} style={{ color:'#d97706' }} />}
                          </div>
                          <div>
                            <div style={{ fontWeight:800, fontSize:14, color: invoiceData.status === 'paid' ? '#166534' : invoiceData.status === 'client_paid' ? '#1e3a8a' : '#92400e', marginBottom:3 }}>
                              {invoiceData.status === 'paid' ? `✓ Payment Complete` : invoiceData.status === 'client_paid' ? '✓ Payment Pending Admin Verification' : '📄 Action Required: Pay Your Invoice'}
                            </div>
                            <div style={{ fontSize:12, color: invoiceData.status === 'paid' ? '#15803d' : invoiceData.status === 'client_paid' ? '#1d4ed8' : '#b45309', lineHeight:1.4 }}>
                              Invoice: {invoiceData.invoice_number} · Amount: £{invoiceData.amount}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {invoiceData.invoice_url && (
                            <a
                              href={getPdfUrl(invoiceData.invoice_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-sm"
                              style={{ whiteSpace:'nowrap', borderColor: invoiceData.status === 'paid' ? '#86efac' : '#cbd5e1', color: invoiceData.status === 'paid' ? '#16a34a' : '#475569', fontSize:12 }}
                            >
                              <FileText size={13} /> View Invoice
                            </a>
                          )}
                          {invoiceData.status !== 'paid' && invoiceData.status !== 'client_paid' && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ background:'linear-gradient(135deg,#16a34a,#15803d)', border:'none', whiteSpace:'nowrap', fontSize:13, padding:'10px 18px' }}
                              onClick={() => {
                                setShowPaymentModal(true);
                              }}
                            >
                              <Upload size={14} /> Confirm Payment
                            </button>
                          )}
                        </div>
                      </div>
                    )}



                    <div style={{ border:'1px solid #e2e8f0', borderRadius:12, background:'white', padding:'32px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ textAlign:'center', fontSize:18, fontWeight:800, color:'#334155', marginBottom:24, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        {selectedApp.processing_status || selectedApp.status?.replace(/_/g,' ').toUpperCase() || 'APPLICATION RECEIVED'}
                      </h3>
                      <table style={{ width:'100%', borderCollapse:'collapse', border:'1px solid #cbd5e1' }}>
                        <tbody>
                          {[['Application Number', selectedApp.application_number],['Registered Company', selectedApp.profiles?.company_name || '—'],['Date Submitted', new Date(selectedApp.created_at).toLocaleDateString('en-GB')],['Category', `${selectedApp.application_type} – ${selectedApp.category}`],['Current Status', selectedApp.status?.replace(/_/g,' ')],['Site', selectedApp.site_name||'—']].map(([k,v])=>(
                            <tr key={k}>
                              <td style={{ border:'1px solid #cbd5e1', padding:'12px 16px', fontWeight:600, fontSize:14, width:'35%', background:'#f8fafc', color:'#475569' }}>{k}:</td>
                              <td style={{ border:'1px solid #cbd5e1', padding:'12px 16px', fontSize:14, color:'#0f172a' }}>{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PROPOSAL TAB ── */}
              {viewStep === 3 && (
                <div>
                  <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:24, marginBottom:20, minHeight: 300 }}>
                      {proposalLoading ? (
                        <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                      ) : proposalData ? (
                        <div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20, flexWrap:'wrap', gap:12 }}>
                            <h4 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', margin: 0 }}>Certification Proposal</h4>
                            <span className={`badge ${
                              proposalData.status === 'accepted' ? 'badge-green' :
                              proposalData.status === 'rejected' ? 'badge-red' : 'badge-yellow'
                            }`} style={{ fontSize: 12, padding: '4px 12px' }}>
                              {proposalData.status === 'accepted' ? '✓ Accepted' : proposalData.status === 'rejected' ? '✗ Rejected' : '⏳ Pending Review'}
                            </span>
                          </div>

                          {/* Rejected Banner */}
                          {proposalData.status === 'rejected' && (
                            <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '18px 20px', marginBottom: 20, display:'flex', gap:14, alignItems:'flex-start' }}>
                              <div style={{ width:36, height:36, background:'#fee2e2', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                                <XCircle size={18} style={{ color:'#dc2626' }} />
                              </div>
                              <div>
                                <div style={{ fontWeight:800, fontSize:14, color:'#991b1b', marginBottom:4 }}>You Rejected This Proposal</div>
                                {proposalData.client_comment && (
                                  <div style={{ fontSize:13, color:'#b91c1c', fontStyle:'italic', marginBottom:6 }}>"{proposalData.client_comment}"</div>
                                )}
                                <div style={{ fontSize:12, color:'#dc2626', fontWeight:600 }}>HFA will review your feedback and send a revised proposal. You will be notified once a new proposal is ready.</div>
                              </div>
                            </div>
                          )}

                          {/* Cost + Document grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: proposalData.proposal_url ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
                            {proposalData.proposal_url && (
                              <div style={{ background: proposalData.status === 'rejected' ? '#fef2f2' : '#f8fafc', border: `1px solid ${proposalData.status === 'rejected' ? '#fecaca' : '#e2e8f0'}`, padding: 16, borderRadius: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Proposal Document</div>
                                <a 
                                  href={getPdfUrl(proposalData.proposal_url)}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-outline btn-sm"
                                  style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                                >
                                  <Download size={14} /> Download PDF
                                </a>
                              </div>
                            )}
                            <div style={{ background: proposalData.status === 'rejected' ? '#fef2f2' : '#f8fafc', border: `1px solid ${proposalData.status === 'rejected' ? '#fecaca' : '#e2e8f0'}`, padding: 16, borderRadius: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Estimated Cost</div>
                              <div style={{ fontSize: 24, fontWeight: 800, color: proposalData.status === 'rejected' ? '#dc2626' : 'var(--primary)', marginTop: 4 }}>
                                £{proposalData.estimated_cost || proposalData.amount || '—'}
                              </div>
                            </div>
                          </div>

                          {proposalData.admin_comment && (
                            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8, display:'flex', alignItems:'center', gap:6 }}>
                                <FileText size={12} /> HFA Admin Message
                              </div>
                              <div style={{ fontSize: 14, color: '#334155', fontStyle: 'italic' }}>"{proposalData.admin_comment}"</div>
                            </div>
                          )}

                          {proposalData.details && (
                            <div style={{ marginBottom: 20, background: '#f8fafc', border: '1px solid #e2e8f0', padding: 20, borderRadius: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Proposal Details</div>
                              <div style={{ fontSize: 15, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                {proposalData.details}
                              </div>
                            </div>
                          )}

                          {proposalData.status === 'accepted' && (
                            <div>
                              {/* Accepted Proposal — Upload Invoice Banner */}
                              <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fef9 100%)', border: '1.5px solid #86efac', borderRadius: '12px', padding: '18px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                  <div style={{ width: 40, height: 40, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <CheckCircle size={20} style={{ color: '#16a34a' }} />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: 14, color: '#166534', marginBottom: 3 }}>
                                      {invoiceData ? '✓ Invoice Uploaded' : 'Proposal Accepted — Upload Invoice'}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.4 }}>
                                      {invoiceData
                                        ? `Invoice ${invoiceData.invoice_number} sent · £${invoiceData.amount} · Status: ${invoiceData.status}`
                                        : 'You have accepted the proposal. Please upload your invoice or proof of payment to proceed.'}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', whiteSpace: 'nowrap', fontSize: 13, padding: '10px 20px' }}
                                  onClick={() => {
                                    setInvoiceForm({ title: `Invoice for ${selectedApp.application_number}`, amount: proposalData.estimated_cost || '', due_date: '', notes: '', file: null });
                                    fetchProposalForApp(selectedApp._id || selectedApp.id);
                                    fetchInvoiceForApp(selectedApp._id || selectedApp.id);
                                    fetchAuditForApp(selectedApp._id || selectedApp.id);
                                  }}
                                >
                                  {invoiceData ? '↑ Resend Invoice' : '↑ Upload Invoice'}
                                </button>
                              </div>
                            </div>
                          )}

                          {proposalData.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ color: '#dc2626', borderColor: '#fecaca', padding: '10px 24px' }}
                                onClick={() => setShowRejectModal(true)}
                              >
                                <XCircle size={16} /> Reject
                              </button>
                              <button 
                                className="btn btn-primary"
                                style={{ padding: '10px 24px' }}
                                onClick={() => handleStatusUpdate(proposalData._id || proposalData.id, 'accepted')}
                              >
                                <CheckCircle size={16} /> Accept Proposal
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="empty-state" style={{ padding: '60px 20px' }}>
                          <FileText size={64} style={{ color: 'var(--primary)', opacity: 0.2, marginBottom: 20 }} />
                          <h4 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>No Proposal Yet</h4>
                          <p style={{ color: '#64748b', marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
                            HFA has not sent a proposal for this application yet. You will be notified once it is ready for your review.
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* ── AUDIT DATE TAB ── */}
              {viewStep === 4 && (
                <div>
                  <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:24, marginBottom:20, minHeight: 300 }}>
                    {auditLoading ? (
                      <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : auditData ? (
                      <div>
                        {/* Status Header */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20, flexWrap:'wrap', gap:12 }}>
                          <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', margin: 0 }}>Audit Details</h4>
                          <span className={`badge ${
                            auditData.status === 'dates_accepted' || auditData.status === 'auditors_assigned' || auditData.status === 'audit_completed' ? 'badge-green' :
                            auditData.status === 'dates_rejected' ? 'badge-red' : 'badge-yellow'
                          }`} style={{ fontSize: 12, padding: '4px 12px' }}>
                            {auditData.status === 'dates_accepted' ? '✓ Dates Selected' : 
                             auditData.status === 'auditors_assigned' ? '✓ Auditors Assigned' : 
                             auditData.status === 'audit_completed' ? '✓ Audit Completed' : 
                             auditData.status === 'dates_rejected' ? '✗ Unavailable' : '⏳ Pending Scheduling'}
                          </span>
                        </div>

                        {/* If dates proposed but not accepted yet, show date selection inline! */}
                        {auditData.status === 'dates_proposed' && (
                          <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fefce8)', border: '1.5px solid #fde68a', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#92400e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <AlertCircle size={18} style={{ color: '#d97706' }} /> Action Required: Select Audit Dates
                            </div>
                            <p style={{ fontSize: 13, color: '#b45309', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                              HFA has proposed 3 dates. Please select exactly 2 dates where your team is available, or mark all as unavailable if none fit.
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', border: 'none' }}
                              onClick={() => {
                                setAuditForm({ selectedDates: [], unavailable: false });
                                setShowAuditModal(true);
                              }}
                            >
                              <Calendar size={14} style={{ marginRight: 6 }}/> Click to Choose Dates
                            </button>
                          </div>
                        )}

                        {/* Audit Dates Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
                          {auditData.selected_dates?.length > 0 && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 20, borderRadius: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={14} /> Finalized Audit Dates
                              </div>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                {auditData.selected_dates.map((d, i) => (
                                  <div key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 700, padding: '8px 16px', borderRadius: 8, fontSize: 14 }}>
                                    {new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {auditData.status === 'dates_proposed' && auditData.proposed_dates?.length > 0 && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 20, borderRadius: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={14} /> Proposed Audit Dates (Awaiting Selection)
                              </div>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                {auditData.proposed_dates.map((d, i) => (
                                  <div key={i} style={{ background: '#fbf7f0', border: '1px solid #fde68a', color: '#b45309', fontWeight: 600, padding: '8px 16px', borderRadius: 8, fontSize: 13 }}>
                                    {new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Assigned Auditors Section */}
                        {(auditData.status === 'auditors_assigned' || auditData.status === 'audit_completed') && auditData.auditors?.length > 0 && (
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                              👨‍💼 Assigned Auditor(s)
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                              {auditData.auditors.map((a, i) => (
                                <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{a.name}</div>
                                    <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                                      {a.purpose || 'Lead Auditor'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div>📧 {a.email}</div>
                                    <div>📞 {a.contact_number}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Non-Conformity (NC) Reports Section */}
                        {(auditData.status === 'auditors_assigned' || auditData.status === 'audit_completed') && (
                          <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: 20 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#dc2626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                              ⚠️ Non-Conformity (NC) Reports
                            </div>
                            {auditData.nc_reports?.length > 0 ? (
                              <div style={{ display: 'grid', gap: 12 }}>
                                {auditData.nc_reports.map((nc, i) => (
                                  <div key={i} style={{ background: nc.status === 'corrected' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${nc.status === 'corrected' ? '#bbf7d0' : '#fecaca'}`, padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                      <span style={{ fontSize: 11, fontWeight: 800, color: nc.status === 'corrected' ? '#166534' : '#b91c1c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {nc.status === 'corrected' ? '✓ Corrected' : '⚠️ Outstanding NC'}
                                      </span>
                                      <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(nc.flagged_at).toLocaleDateString('en-GB')}</span>
                                    </div>
                                    <p style={{ fontSize: 13, margin: '0 0 12px 0', color: '#334155', lineHeight: 1.5 }}>{nc.text}</p>
                                    
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                      {nc.document_url && (
                                        <a href={getPdfUrl(nc.document_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '6px 12px' }}>
                                          View Document
                                        </a>
                                      )}
                                      {nc.status === 'flagged' && (
                                        <button
                                          className="btn btn-primary btn-sm"
                                          style={{ fontSize: 11, background: '#dc2626', borderColor: '#dc2626', padding: '6px 12px' }}
                                          onClick={async () => {
                                            if (window.confirm('Have you resolved this Non-Conformity? This will notify HFA Admin.')) {
                                              try {
                                                const res = await api.post('/api/audits/resolve-nc', {
                                                  audit_id: auditData._id || auditData.id,
                                                  report_id: nc._id || nc.id
                                                });
                                                setAuditData(res.data);
                                                toast.success('NC Report marked as corrected successfully!');
                                              } catch(err) {
                                                toast.error(err.message || 'Failed to resolve NC report');
                                              }
                                            }
                                          }}
                                        >
                                          Mark as Corrected
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '24px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, color: '#64748b', fontSize: 13 }}>
                                No NC reports have been flagged for this session.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Calendar size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: 16, color: '#334155', marginBottom: 8 }}>No Audit Scheduled</h3>
                        <p style={{ fontSize: 13, color: '#64748b', maxWidth: 360, margin: '0 auto' }}>
                          An audit has not been scheduled yet. We will notify you once HFA starts proposing dates.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setViewModal(false); setSelectedApp(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2 className="modal-title">HFA Certification Application</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-steps">
              {[1, 2, 3, 4, 5, 6].map(s => (
                <div key={s} className={`step-item ${modalStep === s ? 'active' : ''} ${modalStep > s ? 'completed' : ''}`}>
                  <div className="step-number">{modalStep > s ? <Check size={14} /> : s}</div>
                </div>
              ))}
            </div>

            <div className="modal-body" style={{ minHeight: 450 }}>
              {modalStep === 1 && (
                <div className="animate-fade-in">
                  <h3 className="section-title">Step 1: Application Basics</h3>
                  <div className="form-group">
                    <label className="form-label">Select Site <span>*</span></label>
                    <select className="form-control" value={form.site_id} onChange={e => handleSiteChange(e.target.value)} required>
                      <option value="">-- Select Site --</option>
                      {sites.map(s => <option key={s._id} value={s._id}>{s.name} ({s.city})</option>)}
                    </select>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Application Type <span>*</span></label>
                      <select className="form-control" value={form.application_type} onChange={e => setForm(f => ({...f, application_type: e.target.value}))}>
                        <option value="new">New Application</option>
                        <option value="renewal">Renewal</option>
                        <option value="surveillance">Surveillance</option>
                        <option value="addon">Add-on</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category <span>*</span></label>
                      <select className="form-control" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  {CATEGORY_DETAILS[form.category] && (
                    <div style={{ marginTop: 12, padding: '14px 16px', background: '#f0fdf9', borderRadius: 8, border: '1px solid #99e6d3' }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#1B7A7A', lineHeight: 1.6 }}>{CATEGORY_DETAILS[form.category]}</p>
                    </div>
                  )}
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Scope of Certification <span>*</span></label>
                    <textarea className="form-control" rows={3} placeholder="Describe the activities to be certified (e.g., Slaughtering and processing of poultry...)" value={form.scope} onChange={e => setForm(f => ({...f, scope: e.target.value}))} required />
                  </div>
                </div>
              )}

              {modalStep === 2 && (
                <div className="animate-fade-in">
                  <h3 className="section-title">Step 2: Company Details</h3>
                  <div className="form-group">
                    <label className="form-label">Legal Establishment Name</label>
                    <input type="text" className="form-control" value={form.establishment_name} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Establishment Address</label>
                    <textarea className="form-control" rows={2} value={form.establishment_address} readOnly />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Managing Director</label>
                      <input type="text" className="form-control" value={form.managing_director} onChange={e => setForm(f => ({...f, managing_director: e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Production Manager</label>
                      <input type="text" className="form-control" value={form.production_contact} onChange={e => setForm(f => ({...f, production_contact: e.target.value}))} />
                    </div>
                  </div>
                </div>
              )}

              {modalStep === 3 && (
                <div className="animate-fade-in">
                  <h3 className="section-title">Step 3: Certification Contacts</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Halal Coordinator <span>*</span></label>
                      <input type="text" className="form-control" value={form.halal_coordinator} onChange={e => setForm(f => ({...f, halal_coordinator: e.target.value}))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quality Assurance (QA) <span>*</span></label>
                      <input type="text" className="form-control" value={form.qa_contact} onChange={e => setForm(f => ({...f, qa_contact: e.target.value}))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Finance / Accounts Contact</label>
                      <input type="text" className="form-control" value={form.finance_contact} onChange={e => setForm(f => ({...f, finance_contact: e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Employee Count <span>*</span></label>
                      <input type="number" className="form-control" value={form.employee_count} onChange={e => setForm(f => ({...f, employee_count: e.target.value}))} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Production Schedule (Hours of Operation) <span>*</span></label>
                    <input type="text" className="form-control" placeholder="e.g. 08:00 - 17:00, Mon-Fri" value={form.production_schedule} onChange={e => setForm(f => ({...f, production_schedule: e.target.value}))} required />
                  </div>
                </div>
              )}

              {modalStep === 4 && (
                <div className="animate-fade-in">
                  <h3 className="section-title">Step 4: Product List</h3>
                  <div className="card p-4 mb-4 bg-light">
                    <div className="form-grid">
                      <input type="text" className="form-control" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                      <input type="text" className="form-control" placeholder="Brand" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} />
                      <button type="button" className="btn btn-primary" onClick={addProduct}><Plus size={14} /> Add</button>
                    </div>
                  </div>
                  <div className="table-wrap" style={{ maxHeight: 250, overflowY: 'auto' }}>
                    <table className="table-sm">
                      <thead>
                        <tr><th>Product Name</th><th>Brand</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {form.products.map(p => (
                          <tr key={p.id}>
                            <td>{p.name}</td><td>{p.brand}</td>
                            <td><button type="button" onClick={() => removeProduct(p.id)} className="btn-icon text-red"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                        {form.products.length === 0 && <tr><td colSpan="3" className="text-center py-4">No products added yet</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {modalStep === 5 && (
                <div className="animate-fade-in">
                  <h3 className="section-title">Step 5: Declarations</h3>
                  <div className="card p-4 border-teal bg-teal-light mb-4">
                    <div className="form-group mb-0">
                      <label className="checkbox-label font-bold">
                        <input type="checkbox" checked={form.has_porcine} onChange={e => setForm(f => ({...f, has_porcine: e.target.checked}))} />
                        Does the site handle any Porcine (Pork) related materials?
                      </label>
                      {form.has_porcine && (
                        <textarea className="form-control mt-3" placeholder="Provide details on segregation and control..." value={form.porcine_details} onChange={e => setForm(f => ({...f, porcine_details: e.target.value}))} />
                      )}
                    </div>
                  </div>
                  <div className="card p-4 border-teal bg-teal-light mb-4">
                    <div className="form-group mb-0">
                      <label className="checkbox-label font-bold">
                        <input type="checkbox" checked={form.has_intoxicants} onChange={e => setForm(f => ({...f, has_intoxicants: e.target.checked}))} />
                        Does the site handle any Intoxicants (Alcohol)?
                      </label>
                      {form.has_intoxicants && (
                        <textarea className="form-control mt-3" placeholder="Describe usage (e.g., cleaning, ingredient)..." value={form.intoxicants_details} onChange={e => setForm(f => ({...f, intoxicants_details: e.target.value}))} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {modalStep === 6 && (
                <div className="animate-fade-in">
                  <h3 className="section-title">Step 6: Documents & Submission</h3>
                  <div className="form-grid">
                    {[
                      { key: 'halal_policy', label: 'Halal Policy' },
                      { key: 'ingredient_list', label: 'Ingredient List' },
                      { key: 'floor_plan', label: 'Floor Plan' },
                      { key: 'haccp_plan', label: 'HACCP Plan' },
                    ].map(doc => (
                      <div className="form-group" key={doc.key}>
                        <label className="form-label">{doc.label} <span>*</span></label>
                        <input type="file" ref={fileRefs[doc.key]} className="hidden" style={{ display: 'none' }} onChange={e => setFiles(f => ({...f, [doc.key]: e.target.files[0]}))} />
                        <div className="file-upload-box" onClick={() => fileRefs[doc.key].current.click()}>
                          <Upload size={16} />
                          <span>{files[doc.key] ? files[doc.key].name : 'Choose File'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="form-group mt-4">
                    <label className="form-label">Additional Notes</label>
                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
                  </div>
                  <label className="checkbox-label p-4 bg-light rounded-lg border border-dashed mt-4">
                    <input type="checkbox" checked={form.declared_true} onChange={e => setForm(f => ({...f, declared_true: e.target.checked}))} required />
                    <span className="text-sm font-semibold">I hereby declare that the information provided is true and correct.</span>
                  </label>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {modalStep > 1 && (
                <button type="button" className="btn btn-ghost" onClick={() => setModalStep(s => s - 1)}>
                  <ChevronLeft size={16} /> Previous
                </button>
              )}
              <div className="ml-auto flex gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                {modalStep < 6 ? (
                  <button type="button" className="btn btn-primary" onClick={() => setModalStep(s => s + 1)}>
                    Next Step <ChevronRight size={16} />
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" disabled={submitting || !form.declared_true} onClick={handleSubmit}>
                    {submitting ? <span className="spinner-white" /> : <><ShieldCheck size={18} /> Submit Application</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && proposalData && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <span className="modal-title">Reject Proposal</span>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Why are you rejecting this proposal? <span>*</span></label>
                <textarea 
                  className="form-control" 
                  rows={4}
                  value={rejectComment}
                  onChange={e => setRejectComment(e.target.value)}
                  placeholder="Please provide details on why you are rejecting this proposal so we can assist you better..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#dc2626' }}
                disabled={!rejectComment || submitting}
                onClick={() => handleStatusUpdate(proposalData._id || proposalData.id, 'rejected', rejectComment)}
              >
                {submitting ? 'Submitting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {showPaymentModal && invoiceData && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f0fdf4, #fff)', borderBottom: '2px solid #86efac' }}>
              <div>
                <span className="modal-title" style={{ color: '#166534' }}>💰 Confirm Payment</span>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 4, fontWeight: 600 }}>
                  Invoice {invoiceData.invoice_number}
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Please confirm that you have made the payment of <strong>£{invoiceData.amount}</strong>. You can optionally upload a proof of payment receipt.
              </p>

              <div className="form-group">
                <label className="form-label">Proof of Payment Document (PDF/Image) <span>(Optional)</span></label>
                <div
                  onClick={() => document.getElementById('payment-proof-file-input').click()}
                  style={{
                    border: '2px dashed #e2e8f0', padding: '28px 24px', borderRadius: '12px',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    background: invoiceForm.file ? '#f0fdf4' : '#fff'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#16a34a'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <FileText size={36} style={{ color: invoiceForm.file ? '#16a34a' : '#94a3b8', marginBottom: 10, margin: '0 auto' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginTop: 8 }}>
                    {invoiceForm.file ? invoiceForm.file.name : 'Click to upload receipt'}
                  </div>
                  <input
                    id="payment-proof-file-input"
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={e => setInvoiceForm(f => ({ ...f, file: e.target.files[0] }))}
                  />
                </div>
              </div>

            </div>
            <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexDirection:'column', gap:12, alignItems:'stretch' }}>
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#166534', display:'flex', alignItems:'center', gap:8 }}>
                <CheckCircle size={14} style={{ color:'#16a34a', flexShrink:0 }} />
                <span>This will notify the HFA admin team to verify your payment.</span>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', padding:'10px 24px' }}
                  disabled={invoiceSubmitting}
                  onClick={async () => {
                    setInvoiceSubmitting(true);
                    try {
                      const formData = new FormData();
                      if (invoiceForm.file) formData.append('payment_proof', invoiceForm.file);

                      const res = await api.put(`/api/invoices/${invoiceData._id || invoiceData.id}/pay`, formData, true);
                      setInvoiceData(res.data.data || res.data);

                      toast.success('Payment confirmed! Admin will verify it shortly.');
                      setShowPaymentModal(false);
                      fetchData();
                    } catch (err) {
                      toast.error(err.message || 'Failed to confirm payment');
                    } finally {
                      setInvoiceSubmitting(false);
                    }
                  }}
                >
                  {invoiceSubmitting
                    ? <><span className="spinner-white" style={{ width:14, height:14 }} /> Confirming...</>
                    : <><CheckCircle size={15} /> Confirm Payment</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Form Modal */}
      {showAuditModal && auditData?.status === 'dates_proposed' && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 500, padding: 0 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>🗓️ Select Audit Dates</div>
              <button className="modal-close" onClick={() => setShowAuditModal(false)}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
                The Admin has proposed the following 3 dates for your upcoming audit. Please select <strong>exactly 2 dates</strong> that you are available, or indicate that you are not available on any of these days.
              </p>

              <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                {auditData.proposed_dates?.map((d, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: auditForm.unavailable ? 'not-allowed' : 'pointer', opacity: auditForm.unavailable ? 0.6 : 1 }}>
                    <input
                      type="checkbox"
                      disabled={auditForm.unavailable}
                      checked={auditForm.selectedDates.includes(d)}
                      onChange={e => {
                        let newDates = [...auditForm.selectedDates];
                        if (e.target.checked) {
                          if (newDates.length < 2) newDates.push(d);
                          else toast.error('You can only select exactly 2 dates.');
                        } else {
                          newDates = newDates.filter(x => x !== d);
                        }
                        setAuditForm({ ...auditForm, selectedDates: newDates });
                      }}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{new Date(d).toDateString()}</span>
                  </label>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={auditForm.unavailable}
                  onChange={e => {
                    setAuditForm({ unavailable: e.target.checked, selectedDates: [] });
                  }}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>I am not available on any of these days</span>
              </label>

              <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setShowAuditModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  disabled={auditSubmitting || (!auditForm.unavailable && auditForm.selectedDates.length !== 2)}
                  onClick={async () => {
                    setAuditSubmitting(true);
                    try {
                      const res = await api.post('/api/audits/select-dates', {
                        audit_id: auditData._id || auditData.id,
                        selected_dates: auditForm.selectedDates,
                        unavailable: auditForm.unavailable
                      });
                      setAuditData(res.data);
                      setShowAuditModal(false);
                      toast.success(auditForm.unavailable ? 'Admin notified. Waiting for new dates.' : 'Dates confirmed successfully!');
                    } catch (err) {
                      toast.error(err.message || 'Failed to submit selection');
                    } finally {
                      setAuditSubmitting(false);
                    }
                  }}
                >
                  {auditSubmitting ? 'Submitting...' : 'Submit Selection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .modal-steps { display: flex; justify-content: center; gap: 12px; padding: 20px 0; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .step-item { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; color: #64748b; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; position: relative; }
        .step-item.active { background: var(--primary); color: white; box-shadow: 0 0 0 4px rgba(27, 122, 122, 0.2); }
        .step-item.completed { background: #10b981; color: white; }
        .step-item:not(:last-child):after { content: ''; position: absolute; right: -12px; top: 50%; width: 12px; height: 2px; background: #e2e8f0; }
        .step-item.completed:after { background: #10b981; }
        .section-title { font-size: 18px; font-weight: 800; margin-bottom: 24px; color: #1e293b; display: flex; align-items: center; gap: 8px; }
        .border-teal { border: 1px solid #1B7A7A; }
        .bg-teal-light { background: #f0fdfa; }
        .file-upload-box { border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; color: #64748b; }
        .file-upload-box:hover { border-color: var(--primary); background: #f0fdfa; color: var(--primary); }
        .checkbox-label { display: flex; gap: 12px; cursor: pointer; align-items: flex-start; }
        .checkbox-label input { width: 18px; height: 18px; margin-top: 2px; }
      `}} />
    </div>
  );
}
