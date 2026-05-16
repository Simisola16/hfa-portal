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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const panelRef = useRef();

  const fetchNotifs = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data || []);
      setUnread(res.unreadCount || 0);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => { 
    fetchNotifs(); 
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    // Close sidebar on route change
    setSidebarOpen(false);
    return () => document.removeEventListener('mousedown', handler);
  }, [location.pathname]);

  const toggleNotifs = () => {
    if (!showNotifs) fetchNotifs();
    setShowNotifs(v => !v);
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.put(`/api/notifications/${n._id}/read`);
        setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, is_read: true } : item));
        setUnread(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
    setShowNotifs(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
              <div style={{ width: 24, height: 2, background: 'var(--primary)', position: 'relative' }}>
                <div style={{ width: 24, height: 2, background: 'var(--primary)', position: 'absolute', top: -6 }}></div>
                <div style={{ width: 24, height: 2, background: 'var(--primary)', position: 'absolute', top: 6 }}></div>
              </div>
            </button>
            <div>
              <div className="topbar-title">{page.title}</div>
              <div className="topbar-subtitle">{page.sub}</div>
            </div>
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
                {unread > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: '#ef4444', color: 'white', borderRadius: '50%',
                    width: 16, height: 16, fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, border: '2px solid white'
                  }}>{unread > 9 ? '9+' : unread}</span>
                )}
              </button>

              {showNotifs && (
                <div className="shadow-lg animate-in" style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                  width: 360, maxHeight: 480, overflowY: 'auto',
                  background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                  zIndex: 9999
                }}>
                  {/* Panel Header */}
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Notifications</div>
                      {unread > 0 && <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{unread} unread updates</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Mark all read</button>}
                      <button onClick={() => setShowNotifs(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}><X size={16} /></button>
                    </div>
                  </div>

                  {/* Notification List */}
                  {notifLoading && notifications.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ background: '#f8fafc', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Bell size={32} style={{ opacity: 0.3 }} />
                      </div>
                      <div style={{ fontWeight: 700, color: '#475569' }}>All caught up!</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>You have no new notifications.</div>
                    </div>
                  ) : (
                    notifications.map(n => {
                      const isRead = n.is_read;
                      return (
                        <div
                          key={n._id}
                          onClick={() => handleNotifClick(n)}
                          style={{
                            padding: '16px 24px', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start',
                            background: isRead ? 'white' : TYPE_BG[n.type] || '#f8fafc',
                            borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s'
                          }}
                          className="hover-notif"
                        >
                          <div style={{ marginTop: 2, background: isRead ? '#f1f5f9' : 'white', padding: 8, borderRadius: 10, display: 'flex' }}>
                            {TYPE_ICON[n.type] || TYPE_ICON.info}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: isRead ? 600 : 800, fontSize: 14, color: isRead ? '#475569' : '#0f172a', marginBottom: 2 }}>{n.title}</div>
                            <div style={{ fontSize: 13, color: isRead ? '#64748b' : '#334155', lineHeight: 1.5 }}>{n.message}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, fontWeight: 500 }}>{timeAgo(n.created_at)}</div>
                          </div>
                          {!isRead && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', marginTop: 6, flexShrink: 0, boxShadow: '0 0 0 4px #dcfce7' }} />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 16, borderLeft: '1px solid var(--border)' }}>
              <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: 13, background: 'var(--primary)', fontWeight: 700 }}>
                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{profile?.full_name || 'User'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Client Account</span>
              </div>
            </div>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>

        {/* Activation Overlay */}
        {profile?.is_active === false && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
            <div className="animate-in" style={{ maxWidth: 480, background: 'white', padding: 48, borderRadius: 32, boxShadow: '0 25px 60px rgba(0,0,0,0.12)', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 72, marginBottom: 24 }}>🛡️</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.5px' }}>Account Review in Progress</h2>
              <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>Your organization is currently being verified by the HFA Administration. You will receive a notification and an email once your portal access is granted.</p>
              <div style={{ padding: '16px 24px', background: '#fefce8', border: '1px solid #fef08a', color: '#854d0e', borderRadius: 16, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                <AlertCircle size={18} /> Typical review time: 24-48 business hours
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
