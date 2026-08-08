import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Award, Package, Ship,
  MessageSquare, Users, MapPin, FileBarChart, Bell,
  LogOut, ChevronDown, ChevronRight, FileCheck, ClipboardList,
  Settings, HelpCircle, RefreshCw, Menu, X, Ticket, Calendar
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  {
    icon: FileText, label: 'Applications', path: '/applications',
    children: [
      { label: 'All Applications', path: '/applications' },
      { label: 'New Application', path: '/applications/new' },
      { label: 'Renewal Application', path: '/applications?type=renewal' },
      { label: 'Surveillance Application', path: '/applications?type=surveillance' },
      { label: 'In Progress', path: '/applications?status=in_progress' },
      { label: 'Rejected / On-Hold', path: '/applications?status=rejected' },
    ]
  },
  {
    icon: Package, label: 'Manage Products', path: '/products',
    children: [
      { label: 'Product List', path: '/products' },
      { label: 'Add Product', path: '/products/new' },
      { label: 'Add-on Products Application', path: '/addon-applications/new' },
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

function isChildActive(childPath, location) {
  if (!childPath || !location) return false;
  const [childPathname, childSearch = ''] = childPath.split('?');
  
  if (childPathname !== location.pathname) return false;
  
  if (!childSearch) {
    // If child is the root of the section e.g. /applications, match if no specific type/status search param
    return !location.search || location.search === '';
  }
  
  const childParams = new URLSearchParams(childSearch);
  const currentParams = new URLSearchParams(location.search);
  
  for (const [key, val] of childParams.entries()) {
    if (currentParams.get(key) !== val) return false;
  }
  return true;
}

function isParentActive(item, location) {
  if (item.children) {
    return item.children.some(c => isChildActive(c.path, location));
  }
  return location.pathname === item.path;
}

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
  const location = useLocation();
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    navItems.forEach(item => {
      if (item.children && item.children.some(c => isChildActive(c.path, location))) {
        setExpanded(prev => ({ ...prev, [item.label]: true }));
      }
    });
  }, [location.pathname, location.search]);

  const toggle = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

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
        <div className="nav-section-label">Main Menu</div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isExpanded = expanded[item.label];
          const parentActive = isParentActive(item, location);
          const parentUnread = getUnreadNavCount(notifications, item.path, item.children);

          return (
            <div key={item.label} className="nav-group">
              {item.children ? (
                <>
                  <button
                    type="button"
                    className={`nav-item${parentActive && !isExpanded ? ' active' : ''}`}
                    onClick={() => toggle(item.label)}
                    style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
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
                    <span style={{
                      marginLeft: parentUnread > 0 && !isExpanded ? 0 : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                      <ChevronDown size={14} />
                    </span>
                  </button>
                  <div
                    className={`nav-sub ${isExpanded ? 'expanded' : 'collapsed'}`}
                    style={{
                      maxHeight: isExpanded ? `${item.children.length * 44 + 10}px` : '0px',
                      opacity: isExpanded ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, transform 0.2s ease',
                      transform: isExpanded ? 'translateY(0)' : 'translateY(-4px)'
                    }}
                  >
                    {item.children.map(child => {
                      const childActive = isChildActive(child.path, location);
                      const childUnread = getUnreadNavCount(notifications, child.path);
                      return (
                        <NavLink
                          key={child.label}
                          to={child.path}
                          className={`nav-item${childActive ? ' active' : ''}`}
                          style={{ transition: 'all 0.15s ease' }}
                        >
                          <span style={{ width: 14 }} />
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
