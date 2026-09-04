import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, CheckCircle, FileText, ChevronLeft, ChevronRight, Send, Printer
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ProductApprovalRequestForm, { INITIAL_PRODUCT_APPROVAL_FORM } from '../components/ProductApprovalRequestForm';

export default function ClientProductApprovalResponse() {
  const { addonId, productIndex } = useParams();
  const navigate = useNavigate();
  const idx = parseInt(productIndex, 10);

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(INITIAL_PRODUCT_APPROVAL_FORM);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedBefore, setSavedBefore] = useState(false);

  const fetchApp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/add-on-applications/${addonId}`);
      const data = res.data?.data || res.data;
      setApp(data);

      const targetProduct = data.products?.[idx] || {};
      const saved = (data.product_approval_form?.product_responses || [])
        .find(r => r.product_index === idx);

      if (saved?.form_data && Object.keys(saved.form_data).length > 0) {
        setFormData({
          ...INITIAL_PRODUCT_APPROVAL_FORM,
          ...saved.form_data,
          product_name: saved.form_data.product_name || targetProduct.name || '',
          product_code: saved.form_data.product_code || targetProduct.code || ''
        });
        if (saved.is_saved) {
          setIsSaved(true);
          setSavedBefore(true);
        }
      } else {
        setFormData({
          ...INITIAL_PRODUCT_APPROVAL_FORM,
          product_name: targetProduct.name || '',
          product_code: targetProduct.code || '',
          company_name_address: [data.client_id?.company_name, data.client_id?.address].filter(Boolean).join(', ') || ''
        });
      }
    } catch {
      toast.error('Failed to load form data.');
    } finally {
      setLoading(false);
    }
  }, [addonId, idx]);

  useEffect(() => { fetchApp(); }, [fetchApp]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('form_data', JSON.stringify(formData));
      fd.append('response_text', formData.product_description || `${formData.product_name} specifications`);

      await api.put(`/api/add-on-applications/${addonId}/save-product-response/${idx}`, fd, true);
      toast.success(`Form saved for product ${idx + 1}!`);
      setIsSaved(true);
      setSavedBefore(true);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product form.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => navigate(`/addon-applications/${addonId}/approval-form`);
  const goPrev = () => navigate(`/addon-applications/${addonId}/approval-form/${idx - 1}`);
  const goNext = () => navigate(`/addon-applications/${addonId}/approval-form/${idx + 1}`);

  const handleSaveAndNext = async () => {
    const success = await handleSave();
    if (success) {
      goNext();
    }
  };

  const handleSaveAndBack = async () => {
    const success = await handleSave();
    if (success) {
      goBack();
    }
  };

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
  const totalProducts = products.length;
  const isFirst = idx === 0;
  const isLast = idx === totalProducts - 1;
  const alreadySubmitted = !!app.product_approval_form?.submitted_at;

  if (!product) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: '#ef4444', marginBottom: 16 }}>Product not found.</div>
        <button className="btn btn-outline" onClick={goBack}><ArrowLeft size={14} /> Back to Overview</button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top sticky bar */}
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
          type="button"
          onClick={goBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '6px 10px', borderRadius: 8 }}
        >
          <ArrowLeft size={15} /> All Products
        </button>

        {/* Product navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            style={{ background: isFirst ? '#f1f5f9' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: isFirst ? 'not-allowed' : 'pointer', color: isFirst ? '#cbd5e1' : '#475569', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={15} />
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', minWidth: 100, textAlign: 'center' }}>
            Product {idx + 1} of {totalProducts}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={isLast}
            style={{ background: isLast ? '#f1f5f9' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: isLast ? 'not-allowed' : 'pointer', color: isLast ? '#cbd5e1' : '#475569', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
          >
            <Printer size={14} /> Print
          </button>

          {!alreadySubmitted && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: isSaved ? '#16a34a' : '#164e63', color: 'white',
                opacity: saving ? 0.6 : 1, transition: 'all 0.15s'
              }}
            >
              {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</>
                : isSaved ? <><CheckCircle size={13} /> Saved</>
                : <><Save size={13} /> Save Form Draft</>}
            </button>
          )}
          {alreadySubmitted && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={13} /> Submitted
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '24px 20px 60px' }}>
        
        {/* Helper Banner */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>
              Product: {product.name} {product.code ? `(${product.code})` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#3b82f6' }}>
              Complete the 3-page Halal Certification Product Approval Request Form below. Fill all applicable sections (Ingredients, Porcine Segregation, Processing Aids, Ethanol, Packaging &amp; Sign-off).
            </div>
          </div>
          {isSaved && !alreadySubmitted && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: 6 }}>
              ✓ Saved Draft
            </div>
          )}
        </div>

        {/* The 3-Page Official Form Component */}
        <ProductApprovalRequestForm
          formData={formData}
          onChange={updated => {
            setFormData(updated);
            setIsSaved(false);
          }}
          readOnly={alreadySubmitted}
          product={product}
          company={app.client_id}
        />

        {/* Footer Navigation & Submit */}
        <div style={{
          maxWidth: 1040,
          margin: '24px auto 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={goBack}
            className="btn btn-outline"
            style={{ fontSize: 13 }}
          >
            <ArrowLeft size={14} /> Back to Products List
          </button>

          <div style={{ display: 'flex', gap: 12 }}>
            {!isLast ? (
              <button
                type="button"
                onClick={handleSaveAndNext}
                disabled={saving}
                className="btn btn-primary"
                style={{ background: '#164e63', borderColor: '#164e63', fontSize: 13 }}
              >
                {saving ? 'Saving...' : 'Save & Go to Next Product'} <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveAndBack}
                disabled={saving}
                className="btn btn-primary"
                style={{ background: '#0284c7', borderColor: '#0284c7', fontSize: 13 }}
              >
                <Send size={14} /> {saving ? 'Saving...' : 'Save & Review All Products'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
