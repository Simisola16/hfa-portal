import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, ClipboardList, X } from 'lucide-react';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', proposed_services:'', estimated_products:'', notes:'' });

  const fetch = () => { setLoading(true); api.get('/api/proposals').then(d => setProposals(d.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>{fetch();},[]);
  const set = (k)=>(e)=>setForm(f=>({...f,[k]:e.target.value}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await api.post('/api/proposals', form); toast.success('Proposal submitted!'); setShowModal(false); setForm({title:'',description:'',proposed_services:'',estimated_products:'',notes:''}); fetch(); }
    catch(err){toast.error(err.message);} finally{setSubmitting(false);}
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={()=>setShowModal(true)} style={{marginLeft:'auto'}}><Plus size={15}/> New Proposal</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">My Proposals ({proposals.length})</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            proposals.length===0?(
              <div className="empty-state"><div className="empty-state-icon"><ClipboardList/></div><div className="empty-state-title">No Proposals</div></div>
            ):(
              <table>
                <thead><tr><th>Reference</th><th>Title</th><th>Services</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {proposals.map(p=>(
                    <tr key={p.id}>
                      <td style={{fontWeight:700}}>{p.reference_number}</td>
                      <td>{p.title}</td>
                      <td style={{maxWidth:200}}><span className="truncate" style={{display:'block'}}>{p.proposed_services}</span></td>
                      <td>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                      <td><span className={`badge ${p.status==='approved'?'badge-green':p.status==='rejected'?'badge-red':p.status==='draft'?'badge-gray':'badge-yellow'}`}>{p.status}</span></td>
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
            <div className="modal-header"><span className="modal-title">New Proposal</span><button className="modal-close" onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title <span>*</span></label><input className="form-control" value={form.title} onChange={set('title')} required/></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" value={form.description} onChange={set('description')}/></div>
                <div className="form-group"><label className="form-label">Proposed Services</label><textarea className="form-control" value={form.proposed_services} onChange={set('proposed_services')} placeholder="What certification services are you interested in?"/></div>
                <div className="form-group"><label className="form-label">Estimated Products</label><input className="form-control" value={form.estimated_products} onChange={set('estimated_products')} placeholder="Approx. number of products"/></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={set('notes')}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?<span className="spinner" style={{width:16,height:16}}/>:'Submit Proposal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
