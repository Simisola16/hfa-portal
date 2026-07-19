import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Award, PlusCircle, CheckCircle, HelpCircle, FileText } from 'lucide-react';

export default function AddOnApplicationPage() {
  const navigate = useNavigate();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    certificate_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    action_type: 'add',
    product_name: '',
    new_product_name: ''
  });

  useEffect(() => {
    // Fetch active certificates for current user
    api.get('/api/certificates')
      .then(res => {
        const active = (res.data || []).filter(c => 
          c.status === 'active' && new Date(c.expiry_date) >= new Date()
        );
        setCerts(active);
        if (active.length === 1) {
          setForm(f => ({ ...f, certificate_id: active[0]._id || active[0].id }));
        }
      })
      .catch(() => toast.error('Failed to load active certificates.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedCert = certs.find(c => (c._id || c.id) === form.certificate_id);
  const certProducts = selectedCert && Array.isArray(selectedCert.products_covered)
    ? selectedCert.products_covered
    : [];

  const handleInputChange = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.certificate_id) return toast.error('Please select a certificate.');
    if (!form.contact_name.trim()) return toast.error('Contact name is required.');
    if (!form.contact_email.trim()) return toast.error('Contact email is required.');
    
    if (form.action_type === 'add' && !form.new_product_name.trim()) {
      return toast.error('Please enter the new product name.');
    }
    if (form.action_type === 'remove' && !form.product_name) {
      return toast.error('Please select the product to remove.');
    }
    if (form.action_type === 'change_name') {
      if (!form.product_name) return toast.error('Please select the product to rename.');
      if (!form.new_product_name.trim()) return toast.error('Please enter the new name.');
    }

    setSubmitting(true);
    try {
      await api.post('/api/add-on-applications', form);
      toast.success('Add-on application submitted successfully!');
      navigate('/applications');
    } catch (err) {
      toast.error(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  if (certs.length === 0) {
    return (
      <div style={{ maxWidth: 650, margin: '40px auto', padding: '32px', background: 'white', borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
        <Award size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#334155', marginBottom: 12 }}>Add-on Application Unavailable</h3>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Add-on applications are available once you hold an active certificate. 
          Please wait for your main certification to be issued before submitting a product add-on, removal, or name change request.
        </p>
        <button className="btn btn-outline" onClick={() => navigate('/applications')}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }} className="animate-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/applications')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, padding: '4px 0',
          }}
        >
          <ArrowLeft size={15} /> Back
        </button>
      </div>

      <div className="card shadow-sm border-0" style={{ padding: '32px', borderRadius: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, borderBottom: '1px solid #f1f5f9', paddingBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlusCircle size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', margin: 0 }}>Add-on Product Application</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Request additions, removals, or name changes against your active certificate</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form">
          {/* Certificate Selection */}
          <div className="form-group">
            <label className="form-label">Select Active Certificate <span>*</span></label>
            {certs.length === 1 ? (
              <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, fontSize: 14 }}>
                Certificate: {certs[0].certificate_number} ({certs[0].certificate_type})
              </div>
            ) : (
              <select
                className="form-control"
                value={form.certificate_id}
                onChange={handleInputChange('certificate_id')}
                required
              >
                <option value="">-- Choose Certificate --</option>
                {certs.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.certificate_number} ({c.certificate_type})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Contact Name <span>*</span></label>
              <input
                className="form-control"
                value={form.contact_name}
                onChange={handleInputChange('contact_name')}
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email <span>*</span></label>
              <input
                type="email"
                className="form-control"
                value={form.contact_email}
                onChange={handleInputChange('contact_email')}
                placeholder="e.g. john@company.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input
              className="form-control"
              value={form.contact_phone}
              onChange={handleInputChange('contact_phone')}
              placeholder="e.g. +44 7700 900077"
            />
          </div>

          {/* Action Type Selection */}
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 12 }}>Action Type <span>*</span></label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { val: 'add', label: '➕ Add Product' },
                { val: 'remove', label: '❌ Remove Product' },
                { val: 'change_name', label: '📝 Change Name' }
              ].map(opt => (
                <label
                  key={opt.val}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 12, border: form.action_type === opt.val ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                    background: form.action_type === opt.val ? 'var(--primary-light)' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="action_type"
                    value={opt.val}
                    checked={form.action_type === opt.val}
                    onChange={handleInputChange('action_type')}
                    style={{ display: 'none' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Product Picker — for Remove or Rename */}
          {(form.action_type === 'remove' || form.action_type === 'change_name') && (
            <div className="form-group">
              <label className="form-label">Select Product from Certificate <span>*</span></label>
              <select
                className="form-control"
                value={form.product_name}
                onChange={handleInputChange('product_name')}
                required
              >
                <option value="">-- Choose Product --</option>
                {certProducts.map((p, i) => (
                  <option key={i} value={p}>{p}</option>
                ))}
              </select>
              {certProducts.length === 0 && (
                <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>This certificate has no products listed.</p>
              )}
            </div>
          )}

          {/* New Product Name — for Add */}
          {form.action_type === 'add' && (
            <div className="form-group animate-in">
              <label className="form-label">New Product Name <span>*</span></label>
              <input
                className="form-control"
                value={form.new_product_name}
                onChange={handleInputChange('new_product_name')}
                placeholder="e.g. Halal Spiced Sausages"
                required
              />
            </div>
          )}

          {/* New Product Name — for Rename */}
          {form.action_type === 'change_name' && (
            <div className="form-group animate-in">
              <label className="form-label">New Name for the Product <span>*</span></label>
              <input
                className="form-control"
                value={form.new_product_name}
                onChange={handleInputChange('new_product_name')}
                placeholder="e.g. Updated Product Name"
                required
              />
            </div>
          )}

          <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/applications')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
