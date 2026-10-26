import React, { useState, useEffect } from 'react';
import API from '../api/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { BarChart3, TrendingUp, DollarSign, CalendarCheck, Wrench, Zap } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AnalyticsPage = () => {
  const [overview, setOverview] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [complaintData, setComplaintData] = useState(null);
  const [utilityData, setUtilityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAnalytics = async () => {
      try {
        const [ov, occ, fee, att, comp, util] = await Promise.all([
          API.get('/analytics/overview'),
          API.get('/analytics/occupancy'),
          API.get('/analytics/fees'),
          API.get('/analytics/attendance-trends?days=14'),
          API.get('/analytics/complaints'),
          API.get('/analytics/utilities')
        ]);

        if (ov.data.success) setOverview(ov.data.metrics);
        if (occ.data.success) setOccupancyData(occ.data);
        if (fee.data.success) setFeeData(fee.data);
        if (att.data.success) setAttendanceData(att.data);
        if (comp.data.success) setComplaintData(comp.data);
        if (util.data.success) setUtilityData(util.data);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllAnalytics();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Computing Pandas analytics aggregations...</div>;
  }

  // 1. Occupancy by Hostel Chart
  const hostelChartData = {
    labels: occupancyData?.by_hostel?.map(h => h.hostel_name) || [],
    datasets: [
      {
        label: 'Occupied Beds',
        data: occupancyData?.by_hostel?.map(h => h.occupied) || [],
        backgroundColor: '#0d9488',
        borderRadius: 6
      },
      {
        label: 'Available Vacancy',
        data: occupancyData?.by_hostel?.map(h => h.available) || [],
        backgroundColor: '#cbd5e1',
        borderRadius: 6
      }
    ]
  };

  // 2. Room Type Distribution Doughnut
  const roomTypeChartData = {
    labels: occupancyData?.by_type?.map(t => `${t.room_type.toUpperCase()} Room`) || [],
    datasets: [
      {
        data: occupancyData?.by_type?.map(t => t.occupied) || [],
        backgroundColor: ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  // 3. Monthly Fee Collection Line Chart
  const feeTrendLabels = feeData?.monthly_trend?.map(f => f.month) || ['2026-06', '2026-07', '2026-08', '2026-09'];
  const feeTrendValues = feeData?.monthly_trend?.map(f => f.amount) || [25000, 48000, 123000, 89000];
  const feeLineChartData = {
    labels: feeTrendLabels,
    datasets: [
      {
        label: 'Fee Collection (₹)',
        data: feeTrendValues,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 5
      }
    ]
  };

  // 4. Complaint Category Breakdown
  const complaintChartData = {
    labels: complaintData?.by_category?.map(c => c.category.toUpperCase()) || [],
    datasets: [
      {
        label: 'Total Complaints',
        data: complaintData?.by_category?.map(c => c.total_requests) || [],
        backgroundColor: '#f43f5e',
        borderRadius: 6
      },
      {
        label: 'Resolved',
        data: complaintData?.by_category?.map(c => c.resolved_count) || [],
        backgroundColor: '#10b981',
        borderRadius: 6
      }
    ]
  };

  // 5. Utility Trends
  const utilityLabels = utilityData?.monthly_trends?.map(u => u.month) || [];
  const utilityElec = utilityData?.monthly_trends?.map(u => u.electricity_kwh) || [];
  const utilityWater = utilityData?.monthly_trends?.map(u => u.water_liters / 10) || []; // Scaled for comparison
  const utilityChartData = {
    labels: utilityLabels,
    datasets: [
      {
        type: 'bar',
        label: 'Electricity (kWh)',
        data: utilityElec,
        backgroundColor: '#f59e0b',
        borderRadius: 6
      },
      {
        type: 'line',
        label: 'Water Consumption (Liters / 10)',
        data: utilityWater,
        borderColor: '#0284c7',
        backgroundColor: '#0284c7',
        tension: 0.3
      }
    ]
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Smart Analytics & Resource Intelligence</h1>
          <p className="page-subtitle">Pandas-computed statistical models and interactive Chart.js visualizations</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            Live Engine: Pandas 2.2 + Chart.js 4.4
          </span>
        </div>
      </div>

      {/* Analytics KPI Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Hostel Occupancy</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0d9488', marginTop: '4px' }}>
            {overview?.occupancy_rate ?? 0}%
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {overview?.current_occupancy} / {overview?.total_capacity} beds filled
          </span>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Fee Collection Rate</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
            {overview?.total_invoiced > 0 ? `${((overview?.total_collected / overview?.total_invoiced) * 100).toFixed(1)}%` : '100%'}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            ₹{overview?.total_collected?.toLocaleString('en-IN')} of ₹{overview?.total_invoiced?.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Complaint Resolution</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#3b82f6', marginTop: '4px' }}>
            {overview?.open_complaints + overview?.resolved_complaints > 0 
              ? `${((overview.resolved_complaints / (overview.open_complaints + overview.resolved_complaints)) * 100).toFixed(0)}%`
              : '100%'}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {overview?.resolved_complaints} resolved / {overview?.open_complaints} pending
          </span>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Available Vacancy</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {overview?.available_rooms ?? 0} Rooms
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Ready for immediate assignment
          </span>
        </div>
      </div>

      {/* Grid of Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Chart 1: Hostel Occupancy */}
        <div className="card">
          <div className="card-title">
            <span>Capacity & Occupancy by Hostel Wing</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Beds distribution</span>
          </div>
          <div style={{ height: '260px' }}>
            <Bar 
              data={hostelChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
              }}
            />
          </div>
        </div>

        {/* Chart 2: Room Type Distribution */}
        <div className="card">
          <div className="card-title">
            <span>Room Type Allocation Share</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Single / Double / Triple</span>
          </div>
          <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
            <Doughnut 
              data={roomTypeChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
              }}
            />
          </div>
        </div>

        {/* Chart 3: Monthly Fee Collection */}
        <div className="card">
          <div className="card-title">
            <span>Monthly Fee Collection Inflow (₹)</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Revenue trend</span>
          </div>
          <div style={{ height: '260px' }}>
            <Line 
              data={feeLineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>

        {/* Chart 4: Complaint Categories */}
        <div className="card">
          <div className="card-title">
            <span>Complaints by Infrastructure Category</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Total vs Resolved</span>
          </div>
          <div style={{ height: '260px' }}>
            <Bar 
              data={complaintChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>

        {/* Chart 5: Utility Consumption Multi-axis */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">
            <span>Monthly Utility Consumption & Resource Utilization</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Electricity (kWh) vs Water Volume (Liters / 10)</span>
          </div>
          <div style={{ height: '280px' }}>
            <Bar 
              data={utilityChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
