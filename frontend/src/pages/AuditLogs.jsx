import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Search, Filter, RefreshCw, AlertTriangle, Clock, User, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const AuditLogs = ({ showToast }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 25;

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        per_page: perPage
      };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;

      const res = await API.get('/audit', { params });
      if (res.data && res.data.success) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Audit log fetch error:', err);
      const msg = err.response?.data?.message || 'Failed to fetch audit trails';
      setError(msg);
      if (showToast) showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [page, actionFilter, entityFilter]);

  if (!isAdmin) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', margin: '40px auto', maxWidth: '600px' }}>
        <AlertTriangle size={48} color="#e11d48" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
          Access Restricted
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Audit logs contain security-sensitive administrative records and can only be accessed by system administrators.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / perPage) || 1;

  const getActionBadgeClass = (action) => {
    if (!action) return 'badge-neutral';
    const a = action.toUpperCase();
    if (a.includes('CREATE') || a.includes('REGISTER') || a.includes('ALLOCATE')) return 'badge-success';
    if (a.includes('UPDATE') || a.includes('TRANSFER') || a.includes('PASSWORD')) return 'badge-info';
    if (a.includes('DELETE') || a.includes('DEACTIVATE') || a.includes('VACATE')) return 'badge-danger';
    if (a.includes('LOGIN')) return 'badge-warning';
    return 'badge-neutral';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={28} color="#0d9488" /> System Security & Audit Trails
          </h1>
          <p className="page-subtitle">
            Immutable tracking of administrative actions, room allocations, security events, and user activity
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="btn btn-secondary"
          disabled={loading}
          title="Refresh Log Feed"
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '32px', height: '38px' }}
                placeholder="Search action keyword..."
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
              />
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
            </div>

            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="">All Resource Entities</option>
              <option value="users">Users & Accounts</option>
              <option value="residents">Residents</option>
              <option value="hostels">Hostels</option>
              <option value="rooms">Rooms</option>
              <option value="room_allocations">Room Allocations</option>
              <option value="fees">Fee Records</option>
              <option value="maintenance">Maintenance</option>
              <option value="facilities">Facilities</option>
              <option value="visitors">Visitors</option>
              <option value="utilities">Utilities</option>
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
            Total Audit Records: <span style={{ color: '#0d9488', fontWeight: '800' }}>{total}</span>
          </div>
        </div>

        {error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={32} style={{ marginBottom: '8px' }} />
            <div>{error}</div>
            <button onClick={fetchAuditLogs} className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>
              Retry Fetch
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
            <div>Retrieving encrypted audit trails...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No audit records match the selected filter criteria.
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '170px' }}>Timestamp</th>
                  <th style={{ width: '160px' }}>Actor User</th>
                  <th style={{ width: '180px' }}>Action Type</th>
                  <th style={{ width: '140px' }}>Target Entity</th>
                  <th>Safe Activity Details</th>
                  <th style={{ width: '130px' }}>Client IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} color="#94a3b8" />
                        {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }) : 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} color="#0d9488" />
                        <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.88rem' }}>
                          {log.username || 'System'}
                        </span>
                      </div>
                      {log.user_role && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>
                          {log.user_role}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.82rem', 
                        color: '#2563eb', 
                        background: '#eff6ff', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#334155', maxWidth: '350px' }}>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {log.details || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc'
              }}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-secondary btn-sm"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
