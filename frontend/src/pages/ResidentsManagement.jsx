import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Search, UserPlus, Eye, UserX, BedDouble, Phone, Mail, BookOpen } from 'lucide-react';

const ResidentsManagement = ({ showToast }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [residentHistory, setResidentHistory] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: 'Student@123',
    full_name: '',
    enrollment_no: '',
    phone: '',
    emergency_contact: '',
    parent_name: '',
    parent_phone: '',
    address: '',
    blood_group: 'O+',
    course: 'B.Tech CSE',
    branch: 'Computer Science & Engineering',
    year_of_study: 1,
    gender: 'male'
  });

  // Edit resident modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    username: '',
    email: '',
    full_name: '',
    enrollment_no: '',
    phone: '',
    emergency_contact: '',
    parent_name: '',
    parent_phone: '',
    address: '',
    blood_group: 'O+',
    course: '',
    branch: '',
    year_of_study: 1,
    gender: 'male'
  });

  const handleOpenEdit = (resident) => {
    setEditFormData({
      id: resident.id,
      username: resident.username || '',
      email: resident.email || '',
      full_name: resident.full_name || '',
      enrollment_no: resident.enrollment_no || '',
      phone: resident.phone || '',
      emergency_contact: resident.emergency_contact || '',
      parent_name: resident.parent_name || '',
      parent_phone: resident.parent_phone || '',
      address: resident.address || '',
      blood_group: resident.blood_group || 'O+',
      course: resident.course || '',
      branch: resident.branch || '',
      year_of_study: resident.year_of_study || 1,
      gender: resident.gender || 'male'
    });
    setEditModalOpen(true);
  };

  const handleUpdateResident = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put(`/residents/${editFormData.id}`, editFormData);
      if (res.data.success) {
        showToast('success', 'Resident updated successfully!');
        setEditModalOpen(false);
        fetchResidents();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update resident';
      showToast('error', msg);
    }
  };

  const fetchResidents = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await API.get('/residents', { params });
      if (res.data.success) {
        setResidents(res.data.residents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, [search, statusFilter]);

  const handleOpenAdd = () => {
    setFormData({
      username: '',
      email: '',
      password: 'Student@123',
      full_name: '',
      enrollment_no: `SRU${Date.now().toString().slice(-6)}`,
      phone: '',
      emergency_contact: '',
      parent_name: '',
      parent_phone: '',
      address: '',
      blood_group: 'O+',
      course: 'B.Tech CSE',
      branch: 'Computer Science & Engineering',
      year_of_study: 1,
      gender: 'male'
    });
    setAddModalOpen(true);
  };

  const handleCreateResident = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/residents', formData);
      if (res.data.success) {
        showToast('success', 'Resident registered successfully!');
        setAddModalOpen(false);
        fetchResidents();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create resident';
      showToast('error', msg);
    }
  };

  const handleViewResident = async (r) => {
    setSelectedResident(r);
    setViewModalOpen(true);
    try {
      const res = await API.get(`/residents/${r.id}/history`);
      if (res.data.success) {
        setResidentHistory(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}? This will vacate any active room assignment.`)) {
      return;
    }
    try {
      const res = await API.delete(`/residents/${id}`);
      if (res.data.success) {
        showToast('success', `${name} deactivated successfully.`);
        fetchResidents();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to deactivate resident';
      showToast('error', msg);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Resident Profile Directory</h1>
          <p className="page-subtitle">Manage student enrollment, personal profiles, and room assignments</p>
        </div>
        {isAdmin && (
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <UserPlus size={16} /> Register New Resident
          </button>
        )}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by name, enrollment, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Resident Name</th>
              <th>Enrollment No</th>
              <th>Program & Year</th>
              <th>Allocated Room</th>
              <th>Contact Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {residents.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No residents found matching your query.
                </td>
              </tr>
            ) : (
              residents.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{r.full_name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{r.email}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{r.enrollment_no}</td>
                  <td>
                    <div>{r.course}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Year {r.year_of_study}</div>
                  </td>
                  <td>
                    {r.current_room ? (
                      <span className="badge badge-info" style={{ gap: '4px' }}>
                        <BedDouble size={13} /> Room {r.current_room.room_number} ({r.current_room.bed_number})
                      </span>
                    ) : (
                      <span className="badge badge-warning">Unallocated</span>
                    )}
                  </td>
                  <td>{r.phone}</td>
                  <td>
                    <span className={`badge ${r.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => handleViewResident(r)}
                        className="btn btn-secondary btn-sm"
                        title="View Full Profile"
                      >
                        <Eye size={14} /> View
                      </button>
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleOpenEdit(r)}
                            className="btn btn-primary btn-sm"
                            title="Edit Resident"
                          >
                            <UserPlus size={14} /> Edit
                          </button>
                          {r.status === 'active' && (
                            <button 
                              onClick={() => handleDeactivate(r.id, r.full_name)}
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#e11d48' }}
                              title="Deactivate Resident"
                            >
                              <UserX size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Resident Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Resident"
        maxWidth="680px"
      >
        <form onSubmit={handleUpdateResident}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Enrollment Number *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editFormData.enrollment_no}
                onChange={(e) => setEditFormData({ ...editFormData, enrollment_no: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Portal Username *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editFormData.username}
                onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Institutional Email *</label>
              <input
                type="email"
                className="form-control"
                required
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact Phone *</label>
              <input
                type="tel"
                className="form-control"
                required
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact Phone *</label>
              <input
                type="tel"
                className="form-control"
                required
                value={editFormData.emergency_contact}
                onChange={(e) => setEditFormData({ ...editFormData, emergency_contact: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Program / Degree</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.course}
                onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Branch / Department</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.branch}
                onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Year of Study</label>
              <select
                className="form-control"
                value={editFormData.year_of_study}
                onChange={(e) => setEditFormData({ ...editFormData, year_of_study: parseInt(e.target.value) })}
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-control"
                value={editFormData.gender}
                onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select
                className="form-control"
                value={editFormData.blood_group}
                onChange={(e) => setEditFormData({ ...editFormData, blood_group: e.target.value })}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Parent / Guardian Name</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.parent_name}
                onChange={(e) => setEditFormData({ ...editFormData, parent_name: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Parent Phone</label>
              <input
                type="tel"
                className="form-control"
                value={editFormData.parent_phone}
                onChange={(e) => setEditFormData({ ...editFormData, parent_phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Permanent Residential Address</label>
              <textarea
                className="form-control"
                rows="2"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Resident Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Resident Student"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateResident}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Enrollment Number *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.enrollment_no}
                onChange={(e) => setFormData({ ...formData, enrollment_no: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Portal Username *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Institutional Email *</label>
              <input
                type="email"
                className="form-control"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact Phone *</label>
              <input
                type="tel"
                className="form-control"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact Phone *</label>
              <input
                type="tel"
                className="form-control"
                required
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Program / Degree</label>
              <input
                type="text"
                className="form-control"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Branch / Department</label>
              <input
                type="text"
                className="form-control"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Year of Study</label>
              <select
                className="form-control"
                value={formData.year_of_study}
                onChange={(e) => setFormData({ ...formData, year_of_study: parseInt(e.target.value) })}
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-control"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select
                className="form-control"
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Parent / Guardian Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parent Phone</label>
              <input
                type="tel"
                className="form-control"
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Permanent Residential Address</label>
            <textarea
              className="form-control"
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={() => setAddModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Register Resident
            </button>
          </div>
        </form>
      </Modal>

      {/* View Resident Profile Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Resident Comprehensive Profile"
        maxWidth="640px"
      >
        {selectedResident && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: '800'
              }}>
                {selectedResident.full_name[0]}
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#0f172a' }}>{selectedResident.full_name}</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Enrollment: <strong>{selectedResident.enrollment_no}</strong> &bull; {selectedResident.course}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '20px 0', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Allocated Room:</span>
                <div style={{ fontWeight: '700', color: '#0d9488' }}>
                  {selectedResident.current_room ? `Room ${selectedResident.current_room.room_number} (${selectedResident.current_room.hostel_name})` : 'Unallocated'}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Year & Branch:</span>
                <div>Year {selectedResident.year_of_study} - {selectedResident.branch}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Phone:</span>
                <div>{selectedResident.phone}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Emergency Contact:</span>
                <div>{selectedResident.emergency_contact}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Parent / Guardian:</span>
                <div>{selectedResident.parent_name || 'N/A'} ({selectedResident.parent_phone || 'N/A'})</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Blood Group / Gender:</span>
                <div>{selectedResident.blood_group} / {selectedResident.gender}</div>
              </div>
            </div>

            {/* Room Allocation History */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.92rem', marginBottom: '8px', color: '#0f172a' }}>Room Allocations</h4>
              {residentHistory?.allocations?.length > 0 ? (
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem' }}>
                  {residentHistory.allocations.map((a) => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>Room {a.room_number} ({a.hostel_name})</span>
                      <span className={`badge ${a.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                        {a.status} (From: {a.start_date})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No room allocation records.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setViewModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ResidentsManagement;
