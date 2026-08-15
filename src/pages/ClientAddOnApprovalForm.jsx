import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, CheckCircle, Clock, AlertCircle,
  ChevronRight, Package, Users, Send, UploadCloud, Download
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

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

export default function ClientAddOnApprovalForm() {
  const { addonId } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingAll, setSubmittingAll] = useState(false);

  // Reply more info state
  const [replyText, setReplyText] = useState('');
  const [replyFile, setReplyFile] = useState(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchApp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/add-on-applications/${addonId}`);
      setApp(res.data?.data || res.data);
    } catch {
      toast.error('Failed to load application form.');
    } finally {
      setLoading(false);
    }
  }, [addonId]);

  useEffect(() => { fetchApp(); }, [fetchApp]);

  const handleSubmitAll = async () => {
    setSubmittingAll(true);
    try {
      await api.put(`/api/add-on-applications/${addonId}/submit-all-responses`);
      toast.success('All product responses submitted successfully!');
      fetchApp();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit responses.');
    } finally {
      setSubmittingAll(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() && !replyFile) {
      toast.error('Please write a message or attach a supporting document.');
      return;
    }

    setSubmittingReply(true);
    try {
      const formData = new FormData();
      if (replyText.trim()) formData.append('reply_text', replyText.trim());
      if (replyFile) formData.append('reply_file', replyFile);

      const res = await api.put(`/api/add-on-applications/${addonId}/reply-more-info`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data?.message || 'Reply and documents submitted to HFA successfully!');
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
    return <div className="loading-overlay"><div className="spinner" /></div>;
  }

  if (!app) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Application Not Found</h2>
        <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/addon-applications')}>
          <ArrowLeft size={16} /> Back to Add-on Applications
        </button>
      </div>
    );
  }

  const formText = app.product_approval_form?.form_text || '';
  const productResponses = app.product_approval_form?.product_responses || [];
  const allSubmitted = app.product_approval_form?.submitted_at;
  const canSubmitAll = !allSubmitted && app.status === 'product_approval_form_enabled';

  const getSavedResponse = (idx) =>
    productResponses.find(r => r.product_index === idx);

  const savedCount = (app.products || []).filter((_, idx) => {
    const r = getSavedResponse(idx);
    return r?.is_saved && (r?.response_text?.trim() || (r?.form_data && Object.keys(r.form_data).length > 0));
  }).length;

  const allSaved = savedCount === (app.products || []).length;

  const isMoreInfoRequested = app.product_approval_form?.more_info_requested || app.product_approval_form?.more_info_message;

  return (
    <div className="animate-in" style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 48 }}>

      {/* Back */}
      <button
        onClick={() => navigate('/addon-applications')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 20 }}
      >
        <ArrowLeft size={15} /> Back to Applications
      </button>

      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>Product Approval Form</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Review the form instructions, then complete your response for each product below.</p>
      </div>

      {/* Context Card */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Certificate</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{app.certificate_id?.certificate_number || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Contact</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{app.contact_name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{app.contact_email}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Products</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{(app.products || []).length} product(s)</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Status</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: allSubmitted ? '#16a34a' : isMoreInfoRequested ? '#ea580c' : '#7c3aed', display: 'flex', alignItems: 'center', gap: 4 }}>
              {allSubmitted ? <><CheckCircle size={13} /> Submitted</> : isMoreInfoRequested ? <><AlertCircle size={13} /> More Info Requested</> : <><Clock size={13} /> Awaiting Response</>}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Form Instructions & More Info Request Block */}
      {(isMoreInfoRequested || formText) && (
        <div style={{
          background: isMoreInfoRequested ? '#fff7ed' : '#fdf4ff',
          border: `1.5px solid ${isMoreInfoRequested ? '#fed7aa' : '#e9d5ff'}`,
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 20
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: isMoreInfoRequested ? '#ea580c' : '#7c3aed',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            {isMoreInfoRequested ? (
              <><AlertCircle size={15} /> Action Required: Additional Information Requested by HFA</>
            ) : (
              <><FileText size={15} /> Form Instructions from HFA</>
            )}
          </div>

          <div style={{
            fontSize: 13.5,
            color: isMoreInfoRequested ? '#9a3412' : '#4c1d95',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            marginBottom: 14
          }}>
            {app.product_approval_form?.more_info_message || formText}
          </div>

          {/* Admin attached file (if any) */}
          {(app.product_approval_form?.more_info_file_url || app.product_approval_form?.form_file_url) && (
            <div style={{ marginBottom: 14 }}>
              <a
                href={getPdfUrl(app.product_approval_form?.more_info_file_url || app.product_approval_form?.form_file_url)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
                style={{ background: 'white', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <Download size={14} /> Download Document from HFA
              </a>
            </div>
          )}

          {/* Client Reply & Document Upload Section */}
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${isMoreInfoRequested ? '#fed7aa' : '#e9d5ff'}`,
            background: 'white',
            borderRadius: 10,
            padding: 16
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UploadCloud size={16} color="#ea580c" /> Submit Your Reply &amp; Upload Supporting Documents
            </div>

            <form onSubmit={handleReplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
                  Response Note / Explanation
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Provide any explanations, remarks, or clarifications regarding the requested documents..."
                  style={{ width: '100%', fontSize: 13, borderRadius: 8, padding: 10, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
                  Upload Supporting Document(s) (PDF, DOCX, Images, etc.)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    id="reply-file-upload"
                    style={{ display: 'none' }}
                    onChange={e => setReplyFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                  />
                  <label
                    htmlFor="reply-file-upload"
                    className="btn btn-outline btn-sm"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, fontWeight: 600 }}
                  >
                    <UploadCloud size={14} /> {replyFile ? 'Change Document' : 'Choose Document'}
                  </label>
                  {replyFile && (
                    <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={14} /> {replyFile.name} ({(replyFile.size / 1024).toFixed(0)} KB)
                      <button
                        type="button"
                        onClick={() => setReplyFile(null)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingReply || (!replyText.trim() && !replyFile)}
                  style={{
                    background: '#ea580c',
                    borderColor: '#ea580c',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Send size={14} /> {submittingReply ? 'Submitting Reply...' : 'Submit Reply & Documents to HFA'}
                </button>
              </div>
            </form>

            {/* Previously Submitted Reply (if any) */}
            {(app.product_approval_form?.client_reply_text || app.product_approval_form?.client_reply_file_url) && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  Your Latest Submitted Reply {app.product_approval_form?.client_replied_at ? `(${new Date(app.product_approval_form.client_replied_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })})` : ''}
                </div>
                {app.product_approval_form?.client_reply_text && (
                  <div style={{ fontSize: 12.5, color: '#334155', whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                    {app.product_approval_form.client_reply_text}
                  </div>
                )}
                {app.product_approval_form?.client_reply_file_url && (
                  <a
                    href={getPdfUrl(app.product_approval_form.client_reply_file_url)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                  >
                    <Download size={12} /> View Uploaded Reply Document
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Submitted Banner */}
      {allSubmitted && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#166534', fontSize: 14 }}>All Responses Submitted</div>
            <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>
              Submitted on {new Date(app.product_approval_form.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      )}

      {/* Progress summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
          Products ({savedCount} / {(app.products || []).length} completed)
        </div>
        <div style={{ height: 6, flex: 1, maxWidth: 200, background: '#e2e8f0', borderRadius: 10, margin: '0 16px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(app.products || []).length > 0 ? Math.round((savedCount / (app.products || []).length) * 100) : 0}%`,
            background: '#7c3aed',
            borderRadius: 10,
            transition: 'width 0.4s ease'
          }} />
        </div>
        <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>
          {(app.products || []).length > 0 ? Math.round((savedCount / (app.products || []).length) * 100) : 0}%
        </div>
      </div>

      {/* Product Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {(app.products || []).map((product, idx) => {
          const saved = getSavedResponse(idx);
          const isSaved = saved?.is_saved && (saved?.response_text?.trim() || (saved?.form_data && Object.keys(saved.form_data).length > 0));
          const hasDraft = (saved?.response_text?.trim() || (saved?.form_data && Object.keys(saved.form_data).length > 0)) && !saved?.is_saved;
          const isDisabled = !!allSubmitted;

          return (
            <div
              key={idx}
              onClick={() => !isDisabled && navigate(`/addon-applications/${addonId}/approval-form/${idx}`)}
              style={{
                background: 'white',
                borderRadius: 12,
                border: `1px solid ${isSaved ? '#bbf7d0' : hasDraft ? '#fde68a' : '#e2e8f0'}`,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: isDisabled ? 'default' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
              onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isSaved ? '#bbf7d0' : hasDraft ? '#fde68a' : '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
            >
              {/* Serial number */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: isSaved ? '#dcfce7' : hasDraft ? '#fef9c3' : '#f1f5f9',
                color: isSaved ? '#16a34a' : hasDraft ? '#92400e' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800
              }}>
                {isSaved ? <CheckCircle size={16} /> : product.sn || idx + 1}
              </div>

              {/* Product info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 2 }}>
                  {product.name}
                  {product.code && <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12, marginLeft: 6 }}>({product.code})</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                    background: product.type === 'Add product' ? '#dcfce7' : product.type === 'Remove product' ? '#fee2e2' : '#e0f2fe',
                    color: product.type === 'Add product' ? '#166534' : product.type === 'Remove product' ? '#991b1b' : '#0369a1'
                  }}>{product.type}</span>
                  {isSaved && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={10} /> Response saved</span>}
                  {hasDraft && !isSaved && <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Draft saved</span>}
                  {!isSaved && !hasDraft && !isDisabled && <span style={{ fontSize: 11, color: '#94a3b8' }}>Tap to fill in your response</span>}
                </div>
              </div>

              {/* Arrow */}
              {!isDisabled && (
                <ChevronRight size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Final Submit Button */}
      {canSubmitAll && (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Ready to Submit?</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {allSaved
                ? 'All responses completed. You can now submit to HFA.'
                : `Complete all ${(app.products || []).length} product responses before submitting.`}
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700, opacity: allSaved ? 1 : 0.5, cursor: allSaved ? 'pointer' : 'not-allowed' }}
            onClick={allSaved ? handleSubmitAll : undefined}
            disabled={submittingAll || !allSaved}
          >
            <Send size={14} />
            {submittingAll ? 'Submitting...' : 'Submit All Responses to HFA'}
          </button>
        </div>
      )}
    </div>
  );
}
