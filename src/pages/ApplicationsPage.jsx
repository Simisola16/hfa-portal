import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, HelpCircle, PlusCircle, Search, RefreshCw, X, Upload, Check, ChevronRight, ChevronLeft, Trash2, ShieldCheck, FileText, AlertTriangle, RotateCcw, CheckCircle, Package } from 'lucide-react';
import { STATUS_LABELS, STATUS_BADGE } from '../lib/applicationStatuses';
import { getSocket } from '../lib/socket';

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

  useEffect(() => {
    const typeParam = searchParams.get('type');
    const statusParam = searchParams.get('status');
    const actionParam = searchParams.get('action');

    if (openNew || actionParam === 'new') {
      setShowModal(true);
      setForm(f => ({ ...f, application_type: 'new' }));
    }

    if (typeParam !== null) {
      setFilterType(typeParam);
      if (typeParam === 'renewal') {
        setForm(f => ({ ...f, application_type: 'renewal' }));
      }
    } else {
      setFilterType('');
    }

    if (statusParam !== null) {
      setFilterStatus(statusParam);
    } else {
      setFilterStatus('');
    }
  }, [searchParams, openNew]);

  const pendingApp = apps.find(app => {
    const s = app.status?.toLowerCase();
    return s !== 'approved' && s !== 'rejected' && s !== 'certificate_issued';
  });

  const initialFormState = {
    application_type: 'new',
    category: CATEGORIES[0],
    site_id: '',
    site_name: '',
    scope: '',
    establishment_name: '',
    establishment_address: '',
    company_reg_number: '',
    vat_number: '',
    is_manufacturer: '',
    site_address: '',
    years_in_business: '',
    trading_name: '',
    website: '',
    company_email: '',
    mfr_name: '',
    mfr_reg_number: '',
    mfr_vat: '',
    mfr_address: '',
    mfr_years: '',
    mfr_trading_name: '',
    mfr_website: '',
    mfr_email: '',
    mfr_hours: '',
    mfr_employees: '',
    primary_contact_name: '',
    primary_work_tel: '',
    primary_mobile: '',
    primary_email: '',
    tech_work_tel: '',
    tech_mobile: '',
    food_nature: '',
    food_nature_other: '',
    nonfood_nature: '',
    nonfood_nature_other: '',
    business_type: '',
    business_type_other: '',
    export_only: '',
    prev_gso_app: '',
    prev_refused: '',
    brand_name: '',
    products_on_site_count: '',
    products_halal_count: '',
    halal_schedule: '',
    use_hfa_logo: '',
    referral_source: '',
    signatory_position: '',
    signatory_date: new Date().toISOString().split('T')[0],
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
  };

  const [form, setForm] = useState(initialFormState);

  const [newProduct, setNewProduct] = useState({ name: '', brand: '', category: '' });
  const [hasActiveCert, setHasActiveCert] = useState(false);
  const [certs, setCerts] = useState([]);
  const [addOnApps, setAddOnApps] = useState([]);
  const [addOnLoading, setAddOnLoading] = useState(false);
  const [renewalFiles, setRenewalFiles] = useState([]);

  // Post-submit "Add Product?" prompt state
  const [showAddProductPrompt, setShowAddProductPrompt] = useState(false);
  const [addProductChoice, setAddProductChoice] = useState(null); // null | 'yes' | 'no'
  const [addOnProductRows, setAddOnProductRows] = useState([{ name: '', code: '', type: 'Add product', original_name: '', new_name: '', new_code: '' }]);
  const [addOnContact, setAddOnContact] = useState({ name: '', email: '', phone: '' });
  const [clientProducts, setClientProducts] = useState([]);
  const [submittedCertId, setSubmittedCertId] = useState(null); // cert to attach add-on to
  const [submittedAppId, setSubmittedAppId] = useState(null);
  const [submittedSiteId, setSubmittedSiteId] = useState(null);
  const [submittedAppNumber, setSubmittedAppNumber] = useState('');
  const [submittedSiteName, setSubmittedSiteName] = useState('');
  const [addOnSubmitting, setAddOnSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setAddOnLoading(true);
    try {
      const [appsRes, sitesRes, certsRes, addOnRes, prodsRes] = await Promise.all([
        api.get('/api/applications'),
        api.get('/api/sites'),
        api.get('/api/certificates').catch(() => ({ data: [] })),
        api.get('/api/add-on-applications').catch(() => ({ data: [] })),
        api.get('/api/products').catch(() => ({ data: [] }))
      ]);
      setApps(appsRes.data || []);
      setSites(sitesRes.data || []);
      setCerts(certsRes.data || []);
      setClientProducts(prodsRes.data?.data || prodsRes.data || []);
      
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

  // Real-time add-on status updates via socket
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;
    const handleAddOnUpdate = (data) => {
      setAddOnApps(prev => prev.map(app => {
        const appId = app._id || app.id;
        const incomingId = data.addOnId || data.addon_id;
        if (String(appId) === String(incomingId)) {
          return { ...app, status: data.status };
        }
        return app;
      }));
    };
    socket.on('addon_updated', handleAddOnUpdate);
    return () => { socket.off('addon_updated', handleAddOnUpdate); };
  }, []);

  const checkRenewalEligibility = (siteId) => {
    if (!siteId) return false;
    const now = Date.now();
    const threeMonthsInMs = 90 * 24 * 60 * 60 * 1000;

    const siteCerts = certs.filter(c => {
      const sId = typeof c.site_id === 'object' ? c.site_id?._id || c.site_id?.id : c.site_id;
      return String(sId) === String(siteId);
    });

    const certEligible = siteCerts.some(c => {
      if (c.status === 'expired') return true;
      if (!c.expiry_date) return false;
      const expiryTime = new Date(c.expiry_date).getTime();
      return (expiryTime - now) <= threeMonthsInMs;
    });

    if (certEligible) return true;

    const siteApps = apps.filter(a => {
      const sId = typeof a.site_id === 'object' ? a.site_id?._id || a.site_id?.id : a.site_id;
      return String(sId) === String(siteId);
    });

    return siteApps.some(a => {
      if (a.status === 'expired') return true;
      if (a.certificate_expiry) {
        const expiryTime = new Date(a.certificate_expiry).getTime();
        return (expiryTime - now) <= threeMonthsInMs;
      }
      return false;
    });
  };

  const getGatingStatus = () => {
    if (!form.site_id) return null;
    
    // Active Certificate blocks a new application if certificate has > 3 months left
    if (form.application_type === 'new') {
      const activeCert = certs.find(c => {
        const sId = typeof c.site_id === 'object' ? c.site_id?._id || c.site_id?.id : c.site_id;
        return String(sId) === String(form.site_id) && c.status === 'active' && new Date(c.expiry_date) > new Date();
      });
      if (activeCert) {
        const expiry = new Date(activeCert.expiry_date).getTime();
        const threeMonthsInMs = 90 * 24 * 60 * 60 * 1000;
        const isWithin3Months = (expiry - Date.now()) <= threeMonthsInMs;
        if (!isWithin3Months) {
          const expiryStr = new Date(activeCert.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          return {
            blocked: true,
            message: `This site has an active certificate (valid until ${expiryStr}). Renewal applications can be submitted within 3 months of expiration.`
          };
        }
      }
    }

    // Renewal blocked if not eligible
    if (form.application_type === 'renewal') {
      const isEligible = checkRenewalEligibility(form.site_id);
      if (!isEligible) {
        return {
          blocked: true,
          message: `Renewal is only allowed when an existing certificate is within 3 months of expiration or has already expired.`
        };
      }
    }

    // Rule B: Ongoing Application blocks a new one
    const ongoingApp = apps.find(app => {
      const sId = typeof app.site_id === 'object' ? app.site_id?._id || app.site_id?.id : app.site_id;
      return String(sId) === String(form.site_id) &&
        !['approved', 'rejected', 'certificate_issued'].includes(app.status?.toLowerCase());
    });
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
      const isEligible = checkRenewalEligibility(siteId);
      const autoType = isEligible ? 'renewal' : 'new';
      const fullAddr = [selected.address, selected.address_2, selected.city, selected.state, selected.postal_code, selected.country]
        .filter(Boolean)
        .join(', ');

      setForm(f => ({
        ...f,
        site_id: siteId,
        site_name: selected.name,
        establishment_name: f.establishment_name || selected.name || '',
        establishment_address: f.establishment_address || fullAddr,
        site_address: f.site_address || fullAddr,
        managing_director: f.managing_director || selected.contact_person || '',
        company_email: f.company_email || selected.email || '',
        primary_contact_name: f.primary_contact_name || selected.contact_person || '',
        primary_email: f.primary_email || selected.email || '',
        primary_work_tel: f.primary_work_tel || selected.phone || '',
        application_type: autoType
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
        toast.error('Section A: Please select a business site.');
        return false;
      }
      const gating = getGatingStatus();
      if (gating?.blocked) {
        toast.error(gating.message);
        return false;
      }
      if (!form.category) {
        toast.error('Section A: Please select a certification category.');
        return false;
      }
      if (!form.establishment_name?.trim()) {
        toast.error('Section A: Please enter the name of the establishment.');
        return false;
      }
      if (!form.company_reg_number?.trim()) {
        toast.error('Section A: Please enter the Company Registration Number.');
        return false;
      }
      if (!form.vat_number?.trim()) {
        toast.error('Section A: Please enter the VAT Number.');
        return false;
      }
      if (!form.is_manufacturer) {
        toast.error('Section A: Please indicate if you are a manufacturer of halal products.');
        return false;
      }
    }
    if (step === 2) {
      if (!form.site_address?.trim()) {
        toast.error('Section B: Please enter the site / factory address.');
        return false;
      }
      if (!form.company_email?.trim()) {
        toast.error('Section B: Please enter the company email address.');
        return false;
      }
      if (!form.employee_count || Number(form.employee_count) <= 0) {
        toast.error('Section B: Please enter a valid number of employees (at least 1).');
        return false;
      }
    }
    if (step === 3) {
      if (form.is_manufacturer === 'no') {
        if (!form.mfr_name?.trim()) {
          toast.error('Section C: Please enter the Manufacturer Establishment Name.');
          return false;
        }
        if (!form.mfr_address?.trim()) {
          toast.error('Section C: Please enter the Manufacturer Address.');
          return false;
        }
      }
    }
    if (step === 4) {
      if (!form.primary_contact_name?.trim()) {
        toast.error('Section D: Please enter the Primary Contact Name.');
        return false;
      }
      if (!form.primary_work_tel?.trim() && !form.primary_mobile?.trim()) {
        toast.error('Section D: Please enter a Primary Contact phone or mobile number.');
        return false;
      }
      if (!form.primary_email?.trim()) {
        toast.error('Section D: Please enter the Primary Contact Email.');
        return false;
      }
      if (!form.halal_coordinator?.trim()) {
        toast.error('Section D: Please enter the Technical Contact Name.');
        return false;
      }
      if (!form.tech_work_tel?.trim() && !form.tech_mobile?.trim()) {
        toast.error('Section D: Please enter a Technical Contact phone or mobile number.');
        return false;
      }
      if (!form.qa_contact?.trim()) {
        toast.error('Section D: Please enter the Technical Contact Email.');
        return false;
      }
    }
    if (step === 5) {
      if (!form.food_nature && !form.nonfood_nature) {
        toast.error('Section E: Please select the Nature of Business (Food or Non-Food).');
        return false;
      }
      if (!form.business_type) {
        toast.error('Section E: Please select the Type of Business.');
        return false;
      }
      if (!form.export_only) {
        toast.error('Section E: Please indicate if certification is for export purposes only.');
        return false;
      }
      if (!form.prev_gso_app) {
        toast.error('Section E: Please indicate if you previously applied for GSO/UAE certificate.');
        return false;
      }
      if (!form.prev_refused) {
        toast.error('Section E: Please indicate if certification was previously refused.');
        return false;
      }
      if (!form.scope?.trim()) {
        toast.error('Section E: Please enter the product description / scope.');
        return false;
      }
      if (!form.products_on_site_count || Number(form.products_on_site_count) <= 0) {
        toast.error('Section E: Please enter the number of products processed on site.');
        return false;
      }
      if (!form.products_halal_count || Number(form.products_halal_count) <= 0) {
        toast.error('Section E: Please enter the number of products for Halal approval.');
        return false;
      }
      if (form.has_porcine === undefined || form.has_porcine === null || form.has_porcine === '') {
        toast.error('Section E: Please answer question 11 regarding Pork / Porcine material.');
        return false;
      }
      if (form.has_porcine && !form.porcine_details?.trim()) {
        toast.error('Section E: Please provide details on porcine segregation / control.');
        return false;
      }
      if (form.has_intoxicants === undefined || form.has_intoxicants === null || form.has_intoxicants === '') {
        toast.error('Section E: Please answer question 12 regarding Intoxicants.');
        return false;
      }
      if (form.has_intoxicants && !form.intoxicants_details?.trim()) {
        toast.error('Section E: Please provide details on intoxicants usage.');
        return false;
      }
      if (!form.use_hfa_logo) {
        toast.error('Section E: Please answer question 13 regarding HFA logo usage.');
        return false;
      }
      if (!form.referral_source) {
        toast.error('Section E: Please select how you heard about HFA.');
        return false;
      }
      if (!form.managing_director?.trim()) {
        toast.error('Section E: Please enter the Signatory Name (question 15).');
        return false;
      }
      if (!form.signatory_position?.trim()) {
        toast.error('Section E: Please enter the Signatory Position / Title (question 16).');
        return false;
      }
      if (!form.declared_true) {
        toast.error('Section E: You must declare and check the box to confirm that the information is true and correct.');
        return false;
      }
    }
    return true;
  };

  const handleNavigateToStep = (targetStep) => {
    if (targetStep <= modalStep) {
      setModalStep(targetStep);
      return;
    }
    for (let s = modalStep; s < targetStep; s++) {
      if (!validateStep(s)) {
        return;
      }
    }
    setModalStep(targetStep);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (form.application_type === 'renewal') {
      if (!form.site_id) return toast.error('Please select a business site.');
      if (!form.managing_director?.trim()) return toast.error('Please enter the contact person name.');
      if (!form.primary_email?.trim()) return toast.error('Please enter the contact person email.');
      if (!form.primary_work_tel?.trim()) return toast.error('Please enter the contact person phone number.');
      if (!form.declared_true) return toast.error('You must declare that the information is true and correct.');
    } else {
      for (let s = 1; s <= 5; s++) {
        if (!validateStep(s)) {
          setModalStep(s);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      const submissionData = { ...form };
      submissionData.products = JSON.stringify([]);
      Object.entries(submissionData).forEach(([k, v]) => fd.append(k, v));
      if (form.application_type === 'renewal' && renewalFiles.length > 0) {
        renewalFiles.forEach(f => fd.append('supporting_docs', f));
      }
      const createdRes = await api.post('/api/applications', fd, true);
      const createdApp = createdRes.data?.data || createdRes.data || {};
      toast.success(form.application_type === 'renewal' ? 'Renewal application submitted successfully!' : 'Application submitted successfully!');
      setShowModal(false);
      setModalStep(1);
      // Find the active certificate for this site (for add-on linking)
      const activeCert = certs.find(c => {
        const sId = typeof c.site_id === 'object' ? c.site_id?._id || c.site_id?.id : c.site_id;
        return String(sId) === String(form.site_id) && c.status === 'active';
      });
      // Resolve the site name from the sites list
      const selectedSite = sites.find(s => String(s._id || s.id) === String(form.site_id));
      setSubmittedSiteName(selectedSite?.name || form.site_name || form.establishment_name || 'Your Site');
      setSubmittedCertId(activeCert?._id || activeCert?.id || null);
      setSubmittedAppId(createdApp._id || createdApp.id || null);
      setSubmittedSiteId(form.site_id || null);
      setSubmittedAppNumber(createdApp.application_number || '');
      setAddOnContact({ name: form.managing_director || form.primary_contact_name || '', email: form.company_email || form.primary_email || '', phone: form.primary_work_tel || form.primary_mobile || '' });
      resetForm();
      fetchData();
      // Show "Add product?" prompt
      setShowAddProductPrompt(true);
      setAddProductChoice(null);
      setAddOnProductRows([{ name: '', code: '', type: 'Add product' }]);
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddOnProductSubmit = async () => {
    if (!addOnContact.name.trim()) return toast.error('Contact name is required.');
    if (!addOnContact.email.trim()) return toast.error('Contact email is required.');
    for (const [i, p] of addOnProductRows.entries()) {
      if (p.type === 'Add product') {
        if (!p.name?.trim()) return toast.error(`Row ${i + 1}: Product name is required.`);
      } else if (p.type === 'Remove product') {
        if (!p.name?.trim() && !p.original_name?.trim()) return toast.error(`Row ${i + 1}: Please select a product to remove.`);
      } else if (p.type === 'Change name/code') {
        if (!p.original_name?.trim() && !p.name?.trim()) return toast.error(`Row ${i + 1}: Please select the existing product to modify.`);
        if (!p.new_name?.trim()) return toast.error(`Row ${i + 1}: Please enter the New Product Name.`);
      }
    }
    setAddOnSubmitting(true);
    try {
      await api.post('/api/add-on-applications', {
        certificate_id: submittedCertId || undefined,
        application_id: submittedAppId || undefined,
        site_id: submittedSiteId || undefined,
        contact_name: addOnContact.name,
        contact_email: addOnContact.email,
        contact_phone: addOnContact.phone,
        message: submittedAppNumber ? `Products added for application #${submittedAppNumber}` : '',
        products: addOnProductRows
      });
      toast.success('Products submitted as an Add-on Request! Tracking your request in Add-on Applications.');
      setShowAddProductPrompt(false);
      fetchData();
      navigate('/addon-applications', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit add-on application.');
    } finally {
      setAddOnSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(initialFormState);
    setRenewalFiles([]);
    setModalStep(1);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
    if (openNew || searchParams.get('action') || searchParams.get('create')) {
      navigate('/applications', { replace: true });
    }
  };

  const filtered = apps.filter(a => {
    const matchSearch = !search || a.application_number?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase());
    
    let matchStatus = true;
    if (filterStatus) {
      if (filterStatus === 'in_progress' || filterStatus === 'audit_scheduled') {
        matchStatus = !['certificate_issued', 'rejected'].includes(a.status?.toLowerCase());
      } else if (filterStatus === 'rejected') {
        matchStatus = ['rejected', 'on_hold'].includes(a.status?.toLowerCase());
      } else {
        matchStatus = a.status === filterStatus;
      }
    }

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
          <Plus size={15} /> Create Application
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
                <div>Site Name</div>
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
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary)' }}>{app.site_name || app.establishment_name || 'Site'}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{app.establishment_name || app.site_name}</div>
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
                // Determine step index for tracker based on AddOnApplication 10-state flow
                let currentStepIndex = 0;
                
                if (app.status === 'submitted') currentStepIndex = 0;
                else if (app.status === 'accepted') currentStepIndex = 1;
                else if (app.status === 'rejected') currentStepIndex = 1;
                else if (['ft_assigned', 'product_approval_form_enabled', 'all_forms_received'].includes(app.status)) currentStepIndex = 2;
                else if (['logsheet_created', 'waiting_sharia_signature', 'product_form_approved', 'ready_for_certificate'].includes(app.status)) currentStepIndex = 3;
                else if (app.status === 'completed') currentStepIndex = 4;

                const isRejected = app.status === 'rejected';

                return (
                  <div key={app._id} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px', background: '#fff' }}>
                    {/* Header: Certificate Number and Action */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', background: '#f0f9ff', color: '#0369a1', borderRadius: 6, textTransform: 'uppercase' }}>
                            ADD-ON REQUEST
                          </span>
                          <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
                            Cert: {app.certificate_id?.certificate_number || '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#475569', marginTop: 8, fontWeight: 500 }}>
                          {app.products && app.products.length > 0 ? (
                            <span>{app.products.length} product(s) modification requested</span>
                          ) : (
                            <span>Modification requested</span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                          Submitted: {new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        {app.assigned_food_techs && app.assigned_food_techs.length > 0 && (
                          <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>
                            🔍 Inspector(s): {app.assigned_food_techs.map(ft => ft.full_name).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tracker Progress Bar */}
                    <div style={{ margin: '24px 0 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', width: '100%' }}>
                        {/* Connecting Line */}
                        <div style={{ position: 'absolute', top: 12, left: '4%', right: '4%', height: 3, background: '#e2e8f0', zIndex: 1 }} />
                        <div style={{ position: 'absolute', top: 12, left: '4%', width: `${(currentStepIndex / 4) * 92}%`, height: 3, background: isRejected ? '#ef4444' : 'var(--primary)', zIndex: 2, transition: 'all 0.4s ease' }} />
                        
                        {[
                          { label: 'Submitted', key: 'submitted' },
                          { label: isRejected ? 'Rejected' : 'Accepted', key: 'accepted' },
                          { label: 'Assigned & Reviewing', key: 'ft_assigned' },
                          { label: 'Approval & Logsheet', key: 'logsheet_created' },
                          { label: 'Completed', key: 'completed' }
                        ].map((s, idx) => {
                          const isDone = idx <= currentStepIndex;
                          const isCurrent = idx === currentStepIndex;
                          let dotColor = '#e2e8f0';
                          let textColor = '#94a3b8';
                          
                          if (isDone) {
                            dotColor = isRejected && idx === 1 ? '#ef4444' : 'var(--primary)';
                            textColor = isRejected && idx === 1 ? '#ef4444' : 'var(--text-dark)';
                          }
                          if (isCurrent) {
                            dotColor = isRejected ? '#ef4444' : 'var(--primary)';
                            textColor = isRejected ? '#ef4444' : 'var(--primary)';
                          }

                          return (
                            <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, width: '20%', textAlign: 'center' }}>
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
        <div
          onClick={e => e.target === e.currentTarget && handleCloseModal()}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 1100,
            maxHeight: '94vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #065f46 0%, #1B7A7A 100%)',
              padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={26} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>HFA Halal Certification Application</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Complete all required sections marked with *</div>
                </div>
              </div>
              <button onClick={handleCloseModal} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                <X size={18} />
              </button>
            </div>

            {form.application_type === 'renewal' ? (
              /* ── RENEWAL FORM ──────────────────────────────── */
              <>
                <div style={{ padding: '16px 32px', background: '#fef3c7', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <RotateCcw size={20} style={{ color: '#d97706' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e' }}>Renewal Application</div>
                    <div style={{ fontSize: 12, color: '#b45309' }}>Simplified renewal for your certified site</div>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Select Site <span>*</span></label>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, padding: '2px 8px' }} onClick={() => navigate('/add-site')}>+ Add Manufacturing Site</button>
                    </div>
                    <select className="form-control" value={form.site_id} onChange={e => handleSiteChange(e.target.value)} required>
                      <option value="">-- Select Site --</option>
                      {sites.map(s => <option key={s._id} value={s._id}>{s.name} ({s.city})</option>)}
                    </select>
                  </div>
                  {(() => { const g = getGatingStatus(); return g?.blocked ? (
                    <div style={{ padding: '14px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fef08a', display: 'flex', gap: 10 }}>
                      <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: 13, color: '#854d0e' }}>{g.message}</p>
                    </div>
                  ) : null; })()}
                  <div className="form-group">
                    <label className="form-label">Contact Person Name <span>*</span></label>
                    <input type="text" className="form-control" placeholder="Full Name and Role" value={form.managing_director} onChange={e => setForm(f => ({ ...f, managing_director: e.target.value, primary_contact_name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person Email <span>*</span></label>
                    <input type="email" className="form-control" placeholder="contact@example.com" value={form.primary_email || ''} onChange={e => setForm(f => ({ ...f, primary_email: e.target.value, company_email: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person Phone Number <span>*</span></label>
                    <input type="tel" className="form-control" placeholder="+44 7700 000000" value={form.primary_work_tel || ''} onChange={e => setForm(f => ({ ...f, primary_work_tel: e.target.value, primary_mobile: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Renewal Notes</label>
                    <textarea className="form-control" rows={2} placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #cbd5e1' }}>
                    <input type="checkbox" checked={form.declared_true} onChange={e => setForm(f => ({ ...f, declared_true: e.target.checked }))} style={{ marginTop: 3, width: 16, height: 16 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>I hereby declare that all information provided is true, complete, and correct.</span>
                  </label>
                </div>
                <div style={{ padding: '16px 32px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
                  <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>Cancel</button>
                  <button type="button" className="btn btn-primary" disabled={submitting || !form.declared_true || !form.managing_director?.trim() || !form.primary_email?.trim() || !form.primary_work_tel?.trim() || !form.site_id || getGatingStatus()?.blocked} onClick={handleSubmit} style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', borderColor: '#d97706' }}>
                    {submitting ? <span className="spinner-white" /> : <><ShieldCheck size={18} /> Submit Renewal Application</>}
                  </button>
                </div>
              </>
            ) : (
              /* ── NEW APPLICATION FORM (Sections A–F) ──────── */
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left sidebar: section navigator */}
                <div style={{ width: 220, background: '#f8fafc', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: '24px 0', flexShrink: 0 }}>
                  {[
                    { key: 1, label: 'Section A', sub: 'Company Details' },
                    { key: 2, label: 'Section B', sub: 'Site Details' },
                    { key: 3, label: 'Section C', sub: 'Manufacturer' },
                    { key: 4, label: 'Section D', sub: 'Contact Details' },
                    { key: 5, label: 'Section E', sub: 'Process & Products' },
                  ].map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => handleNavigateToStep(s.key)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '12px 20px',
                        background: modalStep === s.key ? 'linear-gradient(135deg, #065f46, #1B7A7A)' : 'transparent',
                        border: 'none', cursor: 'pointer', borderLeft: modalStep === s.key ? '4px solid #34d399' : '4px solid transparent',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: modalStep === s.key ? 'rgba(255,255,255,0.7)' : '#94a3b8', marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: modalStep === s.key ? '#fff' : '#334155' }}>{s.sub}</div>
                      {modalStep > s.key && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Check size={11} /> Complete
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Form body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>

                    {/* ── SECTION A: Company Details ────────────────── */}
                    {modalStep === 1 && (
                      <div>
                        <div style={{ marginBottom: 28 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1.5px solid #a7f3d0', borderRadius: 10, padding: '6px 14px', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#065f46' }}>Section A</span>
                          </div>
                          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Company Details</h2>
                          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Legal information about your company</p>
                        </div>

                        {/* Site selector + category */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                          <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label className="form-label" style={{ marginBottom: 0 }}>Select Business Site <span>*</span></label>
                              <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }} onClick={() => navigate('/add-site')}>+ Add Site</button>
                            </div>
                            <select className="form-control" value={form.site_id} onChange={e => handleSiteChange(e.target.value)} required>
                              <option value="">-- Select Site --</option>
                              {sites.map(s => <option key={s._id} value={s._id}>{s.name} ({s.city})</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Certification Category <span>*</span></label>
                            <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>

                        {CATEGORY_DETAILS[form.category] && (
                          <div style={{ marginBottom: 20, padding: '12px 16px', background: '#f0fdf9', borderRadius: 10, border: '1px solid #99e6d3' }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#1B7A7A', lineHeight: 1.6 }}>{CATEGORY_DETAILS[form.category]}</p>
                          </div>
                        )}

                        {(() => { const g = getGatingStatus(); return g?.blocked ? (
                          <div style={{ marginBottom: 20, padding: '14px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fef08a', display: 'flex', gap: 10 }}>
                            <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: 13, color: '#854d0e', lineHeight: 1.6 }}>{g.message}</p>
                          </div>
                        ) : null; })()}

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', display: 'grid', gap: 18 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Name of the Establishment <span>*</span></label>
                              <input type="text" className="form-control" placeholder="e.g. Anike Foods Ltd" value={form.establishment_name} onChange={e => setForm(f => ({ ...f, establishment_name: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Company Registration Number <span>*</span></label>
                              <input type="text" className="form-control" placeholder="e.g. 12345678" value={form.company_reg_number || ''} onChange={e => setForm(f => ({ ...f, company_reg_number: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">VAT Number <span>*</span></label>
                              <input type="text" className="form-control" placeholder="e.g. GB123456789" value={form.vat_number || ''} onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Are you a Manufacturer of Halal Products? <span>*</span></label>
                              <select className="form-control" value={form.is_manufacturer || ''} onChange={e => setForm(f => ({ ...f, is_manufacturer: e.target.value }))} required>
                                <option value="">Select Option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </div>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Company Head Office Address</label>
                            <textarea className="form-control" rows={2} placeholder="Full head office address" value={form.establishment_address} onChange={e => setForm(f => ({ ...f, establishment_address: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── SECTION B: Site Details ───────────────────── */}
                    {modalStep === 2 && (
                      <div>
                        <div style={{ marginBottom: 28 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '6px 14px', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1d4ed8' }}>Section B</span>
                          </div>
                          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Site / Factory Details</h2>
                          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Details about the site/factory to be certified</p>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', display: 'grid', gap: 18 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Site / Factory Address <span>*</span></label>
                            <textarea className="form-control" rows={2} placeholder="Full site/factory address" value={form.site_address || ''} onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))} required />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Number of Years in Business / Production</label>
                              <input type="text" className="form-control" placeholder="e.g. 5 years" value={form.years_in_business || ''} onChange={e => setForm(f => ({ ...f, years_in_business: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Trading Name (if different)</label>
                              <input type="text" className="form-control" placeholder="Trading name" value={form.trading_name || ''} onChange={e => setForm(f => ({ ...f, trading_name: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Website Address</label>
                              <input type="url" className="form-control" placeholder="https://example.com" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Email Address <span>*</span></label>
                              <input type="email" className="form-control" placeholder="company@example.com" value={form.company_email || ''} onChange={e => setForm(f => ({ ...f, company_email: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Operating Hours / Shift Pattern</label>
                              <input type="text" className="form-control" placeholder="e.g. 08:00–18:00, Mon–Fri" value={form.production_schedule} onChange={e => setForm(f => ({ ...f, production_schedule: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Number of Employees <span>*</span></label>
                              <input type="number" className="form-control" placeholder="0" value={form.employee_count} onChange={e => setForm(f => ({ ...f, employee_count: e.target.value }))} required min="1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── SECTION C: Manufacturer Details ──────────── */}
                    {modalStep === 3 && (
                      <div>
                        <div style={{ marginBottom: 28 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '6px 14px', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c2410c' }}>Section C</span>
                          </div>
                          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Manufacturer Details</h2>
                          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Complete only if manufacturer differs from company above</p>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', display: 'grid', gap: 18 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Name of Establishment</label>
                              <input type="text" className="form-control" placeholder="Manufacturer name" value={form.mfr_name || ''} onChange={e => setForm(f => ({ ...f, mfr_name: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Company Registration No.</label>
                              <input type="text" className="form-control" placeholder="Registration number" value={form.mfr_reg_number || ''} onChange={e => setForm(f => ({ ...f, mfr_reg_number: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">VAT No.</label>
                              <input type="text" className="form-control" placeholder="VAT number" value={form.mfr_vat || ''} onChange={e => setForm(f => ({ ...f, mfr_vat: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Number of Years in Business</label>
                              <input type="text" className="form-control" placeholder="e.g. 10 years" value={form.mfr_years || ''} onChange={e => setForm(f => ({ ...f, mfr_years: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Trading Name (if different)</label>
                              <input type="text" className="form-control" placeholder="Trading name" value={form.mfr_trading_name || ''} onChange={e => setForm(f => ({ ...f, mfr_trading_name: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Website Address</label>
                              <input type="url" className="form-control" placeholder="https://example.com" value={form.mfr_website || ''} onChange={e => setForm(f => ({ ...f, mfr_website: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Email</label>
                              <input type="email" className="form-control" placeholder="manufacturer@example.com" value={form.mfr_email || ''} onChange={e => setForm(f => ({ ...f, mfr_email: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Operating Hours / Shift Pattern</label>
                              <input type="text" className="form-control" placeholder="e.g. 07:00–19:00, Mon–Sat" value={form.mfr_hours || ''} onChange={e => setForm(f => ({ ...f, mfr_hours: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">No. of Employees</label>
                              <input type="number" className="form-control" placeholder="0" value={form.mfr_employees || ''} onChange={e => setForm(f => ({ ...f, mfr_employees: e.target.value }))} min="0" />
                            </div>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Address</label>
                            <textarea className="form-control" rows={2} placeholder="Full manufacturer address" value={form.mfr_address || ''} onChange={e => setForm(f => ({ ...f, mfr_address: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── SECTION D: Official Contact Details ──────── */}
                    {modalStep === 4 && (
                      <div>
                        <div style={{ marginBottom: 28 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fdf4ff', border: '1.5px solid #e9d5ff', borderRadius: 10, padding: '6px 14px', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7e22ce' }}>Section D</span>
                          </div>
                          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Official Contact Details</h2>
                          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Primary and technical points of contact</p>
                        </div>

                        {/* Primary Contact */}
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7e22ce' }} /> Primary Contact Details
                          </div>
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Primary Contact Name <span>*</span></label>
                              <input type="text" className="form-control" placeholder="Full name" value={form.primary_contact_name || ''} onChange={e => setForm(f => ({ ...f, primary_contact_name: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Work Telephone <span>*</span></label>
                              <input type="tel" className="form-control" placeholder="+44 20 0000 0000" value={form.primary_work_tel || ''} onChange={e => setForm(f => ({ ...f, primary_work_tel: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Mobile Phone <span>*</span></label>
                              <input type="tel" className="form-control" placeholder="+44 7700 000000" value={form.primary_mobile || ''} onChange={e => setForm(f => ({ ...f, primary_mobile: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Email Address <span>*</span></label>
                              <input type="email" className="form-control" placeholder="primary@example.com" value={form.primary_email || ''} onChange={e => setForm(f => ({ ...f, primary_email: e.target.value }))} required />
                            </div>
                          </div>
                        </div>

                        {/* Technical Contact */}
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7' }} /> Technical Contact Details
                          </div>
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Technical Contact Name <span>*</span></label>
                              <input type="text" className="form-control" placeholder="Full name" value={form.halal_coordinator} onChange={e => setForm(f => ({ ...f, halal_coordinator: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Work Telephone <span>*</span></label>
                              <input type="tel" className="form-control" placeholder="+44 20 0000 0000" value={form.tech_work_tel || ''} onChange={e => setForm(f => ({ ...f, tech_work_tel: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Mobile Phone <span>*</span></label>
                              <input type="tel" className="form-control" placeholder="+44 7700 000000" value={form.tech_mobile || ''} onChange={e => setForm(f => ({ ...f, tech_mobile: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Email Address <span>*</span></label>
                              <input type="email" className="form-control" placeholder="tech@example.com" value={form.qa_contact} onChange={e => setForm(f => ({ ...f, qa_contact: e.target.value }))} required />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── SECTION E: Process / Product Details ─────── */}
                    {modalStep === 5 && (
                      <div>
                        <div style={{ marginBottom: 28 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 10, padding: '6px 14px', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#be123c' }}>Section E</span>
                          </div>
                          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Process / Product Details</h2>
                          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Describe your production processes and product scope</p>
                        </div>
                        <div style={{ display: 'grid', gap: 18 }}>

                          {/* Nature of business */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px' }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 14 }}>1. Nature of the Business</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Food Manufacturers <span>*</span></label>
                                <select className="form-control" value={form.food_nature || ''} onChange={e => setForm(f => ({ ...f, food_nature: e.target.value }))}>
                                  <option value="">Select option</option>
                                  <option value="Meat/ meat based products">Meat/ meat based products</option>
                                  <option value="Dairy">Dairy</option>
                                  <option value="Food Additives">Food Additives</option>
                                  <option value="Confectionery">Confectionery</option>
                                  <option value="Beverages">Beverages</option>
                                  <option value="Ready meals">Ready meals</option>
                                  <option value="Snacks">Snacks</option>
                                </select>
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Non-Food Manufacturers <span>*</span></label>
                                <select className="form-control" value={form.nonfood_nature || ''} onChange={e => setForm(f => ({ ...f, nonfood_nature: e.target.value }))}>
                                  <option value="">Select option</option>
                                  <option value="Cosmetics">Cosmetics</option>
                                  <option value="Pharmaceutical">Pharmaceutical</option>
                                  <option value="Packaging">Packaging</option>
                                  <option value="Cleaning Agentsy">Cleaning Agentsy</option>
                                  <option value="Filters">Filters</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Type + export */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">2. Type of Business <span>*</span></label>
                              <select className="form-control" value={form.business_type || ''} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}>
                                <option value="">Select type of business</option>
                                <option value="Manufacturer">Manufacturer</option>
                                <option value="Retailer">Retailer</option>
                                <option value="Importer">Importer</option>
                                <option value="Exporter Agentsy">Exporter Agentsy</option>
                                <option value="Distributor">Distributor</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">3. Certification for Export Purposes Only? <span>*</span></label>
                              <select className="form-control" value={form.export_only || ''} onChange={e => setForm(f => ({ ...f, export_only: e.target.value }))} required>
                                <option value="">Select Option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">4. Previous GSO/UAE Certificate Application? <span>*</span></label>
                              <select className="form-control" value={form.prev_gso_app || ''} onChange={e => setForm(f => ({ ...f, prev_gso_app: e.target.value }))} required>
                                <option value="">Select Option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">5. Previously Refused Certification? <span>*</span></label>
                              <select className="form-control" value={form.prev_refused || ''} onChange={e => setForm(f => ({ ...f, prev_refused: e.target.value }))} required>
                                <option value="">Select Option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </div>
                          </div>

                          {/* Product details */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', display: 'grid', gap: 16 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">6. Product Description / Type / Category <span>*</span></label>
                              <textarea className="form-control" rows={3} placeholder="Describe the products, their types and categories to be certified..." value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">7. Brand Name (if any)</label>
                                <input type="text" className="form-control" placeholder="Brand name" value={form.brand_name || ''} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">8. No. of Products Processed on Site <span>*</span></label>
                                <input type="number" className="form-control" placeholder="0" value={form.products_on_site_count || ''} onChange={e => setForm(f => ({ ...f, products_on_site_count: e.target.value }))} required min="1" />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">9. No. of Products for Halal Approval <span>*</span></label>
                                <input type="number" className="form-control" placeholder="0" value={form.products_halal_count || ''} onChange={e => setForm(f => ({ ...f, products_halal_count: e.target.value }))} required min="1" />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">10. Schedule for Halal Production</label>
                                <select className="form-control" value={form.halal_schedule || ''} onChange={e => setForm(f => ({ ...f, halal_schedule: e.target.value }))}>
                                  <option value="">Select Option</option>
                                  <option value="Regular/Routine hala product">Regular/Routine hala product</option>
                                  <option value="Irregular/week.monthly halal production">Irregular/week.monthly halal production</option>
                                  <option value="Seasonal/Occasional/Order based halal production">Seasonal/Occasional/Order based halal production</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Declarations */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">11. Pork / Porcine Material on Site? <span>*</span></label>
                              <select className="form-control" value={form.has_porcine ? 'yes' : form.has_porcine === false ? 'no' : ''} onChange={e => setForm(f => ({ ...f, has_porcine: e.target.value === 'yes' }))} required>
                                <option value="">Select Option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                              {form.has_porcine && (
                                <textarea className="form-control" style={{ marginTop: 8 }} rows={2} placeholder="Details on segregation / control..." value={form.porcine_details} onChange={e => setForm(f => ({ ...f, porcine_details: e.target.value }))} />
                              )}
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">12. Intoxicants Used as Ingredient? <span>*</span></label>
                              <select className="form-control" value={form.has_intoxicants ? 'yes' : form.has_intoxicants === false ? 'no' : ''} onChange={e => setForm(f => ({ ...f, has_intoxicants: e.target.value === 'yes' }))} required>
                                <option value="">Select Option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                              {form.has_intoxicants && (
                                <textarea className="form-control" style={{ marginTop: 8 }} rows={2} placeholder="Describe usage..." value={form.intoxicants_details} onChange={e => setForm(f => ({ ...f, intoxicants_details: e.target.value }))} />
                              )}
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">13. Willing to Depict HFA Logo on Products? <span>*</span></label>
                              <select className="form-control" value={form.use_hfa_logo || ''} onChange={e => setForm(f => ({ ...f, use_hfa_logo: e.target.value }))} required>
                                <option value="">Select Option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">14. How Did You Hear About Us? <span>*</span></label>
                              <select className="form-control" value={form.referral_source || ''} onChange={e => setForm(f => ({ ...f, referral_source: e.target.value }))} required>
                                <option value="">Select Option</option>
                                <option value="Social Media/Search Engine">Social Media/Search Engine</option>
                                <option value="Recommended by supplier/customer">Recommended by supplier/customer</option>
                                <option value="Required by a regulatory authority">Required by a regulatory authority</option>
                                <option value="Industry event/conference">Industry event/conference</option>
                                <option value="HFA advertisement/communication">HFA advertisement/communication</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>

                          {/* Declaration signature */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">15. Name <span>*</span></label>
                              <input type="text" className="form-control" placeholder="Full name" value={form.managing_director} onChange={e => setForm(f => ({ ...f, managing_director: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">16. Position <span>*</span></label>
                              <input type="text" className="form-control" placeholder="Job title / position" value={form.signatory_position || ''} onChange={e => setForm(f => ({ ...f, signatory_position: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                              <label className="form-label">17. Date <span>*</span></label>
                              <input type="date" className="form-control" value={form.signatory_date || new Date().toISOString().split('T')[0]} onChange={e => setForm(f => ({ ...f, signatory_date: e.target.value }))} required />
                            </div>
                          </div>

                          {/* Declaration checkbox */}
                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '14px 18px', background: '#f0fdf4', borderRadius: 12, border: '1.5px solid #a7f3d0' }}>
                            <input type="checkbox" checked={form.declared_true} onChange={e => setForm(f => ({ ...f, declared_true: e.target.checked }))} required style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6, color: '#065f46' }}>
                              I hereby declare that all information provided in this application is true, complete, and correct to the best of my knowledge and I agree to comply with all HFA certification requirements.
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Modal Footer */}
                  <div style={{ padding: '16px 32px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                      Section {modalStep} of 5
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {modalStep > 1 && (
                        <button type="button" className="btn btn-ghost" onClick={() => setModalStep(s => s - 1)} style={{ gap: 6 }}>
                          <ChevronLeft size={16} /> Previous
                        </button>
                      )}
                      <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>Cancel</button>
                      {modalStep < 5 ? (
                        <button type="button" className="btn btn-primary" disabled={getGatingStatus()?.blocked} onClick={() => handleNavigateToStep(modalStep + 1)} style={{ gap: 6, background: 'linear-gradient(135deg, #065f46, #1B7A7A)', borderColor: '#065f46' }}>
                          Next <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button type="button" className="btn btn-primary" disabled={submitting || !form.declared_true} onClick={handleSubmit} style={{ gap: 8, background: 'linear-gradient(135deg, #065f46, #1B7A7A)', borderColor: '#065f46', padding: '10px 24px' }}>
                          {submitting ? <span className="spinner-white" /> : <><ShieldCheck size={18} /> Submit Application</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── POST-SUBMISSION "ADD PRODUCTS?" MODAL ───────────────────────── */}
      {showAddProductPrompt && createPortal(
        <div
          onClick={e => {
            if (e.target === e.currentTarget) {
              setShowAddProductPrompt(false);
              navigate('/applications', { replace: true });
            }
          }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(5px)',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: addProductChoice === 'yes' ? 860 : 520,
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            transition: 'max-width 0.3s ease',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #065f46 0%, #1B7A7A 100%)',
              padding: '22px 28px', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Package size={24} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' }}>
                    {addProductChoice === 'yes' ? 'Add Products (Add-on Product Application)' : 'Application Submitted Successfully! 🎉'}
                  </h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '3px 0 0' }}>
                    {addProductChoice === 'yes'
                      ? 'Submit product details to be processed under Add-on Products'
                      : 'Your certification application has been recorded'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddProductPrompt(false);
                  navigate('/applications', { replace: true });
                }}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            {addProductChoice !== 'yes' ? (
              <div style={{ padding: '32px 28px', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5',
                  border: '2px solid #a7f3d0', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 18px', color: '#059669'
                }}>
                  <CheckCircle size={36} />
                </div>
                <h4 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                  Do you want to add products now?
                </h4>
                <p style={{ fontSize: 13, color: '#64748b', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.6 }}>
                  You can register products for halal approval right now. Products added will automatically be submitted to your <strong>Add-on Products</strong> queue.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 360, margin: '0 auto' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddProductPrompt(false);
                      navigate('/applications', { replace: true });
                    }}
                    style={{
                      padding: '12px 18px', borderRadius: 12, border: '1.5px solid #cbd5e1',
                      background: '#f8fafc', color: '#475569', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    No, Skip for Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddProductChoice('yes')}
                    style={{
                      padding: '12px 18px', borderRadius: 12, border: 'none',
                      background: 'linear-gradient(135deg, #065f46 0%, #1B7A7A 100%)',
                      color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(6, 95, 70, 0.25)', transition: 'all 0.2s'
                    }}
                  >
                    Yes, Add Products
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 28px', maxHeight: '72vh', overflowY: 'auto' }}>
                {/* Site context — shows the site they just applied for */}
                <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Package size={16} style={{ color: '#059669', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#065f46' }}>Applying For Site</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{submittedSiteName || 'Your Site'}</div>
                    {submittedAppNumber && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Application Ref: {submittedAppNumber}</div>
                    )}
                  </div>
                </div>

                {/* Contact details */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Contact Person Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>Contact Name <span>*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Full name"
                        value={addOnContact.name}
                        onChange={e => setAddOnContact(c => ({ ...c, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>Contact Email <span>*</span></label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="email@example.com"
                        value={addOnContact.email}
                        onChange={e => setAddOnContact(c => ({ ...c, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>Contact Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="+44 20 0000 0000"
                        value={addOnContact.phone}
                        onChange={e => setAddOnContact(c => ({ ...c, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Products table */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>Products to Add</div>
                    <button
                      type="button"
                      onClick={() => setAddOnProductRows(r => [...r, { name: '', code: '', type: 'Add product' }])}
                      style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
                        borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} /> + Add Another Product
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {addOnProductRows.map((p, idx) => {
                      const allClientProductNames = Array.from(new Set([
                        ...certs.flatMap(c => c.products_covered || []),
                        ...clientProducts.map(cp => cp.name).filter(Boolean)
                      ]));

                      return (
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
                              disabled={addOnProductRows.length === 1}
                              onClick={() => setAddOnProductRows(rows => rows.filter((_, i) => i !== idx))}
                              style={{
                                background: addOnProductRows.length === 1 ? '#f1f5f9' : '#fee2e2',
                                border: 'none', borderRadius: 6, width: 28, height: 28,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: addOnProductRows.length === 1 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <Trash2 size={13} color={addOnProductRows.length === 1 ? '#cbd5e1' : '#dc2626'} />
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Action Type *</label>
                              <select
                                className="form-control"
                                style={{ margin: 0, fontSize: 13 }}
                                value={p.type}
                                onChange={e => {
                                  const val = e.target.value;
                                  setAddOnProductRows(rows => rows.map((r, i) => i === idx ? { ...r, type: val } : r));
                                }}
                              >
                                <option value="Add product">Add product</option>
                                <option value="Remove product">Remove product</option>
                                <option value="Change name/code">Change name/code</option>
                                <option value="Change ingredients">Change ingredients</option>
                              </select>
                            </div>

                            {p.type === 'Add product' && (
                              <>
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Product Name *</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Product Name *"
                                    value={p.name}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setAddOnProductRows(rows => rows.map((r, i) => i === idx ? { ...r, name: val } : r));
                                    }}
                                    required
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Code / SKU</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Code / SKU"
                                    value={p.code}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setAddOnProductRows(rows => rows.map((r, i) => i === idx ? { ...r, code: val } : r));
                                    }}
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
                                    const val = e.target.value;
                                    setAddOnProductRows(rows => rows.map((r, i) => i === idx ? { ...r, name: val, original_name: val } : r));
                                  }}
                                  required
                                >
                                  <option value="">-- Select Product to Remove --</option>
                                  {allClientProductNames.map(name => (
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
                                      const val = e.target.value;
                                      setAddOnProductRows(rows => rows.map((r, i) => i === idx ? { ...r, original_name: val, name: val } : r));
                                    }}
                                    required
                                  >
                                    <option value="">-- Select Existing Product --</option>
                                    {allClientProductNames.map(name => (
                                      <option key={name} value={name}>{name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: 4 }}>New Product Name *</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="New Product Name *"
                                    value={p.new_name || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setAddOnProductRows(rows => rows.map((r, i) => i === idx ? { ...r, new_name: val } : r));
                                    }}
                                    required
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: 4 }}>New Code / SKU</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="New Code / SKU"
                                    value={p.new_code || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setAddOnProductRows(rows => rows.map((r, i) => i === idx ? { ...r, new_code: val } : r));
                                    }}
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
                                      const val = e.target.value;
                                      setAddOnProductRows(rows => rows.map((r, i) => i === idx ? { ...r, original_name: val, name: val } : r));
                                    }}
                                    required
                                  >
                                    <option value="">-- Select Product --</option>
                                    {allClientProductNames.map(name => (
                                      <option key={name} value={name}>{name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Notes / Ingredient Changes</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Revised oil formulation"
                                    value={p.code || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setAddOnProductRows(rows => rows.map((r, i) => i === idx ? { ...r, code: val } : r));
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowAddProductPrompt(false);
                      navigate('/applications', { replace: true });
                    }}
                  >
                    Skip &amp; Done
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={addOnSubmitting}
                    onClick={handleAddOnProductSubmit}
                    style={{ background: 'linear-gradient(135deg, #065f46 0%, #1B7A7A 100%)', borderColor: '#065f46', padding: '10px 22px' }}
                  >
                    {addOnSubmitting ? <span className="spinner-white" /> : <><ShieldCheck size={16} /> Submit to Add-on Products</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
