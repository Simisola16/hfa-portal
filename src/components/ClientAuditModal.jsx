import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, AlertCircle, Upload, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function ClientAuditModal({ 
  isOpen, 
  onClose, 
  audit: propAudit, 
  app: propApp, 
  appId: propAppId, 
  mode: propMode = 'select_dates',
  reportId: propReportId,
  onSuccess 
}) {
  const [audit, setAudit] = useState(propAudit || null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(propMode);
  
  // Date Selection State
  const [selectedDates, setSelectedDates] = useState([]);
  const [unavailable, setUnavailable] = useState(false);
  
  // NC Upload State
  const [responseText, setResponseText] = useState('');
  const [ncFile, setNcFile] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propAudit?.application_id);

  useEffect(() => {
    if (isOpen) {
      setSelectedDates([]);
      setUnavailable(false);
      setResponseText('');
      setNcFile(null);
      setMode(propMode);

      if (!propAudit && targetAppId) {
        setLoading(true);
        api.get(`/api/audits/application/${targetAppId}`)
          .then(res => {
            const raw = res.data;
            if (!raw) { setAudit(null); return; }
            if (Array.isArray(raw)) {
              const active = raw.find(a => a.status === 'dates_proposed' || a.nc_reports?.some(n => n.status === 'flagged')) || raw[0] || null;
              setAudit(active);
            } else {
              setAudit(raw);
            }
          })
          .catch(() => setAudit(null))
          .finally(() => setLoading(false));
      } else if (!propAudit && !targetAppId) {
        setLoading(true);
        api.get('/api/audits')
          .then(res => {
            const list = res.data?.data || res.data || [];
            const active = list.find(a => a.status === 'dates_proposed' || a.nc_reports?.some(n => n.status === 'flagged')) || list[0] || null;
            setAudit(active);
          })
          .catch(() => setAudit(null))
          .finally(() => setLoading(false));
      } else {
        setAudit(propAudit || null);
      }
    }
  }, [isOpen, propAudit, targetAppId, propMode]);

  if (!isOpen) return null;

  const activeNcReport = audit?.nc_reports?.find(r => r._id === propReportId || r.id === propReportId) ||
    audit?.nc_reports?.find(r => r.status === 'flagged') ||
    audit?.nc_reports?.[0];

  const handleSubmitDates = async () => {
    if (!audit) return;
    if (!unavailable && selectedDates.length !== 2) {
      toast.error('Please select exactly 2 dates, or check the unavailable option.');
      return;
    }
    setSubmitting(true);
    try {
      const auditId = getCleanId(audit._id || audit.id || audit);
      await api.post('/api/audits/select-dates', {
        audit_id: auditId,
        selected_dates: selectedDates,
        unavailable
      });
      toast.success(unavailable ? 'Admin notified. Waiting for new dates.' : 'Dates confirmed successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit selection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitNc = async () => {
    if (!audit) return;
    if (!responseText.trim() && !ncFile) {
      toast.error('Please provide a corrective action explanation or upload a supporting document.');
      return;
    }
    setSubmitting(true);
    try {
      const auditId = getCleanId(audit._id || audit.id || audit);
      const repId = activeNcReport ? getCleanId(activeNcReport._id || activeNcReport.id) : '';

      const formData = new FormData();
      formData.append('audit_id', auditId);
      if (repId) formData.append('report_id', repId);
      if (responseText.trim()) formData.append('response_text', responseText.trim());
      if (ncFile) formData.append('correction_document', ncFile);

      await api.post('/api/audits/resolve-nc', formData, true);
      toast.success('NC Correction submitted successfully! HFA Admin has been notified.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit NC correction.');
    } finally {
      setSubmitting(false);
    }
  };

  const isNcMode = mode === 'nc_upload';

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540, padding: 0 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ background: isNcMode ? '#fef2f2' : '#f8fafc', borderBottom: `1px solid ${isNcMode ? '#fecaca' : '#e2e8f0'}`, padding: '20px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: isNcMode ? '#991b1b' : '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isNcMode ? <AlertCircle size={20} color="#dc2626" /> : <Calendar size={20} color="var(--primary)" />}
            {isNcMode ? 'Submit Non-Conformity (NC) Correction' : 'Select Audit Dates'}
          </div>
          <button className="modal-close" onClick={onClose}><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              Loading audit details...
            </div>
          ) : !audit ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>
              No audit details found for this application.
            </div>
          ) : isNcMode ? (
            /* ── NC CORRECTION UPLOAD UI ── */
            <div>
              {activeNcReport ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#991b1b', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Auditor Flagged Findings
                  </div>
                  <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5, marginBottom: activeNcReport.document_url ? 10 : 0 }}>
                    {activeNcReport.text || 'Non-Conformity report flagged.'}
                  </div>
                  {activeNcReport.document_url && activeNcReport.document_url !== '#' && (
                    <a
                      href={getPdfUrl(activeNcReport.document_url)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <FileText size={13} /> View Auditor Attachment
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                  Corrective action response for audit findings.
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Corrective Action Details / Explanation <span>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Describe the actions taken to rectify the flagged Non-Conformity..."
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Supporting Evidence / Document <span>(Optional)</span>
                </label>
                <div
                  onClick={() => document.getElementById('nc-file-input-shared').click()}
                  style={{
                    border: '2px dashed #cbd5e1', padding: '20px', borderRadius: '12px',
                    textAlign: 'center', cursor: 'pointer', background: ncFile ? '#f0fdf4' : '#f8fafc',
                    borderColor: ncFile ? '#16a34a' : '#cbd5e1', transition: 'all 0.2s'
                  }}
                >
                  <Upload size={28} style={{ color: ncFile ? '#16a34a' : '#94a3b8', margin: '0 auto 8px' }} />
                  {ncFile ? (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>{ncFile.name}</div>
                      <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>{(ncFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>Click to select proof file (PDF, PNG, JPG)</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Attach photo, report, or proof document</div>
                    </div>
                  )}
                  <input
                    type="file"
                    id="nc-file-input-shared"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={e => setNcFile(e.target.files[0] || null)}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ── AUDIT DATE SELECTION UI ── */
            <>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
                The Admin has proposed the following dates for your upcoming audit. Please select <strong>exactly 2 dates</strong> that you are available, or indicate that you are not available on any of these days.
              </p>

              <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                {audit.proposed_dates?.map((d, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: unavailable ? 'not-allowed' : 'pointer', opacity: unavailable ? 0.6 : 1 }}>
                    <input
                      type="checkbox"
                      disabled={unavailable}
                      checked={selectedDates.includes(d)}
                      onChange={e => {
                        let newDates = [...selectedDates];
                        if (e.target.checked) {
                          if (newDates.length < 2) newDates.push(d);
                          else toast.error('You can only select exactly 2 dates.');
                        } else {
                          newDates = newDates.filter(x => x !== d);
                        }
                        setSelectedDates(newDates);
                      }}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{new Date(d).toDateString()}</span>
                  </label>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={unavailable}
                  onChange={e => {
                    setUnavailable(e.target.checked);
                    if (e.target.checked) setSelectedDates([]);
                  }}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>I am not available on any of these days</span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          {isNcMode ? (
            <button
              className="btn"
              style={{ background: '#dc2626', color: '#fff', fontWeight: 700 }}
              disabled={submitting || !audit || loading || (!responseText.trim() && !ncFile)}
              onClick={handleSubmitNc}
            >
              {submitting ? 'Submitting...' : 'Submit NC Correction'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={submitting || !audit || loading || (!unavailable && selectedDates.length !== 2)}
              onClick={handleSubmitDates}
            >
              {submitting ? 'Submitting...' : 'Confirm Date Selection'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
