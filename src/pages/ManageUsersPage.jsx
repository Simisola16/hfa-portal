import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Users, Plus, X } from 'lucide-react';

export default function ManageUsersPage() {
  const [subUsers, setSubUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name:'', email:'', role:'viewer' });

  const fetch = () => { setLoading(true); api.get('/api/users/company/subusers').then(d=>setSubUsers(d.data||[])).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{fetch();},[]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await api.post('/api/users/company/subusers', form); toast.success('User added'); setShowModal(false); setForm({full_name:'',email:'',role:'viewer'}); fetch(); }
    catch(err){toast.error(err.message);} finally{setSubmitting(false);}
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={()=>setShowModal(true)} style={{marginLeft:'auto'}}><Plus size={15}/> Add User</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Team Members</div><div className="card-subtitle">Manage who can access your company portal</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            subUsers.length===0?(
              <div className="empty-state"><div className="empty-state-icon"><Users/></div><div className="empty-state-title">No Sub-Users</div><div className="empty-state-text">Add team members to share portal access</div></div>
            ):(
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Added</th></tr></thead>
                <tbody>
                  {subUsers.map(u=>(
                    <tr key={u.id}>
                      <td style={{fontWeight:600}}>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td><span className="badge badge-blue" style={{textTransform:'capitalize'}}>{u.role}</span></td>
                      <td>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
      {showModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">Add Team Member</span><button className="modal-close" onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Full Name <span>*</span></label><input className="form-control" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required/></div>
                <div className="form-group"><label className="form-label">Email <span>*</span></label><input type="email" className="form-control" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/></div>
                <div className="form-group"><label className="form-label">Role</label>
                  <select className="form-control" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?<span className="spinner" style={{width:16,height:16}}/>:'Add User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
