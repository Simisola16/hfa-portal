import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Plus, Search, RefreshCw, Calendar,
  Building2, MapPin, CheckCircle, Clock, X, ChevronRight,
  AlertCircle, ShieldCheck, Phone, Mail, User, Info, ArrowRight, Award
} from 'lucide-react';

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: Clock },
  under_review: { label: 'Under Review', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: Clock },
  logsheet_created: { label: 'Under Review', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: Clock },
  waiting_signature: { label: 'Under Review', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: Clock },
  extension_approved: { label: 'Extension Certificate Approved', bg: '#dcfce7', color: '#166534', border: '#bbf7d0', icon: CheckCircle },
  rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b', border: '#fecaca', icon: AlertCircle }
};

export default function ExtensionApplicationPage() {
  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const navigate = useNavigate();

  const [apps, setApps] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    site_id: '',
    site_name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, sitesRes] = await Promise.all([
        api.get('/api/extension-applications').catch(() => ({ data: { data: [] } })),
        api.get('/api/sites').catch(() => ({ data: [] }))
      ]);

      const loadedApps = Array.isArray(appsRes.data?.data)
        ? appsRes.data.data
        : (Array.isArray(appsRes.data) ? appsRes.data : []);
      const loadedSites = Array.isArray(sitesRes.data)
        ? sitesRes.data
        : (Array.isArray(sitesRes) ? sitesRes : []);

      setApps(loadedApps);
      setSites(loadedSites);
    } catch (err) {
      console.error('Failed to load extension applications:', err);
      toast.error('Failed to load extension applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewModal = () => {
    setForm({
      site_id: sites.length > 0 ? (sites[0]._id || sites[0].id) : '',
      site_name: sites.length > 0 ? (sites[0].name || sites[0].establishment_name || '') : '',
      contact_person: currentUser?.full_name || currentUser?.name || '',
      contact_email: currentUser?.email || '',
      contact_phone: currentUser?.phone || '',
      description: ''
    });
    setShowModal(true);
  };

  const handleSiteSelect = (e) => {
    const selectedId = e.target.value;
    if (selectedId === 'other') {
      setForm(f => ({ ...f, site_id: '', site_name: '' }));
    } else {
      const site = sites.find(s => String(s._id || s.id) === String(selectedId));
      setForm(f => ({
        ...f,
        site_id: selectedId,
        site_name: site?.name || site?.establishment_name || ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.site_name.trim()) return toast.error('Please enter the Site Name.');
    if (!form.contact_person.trim()) return toast.error('Please enter the Contact Person.');
    if (!form.contact_email.trim()) return toast.error('Please enter the Contact Email.');
    if (!form.contact_phone.trim()) return toast.error('Please enter the Contact Number.');
    if (!form.description.trim()) return toast.error('Please enter the reason / description for the extension.');

    setSubmitting(true);
    try {
      const res = await api.post('/api/extension-applications', form);
      toast.success('Extension application submitted successfully!');
      setShowModal(false);
      fetchData();
      const newAppId = res.data?.data?._id;
      if (newAppId) {
        navigate(`/extension-applications/${newAppId}/track`);
      }
    } catch (err) {
      console.error('Submission error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to submit extension application.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = !search ||
      (app.application_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.site_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.description || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'under_review' && ['submitted', 'under_review', 'logsheet_created', 'waiting_signature'].includes(app.status)) ||
      app.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40, fontFamily: 'Inter, "Segoe UI", sans-serif' }}>
      
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Certificate Extension Applications
            </h1>
            <span style={{ background: '#ecfdf5', color: '#059669', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
              Extension Flow
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 4, margin: 0 }}>
            Request an extension for your facility Halal certificate and track your application progress in real time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'white', border: '1px solid #e2e8f0', color: '#475569',
              padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openNewModal}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#008744', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 18px', fontWeight: 600,
              fontSize: 13.5, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,135,68,0.2)'
            }}
          >
            <Plus size={16} />
            Request Extension
          </button>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Site, Application #, Contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8,
                border: '1px solid #d1d5db', fontSize: 13, outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'extension_approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                border: filterStatus === tab.id ? '1px solid #008744' : '1px solid #e2e8f0',
                background: filterStatus === tab.id ? '#ecfdf5' : 'white',
                color: filterStatus === tab.id ? '#008744' : '#64748b',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Applications Table ── */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #dcfce7', borderTop: '3px solid #008744', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: 13.5 }}>Loading extension applications...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FileText size={44} color="#cbd5e1" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              No Extension Applications Found
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 420, margin: '0 auto 18px' }}>
              {search || filterStatus !== 'all'
                ? 'No requests match your search criteria.'
                : 'Need more time for your Halal certification cycle? Submit an extension request below.'}
            </p>
            <button
              onClick={openNewModal}
              style={{
                background: '#008744', color: 'white', border: 'none',
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Submit Extension Request
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>App #</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Site Name</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Details</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submitted</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((a) => {
                  const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.submitted;
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={a._id}
                      onClick={() => navigate(`/extension-applications/${a._id}/track`)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#008744', whiteSpace: 'nowrap' }}>
                        {a.application_number}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{a.site_name}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{a.contact_person}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{a.contact_email} • {a.contact_phone}</div>
                      </td>
                      <td style={{ padding: '14px 18px', maxWidth: 260 }}>
                        <div style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.description}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                          padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700
                        }}>
                          <Icon size={12} />
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/extension-applications/${a._id}/track`);
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0',
                            padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer'
                          }}
                        >
                          Track <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Request Extension Modal ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: 'white', borderRadius: 16, width: '100%', maxWidth: 580,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#008744', color: 'white', padding: '18px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Request Certificate Extension</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, opacity: 0.9 }}>Provide details for your Halal certificate extension</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Site Selection */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Site Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {sites.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select
                      value={form.site_id || (form.site_name && !form.site_id ? 'other' : '')}
                      onChange={handleSiteSelect}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 13, background: 'white'
                      }}
                    >
                      {sites.map(s => (
                        <option key={s._id || s.id} value={s._id || s.id}>
                          {s.name || s.establishment_name}
                        </option>
                      ))}
                      <option value="other">-- Other / Enter Custom Site Name --</option>
                    </select>

                    {(!form.site_id || form.site_id === 'other') && (
                      <input
                        type="text"
                        placeholder="Enter site name..."
                        value={form.site_name}
                        onChange={(e) => setForm(f => ({ ...f, site_name: e.target.value }))}
                        required
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #d1d5db', fontSize: 13
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Main Production Facility"
                    value={form.site_name}
                    onChange={(e) => setForm(f => ({ ...f, site_name: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1px solid #d1d5db', fontSize: 13
                    }}
                  />
                )}
              </div>

              {/* Contact Person */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Contact Person <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Full name of contact person"
                    value={form.contact_person}
                    onChange={(e) => setForm(f => ({ ...f, contact_person: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
                      border: '1px solid #d1d5db', fontSize: 13
                    }}
                  />
                </div>
              </div>

              {/* Contact Email & Contact Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Contact Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      placeholder="contact@company.com"
                      value={form.contact_email}
                      onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value }))}
                      required
                      style={{
                        width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 13
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Contact Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="tel"
                      placeholder="+44 20 1234 5678"
                      value={form.contact_phone}
                      onChange={(e) => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                      required
                      style={{
                        width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 13
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Description / Justification for Extension <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Please state the reason for requesting an extension and any relevant operational context..."
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical'
                  }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '9px 16px', borderRadius: 8, border: '1px solid #d1d5db',
                    background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 20px', borderRadius: 8, border: 'none',
                    background: '#008744', color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Extension Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
