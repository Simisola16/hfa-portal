import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Package, ShieldCheck, CheckCircle, AlertTriangle, ArrowRight,
  Clock, MapPin, Building2, User, Mail, Phone, FileText, Plus,
  Layers, Lock, Sparkles, HelpCircle, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function InitialProductPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [eligibleApps, setEligibleApps] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [existingInitialProducts, setExistingInitialProducts] = useState([]);

  const [selectedAppId, setSelectedAppId] = useState('');
  const [contactName, setContactName] = useState(user?.full_name || user?.company_name || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [message, setMessage] = useState('');

  // Strictly ONE single Initial Product
  const [product, setProduct] = useState({
    name: '',
    code: '',
    category: '',
    ingredients: '',
    description: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eligibleRes, allAppsRes, initProdsRes] = await Promise.all([
        api.get('/api/initial-products/eligible-applications').catch(() => ({ data: { data: [] } })),
        api.get('/api/applications').catch(() => ({ data: [] })),
        api.get('/api/initial-products').catch(() => ({ data: { data: [] } }))
      ]);

      const eligibleList = eligibleRes.data?.data || (Array.isArray(eligibleRes.data) ? eligibleRes.data : []);
      const loadedAllApps = Array.isArray(allAppsRes) ? allAppsRes : (Array.isArray(allAppsRes?.data) ? allAppsRes.data : (Array.isArray(allAppsRes?.data?.data) ? allAppsRes.data.data : []));
      const loadedInitProds = initProdsRes.data?.data || (Array.isArray(initProdsRes.data) ? initProdsRes.data : []);

      const existingAppIds = new Set(loadedInitProds.map(p => String(p.application_id?._id || p.application_id)));

      const VALID_PAID_STATUSES = [
        'payment_received', 'initial_payment_received',
        'dates_proposed', 'dates_rejected', 'dates_accepted', 'date_finalized',
        'audit_assigned', 'audit_scheduled', 'auditor_assigned', 'audit_in_progress',
        'audit_successful', 'audit_completed', 'audit_report_submitted',
        'nc_raised', 'nc_closed', 'final_invoice_sent', 'final_invoice_paid',
        'logsheet_created', 'logsheet_signed', 'application_successful',
        'agreement_sent', 'agreement_signed', 'agreement_finalised',
        'ready_for_certificate', 'certificate_issued', 'approved'
      ];

      // Merge backend eligible list with any validly paid apps from allApps
      const combinedMap = new Map();

      // First add backend eligible apps
      eligibleList.forEach(app => {
        combinedMap.set(String(app._id), app);
      });

      // Next evaluate all loaded apps
      loadedAllApps.forEach(app => {
        const appKey = String(app._id);
        const hasInit = existingAppIds.has(appKey);
        const isPaidStatus = VALID_PAID_STATUSES.includes(app.status?.toLowerCase());

        if (combinedMap.has(appKey)) {
          const existingItem = combinedMap.get(appKey);
          combinedMap.set(appKey, {
            ...existingItem,
            isInvoiceConfirmed: existingItem.isInvoiceConfirmed || isPaidStatus,
            hasInitialProduct: hasInit,
            isEligible: (existingItem.isInvoiceConfirmed || isPaidStatus) && !hasInit
          });
        } else if (app.status !== 'rejected' && app.status !== 'on_hold') {
          combinedMap.set(appKey, {
            ...app,
            isInvoiceConfirmed: isPaidStatus,
            hasInitialProduct: hasInit,
            isEligible: isPaidStatus && !hasInit
          });
        }
      });

      const finalEligibleList = Array.from(combinedMap.values());

      setEligibleApps(finalEligibleList);
      setAllApps(loadedAllApps);
      setExistingInitialProducts(loadedInitProds);

      // Check URL query param first (e.g. ?application_id=...)
      const queryAppId = searchParams.get('application_id') || searchParams.get('appId');
      if (queryAppId && finalEligibleList.some(a => String(a._id) === String(queryAppId))) {
        setSelectedAppId(queryAppId);
        const qApp = finalEligibleList.find(a => String(a._id) === String(queryAppId));
        if (qApp?.category && !product.category) {
          setProduct(p => ({ ...p, category: qApp.category }));
        }
      } else {
        // Auto-select first eligible application
        const firstAvailable = finalEligibleList.find(a => a.isEligible);
        if (firstAvailable) {
          setSelectedAppId(firstAvailable._id);
          if (firstAvailable.category && !product.category) {
            setProduct(p => ({ ...p, category: firstAvailable.category }));
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load certification application details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, searchParams]);

  const selectedApp = eligibleApps.find(a => String(a._id) === String(selectedAppId)) ||
    allApps.find(a => String(a._id) === String(selectedAppId));

  const handleAppChange = (appId) => {
    setSelectedAppId(appId);
    const app = eligibleApps.find(a => String(a._id) === String(appId)) ||
      allApps.find(a => String(a._id) === String(appId));
    if (app && app.category) {
      setProduct(p => ({ ...p, category: app.category }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppId) {
      return toast.error('Please select an application.');
    }
    if (!contactName.trim()) {
      return toast.error('Contact Person Name is required.');
    }
    if (!contactEmail.trim()) {
      return toast.error('Contact Person Email is required.');
    }
    if (!product.name.trim()) {
      return toast.error('Initial Product Name is required.');
    }

    setSubmitting(true);
    try {
      const payload = {
        application_id: selectedAppId,
        site_id: selectedApp?.site_id?._id || selectedApp?.site_id || undefined,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        message: message.trim(),
        product: {
          name: product.name.trim(),
          code: product.code.trim(),
          category: product.category.trim(),
          ingredients: product.ingredients.trim(),
          description: product.description.trim()
        }
      };

      const res = await api.post('/api/initial-products', payload);
      const created = res.data?.data || res.data;
      toast.success('🎉 Initial Product submitted successfully! Our Food Technologies team will be assigned directly.');
      navigate(`/initial-products/${created._id}/track`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit Initial Product');
    } finally {
      setSubmitting(false);
    }
  };

  const hasEligible = eligibleApps.some(a => a.isEligible);
  const inProgressCount = existingInitialProducts.filter(p => p.status !== 'initial_product_approved').length;

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Loading Initial Product Registration...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} style={{ color: '#059669' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Initial Product Registration
              </h1>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Register your 1 primary Initial Product for Halal evaluation after Initial Invoice confirmation
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/initial-products/in-progress')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13 }}
          >
            <Clock size={15} style={{ color: '#0284c7' }} />
            In-Progress Initial Products
            {inProgressCount > 0 && (
              <span style={{ background: '#0284c7', color: '#fff', fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 10 }}>
                {inProgressCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* When NO applications are eligible yet */}
      {!hasEligible ? (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '40px 32px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#fffbeb', border: '2px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', color: '#d97706' }}>
            <Lock size={32} />
          </div>
          <h3 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            Initial Product Submission Locked
          </h3>
          <p style={{ fontSize: 13.5, color: '#64748b', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Initial Product registration unlocks <strong>after your Initial Certification Invoice has been confirmed</strong> by HFA. Once your payment is verified, you will be invited to add your 1 primary Initial Product.
          </p>

          {existingInitialProducts.length > 0 && (
            <div style={{ marginBottom: 24, padding: '16px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, maxWidth: 540, margin: '0 auto 24px', textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} /> You have {existingInitialProducts.length} registered Initial Product(s)
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 12 }}>
                Track your active Initial Product submissions, upload formulation documents, and monitor approval milestones.
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/initial-products/in-progress')}
                style={{ background: '#059669', borderColor: '#059669' }}
              >
                View In-Progress Initial Products <ArrowRight size={14} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/invoices')}
              style={{ fontWeight: 700 }}
            >
              View Invoices &amp; Payments
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/applications')}
              style={{ background: '#065f46', borderColor: '#065f46', fontWeight: 700 }}
            >
              Go to Applications
            </button>
          </div>
        </div>
      ) : (
        /* When Eligible: Show Initial Product Form */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Policy Banner */}
          <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', border: '1.5px solid #a7f3d0', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Single Initial Product Policy
              </div>
              <div style={{ fontSize: 13, color: '#334155', marginTop: 2, lineHeight: 1.5 }}>
                You must register <strong>strictly 1 product</strong> as your Initial Product under your confirmed application. This product is reviewed directly by our Food Technologies staff. Additional products can be added after initial certification via <strong>Add-on Products</strong>.
              </div>
            </div>
          </div>

          {/* Section 1: Application & Site Selection */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} style={{ color: '#059669' }} />
              1. Select Confirmed Certification Application <span style={{ color: '#dc2626' }}>*</span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <select
                className="form-control"
                value={selectedAppId}
                onChange={e => handleAppChange(e.target.value)}
                required
                style={{ fontSize: 14, fontWeight: 700, padding: '12px 14px', borderRadius: 10, color: '#0f172a' }}
              >
                <option value="">-- Choose Confirmed Application --</option>
                {eligibleApps.map(app => {
                  const siteName = app.site_name || app.establishment_name || app.site_id?.name || 'Manufacturing Facility';
                  return (
                    <option key={app._id} value={app._id} disabled={!app.isEligible}>
                      #{app.application_number} &bull; {siteName} ({app.category || 'Annual Certification'}) {app.isEligible ? '— [Invoice Confirmed ✅]' : (app.hasInitialProduct ? '— [Initial Product Already Submitted]' : '— [Invoice Pending Confirmation]')}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedApp && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#475569' }}>
                  <MapPin size={14} style={{ color: '#059669' }} />
                  <span>Facility: <strong>{selectedApp.site_name || selectedApp.establishment_name || selectedApp.site_id?.name || 'Main Facility'}</strong></span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                  ✓ Invoice Confirmed — Ready for Initial Product
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Contact Person Details */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} style={{ color: '#059669' }} />
              2. Technical Contact Person
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dr. Jane Smith"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>Email Address <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="contact@company.com"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>Phone / Mobile Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+44 7700 900077"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Initial Product Table (Matching Exact Layout) */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                Initial Product Details
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#065f46', background: '#ecfdf5', padding: '3px 9px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                1 Initial Product Limit
              </span>
            </div>

            <div style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: 48, padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>PRODUCT NAME *</th>
                    <th style={{ width: 260, padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>CODE</th>
                    <th style={{ width: 50, padding: '12px 16px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#64748b' }}>
                      1
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Product Name (e.g. Halal Whole Chicken)"
                        value={product.name}
                        onChange={e => setProduct({ ...product, name: e.target.value })}
                        required
                        style={{ margin: 0, fontSize: 13.5, padding: '10px 14px', borderRadius: 8 }}
                      />
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Code (e.g. PRD-001)"
                        value={product.code}
                        onChange={e => setProduct({ ...product, code: e.target.value })}
                        style={{ margin: 0, fontSize: 13.5, padding: '10px 14px', borderRadius: 8 }}
                      />
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setProduct({ ...product, name: '', code: '' })}
                        title="Clear fields"
                        style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          width: 32,
                          height: 32,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Action Bar */}
              <div style={{ padding: '14px 20px', background: '#fff', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => toast('Initial Product registration is strictly limited to 1 primary product. Additional products can be added after certification via Add-on Products.', { icon: 'ℹ️' })}
                  style={{
                    background: '#fff',
                    border: '1.5px solid #059669',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: '#059669',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Plus size={14} /> Add Another Product
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Optional Message */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 24px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>
                Additional Notes / Message for HFA Food Technologies Specialist <span style={{ fontSize: 11, color: '#64748b' }}>(Optional)</span>
              </label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Any special remarks or timing preferences for your product approval review..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/applications')}
              style={{ fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !selectedAppId || !product.name.trim()}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderColor: '#059669',
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(5,150,105,0.3)'
              }}
            >
              {submitting ? <span className="spinner-white" /> : <><ShieldCheck size={18} /> Submit Initial Product for FT Review</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
