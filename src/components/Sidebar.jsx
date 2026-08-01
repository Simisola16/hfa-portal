import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Award, Package, Ship,
  MessageSquare, Users, MapPin, FileBarChart, Bell,
  LogOut, ChevronDown, ChevronRight, FileCheck, ClipboardList,
  Settings, HelpCircle, RefreshCw, Menu, X, Ticket
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  {
    icon: FileText, label: 'Applications', path: '/applications',
    children: [
      { label: 'All Applications', path: '/applications' },
      { label: 'Create Application', path: '/applications/new' },
      { label: 'Renewal Application', path: '/applications?type=renewal' },
      { label: 'Surveillance Application', path: '/applications?type=surveillance' },
      { label: 'In Progress', path: '/applications?status=audit_scheduled' },
      { label: 'Rejected / On-Hold', path: '/applications?status=rejected' },
    ]
  },
  {
    icon: Package, label: 'Manage Products', path: '/products',
    children: [
      { label: 'Product List', path: '/products' },
      { label: 'Add Product', path: '/products/new' },
    ]
  },
  {
    icon: Award, label: 'Certificates', path: '/certificates',
    children: [
      { label: 'All Certificates', path: '/certificates' },
      { label: 'Active Certificates', path: '/certificates?status=active' },
      { label: 'Expired Certificates', path: '/certificates?status=expired' },
    ]
  },
  {
    icon: Ship, label: 'Export', path: '/export',
    children: [
      { label: 'Manage Export Cert', path: '/export' },
      { label: 'Request Export Cert', path: '/export/new' },
    ]
  },
  {
    icon: MessageSquare, label: 'Tickets', path: '/tickets',
    children: [
      { label: 'All Tickets', path: '/tickets' },
      { label: 'New Ticket', path: '/tickets' },
    ]
  },
  {
    icon: MessageSquare, label: 'Messages', path: '/messages',
    children: [
      { label: 'Inbox', path: '/messages/inbox' },
      { label: 'Outbox', path: '/messages/outbox' },
    ]
  },
  { icon: FileText, label: 'Proposals', path: '/proposals' },
  { icon: Calendar, label: 'Audits', path: '/audits' },
  { icon: Users, label: "Manage Users", path: '/manage-users' },
  { icon: MapPin, label: 'Manage Sites', path: '/sites' },
  { icon: FileBarChart, label: 'Invoices', path: '/invoices' },
  { icon: FileCheck, label: 'Agreements', path: '/agreements' },
];

function getUnreadNavCount(notifications, pathStr, children = []) {
  if (!notifications || notifications.length === 0) return 0;
  const unreadList = notifications.filter(n => !n.is_read && n.link);
  if (unreadList.length === 0) return 0;

  const matchSinglePath = (link, targetPath) => {
    if (!link || !targetPath) return false;
    const linkPath = link.split('?')[0].split('#')[0];
    const targetPathname = targetPath.split('?')[0].split('#')[0];
    return linkPath === targetPathname;
  };

  let count = 0;
  unreadList.forEach(n => {
    let matched = false;
    if (pathStr && matchSinglePath(n.link, pathStr)) {
      matched = true;
    }
    if (!matched && children && children.length > 0) {
      if (children.some(c => matchSinglePath(n.link, c.path))) {
        matched = true;
      }
    }
    if (matched) count++;
  });

  return count;
}

export default function Sidebar({ isOpen, onClose, notifications = [] }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  const toggle = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const location = useLocation();
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/hfa-logo.png" alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', background: 'white', borderRadius: 6, padding: 2 }} />
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">HFA Portal</span>
          <span className="sidebar-logo-sub">Halal Food Authority</span>
        </div>
        {isOpen && (
          <button className="sidebar-close" onClick={onClose} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: '#86efac', cursor: 'pointer'
          }}><X size={18} /></button>
        )}
      </div>


      {/* Nav */}
      <nav className="sidebar-nav">
        {location.pathname !== '/add-site' ? (
          <>
            <div className="nav-section-label">Main Menu</div>
            {navItems.map(item => {
              const Icon = item.icon;
              const isExpanded = expanded[item.label];
              const parentUnread = getUnreadNavCount(notifications, item.path, item.children);

              return (
                <div key={item.label}>
                  {item.children ? (
                    <>
                      <button className="nav-item" onClick={() => toggle(item.label)}>
                        <Icon size={17} />
                        <span>{item.label}</span>
                        {parentUnread > 0 && !isExpanded && (
                          <span
                            className="nav-attention-badge"
                            style={{
                              marginLeft: 'auto',
                              marginRight: 6,
                              background: '#2563eb',
                              color: '#ffffff',
                              fontSize: 10,
                              fontWeight: 500,
                              minWidth: 18,
                              height: 18,
                              borderRadius: 9,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 5px',
                              boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)',
                              animation: 'navBadgePulse 2s ease-in-out infinite',
                              fontFamily: "'Inter', sans-serif"
                            }}
                          >
                            {parentUnread > 9 ? '9+' : parentUnread}
                          </span>
                        )}
                        <span style={{ marginLeft: parentUnread > 0 && !isExpanded ? 0 : 'auto' }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="nav-sub">
                          {item.children.map(child => {
                            const childUnread = getUnreadNavCount(notifications, child.path);
                            return (
                              <NavLink
                                key={child.label}
                                to={child.path}
                                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                              >
                                <span style={{ width: 17 }} />
                                {child.label}
                                {childUnread > 0 && (
                                  <span
                                    className="nav-attention-badge"
                                    style={{
                                      marginLeft: 'auto',
                                      background: '#2563eb',
                                      color: '#ffffff',
                                      fontSize: 10,
                                      fontWeight: 500,
                                      minWidth: 18,
                                      height: 18,
                                      borderRadius: 9,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '0 5px',
                                      boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)',
                                      animation: 'navBadgePulse 2s ease-in-out infinite',
                                      fontFamily: "'Inter', sans-serif"
                                    }}
                                  >
                                    {childUnread > 9 ? '9+' : childUnread}
                                  </span>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                      <Icon size={17} />
                      {item.label}
                      {parentUnread > 0 && (
                        <span
                          className="nav-attention-badge"
                          style={{
                            marginLeft: 'auto',
                            background: '#2563eb',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 500,
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 5px',
                            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)',
                            animation: 'navBadgePulse 2s ease-in-out infinite',
                            fontFamily: "'Inter', sans-serif"
                          }}
                        >
                          {parentUnread > 9 ? '9+' : parentUnread}
                        </span>
                      )}
                    </NavLink>
                  )}
                </div>
              );
            })}

            <div className="nav-section-label" style={{ marginTop: 12 }}>Account</div>
            <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Settings size={17} />
              Profile &amp; Settings
            </NavLink>
          </>
        ) : (
          <div style={{ padding: '24px 16px', color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
            Please register your business site to enable portal features.
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name truncate">{profile?.full_name || 'User'}</div>
            <div className="sidebar-user-role">{profile?.company_name || 'Client'}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
