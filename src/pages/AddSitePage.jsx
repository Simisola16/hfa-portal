import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { MapPin, Shield, Building } from 'lucide-react';

export default function AddSitePage() {
  const initialForm = {
    name: '', email: '', address_1: '', address_2: '', postcode: '', state: '', country: 'United Kingdom', city: '', contact_name: '', contact_phone_code: '+44', contact_phone_number: '',
    est_name: '', reg_number: '', vat_number: '', head_office_address: '', years_in_business: '', trading_name: '', website: '', mfg_email: '', operating_hours: '', num_employees: '',
    client_code: '', client_category: ''
  };

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    // Clear field-level error on change
    if (errors[k]) {
      setErrors(prev => ({ ...prev, [k]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      await api.post('/api/sites', form);
      toast.success('Business Site registered successfully!');
      // Navigate to dashboard — Layout will re-fetch sites and allow dashboard access
      navigate('/dashboard');
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
        toast.error('Please correct the validation errors below.');
      } else {
        toast.error(err.message || 'Failed to add site details');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '40px auto', padding: '0 16px' }} className="animate-fade-in">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: '#e0f2fe',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
        }}>
          <MapPin size={24} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.5px' }}>
          Register Business Location
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.5 }}>
          Before proceeding with your halal application, please complete your onboarding by registering your primary operating business site.
        </p>
      </div>

      <div className="card" style={{ padding: 32, borderRadius: 24, border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSubmit}>
          {/* Section 1: Site Details */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building size={18} /> Primary Site Details
            </h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Site / Business Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className={`form-control ${errors.name ? 'error' : ''}`}
                  placeholder="Primary processing facility, factory name, or office name" 
                  value={form.name} 
                  onChange={set('name')} 
                  required 
                />
                {errors.name && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Site Contact Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="email" 
                  className={`form-control ${errors.email ? 'error' : ''}`}
                  placeholder="site@company.com" 
                  value={form.email} 
                  onChange={set('email')} 
                  required 
                />
                {errors.email && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.email}</span>}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Address Line 1 <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className={`form-control ${errors.address_1 ? 'error' : ''}`}
                  placeholder="Street Address, Unit number, etc." 
                  value={form.address_1} 
                  onChange={set('address_1')} 
                  required 
                />
                {errors.address_1 && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.address_1}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 2</label>
                <input 
                  className="form-control" 
                  placeholder="Apartment, suite, etc. (optional)" 
                  value={form.address_2} 
                  onChange={set('address_2')} 
                />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">City</label>
                <input 
                  className="form-control" 
                  placeholder="City Name"
                  value={form.city} 
                  onChange={set('city')} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Postcode <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className={`form-control ${errors.postcode ? 'error' : ''}`}
                  placeholder="E.g. SW1A 1AA"
                  value={form.postcode} 
                  onChange={set('postcode')} 
                  required 
                />
                {errors.postcode && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.postcode}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">State / County <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className={`form-control ${errors.state ? 'error' : ''}`}
                  placeholder="State or region"
                  value={form.state} 
                  onChange={set('state')} 
                  required 
                />
                {errors.state && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.state}</span>}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Country <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  className={`form-control ${errors.country ? 'error' : ''}`}
                  value={form.country} 
                  onChange={set('country')} 
                  required
                >
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                </select>
                {errors.country && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.country}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Contact Person Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className={`form-control ${errors.contact_name ? 'error' : ''}`}
                  placeholder="Name of manager or contact person"
                  value={form.contact_name} 
                  onChange={set('contact_name')} 
                  required 
                />
                {errors.contact_name && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.contact_name}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Number <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  className="form-control" 
                  style={{ width: 100 }} 
                  value={form.contact_phone_code} 
                  onChange={set('contact_phone_code')}
                >
                  <option value="+44">+44</option>
                  <option value="+234">+234</option>
                  <option value="+971">+971</option>
                  <option value="+966">+966</option>
                </select>
                <input 
                  className={`form-control ${errors.contact_phone_number ? 'error' : ''}`}
                  style={{ flex: 1 }} 
                  placeholder="7123 456789" 
                  value={form.contact_phone_number} 
                  onChange={set('contact_phone_number')} 
                  required 
                />
              </div>
              {errors.contact_phone_number && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.contact_phone_number}</span>}
            </div>
          </div>

          {/* Section 2: Manufacturer Details */}
          <div style={{ marginBottom: 32, padding: 24, background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', marginBottom: 16 }}>
              Manufacturer / Production Details <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(Optional - fill if different from above)</span>
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Establishment Name</label>
                <input className="form-control" value={form.est_name} onChange={set('est_name')} />
              </div>
              <div className="form-group">
                <label className="form-label">Company Registration No.</label>
                <input className="form-control" value={form.reg_number} onChange={set('reg_number')} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">VAT Number</label>
                <input className="form-control" value={form.vat_number} onChange={set('vat_number')} />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-control" placeholder="https://" value={form.website} onChange={set('website')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Head Office Address</label>
              <textarea className="form-control" rows={2} value={form.head_office_address} onChange={set('head_office_address')} />
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Trading Name</label>
                <input className="form-control" value={form.trading_name} onChange={set('trading_name')} />
              </div>
              <div className="form-group">
                <label className="form-label">Operating Hours</label>
                <input className="form-control" placeholder="e.g. 9AM - 5PM" value={form.operating_hours} onChange={set('operating_hours')} />
              </div>
              <div className="form-group">
                <label className="form-label">No. of Employees</label>
                <input className="form-control" type="number" value={form.num_employees} onChange={set('num_employees')} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              disabled={submitting}
            >
              {submitting ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Register Site & Enter Portal'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: 13 }}>
        <Shield size={16} /> Secure Halal Food Authority (HFA) certification system
      </div>
    </div>
  );
}
