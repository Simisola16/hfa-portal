import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  Users, Plus, X, Trash2, Edit3, Shield, UserCheck, Key, 
  Copy, Check, Eye, EyeOff, Mail, Lock, AlertCircle, Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ManageUsersPage() {
  const { user: currentUser } = useAuth();
  const [subUsers, setSubUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'viewer', password: '' });
  
  // Credentials modal after user creation
  const [newCredentials, setNewCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);

  // Edit user modal
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: 'viewer', is_active: true });
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users/company/subusers');
      const list = res.data?.data || res.data || [];
      // If list doesn't include the current user, ensure current user is shown
      if (list.length === 0 && currentUser) {
        setSubUsers([{
          id: currentUser._id || currentUser.id,
          full_name: currentUser.full_name || currentUser.company_name || 'Account Owner',
          email: currentUser.email,
          role: 'owner',
          display_role: 'Account Owner',
          is_owner: true,
          created_at: currentUser.created_at || new Date()
        }]);
      } else {
        setSubUsers(list);
      }
    } catch (err) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/users/company/subusers', form);
      const createdUser = res.data?.user;
      const tempPass = res.data?.temp_password || form.password;

      toast.success('Team member created successfully!');
      setShowModal(false);
      
      // Open credentials view modal
      setNewCredentials({
        name: form.full_name,
        email: form.email,
        role: form.role,
        password: tempPass
      });

      setForm({ full_name: '', email: '', role: 'viewer', password: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (user) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || 'viewer',
      is_active: user.is_active !== undefined ? user.is_active : true
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    try {
      await api.put(`/api/users/company/subusers/${editingUser.id || editingUser._id}`, editForm);
      toast.success('Team member updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update member');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your team? They will no longer be able to log in.`)) return;
    try {
      await api.delete(`/api/users/company/subusers/${id}`);
      toast.success('Team member removed');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to remove member');
    }
  };

  const copyCredentials = () => {
    if (!newCredentials) return;
    const text = `HFA Client Portal Login Credentials:\nURL: ${window.location.origin}\nEmail: ${newCredentials.email}\nTemporary Password: ${newCredentials.password}\nRole: ${newCredentials.role.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="animate-in" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Top Header */}
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={26} style={{ color: 'var(--primary)' }} />
            Team & Portal Users
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Manage staff members and delegates authorized to access your company portal, view certificates, and submit applications.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowModal(true)} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontWeight: 700, borderRadius: 10 }}
        >
          <Plus size={16} /> Add Team Member
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title" style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Company Team Members ({subUsers.length})</div>
            <div className="card-subtitle" style={{ fontSize: 13, color: '#64748b' }}>Account owner and authorized delegates</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: '#f0fdf4', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0' }}>
              ✓ Multi-user Active
            </span>
          </div>
        </div>

        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto 10px' }} /><span style={{ color: '#64748b', fontSize: 13 }}>Loading team members...</span></div>
          ) : subUsers.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div className="empty-state-icon" style={{ margin: '0 auto 16px', background: '#f8fafc', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><Users size={28} /></div>
              <div className="empty-state-title" style={{ fontWeight: 700, fontSize: 16 }}>No Team Members Found</div>
              <div className="empty-state-text" style={{ fontSize: 13, color: '#64748b', maxWidth: 400, margin: '6px auto 16px' }}>Add team members to give your staff access to certificates and applications.</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Add Your First Member</button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Access Role</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date Added</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subUsers.map(u => (
                  <tr key={u.id || u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: u.is_owner ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #10b981, #047857)',
                          color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 14,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{u.full_name}</div>
                          {u.is_owner && <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>Primary Account Holder</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#334155', fontWeight: 500, fontSize: 13 }}>{u.email}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 14,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        background: u.is_owner ? '#dbeafe' : u.role === 'admin' ? '#fef3c7' : u.role === 'editor' ? '#e0e7ff' : '#f1f5f9',
                        color: u.is_owner ? '#1d4ed8' : u.role === 'admin' ? '#b45309' : u.role === 'editor' ? '#4338ca' : '#475569',
                        border: `1px solid ${u.is_owner ? '#bfdbfe' : u.role === 'admin' ? '#fde68a' : u.role === 'editor' ? '#c7d2fe' : '#e2e8f0'}`
                      }}>
                        <Shield size={11} />
                        {u.display_role || u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        color: u.is_active !== false ? '#15803d' : '#991b1b'
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.is_active !== false ? '#22c55e' : '#ef4444' }} />
                        {u.is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: 13 }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {u.is_owner ? (
                        <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontWeight: 600 }}>Account Owner</span>
                      ) : (
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#2563eb', padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff' }}
                            onClick={() => handleEditOpen(u)}
                            title="Edit Role & Permissions"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#ef4444', padding: '6px 8px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fef2f2' }}
                            onClick={() => handleDeleteUser(u.id || u._id, u.full_name)}
                            title="Remove user"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 540, borderRadius: 16, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light, #f0fdf4)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#0f172a' }}>Add Company Team Member</h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Provide access to portal features according to their role</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    className="form-control" 
                    placeholder="e.g. Sarah Jenkins"
                    value={form.full_name} 
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} 
                    required 
                    style={{ borderRadius: 8, height: 42 }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="colleague@company.com"
                    value={form.email} 
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                    required 
                    style={{ borderRadius: 8, height: 42 }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Portal Access Level <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    className="form-control" 
                    value={form.role} 
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    style={{ borderRadius: 8, height: 42, fontWeight: 600 }}
                  >
                    <option value="viewer">Viewer — Read-only access to certificates & applications</option>
                    <option value="editor">Editor — Can submit new applications & upload audit evidence</option>
                    <option value="admin">Admin — Full company portal access, billing & user management</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>
                      Initial Password (Optional)
                    </label>
                    <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>Auto-generated if blank</span>
                  </div>
                  <input 
                    type="password"
                    className="form-control" 
                    placeholder="Leave blank to auto-generate a secure password"
                    value={form.password} 
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                    style={{ borderRadius: 8, height: 42 }}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, display: 'block' }}>
                    A welcome email containing their login details will be dispatched immediately.
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ borderRadius: 8 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ borderRadius: 8, padding: '10px 20px', fontWeight: 700 }}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW USER CREDENTIALS MODAL */}
      {newCredentials && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNewCredentials(null)}>
          <div className="modal" style={{ maxWidth: 520, borderRadius: 16, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#15803d' }}>
                    User Created Successfully!
                  </h3>
                  <p style={{ fontSize: 12, color: '#166534', margin: '2px 0 0' }}>
                    New team member account is ready for use
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setNewCredentials(null)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700, marginBottom: 12 }}>
                  Account Details
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Full Name:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{newCredentials.name}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Login Email:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{newCredentials.email}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Role:</span>
                    <span style={{ fontWeight: 700, color: '#2563eb', textTransform: 'capitalize' }}>{newCredentials.role}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Temporary Password:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#0f172a', background: '#e2e8f0', padding: '2px 8px', borderRadius: 6 }}>
                        {showCreatedPassword ? newCredentials.password : '••••••••••••'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowCreatedPassword(!showCreatedPassword)} 
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: 2 }}
                      >
                        {showCreatedPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12.5, color: '#1e40af' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>Please share these credentials with your team member. They can update their password once logged in.</span>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={copyCredentials} 
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, fontWeight: 700 }}
              >
                {copied ? <Check size={16} color="#15803d" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Credentials'}
              </button>

              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => setNewCredentials(null)}
                style={{ borderRadius: 8, padding: '8px 20px', fontWeight: 700 }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER ROLE MODAL */}
      {editingUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingUser(null)}>
          <div className="modal" style={{ maxWidth: 500, borderRadius: 16, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Edit Team Member
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{editingUser.email}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setEditingUser(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdateUser}>
              <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Full Name
                  </label>
                  <input 
                    className="form-control" 
                    value={editForm.full_name} 
                    onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} 
                    required 
                    style={{ borderRadius: 8, height: 42 }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Portal Role
                  </label>
                  <select 
                    className="form-control" 
                    value={editForm.role} 
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    style={{ borderRadius: 8, height: 42, fontWeight: 600 }}
                  >
                    <option value="viewer">Viewer (View applications & certificates)</option>
                    <option value="editor">Editor (Create & submit applications)</option>
                    <option value="admin">Admin (Full company access & team management)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    <input 
                      type="checkbox" 
                      checked={editForm.is_active} 
                      onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    Active Account (Can log into portal)
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)} style={{ borderRadius: 8 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updating} style={{ borderRadius: 8, padding: '10px 20px', fontWeight: 700 }}>
                  {updating ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
