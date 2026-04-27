import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Save, User } from 'lucide-react';

export default function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const [form, setForm] = useState({ full_name:'', company_name:'', phone:'', address:'', postcode:'', country:'' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (profile) setForm({ full_name: profile.full_name||'', company_name: profile.company_name||'', phone: profile.phone||'', address: profile.address||'', postcode: profile.postcode||'', country: profile.country||'United Kingdom' }); }, [profile]);

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const data = await api.put('/api/auth/profile', form);
      updateProfile(data.profile);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Company Profile</div>
          <div className="card-subtitle">Update your organisation details</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
              <div className="sidebar-avatar" style={{ width: 56, height: 56, fontSize: 20, background: 'var(--primary)' }}>
                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{profile?.full_name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{profile?.email}</div>
                <span className="badge badge-green" style={{ marginTop: 4 }}>Client</span>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group"><label className="form-label">Full Name <span>*</span></label><input className="form-control" value={form.full_name} onChange={set('full_name')} required /></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={set('phone')} /></div>
            </div>
            <div className="form-group"><label className="form-label">Company / Organisation <span>*</span></label><input className="form-control" value={form.company_name} onChange={set('company_name')} required /></div>
            <div className="form-group"><label className="form-label">Business Address</label><input className="form-control" value={form.address} onChange={set('address')} /></div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Postcode</label><input className="form-control" value={form.postcode} onChange={set('postcode')} /></div>
              <div className="form-group"><label className="form-label">Country</label><input className="form-control" value={form.country} onChange={set('country')} /></div>
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
