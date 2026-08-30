import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertCircle, Clock, Package, Download, Eye, ClipboardList,
  Award, Users, Check, ExternalLink, Sparkles, ShieldCheck
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getSocket } from '../lib/socket';
import InitialProductTimeline, { INITIAL_PRODUCT_STAGES, INITIAL_PRODUCT_ORDER } from '../components/InitialProductTimeline';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
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

const STATUS_LABELS = {
  submitted: 'Initial Product Submitted',
  ft_assigned: 'Assign FT',
  product_approval_form_enabled: 'Product Form Enabled',
  all_forms_received: 'Product Form Received',
  logsheet_created: 'Create Logsheet',
  waiting_sharia_signature: 'Committee Signature',
  initial_product_approved: 'Initial Product Approved'
};

export default function ClientInitialProductTrack() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApp = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get(`/api/initial-products/${id}`);
      setApp(res.data?.data || res.data);
    } catch (err) {
      toast.error('Failed to load initial product details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  // Realtime Socket listener
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    const socket = getSocket(token);
    if (!socket) return;

    const handleUpdate = (payload) => {
      if (payload && String(payload.id) === String(id)) {
        fetchApp(true);
      }
    };

    socket.on('initial_product_updated', handleUpdate);
    return () => {
      socket.off('initial_product_updated', handleUpdate);
    };
  }, [id, fetchApp]);

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Loading Initial Product Details...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
        <h3>Initial Product Not Found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/initial-products/in-progress')} style={{ marginTop: 12 }}>
          Back to Initial Products
        </button>
      </div>
    );
  }

  const isApproved = app.status === 'initial_product_approved';
  const siteName = app.site_id?.name || app.application_id?.site_name || app.application_id?.establishment_name || 'Main Facility';
  const ftNames = [
    ...(app.assigned_food_techs || []).map(ft => ft.full_name || ft.email),
    app.assigned_ft_custom?.name || app.assigned_ft_details
  ].filter(Boolean);

  const formResp = app.product_approval_form?.product_response;
  const isFormEnabled = ['product_approval_form_enabled', 'all_forms_received', 'logsheet_created', 'waiting_sharia_signature', 'initial_product_approved'].includes(app.status);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/initial-products/in-progress')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <ArrowLeft size={16} /> Back to In-Progress List
        </button>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => fetchApp(true)}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Header Card */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: isApproved ? '#dcfce7' : '#ecfdf5', border: `1.5px solid ${isApproved ? '#86efac' : '#a7f3d0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={28} style={{ color: isApproved ? '#16a34a' : '#059669' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  {app.product?.name}
                </h1>
                {app.product?.code && (
                  <span style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: '#475569' }}>
                    {app.product.code}
                  </span>
                )}
                <span style={{ fontSize: 12, background: isApproved ? '#dcfce7' : '#f0fdf4', color: isApproved ? '#166534' : '#065f46', border: `1px solid ${isApproved ? '#bbf7d0' : '#a7f3d0'}`, padding: '3px 10px', borderRadius: 20, fontWeight: 800 }}>
                  {isApproved ? 'Initial Product Approved 🎉' : STATUS_LABELS[app.status] || app.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={14} style={{ color: '#059669' }} />
                  Facility: <strong>{siteName}</strong>
                </span>
                {app.application_id?.application_number && (
                  <span>Application: <strong>#{app.application_id.application_number}</strong></span>
                )}
                <span>Submitted: <strong>{new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
              </div>
            </div>
          </div>

          {/* Action prompt if form is enabled */}
          {app.status === 'product_approval_form_enabled' && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/initial-products/${app._id}/approval-form`)}
              style={{ background: 'linear-gradient(135deg, #7e22ce 0%, #9333ea 100%)', borderColor: '#7e22ce', fontWeight: 800, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FileText size={16} /> Complete Product Approval Form &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Celebratory Approved Banner (stops at Initial Product Approved without cert) */}
      {isApproved && (
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '2px solid #86efac', borderRadius: 18, padding: '22px 26px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
            <Sparkles size={26} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#14532d' }}>
              Initial Product Approved by Halal Food Authority! 🎉
            </div>
            <div style={{ fontSize: 13, color: '#166534', marginTop: 3, lineHeight: 1.5 }}>
              Your Initial Product (<strong>{app.product?.name}</strong>) has successfully passed all technical assessments and Shari'a committee reviews. The product is now verified and active in your certified Product Management list.
            </div>
          </div>
        </div>
      )}

      {/* ─── Main 2-Column Grid Layout (1fr 360px) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        
        {/* ── LEFT COLUMN: Product & Technical Evaluation Cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Product Specifications */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} style={{ color: '#059669' }} /> Product Specifications
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Product Name</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{app.product?.name}</div>
              </div>

              {app.product?.code && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Product Code</div>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}><code>{app.product.code}</code></div>
                </div>
              )}

              {app.product?.category && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Category / Line</div>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{app.product.category}</div>
                </div>
              )}

              {app.product?.ingredients && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Key Ingredients</div>
                  <div style={{ fontSize: 12.5, color: '#334155', marginTop: 2, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', lineHeight: 1.4 }}>
                    {app.product.ingredients}
                  </div>
                </div>
              )}

              {app.product?.description && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Description &amp; Processing</div>
                  <div style={{ fontSize: 12.5, color: '#334155', marginTop: 2, lineHeight: 1.4 }}>
                    {app.product.description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Staff & Technical Evaluation */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} style={{ color: '#0284c7' }} /> Technical Evaluation &amp; Staff
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 16px', background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#0369a1' }}>
                  Assigned Food Technologists
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0c4a6e', marginTop: 4 }}>
                  {ftNames.length > 0 ? ftNames.join(', ') : 'Direct FT assignment in progress...'}
                </div>
              </div>

              {/* Product Approval Form Status */}
              <div style={{ padding: '14px 16px', background: '#fafafa', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                  Product Approval Form
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isFormEnabled ? '#166534' : '#64748b', marginTop: 4 }}>
                  {formResp?.is_saved
                    ? '✓ Form completed and submitted for committee evaluation'
                    : app.status === 'product_approval_form_enabled'
                    ? '⚠️ Form enabled — Awaiting your submission'
                    : 'Pending FT preparation...'}
                </div>

                {app.product_approval_form?.form_file_url && (
                  <a
                    href={getPdfUrl(app.product_approval_form.form_file_url)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#0284c7', marginTop: 8 }}
                  >
                    <Download size={13} /> Download Admin Reference PDF
                  </a>
                )}

                {isFormEnabled && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate(`/initial-products/${app._id}/approval-form`)}
                      style={{ fontSize: 12, fontWeight: 700 }}
                    >
                      {formResp?.is_saved ? 'View Submitted Form' : 'Complete Form Now →'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Sidebar (Initial Product Lifecycle Stages Timeline) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Card: Initial Product Lifecycle Stages */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '24px 22px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              Initial Product Lifecycle Stages
            </div>

            <InitialProductTimeline
              status={app.status}
              statusHistory={app.statusHistory}
              app={app}
            />
          </div>

          {/* Card: Facility Information */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 12 }}>
              Facility &amp; Application
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Facility</div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={13} style={{ color: '#059669' }} /> {siteName}
                </div>
              </div>

              {app.application_id?.application_number && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Application Reference</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>#{app.application_id.application_number}</div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
