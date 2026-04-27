import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, MessageSquare, Clock, CheckCircle2, Search, X, Send } from 'lucide-react';

export default function TicketsPage({ openNew }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [newTicket, setNewTicket] = useState({ subject: '', department: 'General', priority: 'medium', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = () => {
    setLoading(true);
    api.get('/api/tickets')
      .then(res => setTickets(res.data || []))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
    if (openNew) setShowModal(true);
  }, [openNew]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/tickets', newTicket);
      toast.success('Ticket submitted successfully');
      setShowModal(false);
      setNewTicket({ subject: '', department: 'General', priority: 'medium', message: '' });
      fetchTickets();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/tickets/${selectedTicket.id}/reply`, { message: reply });
      setReply('');
      // Refresh selected ticket
      const res = await api.get('/api/tickets');
      const updated = res.data.find(t => t.id === selectedTicket.id);
      setSelectedTicket(updated);
      setTickets(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (s) => {
    const map = { open: 'badge-blue', in_progress: 'badge-yellow', resolved: 'badge-green', closed: 'badge-gray' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s.replace('_', ' ')}</span>;
  };

  return (
    <div className="page-wrapper">
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search tickets..." />
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginLeft: 'auto' }}>
          <Plus size={15} /> Create Ticket
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700 }}>{t.ticket_number}</td>
                    <td>{t.subject}</td>
                    <td>{t.department}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTicket(t)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Create Support Ticket</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input className="form-control" value={newTicket.subject} onChange={e => setNewTicket(f => ({...f, subject: e.target.value}))} required />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-control" value={newTicket.department} onChange={e => setNewTicket(f => ({...f, department: e.target.value}))}>
                      <option value="General">General</option>
                      <option value="Technical">Technical</option>
                      <option value="Billing">Billing</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={newTicket.priority} onChange={e => setNewTicket(f => ({...f, priority: e.target.value}))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-control" rows={4} value={newTicket.message} onChange={e => setNewTicket(f => ({...f, message: e.target.value}))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={submitting}>Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail Sidebar/Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedTicket(null)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <span className="modal-title">{selectedTicket.ticket_number}: {selectedTicket.subject}</span>
              <button className="modal-close" onClick={() => setSelectedTicket(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: '#334155' }}>{selectedTicket.message}</p>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 12 }}>
                  Opened on {new Date(selectedTicket.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {selectedTicket.responses?.map((r, i) => (
                  <div key={i} style={{ 
                    alignSelf: r.user_id === selectedTicket.user_id ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    background: r.user_id === selectedTicket.user_id ? 'var(--primary-light)' : '#f1f5f9',
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{r.user_name}</div>
                    <p style={{ fontSize: 13 }}>{r.message}</p>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <div style={{ width: '100%', display: 'flex', gap: 12 }}>
                <input className="form-control" placeholder="Type your reply..." value={reply} onChange={e => setReply(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleReply(e)} />
                <button className="btn btn-primary" onClick={handleReply} disabled={submitting}>
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
