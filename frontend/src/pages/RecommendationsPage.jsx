import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { Sparkles, AlertTriangle, Info, CheckCircle2, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';

const RecommendationsPage = ({ setActiveTab }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await API.get('/recommendations');
        if (res.data.success) {
          setRecommendations(res.data.recommendations);
          setDisclaimer(res.data.disclaimer);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const getBadge = (type) => {
    switch (type) {
      case 'urgent':
        return <span className="badge badge-danger">Urgent Attention</span>;
      case 'warning':
        return <span className="badge badge-warning">Advisory Alert</span>;
      default:
        return <span className="badge badge-info">Optimization Suggestion</span>;
    }
  };

  const getActionTarget = (category) => {
    switch (category) {
      case 'Occupancy & Capacity':
      case 'Room Allocation':
        return 'rooms';
      case 'Maintenance Escalation':
      case 'Preventive Maintenance':
        return 'maintenance';
      case 'Resource Optimization':
        return 'utilities';
      case 'Financial Oversight':
        return 'fees';
      default:
        return 'dashboard';
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Evaluating recommendation rules engine...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI-Assisted Operational Recommendations</h1>
          <p className="page-subtitle">Explainable, rule-based expert system recommendations designed for hostel management</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: '#ccfbf1', 
            color: '#0f766e', 
            padding: '6px 14px', 
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: '700'
          }}>
            <Cpu size={14} /> Rule Engine: 6 Heuristic Modules Active
          </span>
        </div>
      </div>

      {/* Transparent Disclaimer Box */}
      <div style={{
        backgroundColor: '#f0fdfa',
        border: '1px solid #99f6e4',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <Info size={22} color="#0d9488" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: '#134e4a', lineHeight: 1.4 }}>
          <strong>Transparency Notice:</strong> {disclaimer}
        </div>
      </div>

      {/* Recommendations Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {recommendations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ color: '#0f172a' }}>All Operational Indicators Optimal</h3>
            <p style={{ fontSize: '0.88rem', marginTop: '4px' }}>
              No critical room allocation gaps, overdue complaints, or utility anomalies detected at this moment.
            </p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div 
              key={rec.id}
              className="card"
              style={{
                borderLeft: `5px solid ${
                  rec.type === 'urgent' ? '#e11d48' : 
                  rec.type === 'warning' ? '#f59e0b' : '#0d9488'
                }`,
                padding: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                      {rec.category}
                    </span>
                    {getBadge(rec.type)}
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Confidence: <strong>{rec.confidence}</strong>
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.18rem', color: '#0f172a', fontWeight: '800' }}>
                    {rec.title}
                  </h3>
                </div>

                <button
                  onClick={() => setActiveTab(getActionTarget(rec.category))}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px' }}
                >
                  Take Action <ArrowRight size={14} />
                </button>
              </div>

              <div style={{ margin: '14px 0', background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Analytical Reasoning & Root Cause:
                </div>
                <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                  {rec.reasoning}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#0f766e', fontWeight: '600' }}>
                <span style={{ fontWeight: '800' }}>Suggested Protocol:</span>
                <span>{rec.action_recommendation}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecommendationsPage;
