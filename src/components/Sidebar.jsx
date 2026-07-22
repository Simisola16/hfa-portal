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
  { icon: Users, label: "Manage Users", path: '/manage-users' },
  { icon: MapPin, label: 'Manage Sites', path: '/sites' },
  { icon: FileBarChart, label: 'Invoices', path: '/invoices' },
  { icon: FileCheck, label: 'Agreements', path: '/agreements' },
];

export default function Sidebar({ isOpen, onClose }) {
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
              return (
                <div key={item.label}>
                  {item.children ? (
                    <>
                      <button className="nav-item" onClick={() => toggle(item.label)}>
                        <Icon size={17} />
                        <span>{item.label}</span>
                        <span style={{ marginLeft: 'auto' }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="nav-sub">
                          {item.children.map(child => (
                            <NavLink
                              key={child.label}
                              to={child.path}
                              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                            >
                              <span style={{ width: 17 }} />
                              {child.label}
                            </NavLink>
                          ))}
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
