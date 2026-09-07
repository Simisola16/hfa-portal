import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  MessageSquare, Send, Plus, Search, Check, CheckCheck, 
  Clock, User, Shield, Paperclip, RefreshCw, X, Filter,
  Building2, HelpCircle, ArrowLeft
} from 'lucide-react';

export default function MessagesPage({ mode: initialMode = 'inbox' }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  
  // UI states
  const [tab, setTab] = useState('inbox'); // 'inbox' | 'unread' | 'outbox'
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [applications, setApplications] = useState([]);

  // Compose form
  const [composeForm, setComposeForm] = useState({
    recipient_id: 'admin',
    department: 'General Support',
    subject: '',
    body: '',
    application_id: ''
  });
  const [submittingCompose, setSubmittingCompose] = useState(false);

  const threadEndRef = useRef(null);
  const selectedMessageRef = useRef(selectedMessage);

  useEffect(() => {
    selectedMessageRef.current = selectedMessage;
  }, [selectedMessage]);

  // Fetch applications for dropdown
  useEffect(() => {
    api.get('/api/applications')
      .then(res => setApplications(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch messages list
  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const endpoint = tab === 'outbox' ? '/api/messages/outbox' : '/api/messages/inbox';
      const res = await api.get(endpoint);
      const data = res.data || [];
      setMessages(data);
      
      // If we already had a selected message, update it
      if (selectedMessageRef.current) {
        const selId = (selectedMessageRef.current._id || selectedMessageRef.current.id)?.toString();
        const found = data.find(m => (m._id || m.id)?.toString() === selId);
        if (found) setSelectedMessage(found);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [tab]);

  // Socket.io Real-Time Synchronization (attached once)
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      const myId = (profile?._id || profile?.id)?.toString();
      if (myId && (newMsg.sender_id === myId || newMsg.sender_id === profile?._id)) {
        return;
      }

      toast.success(`New message from ${newMsg.sender?.full_name || 'HFA Support'}`, {
        icon: '✉️',
        duration: 4000
      });

      const msgId = (newMsg._id || newMsg.id)?.toString();

      setMessages(prev => {
        const filtered = prev.filter(m => (m._id || m.id)?.toString() !== msgId);
        return [newMsg, ...filtered];
      });

      const activeMsg = selectedMessageRef.current;
      if (activeMsg) {
        const isRelated = 
          newMsg.sender_id === activeMsg.sender_id || 
          newMsg.recipient_id === activeMsg.sender_id ||
          newMsg.sender_id === 'admin' ||
          newMsg.recipient_id === 'admin';
        if (isRelated) {
          setConversation(prev => {
            if (prev.some(m => (m._id || m.id)?.toString() === msgId)) {
              return prev.map(m => (m._id || m.id)?.toString() === msgId ? newMsg : m);
            }
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      }
    };

    const handleMessageSent = (sentMsg) => {
      const msgId = (sentMsg._id || sentMsg.id)?.toString();

      setMessages(prev => {
        const filtered = prev.filter(m => (m._id || m.id)?.toString() !== msgId);
        return [sentMsg, ...filtered];
      });

      const activeMsg = selectedMessageRef.current;
      if (activeMsg) {
        setConversation(prev => {
          if (prev.some(m => (m._id || m.id)?.toString() === msgId)) {
            return prev.map(m => (m._id || m.id)?.toString() === msgId ? sentMsg : m);
          }
          return [...prev, sentMsg];
        });
        scrollToBottom();
      }
    };

    const handleMessageRead = ({ messageId, read_at }) => {
      const targetId = messageId?.toString();
      setMessages(prev => prev.map(m => (m._id || m.id)?.toString() === targetId ? { ...m, is_read: true, read_at } : m));
      setConversation(prev => prev.map(m => (m._id || m.id)?.toString() === targetId ? { ...m, is_read: true, read_at } : m));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('message_read', handleMessageRead);
    };
  }, [profile]);

  const scrollToBottom = () => {
    setTimeout(() => {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // View a message and load conversation thread
  const handleSelectMessage = async (msg) => {
    setSelectedMessage(msg);
    setConvLoading(true);

    try {
      const myId = (profile?._id || profile?.id)?.toString();
      const targetId = (msg.sender_id === myId) ? msg.recipient_id : msg.sender_id;
      const res = await api.get(`/api/messages/conversation/${targetId || 'admin'}`);
      const threadData = res.data || [msg];
      setConversation(threadData.length > 0 ? threadData : [msg]);
      scrollToBottom();

      if (!msg.is_read && tab !== 'outbox') {
        await api.put(`/api/messages/${msg._id || msg.id}/read`, {});
        setMessages(prev => prev.map(m => (m._id || m.id) === (msg._id || msg.id) ? { ...m, is_read: true } : m));
      }
    } catch (err) {
      setConversation([msg]);
    } finally {
      setConvLoading(false);
    }
  };

  // Send reply in current thread
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const myId = (profile?._id || profile?.id)?.toString();
      const recipientId = (selectedMessage?.sender_id === myId)
        ? selectedMessage?.recipient_id 
        : (selectedMessage?.sender_id || 'admin');

      const payload = {
        recipient_id: recipientId || 'admin',
        subject: selectedMessage?.subject?.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage?.subject || 'Support Message'}`,
        body: replyText.trim(),
        application_id: selectedMessage?.application_id?._id || selectedMessage?.application_id || null,
        reply_to: selectedMessage?._id || selectedMessage?.id
      };

      const res = await api.post('/api/messages', payload);
      const newMsg = res.data;
      const msgId = (newMsg._id || newMsg.id)?.toString();

      // Deduplicated state update
      setConversation(prev => {
        if (prev.some(m => (m._id || m.id)?.toString() === msgId)) {
          return prev;
        }
        return [...prev, newMsg];
      });

      setMessages(prev => {
        const filtered = prev.filter(m => (m._id || m.id)?.toString() !== msgId);
        return [newMsg, ...filtered];
      });

      setReplyText('');
      scrollToBottom();
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Handle compose new message submit
  const handleSendCompose = async (e) => {
    e.preventDefault();
    if (!composeForm.body.trim()) return;

    setSubmittingCompose(true);
    try {
      const payload = {
        recipient_id: composeForm.recipient_id || 'admin',
        subject: `[${composeForm.department}] ${composeForm.subject}`,
        body: composeForm.body.trim(),
        application_id: composeForm.application_id || null
      };

      const res = await api.post('/api/messages', payload);
      toast.success('Message sent to HFA Support');
      setShowCompose(false);
      setComposeForm({
        recipient_id: 'admin',
        department: 'General Support',
        subject: '',
        body: '',
        application_id: ''
      });

      setTab('outbox');
      fetchMessages();
      if (res.data) {
        handleSelectMessage(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSubmittingCompose(false);
    }
  };

  // Filter messages
  const filteredMessages = messages.filter(m => {
    if (tab === 'unread' && m.is_read) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const subject = (m.subject || '').toLowerCase();
    const body = (m.body || '').toLowerCase();
    const sender = (m.sender?.full_name || m.sender?.company_name || 'HFA Support').toLowerCase();
    return subject.includes(s) || body.includes(s) || sender.includes(s);
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 600 }}>
      {/* Top Action Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 16,
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: 3,
            borderRadius: 10,
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setTab('inbox')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: tab === 'inbox' ? 700 : 500,
                background: tab === 'inbox' ? 'white' : 'transparent',
                color: tab === 'inbox' ? 'var(--primary)' : '#64748b',
                boxShadow: tab === 'inbox' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Inbox {unreadCount > 0 && <span className="badge badge-red" style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px' }}>{unreadCount}</span>}
            </button>
            <button
              onClick={() => setTab('unread')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: tab === 'unread' ? 700 : 500,
                background: tab === 'unread' ? 'white' : 'transparent',
                color: tab === 'unread' ? 'var(--primary)' : '#64748b',
                boxShadow: tab === 'unread' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Unread
            </button>
            <button
              onClick={() => setTab('outbox')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: tab === 'outbox' ? 700 : 500,
                background: tab === 'outbox' ? 'white' : 'transparent',
                color: tab === 'outbox' ? 'var(--primary)' : '#64748b',
                boxShadow: tab === 'outbox' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Sent
            </button>
          </div>

          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => fetchMessages()} 
            title="Refresh messages"
            style={{ borderRadius: 8 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <div className="search-box" style={{ width: 240 }}>
            <Search size={14} className="search-icon" />
            <input 
              placeholder="Search messages..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowCompose(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              fontWeight: 700, 
              borderRadius: 10,
              padding: '8px 16px',
              fontSize: 13 
            }}
          >
            <Plus size={15} /> Compose Message
          </button>
        </div>
      </div>

      {/* Main Messaging Container */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '360px 1fr', 
        gap: 16, 
        flex: 1, 
        minHeight: 0,
        background: 'white',
        borderRadius: 16,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)'
      }}>
        {/* Left Side: Message List */}
        <div style={{ 
          borderRight: '1px solid var(--border)', 
          display: 'flex', 
          flexDirection: 'column', 
          background: '#fcfdfd',
          minHeight: 0 
        }}>
          <div style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border)', 
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
              {tab === 'inbox' ? 'All Inquiries' : tab === 'unread' ? 'Unread Inquiries' : 'Sent Inquiries'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading communications...</div>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <MessageSquare size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>No messages found</div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  {tab === 'unread' ? 'You have no unread messages.' : 'Start a conversation with HFA Support.'}
                </p>
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isSelected = (selectedMessage?._id || selectedMessage?.id)?.toString() === (msg._id || msg.id)?.toString();
                const isUnread = !msg.is_read && tab !== 'outbox';
                const senderName = msg.sender?.full_name || (msg.sender_id === 'admin' ? 'HFA Support Team' : 'Official HFA Desk');

                return (
                  <div
                    key={msg._id || msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? '#ecfdf5' : (isUnread ? '#f0fdf4' : 'white'),
                      borderLeft: isSelected ? '4px solid var(--primary)' : (isUnread ? '4px solid #22c55e' : '4px solid transparent'),
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: isUnread ? '#dcfce7' : '#f1f5f9',
                          color: isUnread ? '#166534' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700
                        }}>
                          {senderName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ 
                          fontSize: 13, 
                          fontWeight: isUnread ? 800 : (isSelected ? 700 : 600),
                          color: isUnread ? '#0f172a' : '#334155'
                        }}>
                          {senderName}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: isUnread ? '#16a34a' : '#94a3b8', fontWeight: isUnread ? 700 : 400 }}>
                        {new Date(msg.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: isUnread ? 700 : (isSelected ? 600 : 500),
                      color: isSelected ? 'var(--primary-dark)' : '#1e293b',
                      marginBottom: 4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {msg.subject || 'No Subject'}
                    </div>

                    <div style={{ 
                      fontSize: 12, 
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {msg.body}
                    </div>

                    {msg.application_id && (
                      <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f8fafc', padding: '2px 6px', borderRadius: 4, fontSize: 10, color: '#64748b' }}>
                        <Building2 size={10} /> App: {msg.application_id?.scheme || 'Halal Application'}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation View */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'white' }}>
          {selectedMessage ? (
            <>
              {/* Thread Header */}
              <div style={{ 
                padding: '16px 24px', 
                borderBottom: '1px solid var(--border)', 
                background: '#fafafa',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {selectedMessage.subject}
                    </h3>
                    {selectedMessage.is_read ? (
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>Read</span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: 10 }}>New</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 12, color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Shield size={13} style={{ color: 'var(--primary)' }} />
                      HFA Support Official Channel
                    </span>
                    <span>•</span>
                    <span>Started: {new Date(selectedMessage.created_at).toLocaleString('en-GB')}</span>
                    {selectedMessage.application_id && (
                      <>
                        <span>•</span>
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          Application Ref: {selectedMessage.application_id?.company_name || 'Halal Scheme'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setSelectedMessage(null)}
                  title="Close conversation"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Thread Messages Body */}
              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                background: '#f8fafc'
              }}>
                {convLoading ? (
                  <div style={{ margin: 'auto', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading thread...</div>
                  </div>
                ) : (
                  conversation.map((msg, idx) => {
                    const myId = (profile?._id || profile?.id)?.toString();
                    const isFromClient = msg.sender_id === myId;

                    return (
                      <div
                        key={msg._id || idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignSelf: isFromClient ? 'flex-end' : 'flex-start',
                          maxWidth: '78%'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                          alignSelf: isFromClient ? 'flex-end' : 'flex-start',
                          fontSize: 11,
                          color: '#64748b'
                        }}>
                          <span style={{ fontWeight: 700, color: isFromClient ? 'var(--primary-dark)' : '#0f172a' }}>
                            {isFromClient ? 'You' : (msg.sender?.full_name || 'HFA Support')}
                          </span>
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div style={{
                          padding: '14px 18px',
                          borderRadius: isFromClient ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isFromClient ? 'var(--primary)' : 'white',
                          color: isFromClient ? 'white' : '#1e293b',
                          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.08)',
                          border: isFromClient ? 'none' : '1px solid #e2e8f0',
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {msg.body}
                        </div>

                        {isFromClient && (
                          <div style={{ alignSelf: 'flex-end', marginTop: 2, display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: '#94a3b8' }}>
                            {msg.is_read ? <CheckCheck size={12} color="#16a34a" /> : <Check size={12} />}
                            <span>{msg.is_read ? 'Read' : 'Delivered'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Reply Composer Bar */}
              <div style={{ 
                padding: '16px 20px', 
                borderTop: '1px solid var(--border)', 
                background: 'white',
                flexShrink: 0 
              }}>
                <form onSubmit={handleSendReply} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Type your reply here... (Press Enter to send, Shift+Enter for newline)"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    style={{ 
                      resize: 'none', 
                      borderRadius: 12, 
                      fontSize: 13.5,
                      padding: '10px 14px',
                      flex: 1
                    }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sendingReply || !replyText.trim()}
                    style={{
                      height: 44,
                      padding: '0 20px',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700
                    }}
                  >
                    {sendingReply ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Send size={15} /> Send</>}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ 
              margin: 'auto', 
              textAlign: 'center', 
              padding: 40,
              maxWidth: 400
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#f0fdf4',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <MessageSquare size={28} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                Direct Messaging Hub
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
                Select a message on the left to read or reply, or compose a new inquiry directly to the HFA Certification & Support team.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowCompose(true)}
                style={{ borderRadius: 10, padding: '9px 18px', fontWeight: 700 }}
              >
                <Plus size={15} style={{ marginRight: 6 }} /> Start New Inquiry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compose Message Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                <span className="modal-title">New Support Message</span>
              </div>
              <button className="modal-close" onClick={() => setShowCompose(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSendCompose}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Department / Area <span>*</span></label>
                    <select
                      className="form-control"
                      value={composeForm.department}
                      onChange={e => setComposeForm(f => ({ ...f, department: e.target.value }))}
                      required
                    >
                      <option value="General Support">General Inquiries</option>
                      <option value="Certification & Schemes">Certification & Schemes</option>
                      <option value="Audits & Technical">Audits & Inspections</option>
                      <option value="Invoicing & Accounts">Invoicing & Payments</option>
                      <option value="Logsheets & Signatures">Logsheets & Review</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Related Application (Optional)</label>
                    <select
                      className="form-control"
                      value={composeForm.application_id}
                      onChange={e => setComposeForm(f => ({ ...f, application_id: e.target.value }))}
                    >
                      <option value="">-- No specific application --</option>
                      {applications.map(app => (
                        <option key={app._id || app.id} value={app._id || app.id}>
                          {app.company_name || 'App'} ({app.scheme || 'Standard'}) - {app.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject <span>*</span></label>
                  <input
                    className="form-control"
                    placeholder="e.g. Question regarding Halal Audit Requirements"
                    value={composeForm.subject}
                    onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message Details <span>*</span></label>
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="Please explain your question or request clearly..."
                    value={composeForm.body}
                    onChange={e => setComposeForm(f => ({ ...f, body: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCompose(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submittingCompose || !composeForm.subject || !composeForm.body}
                >
                  {submittingCompose ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Send size={14} /> Send Message</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
