import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, User, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';
import API from '../api/api';

const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // 20s poll
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'fee': return <AlertCircle size={16} className="text-amber-500" />;
      case 'allocation': return <Sparkles size={16} className="text-teal-500" />;
      case 'maintenance': return <Info size={16} className="text-blue-500" />;
      default: return <Bell size={16} className="text-slate-500" />;
    }
  };

  return (
    <header style={{
      height: '70px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={onMenuToggle}
          className="btn-secondary btn-sm" 
          style={{ display: 'none', '@media (max-width: 900px)': { display: 'flex' } }}
        >
          ☰
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '1.1rem'
          }}>
            H
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
              SRU SMART HOSTEL
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
              Residential Management Platform
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              color: '#334155'
            }}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#e11d48',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: '700',
                borderRadius: '9999px',
                padding: '1px 6px',
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '50px',
              width: '340px',
              background: '#ffffff',
              borderRadius: '14px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>
                  Notifications ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0d9488',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f8fafc',
                        backgroundColor: n.is_read ? '#ffffff' : '#f0fdfa',
                        display: 'flex',
                        gap: '12px',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ marginTop: '2px' }}>{getNotifIcon(n.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{n.title}</div>
                        <div style={{ color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>{n.message}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '4px' }}>
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile capsule */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 14px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '9999px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#0f172a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: '700'
          }}>
            {user?.username ? user.username[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', lineHeight: 1.1 }}>
              {user?.username}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: '700', textTransform: 'uppercase' }}>
              {user?.role}
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
