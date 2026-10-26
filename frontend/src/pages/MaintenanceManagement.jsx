import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Wrench, Plus, UserPlus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const MaintenanceManagement = ({ showToast }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  const [requests, setRequests] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [newModal, setNewModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [activeReq, setActiveReq] = useState(null);

  // Forms
  const [form, setForm] = useState({
    category: 'plumbing',
    title: '',
    description: '',
    priority: 'medium'
  });

  const [assigneeId, setAssigneeId] = useState('');
  const [updatedStatus, setUpdatedStatus] = useState('in_progress');
  const [workNotes, setWorkNotes] = useState('');

  const fetchData = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await API.get('/maintenance', { params });
      if (res.data.success) {
        setRequests(res.data.requests);
      }

      if (isAdmin) {
        setStaffLoading(true);
        setStaffError('');
        try {
          const staffRes = await API.get('/auth/users', { params: { role: 'staff' } });
          if (staffRes.data && staffRes.data.success && Array.isArray(staffRes.data.users)) {
            setStaffUsers(staffRes.data.users);
          } else {
            setStaffUsers([]);
          }
        } catch (staffErr) {
          console.error('Error fetching staff accounts:', staffErr);
          setStaffError(staffErr.response?.data?.message || 'Failed to load staff accounts');
        } finally {
          setStaffLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/maintenance', form);
      if (res.data.success) {
        showToast('success', 'Maintenance complaint lodged successfully!');
        setNewModal(false);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit request';
      showToast('error', msg);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!activeReq || !assigneeId) return;

    try {
      const res = await API.put(`/maintenance/${activeReq.id}/assign`, { assigned_to: parseInt(assigneeId) });
      if (res.data.success) {
        showToast('success', res.data.message);
        setAssignModal(false);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!activeReq) return;

    try {
      const res = await API.put(`/maintenance/${activeReq.id}/status`, {
        status: updatedStatus,
        work_notes: workNotes
      });
      if (res.data.success) {
        showToast('success', 'Complaint status & work notes updated!');
        setStatusModal(false);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance & Complaints Management</h1>
          <p className="page-subtitle">Report infrastructure defects, track staff dispatch, and record resolution times</p>
        </div>
        <button 
          onClick={() => {
            setForm({
              category: 'plumbing',
              title: '',
              description: '',
              priority: 'medium'
            });
            setNewModal(true);
          }} 
          className="btn btn-primary"
        >
          <Plus size={16} /> File New Complaint
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="wifi">Wi-Fi & Internet</option>
              <option value="cleaning">Housekeeping</option>
              <option value="carpentry">Carpentry</option>
              <option value="furniture">Furniture</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Issue Details</th>
              <th>Room & Block</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Assigned Staff</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No maintenance requests match current filter.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: '700' }}>#{r.id}</td>
                  <td>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{r.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.description}</div>
                    {r.work_notes && (
                      <div style={{ fontSize: '0.72rem', color: '#0d9488', marginTop: '4px', fontStyle: 'italic' }}>
                        Note: {r.work_notes.split('\n').pop()}
                      </div>
                    )}
                  </td>
                  <td>
                    <div>Room {r.room_number}</div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{r.hostel_name}</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{r.category}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      r.priority === 'emergency' || r.priority === 'high' ? 'badge-danger' : 
                      r.priority === 'medium' ? 'badge-warning' : 'badge-neutral'
                    }`}>
                      {r.priority}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{r.assignee_name}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      r.status === 'resolved' ? 'badge-success' : 
                      r.status === 'in_progress' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setActiveReq(r);
                            setAssigneeId(r.assigned_to || (staffUsers[0]?.id || ''));
                            setAssignModal(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          title="Assign Staff"
                        >
                          <UserPlus size={13} /> Assign
                        </button>
                      )}
                      {(isAdmin || isStaff) && (
                        <button
                          onClick={() => {
                            setActiveReq(r);
                            setUpdatedStatus(r.status);
                            setWorkNotes('');
                            setStatusModal(true);
                          }}
                          className="btn btn-primary btn-sm"
                          title="Update Status"
                        >
                          Update
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

      {/* Lodge Complaint Modal */}
      <Modal
        isOpen={newModal}
        onClose={() => setNewModal(false)}
        title="Lodge Maintenance & Repair Complaint"
        maxWidth="520px"
      >
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-control"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="plumbing">Plumbing (Water, Taps, Leakage)</option>
                <option value="electrical">Electrical (Lights, Fans, Power)</option>
                <option value="wifi">Wi-Fi & Internet</option>
                <option value="cleaning">Cleaning & Sanitation</option>
                <option value="carpentry">Carpentry & Doors</option>
                <option value="furniture">Bed, Table, Cupboard</option>
                <option value="other">Other Infrastructure</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                className="form-control"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low (Cosmetic/Minor)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="high">High (Disruptive)</option>
                <option value="emergency">Emergency (Immediate Hazard)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Issue Summary / Title *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Washroom tap not closing tightly"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Description *</label>
            <textarea
              className="form-control"
              rows="3"
              required
              placeholder="Provide exact details of where and when the issue occurs..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setNewModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Complaint
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Staff Modal */}
      <Modal
        isOpen={assignModal}
        onClose={() => setAssignModal(false)}
        title={`Assign Staff to Complaint #${activeReq?.id}`}
        maxWidth="460px"
      >
        <form onSubmit={handleAssign}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
            <strong>{activeReq?.title}</strong>
            <div style={{ color: '#64748b' }}>Room: {activeReq?.room_number} ({activeReq?.hostel_name})</div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Staff Member *</label>
            {staffLoading ? (
              <div style={{ padding: '8px 0', fontSize: '0.85rem', color: '#64748b' }}>
                Loading staff members...
              </div>
            ) : staffError ? (
              <div style={{ padding: '8px 0', fontSize: '0.85rem', color: '#ef4444' }}>
                {staffError}
              </div>
            ) : staffUsers.length === 0 ? (
              <div style={{ padding: '8px 0', fontSize: '0.85rem', color: '#d97706' }}>
                No active staff accounts found. Register a staff user first.
              </div>
            ) : (
              <select
                className="form-control"
                required
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">-- Choose Staff Personnel --</option>
                {staffUsers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.username} ({s.email || 'Staff Member'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setAssignModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={staffLoading || staffUsers.length === 0}
            >
              Assign Staff
            </button>
          </div>
        </form>
      </Modal>

      {/* Status & Work Notes Modal */}
      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        title={`Update Complaint #${activeReq?.id}`}
        maxWidth="500px"
      >
        <form onSubmit={handleStatusUpdate}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={updatedStatus}
              onChange={(e) => setUpdatedStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Add Work / Diagnostic Notes</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Describe work completed, parts replaced, or inspection comments..."
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setStatusModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Status
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MaintenanceManagement;
