import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ResidentDashboard from './pages/ResidentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import ResidentsManagement from './pages/ResidentsManagement';
import RoomsManagement from './pages/RoomsManagement';
import FeesManagement from './pages/FeesManagement';
import AttendanceManagement from './pages/AttendanceManagement';
import VisitorManagement from './pages/VisitorManagement';
import MaintenanceManagement from './pages/MaintenanceManagement';
import FacilityReservations from './pages/FacilityReservations';
import AnalyticsPage from './pages/AnalyticsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import UtilityManagement from './pages/UtilityManagement';
import AnnouncementsNotifications from './pages/AnnouncementsNotifications';
import AuditLogs from './pages/AuditLogs';

function MainLayout() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  const showToast = (type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#ffffff',
        fontFamily: 'sans-serif'
      }}>
        Initializing SRU Smart Hostel Management Platform...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <Toast toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  const role = user?.role || 'resident';

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        if (role === 'admin') return <AdminDashboard setActiveTab={setActiveTab} showToast={showToast} />;
        if (role === 'staff') return <StaffDashboard showToast={showToast} />;
        return <ResidentDashboard setActiveTab={setActiveTab} showToast={showToast} />;
      case 'residents':
        return <ResidentsManagement showToast={showToast} />;
      case 'rooms':
        return <RoomsManagement showToast={showToast} />;
      case 'fees':
        return <FeesManagement showToast={showToast} />;
      case 'attendance':
        return <AttendanceManagement showToast={showToast} />;
      case 'visitors':
        return <VisitorManagement showToast={showToast} />;
      case 'maintenance':
        return <MaintenanceManagement showToast={showToast} />;
      case 'facilities':
        return <FacilityReservations showToast={showToast} />;
      case 'analytics':
        return <AnalyticsPage showToast={showToast} />;
      case 'recommendations':
        return <RecommendationsPage setActiveTab={setActiveTab} showToast={showToast} />;
      case 'utilities':
        return <UtilityManagement showToast={showToast} />;
      case 'announcements':
        return <AnnouncementsNotifications showToast={showToast} />;
      case 'audit-logs':
        return role === 'admin' ? (
          <AuditLogs showToast={showToast} />
        ) : (
          <div className="card" style={{ padding: '30px', textAlign: 'center', margin: '30px auto' }}>
            <h3>Access Denied</h3>
            <p style={{ color: '#64748b' }}>Administrator privileges are required to view security audit logs.</p>
          </div>
        );
      default:
        return <AdminDashboard setActiveTab={setActiveTab} showToast={showToast} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Navbar />
        <main className="page-body">
          {renderActivePage()}
        </main>
      </div>
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default MainLayout;
