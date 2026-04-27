import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Award, Package, Ship,
  MessageSquare, Users, MapPin, FileBarChart, Bell,
  LogOut, ChevronDown, ChevronRight, FileCheck, ClipboardList,
  Settings, HelpCircle, RefreshCw, Menu, X
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  {
    icon: FileText, label: 'Applications', path: '/applications',
    children: [
      { label: 'Manage Application', path: '/applications' },
      { label: 'New Application', path: '/applications?type=new' },
      { label: 'Renewal Application', path: '/applications?type=renewal' },
      { label: 'Surveillance Application', path: '/applications?type=surveillance' },
      {
        label: 'In Progress', path: '/applications?status=in_progress',
        children: [
          { label: 'New In-Progress', path: '/applications?status=in_progress&type=new' },
          { label: 'Renewal In-Progress', path: '/applications?status=in_progress&type=renewal' },
          { label: 'Surveillance In-Progress', path: '/applications?status=in_progress&type=surveillance' },
        ]
      },
      { label: 'Rejected / On-Hold', path: '/applications?status=rejected' },
    ]
  },
  {
    icon: Package, label: 'Manage Product', path: '/products',
    children: [
      { label: 'Product List', path: '/products' },
      { label: 'Add Product', path: '/products/new' },
      { label: 'Add-On List', path: '/products/addons' },
    ]
  },
  {
    icon: Award, label: 'Certificate', path: '/certificates',
    children: [
      { label: 'Manage Certificate', path: '/certificates' },
      { label: 'Active Certificates', path: '/certificates?status=active' },
      { label: 'Expired Certificates', path: '/certificates?status=expired' },
    ]
  },
  {
    icon: Ship, label: 'Export', path: '/export',
    children: [
      { label: 'Manage Export Cert', path: '/export' },
      { label: 'Request Export Cert', path: '/export/new' },
      { label: 'In-Progress', path: '/export?status=in_progress' },
      { label: 'Export Drafts', path: '/export?status=draft' },
    ]
  },
  {
    icon: MessageSquare, label: 'Tickets', path: '/tickets',
    children: [
      { label: 'All Tickets', path: '/tickets' },
      { label: 'Add New Ticket', path: '/tickets/new' },
    ]
  },
  { icon: Users, label: 'Manage User\'s', path: '/manage-users' },
  { icon: MapPin, label: 'Manage Sites', path: '/sites' },
  { icon: FileText, label: 'Forms', path: '/forms' },
  { icon: FileBarChart, label: 'Invoices', path: '/invoices' },
];

export default function Sidebar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Mobile toggle */}
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} style={{
        display: 'none', position: 'fixed', top: 16, left: 16, zIndex: 200,
        background: 'var(--primary)', color: 'white', border: 'none',
        borderRadius: 8, padding: 8, cursor: 'pointer'
      }}>
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150
        }} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <img src="/hfa-logo.png" alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', background: 'white', borderRadius: 6, padding: 2 }} />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">HFA Portal</span>
            <span className="sidebar-logo-sub">Halal Food Authority</span>
          </div>
          <button onClick={() => setMobileOpen(false)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: '#86efac', cursor: 'pointer', display: 'none'
          }}><X size={18} /></button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
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
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                            onClick={() => setMobileOpen(false)}
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
                    onClick={() => setMobileOpen(false)}
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
            Profile & Settings
          </NavLink>
          <NavLink to="/help" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <HelpCircle size={17} />
            Help & Support
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
    </>
  );
}
