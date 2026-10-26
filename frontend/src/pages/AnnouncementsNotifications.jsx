import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Megaphone, Plus, Bell, AlertTriangle, Trash2, Clock, CheckCircle } from 'lucide-react';

const AnnouncementsNotifications = ({ showToast }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    target_audience: 'all',
    priority: 'normal'
  });

  const fetchData = async () => {
    try {
      const [aRes, nRes] = await Promise.all([
        API.get('/announcements'),
        API.get('/notifications')
      ]);

      if (aRes.data.success) setAnnouncements(aRes.data.announcements);
      if (nRes.data.success) setNotifications(aRes.data.notifications || nRes.data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/announcements', form);
      if (res.data.success) {
        showToast('success', 'Announcement published and broadcast to students!');
        setModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to publish');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const res = await API.delete(`/announcements/${id}`);
      if (res.data.success) {
        showToast('info', 'Announcement deleted.');
        fetchData();
      }
    } catch (err) {
      showToast('error', 'Failed to delete announcement');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements & Campus Bulletins</h1>
          <p className="page-subtitle">Official administrative notices, maintenance schedules, and student circulars</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Publish Announcement
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Announcements List */}
        <div>
          <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={18} color="#0d9488" /> Official Circulars
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {announcements.length === 0 ? (
              <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                No active announcements published.
              </div>
            ) : (
              announcements.map((a) => (
                <div 
                  key={a.id} 
                  className="card"
                  style={{
                    borderLeft: `4px solid ${a.priority === 'urgent' ? '#e11d48' : '#0d9488'}`,
                    padding: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={`badge ${a.priority === 'urgent' ? 'badge-danger' : 'badge-neutral'}`}>
                          {a.priority}
                        </span>
                        <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                          Target: {a.target_audience}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: '800' }}>
                        {a.title}
                      </h4>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        title="Delete Announcement"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <p style={{ fontSize: '0.88rem', color: '#334155', marginTop: '10px', lineHeight: 1.5 }}>
                    {a.content}
                  </p>

                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Posted on {new Date(a.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* In-App Notifications Feed */}
        <div>
          <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="#0d9488" /> Recent Activity & Notifications
          </h3>

          <div className="card" style={{ padding: '16px' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.88rem' }}>
                No notifications logged for your profile.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: n.is_read ? '#f8fafc' : '#f0fdfa',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{n.title}</div>
                    <div style={{ color: '#64748b', marginTop: '2px' }}>{n.message}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '4px' }}>
                      {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Publish Announcement Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Publish Hostel Announcement"
        maxWidth="520px"
      >
        <form onSubmit={handleCreateAnnouncement}>
          <div className="form-group">
            <label className="form-label">Announcement Title *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Scheduled Wi-Fi maintenance this Sunday"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <select
                className="form-control"
                value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
              >
                <option value="all">All (Students & Staff)</option>
                <option value="residents">Residents Only</option>
                <option value="staff">Staff Personnel Only</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                className="form-control"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="normal">Normal Circular</option>
                <option value="urgent">Urgent Notice</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Announcement Content *</label>
            <textarea
              className="form-control"
              rows="4"
              required
              placeholder="Provide complete circular details for students and staff..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Publish & Broadcast
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AnnouncementsNotifications;
