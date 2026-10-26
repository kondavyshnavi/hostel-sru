from flask import Blueprint, request, jsonify
from database import db
from models import UtilityRecord, Hostel
from utils.auth_middleware import token_required, role_required
from utils.audit_logger import log_audit

utility_bp = Blueprint('utilities', __name__, url_prefix='/api/utilities')

@utility_bp.route('', methods=['GET'])
@token_required
def get_utility_records(current_user):
    hostel_id = request.args.get('hostel_id')
    query = UtilityRecord.query

    if hostel_id:
        query = query.filter_by(hostel_id=int(hostel_id))

    records = query.order_by(UtilityRecord.billing_month.desc()).all()

    return jsonify({
        'success': True,
        'count': len(records),
        'records': [r.to_dict() for r in records]
    }), 200

@utility_bp.route('', methods=['POST'])
@role_required(['admin', 'staff'])
def log_utility_record(current_user):
    data = request.get_json() or {}
    hostel_id = data.get('hostel_id')
    billing_month = data.get('billing_month', '').strip()  # '2026-08'
    electricity_kwh = float(data.get('electricity_kwh', 0))
    electricity_cost = float(data.get('electricity_cost', 0))
    water_liters = float(data.get('water_liters', 0))
    water_cost = float(data.get('water_cost', 0))

    if not hostel_id or not billing_month:
        return jsonify({'success': False, 'message': 'Hostel and billing month are required'}), 400

    hostel = Hostel.query.get(hostel_id)
    if not hostel:
        return jsonify({'success': False, 'message': 'Hostel not found'}), 404

    existing = UtilityRecord.query.filter_by(hostel_id=hostel_id, billing_month=billing_month).first()
    if existing:
        return jsonify({'success': False, 'message': f'Utility record for {hostel.name} in {billing_month} already exists. Update it instead.'}), 409

    record = UtilityRecord(
        hostel_id=hostel_id,
        billing_month=billing_month,
        electricity_kwh=electricity_kwh,
        electricity_cost=electricity_cost,
        water_liters=water_liters,
        water_cost=water_cost,
        logged_by=current_user.username,
        notes=data.get('notes', '')
    )
    db.session.add(record)
    db.session.commit()

    log_audit('LOG_UTILITY', 'utility_records', record.id, f'Logged utility consumption for {hostel.name} ({billing_month})', user_id=current_user.id)

    return jsonify({
        'success': True,
        'message': 'Utility record added successfully',
        'record': record.to_dict()
    }), 201
