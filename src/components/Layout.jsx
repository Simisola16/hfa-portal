import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle, FileText } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getSocket } from '../lib/socket';

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
  const { profile, endImpersonation } = useAuth();
  const page = pageTitles[location.pathname] || { title: 'HFA Portal', sub: 'Halal Food Authority UK' };

  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const panelRef = useRef();

  const [checkingSite, setCheckingSite] = useState(true);
  const [hasSite, setHasSite] = useState(false);

  useEffect(() => {
    if (profile && profile.role === 'client') {
      api.get('/api/sites')
        .then(res => {
          const sites = res.data || [];
          const userHasSite = sites.length > 0;
          setHasSite(userHasSite);
          
          if (!userHasSite && location.pathname !== '/add-site') {
            navigate('/add-site', { replace: true });
          } else if (userHasSite && location.pathname === '/add-site') {
            navigate('/dashboard', { replace: true });
          }
        })
        .catch(() => {})
        .finally(() => setCheckingSite(false));
    } else {
      setCheckingSite(false);
    }
  }, [profile, location.pathname, navigate]);

  const [animateBell, setAnimateBell] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);

  const showToast = (notif) => {
    const iconMap = {
      success: <CheckCircle size={18} style={{ color: '#16a34a' }} />,
      warning: <AlertTriangle size={18} style={{ color: '#d97706' }} />,
      error: <AlertCircle size={18} style={{ color: '#ef4444' }} />,
      info: <Info size={18} style={{ color: '#3b82f6' }} />
    };

    const bgMap = {
      success: '#f0fdf4',
      warning: '#fffbeb',
      error: '#fef2f2',
      info: '#eff6ff'
    };

    const borderMap = {
      success: '#bbf7d0',
      warning: '#fef3c7',
      error: '#fecaca',
      info: '#bfdbfe'
    };

    toast.custom((t) => (
      <div
        onClick={() => {
          toast.dismiss(t.id);
          if (notif.link) navigate(notif.link);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          background: bgMap[notif.type] || 'white',
          border: `1.5px solid ${borderMap[notif.type] || '#e2e8f0'}`,
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          maxWidth: '380px',
          width: '100%',
          animation: t.visible ? 'slideIn 0.3s ease' : 'fadeOut 0.3s ease',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <div style={{ flexShrink: 0 }}>
          {iconMap[notif.type] || iconMap.info}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{notif.title}</div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>{notif.message}</div>
        </div>
      </div>
    ), { id: notif._id || notif.id, duration: 60000 });
  };

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

  // Socket connection and listener
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectError = () => setSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    // Sync initial state
    setSocketConnected(socket.connected);

    const handleNotification = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnread(prev => prev + 1);

      // Trigger bell pulse animation
      setAnimateBell(true);
      setTimeout(() => setAnimateBell(false), 1000);

      // Show toast
      showToast(notif);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('notification', handleNotification);
    };
  }, [profile]);

  // Initial load + Fallback Polling (only if socket is disconnected)
  useEffect(() => {
    fetchNotifs();
    
    if (socketConnected) return;

    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, [socketConnected]);

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

  if (checkingSite) {
    return (
      <div className="loading-overlay" style={{ height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {profile?.is_impersonation && (
        <div style={{
          background: 'linear-gradient(90deg, #d97706, #b45309)',
          color: 'white',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          fontWeight: 700,
          zIndex: 99999,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} />
            <span>You are viewing this account as <strong>{profile.admin_name || 'Admin'}</strong> (Admin mode)</span>
          </div>
          <button
            onClick={endImpersonation}
            style={{
              background: 'white',
              color: '#b45309',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#fef3c7'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'white'; }}
          >
            End Impersonation
          </button>
        </div>
      )}
      <div className="app-layout" style={{ flex: 1 }}>
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
            {!socketConnected && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#fffbeb',
                border: '1px solid #fef08a',
                color: '#854d0e',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif'
              }}>
                <span className="spinner" style={{ width: 10, height: 10, borderTopColor: '#854d0e', display: 'inline-block' }} />
                <span>Reconnecting...</span>
              </div>
            )}
            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={panelRef}>
              <button
                className={`icon-btn ${animateBell ? 'bell-pulse' : ''}`}
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
        {profile?.is_active === false && !['/dashboard', '/sites', '/products', '/profile', '/add-site'].includes(location.pathname) && (
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
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes bellPulse {
            0% { transform: scale(1); }
            15% { transform: scale(1.3) rotate(10deg); }
            30% { transform: scale(1.3) rotate(-10deg); }
            45% { transform: scale(1.3) rotate(10deg); }
            60% { transform: scale(1.3) rotate(-10deg); }
            75% { transform: scale(1.1) rotate(5deg); }
            90% { transform: scale(1.1) rotate(-5deg); }
            100% { transform: scale(1) rotate(0); }
          }
          .bell-pulse {
            animation: bellPulse 0.8s ease-in-out;
          }
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `}} />
      </div>
    </div>
  </div>
  );
}
