import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, CheckCircle, FileText, ChevronLeft, ChevronRight, Send
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ClientProductApprovalResponse() {
  const { addonId, productIndex } = useParams();
  const navigate = useNavigate();
  const idx = parseInt(productIndex, 10);

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedBefore, setSavedBefore] = useState(false);

  const fetchApp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/add-on-applications/${addonId}`);
      const data = res.data?.data || res.data;
      setApp(data);

      // Pre-fill from saved response
      const saved = (data.product_approval_form?.product_responses || [])
        .find(r => r.product_index === idx);
      if (saved?.response_text) {
        setResponseText(saved.response_text);
        if (saved.is_saved) {
          setIsSaved(true);
          setSavedBefore(true);
        }
      }
    } catch {
      toast.error('Failed to load form data.');
    } finally {
      setLoading(false);
    }
  }, [addonId, idx]);

  useEffect(() => { fetchApp(); }, [fetchApp]);

  const handleSave = async () => {
    if (!responseText.trim()) return toast.error('Please write your response before saving.');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('response_text', responseText.trim());
      await api.put(`/api/add-on-applications/${addonId}/save-product-response/${idx}`, fd, true);
      toast.success('Response saved!');
      setIsSaved(true);
      setSavedBefore(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save response.');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => navigate(`/addon-applications/${addonId}/approval-form`);
  const goPrev = () => navigate(`/addon-applications/${addonId}/approval-form/${idx - 1}`);
  const goNext = () => navigate(`/addon-applications/${addonId}/approval-form/${idx + 1}`);

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /></div>;
  }

  if (!app) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: '#ef4444', marginBottom: 16 }}>Application not found.</div>
        <button className="btn btn-outline" onClick={goBack}><ArrowLeft size={14} /> Back</button>
      </div>
    );
  }

  const products = app.products || [];
  const product = products[idx];
  const formText = app.product_approval_form?.form_text || '';
  const totalProducts = products.length;
  const isFirst = idx === 0;
  const isLast = idx === totalProducts - 1;
  const alreadySubmitted = !!app.product_approval_form?.submitted_at;

  if (!product) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: '#ef4444', marginBottom: 16 }}>Product not found.</div>
        <button className="btn btn-outline" onClick={goBack}><ArrowLeft size={14} /> Back to Form</button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f3f4f6 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top bar */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <button
          onClick={goBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '6px 10px', borderRadius: 8 }}
        >
          <ArrowLeft size={15} /> All Products
        </button>

        {/* Product navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={goPrev}
            disabled={isFirst}
            style={{ background: isFirst ? '#f1f5f9' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: isFirst ? 'not-allowed' : 'pointer', color: isFirst ? '#cbd5e1' : '#475569', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={15} />
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', minWidth: 80, textAlign: 'center' }}>
            Product {idx + 1} / {totalProducts}
          </div>
          <button
            onClick={goNext}
            disabled={isLast}
            style={{ background: isLast ? '#f1f5f9' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: isLast ? 'not-allowed' : 'pointer', color: isLast ? '#cbd5e1' : '#475569', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Save button */}
        {!alreadySubmitted && (
          <button
            onClick={handleSave}
            disabled={saving || !responseText.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: saving || !responseText.trim() ? 'not-allowed' : 'pointer',
              background: isSaved ? '#16a34a' : '#7c3aed', color: 'white',
              opacity: saving || !responseText.trim() ? 0.6 : 1, transition: 'all 0.15s'
            }}
          >
            {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</>
              : isSaved ? <><CheckCircle size={13} /> Saved</>
              : <><Save size={13} /> Save Response</>}
          </button>
        )}
        {alreadySubmitted && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={13} /> Submitted
          </span>
        )}
      </div>

      {/* Main content — two-column layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px 24px' }}>

        {/* LEFT — Context (product info + form instructions) */}
        <div style={{ paddingRight: 28, borderRight: '1px solid #e2e8f0' }}>
          {/* Product header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Product {idx + 1} of {totalProducts}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.2 }}>{product.name}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {product.code && (
                <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                  Code: {product.code}
                </span>
              )}
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                background: product.type === 'Add product' ? '#dcfce7' : product.type === 'Remove product' ? '#fee2e2' : '#e0f2fe',
                color: product.type === 'Add product' ? '#166534' : product.type === 'Remove product' ? '#991b1b' : '#0369a1'
              }}>
                {product.type}
              </span>
            </div>
          </div>

          {/* Form instructions */}
          {formText ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={13} /> Form Instructions from HFA
              </div>
              <div style={{
                background: 'white', border: '1px solid #e9d5ff', borderRadius: 12,
                padding: '18px 20px', fontSize: 14, color: '#3b0764', lineHeight: 1.8,
                whiteSpace: 'pre-wrap', maxHeight: 'calc(100vh - 320px)', overflowY: 'auto'
              }}>
                {formText}
              </div>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 12, padding: '24px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              No specific instructions provided for this form.
            </div>
          )}

          {/* All products overview */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              All Products
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {products.map((p, i) => {
                const r = (app.product_approval_form?.product_responses || []).find(r => r.product_index === i);
                const done = r?.is_saved && r?.response_text?.trim();
                const isCurrent = i === idx;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(`/addon-applications/${addonId}/approval-form/${i}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 8, border: `1px solid ${isCurrent ? '#7c3aed' : done ? '#bbf7d0' : '#e2e8f0'}`,
                      background: isCurrent ? '#fdf4ff' : done ? '#f0fdf4' : 'white',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s'
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: done ? '#16a34a' : isCurrent ? '#7c3aed' : '#e2e8f0',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#7c3aed' : done ? '#166534' : '#475569', flex: 1 }}>
                      {p.name}
                    </span>
                    {isCurrent && <ChevronRight size={12} style={{ color: '#7c3aed' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Response area */}
        <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Your Response</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {alreadySubmitted
                ? 'This response has been submitted to HFA and cannot be changed.'
                : 'Type your complete response below. Use the instructions on the left as a guide.'}
            </div>
          </div>

          {/* Status badge */}
          {isSaved && !alreadySubmitted && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px', marginBottom: 14, width: 'fit-content' }}>
              <CheckCircle size={12} /> Response saved — you can still edit and re-save
            </div>
          )}
          {savedBefore && !isSaved && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 12px', marginBottom: 14, width: 'fit-content' }}>
              ⚠️ Unsaved changes
            </div>
          )}

          {/* Text area */}
          <textarea
            value={responseText}
            onChange={e => { setResponseText(e.target.value); setIsSaved(false); }}
            readOnly={alreadySubmitted}
            placeholder={alreadySubmitted
              ? 'Response submitted.'
              : `Type your response for "${product.name}" here...\n\nBe thorough and answer any questions from the HFA form instructions on the left.`}
            style={{
              flex: 1, minHeight: 'calc(100vh - 360px)', maxHeight: 'calc(100vh - 240px)',
              resize: 'vertical', border: `1px solid ${isSaved ? '#bbf7d0' : '#e2e8f0'}`,
              borderRadius: 12, padding: '18px 20px', fontSize: 14, lineHeight: 1.8,
              color: '#0f172a', background: alreadySubmitted ? '#f8fafc' : 'white',
              outline: 'none', fontFamily: 'inherit',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => { if (!alreadySubmitted) e.target.style.borderColor = '#7c3aed'; }}
            onBlur={e => { e.target.style.borderColor = isSaved ? '#bbf7d0' : '#e2e8f0'; }}
          />

          {/* Bottom actions */}
          {!alreadySubmitted && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                onClick={handleSave}
                disabled={saving || !responseText.trim()}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 20px', borderRadius: 10, border: 'none',
                  background: isSaved ? '#16a34a' : '#7c3aed', color: 'white',
                  fontWeight: 700, fontSize: 14, cursor: saving || !responseText.trim() ? 'not-allowed' : 'pointer',
                  opacity: saving || !responseText.trim() ? 0.5 : 1, transition: 'all 0.15s'
                }}
              >
                {saving
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</>
                  : isSaved
                    ? <><CheckCircle size={15} /> Saved</>
                    : <><Save size={15} /> Save This Response</>}
              </button>

              {!isLast && (
                <button
                  onClick={goNext}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px',
                    borderRadius: 10, border: '1px solid #e2e8f0', background: 'white',
                    fontWeight: 600, fontSize: 13, color: '#475569', cursor: 'pointer'
                  }}
                >
                  Next Product <ChevronRight size={14} />
                </button>
              )}
              {isLast && (
                <button
                  onClick={goBack}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px',
                    borderRadius: 10, border: '1px solid #e2e8f0', background: 'white',
                    fontWeight: 600, fontSize: 13, color: '#475569', cursor: 'pointer'
                  }}
                >
                  <Send size={14} style={{ color: '#7c3aed' }} /> Review & Submit All
                </button>
              )}
            </div>
          )}

          {/* Character count */}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, textAlign: 'right' }}>
            {responseText.length} character{responseText.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
