import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ClientAuditModal({ isOpen, onClose, audit: propAudit, app: propApp, appId: propAppId, onSuccess }) {
  const [audit, setAudit] = useState(propAudit || null);
  const [loading, setLoading] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [unavailable, setUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = propAppId || propApp?._id || propApp?.id || propAudit?.application_id;

  useEffect(() => {
    if (isOpen) {
      setSelectedDates([]);
      setUnavailable(false);

      if (!propAudit && targetAppId) {
        setLoading(true);
        api.get(`/api/audits/application/${targetAppId}`)
          .then(res => {
            const raw = res.data;
            if (!raw) { setAudit(null); return; }
            if (Array.isArray(raw)) {
              const active = raw.find(a => a.status === 'dates_proposed') || raw[0] || null;
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
            const active = list.find(a => a.status === 'dates_proposed' || a.status === 'on_hold') || list[0] || null;
            setAudit(active);
          })
          .catch(() => setAudit(null))
          .finally(() => setLoading(false));
      } else {
        setAudit(propAudit || null);
      }
    }
  }, [isOpen, propAudit, targetAppId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!audit) return;
    if (!unavailable && selectedDates.length !== 2) {
      toast.error('Please select exactly 2 dates, or check the unavailable option.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/audits/select-dates', {
        audit_id: audit._id || audit.id,
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

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500, padding: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>🗓️ Select Audit Dates</div>
          <button className="modal-close" onClick={onClose}><X size={20}/></button>
        </div>
        <div className="modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              Loading audit details...
            </div>
          ) : !audit ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>
              No audit details found for this application.
            </div>
          ) : (
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
        <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 24px' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={submitting || !audit || loading || (!unavailable && selectedDates.length !== 2)}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit Selection'}
          </button>
        </div>
      </div>
    </div>
  );
}
