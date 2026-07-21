import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, HelpCircle, PlusCircle, Search, RefreshCw, X, Upload, Check, ChevronRight, ChevronLeft, Trash2, ShieldCheck, FileText } from 'lucide-react';
import { STATUS_LABELS, STATUS_BADGE } from '../lib/applicationStatuses';

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

// STATUS_BADGE and STATUS_LABELS are now imported from applicationStatuses.js
// Legacy fallback for old values that may remain in the DB
const LEGACY_BADGE = {
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
  const navigate = useNavigate();

  const pendingApp = apps.find(app => {
    const s = app.status?.toLowerCase();
    return s !== 'approved' && s !== 'rejected' && s !== 'certificate_issued';
  });
  
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
  const [hasActiveCert, setHasActiveCert] = useState(false);
  const [certs, setCerts] = useState([]);
  const [addOnApps, setAddOnApps] = useState([]);
  const [addOnLoading, setAddOnLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setAddOnLoading(true);
    try {
      const [appsRes, sitesRes, certsRes, addOnRes] = await Promise.all([
        api.get('/api/applications'),
        api.get('/api/sites'),
        api.get('/api/certificates').catch(() => ({ data: [] })),
        api.get('/api/add-on-applications').catch(() => ({ data: [] }))
      ]);
      setApps(appsRes.data || []);
      setSites(sitesRes.data || []);
      setCerts(certsRes.data || []);
      
      const active = (certsRes.data || []).some(c => 
        c.status === 'active' && new Date(c.expiry_date) >= new Date()
      );
      setHasActiveCert(active);
      setAddOnApps(addOnRes.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setAddOnLoading(false);
    }
  };

  const getGatingStatus = () => {
    if (!form.site_id) return null;
    
    // Rule A: Active Certificate blocks new application
    if (form.application_type === 'new') {
      const activeCert = certs.find(c => 
        c.site_id === form.site_id && 
        c.status === 'active' && 
        new Date(c.expiry_date) > new Date()
      );
      if (activeCert) {
        const expiryStr = new Date(activeCert.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        return {
          blocked: true,
          message: `This site already has an active certificate (valid until ${expiryStr}). You can submit a renewal application closer to the expiry date, or apply for a different site.`
        };
      }
    }

    // Rule B: Ongoing Application blocks a new one
    const ongoingApp = apps.find(app => 
      app.site_id === form.site_id &&
      !['approved', 'rejected', 'certificate_issued'].includes(app.status?.toLowerCase())
    );
    if (ongoingApp) {
      return {
        blocked: true,
        message: `This site already has an application in progress (#${ongoingApp.application_number} - status: ${ongoingApp.status.replace(/_/g, ' ')}). You cannot submit another application for this site until the current one is completed.`
      };
    }

    return null;
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (openNew && sites.length > 0) {
      setShowModal(true);
    } else if (openNew && sites.length === 0 && !loading) {
      toast.error('You must add a business site before submitting an application.');
      navigate('/applications', { replace: true });
    }
  }, [openNew, sites, loading, navigate]);

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

  const validateStep = (step) => {
    if (step === 1) {
      if (!form.site_id) {
        toast.error('Please select a business site.');
        return false;
      }
      const gating = getGatingStatus();
      if (gating?.blocked) {
        toast.error(gating.message);
        return false;
      }
      if (!form.scope?.trim()) {
        toast.error('Please enter the scope of certification.');
        return false;
      }
    }
    if (step === 3) {
      if (!form.halal_coordinator?.trim()) {
        toast.error('Please enter the Halal Coordinator name.');
        return false;
      }
      if (!form.qa_contact?.trim()) {
        toast.error('Please enter the Quality Assurance (QA) contact.');
        return false;
      }
      if (!form.employee_count || Number(form.employee_count) <= 0) {
        toast.error('Please enter a valid employee count.');
        return false;
      }
      if (!form.production_schedule?.trim()) {
        toast.error('Please enter the production schedule.');
        return false;
      }
    }
    if (step === 5) {
      if (form.has_porcine && !form.porcine_details?.trim()) {
        toast.error('Please provide details on porcine segregation/control.');
        return false;
      }
      if (form.has_intoxicants && !form.intoxicants_details?.trim()) {
        toast.error('Please provide details on intoxicants usage.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Final validation
    if (!form.site_id) return toast.error('Please select a business site (Step 1).');
    if (!form.scope?.trim()) return toast.error('Please enter the scope of certification (Step 1).');
    if (!form.halal_coordinator?.trim()) return toast.error('Please enter the Halal Coordinator name (Step 3).');
    if (!form.qa_contact?.trim()) return toast.error('Please enter the Quality Assurance (QA) contact (Step 3).');
    if (!form.employee_count || Number(form.employee_count) <= 0) return toast.error('Please enter a valid employee count (Step 3).');
    if (!form.production_schedule?.trim()) return toast.error('Please enter the production schedule (Step 3).');
    
    if (form.has_porcine && !form.porcine_details?.trim()) {
      return toast.error('Please provide porcine segregation/control details (Step 5).');
    }
    if (form.has_intoxicants && !form.intoxicants_details?.trim()) {
      return toast.error('Please provide intoxicants usage details (Step 5).');
    }

    if (!files.halal_policy) return toast.error('Please upload your Halal Policy (Step 6).');
    if (!files.ingredient_list) return toast.error('Please upload your Ingredient List (Step 6).');
    if (!files.floor_plan) return toast.error('Please upload your Floor Plan (Step 6).');
    if (!files.haccp_plan) return toast.error('Please upload your HACCP Plan (Step 6).');
    
    if (!form.declared_true) return toast.error('You must declare that the information is true and correct (Step 6).');

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
    Object.values(fileRefs).forEach(ref => {
      if (ref.current) ref.current.value = '';
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
    if (openNew) {
      navigate('/applications');
    }
  };

  const filtered = apps.filter(a => {
    const matchSearch = !search || a.application_number?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    const matchType = !filterType || a.application_type === filterType;
    return matchSearch && matchStatus && matchType;
  });



  // If a ?appId= query param is present (e.g. from an email link), navigate directly to TrackProcessing
  useEffect(() => {
    const appId = searchParams.get('appId');
    if (appId && apps.length > 0) {
      const targetApp = apps.find(a => a._id === appId || a.id === appId);
      if (targetApp) {
        navigate(`/applications/${appId}/track`);
      }
    }
  }, [apps, searchParams, navigate]);

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
        {pendingApp && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            <span>Active Application:</span>
            <span className={`badge ${STATUS_BADGE[pendingApp.status] || 'badge-blue'}`} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>
              {pendingApp.status.replace(/_/g, ' ')}
            </span>
          </div>
        )}
        <button className={pendingApp ? "btn btn-primary" : "btn btn-primary ml-auto"} 
          onClick={() => {
            if (sites.length === 0) {
              toast.error('Please add a site in "Manage Sites" first.');
              return;
            }
            if (pendingApp) {
              toast.error(`You already have a pending application in progress (${pendingApp.application_number}).`);
              return;
            }
            setShowModal(true);
          }}
        >
          <Plus size={15} /> New Application
        </button>

        {hasActiveCert ? (
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/addon-applications/new')} 
            style={{ marginLeft: 8, background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderColor: '#0284c7' }}
          >
            <Plus size={15} /> New Add-on Application
          </button>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', background: '#fff7ed', border: '1px solid #ffedd5',
            padding: '8px 14px', borderRadius: 10, fontSize: 12, color: '#c2410c', marginLeft: 8,
            fontWeight: 500
          }}>
            <HelpCircle size={15} style={{ marginRight: 6, color: '#ea580c', flexShrink: 0 }} /> 
            Add-on applications are available once you hold an active certificate.
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden', marginTop: 24 }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafaf9' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20} style={{ color: 'var(--primary)' }} /> 
            My Applications <span style={{ background: '#e2e8f0', color: '#475569', fontSize: 12, padding: '2px 10px', borderRadius: 30 }}>{filtered.length}</span>
          </h3>
        </div>
        
        <div style={{ padding: '24px 32px' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
              <FileText size={48} color="#94a3b8" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h4 style={{ fontSize: 18, fontWeight: 700, color: '#334155', marginBottom: 8 }}>No Applications Found</h4>
              <p style={{ fontSize: 14, color: '#64748b', maxWidth: 400, margin: '0 auto' }}>Start your certification process by creating a new application.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr 1fr 1.5fr auto', gap: 16, padding: '0 20px', fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div>App Number</div>
                <div>Type</div>
                <div>Category</div>
                <div>Date</div>
                <div>Status</div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </div>
              
              {/* Data Rows */}
              {filtered.map(app => (
                <div
                  key={app._id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr 1fr 1.5fr auto', gap: 16,
                    alignItems: 'center', padding: '20px',
                    background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                  onClick={() => navigate(`/applications/${app._id || app.id}/track`)}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary)' }}>{app.application_number}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{app.site_name}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: '#f1f5f9', color: '#475569', borderRadius: 6, textTransform: 'uppercase' }}>
                      {app.application_type}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {app.category}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                    {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div>
                    <span className={`badge ${STATUS_BADGE[app.status] || LEGACY_BADGE[app.status] || 'badge-gray'}`} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 30 }}>
                      {STATUS_LABELS[app.status] || app.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={e => { e.stopPropagation(); navigate(`/applications/${app._id || app.id}/track`); }}
                      style={{ borderRadius: 20, padding: '8px 18px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      Track Progress <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add-on Applications Section */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden', marginTop: 32 }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafaf9' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <PlusCircle size={20} style={{ color: '#0284c7' }} /> 
            Add-on Applications <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 12, padding: '2px 10px', borderRadius: 30 }}>{addOnApps.length}</span>
          </h3>
        </div>
        
        <div style={{ padding: '24px 32px' }}>
          {addOnLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : addOnApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
              <PlusCircle size={36} color="#94a3b8" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>No Add-on Applications</h4>
              <p style={{ fontSize: 13, color: '#64748b', maxWidth: 400, margin: '0 auto' }}>If you hold an active certificate and need to modify products, use the button above to submit a request.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {addOnApps.map(app => {
                // Determine step index for tracker: 
                // Submitted -> Under Review -> Approved/Rejected -> Inspection Assigned -> Inspection Completed -> Completed
                const steps = ['submitted', 'under_review', 'approved_or_rejected', 'inspection_assigned', 'inspection_completed', 'completed'];
                let currentStepIndex = 0;
                
                if (app.status === 'submitted') currentStepIndex = 0;
                else if (app.status === 'under_review') currentStepIndex = 1;
                else if (app.status === 'approved' || app.status === 'rejected') currentStepIndex = 2;
                else if (app.status === 'inspection_assigned') currentStepIndex = 3;
                else if (app.status === 'inspection_completed') currentStepIndex = 4;
                else if (app.status === 'completed') currentStepIndex = 5;

                const isRejected = app.status === 'rejected';

                return (
                  <div key={app._id} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px', background: '#fff' }}>
                    {/* Header: Certificate Number and Action */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', background: app.action_type === 'add' ? '#f0fdf4' : app.action_type === 'remove' ? '#fef2f2' : '#f0f9ff', color: app.action_type === 'add' ? '#15803d' : app.action_type === 'remove' ? '#b91c1c' : '#0369a1', borderRadius: 6, textTransform: 'uppercase' }}>
                            {app.action_type === 'change_name' ? 'rename' : app.action_type}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
                            Cert: {app.certificate_id?.certificate_number || '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#475569', marginTop: 8, fontWeight: 500 }}>
                          {app.action_type === 'add' && <>Adding product: <strong>{app.new_product_name}</strong></>}
                          {app.action_type === 'remove' && <>Removing product: <strong>{app.product_name}</strong></>}
                          {app.action_type === 'change_name' && <>Renaming: <strong>{app.product_name}</strong> → <strong>{app.new_product_name}</strong></>}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                          Submitted: {new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        {app.assigned_food_tech && (
                          <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>
                            🔍 Inspector: {app.assigned_food_tech.full_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tracker Progress Bar */}
                    <div style={{ margin: '24px 0 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', width: '100%' }}>
                        {/* Connecting Line */}
                        <div style={{ position: 'absolute', top: 12, left: '4%', right: '4%', height: 3, background: '#e2e8f0', zIndex: 1 }} />
                        <div style={{ position: 'absolute', top: 12, left: '4%', width: `${(currentStepIndex / 5) * 92}%`, height: 3, background: isRejected ? '#ef4444' : 'var(--primary)', zIndex: 2, transition: 'all 0.4s ease' }} />
                        
                        {[
                          { label: 'Submitted', key: 'submitted' },
                          { label: 'Under Review', key: 'under_review' },
                          { label: isRejected ? 'Rejected' : 'Approved', key: 'approved_or_rejected' },
                          { label: 'Inspection', key: 'inspection_assigned' },
                          { label: 'Inspected', key: 'inspection_completed' },
                          { label: 'Completed', key: 'completed' }
                        ].map((s, idx) => {
                          const isDone = idx <= currentStepIndex;
                          const isCurrent = idx === currentStepIndex;
                          let dotColor = '#e2e8f0';
                          let textColor = '#94a3b8';
                          
                          if (isDone) {
                            dotColor = isRejected && idx === 2 ? '#ef4444' : 'var(--primary)';
                            textColor = isRejected && idx === 2 ? '#ef4444' : 'var(--text-dark)';
                          }
                          if (isCurrent) {
                            dotColor = isRejected ? '#ef4444' : 'var(--primary)';
                            textColor = isRejected ? '#ef4444' : 'var(--primary)';
                          }

                          return (
                            <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, width: '16%', textAlign: 'center' }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%', background: dotColor, border: '4px solid #white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                fontSize: 10, fontWeight: 700, boxShadow: isCurrent ? '0 0 0 4px rgba(27,122,122,0.15)' : 'none'
                              }}>
                                {isDone ? '✓' : idx + 1}
                              </div>
                              <span style={{ fontSize: 11, fontWeight: isCurrent ? 800 : 600, color: textColor, marginTop: 8 }}>{s.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Rejection / Notes details */}
                    {isRejected && app.rejection_reason && (
                      <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#991b1b' }}>
                        <strong>Rejection Reason:</strong> {app.rejection_reason}
                      </div>
                    )}
                    {app.status === 'completed' && (
                      <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#166534' }}>
                        ✓ This add-on application has been successfully completed. Your active certificate products list has been updated.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>



      {showModal && createPortal(
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && handleCloseModal()}>
          <div className="modal" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2 className="modal-title">HFA Certification Application</h2>
              <button className="modal-close" onClick={handleCloseModal}><X size={18} /></button>
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

                  {/* Gating warnings */}
                  {(() => {
                    const gating = getGatingStatus();
                    if (gating?.blocked) {
                      return (
                        <div style={{ marginTop: 12, padding: '14px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fef08a', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                          <p style={{ margin: 0, fontSize: 13, color: '#854d0e', lineHeight: 1.6 }}>{gating.message}</p>
                        </div>
                      );
                    }
                    return null;
                  })()}

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
                <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>Cancel</button>
                {modalStep < 6 ? (
                  <button type="button" className="btn btn-primary" disabled={getGatingStatus()?.blocked} onClick={() => { if (validateStep(modalStep)) setModalStep(s => s + 1); }}>
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
        </div>,
        document.body
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
