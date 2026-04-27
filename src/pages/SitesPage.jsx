import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, MapPin, Edit, Trash2, X } from 'lucide-react';

export default function SitesPage() {
  const initialForm = {
    name: '', email: '', address_1: '', address_2: '', postcode: '', state: '', country: 'United Kingdom', city: '', contact_name: '', contact_phone_code: '+44', contact_phone_number: '',
    est_name: '', reg_number: '', vat_number: '', head_office_address: '', years_in_business: '', trading_name: '', website: '', mfg_email: '', operating_hours: '', num_employees: '',
    client_code: '', client_category: ''
  };

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);

  const fetch = () => { setLoading(true); api.get('/api/sites').then(d => setSites(d.data || [])).catch(() => toast.error('Failed to fetch sites')).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));
  const openEdit = (s) => { setEditing(s); setForm({...initialForm, ...s}); setShowModal(true); };
  const openNew = () => { setEditing(null); setForm(initialForm); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (editing) { await api.put(`/api/sites/${editing.id}`, form); toast.success('Site updated successfully'); }
      else { await api.post('/api/sites', form); toast.success('Site added successfully'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this site?')) return;
    try { await api.delete(`/api/sites/${id}`); toast.success('Site deleted'); fetch(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="animate-fade-in">
      <div className="toolbar">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1B7A7A' }}>Manage Sites</h1>
        <button className="btn btn-primary" onClick={openNew} style={{ marginLeft: 'auto' }}><Plus size={18} /> Add Site</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Business Sites List ({sites.length})</div>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            sites.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><MapPin size={40} /></div>
                <div className="empty-state-title">No Sites Registered</div>
                <p>Add your first business site to start the certification process.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Site Name</th>
                    <th>Site Address</th>
                    <th>Contact Name</th>
                    <th>Contact Number</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, color: '#1B7A7A' }}>{s.name}</td>
                      <td>{s.address_1}{s.city ? `, ${s.city}` : ''}</td>
                      <td>{s.contact_name}</td>
                      <td>{s.contact_phone_code} {s.contact_phone_number}</td>
                      <td><span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{s.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} title="Edit Site"><Edit size={14} /></button>
                          <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(s.id)} title="Delete Site"><Trash2 size={14} /></button>
                        </div>
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
          <div className="modal" style={{ maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white' }}>
              <span className="modal-title">{editing ? 'Edit Site Details' : 'Add New Site'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Section 1: Site Details */}
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B7A7A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={18} /> Site Details
                  </h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Site Name <span>*</span></label>
                      <input className="form-control" placeholder="Manufacturer Name" value={form.name} onChange={set('name')} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email <span>*</span></label>
                      <input type="email" className="form-control" placeholder="site@company.com" value={form.email} onChange={set('email')} required />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Address 1 <span>*</span></label>
                      <input className="form-control" placeholder="Street Address" value={form.address_1} onChange={set('address_1')} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Address 2</label>
                      <input className="form-control" placeholder="Apartment, suite, etc." value={form.address_2} onChange={set('address_2')} />
                    </div>
                  </div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input className="form-control" value={form.city} onChange={set('city')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Postcode <span>*</span></label>
                      <input className="form-control" value={form.postcode} onChange={set('postcode')} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State <span>*</span></label>
                      <input className="form-control" value={form.state} onChange={set('state')} required />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Country <span>*</span></label>
                      <select className="form-control" value={form.country} onChange={set('country')} required>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Nigeria">Nigeria</option>
                        {/* Add more countries as needed */}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Name <span>*</span></label>
                      <input className="form-control" value={form.contact_name} onChange={set('contact_name')} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Number <span>*</span></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="form-control" style={{ width: 100 }} value={form.contact_phone_code} onChange={set('contact_phone_code')}>
                        <option value="+44">+44</option>
                        <option value="+234">+234</option>
                      </select>
                      <input className="form-control" style={{ flex: 1 }} placeholder="7123 456789" value={form.contact_phone_number} onChange={set('contact_phone_number')} required />
                    </div>
                  </div>
                </div>

                {/* Section 2: Manufacturer Details */}
                <div style={{ marginBottom: 32, padding: 24, background: '#f8fafc', borderRadius: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B7A7A', marginBottom: 16 }}>Manufacturer Details (if different)</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Name of establishment</label>
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
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Trading Name</label>
                      <input className="form-control" value={form.trading_name} onChange={set('trading_name')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={form.mfg_email} onChange={set('mfg_email')} />
                    </div>
                  </div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Years in Business</label>
                      <input className="form-control" value={form.years_in_business} onChange={set('years_in_business')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Operating Hours</label>
                      <input className="form-control" value={form.operating_hours} onChange={set('operating_hours')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. of Employees</label>
                      <input className="form-control" value={form.num_employees} onChange={set('num_employees')} />
                    </div>
                  </div>
                </div>

                {/* Section 3: Existing Client */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B7A7A', marginBottom: 16 }}>Existing Client Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Client Code</label>
                      <input className="form-control" value={form.client_code} onChange={set('client_code')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-control" value={form.client_category} onChange={set('client_category')}>
                        <option value="">Select Category</option>
                        <option value="A">Category A</option>
                        <option value="B">Category B</option>
                        <option value="C">Category C</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ position: 'sticky', bottom: 0, zIndex: 10, background: 'white', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (editing ? 'Save Changes' : 'Submit Site')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
