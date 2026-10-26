from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from database import db
from models import MaintenanceRequest, Resident, User, get_utc_now
from utils.auth_middleware import token_required, role_required
from utils.audit_logger import log_audit
from utils.email_service import send_notification

maintenance_bp = Blueprint('maintenance', __name__, url_prefix='/api/maintenance')

@maintenance_bp.route('', methods=['GET'])
@token_required
def get_maintenance_requests(current_user):
    status = request.args.get('status')
    priority = request.args.get('priority')
    category = request.args.get('category')

    query = MaintenanceRequest.query

    # Resident only views their own requests
    if current_user.role == 'resident':
        if not current_user.resident_profile:
            return jsonify({'success': False, 'message': 'Resident profile not found'}), 404
        query = query.filter_by(resident_id=current_user.resident_profile.id)
    elif current_user.role == 'staff':
        # Staff can view requests assigned to them or unassigned
        view_mode = request.args.get('assigned_only')
        if view_mode == 'true':
            query = query.filter_by(assigned_to=current_user.id)
    else:
        # Admin can filter by resident or assignee
        resident_id = request.args.get('resident_id')
        assigned_to = request.args.get('assigned_to')
        if resident_id:
            query = query.filter_by(resident_id=int(resident_id))
        if assigned_to:
            query = query.filter_by(assigned_to=int(assigned_to))

    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
    if category:
        query = query.filter_by(category=category)

    requests = query.order_by(MaintenanceRequest.created_at.desc()).all()

    return jsonify({
        'success': True,
        'count': len(requests),
        'requests': [r.to_dict() for r in requests]
    }), 200

@maintenance_bp.route('/<int:request_id>', methods=['GET'])
@token_required
def get_single_request(current_user, request_id):
    req = MaintenanceRequest.query.get_or_404(request_id)
    if current_user.role == 'resident' and current_user.resident_profile.id != req.resident_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    return jsonify({'success': True, 'request': req.to_dict()}), 200

@maintenance_bp.route('', methods=['POST'])
@token_required
def create_maintenance_request(current_user):
    data = request.get_json() or {}
    category = data.get('category', 'other')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    priority = data.get('priority', 'medium')

    if not title or not description:
        return jsonify({'success': False, 'message': 'Title and description are required'}), 400

    if current_user.role == 'resident':
        if not current_user.resident_profile:
            return jsonify({'success': False, 'message': 'Resident profile not found'}), 404
        resident = current_user.resident_profile
    else:
        resident_id = data.get('resident_id')
        if not resident_id:
            return jsonify({'success': False, 'message': 'Resident ID is required'}), 400
        resident = Resident.query.get_or_404(resident_id)

    # Automatically associate with current room if allocated
    room_id = data.get('room_id')
    if not room_id and resident.current_room:
        room_id = resident.current_room.id

    req = MaintenanceRequest(
        resident_id=resident.id,
        room_id=room_id,
        category=category,
        title=title,
        description=description,
        priority=priority,
        status='pending'
    )
    db.session.add(req)
    db.session.commit()

    log_audit('CREATE_MAINTENANCE_REQ', 'maintenance_requests', req.id, f'Complaint #{req.id} logged: {title}', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': 'Maintenance request submitted successfully',
        'request': req.to_dict()
    }), 201

@maintenance_bp.route('/<int:request_id>/assign', methods=['PUT'])
@role_required('admin')
def assign_maintenance_request(current_user, request_id):
    req = MaintenanceRequest.query.get_or_404(request_id)
    data = request.get_json() or {}
    staff_user_id = data.get('assigned_to')

    if not staff_user_id:
        return jsonify({'success': False, 'message': 'Staff user ID is required'}), 400

    staff = User.query.get(staff_user_id)
    if not staff or staff.role not in ['staff', 'admin']:
        return jsonify({'success': False, 'message': 'Invalid staff member'}), 400

    req.assigned_to = staff.id
    if req.status == 'pending':
        req.status = 'in_progress'

    db.session.commit()
    log_audit('ASSIGN_MAINTENANCE', 'maintenance_requests', req.id, f'Assigned to {staff.username}', user_id=current_user.id)

    # In-app notification to staff
    send_notification(
        user_id=staff.id,
        title='Maintenance Task Assigned',
        message=f'You have been assigned to Complaint #{req.id}: {req.title} (Priority: {req.priority}).',
        notif_type='maintenance'
    )

    # In-app notification to resident
    if req.resident and req.resident.user_id:
        send_notification(
            user_id=req.resident.user_id,
            title='Maintenance Update',
            message=f'Your complaint #{req.id} ({req.title}) has been assigned to staff member {staff.username} and is now In Progress.',
            notif_type='maintenance'
        )

    return jsonify({
        'success': True,
        'message': f'Assigned successfully to {staff.username}',
        'request': req.to_dict()
    }), 200

@maintenance_bp.route('/<int:request_id>/status', methods=['PUT'])
@role_required(['admin', 'staff'])
def update_maintenance_status(current_user, request_id):
    req = MaintenanceRequest.query.get_or_404(request_id)
    data = request.get_json() or {}
    new_status = data.get('status')
    work_notes = data.get('work_notes')

    if new_status and new_status not in ['pending', 'in_progress', 'resolved', 'cancelled']:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400

    if new_status:
        req.status = new_status
        if new_status == 'resolved':
            req.resolution_date = get_utc_now()

    if work_notes:
        existing_notes = req.work_notes or ''
        timestamp = get_utc_now().strftime('%d-%b %H:%M')
        req.work_notes = f"{existing_notes}\n[{timestamp} - {current_user.username}]: {work_notes}".strip()

    db.session.commit()
    log_audit('UPDATE_MAINTENANCE_STATUS', 'maintenance_requests', req.id, f'Status updated to {req.status}', user_id=current_user.id)

    if req.resident and req.resident.user_id:
        send_notification(
            user_id=req.resident.user_id,
            title=f'Complaint #{req.id} {req.status.replace("_", " ").title()}',
            message=f'Your maintenance request "{req.title}" status has changed to {req.status.replace("_", " ").upper()}. Notes: {work_notes or "Updated by staff."}',
            notif_type='maintenance'
        )

    return jsonify({
        'success': True,
        'message': 'Maintenance status updated successfully',
        'request': req.to_dict()
    }), 200
