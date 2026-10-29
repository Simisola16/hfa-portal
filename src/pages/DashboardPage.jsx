import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { 
  FileText, Award, Package, Ship, Clock, CheckCircle, AlertCircle, Plus, 
  RefreshCw, Download, X, MapPin, RotateCcw, ChevronRight, CreditCard, 
  FileSignature, Calendar, MessageSquare, AlertTriangle, ArrowRight, 
  CheckCircle2, ChevronDown, ChevronUp, BellRing, Sparkles, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentModal from '../components/PaymentModal';
import { getCertificateDownloadUrl } from '../lib/pdfUtils';
import FirstSiteCreatedModal from '../components/FirstSiteCreatedModal';
import NewUserSitePromptModal from '../components/NewUserSitePromptModal';

import { STATUS_LABELS, STATUS_ORDER, STATUS_BADGE as BASE_STATUS_BADGE, getEffectiveApplicationStatus } from '../lib/applicationStatuses';

const STATUS_BADGE = {
  ...BASE_STATUS_BADGE,
  submitted: 'badge-blue',
  under_review: 'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red',
  on_hold: 'badge-orange',
  audit_scheduled: 'badge-purple',
  audit_completed: 'badge-green',
  certificate_issued: 'badge-green',
  logsheet_created: 'badge-yellow',
};

const OFFICIAL_FORMS = [
  { name: 'No Pork Policy Declaration', type: 'PDF', size: '1.2 MB' },
  { name: 'Audit Preparation Questionnaire', type: 'DOCX', size: '850 KB' },
  { name: 'Halal Assurance System Manual Template', type: 'PDF', size: '2.4 MB' },
  { name: 'Product Ingredients List Format', type: 'XLSX', size: '420 KB' },
  { name: 'Raw Material Approval Form', type: 'PDF', size: '1.1 MB' },
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ applications: [], certificates: [], products: [], messages_count: 0, sites: [] });
  const [invoices, setInvoices] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [audits, setAudits] = useState([]);
  const [initialProducts, setInitialProducts] = useState([]);
  const [addOnApps, setAddOnApps] = useState([]);
  const [extensionApps, setExtensionApps] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [actionFilterTab, setActionFilterTab] = useState('all');
  const [actionTimelineFilter, setActionTimelineFilter] = useState('all');
  const [actionSearchQuery, setActionSearchQuery] = useState('');
  const [actionItemsCollapsed, setActionItemsCollapsed] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForms, setShowForms] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showFirstSiteModal, setShowFirstSiteModal] = useState(false);
  const [certFilterTab, setCertFilterTab] = useState('all');

  const fetchDashboardData = () => {
    Promise.all([
      api.get('/api/applications').catch(() => ({ data: [] })),
      api.get('/api/certificates').catch(() => ({ data: [] })),
      api.get('/api/products').catch(() => ({ data: [] })),
      api.get('/api/messages/unread-count').catch(() => ({ count: 0 })),
      api.get('/api/sites').catch(() => ({ data: [] })),
      api.get('/api/invoices').catch(() => ({ data: [] })),
      api.get('/api/agreements').catch(() => ({ data: [] })),
      api.get('/api/proposals').catch(() => ({ data: [] })),
      api.get('/api/audits').catch(() => ({ data: [] })),
      api.get('/api/initial-products').catch(() => ({ data: [] })),
      api.get('/api/add-on-applications').catch(() => ({ data: [] })),
      api.get('/api/extension-applications').catch(() => ({ data: [] })),
      api.get('/api/tickets').catch(() => ({ data: [] })),
    ]).then(([apps, certs, prods, msgs, sitesRes, invRes, agrRes, propRes, audRes, initProdRes, addOnRes, extRes, tktRes]) => {
      const userSites = Array.isArray(sitesRes) ? sitesRes : (Array.isArray(sitesRes?.data) ? sitesRes.data : []);
      const userApps = Array.isArray(apps) ? apps : (Array.isArray(apps?.data) ? apps.data : []);
      const userCerts = Array.isArray(certs) ? certs : (Array.isArray(certs?.data) ? certs.data : []);
      const userProducts = Array.isArray(prods) ? prods : (Array.isArray(prods?.data) ? prods.data : (Array.isArray(prods?.data?.data) ? prods.data.data : []));
      
      const invList = Array.isArray(invRes) ? invRes : (Array.isArray(invRes?.data) ? invRes.data : []);
      const agrList = Array.isArray(agrRes) ? agrRes : (Array.isArray(agrRes?.data) ? agrRes.data : []);
      const propList = Array.isArray(propRes) ? propRes : (Array.isArray(propRes?.data) ? propRes.data : []);
      const audList = Array.isArray(audRes) ? audRes : (Array.isArray(audRes?.data) ? audRes.data : []);
      const ipList = Array.isArray(initProdRes) ? initProdRes : (Array.isArray(initProdRes?.data) ? initProdRes.data : []);
      const aoList = Array.isArray(addOnRes) ? addOnRes : (Array.isArray(addOnRes?.data) ? addOnRes.data : []);
      const extList = Array.isArray(extRes) ? extRes : (Array.isArray(extRes?.data) ? extRes.data : []);
      const tktList = Array.isArray(tktRes) ? tktRes : (Array.isArray(tktRes?.data) ? tktRes.data : []);

      setData({
        applications: userApps,
        certificates: userCerts,
        products: userProducts,
        messages_count: msgs?.count || 0,
        sites: userSites,
      });
      setInvoices(invList);
      setAgreements(agrList);
      setProposals(propList);
      setAudits(audList);
      setInitialProducts(ipList);
      setAddOnApps(aoList);
      setExtensionApps(extList);
      setTickets(tktList);

      const isDismissed = sessionStorage.getItem('dismissed_site_prompt') === 'true';
      if (userSites.length === 0 && !isDismissed) {
        setShowSiteModal(true);
      } else if (searchParams.get('first_site') === 'true' || (userSites.length > 0 && userApps.length === 0 && !sessionStorage.getItem('dismissed_first_app_prompt'))) {
        setShowFirstSiteModal(true);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [searchParams]);

  const handleDismissSiteModal = () => {
    sessionStorage.setItem('dismissed_site_prompt', 'true');
    setShowSiteModal(false);
  };

  const handleDismissFirstSiteModal = () => {
    sessionStorage.setItem('dismissed_first_app_prompt', 'true');
    setShowFirstSiteModal(false);
  };

  const now = new Date();

  // Helper: check if a certificate has an active renewal application in progress
  const getOngoingRenewalApp = (cert) => {
    if (!cert) return null;
    const certId = String(cert._id || cert.id || '');

    // 1. If backend attached ongoing renewal information
    if (cert.has_ongoing_renewal) {
      const matched = (data.applications || []).find(a => 
        String(a._id || a.id || '') === String(cert.ongoing_renewal_id || '') ||
        (a.application_type === 'renewal' && String(a.renewed_certificate_id?._id || a.renewed_certificate_id || '') === certId)
      );
      if (matched) return matched;
      return {
        _id: cert.ongoing_renewal_id,
        id: cert.ongoing_renewal_id,
        application_number: cert.ongoing_renewal_number,
        status: cert.ongoing_renewal_status || 'in_progress'
      };
    }

    // 2. Cross-reference in data.applications
    const activeRenewal = (data.applications || []).find(app => {
      const isNotFinished = !['rejected', 'certificate_issued'].includes(app.status?.toLowerCase());
      const isRenewal = app.application_type === 'renewal';
      if (!isNotFinished || !isRenewal) return false;

      const refCertId = String(app.renewed_certificate_id?._id || app.renewed_certificate_id || '');
      if (refCertId && refCertId === certId) return true;

      const appSiteId = String(app.site_id?._id || app.site_id || '');
      const certSiteId = String(cert.site_id?._id || cert.site_id || '');
      if (appSiteId && certSiteId && appSiteId === certSiteId) return true;

      return false;
    });

    return activeRenewal || null;
  };

  // Map each site to its latest certificate ID so only the latest certificate shows the Renew button or counts as active
  const latestCertIdBySite = useMemo(() => {
    const siteMap = new Map();
    (data.certificates || []).forEach(cert => {
      const siteKey = (
        (cert.site_id?._id ? String(cert.site_id._id) : (cert.site_id ? String(cert.site_id) : '')) ||
        (cert.site_name || cert.site_id?.name || cert.site_id?.est_name || cert.application_id?.site_name || cert.establishment_name || '')
          .trim().toLowerCase()
      );

      const currentExpiry = new Date(cert.expiry_date || cert.issue_date || cert.createdAt || 0).getTime();

      if (!siteKey) {
        siteMap.set(`cert_${cert._id || cert.id}`, { id: String(cert._id || cert.id), time: currentExpiry });
        return;
      }

      const existing = siteMap.get(siteKey);
      if (!existing || currentExpiry > existing.time) {
        siteMap.set(siteKey, { id: String(cert._id || cert.id), time: currentExpiry });
      }
    });

    const latestIdSet = new Set();
    siteMap.forEach(val => {
      if (val?.id) latestIdSet.add(val.id);
    });
    return latestIdSet;
  }, [data.certificates]);

  // Helper: check if a certificate has already been renewed, superseded, or has a renewal in-progress
  const isCertRenewed = (cert) => {
    if (!cert) return false;
    const cStatus = (cert.status || '').toLowerCase().trim();
    if (['superseded', 'outdated', 'renewed'].includes(cStatus)) return true;
    if (cert.is_renewed) return true;
    if (cert.has_ongoing_renewal) return true;
    if (getOngoingRenewalApp(cert)) return true;

    // If there is a newer certificate for this site, this certificate is superseded
    const certId = String(cert._id || cert.id || '');
    if (certId && latestCertIdBySite.size > 0 && !latestCertIdBySite.has(certId)) {
      return true;
    }

    return false;
  };

  // Active certificates (status active & not in past & not superseded/renewed)
  const activeCertList = data.certificates.filter(c => {
    const isPast = c.expiry_date && new Date(c.expiry_date) < now;
    return c.status === 'active' && !isPast && !isCertRenewed(c);
  });

  // Expiring soon (within 90 days, not already renewed/superseded)
  const expiringSoonCertList = data.certificates.filter(c => {
    if (!c.expiry_date || isCertRenewed(c)) return false;
    const diff = new Date(c.expiry_date) - now;
    return diff > 0 && diff <= 90 * 24 * 60 * 60 * 1000 && c.status === 'active';
  });

  // Expired certificates that have NOT been renewed or superseded yet
  const expiredCertList = data.certificates.filter(c => {
    if (isCertRenewed(c)) return false;
    return c.status === 'expired' || (c.expiry_date && new Date(c.expiry_date) < now);
  });

  // Most urgent un-renewed certificate (expired first, then expiring soon)
  const urgentRenewalCert = expiredCertList[0] || expiringSoonCertList[0] || null;
  const daysToUrgent = urgentRenewalCert?.expiry_date ? Math.ceil((new Date(urgentRenewalCert.expiry_date) - now) / (1000 * 60 * 60 * 24)) : null;

  const recentApps = data.applications.slice(0, 5);
  const totalApps = data.applications.length;

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate) - now) / (1000 * 60 * 60 * 24));
  };

  // Filtered certificates for table
  const displayedCerts = data.certificates.filter(c => {
    const isRenewed = isCertRenewed(c);
    const isPast = c.status === 'expired' || (c.expiry_date && new Date(c.expiry_date) < now);
    const diff = c.expiry_date ? new Date(c.expiry_date) - now : null;
    const isExpiringSoon = diff !== null && diff > 0 && diff <= 90 * 24 * 60 * 60 * 1000;

    if (certFilterTab === 'active') return c.status === 'active' && !isPast && !isRenewed;
    if (certFilterTab === 'expiring') return isExpiringSoon && !isPast && !isRenewed;
    if (certFilterTab === 'expired') return isPast && !isRenewed;
    if (certFilterTab === 'renewed') return isRenewed;
    return !isRenewed || certFilterTab === 'all';
  });

  // ── Action Items Calculation (Interactive & Real-time) ─────────────────────
  const actionItems = useMemo(() => {
    const items = [];
    const currentTime = new Date();

    // 1. Unpaid Invoices
    (invoices || []).forEach(inv => {
      const isUnpaid = inv.status !== 'paid' && inv.status !== 'settled';
      if (isUnpaid) {
        if (inv.status === 'client_paid') {
          // Client has already uploaded receipt, pending HFA confirmation
          return;
        }
        const isOverdue = inv.due_date && new Date(inv.due_date) < currentTime;
        const amountNum = parseFloat(inv.amount) || 0;
        const amountFormatted = amountNum > 0
          ? `£${amountNum.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '';

        items.push({
          id: `inv_${inv._id || inv.id}`,
          category: 'payments',
          appType: 'finance',
          appTypeLabel: 'Invoice',
          appTypeBadgeBg: '#ecfdf5',
          appTypeBadgeColor: '#047857',
          appStatus: inv.is_final || inv.invoice_type === 'final' ? 'final_invoice_sent' : 'invoice_sent',
          appStatusLabel: STATUS_LABELS[inv.is_final || inv.invoice_type === 'final' ? 'final_invoice_sent' : 'invoice_sent'] || 'Initial Invoice Received',
          timelineStage: inv.is_final || inv.invoice_type === 'final' ? 'Final Certification Invoice' : 'Initial Invoice Received',
          urgency: isOverdue ? 'urgent' : 'action_needed',
          urgencyLabel: isOverdue ? 'Overdue Payment' : 'Payment Due',
          urgencyColor: isOverdue ? '#dc2626' : '#d97706',
          badgeBg: isOverdue ? '#fee2e2' : '#fef3c7',
          icon: <CreditCard size={18} />,
          title: `Invoice #${inv.invoice_number || 'INV'} ${amountFormatted ? `• ${amountFormatted}` : ''}`,
          description: inv.title || inv.description || 'Certification fee awaiting payment confirmation receipt.',
          meta: inv.due_date ? `Due Date: ${new Date(inv.due_date).toLocaleDateString('en-GB')}` : 'Immediate payment requested',
          actionLabel: 'Pay Now',
          actionIcon: <CreditCard size={13} />,
          actionType: 'pay_modal',
          payload: inv,
        });
      }
    });

    // 2. Agreements Awaiting Client Signature
    (agreements || []).forEach(agr => {
      const isPendingSign = agr.status === 'sent' && !agr.client_signed && !agr.signed_agreement_url;
      if (isPendingSign) {
        items.push({
          id: `agr_${agr._id || agr.id}`,
          category: 'agreements',
          appType: 'agreement',
          appTypeLabel: 'Agreement',
          appTypeBadgeBg: '#ffe4e6',
          appTypeBadgeColor: '#be123c',
          appStatus: 'agreement_sent',
          appStatusLabel: STATUS_LABELS['agreement_sent'] || 'Agreement Received',
          timelineStage: 'Agreement Received',
          urgency: 'urgent',
          urgencyLabel: 'Signature Required',
          urgencyColor: '#dc2626',
          badgeBg: '#fee2e2',
          icon: <FileSignature size={18} />,
          title: agr.title || 'Halal Certification Agreement',
          description: 'Official HFA certification agreement issued. Please review terms and provide your signature.',
          meta: agr.application_id?.application_number ? `App #${agr.application_id.application_number}` : 'Awaiting client signature',
          actionLabel: 'Review & Sign',
          actionIcon: <FileSignature size={13} />,
          actionType: 'navigate',
          actionUrl: '/agreements',
        });
      }
    });

    // 3. Proposals Awaiting Acceptance
    (proposals || []).forEach(prop => {
      if (prop.status === 'pending' || prop.status === 'sent') {
        const estCost = prop.estimated_cost || prop.amount;
        const costStr = estCost ? `(Est: £${Number(estCost).toLocaleString('en-GB')})` : '';
        items.push({
          id: `prop_${prop._id || prop.id}`,
          category: 'agreements',
          appType: 'agreement',
          appTypeLabel: 'Proposal',
          appTypeBadgeBg: '#ffe4e6',
          appTypeBadgeColor: '#be123c',
          appStatus: 'proposal_sent',
          appStatusLabel: STATUS_LABELS['proposal_sent'] || 'Proposal Received',
          timelineStage: 'Proposal Received',
          urgency: 'action_needed',
          urgencyLabel: 'Proposal Pending',
          urgencyColor: '#d97706',
          badgeBg: '#fef3c7',
          icon: <FileText size={18} />,
          title: `Certification Fee Proposal ${costStr}`,
          description: prop.title || prop.subject || 'Formal fee proposal submitted by HFA. Accept to proceed to next stage.',
          meta: 'Review scope and fee structure',
          actionLabel: 'Review & Accept',
          actionIcon: <ChevronRight size={13} />,
          actionType: 'navigate',
          actionUrl: '/proposals',
        });
      }
    });

    // 4. Initial Products submitted / PAF Form
    (initialProducts || []).forEach(ip => {
      const isPafEnabled = ip.status === 'paf_enabled';
      const isSubmitted = ip.status === 'submitted' || ip.status === 'paf_client_submitted';
      const isUnderReview = ip.status === 'under_review' || ip.status === 'in_review';
      if (isPafEnabled) {
        items.push({
          id: `ip_${ip._id || ip.id}`,
          category: 'initial_products',
          appType: 'initial_product',
          appTypeLabel: 'Initial Product',
          appTypeBadgeBg: '#e0e7ff',
          appTypeBadgeColor: '#4338ca',
          appStatus: 'initial_product',
          appStatusLabel: STATUS_LABELS['initial_product'] || 'Product Approval Form',
          timelineStage: 'Product Approval Form (PAF)',
          urgency: 'urgent',
          urgencyLabel: 'Complete PAF',
          urgencyColor: '#7c3aed',
          badgeBg: '#f3e8ff',
          icon: <Package size={18} />,
          title: `Initial Product Approval Form: ${ip.product?.name || 'Product'}`,
          description: 'Food Tech department has enabled your Product Approval Form. Please complete product details and ingredients.',
          meta: 'Required for audit preparation',
          actionLabel: 'Fill PAF Form',
          actionIcon: <ArrowRight size={13} />,
          actionType: 'navigate',
          actionUrl: `/initial-products/${ip._id || ip.id}/approval-form`,
        });
      } else if (isSubmitted || isUnderReview) {
        items.push({
          id: `ip_track_${ip._id || ip.id}`,
          category: 'initial_products',
          appType: 'initial_product',
          appTypeLabel: 'Initial Product',
          appTypeBadgeBg: '#e0e7ff',
          appTypeBadgeColor: '#4338ca',
          appStatus: 'initial_product',
          appStatusLabel: STATUS_LABELS['initial_product'] || 'Initial Product In-Progress',
          timelineStage: 'Product Evaluation',
          urgency: 'review',
          urgencyLabel: 'In Progress',
          urgencyColor: '#0284c7',
          badgeBg: '#e0f2fe',
          icon: <Package size={18} />,
          title: `Initial Product: ${ip.product?.name || 'Product Evaluation'}`,
          description: 'Initial product submission is currently undergoing Food Tech evaluation.',
          meta: 'Food Tech evaluation in progress',
          actionLabel: 'Track Product',
          actionIcon: <Clock size={13} />,
          actionType: 'navigate',
          actionUrl: `/initial-products/${ip._id || ip.id}/track`,
        });
      }
    });

    // 5. Add-on Applications submitted / PAF Form
    (addOnApps || []).forEach(ao => {
      const isPafEnabled = ao.status === 'paf_enabled';
      const isSubmitted = ao.status === 'submitted' || ao.status === 'paf_client_submitted';
      const isUnderReview = ao.status === 'under_review' || ao.status === 'in_review';
      if (isPafEnabled) {
        items.push({
          id: `ao_${ao._id || ao.id}`,
          category: 'addons',
          appType: 'addon',
          appTypeLabel: 'Add-On',
          appTypeBadgeBg: '#f3e8ff',
          appTypeBadgeColor: '#7e22ce',
          appStatus: 'under_review',
          appStatusLabel: STATUS_LABELS['under_review'] || 'Under Review',
          timelineStage: 'Add-on PAF Form',
          urgency: 'urgent',
          urgencyLabel: 'Complete PAF',
          urgencyColor: '#7c3aed',
          badgeBg: '#f3e8ff',
          icon: <Package size={18} />,
          title: `Add-On Product Approval Form (${(ao.products || []).length} products)`,
          description: 'Product Approval Form ready for input. Provide formulation and supplier details.',
          meta: `${(ao.products || []).length} products listed`,
          actionLabel: 'Fill PAF Form',
          actionIcon: <ArrowRight size={13} />,
          actionType: 'navigate',
          actionUrl: `/addon-applications/${ao._id || ao.id}/approval-form`,
        });
      } else if (isSubmitted || isUnderReview) {
        items.push({
          id: `ao_track_${ao._id || ao.id}`,
          category: 'addons',
          appType: 'addon',
          appTypeLabel: 'Add-On',
          appTypeBadgeBg: '#f3e8ff',
          appTypeBadgeColor: '#7e22ce',
          appStatus: 'under_review',
          appStatusLabel: STATUS_LABELS['under_review'] || 'Add-on In Review',
          timelineStage: 'Add-on Evaluation',
          urgency: 'review',
          urgencyLabel: 'In Progress',
          urgencyColor: '#0284c7',
          badgeBg: '#e0f2fe',
          icon: <Package size={18} />,
          title: `Add-on Application (${(ao.products || []).length} products)`,
          description: 'Add-on product application is undergoing evaluation by HFA.',
          meta: `Submitted: ${new Date(ao.createdAt || ao.created_at || Date.now()).toLocaleDateString('en-GB')}`,
          actionLabel: 'Track Add-On',
          actionIcon: <Clock size={13} />,
          actionType: 'navigate',
          actionUrl: `/addon-applications/${ao._id || ao.id}/track`,
        });
      }
    });

    // 6. Scope Extension Applications
    (extensionApps || []).forEach(ext => {
      const isPending = !['approved', 'rejected', 'completed'].includes((ext.status || '').toLowerCase());
      if (isPending) {
        const extRef = ext.application_number ? `#${ext.application_number}` : '';
        const isSubmitted = ext.status === 'submitted';
        items.push({
          id: `ext_${ext._id || ext.id}`,
          category: 'extensions',
          appType: 'extension',
          appTypeLabel: 'Extension',
          appTypeBadgeBg: '#fef3c7',
          appTypeBadgeColor: '#b45309',
          appStatus: ext.status || 'submitted',
          appStatusLabel: isSubmitted ? 'Extension Submitted' : 'Extension In Review',
          timelineStage: isSubmitted ? 'Extension Submitted' : 'Extension In Review',
          urgency: isSubmitted ? 'review' : 'action_needed',
          urgencyLabel: isSubmitted ? 'Extension Submitted' : 'Scope In Review',
          urgencyColor: isSubmitted ? '#2563eb' : '#b45309',
          badgeBg: isSubmitted ? '#eff6ff' : '#fef3c7',
          icon: <FileText size={18} />,
          title: `Scope Extension Application ${extRef}`,
          description: `Scope extension request for "${ext.extension_scope || ext.scope || 'Facility Scope'}" is being processed by HFA.`,
          meta: ext.created_at || ext.createdAt ? `Submitted ${new Date(ext.created_at || ext.createdAt).toLocaleDateString('en-GB')}` : 'Scope Extension',
          actionLabel: 'Track Extension',
          actionIcon: <Clock size={13} />,
          actionType: 'navigate',
          actionUrl: `/extension-applications/${ext._id || ext.id}/track`,
        });
      }
    });

    // 7. Audits: Dates Proposed or Open NCs
    (audits || []).forEach(aud => {
      if (aud.status === 'dates_proposed') {
        items.push({
          id: `aud_${aud._id || aud.id}`,
          category: 'audits',
          appType: 'audit',
          appTypeLabel: 'Audit',
          appTypeBadgeBg: '#e0f2fe',
          appTypeBadgeColor: '#0369a1',
          appStatus: 'dates_proposed',
          appStatusLabel: STATUS_LABELS['dates_proposed'] || 'Audit Dates Proposed',
          timelineStage: 'Audit Dates Proposed',
          urgency: 'urgent',
          urgencyLabel: 'Date Confirmation',
          urgencyColor: '#dc2626',
          badgeBg: '#fee2e2',
          icon: <Calendar size={18} />,
          title: `Audit Dates Proposed — ${aud.site_name || 'Manufacturing Site'}`,
          description: 'HFA lead auditor has proposed facility audit dates. Please select and confirm your availability.',
          meta: aud.audit_type || 'Halal Compliance Audit',
          actionLabel: 'Select Date',
          actionIcon: <Calendar size={13} />,
          actionType: 'navigate',
          actionUrl: '/audits',
        });
      } else if (aud.nc_reports?.some(nc => nc.status === 'flagged')) {
        items.push({
          id: `nc_${aud._id || aud.id}`,
          category: 'audits',
          appType: 'audit',
          appTypeLabel: 'Audit',
          appTypeBadgeBg: '#e0f2fe',
          appTypeBadgeColor: '#0369a1',
          appStatus: 'nc_flagged',
          appStatusLabel: STATUS_LABELS['nc_flagged'] || 'NC Flagged',
          timelineStage: 'NC Flagged',
          urgency: 'urgent',
          urgencyLabel: 'NC Rectification',
          urgencyColor: '#dc2626',
          badgeBg: '#fee2e2',
          icon: <AlertTriangle size={18} />,
          title: 'Audit Non-Conformance (NC) Action Required',
          description: 'Non-conformance report flagged during audit requires your response and corrective evidence.',
          meta: aud.site_name || 'Audit Rectification',
          actionLabel: 'Resolve NC',
          actionIcon: <AlertTriangle size={13} />,
          actionType: 'navigate',
          actionUrl: '/audits',
        });
      }
    });

    // 8. Expired Certificates without Renewal
    (expiredCertList || []).forEach(cert => {
      const isLatest = latestCertIdBySite.has(String(cert._id || cert.id));
      if (isLatest) {
        items.push({
          id: `cert_exp_${cert._id || cert.id}`,
          category: 'renewals',
          appType: 'renewal',
          appTypeLabel: 'Renewal',
          appTypeBadgeBg: '#dcfce7',
          appTypeBadgeColor: '#15803d',
          appStatus: 'certificate_issued',
          appStatusLabel: 'Certificate Renewal',
          timelineStage: 'Certificate Expired',
          urgency: 'urgent',
          urgencyLabel: 'Certificate Expired',
          urgencyColor: '#dc2626',
          badgeBg: '#fee2e2',
          icon: <Award size={18} />,
          title: `Certificate #${cert.certificate_number || 'CERT'} Expired`,
          description: `Halal certificate expired on ${cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : 'recently'}. Submit a renewal to avoid lapses.`,
          meta: cert.site_name || cert.establishment_name || 'Main Site',
          actionLabel: 'Renew Now',
          actionIcon: <RotateCcw size={13} />,
          actionType: 'navigate',
          actionUrl: `/certificates?renewCertId=${cert._id || cert.id}`,
        });
      }
    });

    // 9. Expiring Soon Certificates (within 90 days) without Renewal
    (expiringSoonCertList || []).forEach(cert => {
      const isLatest = latestCertIdBySite.has(String(cert._id || cert.id));
      if (isLatest) {
        const daysLeft = getDaysRemaining(cert.expiry_date);
        items.push({
          id: `cert_soon_${cert._id || cert.id}`,
          category: 'renewals',
          appType: 'renewal',
          appTypeLabel: 'Renewal',
          appTypeBadgeBg: '#dcfce7',
          appTypeBadgeColor: '#15803d',
          appStatus: 'certificate_issued',
          appStatusLabel: 'Certificate Renewal',
          timelineStage: 'Certificate Expiring',
          urgency: 'action_needed',
          urgencyLabel: `Expires in ${daysLeft}d`,
          urgencyColor: '#d97706',
          badgeBg: '#fef3c7',
          icon: <Award size={18} />,
          title: `Certificate #${cert.certificate_number || 'CERT'} Expiring Soon`,
          description: `Expires on ${cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : 'soon'}. Start your renewal to ensure smooth continuation.`,
          meta: `${daysLeft} days remaining`,
          actionLabel: 'Renew Now',
          actionIcon: <RotateCcw size={13} />,
          actionType: 'navigate',
          actionUrl: `/certificates?renewCertId=${cert._id || cert.id}`,
        });
      }
    });

    // 10. Applications Across Processing Timeline Stages
    (data.applications || []).forEach(app => {
      const st = app.status;
      const appRef = app.application_number ? `#${app.application_number}` : 'N/A';
      const siteName = app.site_name || app.establishment_name || 'Main Facility';

      const rawType = (app.application_type || app.type || '').toLowerCase();
      let category = 'applications';
      let appType = 'standard';
      let appTypeLabel = 'New App';
      let appTypeBadgeBg = '#f1f5f9';
      let appTypeBadgeColor = '#334155';

      if (rawType.includes('renewal')) {
        category = 'renewals';
        appType = 'renewal';
        appTypeLabel = 'Renewal';
        appTypeBadgeBg = '#dcfce7';
        appTypeBadgeColor = '#15803d';
      } else if (rawType.includes('surveillance')) {
        category = 'surveillance';
        appType = 'surveillance';
        appTypeLabel = 'Surveillance';
        appTypeBadgeBg = '#e0f2fe';
        appTypeBadgeColor = '#0369a1';
      } else if (rawType.includes('addon') || rawType.includes('add-on')) {
        category = 'addons';
        appType = 'addon';
        appTypeLabel = 'Add-On';
        appTypeBadgeBg = '#f3e8ff';
        appTypeBadgeColor = '#7e22ce';
      } else if (rawType.includes('extension')) {
        category = 'extensions';
        appType = 'extension';
        appTypeLabel = 'Extension';
        appTypeBadgeBg = '#fef3c7';
        appTypeBadgeColor = '#b45309';
      } else if (rawType.includes('initial') || rawType.includes('product')) {
        category = 'initial_products';
        appType = 'initial_product';
        appTypeLabel = 'Initial Product';
        appTypeBadgeBg = '#e0e7ff';
        appTypeBadgeColor = '#4338ca';
      }

      if (st === 'on_hold') {
        items.push({
          id: `app_hold_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'on_hold',
          appStatusLabel: STATUS_LABELS['on_hold'] || 'On Hold',
          timelineStage: 'Application On Hold',
          urgency: 'action_needed',
          urgencyLabel: 'On Hold',
          urgencyColor: '#c2410c',
          badgeBg: '#ffedd5',
          icon: <FileText size={18} />,
          title: `Application ${appRef} Placed On Hold`,
          description: app.on_hold_reason || 'HFA requires additional documentation or clarifications before moving forward.',
          meta: siteName,
          actionLabel: 'View Application',
          actionIcon: <ArrowRight size={13} />,
          actionType: 'navigate',
          actionUrl: `/applications?appId=${app._id || app.id}`,
        });
      } else if (st === 'submitted') {
        items.push({
          id: `app_sub_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'submitted',
          appStatusLabel: STATUS_LABELS['submitted'] || 'Application Submitted',
          timelineStage: 'Application Submitted',
          urgency: 'review',
          urgencyLabel: appType === 'renewal' ? 'Renewal Submitted' : 'Submitted',
          urgencyColor: '#2563eb',
          badgeBg: '#eff6ff',
          icon: <FileText size={18} />,
          title: `${appTypeLabel} ${appRef} Submitted`,
          description: 'Your application has been received and is queued for initial administrative triage and scope review.',
          meta: `${siteName} • Processing Stage 1`,
          actionLabel: 'Track Timeline',
          actionIcon: <Clock size={13} />,
          actionType: 'navigate',
          actionUrl: `/applications?appId=${app._id || app.id}`,
        });
      } else if (st === 'under_review') {
        items.push({
          id: `app_rev_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'under_review',
          appStatusLabel: STATUS_LABELS['under_review'] || 'Under Review',
          timelineStage: 'Under Review',
          urgency: 'review',
          urgencyLabel: appType === 'renewal' ? 'Renewal In Review' : 'Under Review',
          urgencyColor: '#d97706',
          badgeBg: '#fef3c7',
          icon: <Clock size={18} />,
          title: `${appTypeLabel} ${appRef} Under Technical Review`,
          description: 'HFA technical auditors are currently evaluating your documentation, ingredients, and facility scope.',
          meta: `${siteName} • Processing Stage 2`,
          actionLabel: 'Track Timeline',
          actionIcon: <Clock size={13} />,
          actionType: 'navigate',
          actionUrl: `/applications?appId=${app._id || app.id}`,
        });
      } else if (st === 'logsheet_created' || st === 'logsheet_signed') {
        items.push({
          id: `app_log_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'logsheet_created',
          appStatusLabel: STATUS_LABELS['logsheet_created'] || 'Under Committee Review',
          timelineStage: 'Under Committee Review',
          urgency: 'review',
          urgencyLabel: 'Committee Review',
          urgencyColor: '#7c3aed',
          badgeBg: '#f3e8ff',
          icon: <CheckCircle size={18} />,
          title: `${appTypeLabel} ${appRef} Under Committee Review`,
          description: 'Audit logsheet is currently circulating for Halal Committee endorsement before certificate release.',
          meta: `${siteName} • Final Approvals`,
          actionLabel: 'Track Timeline',
          actionIcon: <Clock size={13} />,
          actionType: 'navigate',
          actionUrl: `/applications?appId=${app._id || app.id}`,
        });
      }
    });

    // 11. Support Tickets with Staff Replies
    (tickets || []).forEach(t => {
      if ((t.status === 'open' || t.status === 'in_progress') && Array.isArray(t.responses) && t.responses.length > 0) {
        const lastResp = t.responses[t.responses.length - 1];
        const isStaffReply = (lastResp.user_role || '').toLowerCase().includes('staff') ||
          (lastResp.user_role || '').toLowerCase().includes('admin') ||
          (lastResp.user_role || '').toLowerCase().includes('agent');
        if (isStaffReply) {
          items.push({
            id: `tkt_${t._id || t.id}`,
            category: 'tickets',
            appType: 'ticket',
            appTypeLabel: 'Support',
            appTypeBadgeBg: '#dbeafe',
            appTypeBadgeColor: '#1d4ed8',
            appStatus: 'support',
            appStatusLabel: 'Support Ticket',
            timelineStage: 'Support Ticket',
            urgency: 'review',
            urgencyLabel: 'Staff Replied',
            urgencyColor: '#0284c7',
            badgeBg: '#e0f2fe',
            icon: <MessageSquare size={18} />,
            title: `Support Ticket: ${t.subject || 'Support Request'}`,
            description: `HFA staff replied: "${(lastResp.message || '').slice(0, 75)}${(lastResp.message || '').length > 75 ? '...' : ''}"`,
            meta: `Ticket #${t.ticket_number || 'TKT'}`,
            actionLabel: 'View & Reply',
            actionIcon: <MessageSquare size={13} />,
            actionType: 'navigate',
            actionUrl: '/tickets',
          });
        }
      }
    });

    // Sort: urgent first, then action_needed, then review
    const priorityWeight = { urgent: 3, action_needed: 2, review: 1 };
    return items.sort((a, b) => (priorityWeight[b.urgency] || 0) - (priorityWeight[a.urgency] || 0));
  }, [invoices, agreements, proposals, initialProducts, addOnApps, extensionApps, audits, expiredCertList, expiringSoonCertList, latestCertIdBySite, data.applications, tickets]);

  const urgentActionCount = actionItems.filter(i => i.urgency === 'urgent').length;

  // Derive distinct timeline stages present in current client action items
  const availableTimelineStages = useMemo(() => {
    const counts = {};
    actionItems.forEach(item => {
      if (item.appStatus) {
        counts[item.appStatus] = (counts[item.appStatus] || 0) + 1;
      }
    });

    const stages = [];
    const seen = new Set();
    (STATUS_ORDER || []).forEach(st => {
      if (counts[st]) {
        stages.push({
          status: st,
          label: STATUS_LABELS[st] || st.replace(/_/g, ' '),
          count: counts[st]
        });
        seen.add(st);
      }
    });
    // Add any remaining (e.g. 'support')
    Object.keys(counts).forEach(st => {
      if (!seen.has(st)) {
        stages.push({
          status: st,
          label: STATUS_LABELS[st] || (st === 'support' ? 'Support Ticket' : st.replace(/_/g, ' ')),
          count: counts[st]
        });
      }
    });
    return stages;
  }, [actionItems]);

  const filteredActionItems = useMemo(() => {
    let list = actionItems;
    if (actionFilterTab === 'urgent') {
      list = list.filter(i => i.urgency === 'urgent');
    } else if (actionFilterTab !== 'all') {
      list = list.filter(i => i.category === actionFilterTab || i.appType === actionFilterTab);
    }
    if (actionTimelineFilter !== 'all') {
      list = list.filter(i => i.appStatus === actionTimelineFilter);
    }
    if (actionSearchQuery.trim()) {
      const q = actionSearchQuery.trim().toLowerCase();
      list = list.filter(i =>
        (i.title          || '').toLowerCase().includes(q) ||
        (i.description    || '').toLowerCase().includes(q) ||
        (i.meta           || '').toLowerCase().includes(q) ||
        (i.urgencyLabel   || '').toLowerCase().includes(q) ||
        (i.urgency        || '').toLowerCase().includes(q) ||
        (i.appType        || '').toLowerCase().includes(q) ||
        (i.appTypeLabel   || '').toLowerCase().includes(q) ||
        (i.appStatus      || '').toLowerCase().includes(q) ||
        (i.appStatusLabel || '').toLowerCase().includes(q) ||
        (i.timelineStage  || '').toLowerCase().includes(q) ||
        (i.actionLabel    || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [actionItems, actionFilterTab, actionTimelineFilter, actionSearchQuery]);

  // Auto popup on login if pending action items exist
  useEffect(() => {
    if (!loading && actionItems.length > 0) {
      const hasAutoShown = sessionStorage.getItem('hfa_client_action_popup_shown');
      if (!hasAutoShown) {
        setShowActionModal(true);
        sessionStorage.setItem('hfa_client_action_popup_shown', 'true');
      }
    }
  }, [loading, actionItems.length]);

  const handleActionClick = (item) => {
    setShowActionModal(false);
    if (item.actionType === 'pay_modal') {
      setSelectedInvoiceForPayment(item.payload);
      setShowPaymentModal(true);
    } else if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  return (
    <div>
      {/* Welcome Banner */}
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 20, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
          </h2>
          <p style={{ opacity: 0.85, fontSize: 13 }}>
            {profile?.company_name} — Here's your certification overview
          </p>
        </div>
        <Link to="/applications?type=new" className="btn" style={{ background: 'white', color: 'var(--primary)', fontWeight: 700, padding: '10px 20px' }}>
          <Plus size={16} /> New Application
        </Link>
      </div>

      {/* ── ACTION REQUIRED TRIGGER BANNER (CLICK TO POP-UP) ───────────────── */}
      <div
        onClick={() => setShowActionModal(true)}
        style={{
          marginBottom: 24,
          padding: '14px 20px',
          borderRadius: 'var(--radius-lg, 14px)',
          background: urgentActionCount > 0
            ? 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)'
            : actionItems.length > 0
              ? 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)'
              : 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
          border: urgentActionCount > 0
            ? '1.5px solid #fecaca'
            : actionItems.length > 0
              ? '1.5px solid #fde68a'
              : '1px solid #bbf7d0',
          boxShadow: urgentActionCount > 0 ? '0 4px 14px rgba(220, 38, 38, 0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: urgentActionCount > 0 ? '#dc2626' : actionItems.length > 0 ? '#d97706' : '#15803d',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}>
            {urgentActionCount > 0 ? <AlertTriangle size={20} /> : actionItems.length > 0 ? <BellRing size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                Action Required
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 12,
                background: urgentActionCount > 0 ? '#dc2626' : actionItems.length > 0 ? '#d97706' : '#15803d',
                color: '#ffffff'
              }}>
                {actionItems.length === 0 ? 'All Caught Up' : `${actionItems.length} Pending`}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
              {actionItems.length === 0
                ? 'No outstanding items. Click to review certification status.'
                : `${urgentActionCount > 0 ? `${urgentActionCount} urgent item(s) require action.` : 'You have pending tasks requiring your review or signature.'} Click here to open pop-up.`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowActionModal(true); }}
          className="btn btn-sm"
          style={{
            background: urgentActionCount > 0 ? '#dc2626' : actionItems.length > 0 ? 'var(--primary, #15803d)' : '#ffffff',
            color: actionItems.length > 0 ? '#ffffff' : '#334155',
            border: actionItems.length > 0 ? 'none' : '1px solid #cbd5e1',
            fontWeight: 700,
            fontSize: 12,
            padding: '7px 15px',
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
          }}
        >
          {actionItems.length > 0 ? <BellRing size={13} /> : <CheckCircle2 size={13} />}
          {actionItems.length > 0 ? 'Open Action Pop-Up' : 'View Status'}
          <ChevronRight size={13} />
        </button>
      </div>

      {/* ── ACTION REQUIRED POP-UP MODAL ─────────────────────────────────────── */}
      {showActionModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1400,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowActionModal(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: 780,
              width: '100%',
              maxHeight: 'min(90vh, 760px)',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: urgentActionCount > 0
                ? 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #064e3b 0%, #15803d 50%, #047857 100%)',
              padding: '22px 28px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  {urgentActionCount > 0 ? <AlertTriangle size={24} /> : <BellRing size={24} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
                      Action Required
                    </h2>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 9px',
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}>
                      {actionItems.length === 0 ? '0 All Caught Up' : `${actionItems.length} Pending`}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                    {actionItems.length === 0
                      ? 'All certification requirements, payments, and agreements are up to date.'
                      : `${urgentActionCount > 0 ? `${urgentActionCount} urgent item(s) require your immediate attention.` : 'Please complete the pending items below to keep your certification on track.'}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowActionModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search & Timeline Filter Row */}
            {actionItems.length > 0 && (
              <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                  <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search by title, timeline status (e.g. under review, proposal, audit)…"
                    value={actionSearchQuery}
                    onChange={e => setActionSearchQuery(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '8px 28px 8px 32px',
                      border: '1px solid #cbd5e1', borderRadius: 8,
                      fontSize: 12.5, color: '#0f172a', background: '#ffffff',
                      outline: 'none', transition: 'border-color 0.15s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#15803d'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                  {actionSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setActionSearchQuery('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Timeline Status Filter */}
                <div style={{ minWidth: 210 }}>
                  <select
                    value={actionTimelineFilter}
                    onChange={e => setActionTimelineFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: actionTimelineFilter !== 'all' ? '#15803d' : '#0f172a',
                      background: '#ffffff',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Timeline: All Stages ({actionItems.length})</option>
                    {availableTimelineStages.map(stage => (
                      <option key={stage.status} value={stage.status}>
                        Timeline: {stage.label} ({stage.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Filter Tabs in Modal */}
            {actionItems.length > 0 && (
              <div style={{
                padding: '12px 24px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                overflowX: 'auto',
                paddingBottom: 4
              }}>
                {[
                  { id: 'all', label: `All (${actionItems.length})` },
                  ...(urgentActionCount > 0 ? [{ id: 'urgent', label: `Urgent (${urgentActionCount})` }] : []),
                  { id: 'renewals', label: 'Renewals' },
                  { id: 'addons', label: 'Add-Ons' },
                  { id: 'extensions', label: 'Extensions' },
                  { id: 'surveillance', label: 'Surveillance' },
                  { id: 'initial_products', label: 'Initial Products' },
                  { id: 'applications', label: 'Applications' },
                  { id: 'payments', label: 'Payments' },
                  { id: 'agreements', label: 'Agreements' },
                  { id: 'audits', label: 'Audits' },
                  { id: 'tickets', label: 'Support' }
                ].map(t => {
                  const countForCat = t.id === 'all'
                    ? actionItems.length
                    : t.id === 'urgent'
                      ? urgentActionCount
                      : actionItems.filter(i => i.category === t.id || i.appType === t.id).length;
                  if (t.id !== 'all' && t.id !== 'urgent' && countForCat === 0) return null;
                  const displayLabel = (t.id === 'all' || t.id === 'urgent') ? t.label : `${t.label} (${countForCat})`;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActionFilterTab(t.id)}
                      style={{
                        background: actionFilterTab === t.id ? 'var(--primary, #15803d)' : '#ffffff',
                        color: actionFilterTab === t.id ? '#ffffff' : '#475569',
                        border: '1px solid',
                        borderColor: actionFilterTab === t.id ? 'var(--primary, #15803d)' : '#cbd5e1',
                        padding: '4px 11px',
                        borderRadius: 16,
                        fontSize: 11,
                        fontWeight: actionFilterTab === t.id ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.12s'
                      }}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Modal Scrollable Items List */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {actionItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle size={28} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    All Caught Up! Everything is in order.
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, maxWidth: 440, margin: '6px auto 0' }}>
                    There are no pending invoices, agreements, audits, PAF submissions, or certificate renewals requiring your attention.
                  </div>
                </div>
              ) : filteredActionItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13.5 }}>
                  No pending action items in this category.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredActionItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                        padding: '14px 18px',
                        borderRadius: 12,
                        background: item.urgency === 'urgent' ? '#fffaf9' : '#fcfcfc',
                        border: item.urgency === 'urgent' ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 260 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: item.badgeBg,
                          color: item.urgencyColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2
                        }}>
                          {item.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 8,
                              background: item.badgeBg,
                              color: item.urgencyColor,
                              letterSpacing: '0.02em',
                              textTransform: 'uppercase'
                            }}>
                              {item.urgencyLabel}
                            </span>
                            {item.appTypeLabel && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 8,
                                background: item.appTypeBadgeBg || '#f1f5f9',
                                color: item.appTypeBadgeColor || '#334155',
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase',
                                border: `1px solid ${item.appTypeBadgeColor ? item.appTypeBadgeColor + '33' : '#cbd5e1'}`
                              }}>
                                {item.appTypeLabel}
                              </span>
                            )}
                            {item.timelineStage && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <Clock size={10} style={{ color: '#64748b' }} />
                                Timeline: {item.timelineStage}
                              </span>
                            )}
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                              {item.title}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3, lineHeight: 1.45 }}>
                            {item.description}
                          </div>
                          {item.meta && (
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
                              {item.meta}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowActionModal(false);
                            if (item.actionType === 'pay_modal') {
                              setSelectedInvoiceForPayment(item.payload);
                              setShowPaymentModal(true);
                            } else if (item.actionUrl) {
                              navigate(item.actionUrl);
                            }
                          }}
                          className="btn btn-sm"
                          style={{
                            background: item.urgency === 'urgent' ? '#dc2626' : 'var(--primary, #15803d)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 12,
                            padding: '8px 16px',
                            borderRadius: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                            cursor: 'pointer',
                            border: 'none'
                          }}
                        >
                          {item.actionIcon}
                          {item.actionLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {actionItems.length > 0 ? `${actionItems.length} action item(s) currently open` : 'All items in order'}
              </div>
              <button
                type="button"
                onClick={() => setShowActionModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12.5, fontWeight: 600 }}
              >
                Close Pop-Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* 1. Active Certificates */}
        <div
          className="stat-card"
          style={{ cursor: 'pointer', border: '1px solid var(--border)', background: '#fff' }}
          onClick={() => navigate('/certificates')}
        >
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <Award size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Active Certificates</div>
            <div className="stat-value">{loading ? '—' : activeCertList.length}</div>
          </div>
        </div>

        {/* 2. Certificates Expiring Soon or Expired */}
        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            border: (expiringSoonCertList.length > 0 || expiredCertList.length > 0) ? '1.5px solid #fde68a' : '1px solid var(--border)',
            background: expiredCertList.length > 0 ? 'linear-gradient(135deg, #fff, #fef2f2)' : expiringSoonCertList.length > 0 ? 'linear-gradient(135deg, #fff, #fffbeb)' : '#fff',
          }}
          onClick={() => navigate('/certificates')}
        >
          <div className="stat-icon" style={{
            background: expiredCertList.length > 0 ? '#fee2e2' : expiringSoonCertList.length > 0 ? '#fef3c7' : '#f1f5f9',
            color: expiredCertList.length > 0 ? '#dc2626' : expiringSoonCertList.length > 0 ? '#d97706' : '#94a3b8'
          }}>
            <AlertCircle size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Expiring / Expired</div>
            <div className="stat-value" style={{ color: expiredCertList.length > 0 ? '#dc2626' : expiringSoonCertList.length > 0 ? '#d97706' : 'var(--text-primary)' }}>
              {loading ? '—' : expiringSoonCertList.length + expiredCertList.length}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
              {expiringSoonCertList.length > 0 && (
                <span
                  onClick={() => navigate('/certificates?status=expiring')}
                  style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', cursor: 'pointer' }}
                >
                  ⚠️ {expiringSoonCertList.length} Expiring
                </span>
              )}
              {expiredCertList.length > 0 && (
                <span
                  onClick={() => navigate('/certificates?status=expired')}
                  style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', cursor: 'pointer' }}
                >
                  🔴 {expiredCertList.length} Expired
                </span>
              )}
              {expiringSoonCertList.length === 0 && expiredCertList.length === 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>All certificates up to date</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Total Applications (All) */}
        <div className="stat-card" onClick={() => navigate('/applications')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}><FileText size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Applications</div>
            <div className="stat-value">{loading ? '—' : totalApps}</div>
          </div>
        </div>

        {/* 4. Products Registered (unchanged) */}
        <div className="stat-card" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}><Package size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Products Registered</div>
            <div className="stat-value">{loading ? '—' : data.products.length}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Recent Applications */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Applications</div>
              <div className="card-subtitle">Your latest certification requests</div>
            </div>
            <Link to="/applications" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div>
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              recentApps.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><FileText /></div>
                  <div className="empty-state-title">No Applications Yet</div>
                  <div className="empty-state-text">Start by submitting a new application</div>
                  <Link to="/applications?type=new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                    <Plus size={14} /> New Application
                  </Link>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Site Name</th><th>Category</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {recentApps.map(app => (
                      <tr key={app.id || app._id}>
                        <td><Link to={`/applications?appId=${app.id || app._id}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>{app.site_name || app.establishment_name || 'Site'}</Link></td>
                        <td style={{ fontSize: 12, maxWidth: 150 }}><span className="truncate" style={{ display: 'block' }}>{app.category}</span></td>
                        <td>
                          {(() => {
                            const effStatus = getEffectiveApplicationStatus(app);
                            const isRenewal = (app.application_type || '').toLowerCase() === 'renewal' || (app.application_type || '').toLowerCase() === 'surveillance';
                            const label = (effStatus === 'payment_received' && isRenewal) ? 'Renewal Fee Paid' : (STATUS_LABELS[effStatus] || effStatus?.replace(/_/g, ' '));
                            return (
                              <span className={`badge ${STATUS_BADGE[effStatus] || 'badge-gray'}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>

        {/* Certificates with Expiry Periods & Direct Renewal */}
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="card-title">My Certificates ({data.certificates.length})</div>
              <div className="card-subtitle">Active, expiring, and historical halal certifications</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Filter Tabs */}
              <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 8 }}>
                {[
                  { id: 'all', label: `All (${data.certificates.length})` },
                  { id: 'active', label: `Active (${activeCertList.length})` },
                  { id: 'expiring', label: `Expiring (${expiringSoonCertList.length})` },
                  { id: 'expired', label: `Expired (${expiredCertList.length})` },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCertFilterTab(t.id)}
                    style={{
                      background: certFilterTab === t.id ? '#fff' : 'transparent',
                      color: certFilterTab === t.id ? 'var(--primary)' : '#64748b',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: certFilterTab === t.id ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: certFilterTab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Link to="/certificates" className="btn btn-ghost btn-sm">Manage</Link>
            </div>
          </div>
          <div>
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              displayedCerts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Award /></div>
                  <div className="empty-state-title">No Certificates in this view</div>
                  <div className="empty-state-text">Certificates will appear here once issued by HFA</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Certificate No.</th><th>Type</th><th>Expires / Period</th><th>Status & Action</th></tr>
                  </thead>
                  <tbody>
                    {displayedCerts.slice(0, 5).map(cert => {
                      const daysLeft = getDaysRemaining(cert.expiry_date);
                      const isPast = cert.status === 'expired' || (daysLeft !== null && daysLeft <= 0);
                      const isExpSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 90;

                      return (
                        <tr key={cert.id || cert._id}>
                          <td>
                            <Link to={`/certificates`} style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>
                              {cert.certificate_number}
                            </Link>
                          </td>
                          <td style={{ fontSize: 12 }}>{cert.certificate_type}</td>
                          <td style={{ fontSize: 12 }}>
                            <div>{cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : '—'}</div>
                            {cert.expiry_date && (
                              <div style={{ marginTop: 2 }}>
                                {isPast ? (
                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626' }}>
                                    Expired {Math.abs(daysLeft)}d ago
                                  </span>
                                ) : isExpSoon ? (
                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#d97706' }}>
                                    ⚠️ {daysLeft} days left
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#16a34a' }}>
                                    {daysLeft} days left
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {(() => {
                                const certStatus = (cert.status || '').toLowerCase().trim();
                                if (certStatus === 'superseded' || certStatus === 'outdated' || certStatus === 'inactive') {
                                  return <span className="badge badge-gray">Inactive</span>;
                                }
                                if (certStatus === 'renewed' || cert.is_renewed) {
                                  return (
                                    <span className={`badge ${isPast ? 'badge-red' : isExpSoon ? 'badge-orange' : 'badge-green'}`}>
                                      {isPast ? 'Expired' : isExpSoon ? 'Expiring Soon' : 'Active'}
                                    </span>
                                  );
                                }
                                return (
                                  <span className={`badge ${isPast ? 'badge-red' : isExpSoon ? 'badge-orange' : 'badge-green'}`}>
                                    {isPast ? 'Expired' : isExpSoon ? 'Expiring Soon' : 'Active'}
                                  </span>
                                );
                              })()}
                              <a
                                href={getCertificateDownloadUrl(cert)}
                                target="_blank"
                                rel="noreferrer"
                                download={`${(cert.certificate_number || 'Certificate').replace(/[\/\\:]/g, '_')}.pdf`}
                                className="btn btn-outline btn-sm"
                                style={{
                                  padding: '3px 8px',
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  borderRadius: 6,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title={`Download certificate ${cert.certificate_number || ''}`}
                              >
                                <Download size={11} /> Download
                              </a>
                              {(() => {
                                const ongoingRenewal = getOngoingRenewalApp(cert);
                                if (ongoingRenewal) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/applications/${ongoingRenewal._id || ongoingRenewal.id || ''}/track`)}
                                      className="badge badge-purple"
                                      style={{
                                        border: 'none',
                                        padding: '4px 8px',
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                      }}
                                      title="Renewal application is in progress. Click to view progress."
                                    >
                                      <Clock size={11} /> Renewal in Progress
                                    </button>
                                  );
                                }
                                const certId = String(cert._id || cert.id || '');
                                const isLatestForSite = latestCertIdBySite.has(certId);
                                const certStatus = (cert.status || '').toLowerCase().trim();
                                const isObsolete = ['superseded', 'outdated', 'inactive'].includes(certStatus);

                                if (isLatestForSite && !isObsolete && (isPast || isExpSoon)) {
                                  return (
                                    <button
                                      className="btn btn-sm"
                                      onClick={() => navigate(`/certificates?renewCertId=${cert._id || cert.id}`)}
                                      style={{
                                        padding: '3px 8px', fontSize: 10.5, fontWeight: 700, borderRadius: 6,
                                        background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: 4
                                      }}
                                      title="Renew this certificate"
                                    >
                                      <RotateCcw size={11} /> Renew
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Quick Actions</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'New Application', icon: <FileText size={20} />, path: '/applications?type=new', color: '#15803d', bg: '#dcfce7' },
              { label: 'View Certificates', icon: <Award size={20} />, path: '/certificates', color: '#7c3aed', bg: '#f3e8ff' },
              { label: 'Add Product', icon: <Package size={20} />, path: '/products/new', color: '#d97706', bg: '#fef3c7' },
              { label: 'Export Certificate', icon: <Ship size={20} />, path: '/export/new', color: '#0891b2', bg: '#e0f2fe' },
              { label: 'Download Forms', icon: <Download size={20} />, onClick: () => setShowForms(true), color: '#334155', bg: '#f1f5f9' },
              { label: 'Send Message', icon: <RefreshCw size={20} />, path: '/messages/inbox', color: '#dc2626', bg: '#fee2e2' },
            ].map(a => (
              a.path ? (
                <Link key={a.label} to={a.path} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '20px 16px', borderRadius: 'var(--radius-md)',
                  background: a.bg, color: a.color, textDecoration: 'none',
                  fontWeight: 600, fontSize: 13, gap: 10, transition: 'var(--transition)',
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  {a.icon}
                  {a.label}
                </Link>
              ) : (
                <button key={a.label} onClick={a.onClick} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '20px 16px', borderRadius: 'var(--radius-md)',
                  background: a.bg, color: a.color, border: 'none',
                  fontWeight: 600, fontSize: 13, gap: 10, transition: 'var(--transition)',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  {a.icon}
                  {a.label}
                </button>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Forms Modal */}
      {showForms && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForms(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <span className="modal-title">Official HFA Forms &amp; Templates</span>
              <button className="modal-close" onClick={() => setShowForms(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
                Download the required templates to assist with your certification process.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {OFFICIAL_FORMS.map(f => (
                  <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                        <FileText size={18} color="var(--primary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.type} • {f.size}</div>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => toast.success(`Downloading ${f.name}...`)}>
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowForms(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DISMISSIBLE NEW USER SITE ONBOARDING POP-UP */}
      <NewUserSitePromptModal
        isOpen={showSiteModal}
        onClose={handleDismissSiteModal}
      />

      {/* Pop up when first site is created to guide client to create application */}
      <FirstSiteCreatedModal
        isOpen={showFirstSiteModal}
        onClose={handleDismissFirstSiteModal}
        siteName={data.sites?.[0]?.name || data.sites?.[0]?.est_name || data.sites?.[0]?.company_name || data.profile?.company_name || 'Primary Manufacturing Facility'}
      />

      {/* Interactive Payment Modal for Action Required */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoiceForPayment(null);
        }}
        invoice={selectedInvoiceForPayment}
        onSuccess={() => {
          toast.success('Payment submitted successfully! Your receipt is now under verification.');
          fetchDashboardData();
        }}
      />
    </div>
  );
}
