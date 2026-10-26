import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { Wrench, CheckCircle, Clock, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

const StaffDashboard = ({ showToast }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState('in_progress');
  const [workNotes, setWorkNotes] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStaffComplaints = async () => {
    try {
      const res = await API.get('/maintenance');
      if (res.data.success) {
        setComplaints(res.data.requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffComplaints();
  }, []);

  const openUpdateModal = (c) => {
    setSelectedComplaint(c);
    setNewStatus(c.status);
    setWorkNotes('');
    setModalOpen(true);
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      const res = await API.put(`/maintenance/${selectedComplaint.id}/status`, {
        status: newStatus,
        work_notes: workNotes
      });

      if (res.data.success) {
        showToast('success', `Complaint #${selectedComplaint.id} marked as ${newStatus}!`);
        setModalOpen(false);
        fetchStaffComplaints();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update complaint status';
      showToast('error', msg);
    }
  };

  const myAssigned = complaints.filter(c => c.assigned_to === user?.id || !c.assigned_to);
  const inProgress = myAssigned.filter(c => c.status === 'in_progress').length;
  const pending = myAssigned.filter(c => c.status === 'pending').length;
  const resolved = myAssigned.filter(c => c.status === 'resolved').length;

  const filteredList = myAssigned.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Staff Workstation</h1>
          <p className="page-subtitle">Logged in as {user?.username} &bull; Manage assigned repair and infrastructure tasks</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard
          title="Total Assigned"
          value={myAssigned.length}
          subtext="Active & historical tasks"
          icon={Wrench}
          color="teal"
        />
        <StatCard
          title="In Progress"
          value={inProgress}
          subtext="Actively being worked on"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Pending Attention"
          value={pending}
          subtext="Requires inspection"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Resolved by Me"
          value={resolved}
          subtext="Completed jobs"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Complaints Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>Filter Tasks:</span>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Issue Title</th>
              <th>Category</th>
              <th>Room & Block</th>
              <th>Resident</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No complaints match the current filter.
                </td>
              </tr>
            ) : (
              filteredList.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '700' }}>#{c.id}</td>
                  <td>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{c.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{c.description}</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{c.category}</span>
                  </td>
                  <td>Room {c.room_number} ({c.hostel_name})</td>
                  <td>{c.resident_name}</td>
                  <td>
                    <span className={`badge ${
                      c.priority === 'emergency' || c.priority === 'high' ? 'badge-danger' : 
                      c.priority === 'medium' ? 'badge-warning' : 'badge-neutral'
                    }`}>
                      {c.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      c.status === 'resolved' ? 'badge-success' : 
                      c.status === 'in_progress' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => openUpdateModal(c)}
                      className="btn btn-secondary btn-sm"
                    >
                      Update Notes / Status
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Update Complaint Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Update Complaint #${selectedComplaint?.id}`}
        maxWidth="520px"
      >
        {selectedComplaint && (
          <form onSubmit={handleStatusUpdate}>
            <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '10px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{selectedComplaint.title}</div>
              <div style={{ color: '#64748b', marginTop: '2px' }}>{selectedComplaint.description}</div>
              <div style={{ color: '#0d9488', marginTop: '6px', fontWeight: '600' }}>
                Room {selectedComplaint.room_number} &bull; Resident: {selectedComplaint.resident_name}
              </div>
            </div>

            {selectedComplaint.work_notes && (
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Previous Work Notes:</label>
                <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', fontSize: '0.78rem', whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>
                  {selectedComplaint.work_notes}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Update Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="form-control"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Add Work / Resolution Notes</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Describe actions taken, replaced parts, or inspection details..."
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Status & Notes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default StaffDashboard;
