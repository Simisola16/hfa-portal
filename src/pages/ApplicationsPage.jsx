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

    if (actionParam === 'new') {
      setShowModal(true);
      setForm(f => ({ ...f, application_type: 'new' }));
    } else if (actionParam === 'surveillance') {
      handleOpenSurveillanceModal();
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
  const [renewalFiles, setRenewalFiles] = useState([]);

  // Surveillance Modal State (UAE/GSO 3-Year Cycle)
  const [showSurveillanceModal, setShowSurveillanceModal] = useState(false);
  const [surveillanceForm, setSurveillanceForm] = useState({
    site_id: '',
    site_name: '',
    establishment_name: '',
    primary_contact_name: '',
    primary_email: '',
    primary_work_tel: '',
    surveillance_year: 1,
    notes: '',
    declared_true: false
  });
  const [surveillanceFiles, setSurveillanceFiles] = useState([]);

  // Post-submit "Application Submitted" success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState(null);
  const [submittedAppNumber, setSubmittedAppNumber] = useState('');
  const [submittedSiteName, setSubmittedSiteName] = useState('');
  const [submittedCategory, setSubmittedCategory] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, sitesRes, certsRes, prodsRes] = await Promise.all([
        api.get('/api/applications').catch(() => ({ data: [] })),
        api.get('/api/sites').catch(() => ({ data: [] })),
        api.get('/api/certificates').catch(() => ({ data: [] })),
        api.get('/api/products').catch(() => ({ data: [] }))
      ]);

      const loadedApps = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : []);
      const loadedSites = Array.isArray(sitesRes) ? sitesRes : (Array.isArray(sitesRes?.data) ? sitesRes.data : []);
      const loadedCerts = Array.isArray(certsRes) ? certsRes : (Array.isArray(certsRes?.data) ? certsRes.data : []);
      const loadedProds = Array.isArray(prodsRes) ? prodsRes : (Array.isArray(prodsRes?.data?.data) ? prodsRes.data.data : (Array.isArray(prodsRes?.data) ? prodsRes.data : []));

      setApps(loadedApps);
      setSites(loadedSites);
      setCerts(loadedCerts);
      setClientProducts(loadedProds);

      const active = loadedCerts.some(c =>
        c && c.status === 'active' && (!c.expiry_date || new Date(c.expiry_date) >= new Date())
      );
      setHasActiveCert(active);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const checkRenewalEligibility = (siteId) => {
    if (!siteId) return false;
    const now = Date.now();
    const threeMonthsInMs = 90 * 24 * 60 * 60 * 1000;

    const safeCerts = Array.isArray(certs) ? certs : [];
    const siteCerts = safeCerts.filter(c => {
      if (!c) return false;
      const sId = typeof c.site_id === 'object' ? c.site_id?._id || c.site_id?.id : c.site_id;
      return String(sId) === String(siteId);
    });

    const certEligible = siteCerts.some(c => {
      if (!c) return false;
      if (c.status === 'expired') return true;
      if (!c.expiry_date) return false;
      const expiryTime = new Date(c.expiry_date).getTime();
      return (expiryTime - now) <= threeMonthsInMs;
    });

    if (certEligible) return true;

    const safeApps = Array.isArray(apps) ? apps : [];
    const siteApps = safeApps.filter(a => {
      if (!a) return false;
      const sId = typeof a.site_id === 'object' ? a.site_id?._id || a.site_id?.id : a.site_id;
      return String(sId) === String(siteId);
    });

    return siteApps.some(a => {
      if (!a) return false;
      if (a.status === 'expired') return true;
      if (a.certificate_expiry) {
        const expiryTime = new Date(a.certificate_expiry).getTime();
        return (expiryTime - now) <= threeMonthsInMs;
      }
      return false;
    });
  };

  // Helper: Find GSO Certified applications/sites eligible for annual surveillance (Year 1 & Year 2)
  const getGSOSurveillanceEligibleList = () => {
    const safeApps = Array.isArray(apps) ? apps : [];
    const safeCerts = Array.isArray(certs) ? certs : [];
    const now = Date.now();
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;

    // Find all GSO applications and GSO certificates
    const gsoApps = safeApps.filter(a => {
      if (!a) return false;
      const cat = (a.category || '').toLowerCase();
      const type = (a.application_type || '').toLowerCase();
      return cat.includes('gso') || cat.includes('uae') || type.includes('gso');
    });

    const gsoCerts = safeCerts.filter(c => {
      if (!c) return false;
      const cat = (c.category || '').toLowerCase();
      const scope = (c.scope || '').toLowerCase();
      const scheme = (c.scheme || '').toLowerCase();
      return cat.includes('gso') || cat.includes('uae') || scope.includes('gso') || scheme.includes('gso');
    });

    const gsoSiteMap = new Map();

    // 1. Process from apps
    gsoApps.forEach(a => {
      const sId = typeof a.site_id === 'object' ? a.site_id?._id || a.site_id?.id : a.site_id;
      if (!sId) return;
      
      const key = String(sId);
      const isCertified = a.status === 'certificate_issued' || a.has_certificate;
      const isOngoingSurveillance = a.application_type === 'surveillance' && !['certificate_issued', 'rejected'].includes(a.status?.toLowerCase());

      if (!gsoSiteMap.has(key)) {
        gsoSiteMap.set(key, {
          site_id: key,
          site_name: a.site_name || a.establishment_name || 'Manufacturing Site',
          establishment_name: a.establishment_name || a.site_name || '',
          category: a.category || 'UAE/GSO Approved Halal Certification For Exporters To UAE',
          managing_director: a.managing_director || a.primary_contact_name || '',
          primary_email: a.primary_email || a.company_email || '',
          primary_work_tel: a.primary_work_tel || a.primary_mobile || '',
          created_at: a.created_at,
          certified: isCertified,
          hasOngoingSurveillance: isOngoingSurveillance,
          ongoingAppNumber: isOngoingSurveillance ? a.application_number : null,
          surveillanceCount: 0,
          application_id: a._id
        });
      } else {
        const existing = gsoSiteMap.get(key);
        if (isCertified) existing.certified = true;
        if (isOngoingSurveillance) {
          existing.hasOngoingSurveillance = true;
          existing.ongoingAppNumber = a.application_number;
        }
      }
    });

    // 2. Process from certificates
    gsoCerts.forEach(c => {
      const sId = typeof c.site_id === 'object' ? c.site_id?._id || c.site_id?.id : c.site_id;
      if (!sId) return;
      const key = String(sId);

      if (gsoSiteMap.has(key)) {
        const existing = gsoSiteMap.get(key);
        existing.certified = true;
        existing.certificate_number = c.certificate_number;
        existing.issue_date = c.issue_date;
        existing.expiry_date = c.expiry_date;
      } else {
        const matchingSite = sites.find(s => String(s._id) === key);
        gsoSiteMap.set(key, {
          site_id: key,
          site_name: matchingSite?.name || c.site_name || 'Manufacturing Site',
          establishment_name: matchingSite?.est_name || c.company_name || '',
          category: c.category || 'UAE/GSO Approved Halal Certification For Exporters To UAE',
          managing_director: c.contact_person || '',
          primary_email: c.contact_email || '',
          primary_work_tel: c.contact_phone || '',
          created_at: c.issue_date || c.created_at,
          certified: true,
          certificate_number: c.certificate_number,
          issue_date: c.issue_date,
          expiry_date: c.expiry_date,
          hasOngoingSurveillance: false,
          ongoingAppNumber: null,
          surveillanceCount: 0
        });
      }
    });

    // 3. Count completed surveillances
    safeApps.forEach(a => {
      if (a.application_type === 'surveillance' && (a.status === 'certificate_issued' || a.status === 'ready_for_certificate')) {
        const sId = typeof a.site_id === 'object' ? a.site_id?._id || a.site_id?.id : a.site_id;
        if (sId && gsoSiteMap.has(String(sId))) {
          gsoSiteMap.get(String(sId)).surveillanceCount++;
        }
      }
    });

    const result = [];
    gsoSiteMap.forEach(item => {
      const year = item.surveillanceCount >= 1 ? 2 : 1;
      item.cycle_year = year;
      
      const startDate = item.issue_date ? new Date(item.issue_date).getTime() : (item.created_at ? new Date(item.created_at).getTime() : now);
      const elapsedMs = now - startDate;
      const elapsedYears = elapsedMs / oneYearInMs;

      // Surveillance is due when:
      // Year 1: Certified, has used ~1 year (>= 9 months / 0.75 year or 1 year) and surveillanceCount === 0
      // Year 2: Certified, has used ~2 years (>= 21 months / 1.75 years or 2 years) and surveillanceCount === 1
      const isDueForCycle = year === 1 ? (elapsedYears >= 0.75) : (elapsedYears >= 1.75);
      const needsSurveillance = item.certified && item.surveillanceCount < 2 && !item.hasOngoingSurveillance && isDueForCycle;

      item.isEligible = item.certified && !item.hasOngoingSurveillance;
      item.elapsedYears = elapsedYears;
      item.needsSurveillance = needsSurveillance;

      result.push(item);
    });

    return result;
  };

  const handleOpenSurveillanceModal = () => {
    const gsoList = getGSOSurveillanceEligibleList();
    if (gsoList.length > 0) {
      const firstEligible = gsoList.find(g => g.isEligible) || gsoList[0];
      if (firstEligible) {
        setSurveillanceForm({
          site_id: firstEligible.site_id,
          site_name: firstEligible.site_name,
          establishment_name: firstEligible.establishment_name,
          primary_contact_name: firstEligible.managing_director || '',
          primary_email: firstEligible.primary_email || '',
          primary_work_tel: firstEligible.primary_work_tel || '',
          surveillance_year: firstEligible.cycle_year || 1,
          notes: '',
          declared_true: false
        });
      }
    }
    setShowSurveillanceModal(true);
  };

  const handleSurveillanceSiteChange = (siteId) => {
    const gsoList = getGSOSurveillanceEligibleList();
    const target = gsoList.find(g => String(g.site_id) === String(siteId));
    const selectedSite = sites.find(s => String(s._id) === String(siteId));

    if (target) {
      setSurveillanceForm(f => ({
        ...f,
        site_id: siteId,
        site_name: target.site_name || selectedSite?.name || 'Manufacturing Site',
        establishment_name: target.establishment_name || selectedSite?.est_name || selectedSite?.name || '',
        primary_contact_name: target.managing_director || f.primary_contact_name || '',
        primary_email: target.primary_email || f.primary_email || '',
        primary_work_tel: target.primary_work_tel || f.primary_work_tel || '',
        surveillance_year: target.cycle_year || 1
      }));
    } else if (selectedSite) {
      setSurveillanceForm(f => ({
        ...f,
        site_id: siteId,
        site_name: selectedSite.name || 'Manufacturing Site',
        establishment_name: selectedSite.est_name || selectedSite.name || ''
      }));
    }
  };

  const handleSubmitSurveillance = async (e) => {
    if (e) e.preventDefault();
    if (!surveillanceForm.site_id) {
      toast.error('Please select a GSO certified site for surveillance.');
      return;
    }
    if (!surveillanceForm.primary_contact_name?.trim()) {
      toast.error('Contact Person Name is required.');
      return;
    }
    if (!surveillanceForm.primary_email?.trim()) {
      toast.error('Contact Person Email is required.');
      return;
    }
    if (!surveillanceForm.primary_work_tel?.trim()) {
      toast.error('Contact Person Phone Number is required.');
      return;
    }
    if (!surveillanceForm.declared_true) {
      toast.error('Please confirm the compliance declaration before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const gsoList = getGSOSurveillanceEligibleList();
      const selectedGSO = gsoList.find(g => String(g.site_id) === String(surveillanceForm.site_id));
      const selectedSite = sites.find(s => String(s._id) === String(surveillanceForm.site_id));

      const fd = new FormData();
      fd.append('application_type', 'surveillance');
      fd.append('category', 'UAE/GSO Approved Halal Certification For Exporters To UAE');
      fd.append('site_id', surveillanceForm.site_id);
      fd.append('site_name', selectedSite?.name || selectedGSO?.site_name || 'Manufacturing Site');
      fd.append('establishment_name', selectedGSO?.establishment_name || selectedSite?.est_name || selectedSite?.name || '');
      fd.append('primary_contact_name', surveillanceForm.primary_contact_name.trim());
      fd.append('managing_director', surveillanceForm.primary_contact_name.trim());
      fd.append('primary_email', surveillanceForm.primary_email.trim());
      fd.append('company_email', surveillanceForm.primary_email.trim());
      fd.append('primary_work_tel', surveillanceForm.primary_work_tel.trim());
      fd.append('primary_mobile', surveillanceForm.primary_work_tel.trim());
      fd.append('notes', `[Year ${surveillanceForm.surveillance_year || 1} Surveillance] ${surveillanceForm.notes || ''}`);
      fd.append('declared_true', 'true');

      if (surveillanceFiles.length > 0) {
        surveillanceFiles.forEach(f => fd.append('supporting_docs', f));
      }

      await api.post('/api/applications', fd, true);
      toast.success('🎉 Surveillance application submitted successfully!');
      setShowSurveillanceModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit surveillance application.');
    } finally {
      setSubmitting(false);
    }
  };

  const getGatingStatus = () => {
    if (!form.site_id) return null;

    // Active Certificate blocks a new application if certificate has > 3 months left
    if (form.application_type === 'new') {
      const safeCerts = Array.isArray(certs) ? certs : [];
      const activeCert = safeCerts.find(c => {
        if (!c) return false;
        const sId = typeof c.site_id === 'object' ? c.site_id?._id || c.site_id?.id : c.site_id;
        return String(sId) === String(form.site_id) && c.status === 'active' && (!c.expiry_date || new Date(c.expiry_date) > new Date());
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
      // Resolve the site name from the sites list
      const selectedSite = sites.find(s => String(s._id || s.id) === String(form.site_id));
      setSubmittedSiteName(selectedSite?.name || form.site_name || form.establishment_name || 'Your Site');
      setSubmittedAppId(createdApp._id || createdApp.id || null);
      setSubmittedAppNumber(createdApp.application_number || '');
      setSubmittedCategory(form.category || 'Halal Certification');
      resetForm();
      fetchData();
      // Open the Application Submitted Success & Under Review animation modal
      setShowSuccessModal(true);
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
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

  const safeApps = Array.isArray(apps) ? apps : [];
  const filtered = safeApps.filter(a => {
    if (!a) return false;
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
    if (appId && safeApps.length > 0) {
      const targetApp = safeApps.find(a => a && (a._id === appId || a.id === appId));
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
        <div style={{ display: 'flex', gap: 10, marginLeft: pendingApp ? 0 : 'auto', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
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

          {getGSOSurveillanceEligibleList().some(g => g.needsSurveillance) && (
            <button
              className="btn btn-outline"
              style={{
                borderColor: '#0284c7',
                color: '#0284c7',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#f0f9ff'
              }}
              onClick={handleOpenSurveillanceModal}
            >
              <ShieldCheck size={15} /> Create Surveillance
            </button>
          )}
        </div>
      </div>

      {pendingApp && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1.5px solid #86efac',
          borderRadius: 20,
          padding: '20px 24px',
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 4px 12px -2px rgba(22, 163, 74, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#15803d' }}>
                Ongoing Application
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#14532d', marginTop: 2 }}>
                {pendingApp.site_name || pendingApp.establishment_name || 'Manufacturing Site'} &middot; <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>{pendingApp.application_number}</span>
              </div>
              <div style={{ fontSize: 12, color: '#166534', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Status:</span>
                <span className={`badge ${STATUS_BADGE[pendingApp.status] || 'badge-green'}`} style={{ textTransform: 'capitalize', fontSize: 11, fontWeight: 700 }}>
                  {STATUS_LABELS[pendingApp.status] || pendingApp.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ background: '#15803d', borderColor: '#15803d', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => navigate(`/applications/${pendingApp._id || pendingApp.id}/track`)}
          >
            Track Ongoing Application <ChevronRight size={16} />
          </button>
        </div>
      )}

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
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '4px 10px',
                        background: app.application_type === 'surveillance' ? '#f0f9ff' : (app.application_type === 'renewal' ? '#fef3c7' : '#f1f5f9'),
                        color: app.application_type === 'surveillance' ? '#0284c7' : (app.application_type === 'renewal' ? '#b45309' : '#475569'),
                        border: `1px solid ${app.application_type === 'surveillance' ? '#bae6fd' : (app.application_type === 'renewal' ? '#fde68a' : '#e2e8f0')}`,
                        borderRadius: 6,
                        textTransform: 'uppercase'
                      }}
                    >
                      {app.application_type || 'new'}
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
                  {(() => {
                    const g = getGatingStatus(); return g?.blocked ? (
                      <div style={{ padding: '14px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fef08a', display: 'flex', gap: 10 }}>
                        <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 13, color: '#854d0e' }}>{g.message}</p>
                      </div>
                    ) : null;
                  })()}
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
                  <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit} style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', borderColor: '#d97706' }}>
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

                        {(() => {
                          const g = getGatingStatus(); return g?.blocked ? (
                            <div style={{ marginBottom: 20, padding: '14px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fef08a', display: 'flex', gap: 10 }}>
                              <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                              <p style={{ margin: 0, fontSize: 13, color: '#854d0e', lineHeight: 1.6 }}>{g.message}</p>
                            </div>
                          ) : null;
                        })()}

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
                        <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit} style={{ gap: 8, background: 'linear-gradient(135deg, #065f46, #1B7A7A)', borderColor: '#065f46', padding: '10px 24px' }}>
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
      {/* ─── APPLICATION SUBMITTED & UNDER REVIEW ANIMATION MODAL ─── */}
      {showSuccessModal && createPortal(
        <div
          onClick={e => {
            if (e.target === e.currentTarget) {
              setShowSuccessModal(false);
              navigate('/applications', { replace: true });
            }
          }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              width: '100%',
              maxWidth: 560,
              boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            {/* Top decorative header gradient */}
            <div
              style={{
                background: 'linear-gradient(135deg, #065f46 0%, #0d9488 50%, #115e59 100%)',
                padding: '28px 28px 24px',
                color: '#fff',
                position: 'relative',
                textAlign: 'center'
              }}
            >
              {/* Animated Glowing Icon */}
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '3px solid rgba(255, 255, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 35px rgba(255, 255, 255, 0.35)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <CheckCircle size={36} strokeWidth={2.5} />
                </div>
              </div>

              <h3 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', color: '#fff', letterSpacing: '-0.02em' }}>
                Application Submitted! 🎉
              </h3>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.92)', margin: 0, fontWeight: 500 }}>
                Your halal certification application has been recorded successfully
              </p>

              {/* Status pill badge */}
              <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', display: 'inline-block' }} />
                Status: Under Review by Admin
              </div>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/applications', { replace: true });
                }}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Application Details Summary */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Application Reference</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                    {submittedAppNumber || 'Pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Manufacturing Site</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    {submittedSiteName || 'Main Facility'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Scheme / Category</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0369a1', maxWidth: 260, textAlign: 'right' }}>
                    {submittedCategory || 'Annual Certification'}
                  </span>
                </div>
              </div>

              {/* What Happens Next Roadmap Card */}
              <div style={{ background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0', padding: '16px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#166534', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="#166534" /> What Happens Next?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#059669', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                    <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.45 }}>
                      <strong>Admin &amp; Technical Review:</strong> HFA compliance officers are reviewing your application scope and documents.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                    <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.45 }}>
                      <strong>Initial Certification Invoice:</strong> You will receive an initial proposal and invoice for certification.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
                    <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.45 }}>
                      <strong>Initial Product Registration:</strong> Once your Initial Certification Invoice is confirmed, you will be invited to register your <strong>1 Initial Product</strong> for Halal evaluation.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/applications', { replace: true });
                  }}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 12,
                    border: '1.5px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  View Applications
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    if (submittedAppId) {
                      navigate(`/applications/${submittedAppId}/track`);
                    } else {
                      navigate('/applications');
                    }
                  }}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #065f46 0%, #0d9488 100%)',
                    color: '#fff',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(6, 95, 70, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  Track Application <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ─── SURVEILLANCE APPLICATION MODAL (UAE/GSO 3-YEAR SCHEME) ─── */}
      {showSurveillanceModal && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => !submitting && setShowSurveillanceModal(false)}>
          <div
            className="modal"
            style={{
              maxWidth: 680,
              width: '95%',
              maxHeight: '90vh',
              padding: 0,
              borderRadius: 20,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                padding: '20px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
                    Create Surveillance Application
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                    UAE/GSO 3-Year Halal Certification Scheme &bull; Annual Surveillance
                  </div>
                </div>
              </div>
              <button
                onClick={() => !submitting && setShowSurveillanceModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  borderRadius: 8,
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Explanatory Info Card */}
            <div style={{ padding: '14px 28px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <RefreshCw size={18} style={{ color: '#0284c7', flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: '#0369a1', lineHeight: 1.4 }}>
                <strong>Annual GSO Surveillance Cycle:</strong> GSO certifications follow a 3-year cycle with <strong>2 audit stages</strong> in Year 1 and Year 2. Upon completion, an official <strong>Surveillance Letter</strong> is issued (no certificate re-issue).
              </div>
            </div>

            {/* Modal Body / Form */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18, background: '#fafafa' }}>
              {(() => {
                const gsoList = getGSOSurveillanceEligibleList();
                const hasGSO = gsoList.length > 0;

                if (!hasGSO) {
                  return (
                    <div style={{ padding: '32px 20px', textAlign: 'center', background: '#fff', borderRadius: 14, border: '1.5px dashed #cbd5e1' }}>
                      <AlertTriangle size={36} style={{ color: '#f59e0b', margin: '0 auto 12px' }} />
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                        No Eligible GSO Certifications Found
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.5 }}>
                        Surveillance applications are designed for facilities holding an active <strong>UAE/GSO 3-Year Certification</strong>. You do not currently have a certified GSO site.
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ margin: '0 auto', fontSize: 13, fontWeight: 700 }}
                        onClick={() => {
                          setShowSurveillanceModal(false);
                          setShowModal(true);
                          setForm(f => ({ ...f, application_type: 'new', category: CATEGORIES[2] }));
                        }}
                      >
                        Apply for UAE/GSO Certification
                      </button>
                    </div>
                  );
                }

                const selectedGSO = gsoList.find(g => String(g.site_id) === String(surveillanceForm.site_id));
                const isOngoing = selectedGSO?.hasOngoingSurveillance;

                return (
                  <>
                    {/* Site Selection */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                        Select GSO Certified Site <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        className="form-control"
                        value={surveillanceForm.site_id}
                        onChange={e => handleSurveillanceSiteChange(e.target.value)}
                        required
                        style={{ fontSize: 13.5, padding: '10px 14px', borderRadius: 10 }}
                      >
                        <option value="">-- Choose GSO Facility --</option>
                        {gsoList.map(g => (
                          <option key={g.site_id} value={g.site_id}>
                            {g.site_name} &bull; {g.establishment_name || g.site_name} (Year {g.cycle_year} Surveillance) {g.hasOngoingSurveillance ? '— [Surveillance in progress]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isOngoing && (
                      <div style={{ padding: '12px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                        <div style={{ fontSize: 12.5, color: '#92400e' }}>
                          This facility already has a surveillance application in progress (<strong>#{selectedGSO.ongoingAppNumber}</strong>). You cannot submit another surveillance request until the current one concludes.
                        </div>
                      </div>
                    )}

                    {/* Surveillance Year Selection */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>
                        Surveillance Stage / Milestone <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { year: 1, title: 'Year 1 Surveillance', desc: '1st Annual Review (12 months)' },
                          { year: 2, title: 'Year 2 Surveillance', desc: '2nd Annual Review (24 months)' },
                        ].map(s => {
                          const isSelected = (surveillanceForm.surveillance_year || 1) === s.year;
                          return (
                            <div
                              key={s.year}
                              onClick={() => setSurveillanceForm(f => ({ ...f, surveillance_year: s.year }))}
                              style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                border: `2px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                                background: isSelected ? '#f0f9ff' : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="radio"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  style={{ accentColor: '#0284c7' }}
                                />
                                <span style={{ fontWeight: 800, fontSize: 13, color: isSelected ? '#0369a1' : '#0f172a' }}>
                                  {s.title}
                                </span>
                              </div>
                              <div style={{ fontSize: 11.5, color: isSelected ? '#0284c7' : '#64748b', marginTop: 4, marginLeft: 24 }}>
                                {s.desc}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Contact Person Details */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                        Primary Contact Person
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Dr. Jane Smith"
                          value={surveillanceForm.primary_contact_name}
                          onChange={e => setSurveillanceForm(f => ({ ...f, primary_contact_name: e.target.value }))}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>Email Address <span style={{ color: '#dc2626' }}>*</span></label>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="contact@company.com"
                            value={surveillanceForm.primary_email}
                            onChange={e => setSurveillanceForm(f => ({ ...f, primary_email: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>Phone / Tel Number <span style={{ color: '#dc2626' }}>*</span></label>
                          <input
                            type="tel"
                            className="form-control"
                            placeholder="+44 7700 900077"
                            value={surveillanceForm.primary_work_tel}
                            onChange={e => setSurveillanceForm(f => ({ ...f, primary_work_tel: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Operational Notes / Updates */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>
                        Surveillance Notes &amp; Facility Updates <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>(Optional)</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Detail any changes to facility layout, ingredients, production volume, or QA coordinators..."
                        value={surveillanceForm.notes}
                        onChange={e => setSurveillanceForm(f => ({ ...f, notes: e.target.value }))}
                      />
                    </div>

                    {/* Compliance Declaration */}
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1.5px solid #cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={surveillanceForm.declared_true}
                        onChange={e => setSurveillanceForm(f => ({ ...f, declared_true: e.target.checked }))}
                        style={{ marginTop: 2, width: 16, height: 16, accentColor: '#0284c7' }}
                      />
                      <span style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.4 }}>
                        I hereby declare that this facility continues to adhere strictly to all UAE/GSO Halal Certification standards and procedures.
                      </span>
                    </label>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowSurveillanceModal(false)}
                disabled={submitting}
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>

              {getGSOSurveillanceEligibleList().length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting || !surveillanceForm.site_id || getGSOSurveillanceEligibleList().find(g => String(g.site_id) === String(surveillanceForm.site_id))?.hasOngoingSurveillance}
                  onClick={handleSubmitSurveillance}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    borderColor: '#0284c7',
                    fontWeight: 800,
                    padding: '10px 22px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {submitting ? <span className="spinner-white" /> : <><ShieldCheck size={18} /> Submit Surveillance Application</>}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
