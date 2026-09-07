import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  MessageSquare, Send, Plus, Search, Check, CheckCheck, 
  Clock, User, Shield, Paperclip, RefreshCw, X, Filter,
  Building2, HelpCircle, ArrowLeft, Megaphone, Bell,
  Sparkles, CheckCircle2, ChevronRight, Info, AlertCircle,
  FileText, CreditCard, Tag, MessageSquarePlus
} from 'lucide-react';

export default function MessagesPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Thread/Channel ID:
  // 'announcements' | 'support_general' | `thread_${threadKey}`
  const [activeThreadId, setActiveThreadId] = useState('support_general');
  const [conversation, setConversation] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  
  // UI states
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'support' | 'threads' | 'announcements' | 'unread'
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [applications, setApplications] = useState([]);

  // Compose form for starting a NEW chat thread
  const [composeForm, setComposeForm] = useState({
    recipient_id: 'admin',
    department: 'General Support',
    subject: '',
    body: '',
    application_id: ''
  });
  const [submittingCompose, setSubmittingCompose] = useState(false);

  const threadEndRef = useRef(null);
  const activeThreadIdRef = useRef(activeThreadId);
  const submittingRef = useRef(false);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  // Fetch applications for dropdown
  useEffect(() => {
    api.get('/api/applications')
      .then(res => setApplications(res.data || []))
      .catch(() => {});
  }, []);

  // Helper to normalize subject and extract clean title & department
  const cleanSubject = (subj) => {
    if (!subj) return 'General Support Inquiry';
    return subj.replace(/^(Re:\s*)+/i, '').trim();
  };

  const extractDepartment = (subj) => {
    if (!subj) return 'General';
    const match = subj.match(/^\[(.*?)\]/);
    return match ? match[1] : 'General';
  };

  const getCleanTitle = (subj) => {
    if (!subj) return 'General Support';
    const cleaned = cleanSubject(subj);
    return cleaned.replace(/^\[(.*?)\]\s*/, '').trim() || cleaned;
  };

  // Fetch all messages
  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/messages/inbox');
      const data = res.data || [];
      setMessages(data);

      loadThreadConversation(activeThreadIdRef.current, false, data);
    } catch (err) {
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Load conversation for the selected active thread
  const loadThreadConversation = async (threadId, showSpinner = true, allMsgs = messages) => {
    if (showSpinner) setConvLoading(true);
    try {
      let endpoint = '/api/messages/conversation/admin';
      if (threadId === 'announcements') {
        endpoint = '/api/messages/conversation/all_clients';
      }

      const res = await api.get(endpoint);
      const data = res.data || [];
      
      if (threadId === 'announcements') {
        // Filter strictly to announcements/broadcasts
        const broadcasts = data.filter(m => 
          m.recipient_id === 'all_clients' || 
          m.recipient_id === 'all' || 
          m.is_broadcast === true ||
          m.subject?.toLowerCase().includes('announcement')
        );
        setConversation(broadcasts);
      } else if (threadId === 'support_general') {
        // General Support: messages with general subjects or no specific topic
        const generalMsgs = data.filter(m => {
          const isBcast = m.recipient_id === 'all_clients' || m.recipient_id === 'all' || m.is_broadcast;
          if (isBcast) return false;
          const clean = cleanSubject(m.subject);
          const isTopic = clean.startsWith('[') || (m.subject && !m.subject.toLowerCase().includes('support') && !m.subject.toLowerCase().includes('communication'));
          return !isTopic;
        });
        setConversation(generalMsgs.length > 0 ? generalMsgs : data.filter(m => !m.is_broadcast && m.recipient_id !== 'all_clients'));
      } else if (threadId.startsWith('thread_')) {
        // Specific topic thread by normalized key
        const targetCleanSubj = decodeURIComponent(threadId.replace('thread_', ''));
        const threadMsgs = data.filter(m => {
          const isBcast = m.recipient_id === 'all_clients' || m.recipient_id === 'all' || m.is_broadcast;
          if (isBcast) return false;
          return cleanSubject(m.subject) === targetCleanSubj;
        });
        setConversation(threadMsgs);
      }

      // Mark unread messages in this conversation as read
      const myId = (profile?._id || profile?.id)?.toString();
      const unreadIncoming = data.filter(m => !m.is_read && m.sender_id !== myId && m.sender_id === 'admin');
      if (unreadIncoming.length > 0 && threadId !== 'announcements') {
        api.put('/api/messages/conversation/admin/read', {}).catch(() => {});
        setMessages(prev => prev.map(m => m.sender_id === 'admin' ? { ...m, is_read: true } : m));
      }

      scrollToBottom();
    } catch (err) {
      console.error('Failed to load conversation thread:', err);
    } finally {
      if (showSpinner) setConvLoading(false);
    }
  };

  // Switch thread handler
  const handleSelectThread = (threadId) => {
    setActiveThreadId(threadId);
    loadThreadConversation(threadId, true);
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

      // Append to active conversation if matches current thread
      const curThread = activeThreadIdRef.current;
      const newClean = cleanSubject(newMsg.subject);

      if (
        (curThread === 'announcements' && isBroadcast) ||
        (curThread === 'support_general' && !isBroadcast && !newClean.startsWith('[')) ||
        (curThread.startsWith('thread_') && decodeURIComponent(curThread.replace('thread_', '')) === newClean)
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

      const curThread = activeThreadIdRef.current;
      const sentClean = cleanSubject(sentMsg.subject);

      if (
        (curThread === 'support_general' && !sentClean.startsWith('[')) ||
        (curThread.startsWith('thread_') && decodeURIComponent(curThread.replace('thread_', '')) === sentClean)
      ) {
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

  // Grouping Channels & Distinct Chat Threads
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

  // Group direct messages into distinct topic threads
  const topicThreads = useMemo(() => {
    const threadMap = new Map();

    directMsgs.forEach(m => {
      const cleanSub = cleanSubject(m.subject);
      // If it's a general support message, don't make it a separate thread
      const isGeneric = !cleanSub.startsWith('[') && (cleanSub.toLowerCase().includes('support') || cleanSub.toLowerCase().includes('communication'));
      if (isGeneric) return;

      if (!threadMap.has(cleanSub)) {
        threadMap.set(cleanSub, {
          threadKey: encodeURIComponent(cleanSub),
          rawSubject: cleanSub,
          title: getCleanTitle(cleanSub),
          department: extractDepartment(cleanSub),
          application: m.application_id,
          messages: [],
          unreadCount: 0,
          lastActivity: new Date(m.created_at || m.createdAt),
          latestMsg: m
        });
      }

      const t = threadMap.get(cleanSub);
      t.messages.push(m);
      if (!m.is_read && m.sender_id === 'admin') {
        t.unreadCount += 1;
      }
      const msgDate = new Date(m.created_at || m.createdAt);
      if (msgDate > t.lastActivity) {
        t.lastActivity = msgDate;
        t.latestMsg = m;
      }
    });

    return Array.from(threadMap.values()).sort((a, b) => b.lastActivity - a.lastActivity);
  }, [directMsgs]);

  const generalSupportMsgs = useMemo(() => {
    return directMsgs.filter(m => {
      const cleanSub = cleanSubject(m.subject);
      return !cleanSub.startsWith('[') && (cleanSub.toLowerCase().includes('support') || cleanSub.toLowerCase().includes('communication') || !m.subject);
    });
  }, [directMsgs]);

  const unreadAnnouncementsCount = announcementMsgs.filter(m => !m.is_read).length;
  const unreadGeneralCount = generalSupportMsgs.filter(m => !m.is_read && m.sender_id === 'admin').length;
  const totalUnreadCount = unreadAnnouncementsCount + directMsgs.filter(m => !m.is_read && m.sender_id === 'admin').length;

  const latestAnnouncement = announcementMsgs[0] || null;
  const latestGeneral = generalSupportMsgs[0] || directMsgs[0] || null;

  // Active Thread metadata resolution
  const activeThreadMeta = useMemo(() => {
    if (activeThreadId === 'announcements') {
      return {
        title: 'HFA Official Broadcasts & Bulletins',
        department: 'Official Directorate',
        subtitle: 'Official notices, regulatory standards, and compliance advisories',
        isBroadcast: true
      };
    }
    if (activeThreadId === 'support_general') {
      return {
        title: 'HFA Support & Compliance Desk',
        department: 'General Support',
        subtitle: 'Live direct chat with HFA certification and technical support team',
        isBroadcast: false
      };
    }
    if (activeThreadId.startsWith('thread_')) {
      const cleanSub = decodeURIComponent(activeThreadId.replace('thread_', ''));
      const found = topicThreads.find(t => t.rawSubject === cleanSub);
      return {
        title: found ? found.title : cleanSub,
        department: found ? found.department : extractDepartment(cleanSub),
        application: found?.application,
        subtitle: `Dedicated chat thread • Department: ${found?.department || 'Support'}`,
        rawSubject: cleanSub,
        isBroadcast: false
      };
    }
    return {
      title: 'HFA Direct Messaging',
      department: 'General Support',
      subtitle: 'Real-time encrypted support with HFA staff',
      isBroadcast: false
    };
  }, [activeThreadId, topicThreads]);

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
      let subjectToSend = 'HFA Support Inquiry';
      let appId = null;
      let replyTo = null;

      if (activeThreadId.startsWith('thread_')) {
        subjectToSend = `Re: ${activeThreadMeta.rawSubject || activeThreadMeta.title}`;
        appId = activeThreadMeta.application?._id || activeThreadMeta.application?.id || null;
        if (conversation.length > 0) {
          replyTo = conversation[0]._id || conversation[0].id;
        }
      } else if (activeThreadId === 'support_general') {
        subjectToSend = 'Re: HFA Support Desk Chat';
      }

      const payload = {
        recipient_id: 'admin',
        subject: subjectToSend,
        body: replyText.trim(),
        application_id: appId,
        reply_to: replyTo
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
      toast.success('Message sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      submittingRef.current = false;
      setSendingReply(false);
    }
  };

  // Submit compose new inquiry / start new chat
  const handleStartNewChat = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (submittingRef.current || !composeForm.body.trim() || !composeForm.subject.trim()) return;

    submittingRef.current = true;
    setSubmittingCompose(true);
    try {
      const fullSubject = `[${composeForm.department}] ${composeForm.subject.trim()}`;
      const payload = {
        recipient_id: 'admin',
        subject: fullSubject,
        body: composeForm.body.trim(),
        application_id: composeForm.application_id || null
      };

      const res = await api.post('/api/messages', payload);
      const createdMsg = res.data || res;
      
      toast.success('🎉 New chat thread started with HFA Support!');
      setShowCompose(false);
      
      const newThreadKey = `thread_${encodeURIComponent(fullSubject)}`;

      setComposeForm({
        recipient_id: 'admin',
        department: 'General Support',
        subject: '',
        body: '',
        application_id: ''
      });

      // Add to messages & switch to the new thread
      setMessages(prev => [createdMsg, ...prev]);
      setActiveThreadId(newThreadKey);
      setConversation([createdMsg]);
      scrollToBottom();
    } catch (err) {
      toast.error(err.message || 'Failed to start chat');
    } finally {
      submittingRef.current = false;
      setSubmittingCompose(false);
    }
  };

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

  // Filtered threads for sidebar
  const filteredTopicThreads = topicThreads.filter(t => {
    if (filterTab === 'unread' && t.unreadCount === 0) return false;
    if (filterTab === 'threads') return true;
    if (!search) return true;
    const s = search.toLowerCase();
    return t.title.toLowerCase().includes(s) || 
           t.department.toLowerCase().includes(s) || 
           (t.latestMsg?.body || '').toLowerCase().includes(s);
  });

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
              Direct real-time conversations & inquiry threads with HFA Certification & Audit Directorate
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

          {/* Primary Action Button: Start a New Chat / Inquiry */}
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
            <MessageSquarePlus size={16} /> Start New Chat
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
        {/* Left Side: Communication Channels & Chat Threads */}
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
                placeholder="Search chats, topics or text..." 
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
                  padding: '5px 6px',
                  borderRadius: 6,
                  fontSize: 11.5,
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
                onClick={() => setFilterTab('threads')}
                style={{
                  flex: 1,
                  padding: '5px 6px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: filterTab === 'threads' ? 700 : 500,
                  background: filterTab === 'threads' ? 'white' : 'transparent',
                  color: filterTab === 'threads' ? 'var(--primary)' : '#64748b',
                  border: 'none',
                  boxShadow: filterTab === 'threads' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Topics ({topicThreads.length})
              </button>
              <button
                onClick={() => setFilterTab('announcements')}
                style={{
                  flex: 1,
                  padding: '5px 6px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: filterTab === 'announcements' ? 700 : 500,
                  background: filterTab === 'announcements' ? 'white' : 'transparent',
                  color: filterTab === 'announcements' ? 'var(--primary)' : '#64748b',
                  border: 'none',
                  boxShadow: filterTab === 'announcements' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Notices {unreadAnnouncementsCount > 0 && <span className="badge badge-amber" style={{ fontSize: 9, padding: '1px 5px', marginLeft: 2 }}>{unreadAnnouncementsCount}</span>}
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                style={{
                  flex: 1,
                  padding: '5px 6px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: filterTab === 'unread' ? 700 : 500,
                  background: filterTab === 'unread' ? 'white' : 'transparent',
                  color: filterTab === 'unread' ? 'var(--primary)' : '#64748b',
                  border: 'none',
                  boxShadow: filterTab === 'unread' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Unread ({totalUnreadCount})
              </button>
            </div>
          </div>

          {/* Channels & Topic Threads Stream */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading channels...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                
                {/* Section 1: Pinned Official Channels */}
                {filterTab !== 'threads' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    
                    {/* Pinned Broadcast Channel */}
                    <div
                      onClick={() => handleSelectThread('announcements')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        background: activeThreadId === 'announcements' ? '#ecfdf5' : 'white',
                        border: activeThreadId === 'announcements' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                        boxShadow: activeThreadId === 'announcements' ? '0 4px 12px rgba(16,185,129,0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 15,
                            boxShadow: '0 2px 6px rgba(16,185,129,0.25)'
                          }}>
                            📢
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                              HFA Official Broadcasts
                            </div>
                            <div style={{ fontSize: 10.5, color: '#059669', fontWeight: 600 }}>
                              Public Notices & Bulletins
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          {latestAnnouncement && (
                            <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                              {new Date(latestAnnouncement.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </div>
                          )}
                          {unreadAnnouncementsCount > 0 && (
                            <span className="badge badge-amber" style={{ fontSize: 9.5, padding: '1px 6px', marginTop: 3 }}>
                              {unreadAnnouncementsCount} new
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ 
                        fontSize: 11.5, 
                        color: '#64748b', 
                        marginTop: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        paddingLeft: 41
                      }}>
                        {latestAnnouncement ? (
                          <span>
                            <strong style={{ color: '#334155' }}>{latestAnnouncement.subject}: </strong>
                            {latestAnnouncement.body}
                          </span>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No announcements yet</span>
                        )}
                      </div>
                    </div>

                    {/* General Support Desk Live Thread */}
                    <div
                      onClick={() => handleSelectThread('support_general')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        background: activeThreadId === 'support_general' ? '#f0fdfa' : 'white',
                        border: activeThreadId === 'support_general' ? '1.5px solid var(--primary)' : '1px solid #e2e8f0',
                        boxShadow: activeThreadId === 'support_general' ? '0 4px 12px rgba(27,122,122,0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            background: 'linear-gradient(135deg, #1B7A7A 0%, #155e5e 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            boxShadow: '0 2px 6px rgba(27,122,122,0.25)'
                          }}>
                            <Shield size={16} />
                            <span style={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#22c55e',
                              border: '1.5px solid white'
                            }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                              General Support Desk
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 600 }}>
                              Continuous Live Chat
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          {latestGeneral && (
                            <div style={{ fontSize: 10.5, color: unreadGeneralCount > 0 ? '#16a34a' : '#94a3b8', fontWeight: unreadGeneralCount > 0 ? 700 : 400 }}>
                              {new Date(latestGeneral.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          {unreadGeneralCount > 0 && (
                            <span className="badge badge-green" style={{ fontSize: 9.5, padding: '1px 6px', marginTop: 3 }}>
                              {unreadGeneralCount} unread
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ 
                        fontSize: 11.5, 
                        color: unreadGeneralCount > 0 ? '#1e293b' : '#64748b', 
                        fontWeight: unreadGeneralCount > 0 ? 600 : 400,
                        marginTop: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        paddingLeft: 41
                      }}>
                        {latestGeneral ? (
                          <span>
                            <strong style={{ color: latestGeneral.sender_id === 'admin' ? 'var(--primary-dark)' : '#2563eb' }}>
                              {latestGeneral.sender_id === 'admin' ? 'HFA: ' : 'You: '}
                            </strong>
                            {latestGeneral.body}
                          </span>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Open general support chat</span>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* Section 2: Active Inquiry & Chat Threads */}
                <div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    margin: '10px 4px 8px', 
                    fontSize: 11, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: '#94a3b8', 
                    letterSpacing: 0.5 
                  }}>
                    <span>Topic Chat Threads ({topicThreads.length})</span>
                    <button 
                      onClick={() => setShowCompose(true)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <Plus size={12} /> New Topic
                    </button>
                  </div>

                  {filteredTopicThreads.length === 0 ? (
                    <div style={{ 
                      background: 'white', 
                      borderRadius: 12, 
                      padding: '16px 14px', 
                      textAlign: 'center',
                      border: '1px dashed #cbd5e1'
                    }}>
                      <MessageSquare size={20} style={{ color: '#94a3b8', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>No topic threads yet</div>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 10px' }}>
                        Need to discuss an audit, invoice, or certificate? Start a dedicated thread!
                      </p>
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setShowCompose(true)}
                        style={{ borderRadius: 8, fontSize: 11, padding: '4px 10px', fontWeight: 700 }}
                      >
                        <Plus size={12} style={{ marginRight: 4 }} /> Start New Chat
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {filteredTopicThreads.map(thread => {
                        const threadKey = `thread_${thread.threadKey}`;
                        const isSelected = activeThreadId === threadKey;

                        return (
                          <div
                            key={threadKey}
                            onClick={() => handleSelectThread(threadKey)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: 12,
                              cursor: 'pointer',
                              background: isSelected ? '#f0fdfa' : (thread.unreadCount > 0 ? '#f0fdf4' : 'white'),
                              border: isSelected ? '1.5px solid var(--primary)' : '1px solid #e2e8f0',
                              boxShadow: isSelected ? '0 3px 10px rgba(27,122,122,0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <span style={{
                                  background: thread.department.includes('Audit') ? '#fef3c7' : thread.department.includes('Invoicing') ? '#dbeafe' : '#f1f5f9',
                                  color: thread.department.includes('Audit') ? '#92400e' : thread.department.includes('Invoicing') ? '#1e40af' : '#475569',
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {thread.department}
                                </span>

                                <span style={{ 
                                  fontSize: 12.5, 
                                  fontWeight: thread.unreadCount > 0 ? 800 : (isSelected ? 700 : 600), 
                                  color: '#0f172a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {thread.title}
                                </span>
                              </div>

                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 6 }}>
                                <span style={{ fontSize: 10.5, color: thread.unreadCount > 0 ? '#16a34a' : '#94a3b8', fontWeight: thread.unreadCount > 0 ? 700 : 400 }}>
                                  {new Date(thread.lastActivity).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </span>
                                {thread.unreadCount > 0 && (
                                  <span className="badge badge-green" style={{ fontSize: 9.5, padding: '1px 5px', marginLeft: 4 }}>
                                    {thread.unreadCount} new
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ 
                              fontSize: 11.5, 
                              color: thread.unreadCount > 0 ? '#1e293b' : '#64748b', 
                              fontWeight: thread.unreadCount > 0 ? 600 : 400,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              <strong style={{ color: thread.latestMsg?.sender_id === 'admin' ? 'var(--primary-dark)' : '#2563eb' }}>
                                {thread.latestMsg?.sender_id === 'admin' ? 'HFA: ' : 'You: '}
                              </strong>
                              {thread.latestMsg?.body || 'Discussion opened'}
                            </div>

                            {thread.application && (
                              <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', background: '#f8fafc', padding: '1px 5px', borderRadius: 4 }}>
                                <Building2 size={10} /> App: {thread.application?.company_name || thread.application?.scheme || 'Halal Standard'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Stream & Interactive Composer */}
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
                background: activeThreadMeta.isBroadcast 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #1B7A7A 0%, #155e5e 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {activeThreadMeta.isBroadcast ? '📢' : <Shield size={20} />}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {activeThreadMeta.title}
                  </h3>
                  <span className="badge badge-green" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    {activeThreadMeta.department}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {activeThreadMeta.subtitle}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                className="btn btn-outline-primary btn-sm" 
                onClick={() => setShowCompose(true)}
                style={{ borderRadius: 8, fontSize: 12, fontWeight: 700 }}
              >
                <Plus size={13} style={{ marginRight: 4 }} /> Start Another Chat
              </button>

              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => loadThreadConversation(activeThreadId, false)}
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
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading conversation...</div>
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
                  {activeThreadMeta.isBroadcast ? 'No Broadcast Notices' : 'No messages in this chat yet'}
                </h3>
                <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, marginBottom: 18 }}>
                  {activeThreadMeta.isBroadcast
                    ? 'Official notices and regulatory advisories published by HFA will appear here.'
                    : 'Send a message below to start communicating with HFA staff in this topic.'
                  }
                </p>
                {!activeThreadMeta.isBroadcast && (
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => setShowCompose(true)}
                    style={{ borderRadius: 8, fontWeight: 700 }}
                  >
                    <Plus size={14} style={{ marginRight: 4 }} /> Start New Chat
                  </button>
                )}
              </div>
            ) : (
              conversation.map((msg, idx) => {
                const myId = (profile?._id || profile?.id)?.toString();
                const isFromClient = msg.sender_id === myId || msg.sender_id === profile?._id;
                const isBroadcast = msg.recipient_id === 'all_clients' || msg.recipient_id === 'all' || msg.is_broadcast || activeThreadId === 'announcements';

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
                      /* Regular Chat Bubble */
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
                              {msg.sender?.full_name || 'HFA Staff'}
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
                  placeholder={`Reply in ${activeThreadMeta.title}... (Press Enter to send, Shift+Enter for newline)`}
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

      {/* Start New Chat / Inquiry Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquarePlus size={20} style={{ color: 'var(--primary)' }} />
                <span className="modal-title">Start a New Chat Thread</span>
              </div>
              <button className="modal-close" onClick={() => setShowCompose(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleStartNewChat}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Choose a department and topic to open a dedicated support thread with HFA officers.
                </p>

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
                  <label className="form-label">Chat Topic / Subject <span>*</span></label>
                  <input
                    className="form-control"
                    placeholder="e.g. Halal Audit Readiness Inquiry"
                    value={composeForm.subject}
                    onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">First Message Details <span>*</span></label>
                  <textarea
                    className="form-control"
                    rows={5}
                    placeholder="Provide initial questions or details for the HFA support team..."
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
                  disabled={submittingCompose || !composeForm.subject.trim() || !composeForm.body.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                >
                  {submittingCompose ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><MessageSquarePlus size={15} /> Start Chat</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
