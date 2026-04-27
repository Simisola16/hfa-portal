import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Filter, Eye, RefreshCw, X, Upload } from 'lucide-react';

const CATEGORIES = [
  'Annual Certification – Food and General processing',
  'Annual Certification – Abattoir',
  'Annual Certification – Restaurants and Catering',
  'Annual Certification – Retailers',
  'Annual Certification – Pharmaceutical and Cosmetics',
  'Surveillance Audit',
  'Export Certification',
  'Product Certification',
];
const TYPES = ['new', 'renewal', 'surveillance', 'addon'];
const STATUSES = ['submitted','under_review','approved','rejected','on_hold','audit_scheduled','audit_completed','certificate_issued'];
const STATUS_BADGE = {
  submitted:'badge-blue', under_review:'badge-yellow', approved:'badge-green',
  rejected:'badge-red', on_hold:'badge-orange', audit_scheduled:'badge-purple',
  audit_completed:'badge-green', certificate_issued:'badge-green',
};

export default function ApplicationsPage({ openNew }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalStep, setModalStep] = useState(0); // 0: choice, 1: form
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const fileRefs = { halal_policy: useRef(), ingredient_list: useRef(), floor_plan: useRef(), company_registration: useRef() };

  const [form, setForm] = useState({
    application_type: 'new', category: CATEGORIES[0], site_name: '',
    establishment_name: '', establishment_address: '',
    reg_number: '', vat_number: '', managing_director: '',
    finance_contact: '', qa_contact: '', halal_coordinator: '', production_contact: '',
    production_schedule: '', employee_count: '',
    has_porcine: false, has_intoxicants: false,
    porcine_details: '', intoxicants_details: '',
    declared_true: false, notes: '',
  });
  const [files, setFiles] = useState({});

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/applications'),
      api.get('/api/sites')
    ]).then(([appsRes, sitesRes]) => {
      setApps(appsRes.data || []);
      setSites(sitesRes.data || []);
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    if (status) setFilterStatus(status);
    if (type) setFilterType(type);
    
    if (openNew && sites.length > 0) {
      setShowModal(true);
    } else if (openNew && sites.length === 0 && !loading) {
      toast.error('You must add a business site before submitting an application.', { id: 'site-check' });
    }
  }, [searchParams, openNew, sites, loading]);

  const filtered = apps.filter(a => {
    const matchSearch = !search || a.application_number?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    const matchType = !filterType || a.application_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      Object.entries(files).forEach(([k, v]) => fd.append(k, v));
      await api.post('/api/applications', fd, true);
      toast.success('Application submitted successfully!');
      setShowModal(false);
      setForm({ application_type: 'new', category: CATEGORIES[0], site_name: '', products_description: '', employee_count: '', notes: '' });
      setFiles({});
      fetchApps();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search applications..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="form-control" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={fetchData}><RefreshCw size={14} /></button>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            if (sites.length === 0) {
              toast.error('You must add a business site before submitting an application.', { duration: 5000 });
              return;
            }
            setModalStep(0);
            setShowModal(true);
          }} 
          style={{ marginLeft: 'auto' }}
        >
          <Plus size={15} /> New Application
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Applications ({filtered.length})</div>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <div className="empty-state-title">No Applications Found</div>
                <div className="empty-state-text">Submit a new application to get started</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>App Number</th><th>Category</th><th>Type</th>
                    <th>Site</th><th>Date</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(app => (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{app.application_number}</td>
                      <td style={{ maxWidth: 200 }}><span className="truncate" style={{ display: 'block' }}>{app.category}</span></td>
                      <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{app.application_type}</span></td>
                      <td>{app.site_name || '—'}</td>
                      <td>{new Date(app.created_at).toLocaleDateString('en-GB')}</td>
                      <td><span className={`badge ${STATUS_BADGE[app.status] || 'badge-gray'}`}>{app.status?.replace(/_/g, ' ')}</span></td>
                      <td><Link to={`/applications/${app.id}`} className="btn btn-ghost btn-sm"><Eye size={13} /> View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {/* New Application Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">New Certification Application</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ minHeight: 400 }}>
                {modalStep === 0 && (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Choose Application Type</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>What type of certification are you applying for today?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <button type="button" className="btn btn-outline" style={{ height: 140, flexDirection: 'column', gap: 12, border: '2px solid var(--border)' }}
                        onClick={() => { setForm(f => ({...f, application_type: 'new'})); setModalStep(1); }}>
                        <Plus size={32} />
                        <span style={{ fontSize: 16, fontWeight: 700 }}>New Application</span>
                      </button>
                      <button type="button" className="btn btn-outline" style={{ height: 140, flexDirection: 'column', gap: 12, border: '2px solid var(--border)' }}
                        onClick={() => { setForm(f => ({...f, application_type: 'renewal'})); setModalStep(1); }}>
                        <RefreshCw size={32} />
                        <span style={{ fontSize: 16, fontWeight: 700 }}>Renewal Application</span>
                      </button>
                    </div>
                  </div>
                )}

                {modalStep === 1 && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Establishment / Company Name <span>*</span></label>
                      <input type="text" className="form-control" value={form.establishment_name} onChange={e => setForm(f => ({...f, establishment_name: e.target.value}))} placeholder="Legal name" required />
                    </div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Reg. Number</label>
                        <input type="text" className="form-control" value={form.reg_number} onChange={e => setForm(f => ({...f, reg_number: e.target.value}))} placeholder="Company Registration No." />
                      </div>
                      <div className="form-group">
                        <label className="form-label">VAT Number</label>
                        <input type="text" className="form-control" value={form.vat_number} onChange={e => setForm(f => ({...f, vat_number: e.target.value}))} placeholder="VAT No." />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Managing Director <span>*</span></label>
                      <input type="text" className="form-control" value={form.managing_director} onChange={e => setForm(f => ({...f, managing_director: e.target.value}))} placeholder="Name of MD" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Detailed Establishment Address <span>*</span></label>
                      <textarea className="form-control" rows={2} value={form.establishment_address} onChange={e => setForm(f => ({...f, establishment_address: e.target.value}))} placeholder="Full physical address" required />
                    </div>
                  </>
                )}

                {modalStep === 2 && (
                  <>
                    <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>👤 Key Contacts</p>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Finance Contact</label>
                        <input type="text" className="form-control" value={form.finance_contact} onChange={e => setForm(f => ({...f, finance_contact: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">QA / Quality Contact</label>
                        <input type="text" className="form-control" value={form.qa_contact} onChange={e => setForm(f => ({...f, qa_contact: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Halal Coordinator</label>
                        <input type="text" className="form-control" value={form.halal_coordinator} onChange={e => setForm(f => ({...f, halal_coordinator: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Production Manager</label>
                        <input type="text" className="form-control" value={form.production_contact} onChange={e => setForm(f => ({...f, production_contact: e.target.value}))} />
                      </div>
                    </div>

                    <div className="form-grid" style={{ marginTop: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Number of Employees <span>*</span></label>
                        <input type="number" className="form-control" value={form.employee_count} onChange={e => setForm(f => ({...f, employee_count: e.target.value}))} placeholder="Total staff" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Production Schedule <span>*</span></label>
                        <input type="text" className="form-control" value={form.production_schedule} onChange={e => setForm(f => ({...f, production_schedule: e.target.value}))} placeholder="e.g. Mon-Fri, 9am-5pm" required />
                      </div>
                    </div>

                    <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#991b1b', marginBottom: 12 }}>🛡️ Halal Compliance Declarations</p>
                      
                      <div className="form-group">
                        <label style={{ display: 'flex', gap: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          <input type="checkbox" checked={form.has_porcine} onChange={e => setForm(f => ({...f, has_porcine: e.target.checked}))} />
                          Does the site handle any Porcine (Pork) related materials?
                        </label>
                        {form.has_porcine && (
                          <textarea className="form-control" style={{ marginTop: 8 }} rows={2} value={form.porcine_details} onChange={e => setForm(f => ({...f, porcine_details: e.target.value}))} placeholder="Please provide details on segregation..." />
                        )}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'flex', gap: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          <input type="checkbox" checked={form.has_intoxicants} onChange={e => setForm(f => ({...f, has_intoxicants: e.target.checked}))} />
                          Does the site handle any Intoxicants (Alcohol) for production?
                        </label>
                        {form.has_intoxicants && (
                          <textarea className="form-control" style={{ marginTop: 8 }} rows={2} value={form.intoxicants_details} onChange={e => setForm(f => ({...f, intoxicants_details: e.target.value}))} placeholder="Usage and source details..." />
                        )}
                      </div>
                    </div>
                  </>
                )}

                {modalStep === 3 && (
                  <>
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>📎 Upload Required Documents</p>
                    <div className="form-grid">
                      {[
                        { key: 'halal_policy', label: 'Halal Policy' },
                        { key: 'ingredient_list', label: 'Ingredient List' },
                        { key: 'floor_plan', label: 'Floor Plan' },
                        { key: 'company_registration', label: 'Company Registration' },
                      ].map(doc => (
                        <div className="form-group" key={doc.key}>
                          <label className="form-label">{doc.label}</label>
                          <input type="file" ref={fileRefs[doc.key]} style={{ display: 'none' }} onChange={e => setFiles(f => ({...f, [doc.key]: e.target.files[0]}))} />
                          <button type="button" className="btn btn-ghost w-full" style={{ borderStyle: 'dashed' }} onClick={() => fileRefs[doc.key].current?.click()}>
                            <Upload size={14} /> {files[doc.key] ? files[doc.key].name.slice(0,15)+'...' : 'Select File'}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="form-group" style={{ marginTop: 16 }}>
                      <label className="form-label">Additional Notes</label>
                      <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Any other info for HFA..." />
                    </div>

                    <label style={{ display: 'flex', gap: 12, cursor: 'pointer', background: '#f0fdf4', padding: 16, borderRadius: 12, border: '1px solid #dcfce7', marginTop: 16 }}>
                      <input type="checkbox" checked={form.declared_true} onChange={e => setForm(f => ({...f, declared_true: e.target.checked}))} required />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#166534', lineHeight: 1.4 }}>
                        I hereby declare that the information provided is true and correct to the best of my knowledge. I understand that any false declaration may lead to rejection.
                      </span>
                    </label>
                  </>
                )}
              </div>
              <div className="modal-footer">
                {modalStep > 0 && (
                  <button type="button" className="btn btn-ghost" onClick={() => setModalStep(s => s - 1)}>Back</button>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                {modalStep === 3 ? (
                  <button type="submit" className="btn btn-primary" disabled={submitting || !form.declared_true}>
                    {submitting ? <span className="spinner-white" /> : <><Plus size={14} /> Submit Application</>}
                  </button>
                ) : modalStep > 0 ? (
                  <button type="button" className="btn btn-primary" onClick={() => setModalStep(s => s + 1)}>Next Step</button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
