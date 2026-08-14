import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle, FileText } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getSocket } from '../lib/socket';
import ClientProposalModal from './ClientProposalModal';
import PaymentModal from './PaymentModal';
import ClientAuditModal from './ClientAuditModal';
import ClientAgreementModal from './ClientAgreementModal';
import NotificationCenter from './NotificationCenter';

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
  const [quickModal, setQuickModal] = useState(null); // { type: 'proposal'|'payment'|'audit'|'agreement', appId }
  const panelRef = useRef();

  const [checkingSite, setCheckingSite] = useState(true);
  const [hasSite, setHasSite] = useState(true);

  useEffect(() => {
    if (profile && profile.role === 'client') {
      api.get('/api/sites')
        .then(res => {
          const sites = res.data || [];
          setHasSite(sites.length > 0);
        })
        .catch(() => {})
        .finally(() => setCheckingSite(false));
    } else {
      setCheckingSite(false);
    }
  }, [profile]);

  const isInactiveBlocked = profile?.is_active === false && !['/dashboard', '/sites', '/products', '/profile', '/add-site'].includes(location.pathname);

  useEffect(() => {
    if (isInactiveBlocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isInactiveBlocked]);

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

    const titleLower = (notif.title || '').toLowerCase();
    const messageLower = (notif.message || '').toLowerCase();
    let modalType = null;
    if (titleLower.includes('proposal') || messageLower.includes('proposal')) modalType = 'proposal';
    else if (titleLower.includes('invoice') || messageLower.includes('invoice') || titleLower.includes('payment') || messageLower.includes('payment')) modalType = 'payment';
    else if (titleLower.includes('non-conformity') || titleLower.includes('nc ') || titleLower.endsWith('nc') || messageLower.includes('non-conformity') || messageLower.includes('nc ')) modalType = 'nc';
    else if (titleLower.includes('audit') || titleLower.includes('date') || messageLower.includes('audit') || messageLower.includes('date')) modalType = 'audit';
    else if (titleLower.includes('agreement') || messageLower.includes('agreement')) modalType = 'agreement';

    const extractAppId = (notifObj) => {
      if (!notifObj) return null;
      const raw = notifObj.application_id || notifObj.appId || notifObj.app_id || 
                  notifObj.data?.application_id || notifObj.data?.app_id || notifObj.data?.appId ||
                  notifObj.audit_id || notifObj.invoice_id || notifObj.agreement_id || notifObj.proposal_id;
      if (raw) {
        if (typeof raw === 'string') return raw;
        if (typeof raw === 'object') return String(raw._id || raw.id || '');
      }
      const link = notifObj.link || '';
      const m1 = link.match(/\/applications\/([a-fA-F0-9]{24})/);
      if (m1) return m1[1];
      const m2 = link.match(/appId=([a-fA-F0-9]{24})/);
      if (m2) return m2[1];
      const match = link.match(/([a-fA-F0-9]{24})/) || (notifObj.message || '').match(/([a-fA-F0-9]{24})/);
      if (match) return match[1];
      return null;
    };
    const targetAppId = extractAppId(notif);

    toast.custom((t) => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '14px 18px',
          background: bgMap[notif.type] || 'white',
          border: `1.5px solid ${borderMap[notif.type] || '#e2e8f0'}`,
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          width: '100%',
          animation: t.visible ? 'slideIn 0.3s ease' : 'fadeOut 0.3s ease',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            {iconMap[notif.type] || iconMap.info}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{notif.title}</div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>{notif.message}</div>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>

        {(modalType || notif.link) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, gap: 4 }}
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
                if (modalType && targetAppId) {
                  setQuickModal({ type: modalType, appId: targetAppId });
                } else if (notif.link) {
                  navigate(notif.link);
                } else if (modalType) {
                  setQuickModal({ type: modalType, appId: null });
                }
              }}
            >
              {modalType ? 'View & Respond' : 'View Details'}
            </button>
          </div>
        )}
      </div>
    ), { id: notif._id || notif.id, duration: 60000 });
  };

  const fetchNotifs = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/api/notifications');
      const list = Array.isArray(res) ? res : (res.data || []);
      const count = typeof res.unreadCount === 'number' ? res.unreadCount : list.filter(n => !n.is_read).length;
      setNotifications(list);
      setUnread(count);
    } catch {
      setNotifications([]);
      setUnread(0);
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

  // Auto-clear unread notifications matching the active route
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    const currentPathname = location.pathname;
    const currentSearch = location.search;

    const matchingUnread = notifications.filter(n => {
      if (n.is_read || !n.link) return false;
      const [linkPath, linkSearch = ''] = n.link.split('?');
      if (linkPath !== currentPathname) return false;
      if (linkSearch) {
        return currentSearch.includes(linkSearch);
      }
      return true;
    });

    if (matchingUnread.length > 0) {
      matchingUnread.forEach(n => {
        api.put(`/api/notifications/${n._id}/read`).catch(() => {});
      });
      setNotifications(prev => prev.map(n =>
        matchingUnread.some(m => m._id === n._id) ? { ...n, is_read: true } : n
      ));
      setUnread(prev => Math.max(0, prev - matchingUnread.length));
    }
  }, [location.pathname, location.search]);

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
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} notifications={notifications} />
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

            <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              {/* Notification Bell with animated pulse & popup */}
              <div ref={panelRef} style={{ position: 'relative' }}>
                <button
                  className={`btn btn-ghost btn-sm ${animateBell ? 'bell-pulse' : ''}`}
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

                <NotificationCenter
                  isOpen={showNotifs}
                  onClose={() => setShowNotifs(false)}
                  notifications={notifications}
                  unreadCount={unread}
                  loading={notifLoading}
                  onRefresh={fetchNotifs}
                  onOpenActionModal={(type, appId) => setQuickModal({ type, appId })}
                />
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

          {/* Activation Overlay - Fixed & Non-Scrollable */}
          {isInactiveBlocked && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(10px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '24px',
                overflow: 'hidden',
                userSelect: 'none'
              }}
            >
              <div
                className="animate-in"
                style={{
                  maxWidth: 480,
                  width: '100%',
                  background: '#ffffff',
                  padding: '38px 32px 32px',
                  borderRadius: 24,
                  boxShadow: '0 30px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 20,
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    color: '#2563eb',
                    fontSize: 32
                  }}
                >
                  🛡️
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 12, letterSpacing: '-0.02em' }}>
                  Account Review in Progress
                </h2>
                <p style={{ color: '#475569', fontSize: 14.5, lineHeight: 1.6, marginBottom: 20 }}>
                  Your organization is currently being verified by the HFA Administration. You will receive a notification and an email once your portal access is granted.
                </p>
                <div
                  style={{
                    padding: '12px 18px',
                    background: '#fefce8',
                    border: '1px solid #fef08a',
                    color: '#854d0e',
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    justifyContent: 'center',
                    marginBottom: 24
                  }}
                >
                  <AlertCircle size={17} style={{ flexShrink: 0 }} /> Typical review time: 24-48 business hours
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate('/dashboard')}
                    style={{ fontSize: 13.5, fontWeight: 700, padding: '10px 20px', borderRadius: 10 }}
                  >
                    Return to Dashboard
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/sites')}
                    style={{ fontSize: 13.5, fontWeight: 700, padding: '10px 20px', borderRadius: 10, background: '#1B7A7A', borderColor: '#1B7A7A' }}
                  >
                    Manage Sites
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shared Quick Action Modals */}
      {quickModal?.type === 'proposal' && (
        <ClientProposalModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          onSuccess={() => fetchNotifs()}
        />
      )}

      {quickModal?.type === 'payment' && (
        <PaymentModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          onSuccess={() => fetchNotifs()}
        />
      )}

      {(quickModal?.type === 'audit' || quickModal?.type === 'nc') && (
        <ClientAuditModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          mode={quickModal.type === 'nc' ? 'nc_upload' : 'select_dates'}
          onSuccess={() => fetchNotifs()}
        />
      )}

      {quickModal?.type === 'agreement' && (
        <ClientAgreementModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          onSuccess={() => fetchNotifs()}
        />
      )}
    </div>
  );
}
