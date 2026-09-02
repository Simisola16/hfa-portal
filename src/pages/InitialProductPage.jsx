import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import {
  Package, ShieldCheck, CheckCircle, AlertTriangle, ArrowRight,
  Clock, MapPin, Building2, User, Mail, Phone, FileText, Plus,
  Layers, Lock, Sparkles, HelpCircle, ChevronRight, CheckCircle2,
  FilePlus, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ClientAddInitialProductModal from '../components/ClientAddInitialProductModal';

export default function InitialProductPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [initialProducts, setInitialProducts] = useState([]);
  const [apps, setApps] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAppForModal, setSelectedAppForModal] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [initProdsRes, appsRes] = await Promise.all([
        api.get('/api/initial-products').catch(() => ({ data: { data: [] } })),
        api.get('/api/applications').catch(() => ({ data: [] }))
      ]);

      const loadedInitProds = initProdsRes.data?.data || (Array.isArray(initProdsRes.data) ? initProdsRes.data : []);
      const loadedApps = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : (Array.isArray(appsRes?.data?.data) ? appsRes.data.data : []));

      setInitialProducts(loadedInitProds);
      setApps(loadedApps);
    } catch (err) {
      console.error('Failed to load initial products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const inProgressCount = initialProducts.filter(p => p.status !== 'initial_product_approved').length;
  const approvedCount = initialProducts.filter(p => p.status === 'initial_product_approved').length;

  const eligibleApps = apps.filter(app => {
    const isRenewal = (app.application_type || '').toLowerCase() === 'renewal';
    if (isRenewal) return false;
    const isPaymentPassed = [
      'payment_received', 'initial_payment_received',
      'dates_proposed', 'dates_rejected', 'dates_accepted', 'date_finalized',
      'audit_assigned', 'audit_scheduled', 'auditor_assigned', 'audit_in_progress',
      'audit_successful', 'audit_completed', 'audit_report_submitted',
      'nc_raised', 'nc_closed', 'final_invoice_sent', 'final_invoice_paid',
      'logsheet_created', 'logsheet_signed', 'application_successful',
      'agreement_sent', 'agreement_signed', 'agreement_finalised',
      'ready_for_certificate', 'certificate_issued', 'approved'
    ].includes((app.status || '').toLowerCase().trim());
    const appId = String(app._id || app.id);
    const hasIp = initialProducts.some(ip => {
      const ipAppId = String(ip.application_id?._id || ip.application_id?.id || ip.application_id || '');
      return ipAppId === appId;
    });
    return isPaymentPassed && !hasIp;
  });

  // Auto-open modal if application_id is provided in URL query
  useEffect(() => {
    const targetAppId = searchParams.get('application_id');
    if (targetAppId && apps.length > 0) {
      const targetApp = apps.find(a => String(a._id || a.id) === targetAppId);
      if (targetApp) {
        setSelectedAppForModal(targetApp);
        setShowAddModal(true);
      }
    }
  }, [searchParams, apps]);

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={26} color="#16a34a" /> Initial Products
            </h1>
            <div className="page-subtitle">
              Overview and tracking of primary Initial Products registered with your certification applications
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {eligibleApps.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedAppForModal(eligibleApps[0]);
                  setShowAddModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  borderColor: '#059669',
                  gap: 8,
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(5,150,105,0.25)'
                }}
              >
                <Plus size={16} /> Add Initial Product ({eligibleApps.length})
              </button>
            )}
            <button
              className="btn btn-outline"
              onClick={() => navigate('/initial-products/in-progress')}
              style={{ gap: 8 }}
            >
              <Clock size={16} /> In-Progress Initial Products ({inProgressCount})
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/applications?action=new')}
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                borderColor: '#16a34a',
                gap: 8,
                fontWeight: 700
              }}
            >
              <Plus size={16} /> New Application <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Eligible Application Action Banner ── */}
      {eligibleApps.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
          border: '1.5px solid #86efac',
          borderRadius: 16,
          padding: '18px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 3px 12px rgba(16, 185, 129, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#10b981', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
            }}>
              <Package size={22} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}>
                Action Required: Add Initial Product
                <span style={{ background: '#d1fae5', color: '#047857', padding: '1px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 800 }}>
                  {eligibleApps.length} {eligibleApps.length === 1 ? 'Application' : 'Applications'} Ready
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#047857', marginTop: 2 }}>
                Payment confirmed for <strong>{eligibleApps.map(a => a.establishment_name || a.site_name).join(', ')}</strong>. Register your Initial Product to begin technical evaluation.
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedAppForModal(eligibleApps[0]);
              setShowAddModal(true);
            }}
            style={{
              background: '#059669',
              borderColor: '#059669',
              fontWeight: 800,
              gap: 6,
              padding: '9px 18px'
            }}
          >
            <Plus size={15} /> Add Initial Product Now &rarr;
          </button>
        </div>
      )}

      {/* ── Guidance Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
        border: '1.5px solid #bfdbfe',
        borderRadius: 16,
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        boxShadow: '0 2px 8px rgba(37,99,235,0.06)'
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', flexShrink: 0
        }}>
          <Sparkles size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a8a', marginBottom: 4 }}>
            How Initial Products Work
          </div>
          <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
            Initial Products are <strong>automatically registered when you submit a New Certification Application</strong> (Section E).
            Each initial certification application includes <strong>1 primary product</strong> evaluated directly by HFA Food Technologies.
            Once certified, additional products can be added at any time via <strong>Add-on Products Applications</strong>.
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Initial Products</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{initialProducts.length}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Registered across all applications</div>
        </div>

        <div className="card" style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>In Technical Evaluation</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{inProgressCount}</div>
          <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>Under review by Food Tech staff</div>
        </div>

        <div className="card" style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Initial Products Approved</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{approvedCount}</div>
          <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>Ready / Approved on Certificate</div>
        </div>
      </div>

      {/* ── Registered Initial Products List ── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Registered Initial Products</div>
            <div className="card-subtitle">Products registered with your certification applications</div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchData}
            style={{ color: '#475569' }}
          >
            Refresh
          </button>
        </div>

        <div className="card-body" style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
              Loading initial products...
            </div>
          ) : initialProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <Package size={44} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>No Initial Products Found</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, maxWidth: 460, margin: '6px auto 18px' }}>
                You have not registered any Initial Products yet. Submit a New Certification Application to register your primary product.
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/applications?action=new')}
                style={{ background: '#16a34a', borderColor: '#16a34a', gap: 6 }}
              >
                <Plus size={15} /> Apply for New Certification
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {initialProducts.map(item => {
                const isApproved = item.status === 'initial_product_approved';
                const isFormEnabled = item.status === 'product_approval_form_enabled';
                const appNum = item.application_id?.application_number || `APP-${String(item.application_id?._id || item.application_id || '').slice(-6).toUpperCase()}`;

                return (
                  <div
                    key={item._id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 16,
                      background: isApproved ? '#f0fdf4' : '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                          {item.product?.name || 'Initial Product'}
                        </span>
                        {item.product?.code && (
                          <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 700 }}>
                            SKU: {item.product.code}
                          </span>
                        )}
                        <span style={{
                          background: isApproved ? '#dcfce7' : (isFormEnabled ? '#f3e8ff' : '#eff6ff'),
                          color: isApproved ? '#15803d' : (isFormEnabled ? '#7e22ce' : '#1d4ed8'),
                          borderRadius: 20, padding: '3px 10px', fontSize: 11.5, fontWeight: 800, textTransform: 'capitalize'
                        }}>
                          {(item.status || '').replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={13} color="#94a3b8" /> Application #{appNum}
                        </span>
                        {item.product?.category && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Layers size={13} color="#94a3b8" /> {item.product.category}
                          </span>
                        )}
                        {item.created_at && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={13} color="#94a3b8" /> {new Date(item.created_at).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isFormEnabled && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/initial-products/${item._id}/approval-form`)}
                          style={{
                            background: '#7e22ce',
                            borderColor: '#7e22ce',
                            fontWeight: 700,
                            padding: '7px 14px',
                            gap: 5
                          }}
                        >
                          <FileText size={14} /> Complete Approval Form <ArrowRight size={13} />
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/initial-products/${item._id}/track`)}
                        style={{ fontWeight: 700, padding: '7px 14px', gap: 5 }}
                      >
                        <ExternalLink size={14} /> Track Progress
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Actions / Next Steps ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FilePlus size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Need Certification for a New Site?
              </h3>
            </div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              Submit a new certification application. You will enter your primary initial product directly into Section E of the application form.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/applications?action=new')}
            style={{ marginTop: 16, background: '#16a34a', borderColor: '#16a34a', fontWeight: 700 }}
          >
            Start New Application <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f3ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Adding Products to Existing Site?
              </h3>
            </div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              If your facility is already certified, submit an Add-on Application to add new product lines, recipes, or ingredients to your certificate.
            </div>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/addon-applications')}
            style={{ marginTop: 16, fontWeight: 700, borderColor: '#7e22ce', color: '#7e22ce' }}
          >
            Go to Add-on Applications <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <ClientAddInitialProductModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedAppForModal(null);
        }}
        application={selectedAppForModal}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
