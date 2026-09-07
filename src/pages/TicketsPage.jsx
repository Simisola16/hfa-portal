import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Plus, MessageSquare, Clock, CheckCircle2, Search, X, Send, 
  AlertCircle, ShieldCheck, ArrowRight, RefreshCw, Filter, 
  Building2, Check, CheckCheck, HelpCircle
} from 'lucide-react';

export default function TicketsPage({ openNew }) {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [applications, setApplications] = useState([]);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch] = useState('');

  // New ticket form
  const [newTicket, setNewTicket] = useState({ 
    subject: '', 
    department: 'General', 
    priority: 'medium', 
    message: '',
    application_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const responsesEndRef = useRef(null);
  const selectedTicketRef = useRef(selectedTicket);
  const submittingRef = useRef(false);

  useEffect(() => {
    selectedTicketRef.current = selectedTicket;
  }, [selectedTicket]);

  // Fetch applications for optional link
  useEffect(() => {
    api.get('/api/applications')
      .then(res => setApplications(res.data || []))
      .catch(() => {});
  }, []);

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/tickets');
      const data = res.data || [];
      setTickets(data);

      if (selectedTicketRef.current) {
        const selId = (selectedTicketRef.current._id || selectedTicketRef.current.id)?.toString();
        const found = data.find(t => (t._id || t.id)?.toString() === selId);
        if (found) setSelectedTicket(found);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load tickets');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    if (openNew) setShowModal(true);
  }, [openNew]);

  // Socket.io Real-Time Synchronization (attached once)
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleTicketCreated = (newTkt) => {
      const tktId = (newTkt._id || newTkt.id)?.toString();
      setTickets(prev => [newTkt, ...prev.filter(t => (t._id || t.id)?.toString() !== tktId)]);
    };

    const handleTicketReply = ({ ticketId, ticket: updatedTicket, reply }) => {
      const targetId = ticketId?.toString();
      const myId = (profile?._id || profile?.id)?.toString();
      if (!myId || (reply?.user_id !== myId && reply?.user_id !== profile?._id)) {
        toast.success(`New update on ticket ${updatedTicket.ticket_number}`, {
          icon: '💬',
          duration: 4000
        });
      }

      setTickets(prev => prev.map(t => (t._id || t.id)?.toString() === targetId ? updatedTicket : t));
      
      const activeTicket = selectedTicketRef.current;
      if (activeTicket && (activeTicket._id || activeTicket.id)?.toString() === targetId) {
        setSelectedTicket(updatedTicket);
        setTimeout(() => {
          responsesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    const handleTicketUpdated = (updatedTicket) => {
      const targetId = (updatedTicket._id || updatedTicket.id)?.toString();
      setTickets(prev => prev.map(t => (t._id || t.id)?.toString() === targetId ? updatedTicket : t));
      const activeTicket = selectedTicketRef.current;
      if (activeTicket && (activeTicket._id || activeTicket.id)?.toString() === targetId) {
        setSelectedTicket(updatedTicket);
      }
    };

    socket.on('ticket_created', handleTicketCreated);
    socket.on('ticket_reply', handleTicketReply);
    socket.on('ticket_updated', handleTicketUpdated);

    return () => {
      socket.off('ticket_created', handleTicketCreated);
      socket.off('ticket_reply', handleTicketReply);
      socket.off('ticket_updated', handleTicketUpdated);
    };
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submittingRef.current || !newTicket.subject.trim() || !newTicket.message.trim()) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await api.post('/api/tickets', newTicket);
      toast.success(`Ticket ${res.data?.ticket_number || ''} submitted successfully!`);
      setShowModal(false);
      setNewTicket({ 
        subject: '', 
        department: 'General', 
        priority: 'medium', 
        message: '',
        application_id: ''
      });
      fetchTickets();
      if (res.data) setSelectedTicket(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to submit ticket');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleReply = async (e) => {
    e?.preventDefault();
    if (submittingRef.current || !reply.trim() || !selectedTicket) return;

    submittingRef.current = true;
    setSubmittingReply(true);
    try {
      const res = await api.post(`/api/tickets/${selectedTicket._id || selectedTicket.id}/reply`, { message: reply.trim() });
      setReply('');
      setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => (t._id || t.id)?.toString() === (res.data._id || res.data.id)?.toString() ? res.data : t));
      toast.success('Reply submitted');
      setTimeout(() => {
        responsesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      submittingRef.current = false;
      setSubmittingReply(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const res = await api.patch(`/api/tickets/${selectedTicket._id || selectedTicket.id}/status`, { status: newStatus });
      setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => (t._id === res.data._id || t.id === res.data._id) ? res.data : t));
      toast.success(`Ticket marked as ${newStatus}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update ticket');
    }
  };

  // KPIs
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (deptFilter !== 'all' && t.department !== deptFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const tNum = (t.ticket_number || '').toLowerCase();
    const subj = (t.subject || '').toLowerCase();
    const msg = (t.message || '').toLowerCase();
    const dept = (t.department || '').toLowerCase();
    return tNum.includes(s) || subj.includes(s) || msg.includes(s) || dept.includes(s);
  });

  const statusBadge = (s) => {
    const map = { 
      open: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Open' }, 
      in_progress: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'In Progress' }, 
      resolved: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Resolved' }, 
      closed: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'Closed' } 
    };
    const c = map[s] || map.open;
    return (
      <span style={{
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4
      }}>
        {c.label}
      </span>
    );
  };

  const priorityBadge = (p) => {
    const map = {
      urgent: { bg: '#fef2f2', color: '#b91c1c', label: 'Urgent ⚡' },
      high: { bg: '#fff1f2', color: '#e11d48', label: 'High' },
      medium: { bg: '#f8fafc', color: '#475569', label: 'Medium' },
      low: { bg: '#f8fafc', color: '#94a3b8', label: 'Low' }
    };
    const c = map[p] || map.medium;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.color
      }}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      {/* Top Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total Inquiries</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{totalCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Awaiting Response</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{openCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>In Progress</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{inProgressCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Resolved Tickets</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{resolvedCount}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="search-box" style={{ width: 260 }}>
            <Search size={14} className="search-icon" />
            <input 
              placeholder="Search by ID, subject..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select 
            className="form-control" 
            style={{ width: 'auto', fontSize: 13 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select 
            className="form-control" 
            style={{ width: 'auto', fontSize: 13 }}
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            <option value="General">General</option>
            <option value="Technical">Technical & Compliance</option>
            <option value="Billing">Billing & Accounts</option>
            <option value="Audits">Audits & Inspectors</option>
            <option value="Certificates">Certificates</option>
          </select>

          <button className="btn btn-ghost btn-sm" onClick={() => fetchTickets()} title="Refresh">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => setShowModal(true)} 
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Plus size={16} /> Open Support Ticket
        </button>
      </div>

      {/* Tickets Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading support tickets...</div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <HelpCircle size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#475569' }}>No support tickets found</div>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                {search || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Submit a ticket if you need assistance from the HFA team.'}
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Ticket ID</th>
                  <th>Subject</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Responses</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t._id || t.id} style={{ transition: 'background 0.15s' }}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 13 }}>
                        {t.ticket_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>{t.subject}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.message}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 500 }}>
                        {t.department}
                      </span>
                    </td>
                    <td>{priorityBadge(t.priority)}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 4, 
                        fontSize: 12, 
                        color: t.responses?.length > 0 ? 'var(--primary)' : '#94a3b8',
                        fontWeight: 600
                      }}>
                        <MessageSquare size={13} /> {t.responses?.length || 0}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => setSelectedTicket(t)}
                        style={{ borderRadius: 8, fontWeight: 700 }}
                      >
                        View Ticket
                      </button>
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
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} style={{ color: 'var(--primary)' }} />
                <span className="modal-title">Open Support Ticket</span>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Subject <span>*</span></label>
                  <input 
                    className="form-control" 
                    placeholder="Brief description of your issue or inquiry"
                    value={newTicket.subject} 
                    onChange={e => setNewTicket(f => ({ ...f, subject: e.target.value }))} 
                    required 
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Department / Inquiry Type</label>
                    <select 
                      className="form-control" 
                      value={newTicket.department} 
                      onChange={e => setNewTicket(f => ({ ...f, department: e.target.value }))}
                    >
                      <option value="General">General Inquiry</option>
                      <option value="Technical">Technical & Compliance</option>
                      <option value="Billing">Invoices & Billing</option>
                      <option value="Audits">Audits & Inspection</option>
                      <option value="Certificates">Certificates & Add-ons</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority Level</label>
                    <select 
                      className="form-control" 
                      value={newTicket.priority} 
                      onChange={e => setNewTicket(f => ({ ...f, priority: e.target.value }))}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium (Standard)</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Associated Application (Optional)</label>
                  <select 
                    className="form-control" 
                    value={newTicket.application_id} 
                    onChange={e => setNewTicket(f => ({ ...f, application_id: e.target.value }))}
                  >
                    <option value="">-- No application selected --</option>
                    {applications.map(app => (
                      <option key={app._id || app.id} value={app._id || app.id}>
                        {app.company_name || 'App'} ({app.scheme || 'Standard'}) - {app.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Detailed Explanation <span>*</span></label>
                  <textarea 
                    className="form-control" 
                    rows={5} 
                    placeholder="Provide as much context and detail as possible to help us assist you swiftly..."
                    value={newTicket.message} 
                    onChange={e => setNewTicket(f => ({ ...f, message: e.target.value }))} 
                    required 
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting || !newTicket.subject || !newTicket.message}
                >
                  {submitting ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedTicket(null)}>
          <div className="modal" style={{ maxWidth: 740, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ background: '#fafafa', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 14 }}>
                    {selectedTicket.ticket_number}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    {selectedTicket.subject}
                  </h3>
                  {statusBadge(selectedTicket.status)}
                  {priorityBadge(selectedTicket.priority)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Department: <strong>{selectedTicket.department}</strong> • Opened on {new Date(selectedTicket.created_at).toLocaleString('en-GB')}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' ? (
                  <button 
                    className="btn btn-outline btn-sm" 
                    onClick={() => handleStatusChange('open')}
                    style={{ fontSize: 11, fontWeight: 700 }}
                  >
                    Reopen Ticket
                  </button>
                ) : (
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => handleStatusChange('resolved')}
                    style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}
                  >
                    Mark as Resolved
                  </button>
                )}
                <button className="modal-close" onClick={() => setSelectedTicket(null)}><X size={16} /></button>
              </div>
            </div>

            {/* Conversation Body */}
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Original Inquiry Box */}
              <div style={{ 
                background: 'white', 
                padding: '18px 20px', 
                borderRadius: 14, 
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                      {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{profile?.full_name || 'You (Client)'}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>Original Inquiry</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {new Date(selectedTicket.created_at).toLocaleString('en-GB')}
                  </span>
                </div>

                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {selectedTicket.message}
                </p>
              </div>

              {/* Responses Stream */}
              {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                selectedTicket.responses.map((r, i) => {
                  const isStaff = r.user_role?.toLowerCase().includes('staff') || r.user_role?.toLowerCase().includes('admin');
                  
                  return (
                    <div 
                      key={i} 
                      style={{ 
                        alignSelf: isStaff ? 'flex-start' : 'flex-end',
                        maxWidth: '85%',
                        background: isStaff ? 'white' : 'var(--primary)',
                        color: isStaff ? '#1e293b' : 'white',
                        padding: '16px 18px',
                        borderRadius: isStaff ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                        border: isStaff ? '1px solid #e2e8f0' : 'none',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 12, color: isStaff ? 'var(--primary-dark)' : 'white' }}>
                            {r.user_name || (isStaff ? 'HFA Official Support' : 'You')}
                          </span>
                          {isStaff && (
                            <span style={{ background: '#ecfdf5', color: '#166534', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                              HFA Staff
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 10.5, opacity: 0.8 }}>
                          {new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} • {new Date(r.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      <p style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {r.message}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 12.5 }}>
                  No responses yet. The HFA support team will reply shortly.
                </div>
              )}
              <div ref={responsesEndRef} />
            </div>

            {/* Reply Footer */}
            <div className="modal-footer" style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid var(--border)' }}>
              <form onSubmit={handleReply} style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center' }}>
                <input 
                  className="form-control" 
                  placeholder="Type your reply to the HFA team..." 
                  value={reply} 
                  onChange={e => setReply(e.target.value)} 
                  disabled={submittingReply}
                  style={{ borderRadius: 10, fontSize: 13.5 }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submittingReply || !reply.trim()}
                  style={{ borderRadius: 10, padding: '0 18px', height: 42, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                >
                  {submittingReply ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Send size={15} /> Send Reply</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

