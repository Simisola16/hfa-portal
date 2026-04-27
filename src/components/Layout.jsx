import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, Search } from 'lucide-react';

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

export default function Layout() {
  const location = useLocation();
  const { profile } = useAuth();
  const page = pageTitles[location.pathname] || { title: 'HFA Portal', sub: 'Halal Food Authority UK' };

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
            <button className="icon-btn" title="Notifications">
              <Bell size={17} />
              <span className="notification-dot" />
            </button>
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
        <main className="page-content">
          <Outlet />
        </main>

        {/* Activation Overlay */}
        {profile?.is_active === false && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: 40
          }}>
            <div style={{ maxWidth: 450, background: 'white', padding: 40, borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>⏳</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 16 }}>Account Pending Activation</h2>
              <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>
                Your account is currently being reviewed by the HFA Administration. 
                You will be notified once your account is activated, after which you can begin your certification process.
              </p>
              <div style={{ padding: '12px 20px', background: '#fef3c7', color: '#92400e', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                Estimated review time: 24-48 hours
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
