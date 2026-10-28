import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Save, ShieldCheck, Info, Eye, EyeOff, Key, CheckCircle2,
} from 'lucide-react';

// ── Password strength helper ──────────────────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: '',          color: '' },
    { label: 'Very Weak', color: '#ef4444' },
    { label: 'Weak',      color: '#f97316' },
    { label: 'Fair',      color: '#eab308' },
    { label: 'Good',      color: '#22c55e' },
    { label: 'Strong',    color: '#15803d' },
  ];
  return { score, ...map[score] };
}

export default function ProfilePage() {
  const { profile, updateProfile } = useAuth();

  // ── Profile form state ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    full_name: '', company_name: '', phone: '', address: '', postcode: '', country: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // ── Password change state ────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwChanged, setPwChanged] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name:    profile.full_name    || '',
        company_name: profile.company_name || '',
        phone:        profile.phone        || '',
        address:      profile.address      || '',
        postcode:     profile.postcode     || '',
        country:      profile.country      || 'United Kingdom',
      });
    }
  }, [profile]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setPw = (k) => (e) => setPwForm(f => ({ ...f, [k]: e.target.value }));

  // ── Submit profile update ────────────────────────────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name?.trim()) {
      toast.error('Full Name is required.');
      return;
    }
    if (!form.company_name?.trim()) {
      toast.error('Company / Organisation Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const { full_name, company_name, phone, address, postcode, country } = form;
      const data = await api.put('/api/auth/profile', {
        full_name,
        company_name,
        phone,
        address,
        postcode,
        country
      });
      updateProfile(data.profile || data.user);
      toast.success('Profile updated successfully! All HFA staff have been notified.');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit password change ───────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword) { toast.error('Please enter your current password.'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (pwForm.currentPassword === pwForm.newPassword) { toast.error('New password must be different from the current one.'); return; }

    setPwSubmitting(true);
    try {
      await api.post('/api/auth/profile/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      setPwChanged(true);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully! A security notice has been sent to your email and all HFA staff.');
      setTimeout(() => setPwChanged(false), 8000);
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setPwSubmitting(false);
    }
  };

  const pwStrength = getPasswordStrength(pwForm.newPassword);

  return (
    <div style={{ maxWidth: 720 }}>

      {/* ── COMPANY PROFILE CARD ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Company Profile</div>
          <div className="card-subtitle">Manage your verified organisation contact and address details</div>
        </div>
        <form onSubmit={handleProfileSubmit}>
          <div className="card-body">

            {/* Account Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px', background: 'var(--primary-light, #f0fdf4)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid #bbf7d0' }}>
              <div className="sidebar-avatar" style={{ width: 56, height: 56, fontSize: 20, background: 'var(--primary, #15803d)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                {profile?.company_name?.slice(0, 2).toUpperCase() || profile?.full_name?.slice(0, 2).toUpperCase() || 'CP'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.company_name || 'Verified Client'}</div>
                <div style={{ color: 'var(--text-muted, #64748b)', fontSize: 13, marginTop: 2 }}>
                  Primary Contact: <strong>{profile?.full_name || '—'}</strong> ({profile?.email})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-green" style={{ fontSize: 11, fontWeight: 700 }}>Certified Client</span>
                  <span style={{ fontSize: 11.5, color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <ShieldCheck size={13} /> Verified Organization
                  </span>
                </div>
              </div>
            </div>

            {/* Staff Notification Notice */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 20, fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
              <Info size={16} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Staff Notification:</strong> You can edit your <strong>Full Name</strong>, <strong>Company / Organisation Name</strong>, and contact details below. Whenever you save changes, all HFA staff are automatically notified of your updated details so your certification records and files remain accurate.
              </div>
            </div>

            {/* Full Name & Phone */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="form-control"
                  value={form.full_name}
                  onChange={set('full_name')}
                  placeholder="e.g. Lekan Ola"
                  required
                />
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
                  Certified primary contact on file
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-control" value={form.phone} onChange={set('phone')} placeholder="e.g. +44 1234 567890" />
              </div>
            </div>

            {/* Company / Organisation Name */}
            <div className="form-group">
              <label className="form-label">
                Company / Organisation Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="form-control"
                value={form.company_name}
                onChange={set('company_name')}
                placeholder="e.g. Anike International Ltd"
                required
              />
              <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
                Registered company name matching your HFA certification agreements
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

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border, #e2e8f0)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : <><Save size={14} /> Save Changes</>}
            </button>
            <span style={{ fontSize: 12, color: '#64748b' }}>HFA staff will be notified of any changes you save.</span>
          </div>
        </form>
      </div>

      {/* ── ACCOUNT & SECURITY CARD ────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} style={{ color: '#15803d' }} />
            <div className="card-title">Account &amp; Security</div>
          </div>
          <div className="card-subtitle">Change your portal login password</div>
        </div>
        <form onSubmit={handlePasswordSubmit}>
          <div className="card-body">

            {/* Success banner */}
            {pwChanged && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 20, fontSize: 13.5, color: '#15803d', fontWeight: 600 }}>
                <CheckCircle2 size={18} />
                Password changed successfully! A security confirmation has been sent to your email and all HFA staff.
              </div>
            )}

            {/* Security notice */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 20, fontSize: 12.5, color: '#1d4ed8', lineHeight: 1.5 }}>
              <Info size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Security Notice:</strong> For your protection, all HFA staff are automatically notified whenever a client password is changed. If you did not initiate a change, contact <strong>portals@halalfoodauthority.com</strong> immediately.
              </div>
            </div>

            {/* Current Password */}
            <div className="form-group">
              <label className="form-label">Current Password <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showCurrent ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={setPw('currentPassword')}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}
                  tabIndex={-1}
                  aria-label="Toggle current password visibility"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="form-group">
              <label className="form-label">New Password <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showNew ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={setPw('newPassword')}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}
                  tabIndex={-1}
                  aria-label="Toggle new password visibility"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {pwForm.newPassword && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4,5].map(i => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: i <= pwStrength.score ? pwStrength.color : '#e2e8f0',
                          transition: 'background 0.25s',
                        }}
                      />
                    ))}
                  </div>
                  {pwStrength.label && (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: pwStrength.color }}>{pwStrength.label}</span>
                  )}
                </div>
              )}
              <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 5 }}>
                Use 8+ characters with a mix of upper/lowercase letters, numbers, and symbols.
              </span>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">Confirm New Password <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showConfirm ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={setPw('confirmPassword')}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  style={{
                    paddingRight: 44,
                    borderColor: pwForm.confirmPassword
                      ? pwForm.newPassword === pwForm.confirmPassword ? '#22c55e' : '#ef4444'
                      : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}
                  tabIndex={-1}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <span style={{ fontSize: 11.5, color: '#ef4444', marginTop: 4, display: 'block' }}>Passwords do not match</span>
              )}
              {pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword && pwForm.newPassword && (
                <span style={{ fontSize: 11.5, color: '#22c55e', marginTop: 4, display: 'block', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={12} /> Passwords match
                </span>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border, #e2e8f0)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pwSubmitting || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
            >
              {pwSubmitting
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : <><Key size={14} /> Change Password</>}
            </button>
            <span style={{ fontSize: 12, color: '#64748b' }}>A security email will be sent to you and all HFA staff.</span>
          </div>
        </form>
      </div>

    </div>
  );
}
