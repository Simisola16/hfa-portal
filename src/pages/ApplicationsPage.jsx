import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, RefreshCw, X, Upload, Check, ChevronRight, ChevronLeft, Trash2, ShieldCheck, FileText } from 'lucide-react';

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

const STATUS_BADGE = {
  submitted:'badge-blue', 
  under_review:'badge-yellow', 
  on_hold:'badge-orange',
  audit_scheduled:'badge-purple',
  audit_completed:'badge-green',
  approved:'badge-green',
  rejected:'badge-red',
  certificate_issued:'badge-green'
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

  return (
    <div className="page-content">
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
        <button 
          className="btn btn-primary ml-auto" 
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
                  <th>Reference No.</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Site Name</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => (
                  <tr key={app._id} style={{ transition: 'background 0.15s' }}>
                    <td>
                      <div style={{ display:'inline-block', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:800, color:'#334155', letterSpacing:'0.02em' }}>
                        {app.application_number}
                      </div>
                    </td>
                    <td><span className="badge badge-gray capitalize" style={{ fontSize:11 }}>{app.application_type}</span></td>
                    <td className="truncate" style={{ maxWidth: 180, fontSize:13 }}>{app.category}</td>
                    <td style={{ fontWeight:600, fontSize:13 }}>{app.site_name || '—'}</td>
                    <td style={{ fontSize:12, color:'#94a3b8', fontWeight:700 }}>{new Date(app.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[app.status]}`} style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        {app.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/applications/${app._id}`}
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', fontSize:12, fontWeight:700, textDecoration:'none', transition:'all 0.15s', whiteSpace:'nowrap' }}
                        onMouseEnter={e => { e.currentTarget.style.background='#dcfce7'; e.currentTarget.style.color='#15803d'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='#f0fdf4'; e.currentTarget.style.color='#16a34a'; }}
                      >
                        <Eye size={14} /> View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
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
                  <div className="form-group">
                    <label className="form-label">Scope of Certification <span>*</span></label>
                    <textarea 
                      className="form-control" 
                      rows={3} 
                      placeholder="Describe the activities to be certified (e.g., Slaughtering and processing of poultry...)"
                      value={form.scope}
                      onChange={e => setForm(f => ({...f, scope: e.target.value}))}
                      required
                    />
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
