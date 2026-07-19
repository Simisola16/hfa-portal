import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ClientAuditModal({ isOpen, onClose, audit, onSuccess }) {
  const [selectedDates, setSelectedDates] = useState([]);
  const [unavailable, setUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedDates([]);
      setUnavailable(false);
    }
  }, [isOpen]);

  if (!isOpen || !audit) return null;

  const handleSubmit = async () => {
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
      onSuccess();
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
        <div className="modal-body" style={{ padding: '24px' }}>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
            The Admin has proposed the following 3 dates for your upcoming audit. Please select <strong>exactly 2 dates</strong> that you are available, or indicate that you are not available on any of these days.
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
        </div>
        <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 24px' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={submitting || (!unavailable && selectedDates.length !== 2)}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit Selection'}
          </button>
        </div>
      </div>
    </div>
  );
}
