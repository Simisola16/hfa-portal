import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, MapPin, Edit, Trash2, X } from 'lucide-react';

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name:'', address:'', postcode:'', city:'', country:'United Kingdom', contact_name:'', contact_email:'', contact_phone:'', site_type:'', manufacturer_name:'', manufacturer_address:'', manufacturer_contact:'' });

  const fetch = () => { setLoading(true); api.get('/api/sites').then(d => setSites(d.data || [])).catch(() => toast.error('Failed')).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);
  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));
  const openEdit = (s) => { setEditing(s); setForm(s); setShowModal(true); };
  const openNew = () => { setEditing(null); setForm({ name:'', address:'', postcode:'', city:'', country:'United Kingdom', contact_name:'', contact_email:'', contact_phone:'', site_type:'', manufacturer_name:'', manufacturer_address:'', manufacturer_contact:'' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (editing) { await api.put(`/api/sites/${editing.id}`, form); toast.success('Site updated'); }
      else { await api.post('/api/sites', form); toast.success('Site added'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this site?')) return;
    try { await api.delete(`/api/sites/${id}`); toast.success('Deleted'); fetch(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={openNew} style={{ marginLeft: 'auto' }}><Plus size={15} /> Add Site</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Business Sites ({sites.length})</div></div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            sites.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"><MapPin /></div><div className="empty-state-title">No Sites Added</div></div>
            ) : (
              <table>
                <thead><tr><th>Site Name</th><th>Address</th><th>City</th><th>Contact</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {sites.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.address}, {s.postcode}</td>
                      <td>{s.city}</td>
                      <td>{s.contact_name}</td>
                      <td>{s.site_type || '—'}</td>
                      <td><span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{s.status}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><Edit size={13} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Site' : 'Add New Site'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Site Name <span>*</span></label><input className="form-control" value={form.name} onChange={set('name')} required /></div>
                  <div className="form-group"><label className="form-label">Site Type</label>
                    <select className="form-control" value={form.site_type} onChange={set('site_type')}>
                      <option value="">Select Type</option>
                      {['Factory','Abattoir','Restaurant','Retail Store','Warehouse','Office'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Address <span>*</span></label><input className="form-control" value={form.address} onChange={set('address')} required /></div>
                <div className="form-grid-3">
                  <div className="form-group"><label className="form-label">City</label><input className="form-control" value={form.city} onChange={set('city')} /></div>
                  <div className="form-group"><label className="form-label">Postcode</label><input className="form-control" value={form.postcode} onChange={set('postcode')} /></div>
                  <div className="form-group"><label className="form-label">Country</label><input className="form-control" value={form.country} onChange={set('country')} /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Contact Name</label><input className="form-control" value={form.contact_name} onChange={set('contact_name')} /></div>
                  <div className="form-group"><label className="form-label">Contact Email</label><input type="email" className="form-control" value={form.contact_email} onChange={set('contact_email')} /></div>
                </div>
                <div className="form-group"><label className="form-label">Contact Phone</label><input className="form-control" value={form.contact_phone} onChange={set('contact_phone')} /></div>

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🏭 Manufacturer Details (If Different)</p>
                  <div className="form-group"><label className="form-label">Manufacturer Name</label><input className="form-control" value={form.manufacturer_name} onChange={set('manufacturer_name')} /></div>
                  <div className="form-group"><label className="form-label">Manufacturer Address</label><textarea className="form-control" rows={2} value={form.manufacturer_address} onChange={set('manufacturer_address')} /></div>
                  <div className="form-group"><label className="form-label">Manufacturer Contact (Name/Email/Phone)</label><input className="form-control" value={form.manufacturer_contact} onChange={set('manufacturer_contact')} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (editing ? 'Update' : 'Add Site')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
