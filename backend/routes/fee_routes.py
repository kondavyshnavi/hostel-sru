import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from database import db
from models import Fee, Payment, Resident
from utils.auth_middleware import token_required, role_required
from utils.audit_logger import log_audit
from utils.email_service import send_notification

fee_bp = Blueprint('fees', __name__, url_prefix='/api/fees')

@fee_bp.route('', methods=['GET'])
@token_required
def get_fees(current_user):
    status = request.args.get('status')
    fee_type = request.args.get('fee_type')
    term = request.args.get('term')

    query = Fee.query

    # Residents see only their own fees
    if current_user.role == 'resident':
        if not current_user.resident_profile:
            return jsonify({'success': False, 'message': 'Resident profile not found'}), 404
        query = query.filter_by(resident_id=current_user.resident_profile.id)
    else:
        resident_id = request.args.get('resident_id')
        if resident_id:
            query = query.filter_by(resident_id=int(resident_id))

    if status:
        query = query.filter_by(status=status)
    if fee_type:
        query = query.filter_by(fee_type=fee_type)
    if term:
        query = query.filter_by(academic_term=term)

    fees = query.order_by(Fee.due_date.desc()).all()
    
    # Auto refresh overdue status if past due date and pending
    today = datetime.now(timezone.utc).date()
    for f in fees:
        if f.status == 'pending' and f.due_date < today:
            f.status = 'overdue'
    db.session.commit()

    return jsonify({
        'success': True,
        'count': len(fees),
        'fees': [f.to_dict() for f in fees]
    }), 200

@fee_bp.route('/<int:fee_id>', methods=['GET'])
@token_required
def get_fee(current_user, fee_id):
    fee = Fee.query.get_or_404(fee_id)
    if current_user.role == 'resident' and current_user.resident_profile.id != fee.resident_id:
        return jsonify({'success': False, 'message': 'Unauthorized access'}), 403

    fee_dict = fee.to_dict()
    fee_dict['payments'] = [p.to_dict() for p in fee.payments]
    return jsonify({'success': True, 'fee': fee_dict}), 200

@fee_bp.route('', methods=['POST'])
@role_required('admin')
def create_fee(current_user):
    data = request.get_json() or {}
    resident_id = data.get('resident_id')
    fee_type = data.get('fee_type', 'semester_fee')
    amount = float(data.get('amount', 0))
    due_date_str = data.get('due_date')
    academic_term = data.get('academic_term', '2026-Odd')

    if not resident_id or amount <= 0 or not due_date_str:
        return jsonify({'success': False, 'message': 'Resident ID, valid amount, and due date are required'}), 400

    resident = Resident.query.get(resident_id)
    if not resident:
        return jsonify({'success': False, 'message': 'Resident not found'}), 404

    try:
        due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    fee = Fee(
        resident_id=resident.id,
        fee_type=fee_type,
        amount=amount,
        due_date=due_date,
        academic_term=academic_term,
        status='pending'
    )
    db.session.add(fee)
    db.session.commit()

    log_audit('CREATE_FEE', 'fees', fee.id, f'Assigned {fee_type} of ₹{amount} to {resident.full_name}', user_id=current_user.id)

    # In-app notification to resident
    if resident.user_id:
        send_notification(
            user_id=resident.user_id,
            title='New Fee Invoiced',
            message=f'A new {fee_type.replace("_", " ").title()} of ₹{amount:,.2f} has been generated. Due date: {due_date}.',
            notif_type='fee'
        )

    return jsonify({'success': True, 'fee': fee.to_dict()}), 201

@fee_bp.route('/pay', methods=['POST'])
@token_required
def pay_fee(current_user):
    """
    Simulated secure payment sandbox.
    Never stores sensitive debit/credit card info.
    Generates a unique transaction ref and printable receipt number.
    """
    data = request.get_json() or {}
    fee_id = data.get('fee_id')
    amount_paid = float(data.get('amount_paid', 0))
    payment_method = data.get('payment_method', 'upi')  # upi, card, online, bank_transfer, cash

    if not fee_id or amount_paid <= 0:
        return jsonify({'success': False, 'message': 'Fee ID and valid payment amount are required'}), 400

    fee = Fee.query.get_or_404(fee_id)

    # Resident can only pay their own fee
    if current_user.role == 'resident' and current_user.resident_profile.id != fee.resident_id:
        return jsonify({'success': False, 'message': 'Unauthorized access to pay this fee'}), 403

    balance = fee.amount - fee.total_paid
    if amount_paid > balance:
        return jsonify({'success': False, 'message': f'Payment amount (₹{amount_paid}) exceeds pending balance (₹{balance})'}), 400

    # Generate unique receipt and transaction references
    txn_ref = f"TXN-{uuid.uuid4().hex[:10].upper()}"
    receipt_no = f"RCP-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    payment = Payment(
        fee_id=fee.id,
        resident_id=fee.resident_id,
        amount_paid=amount_paid,
        payment_method=payment_method,
        transaction_ref=txn_ref,
        payment_status='success',
        receipt_number=receipt_no,
        payment_date=datetime.now(timezone.utc),
        notes=data.get('notes', 'Simulated payment completed successfully.')
    )
    db.session.add(payment)
    db.session.flush()

    # Recalculate fee status
    fee.update_status()
    db.session.commit()

    log_audit('FEE_PAYMENT', 'payments', payment.id, f'Payment of ₹{amount_paid} received for fee {fee.id}. Receipt: {receipt_no}', user_id=current_user.id)

    # Notification
    resident = fee.resident
    if resident and resident.user_id:
        send_notification(
            user_id=resident.user_id,
            title='Payment Received',
            message=f'Your payment of ₹{amount_paid:,.2f} for {fee.fee_type} was successful. Receipt No: {receipt_no}.',
            notif_type='fee'
        )

    return jsonify({
        'success': True,
        'message': 'Payment successful',
        'payment': payment.to_dict(),
        'fee': fee.to_dict()
    }), 200

@fee_bp.route('/receipt/<string:receipt_number>', methods=['GET'])
@token_required
def get_receipt(current_user, receipt_number):
    payment = Payment.query.filter_by(receipt_number=receipt_number).first_or_404()
    if current_user.role == 'resident' and current_user.resident_profile.id != payment.resident_id:
        return jsonify({'success': False, 'message': 'Unauthorized access'}), 403

    fee = payment.fee
    resident = payment.resident
    current_room = resident.current_room

    receipt_data = {
        'receipt_number': payment.receipt_number,
        'transaction_ref': payment.transaction_ref,
        'payment_date': payment.payment_date.strftime('%d-%b-%Y %I:%M %p') if payment.payment_date else '',
        'payment_method': payment.payment_method.upper(),
        'amount_paid': float(payment.amount_paid),
        'resident_name': resident.full_name,
        'enrollment_no': resident.enrollment_no,
        'course_branch': f"{resident.course} ({resident.branch})",
        'room': f"{current_room.room_number} ({current_room.hostel.name})" if current_room else 'Unallocated',
        'fee_type': fee.fee_type.replace('_', ' ').title(),
        'academic_term': fee.academic_term,
        'total_fee_amount': float(fee.amount),
        'remaining_balance': float(fee.amount - fee.total_paid),
        'institution_name': 'SR University Hostel & Residential Services',
        'institution_address': 'Warangal Campus, Telangana, India'
    }

    return jsonify({'success': True, 'receipt': receipt_data}), 200

@fee_bp.route('/summary', methods=['GET'])
@role_required('admin')
def get_fee_summary(current_user):
    fees = Fee.query.all()
    total_invoiced = sum(f.amount for f in fees)
    total_collected = sum(p.amount_paid for p in Payment.query.filter_by(payment_status='success').all())
    total_pending = total_invoiced - total_collected
    
    today = datetime.now(timezone.utc).date()
    overdue_count = sum(1 for f in fees if f.status == 'overdue' or (f.status == 'pending' and f.due_date < today))

    return jsonify({
        'success': True,
        'summary': {
            'total_invoiced': float(total_invoiced),
            'total_collected': float(total_collected),
            'total_pending': float(max(total_pending, 0)),
            'overdue_count': overdue_count,
            'total_invoices': len(fees)
        }
    }), 200
