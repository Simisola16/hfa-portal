import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Package, Edit, Trash2, X, PlusCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PRODUCT_TYPES = ['Add product', 'Remove product', 'Change name/code', 'Change ingredient'];

const formatSiteName = (str) => {
  if (!str) return 'Site';
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
};

const getSiteName = (c) => {
  if (!c) return 'Main Facility';
  let raw = '';
  const siteObj = c.site_id;
  if (siteObj && typeof siteObj === 'object') {
    raw = siteObj.name || siteObj.est_name || siteObj.trading_name;
  }
  if (!raw) {
    const appObj = c.application_id;
    if (appObj && typeof appObj === 'object') {
      raw = appObj.establishment_name || appObj.site_name;
    }
  }
  if (!raw) raw = c.site_name || 'Main Facility';
  return formatSiteName(raw);
};

export default function ProductsPage({ openNew: openNewProp }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Single product form for Edit
  const [form, setForm] = useState({ name: '', description: '', ingredients: '', product_type: '', barcode: '', category: '' });

  // Bulk add form for New Product
  const [bulkForm, setBulkForm] = useState({
    certificate_id: '',
    contact_name: '',
    contact_number: '',
    contact_email: '',
    subject: '',
    message: ''
  });
  const [productList, setProductList] = useState([{ id: 1, name: '', code: '', type: 'Add product' }]);

  const fetch = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/products').then(d => setProducts(d.data || [])).catch(() => toast.error('Failed to load products')),
      api.get('/api/certificates').then(d => {
        const active = (d.data || []).filter(c => c.status === 'active' && new Date(c.expiry_date) >= new Date());
        setCerts(active);
      }).catch(() => {})
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  useEffect(() => {
    if (openNewProp) openNew();
  }, [openNewProp]);

  const setF = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));
  const setB = (k) => (e) => setBulkForm(b => ({...b, [k]: e.target.value}));

  const openEdit = (p) => { setEditing(p); setForm(p); setShowModal(true); };
  const openNew = () => { 
    setEditing(null); 
    const defaultCertId = certs.length === 1 ? (certs[0]._id || certs[0].id) : '';
    setBulkForm({
      certificate_id: defaultCertId,
      contact_name: user?.full_name || user?.company_name || '',
      contact_number: user?.phone || '',
      contact_email: user?.email || '',
      subject: '',
      message: ''
    });
    setProductList([{ id: 1, name: '', code: '', type: 'Add product' }]);
    setShowModal(true); 
  };

  const addProductRow = () => {
    setProductList([...productList, { id: productList.length + 1, name: '', code: '', type: 'Add product' }]);
  };

  const updateProductRow = (index, field, value) => {
    const newList = [...productList];
    newList[index][field] = value;
    setProductList(newList);
  };

  const removeProductRow = (index) => {
    if (productList.length > 1) {
      setProductList(productList.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) { 
        await api.put(`/api/products/${editing.id || editing._id}`, form); 
        toast.success('Product updated'); 
      } else { 
        // Bulk add products through Add-on Application flow
        const validProducts = productList.filter(p => p.name.trim() !== '');
        if (validProducts.length === 0) throw new Error('Please add at least one product name');
        if (!bulkForm.contact_name?.trim()) throw new Error('Contact Person Name is required');
        if (!bulkForm.contact_email?.trim()) throw new Error('Contact Person Email is required');

        const payload = {
          certificate_id: bulkForm.certificate_id || (certs.length === 1 ? (certs[0]._id || certs[0].id) : undefined),
          contact_name: bulkForm.contact_name.trim(),
          contact_email: bulkForm.contact_email.trim(),
          contact_phone: bulkForm.contact_number.trim(),
          message: bulkForm.subject ? `Subject: ${bulkForm.subject}\n\n${bulkForm.message}` : bulkForm.message,
          products: validProducts.map(prod => ({
            name: prod.name.trim(),
            code: prod.code?.trim() || '',
            type: prod.type === 'Change ingredient' ? 'Change ingredients' : prod.type
          }))
        };

        await api.post('/api/add-on-applications', payload);
        toast.success(`${validProducts.length} product(s) submitted! Following the Add-on approval workflow.`); 
      }
      setShowModal(false);
      fetch();
    } catch (err) { 
      toast.error(err.response?.data?.error || err.message || 'Failed to save'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await api.delete(`/api/products/${id}`); toast.success('Deleted'); fetch(); }
    catch (err) { toast.error(err.message); }
  };

  const filtered = products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button 
          className="btn btn-outline" 
          onClick={() => navigate('/addon-applications')} 
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Package size={15} /> Add-on Requests <ArrowRight size={14} />
        </button>
        <button className="btn btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Product List ({filtered.length})</div></div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Package /></div>
                <div className="empty-state-title">No Products Yet</div>
                <div className="empty-state-text">Add your certified products</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Product Type</th>
                    <th>Barcode / SKU</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id || p._id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                      <td>{p.category || '—'}</td>
                      <td>{p.product_type || '—'}</td>
                      <td><code style={{ fontSize: 12 }}>{p.barcode || '—'}</code></td>
                      <td>
                        <span className={`badge ${p.status === 'approved' || p.status === 'active' ? 'badge-green' : p.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                          {p.status === 'active' ? 'Certified' : (p.status || 'Active')}
                        </span>
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
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ padding: '20px' }}>
          <div className="modal" style={{ maxWidth: editing ? '500px' : '1000px', width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
              <span className="modal-title" style={{ fontSize: '16px', fontWeight: 700 }}>{editing ? 'Edit Product' : 'Add New Product (Add-on Request)'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {editing ? (
                // OLD EDIT FORM
                <div className="modal-body">
                  <div className="form-group"><label className="form-label">Product Name <span>*</span></label><input className="form-control" value={form.name} onChange={setF('name')} required /></div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Category</label><input className="form-control" value={form.category} onChange={setF('category')} placeholder="e.g. Meat, Snacks, Dairy" /></div>
                    <div className="form-group">
                      <label className="form-label">Product Type</label>
                      <select className="form-control" value={form.product_type || ''} onChange={setF('product_type')}>
                        <option value="">Select Type</option>
                        {PRODUCT_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group"><label className="form-label">Barcode / SKU</label><input className="form-control" value={form.barcode} onChange={setF('barcode')} /></div>
                  <div className="form-group"><label className="form-label">Ingredients</label><textarea className="form-control" value={form.ingredients} onChange={setF('ingredients')} placeholder="List main ingredients..." /></div>
                  <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" value={form.description} onChange={setF('description')} /></div>
                </div>
              ) : (
                // NATIVE UI FOR NEW PRODUCTS
                <div className="modal-body" style={{ background: '#f9fafb' }}>
                  
                  {/* Section 0: Certified Site (if available) */}
                  {certs.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Certified Facility / Site</h4>
                      {certs.length === 1 ? (
                        <div style={{ padding: '10px 14px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13, color: '#334155' }}>
                          {getSiteName(certs[0])} ({certs[0].certificate_number})
                        </div>
                      ) : (
                        <div className="form-group" style={{ margin: 0 }}>
                          <select className="form-control" value={bulkForm.certificate_id} onChange={setB('certificate_id')}>
                            <option value="">-- Select Facility / Certificate --</option>
                            {certs.map(c => (
                              <option key={c._id || c.id} value={c._id || c.id}>{getSiteName(c)} ({c.certificate_number})</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0 20px' }}></div>
                    </div>
                  )}

                  {/* Section 1: Contact Person */}
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Contact Person</h4>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Name <span>*</span></label>
                      <input className="form-control" required value={bulkForm.contact_name} onChange={setB('contact_name')} placeholder="Full Name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number <span>*</span></label>
                      <input className="form-control" required value={bulkForm.contact_number} onChange={setB('contact_number')} placeholder="+44..." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-mail <span>*</span></label>
                      <input type="email" className="form-control" required value={bulkForm.contact_email} onChange={setB('contact_email')} placeholder="email@example.com" />
                    </div>
                  </div>

                  {/* Section 2: Message */}
                  <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 24px' }}></div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Message</h4>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input className="form-control" value={bulkForm.subject} onChange={setB('subject')} placeholder="Application Subject" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message Content</label>
                    <textarea className="form-control" value={bulkForm.message} onChange={setB('message')} placeholder="Any additional details..." style={{ minHeight: '100px' }} />
                  </div>

                  {/* Section 3: Products (TYPE) */}
                  <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 24px' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Products to Add</h4>
                  </div>
                  
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fff', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#f3f4f6' }}>
                        <tr>
                          <th style={{ padding: '10px 16px', width: '50px', textAlign: 'center' }}>ID</th>
                          <th style={{ padding: '10px 16px' }}>Product Name</th>
                          <th style={{ padding: '10px 16px' }}>Code / SKU</th>
                          <th style={{ padding: '10px 16px', width: '220px' }}>Type</th>
                          <th style={{ padding: '10px 16px', width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {productList.map((prod, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{prod.id}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <input className="form-control" value={prod.name} onChange={e => updateProductRow(index, 'name', e.target.value)} required placeholder="Name" />
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <input className="form-control" value={prod.code} onChange={e => updateProductRow(index, 'code', e.target.value)} placeholder="Code" />
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <select className="form-control" value={prod.type || 'Add product'} onChange={e => updateProductRow(index, 'type', e.target.value)}>
                                {PRODUCT_TYPES.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                              <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeProductRow(index)} style={{ color: 'var(--text-muted)' }}>
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding: '12px 16px', background: '#f9fafb', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={addProductRow}>
                        <Plus size={14} /> Add Another Product
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-footer" style={{ background: '#fff' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (editing ? 'Update Product' : 'Submit Products')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
