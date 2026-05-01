import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Award, Download, Search, RefreshCw, Eye } from 'lucide-react';

export default function CertificatesPage() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/api/certificates').then(d => setCerts(d.data || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const filtered = certs.filter(c =>
    !search || c.certificate_number?.toLowerCase().includes(search.toLowerCase()) || c.certificate_type?.toLowerCase().includes(search.toLowerCase())
  );

  const isExpiringSoon = (expiry) => {
    if (!expiry) return false;
    const diff = new Date(expiry) - new Date();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000; // within 60 days
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search certificates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); api.get('/api/certificates').then(d => setCerts(d.data || [])).finally(() => setLoading(false)); }}><RefreshCw size={14} /></button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">My Certificates ({filtered.length})</div>
          <div className="card-subtitle">Active and historical halal certificates</div>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Award /></div>
                <div className="empty-state-title">No Certificates Found</div>
                <div className="empty-state-text">Your certificates will appear here once issued by HFA</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Certificate No.</th><th>Type</th><th>Site</th>
                    <th>Issue Date</th><th>Expiry Date</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(cert => (
                    <tr key={cert.id || cert._id}>
                      <td style={{ fontWeight: 700 }}>{cert.certificate_number}</td>
                      <td>{cert.certificate_type}</td>
                      <td>{cert.sites?.name || '—'}</td>
                      <td>{cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : '—'}</td>
                      <td>
                        <span style={{ color: isExpiringSoon(cert.expiry_date) ? 'var(--warning)' : 'inherit' }}>
                          {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : '—'}
                        </span>
                        {isExpiringSoon(cert.expiry_date) && <span className="badge badge-orange" style={{ marginLeft: 6, fontSize: 10 }}>Expiring Soon</span>}
                      </td>
                      <td>
                        <span className={`badge ${cert.status === 'active' ? 'badge-green' : cert.status === 'revoked' ? 'badge-red' : 'badge-gray'}`}>
                          {cert.status}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        {cert.status === 'active' && (
                          <a href={`${api.defaults?.baseURL || ''}/api/certificates/${cert.id || cert._id}/download`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                            <Download size={13} /> Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </div>
  );
}
