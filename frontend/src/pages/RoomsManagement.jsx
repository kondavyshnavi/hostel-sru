import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Users, ArrowRightLeft, LogOut, Building2 } from 'lucide-react';

const RoomsManagement = ({ showToast }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [unallocatedResidents, setUnallocatedResidents] = useState([]);
  const [activeResidents, setActiveResidents] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [addRoomModal, setAddRoomModal] = useState(false);
  const [addHostelModal, setAddHostelModal] = useState(false);
  const [allocateModal, setAllocateModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Forms
  const [hostelForm, setHostelForm] = useState({
    name: '',
    code: '',
    type: 'boys',
    total_floors: 3,
    warden_name: '',
    warden_contact: '',
    address: ''
  });

  const [roomForm, setRoomForm] = useState({
    hostel_id: '',
    room_number: '',
    floor: 1,
    room_type: 'double',
    capacity: 2,
    base_fee: 30000
  });

  const [allocateForm, setAllocateForm] = useState({
    resident_id: '',
    room_id: '',
    bed_number: 'Bed-1',
    remarks: 'Regular semester allocation'
  });

  const [transferForm, setTransferForm] = useState({
    resident_id: '',
    new_room_id: '',
    new_bed: 'Bed-1',
    reason: ''
  });

  const fetchData = async () => {
    try {
      const params = {};
      if (selectedHostel) params.hostel_id = selectedHostel;
      if (selectedStatus) params.status = selectedStatus;

      const [rRes, hRes, resList] = await Promise.all([
        API.get('/rooms', { params }),
        API.get('/hostels'),
        API.get('/residents?status=active')
      ]);

      if (rRes.data.success) setRooms(rRes.data.rooms);
      if (hRes.data.success) setHostels(hRes.data.hostels);
      if (resList.data.success) {
        const allActives = resList.data.residents;
        // filter unallocated residents
        const unalloc = allActives.filter(r => !r.current_room);
        setUnallocatedResidents(unalloc);
        // filter allocated residents (those eligible for transfer or vacate)
        const allocated = allActives.filter(r => !!r.current_room);
        setActiveResidents(allocated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedHostel, selectedStatus]);

  const handleCreateHostel = async (e) => {
    e.preventDefault();
    if (!hostelForm.name.trim() || !hostelForm.code.trim()) {
      showToast('error', 'Hostel name and code are required');
      return;
    }
    try {
      const res = await API.post('/hostels', hostelForm);
      if (res.data.success) {
        showToast('success', `Hostel Block ${hostelForm.name} created successfully!`);
        setAddHostelModal(false);
        setHostelForm({
          name: '',
          code: '',
          type: 'boys',
          total_floors: 3,
          warden_name: '',
          warden_contact: '',
          address: ''
        });
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create hostel';
      showToast('error', msg);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/rooms', roomForm);
      if (res.data.success) {
        showToast('success', `Room ${roomForm.room_number} created successfully!`);
        setAddRoomModal(false);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create room';
      showToast('error', msg);
    }
  };

  const openAllocateModal = (room) => {
    setSelectedRoom(room);
    setAllocateForm({
      resident_id: unallocatedResidents.length > 0 ? unallocatedResidents[0].id : '',
      room_id: room.id,
      bed_number: `Bed-${room.current_occupancy + 1}`,
      remarks: 'Allocated by warden'
    });
    setAllocateModal(true);
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/rooms/allocate', allocateForm);
      if (res.data.success) {
        showToast('success', res.data.message);
        setAllocateModal(false);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Room allocation failed';
      showToast('error', msg);
    }
  };

  const openTransferModal = (preselectedResidentId = '') => {
    const defaultRes = preselectedResidentId || (activeResidents.length > 0 ? activeResidents[0].id : '');
    const availableRooms = rooms.filter(r => r.status === 'available' && r.current_occupancy < r.capacity);
    setTransferForm({
      resident_id: defaultRes,
      new_room_id: availableRooms.length > 0 ? availableRooms[0].id : '',
      new_bed: 'Bed-1',
      reason: 'Mutual agreement / room change'
    });
    setTransferModal(true);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.resident_id || !transferForm.new_room_id) {
      showToast('error', 'Please select resident and target room');
      return;
    }

    try {
      const res = await API.post('/rooms/transfer', transferForm);
      if (res.data.success) {
        showToast('success', res.data.message || 'Room transferred successfully');
        setTransferModal(false);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Transfer failed';
      showToast('error', msg);
    }
  };

  const handleVacate = async (resident) => {
    if (!resident) return;
    const roomNum = resident.current_room?.room_number || 'current room';
    if (!window.confirm(`Are you sure you want to vacate ${resident.full_name} from Room ${roomNum}? This will free up the bed.`)) {
      return;
    }

    try {
      const res = await API.post('/rooms/vacate', {
        resident_id: resident.id,
        reason: 'Vacated by administrator'
      });
      if (res.data.success) {
        showToast('success', res.data.message || 'Room vacated successfully');
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Vacate operation failed';
      showToast('error', msg);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hostel Rooms & Allocations</h1>
          <p className="page-subtitle">Track room occupancy, bed allocations, and prevent over-capacity</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => {
                setRoomForm({
                  hostel_id: hostels.length > 0 ? hostels[0].id : '',
                  room_number: '',
                  floor: 1,
                  room_type: 'double',
                  capacity: 2,
                  base_fee: 30000
                });
                setAddRoomModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={16} /> Add Room
            </button>
            <button 
              onClick={() => {
                setHostelForm({
                  name: '',
                  code: '',
                  type: 'boys',
                  total_floors: 3,
                  warden_name: '',
                  warden_contact: '',
                  address: ''
                });
                setAddHostelModal(true);
              }}
              className="btn btn-secondary"
            >
              <Building2 size={16} /> Add Hostel/Block
            </button>
            <button 
              onClick={() => openTransferModal()}
              className="btn btn-secondary"
              disabled={activeResidents.length === 0}
            >
              <ArrowRightLeft size={16} /> Transfer Bed
            </button>
          </div>
        )}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
              className="filter-select"
            >
              <option value="">All Hostel Blocks</option>
              {hostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="available">Available (Has Vacancy)</option>
              <option value="occupied">Fully Occupied</option>
              <option value="maintenance">Under Maintenance</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
            <div>
              Unallocated: <span style={{ color: '#0d9488', fontWeight: '800' }}>{unallocatedResidents.length}</span>
            </div>
            <div>
              Allocated: <span style={{ color: '#2563eb', fontWeight: '800' }}>{activeResidents.length}</span>
            </div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Room Number</th>
              <th>Hostel Block</th>
              <th>Floor & Type</th>
              <th>Capacity & Occupancy</th>
              <th>Semester Fee</th>
              <th>Status</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? "7" : "6"} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No rooms found matching filters.
                </td>
              </tr>
            ) : (
              rooms.map((r) => {
                const isFull = r.current_occupancy >= r.capacity;
                // find active occupants in this room
                const roomOccupants = activeResidents.filter(res => res.current_room && res.current_room.room_id === r.id);
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>
                        Room {r.room_number}
                      </div>
                    </td>
                    <td>{r.hostel_name}</td>
                    <td>
                      <div>Floor {r.floor}</div>
                      <span className="badge badge-neutral" style={{ textTransform: 'capitalize', marginTop: '2px' }}>
                        {r.room_type}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          fontWeight: '700', 
                          color: isFull ? '#e11d48' : '#059669' 
                        }}>
                          {r.current_occupancy} / {r.capacity} Beds
                        </div>
                        {/* Visual Progress bar */}
                        <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${Math.min(100, (r.current_occupancy / r.capacity) * 100)}%`, 
                            height: '100%', 
                            background: isFull ? '#e11d48' : '#0d9488' 
                          }} />
                        </div>
                      </div>
                      {roomOccupants.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#475569' }}>
                          {roomOccupants.map((occ, idx) => (
                            <span key={occ.id} style={{ display: 'inline-block', marginRight: '6px' }}>
                              👤 {occ.full_name}{idx < roomOccupants.length - 1 ? ',' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: '600', color: '#0f172a' }}>
                      ₹{r.base_fee?.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${
                        r.status === 'occupied' ? 'badge-danger' : 
                        r.status === 'available' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {!isFull && r.status !== 'maintenance' && (
                            <button
                              onClick={() => openAllocateModal(r)}
                              className="btn btn-primary btn-sm"
                              title="Allocate Student"
                            >
                              <Users size={14} /> Allocate
                            </button>
                          )}
                          {roomOccupants.length > 0 && (
                            <button
                              onClick={() => {
                                if (roomOccupants.length === 1) {
                                  handleVacate(roomOccupants[0]);
                                } else {
                                  // Prompt which resident to vacate
                                  const names = roomOccupants.map((o, i) => `${i + 1}: ${o.full_name}`).join('\n');
                                  const choice = window.prompt(`Select resident number to vacate:\n${names}`);
                                  const idx = parseInt(choice) - 1;
                                  if (!isNaN(idx) && roomOccupants[idx]) {
                                    handleVacate(roomOccupants[idx]);
                                  }
                                }
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#e11d48', borderColor: '#fecdd3' }}
                              title="Vacate Bed"
                            >
                              <LogOut size={14} /> Vacate
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Hostel Modal */}
      <Modal
        isOpen={addHostelModal}
        onClose={() => setAddHostelModal(false)}
        title="Add New Hostel Block"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateHostel}>
          <div className="form-group">
            <label className="form-label">Hostel Block Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Ganga Residency Block A"
              required
              value={hostelForm.name}
              onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hostel Code *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. H-BLK-A"
                required
                value={hostelForm.code}
                onChange={(e) => setHostelForm({ ...hostelForm, code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hostel Type *</label>
              <select
                className="form-control"
                value={hostelForm.type}
                onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value })}
              >
                <option value="boys">Boys Hostel</option>
                <option value="girls">Girls Hostel</option>
                <option value="co-ed">Co-Ed / Common</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total Floors</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={hostelForm.total_floors}
                onChange={(e) => setHostelForm({ ...hostelForm, total_floors: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Warden Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Dr. Ramesh Kumar"
                value={hostelForm.warden_name}
                onChange={(e) => setHostelForm({ ...hostelForm, warden_name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Warden Contact Number</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 9876543210"
              value={hostelForm.warden_contact}
              onChange={(e) => setHostelForm({ ...hostelForm, warden_contact: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Campus Address / Landmark</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="e.g. North Campus, Near Sports Complex"
              value={hostelForm.address}
              onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setAddHostelModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Hostel Block
            </button>
          </div>
        </form>
      </Modal>

      {/* Allocate Room Modal */}
      <Modal
        isOpen={allocateModal}
        onClose={() => setAllocateModal(false)}
        title={`Allocate Room ${selectedRoom?.room_number}`}
        maxWidth="500px"
      >
        <form onSubmit={handleAllocate}>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.85rem' }}>
            <div>Hostel: <strong>{selectedRoom?.hostel_name}</strong></div>
            <div>Occupancy: <strong>{selectedRoom?.current_occupancy} / {selectedRoom?.capacity} Beds</strong></div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Unallocated Resident *</label>
            {unallocatedResidents.length === 0 ? (
              <div style={{ color: '#e11d48', fontSize: '0.85rem' }}>
                All registered active residents are currently allocated. Register a new resident first.
              </div>
            ) : (
              <select
                className="form-control"
                required
                value={allocateForm.resident_id}
                onChange={(e) => setAllocateForm({ ...allocateForm, resident_id: e.target.value })}
              >
                <option value="">-- Choose Resident --</option>
                {unallocatedResidents.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.full_name} ({r.enrollment_no} - {r.gender.toUpperCase()})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Bed Tag / Identifier</label>
            <input
              type="text"
              className="form-control"
              value={allocateForm.bed_number}
              onChange={(e) => setAllocateForm({ ...allocateForm, bed_number: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Remarks / Notes</label>
            <input
              type="text"
              className="form-control"
              value={allocateForm.remarks}
              onChange={(e) => setAllocateForm({ ...allocateForm, remarks: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setAllocateModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={unallocatedResidents.length === 0}
            >
              Confirm Allocation
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Bed Modal */}
      <Modal
        isOpen={transferModal}
        onClose={() => setTransferModal(false)}
        title="Transfer Resident Room / Bed"
        maxWidth="500px"
      >
        <form onSubmit={handleTransfer}>
          <div className="form-group">
            <label className="form-label">Select Allocated Resident *</label>
            {activeResidents.length === 0 ? (
              <div style={{ color: '#e11d48', fontSize: '0.85rem' }}>
                No active residents currently have a room allocation.
              </div>
            ) : (
              <select
                className="form-control"
                required
                value={transferForm.resident_id}
                onChange={(e) => setTransferForm({ ...transferForm, resident_id: e.target.value })}
              >
                <option value="">-- Choose Resident --</option>
                {activeResidents.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.full_name} (Currently: Room {r.current_room?.room_number || 'N/A'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Destination Room (with Vacancy) *</label>
            <select
              className="form-control"
              required
              value={transferForm.new_room_id}
              onChange={(e) => setTransferForm({ ...transferForm, new_room_id: e.target.value })}
            >
              <option value="">-- Choose Target Room --</option>
              {rooms
                .filter(r => r.status === 'available' && r.current_occupancy < r.capacity)
                .map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} ({r.hostel_name}) — {r.current_occupancy}/{r.capacity} Beds Occupied
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">New Bed Tag / Identifier</label>
            <input
              type="text"
              className="form-control"
              value={transferForm.new_bed}
              onChange={(e) => setTransferForm({ ...transferForm, new_bed: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Transfer</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Student request / maintenance / mutual exchange"
              value={transferForm.reason}
              onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setTransferModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={activeResidents.length === 0}
            >
              Execute Room Transfer
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Room Modal */}
      <Modal
        isOpen={addRoomModal}
        onClose={() => setAddRoomModal(false)}
        title="Add New Hostel Room"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label className="form-label">Hostel Block *</label>
            <select
              className="form-control"
              required
              value={roomForm.hostel_id}
              onChange={(e) => setRoomForm({ ...roomForm, hostel_id: e.target.value })}
            >
              <option value="">-- Select Hostel Block --</option>
              {hostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Room Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. A-105"
                required
                value={roomForm.room_number}
                onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Floor</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={roomForm.floor}
                onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Room Type</label>
              <select
                className="form-control"
                value={roomForm.room_type}
                onChange={(e) => {
                  const type = e.target.value;
                  const cap = type === 'single' ? 1 : type === 'double' ? 2 : type === 'triple' ? 3 : 4;
                  setRoomForm({ ...roomForm, room_type: type, capacity: cap });
                }}
              >
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
                <option value="quad">Quadruple</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Bed Capacity</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Base Semester Fee (₹)</label>
            <input
              type="number"
              className="form-control"
              value={roomForm.base_fee}
              onChange={(e) => setRoomForm({ ...roomForm, base_fee: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setAddRoomModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Room
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoomsManagement;
