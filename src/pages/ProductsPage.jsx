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

  // Reusable UI components for the new layout
  const Panel = ({ title, children, style }) => (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ background: '#002855', color: '#fff', padding: '14px 16px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </div>
      <div style={{ padding: '20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  );

  const InputLabel = ({ children }) => <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>{children}</label>;
  const InputField = ({ type = "text", ...props }) => (
    <input type={type} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none' }} {...props} />
  );
  const TextAreaField = ({ ...props }) => (
    <textarea style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', minHeight: '90px', resize: 'vertical', outline: 'none' }} {...props} />
  );

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
                // NEW PROFESSIONAL BULK ADD LAYOUT
                <div style={{ background: '#e8f0f8', padding: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '20px' }}>
                    
                    {/* Panel 1: CONTACT PERSON */}
                    <Panel title="CONTACT PERSON">
                      <div>
                        <InputLabel>Contact Person Name:*</InputLabel>
                        <InputField required value={bulkForm.contact_name} onChange={setB('contact_name')} />
                      </div>
                      <div>
                        <InputLabel>Contact Person Number:*</InputLabel>
                        <InputField required value={bulkForm.contact_number} onChange={setB('contact_number')} />
                      </div>
                      <div>
                        <InputLabel>Contact Person E-mail:*</InputLabel>
                        <InputField type="email" required value={bulkForm.contact_email} onChange={setB('contact_email')} />
                      </div>
                    </Panel>

                    {/* Panel 2: MESSAGE */}
                    <Panel title="MESSAGE">
                      <div>
                        <InputLabel>Subject:</InputLabel>
                        <InputField value={bulkForm.subject} onChange={setB('subject')} />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <InputLabel>Message:</InputLabel>
                        <TextAreaField style={{ flex: 1, minHeight: '120px' }} value={bulkForm.message} onChange={setB('message')} />
                      </div>
                    </Panel>

                    {/* Panel 3: TYPE (Products Table) */}
                    <Panel title="TYPE" style={{ overflow: 'visible' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {productList.map((prod, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1.5fr 30px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', flex: 1, background: '#fff' }}>
                              <div style={{ borderRight: '1px solid #cbd5e1', padding: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                                {prod.id}
                              </div>
                              <div style={{ borderRight: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', padding: '0' }}>
                                <input placeholder="Product Name:" style={{ width: '100%', padding: '8px 12px', border: 'none', fontSize: '13px', outline: 'none' }} value={prod.name} onChange={e => updateProductRow(index, 'name', e.target.value)} required />
                              </div>
                              <div style={{ borderRight: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', padding: '0' }}>
                                <input placeholder="Code:" style={{ width: '100%', padding: '8px 12px', border: 'none', fontSize: '13px', outline: 'none' }} value={prod.code} onChange={e => updateProductRow(index, 'code', e.target.value)} />
                              </div>
                              <div style={{ borderRight: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', padding: '0' }}>
                                <input placeholder="Type:" style={{ width: '100%', padding: '8px 12px', border: 'none', fontSize: '13px', outline: 'none' }} value={prod.type} onChange={e => updateProductRow(index, 'type', e.target.value)} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', padding: '0 8px' }} onClick={() => removeProductRow(index)} title="Remove row">
                                <X size={14} color="#94a3b8" />
                              </div>
                            </div>
                            
                            {/* The "ADD" Button exactly like the screenshot */}
                            {index === productList.length - 1 && (
                              <button 
                                type="button"
                                onClick={addProductRow}
                                style={{ background: '#0b0f19', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', height: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                              >
                                ADD
                              </button>
                            )}
                            {index !== productList.length - 1 && (
                              <div style={{ width: '56px' }}></div> /* Spacer for alignment */
                            )}
                          </div>
                        ))}
                      </div>
                    </Panel>
                    
                  </div>
                </div>
              )}

              <div className="modal-footer" style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '16px 24px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: '#002855' }}>
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
