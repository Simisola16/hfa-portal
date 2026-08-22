import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Award, Package, Ship,
  MessageSquare, Users, MapPin, FileBarChart, Bell,
  LogOut, ChevronDown, ChevronRight, FileCheck, ClipboardList,
  Settings, HelpCircle, RefreshCw, Menu, X, Ticket, Calendar
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    key: 'main',
    label: 'Main Menu',
    items: [
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
        icon: Ticket, label: 'Tickets', path: '/tickets',
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
      { icon: Users, label: 'Manage Users', path: '/manage-users' },
      { icon: MapPin, label: 'Manage Sites', path: '/sites' },
      { icon: FileBarChart, label: 'Invoices', path: '/invoices' },
      { icon: FileCheck, label: 'Agreements', path: '/agreements' },
    ]
  },
  {
    key: 'account',
    label: 'Account',
    items: [
      { icon: Settings, label: 'Profile & Settings', path: '/profile' }
    ]
  }
];

function isChildActive(childPath, location) {
  if (!childPath || !location) return false;
  const [childPathname, childSearch = ''] = childPath.split('?');
  
  if (childPathname !== location.pathname) return false;
  
  if (!childSearch) {
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

function matchSinglePath(link, targetPath, isChild = false) {
  if (!link || !targetPath) return false;
  const [linkPath, linkSearch = ''] = link.split('?');
  const [targetPathname, targetSearch = ''] = targetPath.split('?');

  if (linkPath !== targetPathname) return false;

  if (targetSearch) {
    if (!linkSearch) return false;
    const targetParams = new URLSearchParams(targetSearch);
    const linkParams = new URLSearchParams(linkSearch);
    for (const [key, val] of targetParams.entries()) {
      if (linkParams.get(key) !== val) return false;
    }
    return true;
  }

  if (isChild) {
    return !linkSearch;
  }

  return true;
}

function getUnreadNavCount(notifications, pathStr, children = [], isChild = false) {
  if (!notifications || notifications.length === 0) return 0;
  const unreadList = notifications.filter(n => !n.is_read && n.link);
  if (unreadList.length === 0) return 0;

  let count = 0;
  unreadList.forEach(n => {
    let matched = false;
    if (pathStr && matchSinglePath(n.link, pathStr, isChild)) {
      matched = true;
    }
    if (!matched && !isChild && children && children.length > 0) {
      if (children.some(c => matchSinglePath(n.link, c.path, true))) {
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
    NAV_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (item.children && item.children.some(c => isChildActive(c.path, location))) {
          setExpanded(prev => ({ ...prev, [item.label]: true }));
        }
      });
    });
  }, [location.pathname, location.search]);

  const toggle = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo Header */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <img src="/hfa-logo.png" alt="HFA Logo" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">HFA Portal</span>
          <span className="sidebar-logo-sub">Halal Food Authority</span>
        </div>
        {isOpen && (
          <button
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              marginLeft: 'auto',
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.key} className="nav-section">
            {sIdx > 0 && <div className="nav-section-divider" />}
            <div className="nav-section-label">{section.label}</div>

            {section.items.map(item => {
              const Icon = item.icon;
              const isExpanded = expanded[item.label];
              const parentActive = isParentActive(item, location);
              const parentUnread = getUnreadNavCount(notifications, item.path, item.children, false);

              if (item.children) {
                return (
                  <div key={item.label} className="nav-group">
                    <button
                      type="button"
                      className={`nav-item${parentActive && !isExpanded ? ' active' : ''}`}
                      onClick={() => toggle(item.label)}
                    >
                      <Icon size={17} className="nav-item-icon" />
                      <span>{item.label}</span>
                      {parentUnread > 0 && !isExpanded && (
                        <span className="nav-attention-badge">
                          {parentUnread > 9 ? '9+' : parentUnread}
                        </span>
                      )}
                      <span
                        className="nav-chevron"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        <ChevronDown size={14} />
                      </span>
                    </button>

                    <div
                      className={`nav-sub ${isExpanded ? 'expanded' : 'collapsed'}`}
                      style={{
                        maxHeight: isExpanded ? `${item.children.length * 40 + 10}px` : '0px',
                        opacity: isExpanded ? 1 : 0,
                      }}
                    >
                      {item.children.map(child => {
                        const childActive = isChildActive(child.path, location);
                        const childUnread = getUnreadNavCount(notifications, child.path, [], true);
                        return (
                          <NavLink
                            key={child.label}
                            to={child.path}
                            className={`nav-sub-item${childActive ? ' active' : ''}`}
                          >
                            <span>{child.label}</span>
                            {childUnread > 0 && (
                              <span className="nav-attention-badge">
                                {childUnread > 9 ? '9+' : childUnread}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <Icon size={17} className="nav-item-icon" />
                  <span>{item.label}</span>
                  {parentUnread > 0 && (
                    <span className="nav-attention-badge">
                      {parentUnread > 9 ? '9+' : parentUnread}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{profile?.full_name || 'User'}</div>
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
