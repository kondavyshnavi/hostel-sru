import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ReceiptModal from '../components/ReceiptModal';
import { Receipt, Plus, CreditCard, Printer, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const FeesManagement = ({ showToast }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [payModal, setPayModal] = useState(false);
  const [createFeeModal, setCreateFeeModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [residents, setResidents] = useState([]);

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('upi');

  // Create Fee Form
  const [feeForm, setFeeForm] = useState({
    resident_id: '',
    fee_type: 'semester_fee',
    amount: 35000,
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    academic_term: '2026-Odd'
  });

  const fetchData = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [fRes, sRes] = await Promise.all([
        API.get('/fees', { params }),
        isAdmin ? API.get('/fees/summary') : Promise.resolve({ data: { success: false } })
      ]);

      if (fRes.data.success) setFees(fRes.data.fees);
      if (sRes.data.success) setSummary(sRes.data.summary);

      if (isAdmin) {
        const rRes = await API.get('/residents?status=active');
        if (rRes.data.success) setResidents(rRes.data.residents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const openPayModal = (fee) => {
    setSelectedFee(fee);
    setPaymentAmount(fee.balance);
    setPaymentMethod('upi');
    setPayModal(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedFee) return;

    try {
      const res = await API.post('/fees/pay', {
        fee_id: selectedFee.id,
        amount_paid: paymentAmount,
        payment_method: paymentMethod
      });

      if (res.data.success) {
        showToast('success', 'Simulated payment completed! Receipt generated.');
        setPayModal(false);
        fetchData();
        // Open receipt modal
        const rRes = await API.get(`/fees/receipt/${res.data.payment.receipt_number}`);
        if (rRes.data.success) {
          setCurrentReceipt(rRes.data.receipt);
          setReceiptModal(true);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment simulation failed';
      showToast('error', msg);
    }
  };

  const handleOpenReceipt = async (fee) => {
    try {
      const feeDetail = await API.get(`/fees/${fee.id}`);
      if (feeDetail.data.success && feeDetail.data.fee.payments?.length > 0) {
        const latestP = feeDetail.data.fee.payments[0];
        const rRes = await API.get(`/fees/receipt/${latestP.receipt_number}`);
        if (rRes.data.success) {
          setCurrentReceipt(rRes.data.receipt);
          setReceiptModal(true);
        }
      } else {
        showToast('error', 'No payments recorded for this invoice yet.');
      }
    } catch (e) {
      showToast('error', 'Failed to retrieve receipt');
    }
  };

  const handleCreateFee = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/fees', feeForm);
      if (res.data.success) {
        showToast('success', 'Fee invoice generated and assigned!');
        setCreateFeeModal(false);
        fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create fee';
      showToast('error', msg);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fee Collection & Invoicing</h1>
          <p className="page-subtitle">Track hostel dues, process simulated payments, and generate printable receipts</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => {
              setFeeForm({
                resident_id: residents.length > 0 ? residents[0].id : '',
                fee_type: 'semester_fee',
                amount: 35000,
                due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                academic_term: '2026-Odd'
              });
              setCreateFeeModal(true);
            }} 
            className="btn btn-primary"
          >
            <Plus size={16} /> Generate Fee Invoice
          </button>
        )}
      </div>

      {/* Summary KPI Strip for Admin */}
      {isAdmin && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Invoiced</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
              ₹{summary.total_invoiced.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Collected</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
              ₹{summary.total_collected.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Pending Balance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#d97706', marginTop: '2px' }}>
              ₹{summary.total_pending.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Overdue Invoices</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#e11d48', marginTop: '2px' }}>
              {summary.overdue_count}
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Invoice Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="partially_paid">Partially Paid</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Resident</th>
              <th>Fee Category</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No fee records found.
                </td>
              </tr>
            ) : (
              fees.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>#INV-{f.id.toString().padStart(4, '0')}</td>
                  <td>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{f.resident_name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{f.enrollment_no}</div>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize' }}>
                      {f.fee_type.replace('_', ' ')}
                    </span>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{f.academic_term}</div>
                  </td>
                  <td style={{ fontWeight: '700' }}>₹{f.amount.toLocaleString('en-IN')}</td>
                  <td style={{ color: '#059669', fontWeight: '600' }}>₹{f.total_paid.toLocaleString('en-IN')}</td>
                  <td style={{ color: f.balance > 0 ? '#e11d48' : '#64748b', fontWeight: '700' }}>
                    ₹{f.balance.toLocaleString('en-IN')}
                  </td>
                  <td>{f.due_date}</td>
                  <td>
                    <span className={`badge ${
                      f.status === 'paid' ? 'badge-success' : 
                      f.status === 'overdue' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {f.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {f.balance > 0 && (
                        <button
                          onClick={() => openPayModal(f)}
                          className="btn btn-primary btn-sm"
                          title="Simulate Payment"
                        >
                          <CreditCard size={14} /> Pay
                        </button>
                      )}
                      {f.total_paid > 0 && (
                        <button
                          onClick={() => handleOpenReceipt(f)}
                          className="btn btn-secondary btn-sm"
                          title="Print Receipt"
                        >
                          <Printer size={14} /> Receipt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Sandbox Modal */}
      <Modal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        title="Simulated Payment Sandbox"
        maxWidth="500px"
      >
        <form onSubmit={handleProcessPayment}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Invoice Target:</span>
              <span style={{ fontWeight: '700' }}>#{selectedFee?.id} - {selectedFee?.fee_type?.replace('_', ' ')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Resident:</span>
              <span style={{ fontWeight: '600' }}>{selectedFee?.resident_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '8px' }}>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>Total Due:</span>
              <span style={{ fontWeight: '800', color: '#0d9488', fontSize: '1.1rem' }}>
                ₹{selectedFee?.balance?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Amount (₹) *</label>
            <input
              type="number"
              className="form-control"
              required
              min="1"
              max={selectedFee?.balance}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Sandbox Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {['upi', 'card', 'online'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`btn ${paymentMethod === m ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ textTransform: 'uppercase', padding: '10px' }}
                >
                  {m === 'upi' ? 'UPI / QR' : m === 'card' ? 'Debit Card' : 'Net Banking'}
                </button>
              ))}
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '14px 0', textAlign: 'center' }}>
            🔒 Safe Sandbox Mode. No real credit card or bank details are required or stored.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => setPayModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Confirm & Pay ₹{paymentAmount?.toLocaleString('en-IN')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Fee Modal */}
      <Modal
        isOpen={createFeeModal}
        onClose={() => setCreateFeeModal(false)}
        title="Generate Fee Invoice"
        maxWidth="520px"
      >
        <form onSubmit={handleCreateFee}>
          <div className="form-group">
            <label className="form-label">Resident *</label>
            <select
              className="form-control"
              required
              value={feeForm.resident_id}
              onChange={(e) => setFeeForm({ ...feeForm, resident_id: e.target.value })}
            >
              <option value="">-- Select Resident --</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>
                  {r.full_name} ({r.enrollment_no})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fee Type</label>
              <select
                className="form-control"
                value={feeForm.fee_type}
                onChange={(e) => setFeeForm({ ...feeForm, fee_type: e.target.value })}
              >
                <option value="semester_fee">Semester Fee</option>
                <option value="mess_fee">Mess Fee</option>
                <option value="maintenance_fee">Maintenance Fee</option>
                <option value="security_deposit">Security Deposit</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                className="form-control"
                required
                min="1"
                value={feeForm.amount}
                onChange={(e) => setFeeForm({ ...feeForm, amount: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={feeForm.due_date}
                onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Academic Term</label>
              <input
                type="text"
                className="form-control"
                value={feeForm.academic_term}
                onChange={(e) => setFeeForm({ ...feeForm, academic_term: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setCreateFeeModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Generate Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={receiptModal}
        onClose={() => setReceiptModal(false)}
        receipt={currentReceipt}
      />
    </div>
  );
};

export default FeesManagement;
