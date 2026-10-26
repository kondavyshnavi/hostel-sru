from flask import Blueprint, request, jsonify
from database import db
from models import Resident, User, RoomAllocation, Fee, Attendance
from utils.auth_middleware import token_required, role_required
from utils.audit_logger import log_audit

resident_bp = Blueprint('residents', __name__, url_prefix='/api/residents')

@resident_bp.route('', methods=['GET'])
@token_required
def get_residents(current_user):
    # Allow admin and staff to see all; residents can see their own profile
    if current_user.role == 'resident':
        if not current_user.resident_profile:
            return jsonify({'success': False, 'message': 'Profile not found'}), 404
        return jsonify({'success': True, 'residents': [current_user.resident_profile.to_dict()]}), 200

    # Query params for admin/staff
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip()
    hostel_id = request.args.get('hostel_id', '').strip()
    year = request.args.get('year', '').strip()

    query = Resident.query.join(User)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Resident.full_name.ilike(search_filter)) |
            (Resident.enrollment_no.ilike(search_filter)) |
            (User.email.ilike(search_filter)) |
            (Resident.phone.ilike(search_filter))
        )

    if status:
        query = query.filter(Resident.status == status)

    if year:
        query = query.filter(Resident.year_of_study == int(year))

    residents = query.order_by(Resident.id.desc()).all()

    # If hostel filter provided, filter in-memory by active allocation
    if hostel_id:
        hostel_id = int(hostel_id)
        residents = [r for r in residents if r.current_room and r.current_room.hostel_id == hostel_id]

    return jsonify({
        'success': True,
        'count': len(residents),
        'residents': [r.to_dict() for r in residents]
    }), 200

@resident_bp.route('/<int:resident_id>', methods=['GET'])
@token_required
def get_resident(current_user, resident_id):
    resident = Resident.query.get_or_404(resident_id)
    if current_user.role == 'resident' and current_user.resident_profile.id != resident_id:
        return jsonify({'success': False, 'message': 'Unauthorized access'}), 403

    return jsonify({
        'success': True,
        'resident': resident.to_dict()
    }), 200

@resident_bp.route('', methods=['POST'])
@role_required('admin')
def create_resident(current_user):
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', 'Student@123')
    full_name = data.get('full_name', '').strip()
    enrollment_no = data.get('enrollment_no', '').strip()
    phone = data.get('phone', '').strip()
    emergency_contact = data.get('emergency_contact', '').strip()

    if not username or not email or not full_name or not enrollment_no or not phone or not emergency_contact:
        return jsonify({'success': False, 'message': 'Required fields missing: username, email, full_name, enrollment_no, phone, emergency_contact'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username already exists'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already registered'}), 409

    if Resident.query.filter_by(enrollment_no=enrollment_no).first():
        return jsonify({'success': False, 'message': 'Enrollment number already exists'}), 409

    # Create User account
    user = User(username=username, email=email, role='resident')
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    resident = Resident(
        user_id=user.id,
        full_name=full_name,
        enrollment_no=enrollment_no,
        phone=phone,
        emergency_contact=emergency_contact,
        parent_name=data.get('parent_name'),
        parent_phone=data.get('parent_phone'),
        address=data.get('address'),
        blood_group=data.get('blood_group'),
        course=data.get('course', 'B.Tech CSE'),
        branch=data.get('branch', 'Computer Science & Engineering'),
        year_of_study=int(data.get('year_of_study', 1)),
        gender=data.get('gender', 'male'),
        status='active'
    )
    db.session.add(resident)
    db.session.commit()

    log_audit('CREATE_RESIDENT', 'residents', resident.id, f'Created resident {full_name} ({enrollment_no})', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': 'Resident registered successfully',
        'resident': resident.to_dict()
    }), 201

@resident_bp.route('/<int:resident_id>', methods=['PUT'])
@token_required
def update_resident(current_user, resident_id):
    resident = Resident.query.get_or_404(resident_id)
    if current_user.role == 'resident' and current_user.resident_profile.id != resident_id:
        return jsonify({'success': False, 'message': 'Unauthorized access'}), 403

    data = request.get_json() or {}

    # Fields resident can update: phone, emergency_contact, parent details, address
    if 'phone' in data:
        resident.phone = data['phone'].strip()
    if 'emergency_contact' in data:
        resident.emergency_contact = data['emergency_contact'].strip()
    if 'parent_name' in data:
        resident.parent_name = data['parent_name'].strip()
    if 'parent_phone' in data:
        resident.parent_phone = data['parent_phone'].strip()
    if 'address' in data:
        resident.address = data['address'].strip()

    # Admin only fields
    if current_user.role == 'admin':
        if 'full_name' in data:
            resident.full_name = data['full_name'].strip()
        if 'enrollment_no' in data:
            resident.enrollment_no = data['enrollment_no'].strip()
        if 'course' in data:
            resident.course = data['course']
        if 'branch' in data:
            resident.branch = data['branch']
        if 'year_of_study' in data:
            resident.year_of_study = int(data['year_of_study'])
        if 'blood_group' in data:
            resident.blood_group = data['blood_group']
        if 'gender' in data:
            resident.gender = data['gender']
        if 'status' in data:
            resident.status = data['status']
            if data['status'] == 'inactive' and resident.user:
                resident.user.is_active = False

    db.session.commit()
    log_audit('UPDATE_RESIDENT', 'residents', resident.id, f'Updated resident details for {resident.full_name}', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': 'Resident updated successfully',
        'resident': resident.to_dict()
    }), 200

@resident_bp.route('/<int:resident_id>', methods=['DELETE'])
@role_required('admin')
def deactivate_resident(current_user, resident_id):
    resident = Resident.query.get_or_404(resident_id)
    resident.status = 'inactive'
    if resident.user:
        resident.user.is_active = False

    # Also vacate any active room allocation
    active_alloc = resident.active_allocation
    if active_alloc:
        active_alloc.status = 'vacated'
        if active_alloc.room:
            active_alloc.room.update_occupancy_status()

    db.session.commit()
    log_audit('DEACTIVATE_RESIDENT', 'residents', resident.id, f'Deactivated resident {resident.full_name}', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': 'Resident deactivated successfully'
    }), 200

@resident_bp.route('/<int:resident_id>/history', methods=['GET'])
@token_required
def resident_history(current_user, resident_id):
    resident = Resident.query.get_or_404(resident_id)
    if current_user.role == 'resident' and current_user.resident_profile.id != resident_id:
        return jsonify({'success': False, 'message': 'Unauthorized access'}), 403

    allocations = [a.to_dict() for a in resident.allocations]
    fees = [f.to_dict() for f in resident.fees]
    recent_attendance = [a.to_dict() for a in Attendance.query.filter_by(resident_id=resident.id).order_by(Attendance.date.desc()).limit(30).all()]

    return jsonify({
        'success': True,
        'allocations': allocations,
        'fees': fees,
        'recent_attendance': recent_attendance
    }), 200
