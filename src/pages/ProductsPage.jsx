import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Package, Edit, Trash2, X } from 'lucide-react';

export default function ProductsPage({ openNew: openNewProp }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', ingredients: '', product_type: '', barcode: '', category: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetch = () => { setLoading(true); api.get('/api/products').then(d => setProducts(d.data || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  useEffect(() => {
    if (openNewProp) openNew();
  }, [openNewProp]);

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  const openEdit = (p) => { setEditing(p); setForm(p); setShowModal(true); };
  const openNew = () => { setEditing(null); setForm({ name:'', description:'', ingredients:'', product_type:'', barcode:'', category:'' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (editing) { await api.put(`/api/products/${editing.id || editing._id}`, form); toast.success('Product updated'); }
      else { await api.post('/api/products', form); toast.success('Product added'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
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
                      <td><span className={`badge ${p.status === 'approved' ? 'badge-green' : p.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{p.status}</span></td>
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
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Product' : 'Add New Product'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Product Name <span>*</span></label><input className="form-control" value={form.name} onChange={set('name')} required /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Category</label><input className="form-control" value={form.category} onChange={set('category')} placeholder="e.g. Meat, Snacks, Dairy" /></div>
                  <div className="form-group"><label className="form-label">Product Type</label><input className="form-control" value={form.product_type} onChange={set('product_type')} placeholder="e.g. Food, Cosmetics" /></div>
                </div>
                <div className="form-group"><label className="form-label">Barcode / SKU</label><input className="form-control" value={form.barcode} onChange={set('barcode')} /></div>
                <div className="form-group"><label className="form-label">Ingredients</label><textarea className="form-control" value={form.ingredients} onChange={set('ingredients')} placeholder="List main ingredients..." /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" value={form.description} onChange={set('description')} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (editing ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
