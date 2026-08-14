import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle,
  FileText, Receipt, Award, Calendar, MessageSquare, Ticket,
  ExternalLink, Check, Trash2, ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badge: 'Success'
  },
  error: {
    icon: AlertCircle,
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    badge: 'Urgent'
  },
  warning: {
    icon: AlertTriangle,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    badge: 'Action Needed'
  },
  info: {
    icon: Info,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    badge: 'Update'
  },
  application: {
    icon: FileText,
    color: '#0d9488',
    bg: '#f0fdfa',
    border: '#99f6e4',
    badge: 'Application'
  },
  invoice: {
    icon: Receipt,
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
    badge: 'Invoice'
  },
  certificate: {
    icon: Award,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    badge: 'Certificate'
  },
  audit: {
    icon: Calendar,
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    badge: 'Audit'
  },
  message: {
    icon: MessageSquare,
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    badge: 'Message'
  }
};

function timeAgo(date) {
  if (!date) return 'Just now';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  loading = false,
  onRefresh,
  onOpenActionModal
}) {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'action'
  const [clearing, setClearing] = useState(false);

  if (!isOpen) return null;

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      toast.success('All notifications marked as read');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.put(`/api/notifications/${n._id || n.id}/read`);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }

    onClose();

    // Check if notification triggers a quick action modal
    const titleLower = (n.title || '').toLowerCase();
    const messageLower = (n.message || '').toLowerCase();
    
    let modalType = null;
    if (titleLower.includes('proposal') || messageLower.includes('proposal')) modalType = 'proposal';
    else if (titleLower.includes('invoice') || messageLower.includes('invoice') || titleLower.includes('payment') || messageLower.includes('payment')) modalType = 'payment';
    else if (titleLower.includes('non-conformity') || titleLower.includes('nc ') || titleLower.endsWith('nc') || messageLower.includes('non-conformity') || messageLower.includes('nc ')) modalType = 'nc';
    else if (titleLower.includes('audit') || titleLower.includes('date') || messageLower.includes('audit') || messageLower.includes('date')) modalType = 'audit';
    else if (titleLower.includes('agreement') || messageLower.includes('agreement')) modalType = 'agreement';

    const getCleanId = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object') return String(val._id || val.id || '');
      return String(val);
    };

    const extractAppId = () => {
      const raw = n.application_id || n.appId || n.app_id || 
                  n.data?.application_id || n.data?.app_id || n.data?.appId ||
                  n.audit_id || n.invoice_id || n.agreement_id || n.proposal_id;
      if (raw) {
        const clean = getCleanId(raw);
        if (clean && clean !== '[object Object]') return clean;
      }
      const link = n.link || '';
      const m1 = link.match(/\/applications\/([a-fA-F0-9]{24})/);
      if (m1) return m1[1];
      const m2 = link.match(/appId=([a-fA-F0-9]{24})/);
      if (m2) return m2[1];
      const match = link.match(/([a-fA-F0-9]{24})/) || (n.message || '').match(/([a-fA-F0-9]{24})/);
      return match ? match[1] : null;
    };

    const targetAppId = extractAppId();

    if (modalType && targetAppId && onOpenActionModal) {
      onOpenActionModal(modalType, targetAppId);
      return;
    }

    if (n.link) {
      navigate(n.link);
    } else if (modalType && onOpenActionModal) {
      onOpenActionModal(modalType, null);
    }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/notifications/${id}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      // If delete endpoint isn't supported, mark as read
      api.put(`/api/notifications/${id}/read`).then(() => onRefresh && onRefresh()).catch(() => {});
    }
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const filteredNotifications = safeNotifications.filter(n => {
    if (!n) return false;
    if (filterTab === 'unread') return !n.is_read;
    if (filterTab === 'action') {
      const t = (n.title || '').toLowerCase();
      return t.includes('action') || t.includes('require') || t.includes('proposal') || t.includes('invoice') || t.includes('agreement') || t.includes('audit');
    }
    return true;
  });

  return (
    <div
      className="notification-dropdown-panel"
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 12px)',
        width: 400,
        maxWidth: '92vw',
        maxHeight: '82vh',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0,0,0,0.1)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'notifDropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f1f5f9',
        background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.2 }}>Notifications</div>
            <div style={{ fontSize: 11.5, color: unreadCount > 0 ? 'var(--primary)' : '#64748b', fontWeight: 600 }}>
              {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--primary)',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 6,
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Mark all notifications as read"
            >
              <Check size={12} /> Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: 6,
              padding: 4,
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        padding: '8px 16px',
        background: '#f8fafc',
        borderBottom: '1px solid #f1f5f9',
        gap: 6,
        flexShrink: 0
      }}>
        {[
          { id: 'all', label: `All (${safeNotifications.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'action', label: 'Actions' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            style={{
              flex: 1,
              padding: '5px 8px',
              fontSize: 11.5,
              fontWeight: filterTab === tab.id ? 700 : 500,
              color: filterTab === tab.id ? 'var(--primary)' : '#64748b',
              background: filterTab === tab.id ? '#ffffff' : 'transparent',
              border: filterTab === tab.id ? '1px solid #e2e8f0' : '1px solid transparent',
              borderRadius: 6,
              boxShadow: filterTab === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380, padding: 0 }}>
        {loading && safeNotifications.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Loading notifications...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Bell size={24} style={{ color: '#cbd5e1' }} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#334155' }}>
              {filterTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              You will receive real-time updates when HFA updates your certification.
            </div>
          </div>
        ) : (
          filteredNotifications.map(n => {
            const isRead = n.is_read;
            const typeKey = n.type || 'info';
            const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.info;
            const Icon = config.icon;

            return (
              <div
                key={n._id || n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  background: isRead ? '#ffffff' : config.bg,
                  borderBottom: '1px solid #f1f5f9',
                  borderLeft: isRead ? '3px solid transparent' : `3px solid ${config.color}`,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = isRead ? '#f8fafc' : config.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = isRead ? '#ffffff' : config.bg; }}
              >
                {/* Type Icon */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: isRead ? '#f1f5f9' : '#ffffff',
                  border: `1px solid ${isRead ? '#e2e8f0' : config.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2
                }}>
                  <Icon size={16} style={{ color: config.color }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                    <span style={{
                      fontWeight: isRead ? 600 : 800,
                      fontSize: 13,
                      color: isRead ? '#334155' : '#0f172a',
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>
                      {timeAgo(n.created_at || n.createdAt)}
                    </span>
                  </div>

                  <p style={{
                    fontSize: 12,
                    color: isRead ? '#64748b' : '#334155',
                    lineHeight: 1.45,
                    margin: 0,
                    wordBreak: 'break-word'
                  }}>
                    {n.message}
                  </p>

                  {/* Footer link cue */}
                  {n.link && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      color: config.color
                    }}>
                      <span>View details</span>
                      <ArrowRight size={11} />
                    </div>
                  )}
                </div>

                {/* Unread Glow Dot */}
                {!isRead && (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: config.color,
                    marginTop: 6,
                    flexShrink: 0,
                    boxShadow: `0 0 0 3px ${config.border}`
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #f1f5f9',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <button
          onClick={() => {
            onClose();
            navigate('/messages/inbox');
          }}
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: '#64748b',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <MessageSquare size={13} /> Messages &amp; Inbox
        </button>

        <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 500 }}>
          HFA Real-time Sync
        </span>
      </div>
    </div>
  );
}
