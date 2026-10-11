import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Award, PlusCircle, Trash2, FileText,
  CheckCircle, AlertCircle, Package, X, Users, ChevronDown, ChevronUp, ArrowUpRight, Activity,
  UploadCloud, Paperclip, Lock, Edit, Beaker, Building2, FileEdit
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

const PRODUCT_TYPES = ['Add product', 'Remove product', 'Change name/code', 'Change ingredients', 'Change supplier/manufacturer'];

const STATUS_LABELS = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  ft_assigned: 'FT Assigned',
  product_approval_form_enabled: 'Product Form Enabled',
  all_forms_received: 'Product Form Received',
  logsheet_created: 'Under Review',
  waiting_sharia_signature: 'Under Review',
  product_form_approved: 'Product Approved',
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


const getRowTypeForAddonType = (aType) => {
  if (aType === 'remove_product') return 'Remove product';
  if (aType === 'change_ingredients') return 'Change ingredients';
  if (aType === 'change_supplier') return 'Change supplier/manufacturer';
  return 'Add product';
};

const emptyProduct = (rowType = 'Add product') => ({
  name: '',
  code: '',
  type: rowType,
  original_name: '',
  new_name: '',
  new_code: '',
  description: ''
});

export default function AddOnApplicationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [certs, setCerts] = useState([]);
  const [sites, setSites] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [clientProducts, setClientProducts] = useState([]);
  const [siteProducts, setSiteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [addonType, setAddonType] = useState('add_product');
  const [attachments, setAttachments] = useState([]);
  const [showOtherRequest, setShowOtherRequest] = useState(false);
  const otherRequestRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (otherRequestRef.current && !otherRequestRef.current.contains(e.target)) {
        setShowOtherRequest(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [form, setForm] = useState({
    site_id: '',
    certificate_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    message: '',
    products: [emptyProduct('Add product')]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [certsRes, sitesRes, appsRes, prodsRes] = await Promise.all([
        api.get('/api/certificates').catch(() => ({ data: [] })),
        api.get('/api/sites').catch(() => ({ data: [] })),
        api.get('/api/add-on-applications').catch(() => ({ data: [] })),
        api.get('/api/products').catch(() => ({ data: [] }))
      ]);

      const loadedCerts = Array.isArray(certsRes) ? certsRes : (Array.isArray(certsRes?.data) ? certsRes.data : []);
      const loadedSites = Array.isArray(sitesRes) ? sitesRes : (Array.isArray(sitesRes?.data) ? sitesRes.data : []);
      const loadedApps = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : (Array.isArray(appsRes?.data?.data) ? appsRes.data.data : []));
      const loadedProds = Array.isArray(prodsRes) ? prodsRes : (Array.isArray(prodsRes?.data) ? prodsRes.data : (Array.isArray(prodsRes?.data?.data) ? prodsRes.data.data : []));

      const now = Date.now();
      const active = loadedCerts.filter(c => {
        if (!c || c.status !== 'active') return false;
        if (!c.expiry_date) return true;
        const exp = new Date(c.expiry_date).getTime();
        return isNaN(exp) || exp >= now;
      });

      setCerts(active);
      setSites(loadedSites);
      setMyApps(loadedApps);
      setClientProducts(loadedProds);

      // Auto-preselect primary site if only 1 site exists
      if (loadedSites.length === 1) {
        const singleSite = loadedSites[0];
        const linkedCert = active.find(c => String(c.site_id?._id || c.site_id?.id || c.site_id) === String(singleSite.id || singleSite._id));
        setForm(f => ({
          ...f,
          site_id: singleSite.id || singleSite._id,
          certificate_id: linkedCert ? (linkedCert._id || linkedCert.id) : (active[0]?._id || active[0]?.id || '')
        }));
      } else if (active.length === 1 && loadedSites.length === 0) {
        setForm(f => ({ ...f, certificate_id: active[0]._id || active[0].id }));
      }
    } catch (err) {
      console.error('AddOnApplicationPage fetchData error:', err);
      toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Fetch site-specific products whenever form.site_id changes
  useEffect(() => {
    if (form.site_id) {
      api.get(`/api/products?site_id=${form.site_id}`)
        .then(res => {
          const prods = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []));
          setSiteProducts(prods);
        })
        .catch(err => console.warn('Failed to load site products:', err.message));
    } else {
      setSiteProducts([]);
    }
  }, [form.site_id]);

  const openFormWithType = (type = 'add_product') => {
    const resolved = ['remove_product', 'change_ingredients', 'change_supplier', 'add_product'].includes(type) ? type : 'add_product';
    setAddonType(resolved);
    const rowType = getRowTypeForAddonType(resolved);
    setAttachments([]);
    setForm(f => ({
      ...f,
      contact_name: f.contact_name || profile?.full_name || profile?.contact_person || user?.full_name || '',
      contact_phone: f.contact_phone || profile?.phone || user?.phone || '',
      contact_email: f.contact_email || profile?.email || user?.email || '',
      products: [emptyProduct(rowType)]
    }));
    if (sites.length === 1) {
      handleSiteChange(sites[0].id || sites[0]._id);
    }
    setShowForm(true);
  };

  // Auto-open the new application form when navigated with ?new=true
  useEffect(() => {
    if (searchParams.get('new') === 'true' && !loading) {
      const qType = searchParams.get('type') || 'add_product';
      openFormWithType(qType);
      navigate('/addon-applications', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Compute products specifically associated with the currently selected site / certificate
  const siteSpecificProducts = useMemo(() => {
    if (!form.site_id && !form.certificate_id) return [];

    const matchedCert = certs.find(c => String(c._id || c.id) === String(form.certificate_id)) ||
      certs.find(c => form.site_id && String(c.site_id?._id || c.site_id?.id || c.site_id) === String(form.site_id));

    const certCoverage = Array.isArray(matchedCert?.products_covered) ? matchedCert.products_covered : [];
    const certDetails = Array.isArray(matchedCert?.product_details) ? matchedCert.product_details : [];

    // Filter products strictly matching this site
    const matchedProducts = [...(siteProducts || []), ...(clientProducts || [])].filter(p => {
      if (!p) return false;
      if (form.site_id) {
        const sId = p.site_id?._id || p.site_id?.id || p.site_id;
        if (sId && String(sId) === String(form.site_id)) return true;
      }
      if (matchedCert) {
        const certNum = matchedCert.certificate_number;
        const certIdStr = matchedCert._id || matchedCert.id;
        if (p.certificate_id && (p.certificate_id === certNum || String(p.certificate_id) === String(certIdStr))) {
          return true;
        }
      }
      return false;
    });

    const productMap = new Map();

    // 1. Add from matched products
    matchedProducts.forEach(p => {
      const name = p.name?.trim();
      if (name && !productMap.has(name)) {
        productMap.set(name, {
          name,
          code: p.code || p.barcode || ''
        });
      }
    });

    // 2. Add from certificate product_details
    certDetails.forEach(cd => {
      const name = cd.name?.trim();
      if (name) {
        if (!productMap.has(name)) {
          productMap.set(name, {
            name,
            code: cd.code || ''
          });
        } else if (!productMap.get(name).code && cd.code) {
          productMap.get(name).code = cd.code;
        }
      }
    });

    // 3. Add from certificate products_covered
    certCoverage.forEach(rawName => {
      if (typeof rawName === 'string' && rawName.trim()) {
        const name = rawName.trim();
        if (!productMap.has(name)) {
          productMap.set(name, {
            name,
            code: ''
          });
        }
      }
    });

    return Array.from(productMap.values());
  }, [form.site_id, form.certificate_id, certs, siteProducts, clientProducts]);

  const updateProduct = (idx, field, value) => {
    setForm(f => {
      const products = [...f.products];
      products[idx] = { ...products[idx], [field]: value };
      return { ...f, products };
    });
  };

  const handleSelectProduct = (idx, selectedName) => {
    const matched = siteSpecificProducts.find(p => p.name === selectedName);
    setForm(f => {
      const products = [...f.products];
      products[idx] = {
        ...products[idx],
        name: selectedName,
        original_name: selectedName,
        code: matched?.code || ''
      };
      return { ...f, products };
    });
  };

  const addProduct = () => {
    const rowType = getRowTypeForAddonType(addonType);
    setForm(f => ({ ...f, products: [...f.products, emptyProduct(rowType)] }));
  };

  const removeProduct = (idx) => {
    if (form.products.length === 1) return toast.error('At least one product is required.');
    setForm(f => ({ ...f, products: f.products.filter((_, i) => i !== idx) }));
  };

  const handleSiteChange = (selectedSiteId) => {
    // Find if an active certificate exists for this site
    const matchingCert = certs.find(c => {
      const sId = c.site_id?._id || c.site_id?.id || c.site_id;
      return String(sId) === String(selectedSiteId);
    });
    const rowType = getRowTypeForAddonType(addonType);
    setForm(f => ({
      ...f,
      site_id: selectedSiteId,
      certificate_id: matchingCert ? (matchingCert._id || matchingCert.id) : (f.certificate_id || ''),
      // For remove_product, change_ingredients, or change_supplier, reset product picks so client picks from the newly selected site
      products: ['remove_product', 'change_ingredients', 'change_supplier'].includes(addonType)
        ? [emptyProduct(rowType)]
        : f.products
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.site_id && !form.certificate_id) return toast.error('Please select a manufacturing site.');
    if (!form.contact_name?.trim()) return toast.error('Contact Person Name is required.');
    if (!form.contact_phone?.trim()) return toast.error('Contact Person Phone Number is required.');
    if (!form.contact_email?.trim()) return toast.error('Contact Person Email is required.');
    for (const [i, p] of form.products.entries()) {
      if (!p.name?.trim()) return toast.error(`Product row ${i + 1}: Please select or enter a Product Name.`);
      if (!p.type) return toast.error(`Product row ${i + 1}: Type is required.`);
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('addon_type', addonType);
      if (form.site_id) formData.append('site_id', form.site_id);
      if (form.certificate_id) formData.append('certificate_id', form.certificate_id);
      formData.append('contact_name', form.contact_name);
      formData.append('contact_email', form.contact_email);
      if (form.contact_phone) formData.append('contact_phone', form.contact_phone);
      if (form.message) formData.append('message', form.message);
      formData.append('products', JSON.stringify(form.products));

      for (const file of attachments) {
        formData.append('attachments', file);
      }

      await api.post('/api/add-on-applications', formData);
      const title = addonType === 'remove_product'
        ? 'Request to remove product(s)'
        : addonType === 'change_ingredients'
        ? 'Request to change ingredients'
        : addonType === 'change_supplier'
        ? 'Request to change supplier/manufacturer'
        : 'Add-on product application';
      toast.success(`${title} submitted successfully!`);
      setShowForm(false);
      setAttachments([]);
      setForm({
        site_id: sites.length === 1 ? (sites[0].id || sites[0]._id) : '',
        certificate_id: certs.length === 1 ? (certs[0]._id || certs[0].id) : '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        message: '',
        products: [emptyProduct(getRowTypeForAddonType(addonType))]
      });
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

  // Check if client has sites or existing add-on apps
  const hasNoSites = sites.length === 0 && certs.length === 0;
  const hasNoCert = certs.length === 0;

  if (hasNoSites && myApps.length === 0) {
    return (
      <div style={{ maxWidth: 650, margin: '40px auto', padding: '32px', background: 'white', borderRadius: 24, border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <Award size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Register a Site First</h3>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Before submitting an add-on product request, please register your manufacturing site in the portal.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/sites')}>
          <PlusCircle size={15} style={{ marginRight: 6 }} /> Register Site
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
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Add, remove, or modify products covered under your business sites.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* 1st Button: Add Product */}
          <button
            className="btn btn-primary"
            onClick={() => openFormWithType('add_product')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontWeight: 700, background: '#059669', borderColor: '#059669' }}
          >
            <PlusCircle size={16} /> + Add Product
          </button>

          {/* 2nd Button: Delete / Remove Product */}
          <button
            className="btn btn-outline"
            onClick={() => openFormWithType('remove_product')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5', background: '#fff' }}
          >
            <Trash2 size={15} /> Remove Product
          </button>

          {/* 3rd Button: Other Request Dropdown */}
          <div style={{ position: 'relative' }} ref={otherRequestRef}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowOtherRequest(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                fontWeight: 700,
                color: '#0284c7',
                borderColor: showOtherRequest ? '#0284c7' : '#bae6fd',
                background: showOtherRequest ? '#f0f9ff' : '#fff'
              }}
            >
              <FileEdit size={15} /> Other Request <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: showOtherRequest ? 'rotate(180deg)' : 'none' }} />
            </button>

            {showOtherRequest && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: 295,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
                  padding: '6px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowOtherRequest(false);
                    openFormWithType('change_ingredients');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#0284c7', marginTop: 2 }}>
                    <Beaker size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Change Ingredients</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Update recipe formulation (No certificate required)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOtherRequest(false);
                    openFormWithType('change_supplier');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#0284c7', marginTop: 2 }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Change Supplier/Manufacturer</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Update material supplier or facility (No certificate required)</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
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
              Your product request has been submitted and is now in the <strong>Add-on Review Queue</strong>. HFA will review and accept or reject the request, assign a Food Tech specialist, issue you a product approval form to complete, conduct Committee Review, and then update your certificate when approved.
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
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                          {new Date(app.created_at || app.submission_date || app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                        </span>
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
                              <th style={{ padding: '6px 10px', textAlign: 'left' }}>Code</th>
                              <th style={{ padding: '6px 10px', textAlign: 'left' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(app.products || []).map((p, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{p.sn || i + 1}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>
                                  {p.new_name || p.name}
                                  {p.description && (
                                    <div style={{ fontSize: 11, fontWeight: 500, color: '#0284c7', marginTop: 2 }}>
                                      Note: {p.description}
                                    </div>
                                  )}
                                </td>
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
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {addonType === 'remove_product' && <><Trash2 size={18} color="#dc2626" /> Request to Remove Product(s)</>}
                {addonType === 'change_ingredients' && <><Edit size={18} color="#0284c7" /> Request to Change Product Ingredients</>}
                {addonType === 'change_supplier' && <><Building2 size={18} color="#0284c7" /> Request to Change Supplier / Manufacturer</>}
                {addonType === 'add_product' && <><PlusCircle size={18} color="#059669" /> New Add-on Product Application</>}
              </span>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: 28, display: 'grid', gap: 20 }}>
                {/* 1. Site */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>1. Manufacturing Site</div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select Site <span>*</span></label>
                    {sites.length > 0 ? (
                      <select
                        className="form-control"
                        value={form.site_id || ''}
                        onChange={e => handleSiteChange(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Manufacturing Site --</option>
                        {sites.map(s => (
                          <option key={s.id || s._id} value={s.id || s._id}>
                            {s.name} {s.city ? `(${s.city})` : (s.address_1 ? `(${s.address_1})` : '')}
                          </option>
                        ))}
                      </select>
                    ) : certs.length > 0 ? (
                      <select
                        className="form-control"
                        value={form.certificate_id || ''}
                        onChange={e => setForm(f => ({ ...f, certificate_id: e.target.value }))}
                        required
                      >
                        <option value="">-- Choose Site / Certificate --</option>
                        {certs.map(c => (
                          <option key={c._id || c.id} value={c._id || c.id}>{getSiteName(c)}</option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>
                        No sites registered. Please <button type="button" onClick={() => navigate('/sites')} style={{ background: 'none', border: 'none', color: '#0369a1', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}>register a site</button> first.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Contact Person */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>2. Contact Person</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Contact Person Name <span>*</span></label>
                      <input
                        className="form-control"
                        value={form.contact_name}
                        onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                        placeholder="e.g. Jane Smith"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Contact Person Phone Number <span>*</span></label>
                      <input
                        className="form-control"
                        value={form.contact_phone}
                        onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                        placeholder="e.g. +44 7700 900077"
                        required
                      />
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

                  {!form.site_id && !form.certificate_id && (
                    <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12.5, color: '#1e40af', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                      <span>Please select a <strong>Manufacturing Site</strong> in Step 1 above to view the products active at that site.</span>
                    </div>
                  )}

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
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                              Action Type <Lock size={12} color="#64748b" title="Action type is fixed for this request" />
                            </label>
                            <div style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 700,
                              background: p.type === 'Remove product' ? '#fef2f2' : (p.type === 'Change ingredients' || p.type === 'Change supplier/manufacturer') ? '#f0f9ff' : '#f0fdf4',
                              color: p.type === 'Remove product' ? '#991b1b' : (p.type === 'Change ingredients' || p.type === 'Change supplier/manufacturer') ? '#0369a1' : '#166534',
                              border: `1.5px solid ${p.type === 'Remove product' ? '#fecaca' : (p.type === 'Change ingredients' || p.type === 'Change supplier/manufacturer') ? '#bae6fd' : '#bbf7d0'}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              <Lock size={12} />
                              <span>{p.type}</span>
                              <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 500, marginLeft: 'auto' }}>(Fixed)</span>
                            </div>
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
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Code</label>
                                <input
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.code}
                                  onChange={e => updateProduct(idx, 'code', e.target.value)}
                                  placeholder="e.g. CODE-101"
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
                                onChange={e => handleSelectProduct(idx, e.target.value)}
                                disabled={!form.site_id && !form.certificate_id}
                                required
                              >
                                {!form.site_id && !form.certificate_id ? (
                                  <option value="">-- Please select a manufacturing site first --</option>
                                ) : siteSpecificProducts.length === 0 ? (
                                  <option value="">-- No products found for this site --</option>
                                ) : (
                                  <>
                                    <option value="">-- Select Product to Remove ({siteSpecificProducts.length} available at this site) --</option>
                                    {siteSpecificProducts.map(prod => (
                                      <option key={prod.name} value={prod.name}>
                                        {prod.name} {prod.code ? `(${prod.code})` : ''}
                                      </option>
                                    ))}
                                  </>
                                )}
                              </select>
                              {p.code && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                  Product Code: <code>{p.code}</code>
                                </div>
                              )}
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
                                  onChange={e => handleSelectProduct(idx, e.target.value)}
                                  disabled={!form.site_id && !form.certificate_id}
                                  required
                                >
                                  {!form.site_id && !form.certificate_id ? (
                                    <option value="">-- Please select a manufacturing site first --</option>
                                  ) : siteSpecificProducts.length === 0 ? (
                                    <option value="">-- No products found for this site --</option>
                                  ) : (
                                    <>
                                      <option value="">-- Select Existing Product ({siteSpecificProducts.length} available at this site) --</option>
                                      {siteSpecificProducts.map(prod => (
                                        <option key={prod.name} value={prod.name}>
                                          {prod.name} {prod.code ? `(${prod.code})` : ''}
                                        </option>
                                      ))}
                                    </>
                                  )}
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
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: 4 }}>New Code</label>
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

                          {(p.type === 'Change ingredients' || p.type === 'Change supplier/manufacturer') && (
                            <>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Pick Product *</label>
                                <select
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.original_name || p.name || ''}
                                  onChange={e => handleSelectProduct(idx, e.target.value)}
                                  disabled={!form.site_id && !form.certificate_id}
                                  required
                                >
                                  {!form.site_id && !form.certificate_id ? (
                                    <option value="">-- Please select a manufacturing site first --</option>
                                  ) : siteSpecificProducts.length === 0 ? (
                                    <option value="">-- No products found for this site --</option>
                                  ) : (
                                    <>
                                      <option value="">-- Select Product ({siteSpecificProducts.length} available at this site) --</option>
                                      {siteSpecificProducts.map(prod => (
                                        <option key={prod.name} value={prod.name}>
                                          {prod.name} {prod.code ? `(${prod.code})` : ''}
                                        </option>
                                      ))}
                                    </>
                                  )}
                                </select>
                                {p.code && (
                                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                    Product Code: <code>{p.code}</code>
                                  </div>
                                )}
                              </div>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                                  {p.type === 'Change supplier/manufacturer' ? 'Notes / Supplier or Manufacturer Changes' : 'Notes / Ingredient Changes'}
                                </label>
                                <input
                                  className="form-control"
                                  style={{ margin: 0, fontSize: 13 }}
                                  value={p.description || ''}
                                  onChange={e => updateProduct(idx, 'description', e.target.value)}
                                  placeholder={p.type === 'Change supplier/manufacturer' ? 'e.g. New supplier name, manufacturer facility, address & certifications' : 'e.g. Revised oil formulation or changed ingredient supplier'}
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

                {/* 5. Supporting Documents */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      5. Supporting Documents {addonType !== 'add_product' && <span style={{ color: '#0284c7' }}>(Attach As Many As Needed)</span>}
                    </div>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: '#0284c7',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: '#f0f9ff',
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #bae6fd'
                    }}>
                      <UploadCloud size={14} /> Add Documents
                      <input
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={e => {
                          if (e.target.files) {
                            setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                    Upload specifications, recipes, product data sheets, removal authorization letters, or ingredient declarations.
                  </div>

                  {attachments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {attachments.map((file, fIdx) => (
                        <div key={fIdx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <FileText size={14} color="#0284c7" />
                            <span style={{ fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {file.name}
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== fIdx))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      border: '1.5px dashed #cbd5e1',
                      borderRadius: 8,
                      padding: '16px',
                      textAlign: 'center',
                      background: '#fafafa'
                    }}>
                      <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <UploadCloud size={20} color="#94a3b8" />
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Click to select and attach multiple documents</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>PDF, DOCX, XLSX, Images accepted (can attach as many as needed)</span>
                        <input
                          type="file"
                          multiple
                          style={{ display: 'none' }}
                          onChange={e => {
                            if (e.target.files) {
                              setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    background: addonType === 'remove_product' ? '#dc2626' : (addonType === 'change_ingredients' || addonType === 'change_supplier') ? '#0284c7' : '#059669',
                    borderColor: addonType === 'remove_product' ? '#dc2626' : (addonType === 'change_ingredients' || addonType === 'change_supplier') ? '#0284c7' : '#059669'
                  }}
                >
                  {submitting ? 'Submitting...' : addonType === 'remove_product' ? 'Submit Remove Request' : addonType === 'change_ingredients' ? 'Submit Change Ingredients Request' : addonType === 'change_supplier' ? 'Submit Change Supplier/Manufacturer Request' : 'Submit Add-on Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
