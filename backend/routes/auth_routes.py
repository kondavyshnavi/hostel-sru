from flask import Blueprint, request, jsonify
from database import db
from models import User, Resident
from utils.auth_middleware import generate_token, token_required, role_required
from utils.audit_logger import log_audit
from extensions import limiter

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    role = data.get('role', 'resident').strip().lower()

    if not username or not email or not password:
        return jsonify({'success': False, 'message': 'Username, email, and password are required'}), 400

    if role not in ['admin', 'resident', 'staff']:
        return jsonify({'success': False, 'message': 'Invalid role specified'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username already exists'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already registered'}), 409

    user = User(username=username, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    # If role is resident, create initial profile if details provided
    if role == 'resident':
        full_name = data.get('full_name', username)
        enrollment_no = data.get('enrollment_no', f"SRU{user.id:04d}")
        phone = data.get('phone', '9876543210')
        emergency_contact = data.get('emergency_contact', '9876543211')
        
        resident = Resident(
            user_id=user.id,
            full_name=full_name,
            enrollment_no=enrollment_no,
            phone=phone,
            emergency_contact=emergency_contact,
            course=data.get('course', 'B.Tech CSE'),
            branch=data.get('branch', 'Computer Science & Engineering'),
            year_of_study=int(data.get('year_of_study', 1)),
            gender=data.get('gender', 'male')
        )
        db.session.add(resident)

    db.session.commit()
    log_audit('USER_REGISTERED', 'users', user.id, f'Registered user {username} with role {role}', user_id=user.id)

    token = generate_token(user)
    return jsonify({
        'success': True,
        'message': 'Registration successful',
        'token': token,
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    identifier = data.get('username') or data.get('email', '')
    identifier = identifier.strip()
    password = data.get('password')

    if not identifier or not password:
        return jsonify({'success': False, 'message': 'Username/email and password are required'}), 400

    user = User.query.filter((User.username == identifier) | (User.email == identifier.lower())).first()

    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    if not user.is_active:
        return jsonify({'success': False, 'message': 'Your account has been deactivated. Contact administration.'}), 403

    token = generate_token(user)
    log_audit('USER_LOGIN', 'users', user.id, f'User {user.username} logged in', user_id=user.id)

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    user_data = current_user.to_dict()
    if current_user.role == 'resident' and current_user.resident_profile:
        user_data['resident_details'] = current_user.resident_profile.to_dict()
    return jsonify({
        'success': True,
        'user': user_data
    }), 200

@auth_bp.route('/change-password', methods=['PUT'])
@token_required
def change_password(current_user):
    data = request.get_json() or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not current_password or not new_password:
        return jsonify({'success': False, 'message': 'Current and new password are required'}), 400

    if not current_user.check_password(current_password):
        return jsonify({'success': False, 'message': 'Current password does not match'}), 400

    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters long'}), 400

    current_user.set_password(new_password)
    db.session.commit()
    log_audit('PASSWORD_CHANGE', 'users', current_user.id, 'Password changed successfully', user_id=current_user.id)

    return jsonify({'success': True, 'message': 'Password updated successfully'}), 200

@auth_bp.route('/users', methods=['GET'])
@role_required(['admin', 'staff'])
def get_users(current_user):
    role = request.args.get('role')
    query = User.query.filter_by(is_active=True)
    if role:
        query = query.filter_by(role=role)
    users = query.order_by(User.username.asc()).all()
    return jsonify({
        'success': True,
        'count': len(users),
        'users': [u.to_dict() for u in users]
    }), 200
