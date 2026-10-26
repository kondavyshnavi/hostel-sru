from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from database import db
from models import Hostel, Room, RoomAllocation, Resident, get_utc_today, get_utc_now
from utils.auth_middleware import token_required, role_required
from utils.audit_logger import log_audit
from utils.email_service import send_notification

room_bp = Blueprint('rooms', __name__, url_prefix='/api')

# --- Hostels Endpoints ---
@room_bp.route('/hostels', methods=['GET'])
@token_required
def get_hostels(current_user):
    hostels = Hostel.query.all()
    return jsonify({
        'success': True,
        'hostels': [h.to_dict() for h in hostels]
    }), 200

@room_bp.route('/hostels', methods=['POST'])
@role_required('admin')
def create_hostel(current_user):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    code = data.get('code', '').strip().upper()

    if not name or not code:
        return jsonify({'success': False, 'message': 'Hostel name and code are required'}), 400

    if Hostel.query.filter_by(code=code).first():
        return jsonify({'success': False, 'message': 'Hostel code already exists'}), 409

    hostel = Hostel(
        name=name,
        code=code,
        type=data.get('type', 'boys'),
        total_floors=int(data.get('total_floors', 3)),
        warden_name=data.get('warden_name'),
        warden_contact=data.get('warden_contact'),
        address=data.get('address')
    )
    db.session.add(hostel)
    db.session.commit()
    log_audit('CREATE_HOSTEL', 'hostels', hostel.id, f'Created hostel {name} ({code})', user_id=current_user.id)

    return jsonify({'success': True, 'hostel': hostel.to_dict()}), 201


# --- Rooms Endpoints ---
@room_bp.route('/rooms', methods=['GET'])
@token_required
def get_rooms(current_user):
    hostel_id = request.args.get('hostel_id')
    status = request.args.get('status')
    floor = request.args.get('floor')
    room_type = request.args.get('room_type')

    query = Room.query

    if hostel_id:
        query = query.filter_by(hostel_id=int(hostel_id))
    if status:
        query = query.filter_by(status=status)
    if floor:
        query = query.filter_by(floor=int(floor))
    if room_type:
        query = query.filter_by(room_type=room_type)

    rooms = query.order_by(Room.room_number.asc()).all()
    
    # Sync statuses based on current occupancy
    for r in rooms:
        r.update_occupancy_status()
    db.session.commit()

    return jsonify({
        'success': True,
        'count': len(rooms),
        'rooms': [r.to_dict() for r in rooms]
    }), 200

@room_bp.route('/rooms/<int:room_id>', methods=['GET'])
@token_required
def get_room_details(current_user, room_id):
    room = Room.query.get_or_404(room_id)
    room.update_occupancy_status()
    db.session.commit()

    active_allocations = [
        a.to_dict() for a in room.allocations if a.status == 'active'
    ]
    room_dict = room.to_dict()
    room_dict['occupants'] = active_allocations
    return jsonify({'success': True, 'room': room_dict}), 200

@room_bp.route('/rooms', methods=['POST'])
@role_required('admin')
def create_room(current_user):
    data = request.get_json() or {}
    hostel_id = data.get('hostel_id')
    room_number = data.get('room_number', '').strip()
    capacity = int(data.get('capacity', 2))
    base_fee = float(data.get('base_fee', 25000.0))

    if not hostel_id or not room_number:
        return jsonify({'success': False, 'message': 'Hostel ID and room number are required'}), 400

    hostel = Hostel.query.get(hostel_id)
    if not hostel:
        return jsonify({'success': False, 'message': 'Hostel not found'}), 404

    existing = Room.query.filter_by(hostel_id=hostel_id, room_number=room_number).first()
    if existing:
        return jsonify({'success': False, 'message': f'Room {room_number} already exists in {hostel.name}'}), 409

    room = Room(
        hostel_id=hostel_id,
        room_number=room_number,
        floor=int(data.get('floor', 1)),
        room_type=data.get('room_type', 'double'),
        capacity=capacity,
        base_fee=base_fee,
        status='available'
    )
    db.session.add(room)
    db.session.commit()
    log_audit('CREATE_ROOM', 'rooms', room.id, f'Created room {room_number} in hostel {hostel_id}', user_id=current_user.id)

    return jsonify({'success': True, 'room': room.to_dict()}), 201

@room_bp.route('/rooms/<int:room_id>', methods=['PUT'])
@role_required('admin')
def update_room(current_user, room_id):
    room = Room.query.get_or_404(room_id)
    data = request.get_json() or {}

    if 'capacity' in data:
        new_capacity = int(data['capacity'])
        if new_capacity < room.current_occupancy:
            return jsonify({'success': False, 'message': f'Capacity cannot be lower than current occupants ({room.current_occupancy})'}), 400
        room.capacity = new_capacity

    if 'room_type' in data:
        room.room_type = data['room_type']
    if 'base_fee' in data:
        room.base_fee = float(data['base_fee'])
    if 'status' in data:
        room.status = data['status']
    if 'floor' in data:
        room.floor = int(data['floor'])

    room.update_occupancy_status()
    db.session.commit()
    log_audit('UPDATE_ROOM', 'rooms', room.id, f'Updated room {room.room_number}', user_id=current_user.id)

    return jsonify({'success': True, 'room': room.to_dict()}), 200

@room_bp.route('/rooms/<int:room_id>', methods=['DELETE'])
@role_required('admin')
def delete_room(current_user, room_id):
    room = Room.query.get_or_404(room_id)
    if room.current_occupancy > 0:
        return jsonify({'success': False, 'message': 'Cannot delete room with active resident allocations. Deallocate residents first.'}), 400

    db.session.delete(room)
    db.session.commit()
    log_audit('DELETE_ROOM', 'rooms', room_id, f'Deleted room {room.room_number}', user_id=current_user.id)

    return jsonify({'success': True, 'message': 'Room deleted successfully'}), 200


# --- Room Allocation Endpoints ---
@room_bp.route('/rooms/allocate', methods=['POST'])
@role_required('admin')
def allocate_room(current_user):
    data = request.get_json() or {}
    resident_id = data.get('resident_id')
    room_id = data.get('room_id')
    bed_number = data.get('bed_number', 'A')
    remarks = data.get('remarks', '')

    if not resident_id or not room_id:
        return jsonify({'success': False, 'message': 'Resident ID and Room ID are required'}), 400

    resident = Resident.query.get(resident_id)
    if not resident:
        return jsonify({'success': False, 'message': 'Resident not found'}), 404

    room = Room.query.get(room_id)
    if not room:
        return jsonify({'success': False, 'message': 'Room not found'}), 404

    # Check maintenance
    if room.status == 'maintenance':
        return jsonify({'success': False, 'message': 'Room is currently under maintenance'}), 400

    # Validation: Prevent over-allocation
    if room.current_occupancy >= room.capacity:
        return jsonify({
            'success': False,
            'message': f'Room {room.room_number} is already at full capacity ({room.capacity}/{room.capacity})'
        }), 400

    # Check if resident already has an active allocation
    active_alloc = resident.active_allocation
    if active_alloc:
        return jsonify({
            'success': False,
            'message': f'Resident is already allocated to Room {active_alloc.room.room_number}. Please use room transfer or vacate first.'
        }), 400

    # Create new allocation
    allocation = RoomAllocation(
        resident_id=resident.id,
        room_id=room.id,
        bed_number=bed_number,
        start_date=get_utc_today(),
        status='active',
        remarks=remarks
    )
    db.session.add(allocation)
    room.update_occupancy_status()
    db.session.commit()

    log_audit('ALLOCATE_ROOM', 'room_allocations', allocation.id, f'Allocated {resident.full_name} to Room {room.room_number}', user_id=current_user.id)

    # In-app notification to resident
    if resident.user_id:
        send_notification(
            user_id=resident.user_id,
            title='Room Allocated',
            message=f'You have been successfully allocated to Room {room.room_number} ({room.hostel.name}), Bed {bed_number}.',
            notif_type='allocation'
        )

    return jsonify({
        'success': True,
        'message': f'Resident successfully allocated to Room {room.room_number}',
        'allocation': allocation.to_dict()
    }), 201

@room_bp.route('/rooms/transfer', methods=['POST'])
@role_required('admin')
def transfer_room(current_user):
    data = request.get_json() or {}
    resident_id = data.get('resident_id')
    new_room_id = data.get('new_room_id')
    new_bed = data.get('new_bed', 'A')
    reason = data.get('reason', 'Room transfer requested')

    resident = Resident.query.get_or_404(resident_id)
    new_room = Room.query.get_or_404(new_room_id)

    if new_room.current_occupancy >= new_room.capacity:
        return jsonify({'success': False, 'message': f'Target room {new_room.room_number} is full'}), 400

    # End current active allocation
    current_alloc = resident.active_allocation
    old_room_num = "None"
    if current_alloc:
        old_room_num = current_alloc.room.room_number
        current_alloc.status = 'transferred'
        current_alloc.end_date = get_utc_today()
        if current_alloc.room:
            current_alloc.room.update_occupancy_status()

    # Create new allocation
    new_alloc = RoomAllocation(
        resident_id=resident.id,
        room_id=new_room.id,
        bed_number=new_bed,
        start_date=get_utc_today(),
        status='active',
        remarks=f'Transferred from Room {old_room_num}. Reason: {reason}'
    )
    db.session.add(new_alloc)
    new_room.update_occupancy_status()
    db.session.commit()

    log_audit('TRANSFER_ROOM', 'room_allocations', new_alloc.id, f'Transferred {resident.full_name} from Room {old_room_num} to Room {new_room.room_number}', user_id=current_user.id)

    if resident.user_id:
        send_notification(
            user_id=resident.user_id,
            title='Room Transfer Complete',
            message=f'Your room has been transferred to Room {new_room.room_number} ({new_room.hostel.name}), Bed {new_bed}.',
            notif_type='allocation'
        )

    return jsonify({
        'success': True,
        'message': f'Transferred successfully to Room {new_room.room_number}',
        'allocation': new_alloc.to_dict()
    }), 200

@room_bp.route('/rooms/vacate', methods=['POST'])
@role_required('admin')
def vacate_room(current_user):
    data = request.get_json() or {}
    resident_id = data.get('resident_id')
    reason = data.get('reason', 'Vacated hostel')

    resident = Resident.query.get_or_404(resident_id)
    active_alloc = resident.active_allocation
    if not active_alloc:
        return jsonify({'success': False, 'message': 'Resident does not have an active room allocation'}), 400

    active_alloc.status = 'vacated'
    active_alloc.end_date = get_utc_today()
    active_alloc.remarks = f"{active_alloc.remarks or ''} | Vacated: {reason}".strip()

    room = active_alloc.room
    if room:
        room.update_occupancy_status()

    db.session.commit()
    log_audit('VACATE_ROOM', 'room_allocations', active_alloc.id, f'Vacated {resident.full_name} from Room {room.room_number if room else "N/A"}', user_id=current_user.id)

    if resident.user_id:
        send_notification(
            user_id=resident.user_id,
            title='Room Vacated',
            message=f'Your room allocation has been terminated.',
            notif_type='allocation'
        )

    return jsonify({'success': True, 'message': 'Room vacated successfully'}), 200
