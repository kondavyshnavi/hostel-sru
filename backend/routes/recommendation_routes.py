from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify
from database import db
from models import (
    Hostel, Room, RoomAllocation, Resident, 
    MaintenanceRequest, UtilityRecord, Fee,
    get_utc_now, get_utc_today
)
from utils.auth_middleware import token_required

recommendation_bp = Blueprint('recommendations', __name__, url_prefix='/api/recommendations')

@recommendation_bp.route('', methods=['GET'])
@token_required
def get_intelligent_recommendations(current_user):
    """
    Generates rule-based, explainable smart hostel management recommendations.
    All recommendations are transparently reasoned and clearly labeled as suggestions.
    """
    recommendations = []
    now = get_utc_now()
    today = get_utc_today()

    # 1. High Occupancy Block Alert (> 85% occupied)
    hostels = Hostel.query.all()
    for h in hostels:
        rooms = h.rooms
        if not rooms:
            continue
        total_cap = sum(r.capacity for r in rooms)
        occupied = sum(r.current_occupancy for r in rooms)
        rate = (occupied / total_cap * 100) if total_cap > 0 else 0
        if rate >= 85.0:
            recommendations.append({
                'id': f"rec-occ-{h.id}",
                'category': 'Occupancy & Capacity',
                'type': 'warning',
                'title': f'High Occupancy Alert: {h.name}',
                'reasoning': f'{h.name} is currently at {rate:.1f}% capacity ({occupied}/{total_cap} beds allocated).',
                'action_recommendation': f'Consider opening overflow blocks or routing new applicants to alternate blocks.',
                'confidence': 'High (Rule-based)'
            })

    # 2. Room Allocation Suggestions for Unallocated Active Residents
    unallocated_residents = [r for r in Resident.query.filter_by(status='active').all() if not r.active_allocation]
    available_rooms = [r for r in Room.query.filter(Room.status == 'available').all() if r.current_occupancy < r.capacity]

    if unallocated_residents and available_rooms:
        sample_resident = unallocated_residents[0]
        # Match gender and available capacity
        suggested_room = next((r for r in available_rooms if (sample_resident.gender == 'female' and r.hostel.type == 'girls') or (sample_resident.gender == 'male' and r.hostel.type == 'boys') or r.hostel.type == 'co-ed'), available_rooms[0])
        
        recommendations.append({
            'id': 'rec-alloc-opt',
            'category': 'Room Allocation',
            'type': 'info',
            'title': f'{len(unallocated_residents)} Residents Awaiting Room Allocation',
            'reasoning': f'Active resident {sample_resident.full_name} ({sample_resident.gender.title()}) has no assigned room while {len(available_rooms)} rooms have open capacity.',
            'action_recommendation': f'Suggested allocation: Place {sample_resident.full_name} in Room {suggested_room.room_number} ({suggested_room.hostel.name}, Floor {suggested_room.floor}). Available spots: {suggested_room.capacity - suggested_room.current_occupancy}.',
            'confidence': 'High (Matching constraint engine)'
        })

    # 3. Prioritize Overdue or Critical Unassigned Maintenance Requests
    critical_requests = MaintenanceRequest.query.filter(
        MaintenanceRequest.status.in_(['pending', 'in_progress']),
        (MaintenanceRequest.priority.in_(['high', 'emergency'])) | (MaintenanceRequest.created_at < now - timedelta(days=2))
    ).all()

    for cr in critical_requests[:3]:
        age_hours = int((now - cr.created_at).total_seconds() // 3600)
        recommendations.append({
            'id': f"rec-maint-{cr.id}",
            'category': 'Maintenance Escalation',
            'type': 'urgent' if cr.priority == 'emergency' else 'warning',
            'title': f'Priority Escalation: Complaint #{cr.id} ({cr.title})',
            'reasoning': f'Issue in Room {cr.room.room_number if cr.room else "General"} logged {age_hours} hours ago is still {cr.status.upper()} (Priority: {cr.priority.upper()}).',
            'action_recommendation': f'Assign immediate maintenance personnel or escalate work notes to campus facility team.',
            'confidence': 'Deterministic'
        })

    # 4. Frequently Reported Maintenance Patterns
    from sqlalchemy import func
    category_counts = db.session.query(
        MaintenanceRequest.category, func.count(MaintenanceRequest.id)
    ).group_by(MaintenanceRequest.category).order_by(func.count(MaintenanceRequest.id).desc()).all()

    if category_counts and category_counts[0][1] >= 3:
        top_cat, top_count = category_counts[0]
        recommendations.append({
            'id': f"rec-pattern-{top_cat}",
            'category': 'Preventive Maintenance',
            'type': 'info',
            'title': f'Frequent Issue Cluster Detected: {top_cat.title()}',
            'reasoning': f'{top_count} complaints logged under category "{top_cat}". Repeated recurring issues indicate infrastructure wear.',
            'action_recommendation': f'Conduct a comprehensive audit and preventive overhaul of {top_cat} systems across hostel wings.',
            'confidence': 'Statistical Pattern'
        })

    # 5. Utility Consumption Anomaly Detection (> 15% increase vs prior month)
    utilities = UtilityRecord.query.order_by(UtilityRecord.billing_month.desc()).limit(6).all()
    if len(utilities) >= 2:
        latest = utilities[0]
        previous = utilities[1]
        if previous.electricity_kwh > 0:
            elec_increase = ((latest.electricity_kwh - previous.electricity_kwh) / previous.electricity_kwh) * 100
            if elec_increase > 15.0:
                recommendations.append({
                    'id': f"rec-util-elec-{latest.id}",
                    'category': 'Resource Optimization',
                    'type': 'warning',
                    'title': f'Electricity Spike in {latest.billing_month}',
                    'reasoning': f'Electricity usage surged by {elec_increase:.1f}% ({latest.electricity_kwh:,.0f} kWh vs {previous.electricity_kwh:,.0f} kWh last month).',
                    'action_recommendation': 'Inspect air conditioning units, corridor lighting timers, and verify hostel sub-meters.',
                    'confidence': 'Analytical (Threshold >15%)'
                })

    # 6. Upcoming Fee Due Dates Alert (within next 7 days)
    upcoming_fees = Fee.query.filter(
        Fee.status.in_(['pending', 'partially_paid']),
        Fee.due_date >= today,
        Fee.due_date <= today + timedelta(days=7)
    ).all()

    if upcoming_fees:
        total_upcoming = sum(f.amount for f in upcoming_fees)
        recommendations.append({
            'id': 'rec-fee-upcoming',
            'category': 'Financial Oversight',
            'type': 'info',
            'title': f'{len(upcoming_fees)} Fees Due Within 7 Days',
            'reasoning': f'Total collectible fees of ₹{total_upcoming:,.2f} are due soon for {len(upcoming_fees)} residents.',
            'action_recommendation': 'Trigger automated email & in-app reminder broadcast to all residents with upcoming deadlines.',
            'confidence': 'Deterministic'
        })

    return jsonify({
        'success': True,
        'count': len(recommendations),
        'disclaimer': 'All recommendations are rule-based system suggestions generated to assist hostel management and should be validated by authorized staff.',
        'recommendations': recommendations
    }), 200
