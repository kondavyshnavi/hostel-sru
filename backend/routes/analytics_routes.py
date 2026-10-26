import pandas as pd
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from database import db
from models import (
    Room, RoomAllocation, Fee, Payment, Attendance, 
    MaintenanceRequest, FacilityReservation, UtilityRecord, Resident, Hostel
)
from utils.auth_middleware import token_required, role_required

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/overview', methods=['GET'])
@token_required
def get_overview_metrics(current_user):
    """
    Computes key summary cards and KPIs directly from database via Pandas.
    """
    total_residents = Resident.query.filter_by(status='active').count()
    
    rooms = Room.query.all()
    total_rooms = len(rooms)
    total_capacity = sum(r.capacity for r in rooms) if rooms else 0
    active_allocations = RoomAllocation.query.filter_by(status='active').count()
    
    occupied_rooms = sum(1 for r in rooms if r.current_occupancy >= r.capacity)
    available_rooms = sum(1 for r in rooms if r.current_occupancy < r.capacity and r.status != 'maintenance')
    maintenance_rooms = sum(1 for r in rooms if r.status == 'maintenance')
    
    occupancy_rate = round((active_allocations / total_capacity * 100), 1) if total_capacity > 0 else 0.0

    # Fee metrics
    fees = Fee.query.all()
    payments = Payment.query.filter_by(payment_status='success').all()
    
    total_invoiced = sum(f.amount for f in fees)
    total_collected = sum(p.amount_paid for p in payments)
    pending_fees = max(total_invoiced - total_collected, 0)
    
    today = datetime.now(timezone.utc).date()
    overdue_count = sum(1 for f in fees if f.status == 'overdue' or (f.status == 'pending' and f.due_date < today))

    # Complaints
    open_complaints = MaintenanceRequest.query.filter(MaintenanceRequest.status.in_(['pending', 'in_progress'])).count()
    resolved_complaints = MaintenanceRequest.query.filter_by(status='resolved').count()

    return jsonify({
        'success': True,
        'metrics': {
            'total_residents': total_residents,
            'total_rooms': total_rooms,
            'total_capacity': total_capacity,
            'current_occupancy': active_allocations,
            'occupancy_rate': occupancy_rate,
            'available_rooms': available_rooms,
            'occupied_rooms': occupied_rooms,
            'maintenance_rooms': maintenance_rooms,
            'total_invoiced': float(total_invoiced),
            'total_collected': float(total_collected),
            'pending_fees': float(pending_fees),
            'overdue_count': overdue_count,
            'open_complaints': open_complaints,
            'resolved_complaints': resolved_complaints
        }
    }), 200

@analytics_bp.route('/occupancy', methods=['GET'])
@token_required
def get_occupancy_analytics(current_user):
    """
    Pandas-based breakdown of occupancy by Hostel and Room Type.
    """
    rooms = Room.query.all()
    if not rooms:
        return jsonify({'success': True, 'by_hostel': [], 'by_type': []})

    data = []
    for r in rooms:
        data.append({
            'hostel_id': r.hostel_id,
            'hostel_name': r.hostel.name if r.hostel else 'Unknown',
            'room_type': r.room_type,
            'capacity': r.capacity,
            'occupied': r.current_occupancy,
            'available': max(r.capacity - r.current_occupancy, 0),
            'status': r.status
        })

    df = pd.DataFrame(data)

    # Group by Hostel
    hostel_grp = df.groupby('hostel_name').agg({
        'capacity': 'sum',
        'occupied': 'sum',
        'available': 'sum'
    }).reset_index()
    hostel_grp['occupancy_pct'] = (hostel_grp['occupied'] / hostel_grp['capacity'] * 100).round(1)

    # Group by Room Type
    type_grp = df.groupby('room_type').agg({
        'capacity': 'sum',
        'occupied': 'sum',
        'available': 'sum'
    }).reset_index()
    type_grp['occupancy_pct'] = (type_grp['occupied'] / type_grp['capacity'] * 100).round(1)

    return jsonify({
        'success': True,
        'by_hostel': hostel_grp.to_dict(orient='records'),
        'by_type': type_grp.to_dict(orient='records'),
        'summary': {
            'total_capacity': int(df['capacity'].sum()),
            'total_occupied': int(df['occupied'].sum()),
            'total_available': int(df['available'].sum())
        }
    }), 200

@analytics_bp.route('/fees', methods=['GET'])
@token_required
def get_fee_analytics(current_user):
    """
    Monthly fee collection trend and status distribution using Pandas.
    """
    payments = Payment.query.filter_by(payment_status='success').all()
    fees = Fee.query.all()

    # Monthly trends from payments
    if payments:
        p_data = [{
            'month': p.payment_date.strftime('%Y-%m'),
            'amount': p.amount_paid,
            'method': p.payment_method
        } for p in payments if p.payment_date]

        p_df = pd.DataFrame(p_data)
        monthly_trend = p_df.groupby('month')['amount'].sum().reset_index().sort_values('month')
        method_dist = p_df.groupby('method')['amount'].sum().reset_index()
    else:
        monthly_trend = pd.DataFrame(columns=['month', 'amount'])
        method_dist = pd.DataFrame(columns=['method', 'amount'])

    # Status distribution
    if fees:
        f_data = [{'status': f.status, 'amount': f.amount} for f in fees]
        f_df = pd.DataFrame(f_data)
        status_dist = f_df.groupby('status').agg({'amount': 'sum', 'status': 'count'}).rename(columns={'status': 'count'}).reset_index()
    else:
        status_dist = pd.DataFrame(columns=['status', 'amount', 'count'])

    return jsonify({
        'success': True,
        'monthly_trend': monthly_trend.to_dict(orient='records'),
        'method_distribution': method_dist.to_dict(orient='records'),
        'status_distribution': status_dist.to_dict(orient='records')
    }), 200

@analytics_bp.route('/attendance-trends', methods=['GET'])
@token_required
def get_attendance_analytics(current_user):
    """
    Attendance trends over recent 14 days using Pandas.
    """
    days = int(request.args.get('days', 14))
    start_date = datetime.now(timezone.utc).date() - timedelta(days=days)

    records = Attendance.query.filter(Attendance.date >= start_date).all()
    if not records:
        return jsonify({'success': True, 'daily_trends': [], 'status_distribution': []})

    data = [{
        'date': r.date.isoformat(),
        'status': r.status,
        'qr_verified': r.qr_verified
    } for r in records]

    df = pd.DataFrame(data)
    
    # Pivot date vs status
    pivot = pd.crosstab(df['date'], df['status']).reset_index()
    
    # Status distribution
    status_summary = df['status'].value_counts().reset_index()
    status_summary.columns = ['status', 'count']

    return jsonify({
        'success': True,
        'daily_trends': pivot.to_dict(orient='records'),
        'status_distribution': status_summary.to_dict(orient='records')
    }), 200

@analytics_bp.route('/complaints', methods=['GET'])
@token_required
def get_complaint_analytics(current_user):
    """
    Complaint categories, resolution rates, and priority analysis using Pandas.
    """
    requests = MaintenanceRequest.query.all()
    if not requests:
        return jsonify({'success': True, 'by_category': [], 'by_priority': [], 'by_status': []})

    data = [{
        'category': r.category,
        'priority': r.priority,
        'status': r.status,
        'resolved': 1 if r.status == 'resolved' else 0
    } for r in requests]

    df = pd.DataFrame(data)

    cat_grp = df.groupby('category').agg({
        'status': 'count',
        'resolved': 'sum'
    }).reset_index().rename(columns={'status': 'total_requests', 'resolved': 'resolved_count'})
    cat_grp['resolution_rate'] = (cat_grp['resolved_count'] / cat_grp['total_requests'] * 100).round(1)

    pri_grp = df['priority'].value_counts().reset_index()
    pri_grp.columns = ['priority', 'count']

    status_grp = df['status'].value_counts().reset_index()
    status_grp.columns = ['status', 'count']

    return jsonify({
        'success': True,
        'by_category': cat_grp.to_dict(orient='records'),
        'by_priority': pri_grp.to_dict(orient='records'),
        'by_status': status_grp.to_dict(orient='records')
    }), 200

@analytics_bp.route('/utilities', methods=['GET'])
@token_required
def get_utility_analytics(current_user):
    """
    Electricity & water consumption trends per month.
    """
    records = UtilityRecord.query.order_by(UtilityRecord.billing_month.asc()).all()
    if not records:
        return jsonify({'success': True, 'records': [], 'monthly_trends': []})

    data = [{
        'month': r.billing_month,
        'hostel': r.hostel.name if r.hostel else 'Main',
        'electricity_kwh': r.electricity_kwh,
        'electricity_cost': r.electricity_cost,
        'water_liters': r.water_liters,
        'water_cost': r.water_cost,
        'total_cost': r.electricity_cost + r.water_cost
    } for r in records]

    df = pd.DataFrame(data)
    monthly = df.groupby('month').agg({
        'electricity_kwh': 'sum',
        'electricity_cost': 'sum',
        'water_liters': 'sum',
        'water_cost': 'sum',
        'total_cost': 'sum'
    }).reset_index()

    return jsonify({
        'success': True,
        'records': data,
        'monthly_trends': monthly.to_dict(orient='records')
    }), 200
