import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { FileBarChart } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ api.get('/api/invoices').then(d=>setInvoices(d.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); },[]);

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Invoices</div></div>
      <div className="table-wrap">
        {loading?<div className="loading-overlay"><div className="spinner"/></div>:
          invoices.length===0?(
            <div className="empty-state"><div className="empty-state-icon"><FileBarChart/></div><div className="empty-state-title">No Invoices</div><div className="empty-state-text">Invoices from HFA will appear here</div></div>
          ):(
            <table>
              <thead><tr><th>Invoice No.</th><th>Description</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map(inv=>(
                  <tr key={inv.id}>
                    <td style={{fontWeight:700}}>{inv.invoice_number}</td>
                    <td>{inv.description}</td>
                    <td style={{fontWeight:600}}>£{parseFloat(inv.amount||0).toFixed(2)}</td>
                    <td>{inv.due_date?new Date(inv.due_date).toLocaleDateString('en-GB'):'—'}</td>
                    <td><span className={`badge ${inv.status==='paid'?'badge-green':inv.status==='overdue'?'badge-red':'badge-yellow'}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}
