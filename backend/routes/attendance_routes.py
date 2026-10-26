import datetime
from flask import Blueprint, request, jsonify
from database import db
from models import Attendance, Resident
from utils.auth_middleware import token_required, role_required
from utils.audit_logger import log_audit
from utils.qr_generator import generate_qr_code_image

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')

@attendance_bp.route('', methods=['GET'])
@token_required
def get_attendance(current_user):
    date_str = request.args.get('date')
    status = request.args.get('status')
    resident_id = request.args.get('resident_id')

    query = Attendance.query

    # Residents only see their own attendance
    if current_user.role == 'resident':
        if not current_user.resident_profile:
            return jsonify({'success': False, 'message': 'Resident profile not found'}), 404
        query = query.filter_by(resident_id=current_user.resident_profile.id)
    elif resident_id:
        query = query.filter_by(resident_id=int(resident_id))

    if date_str:
        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter_by(date=target_date)
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format'}), 400

    if status:
        query = query.filter_by(status=status)

    records = query.order_by(Attendance.date.desc(), Attendance.id.desc()).all()

    return jsonify({
        'success': True,
        'count': len(records),
        'attendance': [r.to_dict() for r in records]
    }), 200

@attendance_bp.route('', methods=['POST'])
@role_required(['admin', 'staff'])
def mark_attendance(current_user):
    data = request.get_json() or {}
    resident_id = data.get('resident_id')
    date_str = data.get('date', datetime.date.today().isoformat())
    status = data.get('status', 'present')
    remarks = data.get('remarks', '')

    if not resident_id:
        return jsonify({'success': False, 'message': 'Resident ID is required'}), 400

    resident = Resident.query.get(resident_id)
    if not resident:
        return jsonify({'success': False, 'message': 'Resident not found'}), 404

    try:
        att_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format'}), 400

    # Prevent duplicate attendance for the same resident and date
    existing = Attendance.query.filter_by(resident_id=resident_id, date=att_date).first()
    if existing:
        return jsonify({
            'success': False,
            'message': f'Attendance has already been marked for {resident.full_name} on {att_date}. (Current status: {existing.status})'
        }), 409

    now_time = datetime.datetime.now(datetime.timezone.utc).time()
    attendance = Attendance(
        resident_id=resident_id,
        date=att_date,
        status=status,
        marked_by=current_user.username,
        qr_verified=False,
        check_in_time=now_time if status == 'present' else None,
        remarks=remarks
    )
    db.session.add(attendance)
    db.session.commit()

    log_audit('MARK_ATTENDANCE', 'attendance', attendance.id, f'Marked {status} for {resident.full_name} on {att_date}', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': 'Attendance recorded successfully',
        'attendance': attendance.to_dict()
    }), 201

@attendance_bp.route('/bulk', methods=['POST'])
@role_required(['admin', 'staff'])
def mark_bulk_attendance(current_user):
    data = request.get_json() or {}
    date_str = data.get('date', datetime.date.today().isoformat())
    entries = data.get('entries', [])  # list of {resident_id, status, remarks}

    try:
        att_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format'}), 400

    created_count = 0
    skipped_count = 0
    now_time = datetime.datetime.now(datetime.timezone.utc).time()

    for item in entries:
        r_id = item.get('resident_id')
        st = item.get('status', 'present')
        rem = item.get('remarks', '')

        # Check duplicate
        if Attendance.query.filter_by(resident_id=r_id, date=att_date).first():
            skipped_count += 1
            continue

        att = Attendance(
            resident_id=r_id,
            date=att_date,
            status=st,
            marked_by=current_user.username,
            qr_verified=False,
            check_in_time=now_time if st == 'present' else None,
            remarks=rem
        )
        db.session.add(att)
        created_count += 1

    db.session.commit()
    log_audit('BULK_ATTENDANCE', 'attendance', None, f'Bulk marked {created_count} records for {att_date}', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': f'Recorded {created_count} attendance records. {skipped_count} skipped (already recorded).',
        'created_count': created_count,
        'skipped_count': skipped_count
    }), 200

@attendance_bp.route('/daily-qr', methods=['GET'])
@token_required
def get_daily_qr(current_user):
    """
    Generates a daily dynamic QR token for attendance verification at hostel gate.
    """
    today_str = datetime.date.today().isoformat()
    token_payload = f"SRU_ATTENDANCE_TOKEN_{today_str}"
    _, qr_data_uri = generate_qr_code_image(token_payload)

    return jsonify({
        'success': True,
        'date': today_str,
        'token': token_payload,
        'qr_data_uri': qr_data_uri
    }), 200

@attendance_bp.route('/scan-qr', methods=['POST'])
@token_required
def scan_qr_attendance(current_user):
    """
    Resident scans daily QR code to mark attendance.
    """
    if current_user.role != 'resident' or not current_user.resident_profile:
        return jsonify({'success': False, 'message': 'Only registered residents can scan attendance QR'}), 403

    data = request.get_json() or {}
    scanned_token = data.get('token', '').strip()
    today_str = datetime.date.today().isoformat()
    expected_token = f"SRU_ATTENDANCE_TOKEN_{today_str}"

    if scanned_token != expected_token:
        return jsonify({'success': False, 'message': 'Invalid or expired QR code for today'}), 400

    resident_id = current_user.resident_profile.id
    today_date = datetime.date.today()

    existing = Attendance.query.filter_by(resident_id=resident_id, date=today_date).first()
    if existing:
        return jsonify({
            'success': False,
            'message': f'Attendance for today ({today_date}) has already been recorded!'
        }), 409

    now_time = datetime.datetime.now(datetime.timezone.utc).time()
    att = Attendance(
        resident_id=resident_id,
        date=today_date,
        status='present',
        marked_by='qr_self_checkin',
        qr_verified=True,
        check_in_time=now_time,
        remarks='Self checked-in via QR scan'
    )
    db.session.add(att)
    db.session.commit()

    log_audit('QR_ATTENDANCE', 'attendance', att.id, f'Resident {current_user.resident_profile.full_name} checked in via QR', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': 'Attendance marked successfully via QR verification!',
        'attendance': att.to_dict()
    }), 201

@attendance_bp.route('/resident/<int:resident_id>', methods=['GET'])
@token_required
def resident_attendance_stats(current_user, resident_id):
    if current_user.role == 'resident' and current_user.resident_profile.id != resident_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    resident = Resident.query.get_or_404(resident_id)
    records = Attendance.query.filter_by(resident_id=resident.id).order_by(Attendance.date.desc()).all()

    total_days = len(records)
    present_days = sum(1 for r in records if r.status == 'present')
    absent_days = sum(1 for r in records if r.status == 'absent')
    leave_days = sum(1 for r in records if r.status == 'leave')
    attendance_rate = round((present_days / total_days * 100), 1) if total_days > 0 else 0.0

    return jsonify({
        'success': True,
        'stats': {
            'total_recorded_days': total_days,
            'present_days': present_days,
            'absent_days': absent_days,
            'leave_days': leave_days,
            'attendance_rate': attendance_rate
        },
        'records': [r.to_dict() for r in records[:30]]
    }), 200
