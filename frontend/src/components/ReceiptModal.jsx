import React from 'react';
import Modal from './Modal';
import { Printer, CheckCircle } from 'lucide-react';

const ReceiptModal = ({ isOpen, onClose, receipt }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Fee Payment Receipt" maxWidth="620px">
      <div className="receipt-box" id="printable-receipt">
        <div className="receipt-header">
          <div style={{ fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.08em', color: '#0d9488', textTransform: 'uppercase' }}>
            SR UNIVERSITY
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
            Hostel & Residential Services
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Warangal Campus, Telangana - 506371
          </div>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: '#d1fae5', 
            color: '#065f46', 
            padding: '4px 12px', 
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: '700',
            marginTop: '10px'
          }}>
            <CheckCircle size={14} /> PAYMENT COMPLETED
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: '#64748b' }}>Receipt Number:</span>
            <div style={{ fontWeight: '700', color: '#0f172a' }}>{receipt.receipt_number}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Transaction Ref:</span>
            <div style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>{receipt.transaction_ref}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Payment Date:</span>
            <div style={{ fontWeight: '600', color: '#0f172a' }}>{receipt.payment_date}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Payment Method:</span>
            <div style={{ fontWeight: '600', color: '#0f172a' }}>{receipt.payment_method}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '14px 0', margin: '14px 0', fontSize: '0.85rem' }}>
          <div className="receipt-row">
            <span style={{ color: '#64748b' }}>Resident Name:</span>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>{receipt.resident_name}</span>
          </div>
          <div className="receipt-row">
            <span style={{ color: '#64748b' }}>Enrollment No:</span>
            <span style={{ fontWeight: '600' }}>{receipt.enrollment_no}</span>
          </div>
          <div className="receipt-row">
            <span style={{ color: '#64748b' }}>Program & Branch:</span>
            <span>{receipt.course_branch}</span>
          </div>
          <div className="receipt-row">
            <span style={{ color: '#64748b' }}>Allocated Room:</span>
            <span style={{ fontWeight: '600' }}>{receipt.room}</span>
          </div>
          <div className="receipt-row">
            <span style={{ color: '#64748b' }}>Fee Category:</span>
            <span>{receipt.fee_type} ({receipt.academic_term})</span>
          </div>
        </div>

        <div className="receipt-total receipt-row">
          <span>Amount Paid:</span>
          <span style={{ color: '#0d9488' }}>₹{receipt.amount_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="receipt-row" style={{ fontSize: '0.82rem', color: '#64748b' }}>
          <span>Remaining Balance:</span>
          <span>₹{receipt.remaining_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
          This is an electronically generated receipt verified by SRU Hostel System. No physical signature required.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
        <button onClick={handlePrint} className="btn btn-primary">
          <Printer size={16} /> Print Receipt
        </button>
      </div>
    </Modal>
  );
};

export default ReceiptModal;
