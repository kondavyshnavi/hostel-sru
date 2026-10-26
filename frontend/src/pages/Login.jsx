import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Wrench, Lock, User, ArrowRight } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please provide your username/email and password');
      return;
    }
    setError('');
    setLoading(true);
    const res = await login(identifier, password);
    setLoading(false);
    if (!res.success) {
      setError(res.message);
    }
  };

  const handleQuickLogin = async (u, p) => {
    setIdentifier(u);
    setPassword(p);
    setError('');
    setLoading(true);
    const res = await login(u, p);
    setLoading(false);
    if (!res.success) {
      setError(res.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      backgroundImage: 'radial-gradient(at 0% 0%, #1e293b 0px, transparent 50%), radial-gradient(at 100% 100%, #0f766e 0px, transparent 40%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: '800',
            marginBottom: '14px',
            boxShadow: '0 8px 16px rgba(13, 148, 136, 0.3)'
          }}>
            H
          </div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: '800', color: '#0f172a' }}>
            SRU Smart Hostel
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px' }}>
            Residential Management & AI Analytics Platform
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username or Institutional Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. admin or rahul_sharma"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{ paddingLeft: '40px' }}
                disabled={loading}
              />
              <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                disabled={loading}
              />
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : <><span>Sign In to Portal</span> <ArrowRight size={18} /></>}
          </button>
        </form>

        {/* Demo Fast Login Pills */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', textAlign: 'center', marginBottom: '12px', letterSpacing: '0.05em' }}>
            Quick Demo Accounts (1-Click Fill)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'Admin@123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', flexDirection: 'column', gap: '3px', padding: '8px 4px' }}
            >
              <ShieldCheck size={16} color="#0d9488" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('rahul_sharma', 'Student@123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', flexDirection: 'column', gap: '3px', padding: '8px 4px' }}
            >
              <UserCheck size={16} color="#2563eb" />
              <span>Resident</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('staff_rajesh', 'Staff@123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', flexDirection: 'column', gap: '3px', padding: '8px 4px' }}
            >
              <Wrench size={16} color="#d97706" />
              <span>Staff</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
