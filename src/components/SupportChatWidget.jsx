import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  MessageSquare, Bot, User, Send, X, Minimize2, Sparkles, UserCheck,
  Building2, ChevronRight, HelpCircle, CheckCircle, Clock, AlertCircle,
  RefreshCw, ArrowLeft, Shield, Paperclip, ExternalLink
} from 'lucide-react';

const DEPARTMENTS = [
  { id: 'Billing & Accounts', label: 'Billing Dept', icon: '💳', desc: 'Invoices, fee inquiries & payment receipts' },
  { id: 'Application & Processing', label: 'Application Dept', icon: '📋', desc: 'New submissions, stages & required documents' },
  { id: 'Certificate & Renewal', label: 'Certificate Dept', icon: '📜', desc: 'Active certificates, renewals & export letters' },
  { id: 'Audits & Inspections', label: 'Audit Dept', icon: '🔍', desc: 'Audit dates, site visits & NC resolution' },
  { id: 'Food Technology & Vetting', label: 'Food Tech Dept', icon: '🧪', desc: 'Formulations, ingredients & add-on products' },
  { id: 'General Support', label: 'Other Inquiries', icon: '💬', desc: 'Portal access, user accounts & general help' },
];

const SUGGESTED_QUESTIONS = [
  'What are the HFA certification schemes?',
  'What documents are required to apply?',
  'How do I pay an invoice or check billing?',
  'How do I prepare for a Halal site audit?',
  'How does certificate renewal work?'
];

export default function SupportChatWidget() {
  const { profile } = useAuth();
  // Persist and restore open/tab state across reloads
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem('hfa_support_chat_open') === 'true';
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('hfa_support_chat_tab') || 'ai';
  });

  // Keep open/tab synced to localStorage
  useEffect(() => {
    localStorage.setItem('hfa_support_chat_open', isOpen ? 'true' : 'false');
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('hfa_support_chat_tab', activeTab);
  }, [activeTab]);
  
  // AI Chat State
  const [aiMessages, setAiMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('hfa_ai_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(m => {
            if (typeof m.content === 'string') {
              return {
                ...m,
                content: m.content
                  .replace(/Assalamu\s+Alaikum!?/gi, 'Hello!')
                  .replace(/Assalam\s+Alaykum!?/gi, 'Hello!')
                  .replace(/Talk to (Real )?Person/gi, 'Speak with an Agent')
              };
            }
            return m;
          });
        }
      }
    } catch {}
    return [
      {
        id: 'init_welcome',
        role: 'assistant',
        content: `**Hello! Welcome to the HFA Support Assistant.** 👋\n\nI can instantly answer questions about **Halal Certification Schemes**, **Application Stages**, **Required Documents**, **Billing & Invoices**, **Audits**, and **Certificates**.\n\nHow can I help you today? You can also click **"Speak with an Agent"** at any time to connect with our support team.`,
        time: new Date()
      }
    ];
  });
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Save AI messages to localStorage
  useEffect(() => {
    if (aiMessages.length > 0) {
      try {
        localStorage.setItem('hfa_ai_messages', JSON.stringify(aiMessages.slice(-25)));
      } catch {}
    }
  }, [aiMessages]);

  // Live Ticket State (Human Handover)
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketReply, setTicketReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingActiveTicket, setLoadingActiveTicket] = useState(false);

  // Request Human Form State
  const [selectedDept, setSelectedDept] = useState('Billing & Accounts');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Unread badge
  const [unreadReplies, setUnreadReplies] = useState(0);

  const messagesEndRef = useRef(null);
  const ticketEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    if (activeTab === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'ticket') {
      ticketEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, activeTicket?.responses, activeTab, isOpen]);

  // Fetch active ticket on load / reload
  const fetchActiveTicket = async () => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;
    try {
      setLoadingActiveTicket(true);
      const res = await api.get('/api/tickets/active-chat');
      const ticket = res.data?.data || res.data;
      if (ticket && (ticket.status === 'open' || ticket.status === 'in_progress')) {
        setActiveTicket(ticket);
        // If the user previously had a ticket active, automatically switch to 'ticket' tab
        const savedTab = localStorage.getItem('hfa_support_chat_tab');
        if (!savedTab || savedTab === 'ticket' || savedTab === 'request_form') {
          setActiveTab('ticket');
        }
      } else {
        // If resolved/closed, clear active ticket so user can start a new query/request
        setActiveTicket(null);
        if (activeTab === 'ticket') {
          setActiveTab('ai');
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingActiveTicket(false);
    }
  };

  useEffect(() => {
    fetchActiveTicket();
  }, [profile]);

  // Socket.io Real-Time Synchronization for Ticket replies & updates
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleTicketReply = ({ ticketId, ticket: updatedTicket, reply }) => {
      const myId = (profile?._id || profile?.id)?.toString();
      const isStaffReply = reply?.user_id !== myId;

      const currentTicketId = (activeTicket?._id || activeTicket?.id)?.toString();
      const targetId = ticketId?.toString();

      if (currentTicketId === targetId || !activeTicket) {
        if (updatedTicket.status === 'resolved' || updatedTicket.status === 'closed') {
          setActiveTicket(updatedTicket);
        } else {
          setActiveTicket(updatedTicket);
          setActiveTab('ticket');
        }

        if (!isOpen && isStaffReply) {
          setUnreadReplies(prev => prev + 1);
        }
      }
    };

    const handleTicketUpdated = (updatedTicket) => {
      const currentTicketId = (activeTicket?._id || activeTicket?.id)?.toString();
      const targetId = (updatedTicket._id || updatedTicket.id)?.toString();

      if (currentTicketId === targetId || (!activeTicket && (updatedTicket.status === 'open' || updatedTicket.status === 'in_progress'))) {
        setActiveTicket(updatedTicket);
        if (updatedTicket.status === 'resolved' || updatedTicket.status === 'closed') {
          // Keep showing it with resolved notification until client initiates new request or closes
        }
      }
    };

    const handleAgentConnected = (data) => {
      const currentTicketId = (activeTicket?._id || activeTicket?.id)?.toString();
      const targetId = (data.ticketId || data.ticket?._id || data.ticket?.id)?.toString();

      if (!activeTicket || currentTicketId === targetId) {
        if (data.ticket) {
          setActiveTicket(data.ticket);
        }
        const agentName = data.agent_first_name || data.agent?.full_name?.trim()?.split(/\s+/)[0] || 'Support';
        toast.success(`Agent ${agentName} is connected`, {
          icon: '🟢',
          duration: 4500
        });
      }
    };

    socket.on('ticket_reply', handleTicketReply);
    socket.on('ticket_updated', handleTicketUpdated);
    socket.on('agent_connected', handleAgentConnected);

    return () => {
      socket.off('ticket_reply', handleTicketReply);
      socket.off('ticket_updated', handleTicketUpdated);
      socket.off('agent_connected', handleAgentConnected);
    };
  }, [activeTicket, isOpen, profile]);

  // Helper: check if an agent has viewed/connected to this ticket
  const isAgentConnected = Boolean(
    activeTicket?.assigned_staff &&
    (activeTicket?.agent_connected || 
     activeTicket?.agent_viewed_at || 
     (activeTicket?.responses && activeTicket.responses.some(r => {
       const role = (r.user_role || '').toLowerCase();
       return role.includes('staff') || role.includes('admin') || role.includes('agent');
     })))
  );

  // Helper: extract agent's first name
  const agentFirstName = (() => {
    if (!activeTicket?.assigned_staff) return 'Specialist';
    const raw = activeTicket.assigned_staff.full_name || activeTicket.assigned_staff.username || activeTicket.assigned_staff.email || '';
    const clean = raw.trim().split(/\s+/)[0];
    return clean ? (clean.charAt(0).toUpperCase() + clean.slice(1)) : 'Specialist';
  })();

  // Handle open widget
  const handleOpenWidget = () => {
    setIsOpen(true);
    setUnreadReplies(0);
    if (activeTicket && (activeTicket.status === 'open' || activeTicket.status === 'in_progress')) {
      setActiveTab('ticket');
    }
  };

  // Send message to AI Assistant
  const handleSendAi = async (textToSend) => {
    const query = (textToSend || aiInput).trim();
    if (!query || aiLoading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      time: new Date()
    };

    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);

    try {
      const historyPayload = aiMessages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/api/tickets/ai-chat', {
        message: query,
        history: historyPayload
      });

      const aiData = res.data?.data;
      const aiReply = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: aiData?.reply || "I'm here to help! Please ask about certification, application documents, or click 'Speak with an Agent'.",
        suggestedDept: aiData?.suggestedDepartment,
        needsHumanOffer: aiData?.needsHumanOffer,
        time: new Date()
      };

      setAiMessages(prev => [...prev, aiReply]);
    } catch {
      setAiMessages(prev => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: 'assistant',
          content: "I'm temporarily experiencing connectivity issues. You can click **'Speak with an Agent'** above to connect directly with our support team.",
          needsHumanOffer: true,
          time: new Date()
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Submit Request for Human Agent
  const handleSubmitHumanHandover = async (e) => {
    e?.preventDefault();
    if (!issueDescription.trim()) {
      return toast.error('Please describe your issue.');
    }

    setSubmittingHandover(true);
    try {
      const res = await api.post('/api/tickets/request-human', {
        department: selectedDept,
        description: issueDescription.trim(),
        priority
      });

      const newTicket = res.data?.data || res.data;
      setActiveTicket(newTicket);
      toast.success('Your support request has been submitted. Connecting you with an agent.');
      setIssueDescription('');
      setActiveTab('ticket');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit support request');
    } finally {
      setSubmittingHandover(false);
    }
  };

  // Reply in Live Ticket
  const handleSendTicketReply = async (e) => {
    e?.preventDefault();
    if (!ticketReply.trim() || sendingReply || !activeTicket) return;

    setSendingReply(true);
    const targetId = activeTicket._id || activeTicket.id;
    try {
      const res = await api.post(`/api/tickets/${targetId}/reply`, {
        message: ticketReply.trim()
      });
      const updated = res.data?.data || res.data;
      setActiveTicket(updated);
      setTicketReply('');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to send message');
    } finally {
      setSendingReply(false);
    }
  };

  // Simple Markdown-like Renderer for AI Responses
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      // Horizontal rule
      if (line.trim() === '---') {
        return <hr key={idx} style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.08)', margin: '8px 0' }} />;
      }

      // Bullets
      if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
        const content = line.trim().substring(2);
        return (
          <div key={idx} style={{ display: 'flex', gap: 6, margin: '3px 0 3px 6px', fontSize: 13, lineHeight: 1.5 }}>
            <span style={{ color: '#059669', fontWeight: 800 }}>•</span>
            <div>{parseInlineBold(content)}</div>
          </div>
        );
      }

      // Numbered lists e.g. "1. "
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={idx} style={{ display: 'flex', gap: 6, margin: '4px 0 4px 6px', fontSize: 13, lineHeight: 1.5 }}>
            <span style={{ color: '#047857', fontWeight: 700, minWidth: 16 }}>{numMatch[1]}.</span>
            <div>{parseInlineBold(numMatch[2])}</div>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} style={{ height: 6 }} />;
      }

      return (
        <p key={idx} style={{ margin: '3px 0', fontSize: 13, lineHeight: 1.55 }}>
          {parseInlineBold(line)}
        </p>
      );
    });
  };

  // Inline bold parser
  const parseInlineBold = (str) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#0f172a', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} style={{ color: '#475569' }}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Bottom-Right Launcher Icon */}
      {!isOpen && (
        <div
          onClick={handleOpenWidget}
          id="hfa-support-chat-launcher"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          {/* Subtle invitation pill */}
          {/* <div
            style={{
              background: 'white',
              color: '#0f172a',
              padding: '8px 14px',
              borderRadius: 24,
              fontSize: 12.5,
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'transform 0.2s',
            }}
          >
            <Sparkles size={14} style={{ color: '#059669' }} />
            <span>HFA Support </span>
          </div> */}

          {/* Launcher Circle Button */}
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(5, 150, 105, 0.4), 0 4px 10px rgba(0,0,0,0.1)',
              position: 'relative',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            title="Open HFA Support Chat"
          >
            <MessageSquare size={26} />
            {/* Pulsing online badge */}
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 13,
                height: 13,
                borderRadius: '50%',
                background: '#22c55e',
                border: '2px solid white',
                boxShadow: '0 0 8px #22c55e'
              }}
            />

            {/* Unread badge */}
            {unreadReplies > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
                }}
              >
                {unreadReplies}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Responsive Styles & Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-slow {
          animation: spinSlow 2.5s linear infinite;
        }
        @media (max-width: 640px) {
          #hfa-support-chatbox-window {
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100% !important;
            max-height: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Floating Support Chatbox Window */}
      {isOpen && (
        <div
          id="hfa-support-chatbox-window"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 400,
            maxWidth: 'calc(100vw - 32px)',
            height: 610,
            maxHeight: 'calc(100vh - 80px)',
            background: 'white',
            borderRadius: 20,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'Inter, system-ui, sans-serif',
            animation: 'fadeInUp 0.25s ease'
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
              color: 'white',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                  position: 'relative'
                }}
              >
                <Bot size={20} />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: '#22c55e',
                    border: '1.5px solid #047857'
                  }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: '-0.01em' }}>
                  HFA Support Center
                </div>
                <div style={{ fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>AI Assistant</span> • <span>Live Support</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Speak with Agent Header Button */}
              {activeTab === 'ai' && (
                <button
                  onClick={() => setActiveTab('request_form')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 14,
                    padding: '5px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  title="Speak with an Agent"
                >
                  <User size={12} />
                  <span>Speak with an Agent</span>
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: 4,
                  opacity: 0.85,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Minimize support chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '6px 12px',
              gap: 6
            }}
          >
            <button
              onClick={() => setActiveTab('ai')}
              style={{
                flex: 1,
                padding: '7px 0',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: activeTab === 'ai' ? 800 : 600,
                background: activeTab === 'ai' ? 'white' : 'transparent',
                color: activeTab === 'ai' ? '#047857' : '#64748b',
                boxShadow: activeTab === 'ai' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transition: 'all 0.15s ease'
              }}
            >
              <Sparkles size={13} />
              <span>AI Assistant</span>
            </button>

            <button
              onClick={() => {
                if (activeTicket) {
                  setActiveTab('ticket');
                } else {
                  setActiveTab('request_form');
                }
              }}
              style={{
                flex: 1,
                padding: '7px 0',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: (activeTab === 'ticket' || activeTab === 'request_form') ? 800 : 600,
                background: (activeTab === 'ticket' || activeTab === 'request_form') ? 'white' : 'transparent',
                color: (activeTab === 'ticket' || activeTab === 'request_form') ? '#047857' : '#64748b',
                boxShadow: (activeTab === 'ticket' || activeTab === 'request_form') ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              <UserCheck size={13} />
              <span>{activeTicket ? (isAgentConnected ? `Agent ${agentFirstName}` : 'Live Chat') : 'Speak with an Agent'}</span>
              {activeTicket && activeTicket.status !== 'closed' && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isAgentConnected ? '#22c55e' : '#0ea5e9'
                  }}
                />
              )}
            </button>
          </div>

          {/* Tab 1: AI Assistant Chat Area */}
          {activeTab === 'ai' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Messages Scroll Area */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: '#fcfcfd'
                }}
              >
                {aiMessages.map((m) => {
                  const isAssistant = m.role === 'assistant';

                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isAssistant ? 'flex-start' : 'flex-end',
                        maxWidth: '88%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      <div
                        style={{
                          background: isAssistant ? 'white' : '#047857',
                          color: isAssistant ? '#1e293b' : 'white',
                          padding: '12px 14px',
                          borderRadius: isAssistant ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                          border: isAssistant ? '1px solid #e2e8f0' : 'none',
                          boxShadow: isAssistant ? '0 1px 4px rgba(0,0,0,0.05)' : '0 2px 6px rgba(4, 120, 87, 0.25)',
                          fontSize: 13,
                          lineHeight: 1.55,
                          wordBreak: 'break-word'
                        }}
                      >
                        {isAssistant ? renderFormattedText(m.content) : m.content}
                      </div>

                      {/* Interactive Human Offer Box if suggested */}
                      {isAssistant && m.needsHumanOffer && (
                        <div
                          style={{
                            marginTop: 4,
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8
                          }}
                        >
                          <div style={{ fontSize: 11.5, color: '#065f46', fontWeight: 600 }}>
                            Need specialized staff review?
                          </div>
                          <button
                            onClick={() => {
                              if (m.suggestedDept) setSelectedDept(m.suggestedDept);
                              setActiveTab('request_form');
                            }}
                            style={{
                              background: '#047857',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              padding: '5px 9px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Speak with an Agent →
                          </button>
                        </div>
                      )}

                      <span style={{ fontSize: 10, color: '#94a3b8', alignSelf: isAssistant ? 'flex-start' : 'flex-end', padding: '0 4px' }}>
                        {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}

                {/* AI Typing Indicator */}
                {aiLoading && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      borderRadius: '14px 14px 14px 2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>AI is typing</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <span className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#047857' }} />
                      <span className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#047857' }} />
                      <span className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#047857' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick suggestions pills */}
              {aiMessages.length <= 3 && (
                <div
                  style={{
                    padding: '8px 14px',
                    background: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: 6,
                    overflowX: 'auto',
                    scrollbarWidth: 'none'
                  }}
                >
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendAi(q)}
                      style={{
                        whiteSpace: 'nowrap',
                        background: 'white',
                        border: '1px solid #cbd5e1',
                        borderRadius: 14,
                        padding: '4px 10px',
                        fontSize: 11,
                        color: '#334155',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* AI Chat Input Bar */}
              <div
                style={{
                  padding: '10px 14px',
                  background: 'white',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <input
                  type="text"
                  placeholder="Ask a question about certification..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSendAi();
                  }}
                  disabled={aiLoading}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => handleSendAi()}
                  disabled={aiLoading || !aiInput.trim()}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#047857',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (aiLoading || !aiInput.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (aiLoading || !aiInput.trim()) ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Tab 2A: Request Human Agent Form */}
          {activeTab === 'request_form' && (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '18px 20px',
                background: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setActiveTab('ai')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={14} /> Back to AI
                </button>

                {activeTicket && (
                  <button
                    onClick={() => setActiveTab('ticket')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#047857',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    View Active Ticket →
                  </button>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Speak with an Agent
                </h4>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  Select your department and describe your inquiry. A support specialist will be connected to assist you.
                </p>
              </div>

              <form onSubmit={handleSubmitHumanHandover} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Department Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Select Department *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {DEPARTMENTS.map(dept => {
                      const isSelected = selectedDept === dept.id;
                      return (
                        <div
                          key={dept.id}
                          onClick={() => setSelectedDept(dept.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: isSelected ? '#ecfdf5' : 'white',
                            border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 15 }}>{dept.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#047857' : '#1e293b' }}>
                              {dept.label}
                            </span>
                          </div>
                          <span style={{ fontSize: 10.5, color: '#64748b', marginTop: 2, lineHeight: 1.3 }}>
                            {dept.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Issue Description */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Describe Your Issue *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide details about your question, invoice reference, or application..."
                    value={issueDescription}
                    onChange={e => setIssueDescription(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      lineHeight: 1.5,
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Priority Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Priority Level
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['low', 'medium', 'high'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        style={{
                          flex: 1,
                          padding: '6px 0',
                          borderRadius: 8,
                          border: priority === p ? '1.5px solid #047857' : '1px solid #cbd5e1',
                          background: priority === p ? '#ecfdf5' : 'white',
                          color: priority === p ? '#047857' : '#475569',
                          fontSize: 11.5,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          cursor: 'pointer'
                        }}
                      >
                        {p === 'high' ? '⚡ High' : p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submittingHandover || !issueDescription.trim()}
                  style={{
                    marginTop: 6,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: 'white',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: (submittingHandover || !issueDescription.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (submittingHandover || !issueDescription.trim()) ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  {submittingHandover ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                  <span>{submittingHandover ? 'Connecting...' : 'Connect with an Agent'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 2B: Live Human Ticket Conversation */}
          {activeTab === 'ticket' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Ticket Status Header Banner */}
              <div
                style={{
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  borderBottom: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#047857' }}>
                      {activeTicket?.ticket_number}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 6,
                        background: (activeTicket?.status === 'resolved' || activeTicket?.status === 'closed') ? '#dcfce7' : '#eff6ff',
                        color: (activeTicket?.status === 'resolved' || activeTicket?.status === 'closed') ? '#15803d' : '#1d4ed8',
                        textTransform: 'uppercase'
                      }}
                    >
                      {activeTicket?.status === 'resolved' ? '✓ Resolved' : (activeTicket?.status === 'closed' ? 'Closed' : (activeTicket?.status?.replace('_', ' ') || 'Open'))}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                    Dept: <strong>{activeTicket?.department}</strong>
                  </div>
                </div>

                {/* Assignment Indicator */}
                <div style={{ textAlign: 'right' }}>
                  {(activeTicket?.status === 'resolved' || activeTicket?.status === 'closed') ? (
                    <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={13} />
                      <span>Ticket Resolved</span>
                    </div>
                  ) : isAgentConnected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#047857', fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px #bbf7d0', display: 'inline-block' }} />
                      <span>Agent {agentFirstName} connected</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} className="spin-slow" />
                      <span>Connecting with agent...</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setActiveTicket(null);
                      setActiveTab('request_form');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#047857',
                      fontSize: 11,
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      marginTop: 2
                    }}
                  >
                    + New Question / Request
                  </button>
                </div>
              </div>

              {/* Ticket Messages History */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: '#fafafa'
                }}
              >
                {/* Initial Client Issue Message */}
                <div
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '88%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}
                >
                  <div
                    style={{
                      background: '#047857',
                      color: 'white',
                      padding: '12px 14px',
                      borderRadius: '14px 14px 2px 14px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      boxShadow: '0 2px 6px rgba(4, 120, 87, 0.2)'
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9, marginBottom: 4 }}>
                      Your Issue Description:
                    </div>
                    {activeTicket?.message}
                  </div>
                  <span style={{ fontSize: 10, color: '#94a3b8', alignSelf: 'flex-end' }}>
                    {activeTicket?.created_at && new Date(activeTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Agent Connection Notice */}
                {isAgentConnected ? (
                  <div
                    style={{
                      alignSelf: 'center',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: 12,
                      padding: '8px 16px',
                      fontSize: 12,
                      color: '#065f46',
                      fontWeight: 700,
                      textAlign: 'center',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 1px 3px rgba(5, 150, 105, 0.08)'
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    <span>Agent {agentFirstName} is connected</span>
                  </div>
                ) : (activeTicket?.status === 'resolved' || activeTicket?.status === 'closed') ? (
                  <div
                    style={{
                      alignSelf: 'center',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: 11.5,
                      color: '#15803d',
                      fontWeight: 600,
                      textAlign: 'center',
                      maxWidth: '90%'
                    }}
                  >
                    <span>✓ This support request has been marked as resolved.</span>
                  </div>
                ) : (
                  <div
                    style={{
                      alignSelf: 'center',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: 11.5,
                      color: '#0369a1',
                      textAlign: 'center',
                      maxWidth: '90%'
                    }}
                  >
                    <span>Your request has been received. A support specialist will be connected shortly.</span>
                  </div>
                )}

                {/* Staff and Client Responses */}
                {activeTicket?.responses?.map((r, idx) => {
                  const myId = (profile?._id || profile?.id)?.toString();
                  const isMine = r.user_id === myId;

                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '88%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3
                      }}
                    >
                      <div
                        style={{
                          background: isMine ? '#047857' : 'white',
                          color: isMine ? 'white' : '#1e293b',
                          padding: '12px 14px',
                          borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          border: isMine ? 'none' : '1px solid #e2e8f0',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                          fontSize: 13,
                          lineHeight: 1.5
                        }}
                      >
                        {!isMine && (
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#047857', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <UserCheck size={12} />
                            <span>Agent {r.user_name ? r.user_name.trim().split(/\s+/)[0] : agentFirstName}</span>
                          </div>
                        )}
                        {r.message}
                      </div>
                      <span style={{ fontSize: 10, color: '#94a3b8', alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
                        {r.created_at && new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={ticketEndRef} />
              </div>

              {/* Reply Input Bar */}
              <form
                onSubmit={handleSendTicketReply}
                style={{
                  padding: '10px 14px',
                  background: 'white',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <input
                  type="text"
                  placeholder={isAgentConnected ? `Type reply to Agent ${agentFirstName}...` : "Type reply to support team..."}
                  value={ticketReply}
                  onChange={e => setTicketReply(e.target.value)}
                  disabled={sendingReply || activeTicket?.status === 'closed'}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingReply || !ticketReply.trim() || activeTicket?.status === 'closed'}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#047857',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (sendingReply || !ticketReply.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (sendingReply || !ticketReply.trim()) ? 0.6 : 1
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
