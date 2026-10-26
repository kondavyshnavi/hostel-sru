import React from 'react';
import Modal from './Modal';
import { QrCode, Download } from 'lucide-react';

const QRModal = ({ isOpen, onClose, title, qrDataUri, subtitle, footerNote }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    if (!qrDataUri) return;
    const link = document.createElement('a');
    link.href = qrDataUri;
    link.download = `sru_qr_pass_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || "Verification QR Code"} maxWidth="420px">
      <div className="qr-container">
        {subtitle && (
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '16px' }}>
            {subtitle}
          </p>
        )}
        
        {qrDataUri ? (
          <img src={qrDataUri} alt="QR Code" className="qr-image" />
        ) : (
          <div style={{ padding: '40px', color: '#94a3b8' }}>
            <QrCode size={64} />
            <p style={{ marginTop: '10px' }}>Generating QR Code...</p>
          </div>
        )}

        {footerNote && (
          <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '16px', fontWeight: '500' }}>
            {footerNote}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
        {qrDataUri && (
          <button onClick={handleDownload} className="btn btn-primary">
            <Download size={16} /> Save QR Image
          </button>
        )}
      </div>
    </Modal>
  );
};

export default QRModal;
