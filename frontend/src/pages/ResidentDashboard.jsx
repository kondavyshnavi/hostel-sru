import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import { 
  BedDouble, Receipt, CalendarCheck, Wrench, QrCode, 
  Building2, UserCheck, CheckCircle2, AlertTriangle, ArrowRight
} from 'lucide-react';
import QRModal from '../components/QRModal';

const ResidentDashboard = ({ setActiveTab, showToast }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fees, setFees] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [myComplaints, setMyComplaints] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [dailyQrData, setDailyQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResidentData = async () => {
      try {
        const [meRes, feeRes, compRes] = await Promise.all([
          API.get('/auth/me'),
          API.get('/fees'),
          API.get('/maintenance')
        ]);

        if (meRes.data.success && meRes.data.user.resident_details) {
          const resDetails = meRes.data.user.resident_details;
          setProfile(resDetails);

          // Fetch attendance stats for this resident
          const attRes = await API.get(`/attendance/resident/${resDetails.id}`);
          if (attRes.data.success) {
            setAttendanceStats(attRes.data.stats);
          }
        }

        if (feeRes.data.success) {
          setFees(feeRes.data.fees);
        }

        if (compRes.data.success) {
          setMyComplaints(compRes.data.requests);
        }
      } catch (err) {
        console.error("Failed to load resident dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResidentData();
  }, []);

  const handleOpenDailyQr = async () => {
    try {
      const res = await API.get('/attendance/daily-qr');
      if (res.data.success) {
        setDailyQrData(res.data);
        setQrModalOpen(true);
      }
    } catch (e) {
      showToast('error', 'Failed to retrieve daily attendance token');
    }
  };

  const handleSelfCheckIn = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await API.post('/attendance/scan-qr', {
        token: `SRU_ATTENDANCE_TOKEN_${todayStr}`
      });
      if (res.data.success) {
        showToast('success', res.data.message);
        // Refresh attendance stats
        if (profile?.id) {
          const attRes = await API.get(`/attendance/resident/${profile.id}`);
          if (attRes.data.success) setAttendanceStats(attRes.data.stats);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Self check-in failed';
      showToast('error', msg);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading student residential profile...</div>;
  }

  const pendingFeeTotal = fees.filter(f => f.status !== 'paid').reduce((acc, f) => acc + f.balance, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {profile?.full_name || user?.username}!</h1>
          <p className="page-subtitle">
            Enrollment: {profile?.enrollment_no || 'N/A'} &bull; {profile?.course} ({profile?.branch})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleOpenDailyQr} className="btn btn-secondary btn-sm">
            <QrCode size={15} /> View Attendance QR
          </button>
          <button onClick={handleSelfCheckIn} className="btn btn-primary btn-sm">
            <CheckCircle2 size={15} /> Quick Self Check-in
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          title="Allocated Room"
          value={profile?.current_room ? `${profile.current_room.room_number}` : 'Unallocated'}
          subtext={profile?.current_room ? `${profile.current_room.hostel_name} (${profile.current_room.bed_number})` : 'Awaiting admin allocation'}
          icon={BedDouble}
          color="teal"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceStats?.attendance_rate ?? 100}%`}
          subtext={`${attendanceStats?.present_days ?? 0} Present / ${attendanceStats?.total_recorded_days ?? 0} Days`}
          icon={CalendarCheck}
          color="blue"
        />
        <StatCard
          title="Pending Fees"
          value={`₹${pendingFeeTotal.toLocaleString('en-IN')}`}
          subtext={pendingFeeTotal > 0 ? "Due for current term" : "All dues cleared!"}
          icon={Receipt}
          color={pendingFeeTotal > 0 ? "amber" : "emerald"}
        />
        <StatCard
          title="My Complaints"
          value={myComplaints.filter(c => c.status !== 'resolved').length}
          subtext={`${myComplaints.filter(c => c.status === 'resolved').length} resolved`}
          icon={Wrench}
          color="indigo"
        />
      </div>

      {/* Two Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Room & Resident Profile Details */}
        <div className="card">
          <div className="card-title">
            <span>Room & Residence Details</span>
            <button onClick={() => setActiveTab('residents')} className="btn btn-secondary btn-sm">
              Full Profile
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Hostel Block:</span>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>
                {profile?.current_room?.hostel_name || 'Not Allocated'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Room & Bed:</span>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>
                {profile?.current_room ? `${profile.current_room.room_number} (${profile.current_room.bed_number})` : 'N/A'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Contact Phone:</span>
              <div style={{ fontWeight: '600' }}>{profile?.phone || 'N/A'}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Emergency Contact:</span>
              <div style={{ fontWeight: '600' }}>{profile?.emergency_contact || 'N/A'}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Guardian / Parent:</span>
              <div style={{ fontWeight: '600' }}>{profile?.parent_name || 'N/A'}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Blood Group:</span>
              <div style={{ fontWeight: '600' }}>{profile?.blood_group || 'O+'}</div>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
            <button onClick={() => setActiveTab('visitors')} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
              <UserCheck size={15} /> Request Visitor Pass
            </button>
            <button onClick={() => setActiveTab('facilities')} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
              <Building2 size={15} /> Book Facility
            </button>
          </div>
        </div>

        {/* Recent Complaints & Status */}
        <div className="card">
          <div className="card-title">
            <span>Recent Maintenance Complaints</span>
            <button onClick={() => setActiveTab('maintenance')} className="btn btn-primary btn-sm">
              <Wrench size={14} /> File Complaint
            </button>
          </div>
          {myComplaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.9rem' }}>
              No maintenance requests lodged. Your room facilities are all in good standing!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myComplaints.slice(0, 4).map(c => (
                <div 
                  key={c.id} 
                  style={{
                    padding: '12px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                      Category: {c.category.toUpperCase()} &bull; Assigned to: {c.assignee_name}
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${
                      c.status === 'resolved' ? 'badge-success' : 
                      c.status === 'in_progress' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Modal for daily attendance */}
      <QRModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Hostel Daily Attendance Gate Pass"
        subtitle="Present this QR code to the gate security scanner or use it to self check-in."
        qrDataUri={dailyQrData?.qr_data_uri}
        footerNote={`Generated for ${dailyQrData?.date || 'Today'}. Valid for 24 hours.`}
      />
    </div>
  );
};

export default ResidentDashboard;
