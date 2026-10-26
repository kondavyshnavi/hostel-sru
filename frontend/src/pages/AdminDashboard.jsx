import React, { useState, useEffect } from 'react';
import API from '../api/api';
import StatCard from '../components/StatCard';
import { 
  Users, BedDouble, Receipt, Wrench, AlertCircle, 
  CheckCircle, ArrowRight, Sparkles, Building2, UserPlus, Clock
} from 'lucide-react';

const AdminDashboard = ({ setActiveTab }) => {
  const [metrics, setMetrics] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [mRes, compRes, visRes, recRes] = await Promise.all([
          API.get('/analytics/overview'),
          API.get('/maintenance?status=pending'),
          API.get('/visitors'),
          API.get('/recommendations')
        ]);

        if (mRes.data.success) setMetrics(mRes.data.metrics);
        if (compRes.data.success) setRecentComplaints(compRes.data.requests.slice(0, 5));
        if (visRes.data.success) setRecentVisitors(visRes.data.visitors.slice(0, 5));
        if (recRes.data.success) setRecommendations(recRes.data.recommendations.slice(0, 2));
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading administrative dashboard metrics...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Administrator Dashboard</h1>
          <p className="page-subtitle">Real-time overview of SRU hostel operations, occupancy, and residential services.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('residents')} className="btn btn-secondary btn-sm">
            <UserPlus size={15} /> Add Resident
          </button>
          <button onClick={() => setActiveTab('recommendations')} className="btn btn-primary btn-sm">
            <Sparkles size={15} /> AI Insights ({recommendations.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          title="Active Residents"
          value={metrics?.total_residents ?? 0}
          subtext="Enrolled students in hostel"
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${metrics?.occupancy_rate ?? 0}%`}
          subtext={`${metrics?.current_occupancy ?? 0} / ${metrics?.total_capacity ?? 0} beds filled`}
          icon={BedDouble}
          color="blue"
        />
        <StatCard
          title="Available Rooms"
          value={metrics?.available_rooms ?? 0}
          subtext={`${metrics?.occupied_rooms ?? 0} fully occupied`}
          icon={Building2}
          color="indigo"
        />
        <StatCard
          title="Pending Fees"
          value={`₹${(metrics?.pending_fees ?? 0).toLocaleString('en-IN')}`}
          subtext={`${metrics?.overdue_count ?? 0} overdue invoices`}
          icon={Receipt}
          color="amber"
        />
        <StatCard
          title="Open Complaints"
          value={metrics?.open_complaints ?? 0}
          subtext={`${metrics?.resolved_complaints ?? 0} resolved this term`}
          icon={Wrench}
          color={metrics?.open_complaints > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* AI Recommendation Spotlight */}
      {recommendations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #134e4a)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(20, 184, 166, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2dd4bf'
            }}>
              <Sparkles size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2dd4bf' }}>
                Rule-Based Intelligent System Alert
              </div>
              <div style={{ fontWeight: '700', fontSize: '1.05rem', marginTop: '2px' }}>
                {recommendations[0]?.title}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px', maxWidth: '650px' }}>
                {recommendations[0]?.reasoning}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('recommendations')}
            className="btn btn-primary"
            style={{ backgroundColor: '#14b8a6', borderColor: '#14b8a6', color: '#0f172a', fontWeight: '700' }}
          >
            Review All Insights <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Two Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Pending Maintenance */}
        <div className="card">
          <div className="card-title">
            <span>Pending Maintenance Requests</span>
            <button 
              onClick={() => setActiveTab('maintenance')} 
              style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
            >
              View All ({metrics?.open_complaints ?? 0})
            </button>
          </div>
          {recentComplaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.9rem' }}>
              <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              No pending maintenance issues! Everything is running smoothly.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentComplaints.map(c => (
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
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>
                      #{c.id} - {c.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Room {c.room_number} &bull; Resident: {c.resident_name}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${c.priority === 'emergency' || c.priority === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                      {c.priority}
                    </span>
                    <button
                      onClick={() => setActiveTab('maintenance')}
                      className="btn btn-secondary btn-sm"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visitor Requests */}
        <div className="card">
          <div className="card-title">
            <span>Recent Visitor Passes</span>
            <button 
              onClick={() => setActiveTab('visitors')} 
              style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Visitor Gate Pass
            </button>
          </div>
          {recentVisitors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.9rem' }}>
              No visitors registered recently.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentVisitors.map(v => (
                <div 
                  key={v.id} 
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
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>
                      {v.visitor_name} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({v.relationship})</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Visiting: {v.resident_name} &bull; Date: {v.visit_date}
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${
                      v.status === 'approved' ? 'badge-success' : 
                      v.status === 'pending' ? 'badge-warning' : 
                      v.status === 'checked_in' ? 'badge-info' : 'badge-neutral'
                    }`}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
