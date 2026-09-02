import React, { useState, useEffect } from 'react';
import {
  X, Package, Plus, CheckCircle2, AlertCircle, Building2,
  Sparkles, Layers, Info, Send, FileText, Check
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ClientAddInitialProductModal({
  isOpen,
  onClose,
  application,
  onSuccess
}) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [message, setMessage] = useState('');

  // Initialize or prefill from application when opened
  useEffect(() => {
    if (isOpen) {
      setError('');
      const appProduct = application?.products?.[0] || {};
      setProductName(appProduct.name || '');
      setProductCode(appProduct.code || '');
      setProductCategory(appProduct.category || application?.category || application?.scope || '');
      setIngredients(appProduct.ingredients || '');
      setDescription(appProduct.description || '');

      setContactName(
        application?.contact_name ||
        application?.contact_person ||
        user?.full_name ||
        ''
      );
      setContactEmail(
        application?.contact_email ||
        user?.email ||
        ''
      );
      setContactPhone(
        application?.contact_phone ||
        user?.phone ||
        ''
      );
      setMessage('');
    }
  }, [isOpen, application, user]);

  if (!isOpen) return null;

  const appId = application?._id || application?.id;
  const appNumber = application?.application_number || (appId ? `APP-${String(appId).slice(-6).toUpperCase()}` : 'N/A');
  const facilityName = application?.establishment_name || application?.site_name || 'Your Facility';
  const siteId = typeof application?.site_id === 'object' ? application?.site_id?._id : application?.site_id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!appId) {
      setError('Missing application reference. Please try again.');
      return;
    }
    if (!productName.trim()) {
      setError('Product Name is required.');
      return;
    }
    if (!contactName.trim()) {
      setError('Contact Person Name is required.');
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setError('A valid Contact Email is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        application_id: appId,
        site_id: siteId || undefined,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        message: message.trim(),
        product: {
          name: productName.trim(),
          code: productCode.trim(),
          category: productCategory.trim(),
          ingredients: ingredients.trim(),
          description: description.trim()
        }
      };

      const res = await api.post('/api/initial-products', payload);
      const createdItem = res.data?.data || res.data;

      toast.success('Initial Product submitted for technical evaluation!');
      if (onSuccess) {
        onSuccess(createdItem);
      }
      onClose();
    } catch (err) {
      console.error('Failed to submit initial product:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to submit initial product. Please check required fields.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          maxWidth: 680,
          width: '100%',
          borderRadius: 16,
          padding: 0,
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#15803d',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)'
            }}>
              <Package size={22} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                Add Initial Product
                <span style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid #bbf7d0'
                }}>
                  #{appNumber}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                Register primary product for <strong>{facilityName}</strong> to begin technical evaluation
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ color: '#94a3b8', padding: 6, borderRadius: 8 }}
            disabled={submitting}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Guidance Banner ── */}
        <div style={{
          padding: '12px 24px',
          background: '#eff6ff',
          borderBottom: '1px solid #dbeafe',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10
        }}>
          <Info size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: '#1e40af', lineHeight: 1.5 }}>
            Your initial certification includes <strong>1 primary Initial Product</strong> evaluated by our Food Technologies team. Once approved, facility audit scheduling will be unlocked.
          </div>
        </div>

        {/* ── Form Body (Scrollable) ── */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#b91c1c',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* Section: Product Information */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Package size={15} color="#059669" /> Product Information
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Product Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Pure Malt Beverage / Halal Seasoning"
                  required
                  style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Product Code / SKU
                </label>
                <input
                  type="text"
                  className="input"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="e.g. HFA-PMB-001"
                  style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Category / Product Type
              </label>
              <input
                type="text"
                className="input"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="e.g. Beverages / Bakery / Meat / Seasonings"
                style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8 }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Key Ingredients / Formulation Summary
              </label>
              <textarea
                className="input"
                rows={2}
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="List major ingredients, raw materials, or flavorings used in this product..."
                style={{ width: '100%', fontSize: 13, padding: '8px 12px', borderRadius: 8, resize: 'vertical' }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Product Description & Packaging
              </label>
              <textarea
                className="input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the product packaging, shelf life, and intended use..."
                style={{ width: '100%', fontSize: 13, padding: '8px 12px', borderRadius: 8, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Section: Technical Contact Details */}
          <div style={{ marginBottom: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Building2 size={15} color="#2563eb" /> Technical Contact Details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Contact Person Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. John Doe (Quality Manager)"
                  required
                  style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Contact Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  className="input"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="quality@company.com"
                  required
                  style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Contact Phone
              </label>
              <input
                type="text"
                className="input"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+44 20 1234 5678"
                style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8 }}
              />
            </div>
          </div>

          {/* Section: Additional Notes */}
          <div style={{ marginBottom: 8, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Notes / Remarks for Food Technologist (Optional)
            </label>
            <textarea
              className="input"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any relevant processing specifics, certifications (e.g. ISO/BRC), or manufacturing details..."
              style={{ width: '100%', fontSize: 13, padding: '8px 12px', borderRadius: 8, resize: 'vertical' }}
            />
          </div>

          {/* ── Modal Actions Footer ── */}
          <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12
          }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13 }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderColor: '#059669',
                fontWeight: 800,
                fontSize: 13.5,
                padding: '9px 20px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
              }}
            >
              {submitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send size={15} /> Submit Initial Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
