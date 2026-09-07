import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  MessageSquare, Send, Plus, Search, Check, CheckCheck, 
  Clock, User, Shield, Paperclip, RefreshCw, X, Filter,
  Building2, HelpCircle, ArrowLeft, Megaphone, Bell,
  Sparkles, CheckCircle2, ChevronRight, Info, AlertCircle
} from 'lucide-react';

export default function MessagesPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Channel: 'support' | 'announcements' | `app_${appId}`
  const [activeChannel, setActiveChannel] = useState('support');
  const [conversation, setConversation] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  
  // UI states
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'support' | 'announcements' | 'unread'
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
  const activeChannelRef = useRef(activeChannel);
  const submittingRef = useRef(false);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // Fetch applications for dropdown
  useEffect(() => {
    api.get('/api/applications')
      .then(res => setApplications(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch all messages
  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/messages/inbox');
      const data = res.data || [];
      setMessages(data);

      // Refresh active channel stream
      loadChannelConversation(activeChannelRef.current, false);
    } catch (err) {
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Load conversation for active channel
  const loadChannelConversation = async (channelId, showSpinner = true) => {
    if (showSpinner) setConvLoading(true);
    try {
      let endpoint = '/api/messages/conversation/admin';
      if (channelId === 'announcements') {
        endpoint = '/api/messages/conversation/all_clients';
      }

      const res = await api.get(endpoint);
      const data = res.data || [];
      
      if (channelId === 'announcements') {
        // Filter strictly to announcements/broadcasts
        const broadcasts = data.filter(m => 
          m.recipient_id === 'all_clients' || 
          m.recipient_id === 'all' || 
          m.is_broadcast === true ||
          m.subject?.toLowerCase().includes('announcement')
        );
        setConversation(broadcasts);
      } else if (channelId.startsWith('app_')) {
        const targetAppId = channelId.replace('app_', '');
        const appMsgs = data.filter(m => {
          const mAppId = m.application_id?._id || m.application_id?.id || m.application_id;
          return mAppId?.toString() === targetAppId;
        });
        setConversation(appMsgs);
      } else {
        // Direct Support Desk: all direct 1-on-1 messages with admin
        const directMsgs = data.filter(m => 
          m.recipient_id !== 'all_clients' && 
          m.recipient_id !== 'all' && 
          !m.is_broadcast
        );
        setConversation(directMsgs);

        // Mark incoming direct messages as read
        if (directMsgs.some(m => !m.is_read && m.sender_id !== (profile?._id || profile?.id))) {
          api.put('/api/messages/conversation/admin/read', {}).catch(() => {});
          setMessages(prev => prev.map(m => m.sender_id === 'admin' ? { ...m, is_read: true } : m));
        }
      }

      scrollToBottom();
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      if (showSpinner) setConvLoading(false);
    }
  };

  // Switch channel handler
  const handleSelectChannel = (channelId) => {
    setActiveChannel(channelId);
    loadChannelConversation(channelId, true);
  };

  // Socket.io Real-Time Synchronization
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

      const isBroadcast = newMsg.recipient_id === 'all_clients' || newMsg.recipient_id === 'all' || newMsg.is_broadcast;
      
      toast.success(isBroadcast 
        ? `📢 New Official Announcement: ${newMsg.subject || 'HFA Notice'}` 
        : `New message from ${newMsg.sender?.full_name || 'HFA Support'}`, {
        icon: isBroadcast ? '📢' : '✉️',
        duration: 5000
      });

      const msgId = (newMsg._id || newMsg.id)?.toString();

      setMessages(prev => {
        const filtered = prev.filter(m => (m._id || m.id)?.toString() !== msgId);
        return [newMsg, ...filtered];
      });

      // Update current conversation if relevant
      const curChan = activeChannelRef.current;
      if (
        (curChan === 'announcements' && isBroadcast) ||
        (curChan === 'support' && !isBroadcast)
      ) {
        setConversation(prev => {
          if (prev.some(m => (m._id || m.id)?.toString() === msgId)) {
            return prev.map(m => (m._id || m.id)?.toString() === msgId ? newMsg : m);
          }
          return [...prev, newMsg];
        });
        scrollToBottom();
      }
    };

    const handleMessageSent = (sentMsg) => {
      const msgId = (sentMsg._id || sentMsg.id)?.toString();

      setMessages(prev => {
        const filtered = prev.filter(m => (m._id || m.id)?.toString() !== msgId);
        return [sentMsg, ...filtered];
      });

      const curChan = activeChannelRef.current;
      if (curChan === 'support') {
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

  // Send direct reply in conversation
  const handleSendReply = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (submittingRef.current || !replyText.trim()) return;

    submittingRef.current = true;
    setSendingReply(true);
    try {
      const payload = {
        recipient_id: 'admin',
        subject: activeChannel === 'announcements' 
          ? 'Response to HFA Announcement' 
          : 'HFA Support Inquiry',
        body: replyText.trim()
      };

      const res = await api.post('/api/messages', payload);
      const newMsg = res.data || res;
      const msgId = (newMsg._id || newMsg.id)?.toString();

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
      toast.success('Message delivered to HFA Support');
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      submittingRef.current = false;
      setSendingReply(false);
    }
  };

  // Submit compose new inquiry
  const handleSendCompose = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (submittingRef.current || !composeForm.body.trim() || !composeForm.subject.trim()) return;

    submittingRef.current = true;
    setSubmittingCompose(true);
    try {
      const payload = {
        recipient_id: 'admin',
        subject: `[${composeForm.department}] ${composeForm.subject.trim()}`,
        body: composeForm.body.trim(),
        application_id: composeForm.application_id || null
      };

      const res = await api.post('/api/messages', payload);
      toast.success('Inquiry submitted to HFA Support Desk');
      setShowCompose(false);
      
      setComposeForm({
        recipient_id: 'admin',
        department: 'General Support',
        subject: '',
        body: '',
        application_id: ''
      });

      fetchMessages(true);
      setActiveChannel('support');
      loadChannelConversation('support', true);
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      submittingRef.current = false;
      setSubmittingCompose(false);
    }
  };

  // Grouping Channels
  const announcementMsgs = useMemo(() => {
    return messages.filter(m => 
      m.recipient_id === 'all_clients' || 
      m.recipient_id === 'all' || 
      m.is_broadcast === true ||
      m.subject?.toLowerCase().includes('announcement')
    );
  }, [messages]);

  const directMsgs = useMemo(() => {
    return messages.filter(m => 
      m.recipient_id !== 'all_clients' && 
      m.recipient_id !== 'all' && 
      !m.is_broadcast &&
      !m.subject?.toLowerCase().includes('announcement')
    );
  }, [messages]);

  const unreadAnnouncementsCount = announcementMsgs.filter(m => !m.is_read).length;
  const unreadDirectCount = directMsgs.filter(m => !m.is_read && m.sender_id === 'admin').length;
  const totalUnreadCount = unreadAnnouncementsCount + unreadDirectCount;

  const latestAnnouncement = announcementMsgs[0] || null;
  const latestDirect = directMsgs[0] || null;

  // Filter channels based on search & tab
  const showAnnouncementsChannel = filterTab === 'all' || filterTab === 'announcements' || (filterTab === 'unread' && unreadAnnouncementsCount > 0);
  const showDirectSupportChannel = filterTab === 'all' || filterTab === 'support' || (filterTab === 'unread' && unreadDirectCount > 0);

  // Quick prompt chip helper
  const handleQuickTopic = (topic) => {
    setReplyText(prev => prev ? `${prev} ${topic}` : topic);
  };

  // Helper for Date Dividers
  const formatDividerDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', minHeight: 640 }}>
      {/* Top Header Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 16,
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={22} style={{ color: 'var(--primary)' }} />
              Communication & Support Hub
            </h1>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '2px 0 0' }}>
              Direct real-time communications with HFA Certification, Compliance & Audit Team
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => fetchMessages()} 
            title="Refresh communications"
            style={{ borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'white', border: '1px solid var(--border)' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button 
            className="btn btn-primary" 
            onClick={() => setShowCompose(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              fontWeight: 700, 
              borderRadius: 10,
              padding: '9px 18px',
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(27,122,122,0.25)'
            }}
          >
            <Plus size={16} /> New Support Inquiry
          </button>
        </div>
      </div>

      {/* Main Messaging Canvas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '360px 1fr', 
        gap: 0, 
        flex: 1, 
        minHeight: 0,
        background: 'white',
        borderRadius: 18,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 8px 30px -6px rgba(0,0,0,0.06)'
      }}>
        {/* Left Side: Communication Channels */}
        <div style={{ 
          borderRight: '1px solid var(--border)', 
          display: 'flex', 
          flexDirection: 'column', 
          background: '#f8fafc',
          minHeight: 0 
        }}>
          {/* Channel Filters */}
          <div style={{ 
            padding: '14px 16px', 
            borderBottom: '1px solid var(--border)', 
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div className="search-box" style={{ width: '100%' }}>
              <Search size={14} className="search-icon" />
              <input 
                placeholder="Search messages & topics..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: 12.5 }}
              />
            </div>

            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: 3,
              borderRadius: 8,
              gap: 2
            }}>
              <button
                onClick={() => setFilterTab('all')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: filterTab === 'all' ? 700 : 500,
                  background: filterTab === 'all' ? 'white' : 'transparent',
                  color: filterTab === 'all' ? 'var(--primary)' : '#64748b',
                  border: 'none',
                  boxShadow: filterTab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                All
              </button>
              <button
                onClick={() => setFilterTab('support')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: filterTab === 'support' ? 700 : 500,
                  background: filterTab === 'support' ? 'white' : 'transparent',
                  color: filterTab === 'support' ? 'var(--primary)' : '#64748b',
                  border: 'none',
                  boxShadow: filterTab === 'support' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Support {unreadDirectCount > 0 && <span className="badge badge-green" style={{ fontSize: 9, padding: '1px 5px', marginLeft: 3 }}>{unreadDirectCount}</span>}
              </button>
              <button
                onClick={() => setFilterTab('announcements')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: filterTab === 'announcements' ? 700 : 500,
                  background: filterTab === 'announcements' ? 'white' : 'transparent',
                  color: filterTab === 'announcements' ? 'var(--primary)' : '#64748b',
                  border: 'none',
                  boxShadow: filterTab === 'announcements' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Notices {unreadAnnouncementsCount > 0 && <span className="badge badge-amber" style={{ fontSize: 9, padding: '1px 5px', marginLeft: 3 }}>{unreadAnnouncementsCount}</span>}
              </button>
            </div>
          </div>

          {/* Channels Stream */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading channels...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                
                {/* Channel 1: Official HFA Announcements */}
                {showAnnouncementsChannel && (
                  <div
                    onClick={() => handleSelectChannel('announcements')}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: activeChannel === 'announcements' ? '#ecfdf5' : 'white',
                      border: activeChannel === 'announcements' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                      boxShadow: activeChannel === 'announcements' ? '0 4px 12px rgba(16,185,129,0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                        }}>
                          📢
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                            HFA Official Broadcasts
                          </div>
                          <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                            Public Notices & Bulletins
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {latestAnnouncement && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {new Date(latestAnnouncement.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                        {unreadAnnouncementsCount > 0 && (
                          <span className="badge badge-amber" style={{ fontSize: 10, padding: '2px 7px', marginTop: 4 }}>
                            {unreadAnnouncementsCount} new
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ 
                      fontSize: 12, 
                      color: '#64748b', 
                      marginTop: 6,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingLeft: 44
                    }}>
                      {latestAnnouncement ? (
                        <span>
                          <strong style={{ color: '#334155' }}>{latestAnnouncement.subject}: </strong>
                          {latestAnnouncement.body}
                        </span>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No broadcast announcements yet</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Channel 2: HFA Official Support & Compliance Desk */}
                {showDirectSupportChannel && (
                  <div
                    onClick={() => handleSelectChannel('support')}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: activeChannel === 'support' ? '#f0fdfa' : 'white',
                      border: activeChannel === 'support' ? '1.5px solid var(--primary)' : '1px solid #e2e8f0',
                      boxShadow: activeChannel === 'support' ? '0 4px 12px rgba(27,122,122,0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #1B7A7A 0%, #155e5e 100%)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          boxShadow: '0 2px 6px rgba(27,122,122,0.3)'
                        }}>
                          <Shield size={18} />
                          <span style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: '#22c55e',
                            border: '2px solid white'
                          }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                            HFA Support & Compliance Desk
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                            Direct Assistance • Live Thread
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {latestDirect && (
                          <div style={{ fontSize: 11, color: unreadDirectCount > 0 ? '#16a34a' : '#94a3b8', fontWeight: unreadDirectCount > 0 ? 700 : 400 }}>
                            {new Date(latestDirect.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {unreadDirectCount > 0 && (
                          <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 7px', marginTop: 4 }}>
                            {unreadDirectCount} unread
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ 
                      fontSize: 12, 
                      color: unreadDirectCount > 0 ? '#1e293b' : '#64748b', 
                      fontWeight: unreadDirectCount > 0 ? 600 : 400,
                      marginTop: 6,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingLeft: 44
                    }}>
                      {latestDirect ? (
                        <span>
                          <strong style={{ color: latestDirect.sender_id === 'admin' ? 'var(--primary-dark)' : '#2563eb' }}>
                            {latestDirect.sender_id === 'admin' ? 'HFA: ' : 'You: '}
                          </strong>
                          {latestDirect.body}
                        </span>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Start a live conversation with support</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Section header if application threads exist */}
                {applications.length > 0 && (
                  <div style={{ marginTop: 12, padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 0.5 }}>
                    Certified Application Threads
                  </div>
                )}

                {applications.slice(0, 3).map(app => {
                  const appId = (app._id || app.id)?.toString();
                  const appChanKey = `app_${appId}`;
                  const isSelected = activeChannel === appChanKey;

                  return (
                    <div
                      key={appId}
                      onClick={() => handleSelectChannel(appChanKey)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: isSelected ? '#f1f5f9' : 'white',
                        border: isSelected ? '1px solid #cbd5e1' : '1px solid #f1f5f9',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={15} style={{ color: isSelected ? 'var(--primary)' : '#64748b' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {app.company_name || 'Application'}
                          </div>
                          <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                            {app.scheme || 'Standard Halal Scheme'} • {app.status || 'Active'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            )}
          </div>
        </div>

        {/* Right Side: Conversation Stream & Composer */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f8fafc' }}>
          {/* Chat Header */}
          <div style={{ 
            padding: '14px 24px', 
            borderBottom: '1px solid var(--border)', 
            background: 'white',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: activeChannel === 'announcements' 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #1B7A7A 0%, #155e5e 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {activeChannel === 'announcements' ? '📢' : <Shield size={20} />}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {activeChannel === 'announcements' 
                      ? 'Official HFA Broadcasts & Bulletins'
                      : activeChannel.startsWith('app_')
                      ? 'Application Compliance Inquiry Thread'
                      : 'HFA Support & Certification Directorate'
                    }
                  </h3>
                  <span className="badge badge-green" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    Verified Official Channel
                  </span>
                </div>

                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {activeChannel === 'announcements'
                    ? 'Official updates, regulatory standards, and compliance advisories'
                    : 'Real-time encrypted support with HFA staff • Average reply within 2 hours'
                  }
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => loadChannelConversation(activeChannel, false)}
                title="Refresh Thread"
                style={{ borderRadius: 8 }}
              >
                <RefreshCw size={14} className={convLoading ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Messages Body Stream */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: '#f8fafc'
          }}>
            {convLoading ? (
              <div style={{ margin: 'auto', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading thread...</div>
              </div>
            ) : conversation.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', padding: 40, maxWidth: 440 }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: '#f0fdfa',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 16px rgba(27,122,122,0.1)'
                }}>
                  <MessageSquare size={28} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  {activeChannel === 'announcements' ? 'No Broadcast Notices' : 'Start a Conversation with HFA'}
                </h3>
                <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, marginBottom: 18 }}>
                  {activeChannel === 'announcements'
                    ? 'Official notices and regulatory advisories published by HFA will appear here.'
                    : 'Have questions about Halal certification, audit schedules, slaughterhouse compliance, or document approvals? Send a message below!'
                  }
                </p>
                {activeChannel !== 'announcements' && (
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => setShowCompose(true)}
                    style={{ borderRadius: 8, fontWeight: 700 }}
                  >
                    <Plus size={14} style={{ marginRight: 4 }} /> Open Structured Ticket
                  </button>
                )}
              </div>
            ) : (
              conversation.map((msg, idx) => {
                const myId = (profile?._id || profile?.id)?.toString();
                const isFromClient = msg.sender_id === myId || msg.sender_id === profile?._id;
                const isBroadcast = msg.recipient_id === 'all_clients' || msg.recipient_id === 'all' || msg.is_broadcast || activeChannel === 'announcements';

                // Check if date divider needed
                const prevMsg = idx > 0 ? conversation[idx - 1] : null;
                const showDateDivider = !prevMsg || (
                  new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
                );

                return (
                  <React.Fragment key={msg._id || idx}>
                    {/* Date Divider */}
                    {showDateDivider && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '12px 0 6px'
                      }}>
                        <span style={{
                          background: '#e2e8f0',
                          color: '#475569',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 12px',
                          borderRadius: 20,
                          letterSpacing: 0.3
                        }}>
                          {formatDividerDate(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Announcement Card View (if broadcast message) */}
                    {isBroadcast ? (
                      <div style={{
                        background: 'white',
                        borderRadius: 14,
                        border: '1px solid #bbf7d0',
                        borderLeft: '5px solid #10b981',
                        padding: '16px 20px',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.03)',
                        maxWidth: '85%',
                        alignSelf: 'center',
                        width: '100%'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                              📢 OFFICIAL HFA NOTICE
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                              {msg.sender?.full_name || 'HFA Directorate'}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {msg.subject && (
                          <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                            {msg.subject}
                          </div>
                        )}

                        <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.body}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#64748b' }}>
                          <Info size={13} style={{ color: '#10b981' }} />
                          <span>Dispatched via Portal & Certified Email Notification</span>
                        </div>
                      </div>
                    ) : (
                      /* Regular 1-on-1 Chat Bubble */
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignSelf: isFromClient ? 'flex-end' : 'flex-start',
                          maxWidth: '74%'
                        }}
                      >
                        {/* Sender Label & Time */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                          alignSelf: isFromClient ? 'flex-end' : 'flex-start',
                          fontSize: 11,
                          color: '#64748b'
                        }}>
                          {!isFromClient && (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 4, 
                              fontWeight: 700, 
                              color: 'var(--primary-dark)' 
                            }}>
                              <Shield size={12} style={{ color: 'var(--primary)' }} />
                              {msg.sender?.full_name || 'HFA Support Team'}
                            </span>
                          )}
                          {isFromClient && (
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>You</span>
                          )}
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Bubble Content */}
                        <div style={{
                          padding: '12px 18px',
                          borderRadius: isFromClient ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: isFromClient 
                            ? 'linear-gradient(135deg, #1B7A7A 0%, #155e5e 100%)' 
                            : '#ffffff',
                          color: isFromClient ? '#ffffff' : '#1e293b',
                          boxShadow: isFromClient 
                            ? '0 3px 12px rgba(27,122,122,0.2)' 
                            : '0 2px 8px rgba(0,0,0,0.04)',
                          border: isFromClient ? 'none' : '1px solid #e2e8f0',
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {msg.body}
                        </div>

                        {/* Delivery & Read Status */}
                        {isFromClient && (
                          <div style={{ 
                            alignSelf: 'flex-end', 
                            marginTop: 3, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 3, 
                            fontSize: 10.5, 
                            color: '#94a3b8' 
                          }}>
                            {msg.is_read ? (
                              <>
                                <CheckCheck size={13} style={{ color: '#16a34a' }} />
                                <span style={{ color: '#16a34a', fontWeight: 600 }}>Read by HFA Staff</span>
                              </>
                            ) : (
                              <>
                                <Check size={13} />
                                <span>Delivered</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Bottom Interactive Composer */}
          <div style={{ 
            padding: '14px 20px', 
            borderTop: '1px solid var(--border)', 
            background: 'white',
            flexShrink: 0 
          }}>
            {/* Quick Helper Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginRight: 2 }}>
                Quick Inquiries:
              </span>
              <button 
                type="button" 
                onClick={() => handleQuickTopic('Could you please update me on our Halal Certificate renewal status?')}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: 12, fontSize: 11, color: '#475569', cursor: 'pointer' }}
              >
                📜 Certificate Status
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickTopic('When is our upcoming technical audit scheduled?')}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: 12, fontSize: 11, color: '#475569', cursor: 'pointer' }}
              >
                🔍 Audit Schedule
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickTopic('Please check the latest uploaded compliance documents.')}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: 12, fontSize: 11, color: '#475569', cursor: 'pointer' }}
              >
                📑 Document Review
              </button>
            </div>

            <form onSubmit={handleSendReply} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Type your message to HFA Support... (Press Enter to send, Shift+Enter for newline)"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSendReply(e);
                    }
                  }}
                  style={{ 
                    resize: 'none', 
                    borderRadius: 12, 
                    fontSize: 13.5,
                    padding: '10px 14px',
                    borderColor: '#cbd5e1'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendingReply || !replyText.trim()}
                style={{
                  height: 48,
                  padding: '0 22px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  boxShadow: '0 3px 10px rgba(27,122,122,0.2)'
                }}
              >
                {sendingReply ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Send size={15} /> Send</>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Compose Structured Message Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                <span className="modal-title">New Support Inquiry</span>
              </div>
              <button className="modal-close" onClick={() => setShowCompose(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSendCompose}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Department / Directorate <span>*</span></label>
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
                  <label className="form-label">Subject / Topic <span>*</span></label>
                  <input
                    className="form-control"
                    placeholder="e.g. Halal Audit Readiness Inquiry"
                    value={composeForm.subject}
                    onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Detailed Description <span>*</span></label>
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="Provide detailed information regarding your inquiry..."
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
                  {submittingCompose ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Send size={14} /> Submit Inquiry</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
