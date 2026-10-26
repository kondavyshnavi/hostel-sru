import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

const Toast = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} color="#059669" />;
      case 'error': return <AlertCircle size={18} color="#e11d48" />;
      default: return <AlertTriangle size={18} color="#0d9488" />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || 'info'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {getIcon(t.type)}
            <span style={{ color: '#0f172a', fontWeight: '500' }}>{t.message}</span>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              marginLeft: '12px'
            }}
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
