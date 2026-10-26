import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, BedDouble, Receipt, CalendarCheck, 
  UserCheck, Wrench, Building2, BarChart3, Lightbulb, 
  Zap, Megaphone, ShieldCheck
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const role = user?.role || 'resident';

  const adminNav = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'residents', label: 'Residents Management', icon: Users },
    { id: 'rooms', label: 'Rooms & Allocations', icon: BedDouble },
    { id: 'fees', label: 'Fee Management', icon: Receipt },
    { id: 'attendance', label: 'Daily Attendance', icon: CalendarCheck },
    { id: 'visitors', label: 'Visitor Gate Pass', icon: UserCheck },
    { id: 'maintenance', label: 'Maintenance Issues', icon: Wrench },
    { id: 'facilities', label: 'Facility Reservations', icon: Building2 },
    { id: 'analytics', label: 'Smart Analytics', icon: BarChart3 },
    { id: 'recommendations', label: 'AI Recommendations', icon: Lightbulb },
    { id: 'utilities', label: 'Utility Monitoring', icon: Zap },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  ];

  const residentNav = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'residents', label: 'My Profile & Room', icon: Users },
    { id: 'fees', label: 'My Fees & Payments', icon: Receipt },
    { id: 'attendance', label: 'Attendance & QR', icon: CalendarCheck },
    { id: 'visitors', label: 'Visitor Registration', icon: UserCheck },
    { id: 'maintenance', label: 'Lodge Complaint', icon: Wrench },
    { id: 'facilities', label: 'Reserve Facility', icon: Building2 },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  const staffNav = [
    { id: 'dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
    { id: 'maintenance', label: 'Assigned Complaints', icon: Wrench },
    { id: 'attendance', label: 'Mark Attendance', icon: CalendarCheck },
    { id: 'visitors', label: 'Visitor Logs', icon: UserCheck },
    { id: 'utilities', label: 'Log Utility Records', icon: Zap },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  const navItems = role === 'admin' ? adminNav : role === 'staff' ? staffNav : residentNav;

  return (
    <aside style={{
      width: '260px',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      borderRight: '1px solid #1e293b'
    }}>
      {/* Role Banner */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <ShieldCheck size={20} color="#14b8a6" />
        <div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Portal Mode
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff', textTransform: 'capitalize' }}>
            {role} Portal
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#64748b',
          padding: '0 12px 10px 12px'
        }}>
          Navigation Menu
        </div>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    backgroundColor: isActive ? '#0d9488' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#1e293b';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                    }
                  }}
                >
                  <Icon size={18} color={isActive ? '#ffffff' : '#64748b'} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* University Footer info */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #1e293b',
        fontSize: '0.75rem',
        color: '#64748b',
        background: '#090d16'
      }}>
        <div style={{ fontWeight: '600', color: '#94a3b8' }}>SR University</div>
        <div>Hostel Administration &copy; 2026</div>
      </div>
    </aside>
  );
};

export default Sidebar;
