import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Building2, Plus, Calendar, Clock, CheckCircle, XCircle, Users } from 'lucide-react';

const FacilityReservations = ({ showToast }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [facilities, setFacilities] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [bookModal, setBookModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);

  // New Facility Form
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    facility_code: '',
    location: '',
    capacity: 20,
    description: ''
  });

  // Booking Form
  const [form, setForm] = useState({
    facility_id: '',
    reservation_date: new Date().toISOString().split('T')[0],
    start_time: '18:00',
    end_time: '20:00',
    purpose: ''
  });

  const fetchData = async () => {
    try {
      const [fRes, rRes] = await Promise.all([
        API.get('/facilities'),
        API.get('/facilities/reservations')
      ]);

      if (fRes.data.success) setFacilities(fRes.data.facilities);
      if (rRes.data.success) setReservations(rRes.data.reservations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openBookModal = (fac) => {
    setSelectedFacility(fac);
    setForm({
      facility_id: fac.id,
      reservation_date: new Date().toISOString().split('T')[0],
      start_time: '18:00',
      end_time: '20:00',
      purpose: ''
    });
    setBookModal(true);
  };

  const handleCreateFacility = async (e) => {
    e.preventDefault();
    if (!facilityForm.name.trim() || !facilityForm.facility_code.trim() || !facilityForm.location.trim()) {
      showToast('error', 'Name, code, and location are required');
      return;
    }
    try {
      const res = await API.post('/facilities', facilityForm);
      if (res.data.success) {
        showToast('success', `Facility ${facilityForm.name} created successfully!`);
        setCreateModal(false);
        setFacilityForm({
          name: '',
          facility_code: '',
          location: '',
          capacity: 20,
          description: ''
        });
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create facility';
      showToast('error', msg);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/facilities/reserve', form);
      if (res.data.success) {
        showToast('success', res.data.message);
        setBookModal(false);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Slot booking failed';
      showToast('error', msg);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await API.put(`/facilities/reservations/${id}/status`, { status });
      if (res.data.success) {
        showToast('success', res.data.message);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Status update failed';
      showToast('error', msg);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hostel Facilities & Slot Reservations</h1>
          <p className="page-subtitle">Reserve study centers, sports courts, and common spaces with collision detection</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setFacilityForm({
                name: '',
                facility_code: '',
                location: '',
                capacity: 20,
                description: ''
              });
              setCreateModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> Create Facility
          </button>
        )}
      </div>

      {/* Facilities Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {facilities.map((f) => (
          <div key={f.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-info">{f.facility_code}</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Capacity: {f.capacity}</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '6px' }}>{f.name}</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4, marginBottom: '14px' }}>
                {f.description}
              </p>
              <div style={{ fontSize: '0.78rem', color: '#0d9488', fontWeight: '600' }}>
                📍 {f.location}
              </div>
            </div>

            <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => openBookModal(f)} className="btn btn-primary" style={{ width: '100%' }}>
                <Calendar size={15} /> Reserve Slot
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reservations Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0f172a' }}>
            Reservation Schedule & Requests
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>Resident Student</th>
              <th>Date</th>
              <th>Reserved Slot</th>
              <th>Purpose</th>
              <th>Status</th>
              {isAdmin && <th>Admin Action</th>}
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? "7" : "6"} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No reservations logged yet.
                </td>
              </tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{r.facility_name}</div>
                  </td>
                  <td>{r.resident_name}</td>
                  <td>{r.reservation_date}</td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#0d9488' }}>
                      <Clock size={13} /> {r.start_time} - {r.end_time}
                    </div>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{r.purpose}</td>
                  <td>
                    <span className={`badge ${
                      r.status === 'approved' ? 'badge-success' : 
                      r.status === 'pending' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleStatusUpdate(r.id, 'approved')}
                            className="btn btn-primary btn-sm"
                            title="Approve Slot"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(r.id, 'rejected')}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#e11d48' }}
                            title="Reject Slot"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Facility Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Add Campus / Hostel Facility"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateFacility}>
          <div className="form-group">
            <label className="form-label">Facility Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Badminton Court A / Central Reading Hall"
              required
              value={facilityForm.name}
              onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Facility Code *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. BADM-01"
                required
                value={facilityForm.facility_code}
                onChange={(e) => setFacilityForm({ ...facilityForm, facility_code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Capacity (Max Persons) *</label>
              <input
                type="number"
                className="form-control"
                min="1"
                required
                value={facilityForm.capacity}
                onChange={(e) => setFacilityForm({ ...facilityForm, capacity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location / Landmark *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Ground Floor, Sports Complex / Block B Basement"
              required
              value={facilityForm.location}
              onChange={(e) => setFacilityForm({ ...facilityForm, location: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Operating Rules</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Describe facility equipment, booking duration guidelines, open timings..."
              value={facilityForm.description}
              onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setCreateModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Facility
            </button>
          </div>
        </form>
      </Modal>

      {/* Book Facility Modal */}
      <Modal
        isOpen={bookModal}
        onClose={() => setBookModal(false)}
        title={`Book ${selectedFacility?.name}`}
        maxWidth="500px"
      >
        <form onSubmit={handleBookingSubmit}>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.85rem' }}>
            <div>Location: <strong>{selectedFacility?.location}</strong></div>
            <div>Capacity: <strong>{selectedFacility?.capacity} Persons</strong></div>
          </div>

          <div className="form-group">
            <label className="form-label">Reservation Date *</label>
            <input
              type="date"
              className="form-control"
              required
              min={new Date().toISOString().split('T')[0]}
              value={form.reservation_date}
              onChange={(e) => setForm({ ...form, reservation_date: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input
                type="time"
                className="form-control"
                required
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input
                type="time"
                className="form-control"
                required
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Purpose / Event Details *</label>
            <textarea
              className="form-control"
              rows="3"
              required
              placeholder="e.g. Group study for semester exams, Badminton practice match..."
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setBookModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Reservation Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FacilityReservations;
