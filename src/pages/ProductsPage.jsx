import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Package, Edit, Trash2, X, PlusCircle, ExternalLink, ArrowRight, MapPin, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PRODUCT_TYPES = ['Add product', 'Remove product', 'Change name/code', 'Change ingredient'];

const formatSiteName = (str) => {
  if (!str) return 'Main Facility';
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
};

export default function ProductsPage({ openNew: openNewProp }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [sites, setSites] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Single product form for Edit
  const [form, setForm] = useState({ name: '', description: '', ingredients: '', product_type: '', barcode: '', category: '', site_id: '' });

  // Bulk add form for New Product
  const [bulkForm, setBulkForm] = useState({
    site_id: '',
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
      api.get('/api/sites').then(d => setSites(d.data || [])).catch(() => {}),
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

  const openEdit = (p) => { 
    setEditing(p); 
    setForm({
      ...p,
      site_id: p.site_id?._id || p.site_id?.id || p.site_id || ''
    }); 
    setShowModal(true); 
  };

  const openNew = () => { 
    setEditing(null); 
    const defaultCertId = certs.length === 1 ? (certs[0]._id || certs[0].id) : '';
    const defaultSiteId = sites.length === 1 ? (sites[0]._id || sites[0].id) : '';
    setBulkForm({
      site_id: defaultSiteId,
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
        if (sites.length > 0 && !bulkForm.site_id) {
          throw new Error('Please select the manufacturing site for these products.');
        }
        if (!bulkForm.contact_name?.trim()) throw new Error('Contact Person Name is required');
        if (!bulkForm.contact_email?.trim()) throw new Error('Contact Person Email is required');

        const payload = {
          site_id: bulkForm.site_id || undefined,
          certificate_id: bulkForm.certificate_id || (certs.length === 1 ? (certs[0]._id || certs[0].id) : undefined),
          contact_name: bulkForm.contact_name.trim(),
          contact_email: bulkForm.contact_email.trim(),
          contact_phone: bulkForm.contact_number.trim(),
          message: bulkForm.subject ? `Subject: ${bulkForm.subject}\n\n${bulkForm.message}` : bulkForm.message,
          products: validProducts.map(prod => ({
            name: prod.name.trim(),
            code: prod.code?.trim() || '',
            type: 'Add product'
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

  const filtered = products.filter(p => {
    const matchSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      (p.code || p.barcode || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase());
    const prodSiteId = p.site_id?._id || p.site_id?.id || p.site_id;
    const matchSite = !filterSite || String(prodSiteId) === String(filterSite);
    return matchSearch && matchSite;
  });

  return (
    <div>
      <div className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search products by name, code, category..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filter by Site */}
        {sites.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={15} style={{ color: '#64748b' }} />
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: 170, fontWeight: 600, fontSize: 13 }}
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
            >
              <option value="">All Manufacturing Sites ({sites.length})</option>
              {sites.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name || s.est_name || s.trading_name || s.address_1}
                </option>
              ))}
            </select>
          </div>
        )}

        <button 
          className="btn btn-outline" 
          onClick={() => navigate('/addon-applications')} 
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Package size={15} /> Add-on Requests <ArrowRight size={14} />
        </button>
        <button className="btn btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#059669', borderColor: '#059669' }}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title">Certified Product List ({filtered.length})</div>
            <div className="card-subtitle">View and filter verified products across your registered manufacturing facilities</div>
          </div>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Package /></div>
                <div className="empty-state-title">No Products Found</div>
                <div className="empty-state-text">
                  {filterSite ? 'No products registered under the selected site.' : 'Add your certified products to start managing them.'}
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Manufacturing Site</th>
                    <th>Category</th>
                    <th>Code / SKU</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const siteObj = p.site_id;
                    const siteName = (siteObj && typeof siteObj === 'object')
                      ? (siteObj.name || siteObj.est_name || siteObj.trading_name || siteObj.address_1)
                      : (p.site_name || 'Main Facility');

                    return (
                      <tr key={p.id || p._id}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#1e293b' }}>
                            <MapPin size={13} style={{ color: '#059669', flexShrink: 0 }} />
                            <span>{siteName}</span>
                          </div>
                        </td>
                        <td>{p.category || '—'}</td>
                        <td><code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{p.code || p.barcode || '—'}</code></td>
                        <td>
                          <span className={`badge ${p.status === 'rejected' ? 'badge-red' : p.status === 'pending' ? 'badge-yellow' : 'badge-green'}`} style={{ textTransform: 'capitalize' }}>
                            {p.status === 'rejected' ? 'Rejected' : (p.status === 'pending' ? 'Pending' : 'Approved')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ padding: '20px' }}>
          <div className="modal" style={{ maxWidth: editing ? '500px' : '900px', width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} style={{ color: '#059669' }} />
                <span className="modal-title" style={{ fontSize: '16px', fontWeight: 700 }}>
                  {editing ? 'Edit Product' : 'Add New Product (Add-on Request)'}
                </span>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {editing ? (
                // EDIT FORM
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Product Name <span>*</span></label>
                    <input className="form-control" value={form.name} onChange={setF('name')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manufacturing Site</label>
                    <select className="form-control" value={form.site_id} onChange={setF('site_id')}>
                      <option value="">-- Main Facility / No Site Specific --</option>
                      {sites.map(s => (
                        <option key={s._id || s.id} value={s._id || s.id}>
                          {s.name || s.est_name || s.trading_name || s.address_1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Category</label><input className="form-control" value={form.category} onChange={setF('category')} placeholder="e.g. Meat, Snacks, Dairy" /></div>
                    <div className="form-group"><label className="form-label">Code</label><input className="form-control" value={form.code || form.barcode || ''} onChange={setF('code')} placeholder="e.g. PRD-001" /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Ingredients</label><textarea className="form-control" value={form.ingredients} onChange={setF('ingredients')} placeholder="List main ingredients..." /></div>
                  <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" value={form.description} onChange={setF('description')} /></div>
                </div>
              ) : (
                // NATIVE UI FOR NEW PRODUCTS (WITH SITE PICKER)
                <div className="modal-body" style={{ background: '#f9fafb' }}>

                  {/* Section 0: Manufacturing Site Selection */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, marginBottom: 20 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={16} style={{ color: '#059669' }} />
                      Manufacturing Site <span style={{ color: '#dc2626' }}>*</span>
                    </h4>
                    
                    {sites.length > 0 ? (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>
                          Select which of your certified sites manufactures these products:
                        </label>
                        <select
                          className="form-control"
                          required
                          value={bulkForm.site_id}
                          onChange={setB('site_id')}
                          style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}
                        >
                          <option value="">-- Choose Manufacturing Site --</option>
                          {sites.map(s => (
                            <option key={s._id || s.id} value={s._id || s.id}>
                              {s.name || s.est_name || s.trading_name} {s.address_1 ? `— ${s.address_1}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', color: '#92400e', fontSize: 12 }}>
                        No specific manufacturing site detected on your profile. The products will be linked to your main company facility.
                      </div>
                    )}
                  </div>

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
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Message &amp; Details</h4>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input className="form-control" value={bulkForm.subject} onChange={setB('subject')} placeholder="e.g. New Product Addition Request" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message Content</label>
                    <textarea className="form-control" value={bulkForm.message} onChange={setB('message')} placeholder="Provide any additional specifications or production line details..." style={{ minHeight: '80px' }} />
                  </div>

                  {/* Section 3: Products */}
                  <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 24px' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Products to Add</h4>
                  </div>
                  
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fff', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#f3f4f6' }}>
                        <tr>
                          <th style={{ padding: '10px 16px', width: '50px', textAlign: 'center' }}>#</th>
                          <th style={{ padding: '10px 16px' }}>Product Name <span>*</span></th>
                          <th style={{ padding: '10px 16px', width: '220px' }}>Code / SKU</th>
                          <th style={{ padding: '10px 16px', width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {productList.map((prod, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{index + 1}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <input className="form-control" value={prod.name} onChange={e => updateProductRow(index, 'name', e.target.value)} required placeholder="Product Name (e.g. Halal Whole Chicken)" />
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <input className="form-control" value={prod.code} onChange={e => updateProductRow(index, 'code', e.target.value)} placeholder="Code (e.g. PRD-001)" />
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
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: '#059669', borderColor: '#059669' }}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (editing ? 'Update Product' : 'Submit Product Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
