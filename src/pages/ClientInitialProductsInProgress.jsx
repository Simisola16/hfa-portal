import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Package, Clock, Search, RefreshCw, ChevronRight, CheckCircle,
  AlertCircle, Building2, User, FileText, ArrowRight, ShieldCheck,
  Sparkles, ExternalLink, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', bg: '#fef3c7', color: '#92400e', border: '#fde68a', step: 1 },
  ft_assigned: { label: 'FT Assigned', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', step: 2 },
  product_approval_form_enabled: { label: 'Product Form Enabled (Action Required)', bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff', step: 3 },
  all_forms_received: { label: 'Product Form Received', bg: '#ccfbf1', color: '#115e59', border: '#99f6e4', step: 3 },
  logsheet_created: { label: 'Under Committee Review', bg: '#e0f2fe', color: '#075985', border: '#bae6fd', step: 4 },
  waiting_sharia_signature: { label: 'Under Committee Review', bg: '#ffedd5', color: '#9a3412', border: '#fed7aa', step: 4 },
  initial_product_approved: { label: 'Initial Product Approved 🎉', bg: '#dcfce7', color: '#166534', border: '#bbf7d0', step: 5 }
};

export default function ClientInitialProductsInProgress() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/initial-products');
      const loaded = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setProducts(loaded);
    } catch (err) {
      toast.error('Failed to load Initial Products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const filtered = products.filter(p => {
    const pName = p.product?.name || '';
    const pCode = p.product?.code || '';
    const appNum = p.application_id?.application_number || '';
    const siteName = p.site_id?.name || p.application_id?.site_name || '';

    const matchSearch = !search ||
      pName.toLowerCase().includes(search.toLowerCase()) ||
      pCode.toLowerCase().includes(search.toLowerCase()) ||
      appNum.toLowerCase().includes(search.toLowerCase()) ||
      siteName.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'inprogress' ? p.status !== 'initial_product_approved' : p.status === statusFilter);

    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              In-Progress Initial Products
            </h1>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Track live evaluation milestones for your registered Initial Products
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fetchProducts}
            title="Refresh list"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/initial-products')}
            style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Package size={15} /> Register Initial Product
          </button>
        </div>
      </div>

      {/* Toolbar Filters */}
      <div className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            placeholder="Search by product name, code, application #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control w-auto"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          <option value="all">All Statuses ({products.length})</option>
          <option value="inprogress">In-Progress ({products.filter(p => p.status !== 'initial_product_approved').length})</option>
          <option value="submitted">Submitted</option>
          <option value="ft_assigned">FT Assigned</option>
          <option value="product_approval_form_enabled">Form Enabled</option>
          <option value="all_forms_received">Form Received</option>
          <option value="waiting_sharia_signature">Under Committee Review</option>
          <option value="initial_product_approved">Approved ({products.filter(p => p.status === 'initial_product_approved').length})</option>
        </select>
      </div>

      {/* List / Cards */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Loading Initial Products...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ margin: '0 auto 12px', width: 54, height: 54, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={28} color="#94a3b8" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            No Initial Products Found
          </div>
          <div style={{ fontSize: 13, color: '#64748b', maxWidth: 440, margin: '0 auto 18px', lineHeight: 1.5 }}>
            {search || statusFilter !== 'all'
              ? 'No records match your active search or filter criteria.'
              : 'You have not registered any Initial Products yet. Initial Product registration unlocks after your Initial Certification Invoice is confirmed.'}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/initial-products')}
            style={{ background: '#059669', borderColor: '#059669', margin: '0 auto', fontSize: 13, fontWeight: 700 }}
          >
            Register Initial Product
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(item => {
            const conf = STATUS_CONFIG[item.status] || { label: item.status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', step: 1 };
            const isApproved = item.status === 'initial_product_approved';
            const isActionNeeded = item.status === 'product_approval_form_enabled';
            const siteName = item.site_id?.name || item.application_id?.site_name || item.application_id?.establishment_name || 'Main Facility';
            const ftNames = [
              ...(item.assigned_food_techs || []).map(ft => ft.full_name || ft.email),
              item.assigned_ft_custom?.name || item.assigned_ft_details
            ].filter(Boolean);

            return (
              <div
                key={item._id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: isActionNeeded ? '2px solid #a855f7' : isApproved ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                  boxShadow: isActionNeeded ? '0 4px 20px rgba(168, 85, 247, 0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                {isActionNeeded && (
                  <div style={{ background: 'linear-gradient(135deg, #7e22ce 0%, #9333ea 100%)', color: '#fff', padding: '6px 18px', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={14} /> Action Required: Product Approval Form is ready for completion
                    </span>
                    <button
                      onClick={() => navigate(`/initial-products/${item._id}/approval-form`)}
                      style={{ background: '#fff', color: '#7e22ce', border: 'none', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                    >
                      Fill Form Now &rarr;
                    </button>
                  </div>
                )}

                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  {/* Left Column: Product Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 260 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: isApproved ? '#dcfce7' : '#f0fdf4', border: `1.5px solid ${isApproved ? '#86efac' : '#bbf7d0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={24} style={{ color: isApproved ? '#16a34a' : '#059669' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {item.product?.name}
                        </h3>
                        {item.product?.code && (
                          <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 7px', borderRadius: 5, color: '#475569', fontWeight: 600 }}>
                            {item.product.code}
                          </span>
                        )}
                        <span style={{ fontSize: 11, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`, padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                          {conf.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 12.5, color: '#64748b', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={13} style={{ color: '#059669' }} />
                          <strong>{siteName}</strong>
                        </span>
                        {item.application_id?.application_number && (
                          <span>App: <strong>#{item.application_id.application_number}</strong></span>
                        )}
                        {ftNames.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0284c7' }}>
                            <User size={13} />
                            FT: <strong>{ftNames.join(', ')}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Stage Progress & Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
                        Milestone {conf.step} of 5
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: conf.color }}>
                        {conf.label}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate(`/initial-products/${item._id}/track`)}
                      style={{
                        background: isApproved ? 'linear-gradient(135deg, #15803d 0%, #166534 100%)' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        borderColor: '#059669',
                        padding: '9px 18px',
                        fontSize: 13,
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      Track Progress <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
