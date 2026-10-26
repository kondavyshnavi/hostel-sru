import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import QRModal from '../components/QRModal';
import { UserCheck, Plus, QrCode, CheckCircle, XCircle, LogIn, LogOut, Clock } from 'lucide-react';

const VisitorManagement = ({ showToast }) => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  const [visitors, setVisitors] = useState([]);
  const [residents, setResidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [regModal, setRegModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [activeVisitor, setActiveVisitor] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_phone: '',
    visitor_id_proof: 'Govt Aadhaar / PAN',
    relationship: 'Parent / Family',
    purpose: '',
    visit_date: new Date().toISOString().split('T')[0],
    expected_time: '04:00 PM',
    resident_id: ''
  });

  const fetchData = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [vRes, rRes] = await Promise.all([
        API.get('/visitors', { params }),
        isAdminOrStaff ? API.get('/residents?status=active') : Promise.resolve({ data: { success: false } })
      ]);

      if (vRes.data.success) setVisitors(vRes.data.visitors);
      if (rRes.data.success) setResidents(rRes.data.residents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/visitors', formData);
      if (res.data.success) {
        showToast('success', res.data.message);
        setRegModal(false);
        fetchData();
        // Show generated pass
        setActiveVisitor(res.data.visitor);
        setQrModal(true);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to register visitor';
      showToast('error', msg);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await API.put(`/visitors/${id}/approve`);
      if (res.data.success) {
        showToast('success', 'Visitor pass approved!');
        fetchData();
      }
    } catch (err) {
      showToast('error', 'Failed to approve visitor');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      const res = await API.put(`/visitors/${id}/reject`, { reason });
      if (res.data.success) {
        showToast('info', 'Visitor pass rejected.');
        fetchData();
      }
    } catch (err) {
      showToast('error', 'Failed to reject visitor');
    }
  };

  const handleCheckIn = async (passCode) => {
    try {
      const res = await API.post('/visitors/check-in', { pass_code: passCode });
      if (res.data.success) {
        showToast('success', res.data.message);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async (passCode) => {
    try {
      const res = await API.post('/visitors/check-out', { pass_code: passCode });
      if (res.data.success) {
        showToast('success', res.data.message);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Check-out failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Visitor Gate Pass Management</h1>
          <p className="page-subtitle">Pre-register visitors, verify QR passes at campus security, and track check-in/out</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              visitor_name: '',
              visitor_phone: '',
              visitor_id_proof: 'Govt Aadhaar / PAN',
              relationship: 'Parent / Family',
              purpose: '',
              visit_date: new Date().toISOString().split('T')[0],
              expected_time: '04:00 PM',
              resident_id: residents.length > 0 ? residents[0].id : ''
            });
            setRegModal(true);
          }} 
          className="btn btn-primary"
        >
          <Plus size={16} /> Register Visitor
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Pass Statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="checked_in">Currently Checked-In</option>
              <option value="checked_out">Checked-Out</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Pass Code</th>
              <th>Visitor Name</th>
              <th>Host Resident</th>
              <th>Purpose & Relationship</th>
              <th>Visit Date & Time</th>
              <th>Actual Check-In/Out</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visitors.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No visitor passes found.
                </td>
              </tr>
            ) : (
              visitors.map((v) => (
                <tr key={v.id}>
                  <td>
                    <button
                      onClick={() => {
                        setActiveVisitor(v);
                        setQrModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontFamily: 'monospace', fontWeight: '700', gap: '4px' }}
                    >
                      <QrCode size={13} color="#0d9488" /> {v.pass_code}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{v.visitor_name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{v.visitor_phone}</div>
                  </td>
                  <td>{v.resident_name}</td>
                  <td>
                    <div>{v.relationship}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{v.purpose}</div>
                  </td>
                  <td>
                    <div>{v.visit_date}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{v.expected_time}</div>
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>
                    {v.actual_check_in ? (
                      <div style={{ color: '#059669' }}>
                        In: {new Date(v.actual_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : (
                      <div style={{ color: '#94a3b8' }}>Not arrived</div>
                    )}
                    {v.actual_check_out && (
                      <div style={{ color: '#64748b' }}>
                        Out: {new Date(v.actual_check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      v.status === 'approved' ? 'badge-success' : 
                      v.status === 'checked_in' ? 'badge-info' : 
                      v.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isAdminOrStaff && v.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(v.id)}
                            className="btn btn-primary btn-sm"
                            title="Approve Pass"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(v.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#e11d48' }}
                            title="Reject Pass"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {isAdminOrStaff && v.status === 'approved' && (
                        <button
                          onClick={() => handleCheckIn(v.pass_code)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#059669' }}
                          title="Record Check-in"
                        >
                          <LogIn size={14} /> Check In
                        </button>
                      )}
                      {isAdminOrStaff && v.status === 'checked_in' && (
                        <button
                          onClick={() => handleCheckOut(v.pass_code)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#d97706' }}
                          title="Record Check-out"
                        >
                          <LogOut size={14} /> Check Out
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Register Visitor Modal */}
      <Modal
        isOpen={regModal}
        onClose={() => setRegModal(false)}
        title="Visitor Registration & Gate Pass Request"
        maxWidth="540px"
      >
        <form onSubmit={handleRegister}>
          {isAdminOrStaff && (
            <div className="form-group">
              <label className="form-label">Resident Being Visited *</label>
              <select
                className="form-control"
                required
                value={formData.resident_id}
                onChange={(e) => setFormData({ ...formData, resident_id: e.target.value })}
              >
                <option value="">-- Choose Host Resident --</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.full_name} ({r.enrollment_no})</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Visitor Full Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.visitor_name}
                onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Visitor Contact Phone *</label>
              <input
                type="tel"
                className="form-control"
                required
                value={formData.visitor_phone}
                onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Relationship with Resident *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Mother, Father, Guardian, Friend"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Govt ID Proof Type</label>
              <input
                type="text"
                className="form-control"
                value={formData.visitor_id_proof}
                onChange={(e) => setFormData({ ...formData, visitor_id_proof: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Expected Date of Visit *</label>
              <input
                type="date"
                className="form-control"
                required
                value={formData.visit_date}
                onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expected Arrival Time</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 03:30 PM"
                value={formData.expected_time}
                onChange={(e) => setFormData({ ...formData, expected_time: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Purpose of Visit *</label>
            <textarea
              className="form-control"
              rows="2"
              required
              placeholder="State the purpose of the visit..."
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setRegModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Generate Visitor Pass
            </button>
          </div>
        </form>
      </Modal>

      {/* QR Pass Modal */}
      <QRModal
        isOpen={qrModal}
        onClose={() => setQrModal(false)}
        title="Official Visitor Campus Entry Pass"
        subtitle={`Visitor: ${activeVisitor?.visitor_name} | Visiting: ${activeVisitor?.resident_name}`}
        qrDataUri={activeVisitor?.qr_code_path}
        footerNote={`Pass Code: ${activeVisitor?.pass_code} | Date: ${activeVisitor?.visit_date} | Status: ${activeVisitor?.status?.toUpperCase()}`}
      />
    </div>
  );
};

export default VisitorManagement;
