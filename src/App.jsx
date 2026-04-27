import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ApplicationsPage from './pages/ApplicationsPage';
import CertificatesPage from './pages/CertificatesPage';
import ProductsPage from './pages/ProductsPage';
import ExportPage from './pages/ExportPage';
import MessagesPage from './pages/MessagesPage';
import SitesPage from './pages/SitesPage';
import ProfilePage from './pages/ProfilePage';
import ProposalsPage from './pages/ProposalsPage';
import InvoicesPage from './pages/InvoicesPage';
import ManageUsersPage from './pages/ManageUsersPage';
import TicketsPage from './pages/TicketsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: 10, fontFamily: 'Inter, sans-serif', fontSize: 13 } }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected client routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/new" element={<ApplicationsPage openNew />} />
            <Route path="/proposals" element={<ProposalsPage />} />
            <Route path="/proposals/new" element={<ProposalsPage openNew />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/new" element={<ProductsPage openNew />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/export/new" element={<ExportPage openNew />} />
            <Route path="/messages/inbox" element={<MessagesPage mode="inbox" />} />
            <Route path="/messages/outbox" element={<MessagesPage mode="outbox" />} />
            <Route path="/messages" element={<Navigate to="/messages/inbox" replace />} />
            <Route path="/manage-users" element={<ManageUsersPage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
