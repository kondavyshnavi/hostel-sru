from datetime import datetime
from flask import Blueprint, request, jsonify
from database import db
from models import Facility, FacilityReservation, Resident
from utils.auth_middleware import token_required, role_required
from utils.audit_logger import log_audit
from utils.email_service import send_notification

facility_bp = Blueprint('facilities', __name__, url_prefix='/api/facilities')

@facility_bp.route('', methods=['GET'])
@token_required
def get_facilities(current_user):
    facilities = Facility.query.filter_by(is_active=True).all()
    return jsonify({
        'success': True,
        'facilities': [f.to_dict() for f in facilities]
    }), 200

@facility_bp.route('', methods=['POST'])
@role_required('admin')
def create_facility(current_user):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    facility_code = data.get('facility_code', '').strip().upper()
    location = data.get('location', '').strip()
    capacity = int(data.get('capacity', 20))

    if not name or not facility_code or not location:
        return jsonify({'success': False, 'message': 'Name, facility code, and location are required'}), 400

    if Facility.query.filter_by(facility_code=facility_code).first():
        return jsonify({'success': False, 'message': 'Facility code already exists'}), 409

    fac = Facility(
        name=name,
        facility_code=facility_code,
        location=location,
        capacity=capacity,
        description=data.get('description', '')
    )
    db.session.add(fac)
    db.session.commit()
    log_audit('CREATE_FACILITY', 'facilities', fac.id, f'Created facility {name}', user_id=current_user.id)

    return jsonify({'success': True, 'facility': fac.to_dict()}), 201

@facility_bp.route('/reservations', methods=['GET'])
@token_required
def get_reservations(current_user):
    status = request.args.get('status')
    facility_id = request.args.get('facility_id')

    query = FacilityReservation.query

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
    if facility_id:
        query = query.filter_by(facility_id=int(facility_id))

    reservations = query.order_by(FacilityReservation.reservation_date.desc(), FacilityReservation.start_time.asc()).all()

    return jsonify({
        'success': True,
        'count': len(reservations),
        'reservations': [r.to_dict() for r in reservations]
    }), 200

@facility_bp.route('/reserve', methods=['POST'])
@token_required
def reserve_facility(current_user):
    data = request.get_json() or {}
    facility_id = data.get('facility_id')
    res_date_str = data.get('reservation_date')
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')
    purpose = data.get('purpose', '').strip()

    if not facility_id or not res_date_str or not start_time_str or not end_time_str or not purpose:
        return jsonify({'success': False, 'message': 'All reservation fields (facility, date, start time, end time, purpose) are required'}), 400

    facility = Facility.query.get_or_404(facility_id)

    if current_user.role == 'resident':
        if not current_user.resident_profile:
            return jsonify({'success': False, 'message': 'Resident profile not found'}), 404
        resident_id = current_user.resident_profile.id
    else:
        resident_id = data.get('resident_id')
        if not resident_id:
            return jsonify({'success': False, 'message': 'Resident ID required for reservation'}), 400

    try:
        res_date = datetime.strptime(res_date_str, '%Y-%m-%d').date()
        start_time = datetime.strptime(start_time_str, '%H:%M').time()
        end_time = datetime.strptime(end_time_str, '%H:%M').time()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date (YYYY-MM-DD) or time (HH:MM) format'}), 400

    if start_time >= end_time:
        return jsonify({'success': False, 'message': 'Start time must be strictly before end time'}), 400

    # Validation: Prevent conflicting approved reservations for the same facility on the same date and overlapping time
    conflicts = FacilityReservation.query.filter(
        FacilityReservation.facility_id == facility.id,
        FacilityReservation.reservation_date == res_date,
        FacilityReservation.status.in_(['approved', 'pending']),
        FacilityReservation.start_time < end_time,
        FacilityReservation.end_time > start_time
    ).all()

    # If an approved conflict exists, reject immediately
    approved_conflict = next((c for c in conflicts if c.status == 'approved'), None)
    if approved_conflict:
        return jsonify({
            'success': False,
            'message': f'Slot conflict: {facility.name} is already booked from {approved_conflict.start_time.strftime("%H:%M")} to {approved_conflict.end_time.strftime("%H:%M")} on {res_date}. Please choose another slot.'
        }), 409

    reservation = FacilityReservation(
        facility_id=facility.id,
        resident_id=resident_id,
        reservation_date=res_date,
        start_time=start_time,
        end_time=end_time,
        purpose=purpose,
        status='pending'
    )
    db.session.add(reservation)
    db.session.commit()

    log_audit('RESERVE_FACILITY', 'facility_reservations', reservation.id, f'Reservation requested for {facility.name} on {res_date}', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': 'Facility reservation submitted for admin approval',
        'reservation': reservation.to_dict()
    }), 201

@facility_bp.route('/reservations/<int:reservation_id>/status', methods=['PUT'])
@role_required('admin')
def update_reservation_status(current_user, reservation_id):
    reservation = FacilityReservation.query.get_or_404(reservation_id)
    data = request.get_json() or {}
    new_status = data.get('status')  # approved, rejected, cancelled

    if new_status not in ['approved', 'rejected', 'cancelled']:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400

    # If approving, double check no other approved conflict exists
    if new_status == 'approved':
        conflict = FacilityReservation.query.filter(
            FacilityReservation.id != reservation.id,
            FacilityReservation.facility_id == reservation.facility_id,
            FacilityReservation.reservation_date == reservation.reservation_date,
            FacilityReservation.status == 'approved',
            FacilityReservation.start_time < reservation.end_time,
            FacilityReservation.end_time > reservation.start_time
        ).first()

        if conflict:
            return jsonify({
                'success': False,
                'message': f'Cannot approve: conflicts with existing approved reservation #{conflict.id} ({conflict.start_time.strftime("%H:%M")} - {conflict.end_time.strftime("%H:%M")})'
            }), 409

    reservation.status = new_status
    reservation.approved_by = current_user.id
    db.session.commit()

    log_audit('UPDATE_FACILITY_RESERVATION', 'facility_reservations', reservation.id, f'Updated status to {new_status}', user_id=current_user.id)

    # In-app notification to resident
    if reservation.resident and reservation.resident.user_id:
        send_notification(
            user_id=reservation.resident.user_id,
            title=f'Facility Reservation {new_status.title()}',
            message=f'Your reservation request for {reservation.facility.name} on {reservation.reservation_date} ({reservation.start_time.strftime("%H:%M")} - {reservation.end_time.strftime("%H:%M")}) has been {new_status}.',
            notif_type='facility'
        )

    return jsonify({
        'success': True,
        'message': f'Reservation {new_status} successfully',
        'reservation': reservation.to_dict()
    }), 200
