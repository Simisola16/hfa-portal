import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Users, Plus, X, Trash2, Shield, UserCheck, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ManageUsersPage() {
  const { user: currentUser } = useAuth();
  const [subUsers, setSubUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'viewer', password: '' });

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
      await api.post('/api/users/company/subusers', form);
      toast.success('Team member added successfully!');
      setShowModal(false);
      setForm({ full_name: '', email: '', role: 'viewer', password: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your team?`)) return;
    try {
      await api.delete(`/api/users/company/subusers/${id}`);
      toast.success('Team member removed');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to remove member');
    }
  };

  return (
    <div className="animate-in">
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Team & Portal Users</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Manage users and staff who can access your company portal.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowModal(true)} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 700 }}
        >
          <Plus size={16} /> Add Team Member
        </button>
      </div>

      <div className="card" style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="card-title" style={{ fontSize: 16, fontWeight: 800 }}>Company Team Members ({subUsers.length})</div>
          <div className="card-subtitle" style={{ fontSize: 13, color: '#64748b' }}>Account owner and authorized secondary users</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : subUsers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users /></div>
              <div className="empty-state-title">No Users Found</div>
              <div className="empty-state-text">Add team members to give your staff access to certificates and applications.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Access Role</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subUsers.map(u => (
                  <tr key={u.id || u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: u.is_owner ? '#dbeafe' : '#f1f5f9',
                          color: u.is_owner ? '#1d4ed8' : '#475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13
                        }}>
                          {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.full_name}</div>
                          {u.is_owner && <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>Primary Account Holder</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#334155', fontWeight: 500 }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.is_owner ? 'badge-blue' : u.role === 'admin' ? 'badge-green' : 'badge-gray'}`} style={{ textTransform: 'capitalize', fontWeight: 700 }}>
                        {u.display_role || u.role}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {u.is_owner ? (
                        <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Primary Owner</span>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#ef4444', padding: '4px 8px' }}
                          onClick={() => handleDeleteUser(u.id || u._id, u.full_name)}
                          title="Remove user"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520, borderRadius: 16 }}>
            <div className="modal-header">
              <span className="modal-title" style={{ fontSize: 17, fontWeight: 800 }}>Add Company Team Member</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name <span>*</span></label>
                  <input 
                    className="form-control" 
                    placeholder="e.g. Sarah Jenkins"
                    value={form.full_name} 
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email Address <span>*</span></label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="colleague@company.com"
                    value={form.email} 
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Portal Access Level <span>*</span></label>
                  <select 
                    className="form-control" 
                    value={form.role} 
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  >
                    <option value="viewer">Viewer (Can view applications & certificates)</option>
                    <option value="editor">Editor (Can create & submit applications)</option>
                    <option value="admin">Admin (Full company access & manage team)</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Password (Optional)</label>
                  <input 
                    type="password"
                    className="form-control" 
                    placeholder="Leave blank to auto-generate a secure password"
                    value={form.password} 
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                  />
                  <span style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, display: 'block' }}>
                    If left blank, a random initial password will be created.
                  </span>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
