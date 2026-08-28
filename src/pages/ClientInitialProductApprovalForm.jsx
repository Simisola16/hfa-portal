import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, CheckCircle, Clock, AlertCircle,
  Package, ShieldCheck, Download, Save, Send, RefreshCw, UploadCloud
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ProductApprovalRequestForm, { INITIAL_PRODUCT_APPROVAL_FORM } from '../components/ProductApprovalRequestForm';

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

export default function ClientInitialProductApprovalForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState(INITIAL_PRODUCT_APPROVAL_FORM);
  const [file, setFile] = useState(null);
  const [responseText, setResponseText] = useState('');

  // Info request / Reply state
  const [replyText, setReplyText] = useState('');
  const [replyFile, setReplyFile] = useState(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchApp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/initial-products/${id}`);
      const loaded = res.data?.data || res.data;
      setApp(loaded);

      const resp = loaded?.product_approval_form?.product_response;
      if (resp?.form_data && Object.keys(resp.form_data).length > 0) {
        setFormData({
          ...INITIAL_PRODUCT_APPROVAL_FORM,
          ...resp.form_data
        });
      } else if (loaded) {
        // Pre-fill with available initial product info
        setFormData(f => ({
          ...f,
          company_name_address: loaded.client_id?.company_name || loaded.client_id?.full_name || '',
          product_name: loaded.product?.name || '',
          product_code: loaded.product?.code || '',
          product_description: loaded.product?.description || '',
          manufacturing_facility_address: loaded.site_id?.address || loaded.application_id?.establishment_address || ''
        }));
      }

      if (resp?.response_text) {
        setResponseText(resp.response_text);
      }
    } catch (err) {
      toast.error('Failed to load Initial Product approval form.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const handleSaveResponse = async (showToast = true) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('form_data', JSON.stringify(formData));
      fd.append('response_text', responseText);
      if (file) {
        fd.append('response_file', file);
      }

      await api.put(`/api/initial-products/${id}/save-response`, fd, true);
      if (showToast) toast.success('Draft response saved successfully!');
      fetchApp();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save response.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    // Validate minimal required fields
    if (!formData.product_name?.trim()) {
      return toast.error('Product Name is required in the form.');
    }

    setSubmitting(true);
    try {
      // 1. Save response first
      const saved = await handleSaveResponse(false);
      if (!saved) return;

      // 2. Submit response to change status to all_forms_received
      await api.put(`/api/initial-products/${id}/submit-response`);
      toast.success('🎉 Product Approval Form submitted for committee evaluation!');
      navigate(`/initial-products/${id}/track`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit form.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() && !replyFile) {
      return toast.error('Please enter reply text or attach a file.');
    }
    setSubmittingReply(true);
    try {
      const fd = new FormData();
      fd.append('reply_text', replyText);
      if (replyFile) fd.append('client_reply_file', replyFile);

      await api.put(`/api/initial-products/${id}/client-reply`, fd, true);
      toast.success('Reply submitted successfully to HFA technical team.');
      setReplyText('');
      setReplyFile(null);
      fetchApp();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Loading Approval Form...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
        <h3>Initial Product Not Found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/initial-products/in-progress')} style={{ marginTop: 12 }}>
          Back to In-Progress
        </button>
      </div>
    );
  }

  const isFormSubmitted = ['all_forms_received', 'logsheet_created', 'waiting_sharia_signature', 'initial_product_approved'].includes(app.status);
  const isApproved = app.status === 'initial_product_approved';
  const moreInfo = app.product_approval_form?.more_info_requested;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 80 }}>
      {/* Top Breadcrumbs & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(`/initial-products/${id}/track`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <ArrowLeft size={16} /> Back to Product Timeline
        </button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!isFormSubmitted && (
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleSaveResponse(true)}
                disabled={saving || submitting}
                style={{ fontWeight: 700 }}
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSubmitFinal}
                disabled={saving || submitting}
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', borderColor: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {submitting ? <span className="spinner-white" /> : <><Send size={14} /> Submit Final Form</>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Header Info Card */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={22} style={{ color: '#059669' }} />
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Product Approval Form &bull; {app.product?.name}
                </h1>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  Halal Food Authority &bull; Technical Specification &amp; Formulation Document
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {app.product_approval_form?.form_file_url && (
              <a
                href={getPdfUrl(app.product_approval_form.form_file_url)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <Download size={14} /> Download HFA Reference Document
              </a>
            )}
          </div>
        </div>

        {app.product_approval_form?.form_text && (
          <div style={{ marginTop: 16, padding: '14px 18px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
            <strong style={{ color: '#0f172a' }}>Instructions from Food Technologist:</strong> {app.product_approval_form.form_text}
          </div>
        )}
      </div>

      {/* More Info Requested Banner */}
      {moreInfo && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>
            <AlertCircle size={18} color="#d97706" /> Action Required: Additional Technical Details Requested
          </div>
          <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5, marginBottom: 14 }}>
            {app.product_approval_form?.more_info_message}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Type your response/clarification here..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <input
                type="file"
                onChange={e => setReplyFile(e.target.files[0])}
                style={{ fontSize: 12 }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSendReply}
                disabled={submittingReply}
                style={{ background: '#d97706', borderColor: '#d97706', fontWeight: 800 }}
              >
                {submittingReply ? 'Submitting...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The Master Product Approval Request Form */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '28px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <ProductApprovalRequestForm
          initialData={formData}
          onChange={(updated) => setFormData(updated)}
          readOnly={isFormSubmitted && !moreInfo}
        />

        {/* Supporting File Attachment */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 6 }}>
            Additional Document / Spec Sheet Upload (PDF, Word, or Images)
          </label>
          <input
            type="file"
            disabled={isFormSubmitted && !moreInfo}
            onChange={e => setFile(e.target.files[0])}
            style={{ fontSize: 13 }}
          />
          {app.product_approval_form?.product_response?.response_url && (
            <div style={{ marginTop: 8 }}>
              <a
                href={getPdfUrl(app.product_approval_form.product_response.response_url)}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12.5, fontWeight: 700, color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Download size={13} /> View Currently Uploaded Attachment
              </a>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isFormSubmitted && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleSaveResponse(true)}
              disabled={saving || submitting}
              style={{ fontWeight: 700 }}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmitFinal}
              disabled={saving || submitting}
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
              {submitting ? <span className="spinner-white" /> : <><Send size={16} /> Submit Completed Form for Review</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
