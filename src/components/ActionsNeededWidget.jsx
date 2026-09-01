import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert, FileText, Receipt, Calendar, PenTool,
  CheckCircle, ArrowRight, Award, Layers, Search,
  RefreshCw, X, AlertTriangle, MapPin, Package, Clock,
  ShieldCheck, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import ClientProposalModal from './ClientProposalModal';
import PaymentModal from './PaymentModal';
import ClientAuditModal from './ClientAuditModal';
import ClientAgreementModal from './ClientAgreementModal';

export default function ActionsNeededWidget({ onActionCompleted }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitializedAutoOpen, setHasInitializedAutoOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Active inline modal target
  const [activeModal, setActiveModal] = useState(null); // { type, app, invoice, agreement, audit, proposal }
  const [signatures, setSignatures] = useState([]);

  const fetchClientActions = useCallback(async () => {
    try {
      const [
        appRes,
        propRes,
        invRes,
        agRes,
        audRes,
        sigRes,
        initProdRes,
        initEligibleRes,
        addOnRes,
        certRes,
        siteRes
      ] = await Promise.all([
        api.get('/api/applications').catch(() => ({ data: [] })),
        api.get('/api/proposals').catch(() => ({ data: [] })),
        api.get('/api/invoices').catch(() => ({ data: [] })),
        api.get('/api/agreements').catch(() => ({ data: [] })),
        api.get('/api/audits').catch(() => ({ data: [] })),
        api.get('/api/signatures').catch(() => ({ data: [] })),
        api.get('/api/initial-products').catch(() => ({ data: [] })),
        api.get('/api/initial-products/eligible-applications').catch(() => ({ data: [] })),
        api.get('/api/add-on-applications').catch(() => ({ data: [] })),
        api.get('/api/certificates').catch(() => ({ data: [] })),
        api.get('/api/sites').catch(() => ({ data: [] }))
      ]);

      const allApps = Array.isArray(appRes) ? appRes : (appRes?.data?.data || appRes?.data || []);
      const allProps = Array.isArray(propRes) ? propRes : (propRes?.data?.data || propRes?.data || []);
      const allInvoices = Array.isArray(invRes) ? invRes : (invRes?.data?.data || invRes?.data || []);
      const allAgreements = Array.isArray(agRes) ? agRes : (agRes?.data?.data || agRes?.data || []);
      const allAudits = Array.isArray(audRes) ? audRes : (audRes?.data?.data || audRes?.data || []);
      const allSignatures = Array.isArray(sigRes) ? sigRes : (sigRes?.data?.data || sigRes?.data || []);
      const allInitProds = Array.isArray(initProdRes) ? initProdRes : (initProdRes?.data?.data || initProdRes?.data || []);
      const eligibleInitApps = Array.isArray(initEligibleRes) ? initEligibleRes : (initEligibleRes?.data?.data || initEligibleRes?.data || []);
      const allAddOns = Array.isArray(addOnRes) ? addOnRes : (addOnRes?.data?.data || addOnRes?.data || []);
      const allCerts = Array.isArray(certRes) ? certRes : (certRes?.data?.data || certRes?.data || []);
      const allSites = Array.isArray(siteRes) ? siteRes : (siteRes?.data?.data || siteRes?.data || []);

      setSignatures(allSignatures);

      const actionList = [];
      const now = Date.now();
      const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
      const threeMonthsInMs = 90 * 24 * 60 * 60 * 1000;

      // Track processed IDs to prevent duplicates
      const processedProposalAppIds = new Set();
      const processedInvoiceIds = new Set();

      // ─────────────────────────────────────────────────────────────
      // 0. SITES: Check if client has 0 sites
      // ─────────────────────────────────────────────────────────────
      if (allSites.length === 0) {
        actionList.push({
          id: 'site-missing',
          category: 'applications',
          app: { application_number: 'SETUP', establishment_name: 'Your Company' },
          type: 'navigate',
          title: 'No Manufacturing Site Registered',
          tag: 'Site Setup',
          desc: 'Add your business facility details in "Manage Sites" to begin the Halal certification process.',
          buttonText: 'Add Site',
          buttonBg: '#1B7A7A',
          isLink: true,
          link: '/sites',
          icon: <MapPin size={16} />
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 1. APPLICATIONS: Client Actionable Stages
      // ─────────────────────────────────────────────────────────────
      for (const app of allApps) {
        if (!app || !app.status) continue;
        const appId = String(app._id || app.id);
        const normStatus = (app.status || '').toLowerCase().trim();
        const facilityName = app.site_name || app.establishment_name || 'your site';
        const isRenewal = (app.application_type || '').toLowerCase() === 'renewal';
        const appNum = app.application_number || 'N/A';

        const linkedProposal = allProps.find(p => {
          const pAppId = String(p.application_id?._id || p.application_id || '');
          return pAppId === appId;
        });

        const linkedInvoice = allInvoices.find(inv => {
          const invAppId = String(inv.application_id?._id || inv.application_id || '');
          return invAppId === appId;
        });

        const linkedAgreement = allAgreements.find(ag => {
          const agAppId = String(ag.application_id?._id || ag.application_id || '');
          return agAppId === appId;
        });

        const linkedAudit = allAudits.find(aud => {
          const audAppId = String(aud.application_id?._id || aud.application_id || '');
          return audAppId === appId;
        });

        switch (normStatus) {
          case 'proposal_sent':
            processedProposalAppIds.add(appId);
            actionList.push({
              id: `app-prop-${appId}`,
              category: 'proposals',
              app,
              proposal: linkedProposal,
              type: 'proposal',
              title: `Certification Proposal Received (v${linkedProposal?.version || 1})`,
              tag: 'Proposal',
              desc: `Review and approve or reject the certification proposal for ${facilityName} (Estimated: £${Number(linkedProposal?.estimated_cost || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })})`,
              buttonText: 'Review Proposal',
              buttonBg: '#854d0e',
              icon: <FileText size={16} />
            });
            break;

          case 'invoice_sent':
            if (linkedInvoice) processedInvoiceIds.add(String(linkedInvoice._id || linkedInvoice.id));
            actionList.push({
              id: `app-inv-${appId}`,
              category: 'invoices',
              app,
              invoice: linkedInvoice,
              type: 'payment',
              title: isRenewal ? 'Renewal Invoice Payment Required' : 'Initial Invoice Sent: Payment Required',
              tag: isRenewal ? 'Renewal Invoice' : 'Initial Invoice',
              desc: `Pay initial certification fee (£${Number(linkedInvoice?.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}) for ${facilityName}`,
              buttonText: 'Pay Invoice',
              buttonBg: '#ea580c',
              icon: <Receipt size={16} />
            });
            break;

          case 'dates_proposed':
            actionList.push({
              id: `app-audit-${appId}`,
              category: 'audits',
              app,
              audit: linkedAudit,
              type: 'audit',
              title: 'Select Preferred Audit Dates',
              tag: 'Audit Dates',
              desc: `Select 2 preferred audit visit dates for ${facilityName}`,
              buttonText: 'Select Dates',
              buttonBg: '#0284c7',
              icon: <Calendar size={16} />
            });
            break;

          case 'on_hold':
          case 'nc_flagged':
            actionList.push({
              id: `app-nc-${appId}`,
              category: 'audits',
              app,
              audit: linkedAudit,
              type: 'audit',
              title: 'Action Needed: Non-Conformity (NC) Flagged',
              tag: 'NC Action',
              desc: `Submit your corrective action plan for audit findings at ${facilityName}`,
              buttonText: 'Upload Action',
              buttonBg: '#dc2626',
              icon: <AlertTriangle size={16} />
            });
            break;

          case 'agreement_sent':
            actionList.push({
              id: `app-ag-${appId}`,
              category: 'agreements',
              app,
              agreement: linkedAgreement,
              type: 'agreement',
              title: 'Certification Agreement Ready to Sign',
              tag: 'Agreement',
              desc: `Review & electronically sign certification agreement contract for ${facilityName}`,
              buttonText: 'Sign Agreement',
              buttonBg: '#2563eb',
              icon: <PenTool size={16} />
            });
            break;

          case 'final_invoice_sent':
            if (linkedInvoice) processedInvoiceIds.add(String(linkedInvoice._id || linkedInvoice.id));
            actionList.push({
              id: `app-finalinv-${appId}`,
              category: 'invoices',
              app,
              invoice: linkedInvoice,
              type: 'payment',
              title: 'Final Certification Invoice Due',
              tag: 'Final Payment',
              desc: `Pay final certification fee (£${Number(linkedInvoice?.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}) for ${facilityName}`,
              buttonText: 'Pay Final Invoice',
              buttonBg: '#ea580c',
              icon: <Receipt size={16} />
            });
            break;

          default:
            break;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 1B. PROPOSALS: Pending Proposals from /api/proposals
      // ─────────────────────────────────────────────────────────────
      const pendingProposals = allProps.filter(p => {
        const isPendingStatus = (p.status === 'pending' || p.status === 'sent');
        const pAppId = String(p.application_id?._id || p.application_id || '');
        return isPendingStatus && !processedProposalAppIds.has(pAppId);
      });

      for (const prop of pendingProposals) {
        const pAppId = String(prop.application_id?._id || prop.application_id || '');
        const linkedApp = allApps.find(a => String(a._id || a.id) === pAppId);
        const estName = linkedApp?.establishment_name || linkedApp?.site_name || prop.title || 'Certification Facility';

        actionList.push({
          id: `prop-pending-${prop._id || prop.id}`,
          category: 'proposals',
          app: linkedApp || { application_number: `PROP-v${prop.version || 1}`, establishment_name: estName },
          proposal: prop,
          type: 'proposal',
          title: `Certification Proposal: ${prop.title || 'Halal Certification'} (v${prop.version || 1})`,
          tag: 'Proposal',
          desc: `Estimated cost: £${Number(prop.estimated_cost || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}. Review and respond to proposal for ${estName}.`,
          buttonText: 'Review Proposal',
          buttonBg: '#854d0e',
          icon: <FileText size={16} />
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 2. INITIAL PRODUCTS: Actions & Eligible Invitations
      // ─────────────────────────────────────────────────────────────
      for (const ip of allInitProds) {
        if (!ip) continue;
        const ipId = ip._id || ip.id;
        const prodName = ip.product?.name || 'Initial Product';
        const appNum = ip.application_id?.application_number || `APP-${String(ip.application_id?._id || ip.application_id || '').slice(-6).toUpperCase()}`;

        if (ip.status === 'product_approval_form_enabled') {
          actionList.push({
            id: `initprod-form-${ipId}`,
            category: 'initial_products',
            app: { _id: ipId, application_number: appNum, establishment_name: prodName },
            type: 'navigate',
            title: 'Initial Product: Complete Approval Form',
            tag: 'Specs Form',
            desc: `Submit detailed ingredient specs & formulation for "${prodName}" (#${appNum})`,
            buttonText: 'Fill Form',
            buttonBg: '#0284c7',
            isLink: true,
            link: `/initial-products/${ipId}/approval-form`,
            icon: <FileText size={16} />
          });
        } else if (ip.product_approval_form?.more_info_requested) {
          actionList.push({
            id: `initprod-info-${ipId}`,
            category: 'initial_products',
            app: { _id: ipId, application_number: appNum, establishment_name: prodName },
            type: 'navigate',
            title: 'Initial Product: Clarification Requested',
            tag: 'Reply Needed',
            desc: `Food Tech staff requested information for "${prodName}": ${ip.product_approval_form.more_info_message || 'Please provide updates.'}`,
            buttonText: 'Reply Now',
            buttonBg: '#d97706',
            isLink: true,
            link: `/initial-products/${ipId}/track`,
            icon: <AlertTriangle size={16} />
          });
        }
      }

      // Check if client is eligible to register their 1st Initial Product
      const eligibleForInitial = eligibleInitApps.filter(e => e.isEligible);
      for (const elApp of eligibleForInitial) {
        actionList.push({
          id: `initprod-eligible-${elApp._id || elApp.id}`,
          category: 'initial_products',
          app: elApp,
          type: 'navigate',
          title: 'Initial Product: Register Your 1st Product',
          tag: 'Product Setup',
          desc: `Initial fee confirmed for #${elApp.application_number} (${elApp.establishment_name || elApp.site_name || 'Site'}). Register your initial product.`,
          buttonText: 'Register Product',
          buttonBg: '#16a34a',
          isLink: true,
          link: `/initial-products?application_id=${elApp._id || elApp.id}`,
          icon: <Package size={16} />
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 3. ADD-ON APPLICATIONS: Actions
      // ─────────────────────────────────────────────────────────────
      for (const addon of allAddOns) {
        if (!addon) continue;
        const addonId = addon._id || addon.id;
        const productCount = addon.products?.length || 1;
        const addonNum = `ADDON-${String(addonId).slice(-6).toUpperCase()}`;

        if (addon.status === 'product_approval_form_enabled') {
          actionList.push({
            id: `addon-form-${addonId}`,
            category: 'addons',
            app: { _id: addonId, application_number: addonNum, establishment_name: `${productCount} Products` },
            type: 'navigate',
            title: 'Add-On Products: Complete Approval Form',
            tag: 'Add-On Form',
            desc: `Complete & submit ingredients and specifications for ${productCount} add-on item(s)`,
            buttonText: 'Fill Form',
            buttonBg: '#0284c7',
            isLink: true,
            link: `/addon-applications/${addonId}/approval-form`,
            icon: <Layers size={16} />
          });
        } else if (addon.product_approval_form?.more_info_requested) {
          actionList.push({
            id: `addon-info-${addonId}`,
            category: 'addons',
            app: { _id: addonId, application_number: addonNum, establishment_name: `${productCount} Products` },
            type: 'navigate',
            title: 'Add-On Products: Clarification Requested',
            tag: 'Reply Needed',
            desc: `Food Tech staff requested information on ${productCount} add-on product(s)`,
            buttonText: 'Reply Now',
            buttonBg: '#d97706',
            isLink: true,
            link: `/addon-applications/${addonId}/track`,
            icon: <AlertTriangle size={16} />
          });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 4. CERTIFICATES & SURVEILLANCE: Renewals & Annual Reviews
      // ─────────────────────────────────────────────────────────────
      for (const cert of allCerts) {
        if (!cert || cert.is_renewed || cert.status === 'renewed') continue;
        const siteName = cert.site_id?.name || cert.site_name || 'Manufacturing Site';
        const expTime = cert.expiry_date ? new Date(cert.expiry_date).getTime() : NaN;
        if (isNaN(expTime)) continue;

        const isExpired = cert.status === 'expired' || expTime < now;
        const isExpiringSoon = !isExpired && (expTime - now) <= threeMonthsInMs && cert.status === 'active';

        const hasRenewalApp = allApps.some(app => {
          const sId = typeof app.site_id === 'object' ? app.site_id?._id || app.site_id?.id : app.site_id;
          const certSiteId = typeof cert.site_id === 'object' ? cert.site_id?._id || cert.site_id?.id : cert.site_id;
          const isSameSite = String(sId || '') === String(certSiteId || '');
          const isRenewal = app.application_type === 'renewal';
          const isOngoing = !['rejected', 'certificate_issued'].includes(app.status?.toLowerCase());
          return isSameSite && isRenewal && isOngoing;
        });

        if (!hasRenewalApp) {
          if (isExpired) {
            actionList.push({
              id: `cert-expired-${cert._id || cert.id}`,
              category: 'certificates',
              app: { application_number: cert.certificate_number || 'CERT', establishment_name: siteName },
              type: 'navigate',
              title: 'Halal Certificate Expired: Renew Now',
              tag: 'Expired',
              desc: `Certificate #${cert.certificate_number || 'N/A'} for ${siteName} has expired. Submit a renewal application to maintain valid Halal certification.`,
              buttonText: 'Renew Now',
              buttonBg: '#dc2626',
              isLink: true,
              link: `/applications?type=renewal`,
              icon: <Award size={16} />
            });
          } else if (isExpiringSoon) {
            const daysRemaining = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
            actionList.push({
              id: `cert-expiring-${cert._id || cert.id}`,
              category: 'certificates',
              app: { application_number: cert.certificate_number || 'CERT', establishment_name: siteName },
              type: 'navigate',
              title: `Certificate Expiring in ${daysRemaining} Days`,
              tag: 'Renewal Due',
              desc: `Certificate #${cert.certificate_number || 'N/A'} for ${siteName} will expire on ${new Date(expTime).toLocaleDateString('en-GB')}. Begin renewal.`,
              buttonText: 'Renew Certificate',
              buttonBg: '#ea580c',
              isLink: true,
              link: `/applications?type=renewal`,
              icon: <Award size={16} />
            });
          }
        }
      }

      // GSO Surveillance Checks
      const gsoApps = allApps.filter(a => {
        if (!a) return false;
        const cat = (a.category || '').toLowerCase();
        const type = (a.application_type || '').toLowerCase();
        return cat.includes('gso') || cat.includes('uae') || type.includes('gso');
      });

      const gsoCerts = allCerts.filter(c => {
        if (!c) return false;
        const cat = (c.category || '').toLowerCase();
        const scope = (c.scope || '').toLowerCase();
        const scheme = (c.scheme || '').toLowerCase();
        return cat.includes('gso') || cat.includes('uae') || scope.includes('gso') || scheme.includes('gso');
      });

      const gsoSiteMap = new Map();
      gsoApps.forEach(a => {
        const sId = typeof a.site_id === 'object' ? a.site_id?._id || a.site_id?.id : a.site_id;
        if (!sId) return;
        const key = String(sId);
        const isCertified = a.status === 'certificate_issued' || a.has_certificate;
        const isOngoingSurveillance = a.application_type === 'surveillance' && !['certificate_issued', 'rejected'].includes(a.status?.toLowerCase());

        if (!gsoSiteMap.has(key)) {
          gsoSiteMap.set(key, {
            site_id: key,
            site_name: a.site_name || a.establishment_name || 'Manufacturing Site',
            created_at: a.created_at,
            certified: isCertified,
            hasOngoingSurveillance: isOngoingSurveillance,
            surveillanceCount: 0
          });
        } else {
          const existing = gsoSiteMap.get(key);
          if (isCertified) existing.certified = true;
          if (isOngoingSurveillance) existing.hasOngoingSurveillance = true;
        }
      });

      gsoCerts.forEach(c => {
        const sId = typeof c.site_id === 'object' ? c.site_id?._id || c.site_id?.id : c.site_id;
        if (!sId) return;
        const key = String(sId);
        if (gsoSiteMap.has(key)) {
          const existing = gsoSiteMap.get(key);
          existing.certified = true;
          existing.issue_date = c.issue_date;
        } else {
          gsoSiteMap.set(key, {
            site_id: key,
            site_name: c.site_name || 'Manufacturing Site',
            created_at: c.issue_date || c.created_at,
            certified: true,
            hasOngoingSurveillance: false,
            surveillanceCount: 0
          });
        }
      });

      allApps.forEach(a => {
        if (a.application_type === 'surveillance' && (a.status === 'certificate_issued' || a.status === 'ready_for_certificate')) {
          const sId = typeof a.site_id === 'object' ? a.site_id?._id || a.site_id?.id : a.site_id;
          if (sId && gsoSiteMap.has(String(sId))) {
            gsoSiteMap.get(String(sId)).surveillanceCount++;
          }
        }
      });

      gsoSiteMap.forEach(item => {
        const year = item.surveillanceCount >= 1 ? 2 : 1;
        const rawDate = item.issue_date || item.created_at;
        const parsedTime = rawDate ? new Date(rawDate).getTime() : NaN;
        const startDate = !isNaN(parsedTime) ? parsedTime : now;
        const elapsedMs = now - startDate;
        const elapsedYears = elapsedMs / oneYearInMs;

        const isDueForCycle = year === 1 ? (elapsedYears >= 0.75) : (elapsedYears >= 1.75);
        const needsSurveillance = item.certified && item.surveillanceCount < 2 && !item.hasOngoingSurveillance && isDueForCycle;

        if (needsSurveillance) {
          actionList.push({
            id: `gso-surv-${item.site_id}`,
            category: 'certificates',
            app: { application_number: `GSO-Y${year}`, establishment_name: item.site_name },
            type: 'navigate',
            title: `UAE/GSO Year ${year} Annual Surveillance Due`,
            tag: 'Surveillance',
            desc: `Year ${year} surveillance audit review is due for ${item.site_name}. Complete the annual surveillance submission.`,
            buttonText: 'Submit Surveillance',
            buttonBg: '#0284c7',
            isLink: true,
            link: '/applications?action=surveillance',
            icon: <ShieldCheck size={16} />
          });
        }
      });

      // ─────────────────────────────────────────────────────────────
      // 5. STANDALONE UNPAID INVOICES
      // ─────────────────────────────────────────────────────────────
      const standaloneUnpaidInvoices = allInvoices.filter(inv => {
        const isUnpaid = ['pending', 'issued', 'unpaid', 'invoice_sent'].includes((inv.status || '').toLowerCase());
        const isNotClientPaid = inv.status !== 'client_paid' && inv.status !== 'paid' && inv.status !== 'settled';
        const notHandled = !processedInvoiceIds.has(String(inv._id || inv.id));
        return isUnpaid && isNotClientPaid && notHandled;
      });

      for (const inv of standaloneUnpaidInvoices) {
        const isInit = inv.invoice_type === 'initial' || (inv.title && inv.title.toLowerCase().includes('initial'));
        const isFin = inv.invoice_type === 'final' || (inv.title && inv.title.toLowerCase().includes('final'));
        const invTitle = isInit ? 'Initial Invoice Sent: Payment Required' : (isFin ? 'Final Certification Invoice Due' : 'Outstanding Invoice Payment');
        const invTag = isInit ? 'Initial Invoice' : (isFin ? 'Final Invoice' : 'Payment Due');

        actionList.push({
          id: `inv-standalone-${inv._id || inv.id}`,
          category: 'invoices',
          app: { application_number: inv.invoice_number ? `INV-${inv.invoice_number}` : 'INVOICE', establishment_name: inv.title || 'Certification Invoice' },
          invoice: inv,
          type: 'payment',
          title: `${invTitle} (£${Number(inv.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })})`,
          tag: invTag,
          desc: `Invoice #${inv.invoice_number || 'N/A'} for £${Number(inv.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })} is awaiting payment.`,
          buttonText: 'Pay Invoice',
          buttonBg: '#ea580c',
          icon: <Receipt size={16} />
        });
      }

      setItems(actionList);

      // Auto-open modal once on initial load if items exist and not previously dismissed in this session
      const isDismissed = sessionStorage.getItem('client_actions_dismissed') === 'true';
      if (actionList.length > 0 && !isDismissed && !hasInitializedAutoOpen) {
        setIsOpen(true);
      }
      setHasInitializedAutoOpen(true);
    } catch (err) {
      console.error('Failed to fetch client action items:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hasInitializedAutoOpen]);

  useEffect(() => {
    fetchClientActions();
  }, [fetchClientActions]);

  const handleRefresh = () => {
    fetchClientActions();
    if (onActionCompleted) onActionCompleted();
  };

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('client_actions_dismissed', 'true');
  };

  const handleManualOpen = () => {
    setIsOpen(true);
  };

  // Filtered action items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      let matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      if (activeCategory === 'audits' && (item.category === 'applications' || item.category === 'audits')) {
        matchesCategory = true;
      }
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const appNum = String(item.app?.application_number || '').toLowerCase();
      const estName = String(item.app?.establishment_name || '').toLowerCase();
      const title = String(item.title || '').toLowerCase();
      const desc = String(item.desc || '').toLowerCase();
      return appNum.includes(q) || estName.includes(q) || title.includes(q) || desc.includes(q);
    });
  }, [items, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    return {
      all: items.length,
      proposals: items.filter(i => i.category === 'proposals').length,
      invoices: items.filter(i => i.category === 'invoices').length,
      initial_products: items.filter(i => i.category === 'initial_products').length,
      addons: items.filter(i => i.category === 'addons').length,
      audits: items.filter(i => i.category === 'audits' || i.category === 'applications').length,
      agreements: items.filter(i => i.category === 'agreements').length,
      certificates: items.filter(i => i.category === 'certificates').length,
    };
  }, [items]);

  if (loading && items.length === 0) return null;
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* ── Persistent Banner Trigger on Dashboard ── */}
      <div
        onClick={handleManualOpen}
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          border: '1.5px solid #bfdbfe',
          borderRadius: 16,
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(37,99,235,0.08)',
          transition: 'all 0.2s ease-in-out'
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.14)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(37,99,235,0.08)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 10 }}>
              Action Required
              <span style={{
                background: '#2563eb', color: 'white',
                borderRadius: 12, padding: '2px 10px',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.02em'
              }}>
                {items.length} {items.length === 1 ? 'Task' : 'Tasks'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 3, fontWeight: 500 }}>
              {items.length === 1 ? '1 task requires your immediate attention' : `${items.length} tasks require your immediate attention`} &middot; Click to review &amp; complete
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{
              gap: 8, fontWeight: 700, background: '#2563eb',
              borderColor: '#2563eb', padding: '9px 18px', borderRadius: 8,
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
            onClick={(e) => { e.stopPropagation(); handleManualOpen(); }}
          >
            View Action Items <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Pop-Up Modal ── */}
      {isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={handleDismiss}>
          <div
            className="modal"
            style={{
              maxWidth: 860, width: '95%', borderRadius: 16,
              padding: 0, overflow: 'hidden', maxHeight: '88vh',
              display: 'flex', flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Action Required
                    <span style={{ background: '#2563eb', color: 'white', borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 800 }}>
                      {items.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    Review and complete pending proposals, invoices, products, agreements, and audits
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="btn btn-ghost btn-sm"
                  title="Refresh Action Items"
                  style={{ color: '#475569', padding: '6px 10px', borderRadius: 8 }}
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  className="modal-close"
                  onClick={handleDismiss}
                  title="Close Modal"
                  style={{ padding: 6 }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div style={{ padding: '12px 24px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              {/* Category Pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Tasks', count: categoryCounts.all },
                  { id: 'proposals', label: 'Proposals', count: categoryCounts.proposals },
                  { id: 'invoices', label: 'Invoices & Payments', count: categoryCounts.invoices },
                  { id: 'initial_products', label: 'Initial Products', count: categoryCounts.initial_products },
                  { id: 'addons', label: 'Add-Ons', count: categoryCounts.addons },
                  { id: 'audits', label: 'Audits & NCs', count: categoryCounts.audits },
                  { id: 'agreements', label: 'Agreements', count: categoryCounts.agreements },
                  { id: 'certificates', label: 'Certificates & Renewals', count: categoryCounts.certificates },
                ].filter(cat => cat.id === 'all' || cat.count > 0 || ['proposals', 'invoices', 'initial_products', 'addons'].includes(cat.id)).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: '1px solid',
                      borderColor: activeCategory === cat.id ? '#2563eb' : '#e2e8f0',
                      background: activeCategory === cat.id ? '#eff6ff' : '#ffffff',
                      color: activeCategory === cat.id ? '#1d4ed8' : '#64748b',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>{cat.label}</span>
                    <span style={{
                      background: activeCategory === cat.id ? '#2563eb' : '#f1f5f9',
                      color: activeCategory === cat.id ? '#ffffff' : '#64748b',
                      borderRadius: 10,
                      padding: '1px 6px',
                      fontSize: 11,
                      fontWeight: 800
                    }}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick Search */}
              <div style={{ position: 'relative', minWidth: 180, flex: 1, maxWidth: 240 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ paddingLeft: 30, fontSize: 12, borderRadius: 8, height: 32 }}
                  placeholder="Filter task or #..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Action Items List */}
            <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {filteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <CheckCircle2 size={40} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                    {searchQuery ? 'No matching action items found' : 'All Caught Up!'}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    {searchQuery ? 'Try clearing your search keyword.' : 'You have completed all pending tasks for your certification.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'transform 0.15s ease, border-color 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                            {item.title}
                          </span>
                          <span style={{
                            background: '#f1f5f9', color: '#475569',
                            borderRadius: 6, padding: '2px 7px',
                            fontSize: 11.5, fontWeight: 700
                          }}>
                            #{item.app?.application_number || 'N/A'}
                          </span>
                          {item.tag && (
                            <span style={{
                              background: '#eff6ff', color: '#1d4ed8',
                              borderRadius: 6, padding: '2px 7px',
                              fontSize: 11, fontWeight: 700
                            }}>
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.4 }}>
                          {item.desc}
                        </div>
                      </div>

                      <div>
                        {item.isLink ? (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{
                              background: item.buttonBg || '#2563eb',
                              borderColor: item.buttonBg || '#2563eb',
                              gap: 6, fontWeight: 700,
                              padding: '8px 16px', borderRadius: 8
                            }}
                            onClick={() => {
                              handleDismiss();
                              navigate(item.link || '/applications');
                            }}
                          >
                            {item.icon} {item.buttonText} <ArrowRight size={14} />
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{
                              background: item.buttonBg || '#2563eb',
                              borderColor: item.buttonBg || '#2563eb',
                              gap: 6, fontWeight: 700,
                              padding: '8px 16px', borderRadius: 8
                            }}
                            onClick={() => {
                              setActiveModal({
                                type: item.type,
                                app: item.app,
                                invoice: item.invoice,
                                agreement: item.agreement,
                                audit: item.audit,
                                proposal: item.proposal
                              });
                            }}
                          >
                            {item.icon} {item.buttonText} <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> pending action {items.length === 1 ? 'item' : 'items'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleDismiss}
                  style={{ fontWeight: 600, color: '#64748b' }}
                >
                  Dismiss for this Session
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleDismiss}
                  style={{ fontWeight: 700 }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Client Modals Triggered Directly from Widget ── */}
      {activeModal?.type === 'proposal' && (
        <ClientProposalModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          proposal={activeModal.proposal}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'payment' && (
        <PaymentModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          invoice={activeModal.invoice}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'audit' && (
        <ClientAuditModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          audit={activeModal.audit}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'agreement' && (
        <ClientAgreementModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          agreement={activeModal.agreement}
          signatures={signatures}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
