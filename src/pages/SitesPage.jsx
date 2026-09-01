import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, MapPin, Edit, Trash2, X } from 'lucide-react';
import FirstSiteCreatedModal from '../components/FirstSiteCreatedModal';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSiteName, setCreatedSiteName] = useState('');

  const fetch = () => {
    setLoading(true);
    api.get('/api/sites')
      .then(d => setSites(Array.isArray(d) ? d : (d?.data || [])))
      .catch(err => {
        console.error('SitesPage fetch error:', err);
        toast.error('Failed to fetch sites');
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));
  const openEdit = (s) => { setEditing(s); setForm({...initialForm, ...s}); setShowModal(true); };
  const openNew = () => { setEditing(null); setForm(initialForm); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const wasFirstSite = sites.length === 0;
    const siteTitle = form.name || form.est_name || 'Manufacturing Site';
    try {
      if (editing) {
        await api.put(`/api/sites/${editing.id}`, form);
        toast.success('Site updated successfully');
      } else {
        await api.post('/api/sites', form);
        toast.success('Site added successfully');
        if (wasFirstSite) {
          setCreatedSiteName(siteTitle);
          setShowSuccessModal(true);
        }
      }
      setShowModal(false);
      fetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
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
        <button className="btn btn-primary" onClick={openNew} style={{ marginLeft: 'auto' }}><Plus size={18} /> Add Manufacturing Site</button>
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
                      <td><span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{s.status ? (s.status.charAt(0).toUpperCase() + s.status.slice(1)) : 'Active'}</span></td>
                      <td>
                        <button 
                          className="btn btn-outline btn-sm" 
                          onClick={() => openEdit(s)} 
                          title="Edit Site Details"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px' }}
                        >
                          <Edit size={13} /> Edit
                        </button>
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
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B7A7A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={18} /> Site Details
                  </h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="form-label" style={{ margin: 0 }}>Site Name <span>*</span></label>
                        {editing && (
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Locked (cannot be changed)</span>
                        )}
                      </div>
                      <input 
                        className="form-control" 
                        placeholder="Site / Facility Name" 
                        value={form.name} 
                        onChange={set('name')} 
                        required 
                        disabled={!!editing}
                        style={editing ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#334155' } : {}}
                      />
                      {editing && (
                        <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                          Site name is permanent. You can edit all other address and contact details below.
                        </span>
                      )}
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
                        <option value="United Arab Emirates">United Arab Emirates</option>
                        <option value="Saudi Arabia">Saudi Arabia</option>
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
                        <option value="+971">+971</option>
                        <option value="+966">+966</option>
                      </select>
                      <input className="form-control" style={{ flex: 1 }} placeholder="7123 456789" value={form.contact_phone_number} onChange={set('contact_phone_number')} required />
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

      {/* Pop up when first site is created to guide client to application */}
      <FirstSiteCreatedModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        siteName={createdSiteName}
      />
    </div>
  );
}
