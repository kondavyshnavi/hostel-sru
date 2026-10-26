import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import QRModal from '../components/QRModal';
import { CalendarCheck, QrCode, Plus, CheckCircle, XCircle, AlertCircle, Users } from 'lucide-react';

const AttendanceManagement = ({ showToast }) => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  const [attendance, setAttendance] = useState([]);
  const [residents, setResidents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [markModal, setMarkModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [dailyQr, setDailyQr] = useState(null);

  // Form State
  const [attForm, setAttForm] = useState({
    resident_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    remarks: ''
  });

  // Bulk State
  const [bulkList, setBulkList] = useState([]);

  const fetchData = async () => {
    try {
      const params = {};
      if (selectedDate) params.date = selectedDate;
      if (selectedStatus) params.status = selectedStatus;

      const [attRes, resRes] = await Promise.all([
        API.get('/attendance', { params }),
        isAdminOrStaff ? API.get('/residents?status=active') : Promise.resolve({ data: { success: false } })
      ]);

      if (attRes.data.success) setAttendance(attRes.data.attendance);
      if (resRes.data.success) {
        setResidents(resRes.data.residents);
        // Pre-fill bulk list
        setBulkList(resRes.data.residents.map(r => ({
          resident_id: r.id,
          name: r.full_name,
          enrollment_no: r.enrollment_no,
          status: 'present',
          remarks: ''
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedStatus]);

  const handleOpenQr = async () => {
    try {
      const res = await API.get('/attendance/daily-qr');
      if (res.data.success) {
        setDailyQr(res.data);
        setQrModal(true);
      }
    } catch (e) {
      showToast('error', 'Failed to generate attendance QR code');
    }
  };

  const handleMarkSingle = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/attendance', attForm);
      if (res.data.success) {
        showToast('success', res.data.message);
        setMarkModal(false);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to mark attendance';
      showToast('error', msg);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/attendance/bulk', {
        date: selectedDate,
        entries: bulkList.map(b => ({
          resident_id: b.resident_id,
          status: b.status,
          remarks: b.remarks
        }))
      });
      if (res.data.success) {
        showToast('success', res.data.message);
        setBulkModal(false);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Bulk attendance failed';
      showToast('error', msg);
    }
  };

  const handleSelfQrCheckin = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await API.post('/attendance/scan-qr', {
        token: `SRU_ATTENDANCE_TOKEN_${todayStr}`
      });
      if (res.data.success) {
        showToast('success', res.data.message);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Check-in failed';
      showToast('error', msg);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Attendance Tracking</h1>
          <p className="page-subtitle">Biometric & QR-verified student check-in records with duplicate prevention</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleOpenQr} className="btn btn-secondary btn-sm">
            <QrCode size={15} /> Daily Gate QR
          </button>
          {!isAdminOrStaff && (
            <button onClick={handleSelfQrCheckin} className="btn btn-primary btn-sm">
              <CheckCircle size={15} /> Self Scan & Check-in
            </button>
          )}
          {isAdminOrStaff && (
            <>
              <button onClick={() => setBulkModal(true)} className="btn btn-secondary btn-sm">
                <Users size={15} /> Bulk Daily Roster
              </button>
              <button 
                onClick={() => {
                  setAttForm({
                    resident_id: residents.length > 0 ? residents[0].id : '',
                    date: selectedDate,
                    status: 'present',
                    remarks: ''
                  });
                  setMarkModal(true);
                }} 
                className="btn btn-primary btn-sm"
              >
                <Plus size={15} /> Mark Individual
              </button>
            </>
          )}
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-control"
                style={{ width: '160px', padding: '6px 10px', fontSize: '0.85rem' }}
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="leave">On Leave</option>
              <option value="late">Late Check-in</option>
            </select>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Total Recorded for Date: <strong>{attendance.length}</strong>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Resident Name</th>
              <th>Enrollment No</th>
              <th>Date</th>
              <th>Check-in Time</th>
              <th>Verification Mode</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {attendance.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No attendance records logged for {selectedDate}.
                </td>
              </tr>
            ) : (
              attendance.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: '700', color: '#0f172a' }}>{a.resident_name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{a.enrollment_no}</td>
                  <td>{a.date}</td>
                  <td>{a.check_in_time || '--:--'}</td>
                  <td>
                    {a.qr_verified ? (
                      <span className="badge badge-info" style={{ gap: '3px' }}>
                        <QrCode size={12} /> QR Scanned
                      </span>
                    ) : (
                      <span className="badge badge-neutral">Manual ({a.marked_by})</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      a.status === 'present' ? 'badge-success' : 
                      a.status === 'absent' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{a.remarks || '--'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mark Single Attendance Modal */}
      <Modal
        isOpen={markModal}
        onClose={() => setMarkModal(false)}
        title="Mark Individual Student Attendance"
        maxWidth="480px"
      >
        <form onSubmit={handleMarkSingle}>
          <div className="form-group">
            <label className="form-label">Resident Student *</label>
            <select
              className="form-control"
              required
              value={attForm.resident_id}
              onChange={(e) => setAttForm({ ...attForm, resident_id: e.target.value })}
            >
              <option value="">-- Choose Resident --</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>{r.full_name} ({r.enrollment_no})</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={attForm.date}
                onChange={(e) => setAttForm({ ...attForm, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={attForm.status}
                onChange={(e) => setAttForm({ ...attForm, status: e.target.value })}
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
                <option value="late">Late</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Justification</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Permission letter submitted"
              value={attForm.remarks}
              onChange={(e) => setAttForm({ ...attForm, remarks: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setMarkModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Record Attendance
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Attendance Modal */}
      <Modal
        isOpen={bulkModal}
        onClose={() => setBulkModal(false)}
        title={`Bulk Daily Attendance Roster (${selectedDate})`}
        maxWidth="680px"
      >
        <form onSubmit={handleBulkSubmit}>
          <div style={{ maxHeight: '380px', overflowY: 'auto', marginBottom: '16px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {bulkList.map((item, idx) => (
                  <tr key={item.resident_id}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.enrollment_no}</div>
                    </td>
                    <td>
                      <select
                        value={item.status}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkList(prev => prev.map((it, i) => i === idx ? { ...it, status: val } : it));
                        }}
                        className="filter-select"
                        style={{ padding: '6px 10px' }}
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="leave">Leave</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setBulkModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save All Records
            </button>
          </div>
        </form>
      </Modal>

      {/* Gate QR Modal */}
      <QRModal
        isOpen={qrModal}
        onClose={() => setQrModal(false)}
        title="Hostel Main Gate Daily Attendance Scanner"
        subtitle="Place this QR code at hostel entrance turnstiles. Students can scan to verify check-in."
        qrDataUri={dailyQr?.qr_data_uri}
        footerNote={`Daily verification token: ${dailyQr?.token || ''}`}
      />
    </div>
  );
};

export default AttendanceManagement;
