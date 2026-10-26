import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from database import db
from models import Visitor, Resident, get_utc_now
from utils.auth_middleware import token_required, role_required
from utils.audit_logger import log_audit
from utils.qr_generator import generate_qr_code_image
from utils.email_service import send_notification

visitor_bp = Blueprint('visitors', __name__, url_prefix='/api/visitors')

@visitor_bp.route('', methods=['GET'])
@token_required
def get_visitors(current_user):
    status = request.args.get('status')
    query = Visitor.query

    # Resident only views visitors coming to meet them
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

    visitors = query.order_by(Visitor.visit_date.desc(), Visitor.id.desc()).all()

    return jsonify({
        'success': True,
        'count': len(visitors),
        'visitors': [v.to_dict() for v in visitors]
    }), 200

@visitor_bp.route('', methods=['POST'])
@token_required
def register_visitor(current_user):
    data = request.get_json() or {}
    visitor_name = data.get('visitor_name', '').strip()
    visitor_phone = data.get('visitor_phone', '').strip()
    relationship = data.get('relationship', '').strip()
    purpose = data.get('purpose', '').strip()
    visit_date_str = data.get('visit_date')
    expected_time = data.get('expected_time', '10:00 AM')

    if not visitor_name or not visitor_phone or not relationship or not purpose or not visit_date_str:
        return jsonify({'success': False, 'message': 'All visitor fields are required'}), 400

    # Determine resident_id
    if current_user.role == 'resident':
        resident_id = current_user.resident_profile.id
    else:
        resident_id = data.get('resident_id')
        if not resident_id:
            return jsonify({'success': False, 'message': 'Resident ID required for admin visitor registration'}), 400

    resident = Resident.query.get_or_404(resident_id)

    try:
        visit_date = datetime.strptime(visit_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # Generate unique pass code & QR image
    pass_code = f"VP-{get_utc_now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    _, qr_base64 = generate_qr_code_image(f"VISITOR_PASS:{pass_code}")

    visitor = Visitor(
        resident_id=resident.id,
        visitor_name=visitor_name,
        visitor_phone=visitor_phone,
        visitor_id_proof=data.get('visitor_id_proof', 'Govt ID'),
        relationship=relationship,
        purpose=purpose,
        visit_date=visit_date,
        expected_time=expected_time,
        pass_code=pass_code,
        qr_code_path=qr_base64,
        status='pending'
    )
    db.session.add(visitor)
    db.session.commit()

    log_audit('REGISTER_VISITOR', 'visitors', visitor.id, f'Visitor {visitor_name} registered for resident {resident.full_name}', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': 'Visitor registered successfully. Waiting for admin approval.',
        'visitor': visitor.to_dict()
    }), 201

@visitor_bp.route('/<int:visitor_id>/approve', methods=['PUT'])
@role_required(['admin', 'staff'])
def approve_visitor(current_user, visitor_id):
    visitor = Visitor.query.get_or_404(visitor_id)
    visitor.status = 'approved'
    visitor.approved_by = current_user.id
    db.session.commit()

    log_audit('APPROVE_VISITOR', 'visitors', visitor.id, f'Approved visitor {visitor.visitor_name} with pass {visitor.pass_code}', user_id=current_user.id)

    # In-app notification to resident
    if visitor.resident and visitor.resident.user_id:
        send_notification(
            user_id=visitor.resident.user_id,
            title='Visitor Request Approved',
            message=f'Your visitor {visitor.visitor_name} has been approved for visit on {visitor.visit_date}. Pass Code: {visitor.pass_code}',
            notif_type='visitor'
        )

    return jsonify({
        'success': True,
        'message': 'Visitor request approved',
        'visitor': visitor.to_dict()
    }), 200

@visitor_bp.route('/<int:visitor_id>/reject', methods=['PUT'])
@role_required(['admin', 'staff'])
def reject_visitor(current_user, visitor_id):
    visitor = Visitor.query.get_or_404(visitor_id)
    data = request.get_json() or {}
    reason = data.get('reason', 'Administrative decision')

    visitor.status = 'rejected'
    visitor.remarks = reason
    db.session.commit()

    log_audit('REJECT_VISITOR', 'visitors', visitor.id, f'Rejected visitor {visitor.visitor_name}. Reason: {reason}', user_id=current_user.id)

    if visitor.resident and visitor.resident.user_id:
        send_notification(
            user_id=visitor.resident.user_id,
            title='Visitor Request Rejected',
            message=f'Your visitor request for {visitor.visitor_name} was rejected. Reason: {reason}',
            notif_type='visitor'
        )

    return jsonify({
        'success': True,
        'message': 'Visitor request rejected',
        'visitor': visitor.to_dict()
    }), 200

@visitor_bp.route('/check-in', methods=['POST'])
@role_required(['admin', 'staff'])
def check_in_visitor(current_user):
    data = request.get_json() or {}
    pass_code = data.get('pass_code', '').strip()

    if not pass_code:
        return jsonify({'success': False, 'message': 'Pass code is required'}), 400

    visitor = Visitor.query.filter_by(pass_code=pass_code).first()
    if not visitor:
        return jsonify({'success': False, 'message': 'Visitor pass code not found'}), 404

    if visitor.status != 'approved':
        return jsonify({'success': False, 'message': f'Cannot check in visitor with status: {visitor.status}'}), 400

    visitor.actual_check_in = get_utc_now()
    visitor.status = 'checked_in'
    db.session.commit()

    log_audit('VISITOR_CHECK_IN', 'visitors', visitor.id, f'Visitor {visitor.visitor_name} checked in', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': f'Visitor {visitor.visitor_name} checked in successfully',
        'visitor': visitor.to_dict()
    }), 200

@visitor_bp.route('/check-out', methods=['POST'])
@role_required(['admin', 'staff'])
def check_out_visitor(current_user):
    data = request.get_json() or {}
    pass_code = data.get('pass_code', '').strip()

    if not pass_code:
        return jsonify({'success': False, 'message': 'Pass code is required'}), 400

    visitor = Visitor.query.filter_by(pass_code=pass_code).first()
    if not visitor:
        return jsonify({'success': False, 'message': 'Visitor pass code not found'}), 404

    if visitor.status != 'checked_in':
        return jsonify({'success': False, 'message': f'Visitor is currently {visitor.status}, not checked in'}), 400

    visitor.actual_check_out = get_utc_now()
    visitor.status = 'checked_out'
    db.session.commit()

    log_audit('VISITOR_CHECK_OUT', 'visitors', visitor.id, f'Visitor {visitor.visitor_name} checked out', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': f'Visitor {visitor.visitor_name} checked out successfully',
        'visitor': visitor.to_dict()
    }), 200
