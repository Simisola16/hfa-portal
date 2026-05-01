import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Ship, X, Eye } from 'lucide-react';

export default function ExportPage({ openNew }) {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ destination_country: '', products: '', shipment_date: '', consignee_name: '', consignee_address: '', notes: '' });

  const fetch = () => { setLoading(true); api.get('/api/exports').then(d => setExports(d.data || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  useEffect(() => {
    if (openNew) setShowModal(true);
  }, [openNew]);

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/exports', form);
      toast.success('Export certificate requested!');
      setShowModal(false);
      setForm({ destination_country: '', products: '', shipment_date: '', consignee_name: '', consignee_address: '', notes: '' });
      fetch();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginLeft: 'auto' }}><Plus size={15} /> Request Export Certificate</button>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Export Certificates ({exports.length})</div></div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            exports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Ship /></div>
                <div className="empty-state-title">No Export Certificates</div>
                <div className="empty-state-text">Request an export certificate to ship halal products internationally</div>
              </div>
            ) : (
              <table>
                <thead><tr><th>Reference</th><th>Destination</th><th>Consignee</th><th>Shipment Date</th><th>Status</th></tr></thead>
                <tbody>
                  {exports.map(e => (
                    <tr key={e.id || e._id}>
                      <td style={{ fontWeight: 700 }}>{e.reference_number}</td>
                      <td>{e.destination_country}</td>
                      <td>{e.consignee_name || '—'}</td>
                      <td>{e.shipment_date ? new Date(e.shipment_date).toLocaleDateString('en-GB') : '—'}</td>
                      <td><span className={`badge ${e.status === 'approved' ? 'badge-green' : e.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={ev => ev.target === ev.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Request Export Certificate</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Destination Country <span>*</span></label><input className="form-control" value={form.destination_country} onChange={set('destination_country')} required /></div>
                  <div className="form-group"><label className="form-label">Shipment Date</label><input type="date" className="form-control" value={form.shipment_date} onChange={set('shipment_date')} /></div>
                </div>
                <div className="form-group"><label className="form-label">Products to Export <span>*</span></label><textarea className="form-control" value={form.products} onChange={set('products')} placeholder="List the products being exported..." required /></div>
                <div className="form-group"><label className="form-label">Consignee Name</label><input className="form-control" value={form.consignee_name} onChange={set('consignee_name')} placeholder="Name of the receiving party" /></div>
                <div className="form-group"><label className="form-label">Consignee Address</label><textarea className="form-control" value={form.consignee_address} onChange={set('consignee_address')} /></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={set('notes')} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
