import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Package, Edit, Trash2, X, PlusCircle } from 'lucide-react';

export default function ProductsPage({ openNew: openNewProp }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Single product form for Edit
  const [form, setForm] = useState({ name: '', description: '', ingredients: '', product_type: '', barcode: '', category: '' });

  // Bulk add form for New Product
  const [bulkForm, setBulkForm] = useState({
    contact_name: '', contact_number: '', contact_email: '',
    subject: '', message: ''
  });
  const [productList, setProductList] = useState([{ id: 1, name: '', code: '', type: '' }]);

  const fetch = () => { setLoading(true); api.get('/api/products').then(d => setProducts(d.data || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  useEffect(() => {
    if (openNewProp) openNew();
  }, [openNewProp]);

  const setF = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));
  const setB = (k) => (e) => setBulkForm(b => ({...b, [k]: e.target.value}));

  const openEdit = (p) => { setEditing(p); setForm(p); setShowModal(true); };
  const openNew = () => { 
    setEditing(null); 
    setBulkForm({ contact_name: '', contact_number: '', contact_email: '', subject: '', message: '' });
    setProductList([{ id: 1, name: '', code: '', type: '' }]);
    setShowModal(true); 
  };

  const addProductRow = () => {
    setProductList([...productList, { id: productList.length + 1, name: '', code: '', type: '' }]);
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
    e.preventDefault(); setSubmitting(true);
    try {
      if (editing) { 
        await api.put(`/api/products/${editing.id || editing._id}`, form); 
        toast.success('Product updated'); 
      } else { 
        // Bulk add products
        const validProducts = productList.filter(p => p.name.trim() !== '');
        if (validProducts.length === 0) throw new Error('Please add at least one product name');

        // Since the backend might only accept one product at a time, we'll iterate
        // Alternatively, if there's a bulk endpoint, we'd use that. We'll use a loop for safety.
        for (const prod of validProducts) {
          const payload = {
            name: prod.name,
            barcode: prod.code,
            product_type: prod.type,
            contact_name: bulkForm.contact_name,
            contact_number: bulkForm.contact_number,
            contact_email: bulkForm.contact_email,
            subject: bulkForm.subject,
            message: bulkForm.message
          };
          await api.post('/api/products', payload);
        }
        toast.success(`${validProducts.length} product(s) added successfully`); 
      }
      setShowModal(false); fetch();
    } catch (err) { 
      toast.error(err.message || 'Failed to save'); 
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
        <button className="btn btn-primary" onClick={openNew} style={{ marginLeft: 'auto' }}><Plus size={15} /> Add Product</button>
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
                <thead><tr><th>Name</th><th>Category</th><th>Type</th><th>Barcode</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id || p._id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.category || '—'}</td>
                      <td>{p.product_type || '—'}</td>
                      <td>{p.barcode || '—'}</td>
                      <td><span className={`badge ${p.status === 'approved' ? 'badge-green' : p.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{p.status || 'Pending'}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Edit size={13} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id || p._id)}><Trash2 size={13} /></button>
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
              <span className="modal-title" style={{ fontSize: '16px', fontWeight: 700 }}>{editing ? 'Edit Product' : 'Add New Product'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {editing ? (
                // OLD EDIT FORM
                <div className="modal-body">
                  <div className="form-group"><label className="form-label">Product Name <span>*</span></label><input className="form-control" value={form.name} onChange={setF('name')} required /></div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Category</label><input className="form-control" value={form.category} onChange={setF('category')} placeholder="e.g. Meat, Snacks, Dairy" /></div>
                    <div className="form-group"><label className="form-label">Product Type</label><input className="form-control" value={form.product_type} onChange={setF('product_type')} placeholder="e.g. Food, Cosmetics" /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Barcode / SKU</label><input className="form-control" value={form.barcode} onChange={setF('barcode')} /></div>
                  <div className="form-group"><label className="form-label">Ingredients</label><textarea className="form-control" value={form.ingredients} onChange={setF('ingredients')} placeholder="List main ingredients..." /></div>
                  <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" value={form.description} onChange={setF('description')} /></div>
                </div>
              ) : (
                // NATIVE UI FOR NEW PRODUCTS
                <div className="modal-body" style={{ background: '#f9fafb' }}>
                  
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
                          <th style={{ padding: '10px 16px' }}>Type</th>
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
                              <input className="form-control" value={prod.type} onChange={e => updateProductRow(index, 'type', e.target.value)} placeholder="Type" />
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
