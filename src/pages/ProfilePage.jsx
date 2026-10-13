import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Save, User, Lock, Building2, ShieldCheck, Info } from 'lucide-react';

export default function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const [form, setForm] = useState({ full_name:'', company_name:'', phone:'', address:'', postcode:'', country:'' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { 
    if (profile) {
      setForm({ 
        full_name: profile.full_name || '', 
        company_name: profile.company_name || '', 
        phone: profile.phone || '', 
        address: profile.address || '', 
        postcode: profile.postcode || '', 
        country: profile.country || 'United Kingdom' 
      }); 
    }
  }, [profile]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setSubmitting(true);
    try {
      const { phone, address, postcode, country } = form;
      const data = await api.put('/api/auth/profile', { phone, address, postcode, country });
      updateProfile(data.profile || data.user);
      toast.success('Profile updated successfully!');
    } catch (err) { 
      toast.error(err.message || 'Failed to update profile'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Company Profile</div>
          <div className="card-subtitle">Manage your verified organisation contact and address details</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-body">
            {/* Account Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px', background: 'var(--primary-light, #f0fdf4)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid #bbf7d0' }}>
              <div className="sidebar-avatar" style={{ width: 56, height: 56, fontSize: 20, background: 'var(--primary, #15803d)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {profile?.company_name?.slice(0, 2).toUpperCase() || profile?.full_name?.slice(0, 2).toUpperCase() || 'CP'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{profile?.company_name || 'Verified Client'}</div>
                <div style={{ color: 'var(--text-muted, #64748b)', fontSize: 13, marginTop: 2 }}>
                  Primary Contact: <strong>{profile?.full_name || '—'}</strong> ({profile?.email})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span className="badge badge-green" style={{ fontSize: 11, fontWeight: 700 }}>Certified Client</span>
                  <span style={{ fontSize: 11.5, color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <ShieldCheck size={13} /> Verified Organization
                  </span>
                </div>
              </div>
            </div>

            {/* Read-Only Information Note */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 20, fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
              <Info size={16} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Certified Entity Protection:</strong> For compliance with HFA halal certification standards, your <strong>Company Name</strong> and <strong>Full Name</strong> are locked and cannot be edited directly by clients. To request changes, please contact your HFA Account Executive or submit a support ticket.
              </div>
            </div>

            {/* Full Name & Phone */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Full Name 
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                    <Lock size={10} /> Locked
                  </span>
                </label>
                <input 
                  className="form-control" 
                  value={form.full_name} 
                  readOnly
                  disabled
                  style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 600 }}
                  title="Full name is locked. Contact HFA to request updates."
                />
                <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Lock size={10} /> Certified primary contact on file
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-control" value={form.phone} onChange={set('phone')} placeholder="e.g. +44 1234 567890" />
              </div>
            </div>

            {/* Company / Organisation */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Company / Organisation Name
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                  <Lock size={10} /> Locked
                </span>
              </label>
              <input 
                className="form-control" 
                value={form.company_name} 
                readOnly
                disabled
                style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 600 }}
                title="Company name is locked. Contact HFA to request updates."
              />
              <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Lock size={10} /> Registered company name matching your HFA certification agreements
              </span>
            </div>

            {/* Business Address */}
            <div className="form-group">
              <label className="form-label">Business Address</label>
              <input className="form-control" value={form.address} onChange={set('address')} placeholder="e.g. 123 Production Way" />
            </div>

            {/* Postcode & Country */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Postcode</label>
                <input className="form-control" value={form.postcode} onChange={set('postcode')} placeholder="e.g. SW1A 1AA" />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-control" value={form.country} onChange={set('country')} placeholder="e.g. United Kingdom" />
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border, #e2e8f0)', padding: '16px 20px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
