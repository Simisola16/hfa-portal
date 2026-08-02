import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Upload, Save, CheckCircle, Clock,
  AlertCircle, Download, Check, X, Shield, Lock
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const getPdfUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
  return `${API_URL}${url.startsWith('/') ? url : '/' + url}`;
};

export default function ClientAddOnApprovalForm() {
  const { addonId } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState(null);
  const [submittingAll, setSubmittingAll] = useState(false);

  // Per-product draft state: { [productIndex]: { text: string, file: File | null } }
  const [productInputs, setProductInputs] = useState({});
  const fileInputRefs = useRef({});

  const fetchApp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/add-on-applications/${addonId}`);
      const data = res.data?.data || res.data;
      setApp(data);

      // Pre-fill inputs from saved product responses
      const savedResponses = data.product_approval_form?.product_responses || [];
      const initialInputs = {};
      (data.products || []).forEach((p, idx) => {
        const saved = savedResponses.find(r => r.product_index === idx);
        initialInputs[idx] = {
          text: saved?.response_text || '',
          fileUrl: saved?.response_url || '',
          file: null,
          isSaved: !!saved?.is_saved
        };
      });
      setProductInputs(initialInputs);
    } catch {
      toast.error('Failed to load application form.');
    } finally {
      setLoading(false);
    }
  }, [addonId]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const handleInputChange = (idx, field, value) => {
    setProductInputs(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value
      }
    }));
  };

  // Save draft response for a single product
  const handleSaveProductResponse = async (idx) => {
    const input = productInputs[idx] || {};
    setSavingIndex(idx);

    try {
      const fd = new FormData();
      if (input.file) fd.append('response_file', input.file);
      if (input.text !== undefined) fd.append('response_text', input.text);

      const res = await api.put(`/api/add-on-applications/${addonId}/save-product-response/${idx}`, fd, true);
      const updatedApp = res.data?.data || res.data;

      toast.success(`Response saved for Product #${idx + 1}!`);
      setApp(updatedApp);

      // Update state with saved state
      const savedResponses = updatedApp.product_approval_form?.product_responses || [];
      const saved = savedResponses.find(r => r.product_index === idx);

      setProductInputs(prev => ({
        ...prev,
        [idx]: {
          ...prev[idx],
          fileUrl: saved?.response_url || prev[idx]?.fileUrl || '',
          file: null,
          isSaved: true
        }
      }));
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSavingIndex(null);
    }
  };

  // Final submit all responses
  const handleSubmitAll = async () => {
    setSubmittingAll(true);
    try {
      await api.put(`/api/add-on-applications/${addonId}/submit-all-responses`);
      toast.success('Product Approval Form submitted successfully!');
      fetchApp();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmittingAll(false);
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  if (!app) {
    return (
      <div className="animate-in" style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2>Add-on Application Not Found</h2>
        <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/addon-applications')}>
          <ArrowLeft size={16} /> Back to Applications
        </button>
      </div>
    );
  }

  const products = app.products || [];
  const savedResponses = app.product_approval_form?.product_responses || [];
  const savedCount = products.filter((_, idx) => savedResponses.some(r => r.product_index === idx && r.is_saved)).length;
  const isAllSaved = savedCount === products.length && products.length > 0;
  const isSubmitted = app.status !== 'product_approval_form_enabled' && app.product_approval_form?.submitted_at;

  return (
    <div className="animate-in" style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/addon-applications')}>
            <ArrowLeft size={16} /> Back to My Applications
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>Product Approval Form Response</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Review the HFA form requirements and submit your response for each requested product
            </p>
          </div>
        </div>

        {isSubmitted ? (
          <span className="badge badge-green" style={{ fontSize: 11, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={13} /> SUBMITTED ON {new Date(app.product_approval_form.submitted_at).toLocaleDateString('en-GB')}
          </span>
        ) : (
          <span className="badge badge-purple" style={{ fontSize: 11, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} /> RESPONSE REQUIRED
          </span>
        )}
      </div>

      {/* ─── Admin Form Content Section (Top) ────────────────────────────── */}
      <div className="card shadow-sm" style={{ padding: 24, marginBottom: 24, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} /> Admin Product Approval Form Instructions
        </div>

        {app.product_approval_form?.form_file_url && (
          <div style={{ marginBottom: 12 }}>
            <a
              href={getPdfUrl(app.product_approval_form.form_file_url)}
              target="_blank" rel="noreferrer"
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white' }}
            >
              <Download size={14} /> Download Form Document (PDF)
            </a>
          </div>
        )}

        {app.product_approval_form?.form_text ? (
          <div style={{ background: 'white', padding: 16, borderRadius: 10, border: '1px solid #fde68a', fontSize: 13.5, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {app.product_approval_form.form_text}
          </div>
        ) : !app.product_approval_form?.form_file_url && (
          <div style={{ fontSize: 13, color: '#854d0e', italic: 'true' }}>Form instructions provided by HFA team.</div>
        )}
      </div>

      {/* ─── Progress Banner ────────────────────────────────────────────── */}
      {!isSubmitted && (
        <div style={{
          marginBottom: 24, padding: '14px 20px', borderRadius: 12,
          background: isAllSaved ? '#f0fdf4' : '#f0f9ff',
          border: isAllSaved ? '1px solid #bbf7d0' : '1px solid #bae6fd',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: isAllSaved ? '#166534' : '#0369a1' }}>
              {isAllSaved ? '🎉 All Product Responses Saved!' : `Product Response Progress: ${savedCount} of ${products.length} completed`}
            </div>
            <div style={{ fontSize: 12, color: isAllSaved ? '#15803d' : '#0284c7', marginTop: 2 }}>
              {isAllSaved
                ? 'Click "Submit Product Approval Form" below to lock in all responses.'
                : 'Save a response for each product below to enable final submission.'}
            </div>
          </div>

          <div style={{ fontWeight: 800, fontSize: 14, color: isAllSaved ? '#16a34a' : '#0284c7' }}>
            {savedCount} / {products.length} Saved
          </div>
        </div>
      )}

      {/* ─── Per-Product Response Cards List ───────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {products.map((p, idx) => {
          const input = productInputs[idx] || { text: '', fileUrl: '', file: null, isSaved: false };
          const savedItem = savedResponses.find(r => r.product_index === idx && r.is_saved);
          const isItemSaved = !!savedItem || input.isSaved;

          return (
            <div key={idx} className="card shadow-sm" style={{ padding: 24, borderRadius: 12, background: 'white', border: isItemSaved ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
              {/* Product Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, pb: 12, borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: isItemSaved ? '#16a34a' : '#f1f5f9', color: isItemSaved ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                    {isItemSaved ? '✓' : idx + 1}
                  </span>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Product #{idx + 1}: {p.name}
                    </h3>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {p.code ? `Code: ${p.code} • ` : ''}Action: <strong>{p.type}</strong>
                    </div>
                  </div>
                </div>

                {isItemSaved ? (
                  <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 700 }}>
                    <Check size={11} style={{ marginRight: 2 }} /> SAVED
                  </span>
                ) : (
                  <span className="badge badge-gray" style={{ fontSize: 10, fontWeight: 700 }}>
                    PENDING RESPONSE
                  </span>
                )}
              </div>

              {/* Read-Only State if Already Submitted */}
              {isSubmitted ? (
                <div style={{ fontSize: 13, color: '#334155', background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {savedItem?.response_text && (
                    <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{savedItem.response_text}</div>
                  )}
                  {savedItem?.response_url && (
                    <a href={getPdfUrl(savedItem.response_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={13} /> View Attached Response File
                    </a>
                  )}
                  {!savedItem?.response_text && !savedItem?.response_url && (
                    <div style={{ color: '#94a3b8', italic: 'true' }}>Acknowledged.</div>
                  )}
                </div>
              ) : (
                /* Editable Response Section */
                <div>
                  {/* Textarea */}
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                      Written Response / Remarks for {p.name}
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={input.text}
                      onChange={e => handleInputChange(idx, 'text', e.target.value)}
                      placeholder={`Enter specific response or remarks for ${p.name}...`}
                      style={{ fontSize: 13 }}
                    />
                  </div>

                  {/* File Upload */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        ref={el => fileInputRefs.current[idx] = el}
                        style={{ display: 'none' }}
                        onChange={e => handleInputChange(idx, 'file', e.target.files[0] || null)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Upload size={13} /> {input.file ? input.file.name : input.fileUrl ? 'Replace Uploaded File' : 'Upload Document (PDF/Image)'}
                      </button>

                      {input.file && (
                        <button type="button" onClick={() => handleInputChange(idx, 'file', null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <X size={14} />
                        </button>
                      )}

                      {input.fileUrl && !input.file && (
                        <a href={getPdfUrl(input.fileUrl)} target="_blank" rel="noreferrer" style={{ marginLeft: 10, fontSize: 11, color: '#00853b', fontWeight: 600 }}>
                          View Attached File
                        </a>
                      )}
                    </div>

                    {/* Per-Product Save Button */}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleSaveProductResponse(idx)}
                      disabled={savingIndex === idx}
                      style={{
                        borderColor: '#00853b', color: '#00853b', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: '#f0fdf4'
                      }}
                    >
                      <Save size={13} /> {savingIndex === idx ? 'Saving...' : isItemSaved ? 'Update Saved Response' : 'Save Response for Product'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* ─── Final Submit Button Section ─────────────────────────────────── */}
      {!isSubmitted && (
        <div className="card shadow-sm" style={{ marginTop: 32, padding: 24, textAlign: 'center', background: 'white', borderRadius: 12, border: isAllSaved ? '2px solid #16a34a' : '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            Final Form Submission
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 18, maxWidth: 500, margin: '0 auto 18px' }}>
            {isAllSaved
              ? 'All product responses are saved. Click below to lock in all responses and submit the form to HFA.'
              : 'You must save a response for each product above before you can perform the final submission.'}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmitAll}
            disabled={!isAllSaved || submittingAll}
            style={{
              padding: '12px 32px', fontSize: 15, fontWeight: 800,
              background: isAllSaved ? '#00853b' : '#94a3b8',
              borderColor: isAllSaved ? '#00853b' : '#94a3b8',
              cursor: isAllSaved ? 'pointer' : 'not-allowed'
            }}
          >
            {submittingAll ? 'Submitting...' : 'Submit Product Approval Form'}
          </button>
        </div>
      )}

    </div>
  );
}
