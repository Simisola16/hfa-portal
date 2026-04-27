import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { MessageSquare, Send, X } from 'lucide-react';

export default function MessagesPage({ mode = 'inbox' }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ recipient_id: '', subject: '', body: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get(`/api/messages/${mode}`).then(d => setMessages(d.data || [])).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [mode]);

  const viewMessage = async (msg) => {
    setSelected(msg);
    if (mode === 'inbox' && !msg.is_read) {
      await api.put(`/api/messages/${msg.id}/read`, {});
      fetch();
    }
  };

  const handleSend = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/api/messages', form);
      toast.success('Message sent!');
      setShowCompose(false);
      setForm({ recipient_id: '', subject: '', body: '' });
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setShowCompose(true)} style={{ marginLeft: 'auto' }}><Send size={15} /> Compose</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">{mode === 'inbox' ? 'Inbox' : 'Sent Messages'}</div></div>
          <div>
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><MessageSquare /></div>
                  <div className="empty-state-title">No Messages</div>
                </div>
              ) : messages.map(msg => (
                <div key={msg.id} onClick={() => viewMessage(msg)} style={{
                  padding: '14px 20px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', background: selected?.id === msg.id ? 'var(--primary-light)' : (mode === 'inbox' && !msg.is_read ? '#f0fdf4' : 'white'),
                  transition: 'var(--transition)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: mode === 'inbox' && !msg.is_read ? 700 : 500, fontSize: 13 }}>
                      {mode === 'inbox' ? (msg.sender?.full_name || 'HFA Staff') : (msg.recipient?.full_name || 'HFA Staff')}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(msg.created_at).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: mode === 'inbox' && !msg.is_read ? 600 : 400, color: 'var(--text-primary)' }}>{msg.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.body}</div>
                </div>
              ))
            }
          </div>
        </div>

        {selected && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">{selected.subject}</span>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                From: {selected.sender?.full_name || 'HFA Staff'} · {new Date(selected.created_at).toLocaleString('en-GB')}
              </p>
              <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.body}</div>
            </div>
          </div>
        )}
      </div>

      {showCompose && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">New Message</span>
              <button className="modal-close" onClick={() => setShowCompose(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSend}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Subject <span>*</span></label><input className="form-control" value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} required /></div>
                <div className="form-group"><label className="form-label">Message <span>*</span></label><textarea className="form-control" rows={6} value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCompose(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Send size={14} /> Send</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
