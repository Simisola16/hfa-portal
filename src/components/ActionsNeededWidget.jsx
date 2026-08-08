import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, FileText, Receipt, Calendar, PenTool, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import ClientProposalModal from './ClientProposalModal';
import PaymentModal from './PaymentModal';
import ClientAuditModal from './ClientAuditModal';
import ClientAgreementModal from './ClientAgreementModal';

export default function ActionsNeededWidget({ onActionCompleted }) {
  const [apps, setApps] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [audits, setAudits] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active modal target
  const [activeModal, setActiveModal] = useState(null); // { type, app, invoice, agreement, audit }

  const fetchActionApps = useCallback(async () => {
    try {
      const [appRes, invRes, agRes, audRes, sigRes] = await Promise.all([
        api.get('/api/applications'),
        api.get('/api/invoices').catch(() => ({ data: [] })),
        api.get('/api/agreements').catch(() => ({ data: [] })),
        api.get('/api/audits').catch(() => ({ data: [] })),
        api.get('/api/signatures').catch(() => ({ data: [] }))
      ]);

      const allApps = appRes.data?.data || appRes.data || [];
      const allInvoices = invRes.data?.data || invRes.data || [];
      const allAgreements = agRes.data?.data || agRes.data || [];
      const allAudits = audRes.data?.data || audRes.data || [];
      const allSignatures = sigRes.data?.data || sigRes.data || [];

      setInvoices(allInvoices);
      setAgreements(allAgreements);
      setAudits(allAudits);
      setSignatures(allSignatures);

      const pendingApps = allApps.filter(app => [
        'proposal_sent',
        'invoice_sent',
        'dates_proposed',
        'on_hold',
        'agreement_sent',
        'final_invoice_sent'
      ].includes(app.status));

      setApps(pendingApps);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActionApps();
  }, [fetchActionApps]);

  const handleRefresh = () => {
    fetchActionApps();
    if (onActionCompleted) onActionCompleted();
  };

  const getActionConfig = (app) => {
    const appId = String(app._id || app.id);
    const linkedInvoice = invoices.find(inv => String(inv.application_id?._id || inv.application_id) === appId);
    const linkedAgreement = agreements.find(ag => String(ag.application_id?._id || ag.application_id) === appId);
    const linkedAudit = audits.find(aud => String(aud.application_id?._id || aud.application_id) === appId);

    switch (app.status) {
      case 'proposal_sent':
        return {
          icon: <FileText size={18} style={{ color: '#854d0e' }} />,
          bg: '#fef08a',
          badge: '#713f12',
          title: 'Proposal Received',
          desc: `Review certification proposal for ${app.establishment_name}`,
          buttonText: 'Review & Respond',
          buttonBg: '#854d0e',
          modalType: 'proposal'
        };
      case 'invoice_sent':
        return {
          icon: <Receipt size={18} style={{ color: '#ea580c' }} />,
          bg: '#ffedd5',
          badge: '#c2410c',
          title: 'Initial Invoice Payment Required',
          desc: `Pay initial certification fee for ${app.establishment_name}`,
          buttonText: 'Pay Invoice',
          buttonBg: '#ea580c',
          modalType: 'payment',
          invoice: linkedInvoice
        };
      case 'dates_proposed':
        return {
          icon: <Calendar size={18} style={{ color: '#0284c7' }} />,
          bg: '#e0f2fe',
          badge: '#075985',
          title: 'Select Audit Dates',
          desc: `Select 2 preferred audit dates for ${app.establishment_name}`,
          buttonText: 'Select Dates',
          buttonBg: '#0284c7',
          modalType: 'audit',
          audit: linkedAudit
        };
      case 'on_hold':
        return {
          icon: <AlertCircle size={18} style={{ color: '#dc2626' }} />,
          bg: '#fef2f2',
          badge: '#991b1b',
          title: 'Action Needed: NC Flagged',
          desc: `Submit corrective action report for ${app.establishment_name}`,
          buttonText: 'Upload Action',
          buttonBg: '#dc2626',
          modalType: 'audit',
          audit: linkedAudit
        };
      case 'agreement_sent':
        return {
          icon: <PenTool size={18} style={{ color: '#2563eb' }} />,
          bg: '#eff6ff',
          badge: '#1e40af',
          title: 'Certification Agreement Ready',
          desc: `Review & sign certification agreement for ${app.establishment_name}`,
          buttonText: 'Sign Agreement',
          buttonBg: '#2563eb',
          modalType: 'agreement',
          agreement: linkedAgreement
        };
      case 'final_invoice_sent':
        return {
          icon: <Receipt size={18} style={{ color: '#ea580c' }} />,
          bg: '#ffedd5',
          badge: '#c2410c',
          title: 'Final Invoice Payment Required',
          desc: `Pay final invoice fee for ${app.establishment_name}`,
          buttonText: 'Pay Final Invoice',
          buttonBg: '#ea580c',
          modalType: 'payment',
          invoice: linkedInvoice
        };
      default:
        return null;
    }
  };

  if (loading) return null;
  if (apps.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        background: 'linear-gradient(135deg, #fff, #f8fafc)',
        border: '1.5px solid #e2e8f0',
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={18} style={{ color: '#d97706' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Pending Actions Required ({apps.length})</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Complete these items directly without navigating away</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {apps.map(app => {
            const config = getActionConfig(app);
            if (!config) return null;

            return (
              <div
                key={app._id || app.id}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {config.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: config.badge }}>
                      {config.title} &middot; <span style={{ color: '#64748b', fontWeight: 600 }}>{app.site_name || app.establishment_name || 'Site'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                      {config.desc}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  style={{ background: config.buttonBg, borderColor: config.buttonBg, gap: 6, fontWeight: 700, padding: '8px 16px' }}
                  onClick={() => setActiveModal({
                    type: config.modalType,
                    app,
                    invoice: config.invoice,
                    agreement: config.agreement,
                    audit: config.audit
                  })}
                >
                  {config.buttonText} <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shared Modals Invoked Inline */}
      {activeModal?.type === 'proposal' && (
        <ClientProposalModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
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
