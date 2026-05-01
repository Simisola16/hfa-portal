import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle, FileText } from 'lucide-react';
import api from '../lib/api';

const pageTitles = {
  '/dashboard': { title: 'Dashboard', sub: 'Overview of your certification status' },
  '/applications': { title: 'Applications', sub: 'Manage your halal certification applications' },
  '/proposals': { title: 'Proposals', sub: 'Manage your certification proposals' },
  '/certificates': { title: 'Certificates', sub: 'View and download your certificates' },
  '/products': { title: 'Products', sub: 'Manage your certified products' },
  '/export': { title: 'Export Certificates', sub: 'Manage export certification requests' },
  '/messages': { title: 'Messages', sub: 'Communicate with HFA staff' },
  '/messages/inbox': { title: 'Inbox', sub: 'Your received messages' },
  '/messages/outbox': { title: 'Outbox', sub: 'Your sent messages' },
  '/manage-users': { title: 'Manage Users', sub: 'Manage team members for your organisation' },
  '/sites': { title: 'Manage Sites', sub: 'Manage your business locations' },
  '/invoices': { title: 'Invoices', sub: 'View and manage your invoices' },
  '/profile': { title: 'Profile & Settings', sub: 'Manage your account information' },
};

const TYPE_ICON = {
  success: <CheckCircle size={16} style={{ color: '#16a34a' }} />,
  error: <AlertCircle size={16} style={{ color: '#ef4444' }} />,
  warning: <AlertTriangle size={16} style={{ color: '#d97706' }} />,
  info: <Info size={16} style={{ color: '#3b82f6' }} />,
  application: <FileText size={16} style={{ color: 'var(--primary)' }} />,
};

const TYPE_BG = {
  success: '#f0fdf4', error: '#fef2f2', warning: '#fffbeb', info: '#eff6ff', application: '#f0fdf4',
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const page = pageTitles[location.pathname] || { title: 'HFA Portal', sub: 'Halal Food Authority UK' };

  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [readIds, setReadIds] = useState(new Set());
  const panelRef = useRef();

  const fetchNotifs = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data || []);
      setUnread(res.unread || 0);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => { fetchNotifs(); }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleNotifs = () => {
    if (!showNotifs) fetchNotifs();
    setShowNotifs(v => !v);
  };

  const markAllRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
    setUnread(0);
  };

  const handleNotifClick = (n) => {
    setReadIds(prev => new Set([...prev, n.id]));
    setUnread(prev => Math.max(0, prev - 1));
    setShowNotifs(false);
    if (n.link) navigate(n.link);
  };

  const effectiveUnread = Math.max(0, unread - readIds.size);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-title">{page.title}</div>
            <div className="topbar-subtitle">{page.sub}</div>
          </div>
          <div className="topbar-actions">
            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={panelRef}>
              <button
                className="icon-btn"
                title="Notifications"
                onClick={toggleNotifs}
                style={{ position: 'relative' }}
              >
                <Bell size={17} />
                {effectiveUnread > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: '#ef4444', color: 'white', borderRadius: '50%',
                    width: 16, height: 16, fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, border: '2px solid white'
                  }}>{effectiveUnread > 9 ? '9+' : effectiveUnread}</span>
                )}
              </button>

              {showNotifs && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                  width: 360, maxHeight: 480, overflowY: 'auto',
                  background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                  zIndex: 9999
                }}>
                  {/* Panel Header */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>Notifications</div>
                      {effectiveUnread > 0 && <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>{effectiveUnread} unread</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {effectiveUnread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>}
                      <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                    </div>
                  </div>

                  {/* Notification List */}
                  {notifLoading ? (
                    <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      <Bell size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                      <div style={{ fontWeight: 600 }}>All caught up!</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>No notifications right now.</div>
                    </div>
                  ) : (
                    notifications.map(n => {
                      const isRead = readIds.has(n.id);
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          style={{
                            padding: '14px 20px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
                            background: isRead ? 'white' : TYPE_BG[n.type] || '#f8fafc',
                            borderBottom: '1px solid #f8fafc', transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.97)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                        >
                          <div style={{ marginTop: 2 }}>{TYPE_ICON[n.type] || TYPE_ICON.info}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: isRead ? 500 : 700, fontSize: 13, color: '#0f172a', marginBottom: 2 }}>{n.title}</div>
                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{n.message}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{timeAgo(n.time)}</div>
                          </div>
                          {!isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginTop: 6, flexShrink: 0 }} />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
              <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 12, background: 'var(--primary)' }}>
                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{profile?.full_name || 'User'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Client</span>
              </div>
            </div>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>

        {/* Activation Overlay */}
        {profile?.is_active === false && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
            <div style={{ maxWidth: 450, background: 'white', padding: 40, borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>⏳</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 16 }}>Account Pending Activation</h2>
              <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>Your account is currently being reviewed by the HFA Administration. You will be notified once your account is activated.</p>
              <div style={{ padding: '12px 20px', background: '#fef3c7', color: '#92400e', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>Estimated review time: 24-48 hours</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
