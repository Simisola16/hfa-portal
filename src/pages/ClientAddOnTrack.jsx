import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertCircle, Clock, Package, Download, Eye, ClipboardList, Award, Users, Check, ExternalLink
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getSocket } from '../lib/socket';
import ProductApprovalModal from '../components/ProductApprovalModal';

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
  submitted: 'Submit Add-On',
  accepted: 'Application Accepted',
  rejected: 'Application Rejected',
  ft_assigned: 'Assign FT Food Technologies',
  product_approval_form_enabled: 'Product Form Enabled',
  all_forms_received: 'Product Form Received',
  logsheet_created: 'Under Committee Review',
  waiting_sharia_signature: 'Under Committee Review',
  product_form_approved: 'Product Form Approved',
  ready_for_certificate: 'Ready For Certificate',
  completed: 'Certificate Issued'
};

const STATUS_BADGE = {
  submitted: 'badge-yellow',
  accepted: 'badge-green',
  rejected: 'badge-red',
  ft_assigned: 'badge-blue',
  product_approval_form_enabled: 'badge-purple',
  all_forms_received: 'badge-teal',
  logsheet_created: 'badge-blue',
  waiting_sharia_signature: 'badge-orange',
  product_form_approved: 'badge-green',
  ready_for_certificate: 'badge-teal',
  completed: 'badge-green'
};

const FLOW_STEPS = [
  { id: 'submitted', label: 'Submit Add-On' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'ft_assigned', label: 'Assign FT' },
  { id: 'product_approval_form_enabled', label: 'Product Form Enabled' },
  { id: 'all_forms_received', label: 'Product Form Received' },
  { id: 'product_form_approved', label: 'Product Form Approved' },
  { id: 'ready_for_certificate', label: 'Ready for Cert' },
  { id: 'completed', label: 'Certificate' }
];

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

export default function ClientAddOnTrack() {
  const { addonId } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewProductModal, setViewProductModal] = useState({ isOpen: false, formData: null, product: null, company: null });

  const fetchApp = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get(`/api/add-on-applications/${addonId}`);
      setApp(res.data?.data || res.data);
    } catch (err) {
      toast.error('Failed to load add-on application details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addonId]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  // Real-time status update listener
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    const handleAddOnUpdate = (data) => {
      const incomingId = data.addOnId || data.addon_id || data._id;
      if (String(incomingId) === String(addonId)) {
        fetchApp(true);
      }
    };

    socket.on('addon_updated', handleAddOnUpdate);
    return () => { socket.off('addon_updated', handleAddOnUpdate); };
  }, [addonId, fetchApp]);

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Add-on Application Not Found</h3>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>The requested add-on application could not be found or you do not have permission to view it.</p>
        <button className="btn btn-primary" onClick={() => navigate('/addon-applications')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back to Add-on Applications
        </button>
      </div>
    );
  }

  const currentIdx = getClientStepIdx(app.status);

  // Map status history for step timestamps and notes
  const historyMap = {};
  if (app.statusHistory && Array.isArray(app.statusHistory)) {
    app.statusHistory.forEach(h => {
      historyMap[h.status] = h;
    });
  }

  const certNo = app.certificate_id?.certificate_number || (app.application_id?.application_number ? `App: ${app.application_id.application_number}` : '—');
  const siteName = app.site_id?.site_name || app.certificate_id?.site_name || app.client_id?.company_name || 'Your Facility';
  const statusLabel = STATUS_LABELS[app.status] || app.status?.replace(/_/g, ' ');
  const badgeClass = STATUS_BADGE[app.status] || 'badge-gray';

  const ftNames = (() => {
    const arr = app.assigned_food_techs || [];
    if (arr.length > 0) return arr.map(ft => ft.full_name || ft).join(', ');
    if (app.assigned_food_tech?.full_name) return app.assigned_food_tech.full_name;
    return null;
  })();

  const productsList = app.products || [];
  const responses = app.product_approval_form?.product_responses || [];
  const savedCount = productsList.filter((_, idx) => responses.some(r => r.product_index === idx && r.is_saved)).length;
  const isFormEnabled = app.status === 'product_approval_form_enabled' || responses.length > 0;

  return (
    <div className="page-content">
      {/* ─── Top Header Section matching Admin Processing ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/addon-applications')}>
          <ArrowLeft size={16} /> Back to Add-on Applications
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 2 }}>
            Add-On Application Tracking
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {siteName}
            </h1>
            <span className={`badge ${badgeClass}`} style={{ fontSize: 12 }}>
              {statusLabel}
            </span>
            {refreshing && <RefreshCw size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Certificate: <strong>{certNo}</strong> &middot; Contact: <strong>{app.contact_name}</strong> ({app.contact_email}) &middot; Submitted {new Date(app.createdAt || app.created_at).toLocaleDateString('en-GB')}
            {ftNames && <> &middot; FT Specialist: <strong style={{ color: '#2563eb' }}>{ftNames}</strong></>}
          </div>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={() => fetchApp(true)} title="Refresh Application">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ─── Top Action / Notification Banner matching Admin ─── */}
      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: 16,
        padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
            {app.status === 'product_approval_form_enabled' ? 'Action Required From You' : 'Current Application Status'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {app.status === 'submitted' && 'Your add-on request has been submitted. HFA Food Technology specialists will review the requested products.'}
            {app.status === 'accepted' && 'Application accepted. HFA is assigning Food Technologies staff to verify your product formulations.'}
            {app.status === 'ft_assigned' && `Food Technology staff assigned (${ftNames || 'Inspector'}). Awaiting Product Approval Form setup.`}
            {app.status === 'product_approval_form_enabled' && 'The Product Approval Form has been enabled! Please complete and submit the specifications for each requested product.'}
            {app.status === 'all_forms_received' && 'All product forms have been received. The Halal Committee is preparing the evaluation logsheet.'}
            {['logsheet_created', 'waiting_sharia_signature'].includes(app.status) && 'Technical & Shariah Committee evaluation is currently underway.'}
            {['product_form_approved', 'ready_for_certificate'].includes(app.status) && 'Product specifications approved by the Shariah Committee! Your updated certificate is being prepared.'}
            {app.status === 'completed' && 'Add-on application complete! Your Halal Certificate products list has been successfully updated.'}
            {app.status === 'rejected' && (app.rejection_reason ? `Application Rejected: ${app.rejection_reason}` : 'Application rejected by administration.')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {app.status === 'product_approval_form_enabled' && (
            <button
              className="btn btn-primary"
              style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => navigate(`/addon-applications/${app._id}/approval-form`)}
            >
              <FileText size={15} /> Complete Product Approval Form
            </button>
          )}

          {app.status === 'completed' && (
            <button
              className="btn btn-primary"
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => navigate('/certificates')}
            >
              <Award size={15} /> View Certificates
            </button>
          )}
        </div>
      </div>

      {/* ─── Main 2-Column Grid (1fr 380px) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        
        {/* ── LEFT COLUMN: Content Cards Stack ── */}
        <div style={{ display: 'grid', gap: 20 }}>
          
          {/* Card 1: Requested Products Table */}
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} style={{ color: '#1d4ed8' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    Requested Products ({productsList.length})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Multi-Product Request Table for Certificate Endorsement
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', width: 50, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>S/N</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Product Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Product Code</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Action Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Specifications Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsList.map((p, idx) => {
                      const resp = responses.find(r => r.product_index === idx);
                      const isSaved = resp?.is_saved;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#94a3b8' }}>{p.sn || idx + 1}</td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{p.new_name || p.name}</td>
                          <td style={{ padding: '12px', color: '#64748b' }}>{p.new_code || p.code || '—'}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 6, fontWeight: 700,
                              background: p.type === 'Add product' ? '#f0fdf4' : p.type === 'Remove product' ? '#fef2f2' : '#f0f9ff',
                              color: p.type === 'Add product' ? '#166534' : p.type === 'Remove product' ? '#991b1b' : '#0369a1',
                              border: p.type === 'Add product' ? '1px solid #bbf7d0' : p.type === 'Remove product' ? '1px solid #fecaca' : '1px solid #bae6fd'
                            }}>
                              {p.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {isSaved ? (
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                  background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                                  fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                                  display: 'inline-flex', alignItems: 'center', gap: 4
                                }}
                                onClick={() => setViewProductModal({
                                  isOpen: true,
                                  formData: resp.form_data && Object.keys(resp.form_data).length > 0 ? resp.form_data : {
                                    product_name: p.new_name || p.name,
                                    product_code: p.new_code || p.code,
                                    company_name_address: app.client_id?.company_name
                                  },
                                  product: p,
                                  company: app.client_id
                                })}
                              >
                                <Eye size={12} /> View Filled Form
                              </button>
                            ) : app.status === 'product_approval_form_enabled' ? (
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                  background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe',
                                  fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 6
                                }}
                                onClick={() => navigate(`/addon-applications/${app._id}/approval-form/${idx}`)}
                              >
                                Fill Specification &rarr;
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Pending Form Step</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 2: Product Approval Form Status */}
          {isFormEnabled && (
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} style={{ color: '#7c3aed' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                      Product Approval Form Details
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Specifications, ingredient breakdowns &amp; submission records
                    </div>
                  </div>
                </div>

                <span className={`badge ${savedCount === productsList.length && productsList.length > 0 ? 'badge-green' : 'badge-purple'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                  {savedCount} of {productsList.length} PRODUCTS COMPLETED
                </span>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* Admin Form instructions if provided */}
                {(app.product_approval_form?.form_text || app.product_approval_form?.form_file_url) && (
                  <div style={{ marginBottom: 20, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                      Instructions from HFA Food Technology Team
                    </div>
                    {app.product_approval_form.form_file_url && (
                      <a href={getPdfUrl(app.product_approval_form.form_file_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, background: 'white' }}>
                        <Download size={14} /> Download Reference Document
                      </a>
                    )}
                    {app.product_approval_form.form_text && (
                      <div style={{ background: 'white', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {app.product_approval_form.form_text}
                      </div>
                    )}
                  </div>
                )}

                {/* Per product response cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {productsList.map((p, idx) => {
                    const resp = responses.find(r => r.product_index === idx);
                    const isSaved = resp?.is_saved;

                    return (
                      <div key={idx} style={{ padding: 14, borderRadius: 10, background: isSaved ? '#f0fdf4' : '#fafbfc', border: isSaved ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                            Product #{idx + 1}: {p.new_name || p.name} {p.code ? `(${p.code})` : ''}
                          </div>
                          {isSaved ? (
                            <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 700 }}>
                              <Check size={11} style={{ marginRight: 2 }} /> SPECIFICATIONS SUBMITTED
                            </span>
                          ) : (
                            <span className="badge badge-gray" style={{ fontSize: 10, fontWeight: 700 }}>
                              AWAITING SUBMISSION
                            </span>
                          )}
                        </div>

                        {isSaved ? (
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ background: '#164e63', borderColor: '#164e63', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 11.5 }}
                              onClick={() => setViewProductModal({
                                isOpen: true,
                                formData: resp.form_data && Object.keys(resp.form_data).length > 0 ? resp.form_data : {
                                  product_name: p.new_name || p.name,
                                  product_code: p.new_code || p.code,
                                  company_name_address: app.client_id?.company_name
                                },
                                product: p,
                                company: app.client_id
                              })}
                            >
                              <Eye size={13} /> View Submitted Specification Form
                            </button>

                            {resp.response_url && (
                              <a href={getPdfUrl(resp.response_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', fontSize: 11.5 }}>
                                <Download size={13} /> Attached PDF
                              </a>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ fontSize: 12, color: '#64748b' }}>Please complete the form specifications for this product.</div>
                            {app.status === 'product_approval_form_enabled' && (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ background: '#7c3aed', borderColor: '#7c3aed', fontSize: 11.5, fontWeight: 700 }}
                                onClick={() => navigate(`/addon-applications/${app._id}/approval-form/${idx}`)}
                              >
                                Fill Form &rarr;
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Halal Committee Evaluation Status */}
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={18} style={{ color: '#0d9488' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    Halal Committee Evaluation &amp; Endorsement
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Technical review, formulation assessment &amp; Shariah Committee decision
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {['logsheet_created', 'waiting_sharia_signature'].includes(app.status) ? (
                <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', padding: '16px 20px', borderRadius: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Committee Review In Progress
                  </div>
                  <div style={{ fontSize: 13, color: '#134e4a', marginTop: 4, lineHeight: 1.5 }}>
                    The Halal Committee and Shariah Board members are reviewing your product specifications and logsheet. You will receive an automated notification once endorsed.
                  </div>
                </div>
              ) : ['product_form_approved', 'ready_for_certificate', 'completed'].includes(app.status) ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px 20px', borderRadius: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ✓ Approved &amp; Endorsed
                  </div>
                  <div style={{ fontSize: 13, color: '#14532d', marginTop: 4, lineHeight: 1.5 }}>
                    The Halal Committee and Shariah Board have formally approved the requested products for inclusion on your certificate.
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '20px', borderRadius: 12, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  Committee evaluation and logsheet endorsement will commence once product specifications are received.
                </div>
              )}
            </div>
          </div>

          {/* Client Notes & Feedback */}
          {(app.message || app.rejection_reason) && (
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Application Notes</div>
              {app.message && (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>
                  <strong>Client Message:</strong> {app.message}
                </div>
              )}
              {app.rejection_reason && (
                <div style={{ marginTop: 12, background: '#fef2f2', padding: 14, borderRadius: 10, border: '1px solid #fecaca', color: '#991b1b', fontSize: 13 }}>
                  <strong>Rejection Reason:</strong> {app.rejection_reason}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN: Sidebar (Timeline & Site Info) ── */}
        <div>
          
          {/* Stepper Timeline Card matching Admin Processing */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Processing Timeline</div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <div style={{ padding: '8px 0' }}>
                {FLOW_STEPS.map((step, idx) => {
                  const stepIdx = ORDER.indexOf(step.id);
                  const isDone = currentIdx > stepIdx || app.status === 'completed';
                  const isCurrent = currentIdx === stepIdx && app.status !== 'completed';
                  const isLast = idx === FLOW_STEPS.length - 1;
                  const histEntry = historyMap[step.id];

                  let circleColor = isDone ? '#15803d' : isCurrent ? '#2563eb' : '#cbd5e1';
                  let labelColor = isDone ? '#0f172a' : isCurrent ? '#0f172a' : '#94a3b8';

                  return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                      {/* Left: circle + vertical line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32,
                          borderRadius: '50%',
                          background: isDone ? '#15803d' : isCurrent ? '#2563eb' : '#f1f5f9',
                          border: isCurrent ? `3px solid #2563eb` : `2px solid ${isDone ? '#15803d' : '#e2e8f0'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isCurrent ? `0 0 0 4px rgba(37, 99, 235, 0.18)` : 'none',
                          position: 'relative',
                          zIndex: 1,
                        }}>
                          {isDone ? (
                            <CheckCircle size={16} color="white" strokeWidth={2.5} />
                          ) : isCurrent ? (
                            <div style={{
                              width: 12, height: 12, borderRadius: '50%',
                              background: 'white',
                              animation: 'pulse 1.5s ease-in-out infinite',
                            }} />
                          ) : (
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#cbd5e1' }} />
                          )}
                        </div>
                        {!isLast && (
                          <div style={{
                            width: 2,
                            flex: 1,
                            minHeight: 40,
                            background: isDone ? '#86efac' : '#e2e8f0',
                            margin: '2px 0',
                          }} />
                        )}
                      </div>

                      {/* Right: content */}
                      <div style={{
                        marginLeft: 12,
                        paddingBottom: isLast ? 0 : 24,
                        flex: 1,
                        paddingTop: 4,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 13,
                            fontWeight: isCurrent ? 800 : isDone ? 700 : 500,
                            color: labelColor,
                          }}>
                            {step.label}
                          </span>
                          {isCurrent && (
                            <span className="badge badge-blue" style={{ fontSize: 9, padding: '2px 6px', fontWeight: 800 }}>
                              CURRENT
                            </span>
                          )}
                          {isDone && (
                            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                              ✓
                            </span>
                          )}
                        </div>

                        {histEntry?.changedAt && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {new Date(histEntry.changedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}

                        {histEntry?.note && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                            {histEntry.note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Site & Contact Information Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Facility &amp; Contact Information</div>
            </div>
            <div className="card-body" style={{ padding: '16px 20px', fontSize: 13 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Facility / Site</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{siteName}</div>
                {app.site_id?.address && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{app.site_id.address}</div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Contact Person</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{app.contact_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{app.contact_email}</div>
                {app.contact_phone && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{app.contact_phone}</div>}
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Certificate Reference</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{certNo}</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── View Filled Form Modal ── */}
      <ProductApprovalModal
        isOpen={viewProductModal.isOpen}
        onClose={() => setViewProductModal({ isOpen: false, formData: null, product: null, company: null })}
        formData={viewProductModal.formData}
        product={viewProductModal.product}
        company={viewProductModal.company}
      />
    </div>
  );
}
