import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Zap, Droplets, Plus, DollarSign, Calendar, TrendingUp } from 'lucide-react';

const UtilityManagement = ({ showToast }) => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  const [records, setRecords] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    hostel_id: '',
    billing_month: '2026-09',
    electricity_kwh: 4500,
    electricity_cost: 36000,
    water_liters: 70000,
    water_cost: 7000,
    notes: 'Meter reading verified'
  });

  const fetchData = async () => {
    try {
      const [uRes, hRes] = await Promise.all([
        API.get('/utilities'),
        API.get('/hostels')
      ]);

      if (uRes.data.success) setRecords(uRes.data.records);
      if (hRes.data.success) {
        setHostels(hRes.data.hostels);
        if (hRes.data.hostels.length > 0) {
          setForm(prev => ({ ...prev, hostel_id: hRes.data.hostels[0].id }));
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
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/utilities', form);
      if (res.data.success) {
        showToast('success', res.data.message);
        setModalOpen(false);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to log utility';
      showToast('error', msg);
    }
  };

  const totalElec = records.reduce((acc, r) => acc + r.electricity_kwh, 0);
  const totalWater = records.reduce((acc, r) => acc + r.water_liters, 0);
  const totalCost = records.reduce((acc, r) => acc + r.total_cost, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hostel Utility & Resource Monitoring</h1>
          <p className="page-subtitle">Track power consumption (kWh) and water usage across hostel blocks</p>
        </div>
        {isAdminOrStaff && (
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Log Monthly Reading
          </button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706' }}>
            <Zap size={18} />
            <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase' }}>Total Electricity</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {totalElec.toLocaleString('en-IN')} kWh
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7' }}>
            <Droplets size={18} />
            <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase' }}>Total Water Volume</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {totalWater.toLocaleString('en-IN')} Liters
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669' }}>
            <DollarSign size={18} />
            <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase' }}>Cumulative Utility Bill</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
            ₹{totalCost.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0f172a' }}>
            Monthly Sub-meter Logs
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Hostel Block</th>
              <th>Power (kWh)</th>
              <th>Power Cost (₹)</th>
              <th>Water (Liters)</th>
              <th>Water Cost (₹)</th>
              <th>Combined Total (₹)</th>
              <th>Logged By</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No utility consumption logs recorded yet.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: '700', color: '#0f172a' }}>{r.billing_month}</td>
                  <td>{r.hostel_name}</td>
                  <td style={{ fontWeight: '600' }}>{r.electricity_kwh.toLocaleString('en-IN')}</td>
                  <td style={{ color: '#d97706' }}>₹{r.electricity_cost.toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: '600' }}>{r.water_liters.toLocaleString('en-IN')}</td>
                  <td style={{ color: '#0284c7' }}>₹{r.water_cost.toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: '800', color: '#059669' }}>
                    ₹{r.total_cost.toLocaleString('en-IN')}
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{r.logged_by || 'System'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Utility Log Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log Monthly Utility Consumption"
        maxWidth="500px"
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Hostel Block *</label>
            <select
              className="form-control"
              required
              value={form.hostel_id}
              onChange={(e) => setForm({ ...form, hostel_id: e.target.value })}
            >
              {hostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Billing Month (YYYY-MM) *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. 2026-09"
              value={form.billing_month}
              onChange={(e) => setForm({ ...form, billing_month: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Electricity (kWh)</label>
              <input
                type="number"
                className="form-control"
                value={form.electricity_kwh}
                onChange={(e) => setForm({ ...form, electricity_kwh: parseFloat(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Electricity Cost (₹)</label>
              <input
                type="number"
                className="form-control"
                value={form.electricity_cost}
                onChange={(e) => setForm({ ...form, electricity_cost: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Water Usage (Liters)</label>
              <input
                type="number"
                className="form-control"
                value={form.water_liters}
                onChange={(e) => setForm({ ...form, water_liters: parseFloat(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Water Bill Cost (₹)</label>
              <input
                type="number"
                className="form-control"
                value={form.water_cost}
                onChange={(e) => setForm({ ...form, water_cost: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes & Observations</label>
            <input
              type="text"
              className="form-control"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Utility Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UtilityManagement;
