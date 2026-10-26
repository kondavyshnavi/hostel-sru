from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from database import db

def get_utc_now():
    return datetime.now(timezone.utc)

def get_utc_today():
    return datetime.now(timezone.utc).date()

# 1. User Model
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='resident')  # admin, resident, staff
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    updated_at = db.Column(db.DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    resident_profile = db.relationship('Resident', backref='user', uselist=False, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade='all, delete-orphan')
    announcements_created = db.relationship('Announcement', backref='creator', lazy=True)
    assigned_maintenance = db.relationship('MaintenanceRequest', backref='assignee', lazy=True, foreign_keys='MaintenanceRequest.assigned_to')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'resident_id': self.resident_profile.id if self.resident_profile else None
        }


# 2. Hostel Model
class Hostel(db.Model):
    __tablename__ = 'hostels'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    type = db.Column(db.String(20), default='boys')  # boys, girls, co-ed
    total_floors = db.Column(db.Integer, default=1)
    warden_name = db.Column(db.String(100))
    warden_contact = db.Column(db.String(20))
    address = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_utc_now)

    # Relationships
    rooms = db.relationship('Room', backref='hostel', lazy=True, cascade='all, delete-orphan')
    utility_records = db.relationship('UtilityRecord', backref='hostel', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'type': self.type,
            'total_floors': self.total_floors,
            'warden_name': self.warden_name,
            'warden_contact': self.warden_contact,
            'address': self.address,
            'total_rooms': len(self.rooms) if self.rooms else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 3. Room Model
class Room(db.Model):
    __tablename__ = 'rooms'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    hostel_id = db.Column(db.Integer, db.ForeignKey('hostels.id', ondelete='CASCADE'), nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    floor = db.Column(db.Integer, default=1)
    room_type = db.Column(db.String(20), default='double')  # single, double, triple, quad
    capacity = db.Column(db.Integer, default=2, nullable=False)
    base_fee = db.Column(db.Float, default=25000.0, nullable=False)
    status = db.Column(db.String(20), default='available', index=True)  # available, occupied, maintenance
    created_at = db.Column(db.DateTime, default=get_utc_now)

    # Relationships
    allocations = db.relationship('RoomAllocation', backref='room', lazy=True, cascade='all, delete-orphan')
    maintenance_issues = db.relationship('MaintenanceRequest', backref='room', lazy=True)

    __table_args__ = (
        db.UniqueConstraint('hostel_id', 'room_number', name='uq_hostel_room'),
    )

    @property
    def current_occupancy(self):
        return sum(1 for a in self.allocations if a.status == 'active')

    def update_occupancy_status(self):
        occ = self.current_occupancy
        if self.status == 'maintenance':
            return
        if occ >= self.capacity:
            self.status = 'occupied'
        else:
            self.status = 'available'

    def to_dict(self):
        return {
            'id': self.id,
            'hostel_id': self.hostel_id,
            'hostel_name': self.hostel.name if self.hostel else None,
            'hostel_code': self.hostel.code if self.hostel else None,
            'room_number': self.room_number,
            'floor': self.floor,
            'room_type': self.room_type,
            'capacity': self.capacity,
            'current_occupancy': self.current_occupancy,
            'base_fee': float(self.base_fee),
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 4. Resident Model
class Resident(db.Model):
    __tablename__ = 'residents'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    enrollment_no = db.Column(db.String(50), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=False)
    emergency_contact = db.Column(db.String(20), nullable=False)
    parent_name = db.Column(db.String(100))
    parent_phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    blood_group = db.Column(db.String(10))
    course = db.Column(db.String(100), default='B.Tech CSE')
    branch = db.Column(db.String(100), default='Computer Science & Engineering')
    year_of_study = db.Column(db.Integer, default=1)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10), default='male')
    status = db.Column(db.String(20), default='active', index=True)  # active, inactive, alumni
    created_at = db.Column(db.DateTime, default=get_utc_now)
    updated_at = db.Column(db.DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    allocations = db.relationship('RoomAllocation', backref='resident', lazy=True, cascade='all, delete-orphan')
    fees = db.relationship('Fee', backref='resident', lazy=True, cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='resident', lazy=True, cascade='all, delete-orphan')
    attendance_records = db.relationship('Attendance', backref='resident', lazy=True, cascade='all, delete-orphan')
    visitors = db.relationship('Visitor', backref='resident', lazy=True, cascade='all, delete-orphan')
    maintenance_requests = db.relationship('MaintenanceRequest', backref='resident', lazy=True, cascade='all, delete-orphan')
    facility_reservations = db.relationship('FacilityReservation', backref='resident', lazy=True, cascade='all, delete-orphan')

    @property
    def current_room(self):
        active_alloc = next((a for a in self.allocations if a.status == 'active'), None)
        return active_alloc.room if active_alloc else None

    @property
    def active_allocation(self):
        return next((a for a in self.allocations if a.status == 'active'), None)

    def to_dict(self):
        curr_alloc = self.active_allocation
        return {
            'id': self.id,
            'user_id': self.user_id,
            'email': self.user.email if self.user else None,
            'username': self.user.username if self.user else None,
            'full_name': self.full_name,
            'enrollment_no': self.enrollment_no,
            'phone': self.phone,
            'emergency_contact': self.emergency_contact,
            'parent_name': self.parent_name,
            'parent_phone': self.parent_phone,
            'address': self.address,
            'blood_group': self.blood_group,
            'course': self.course,
            'branch': self.branch,
            'year_of_study': self.year_of_study,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'current_room': {
                'room_id': curr_alloc.room.id,
                'room_number': curr_alloc.room.room_number,
                'hostel_id': curr_alloc.room.hostel_id,
                'hostel_name': curr_alloc.room.hostel.name,
                'bed_number': curr_alloc.bed_number
            } if curr_alloc and curr_alloc.room else None
        }


# 5. Room Allocation Model
class RoomAllocation(db.Model):
    __tablename__ = 'room_allocations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False)
    bed_number = db.Column(db.String(10), default='A')
    start_date = db.Column(db.Date, nullable=False, default=get_utc_today)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active', index=True)  # active, transferred, vacated
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'resident_id': self.resident_id,
            'resident_name': self.resident.full_name if self.resident else None,
            'enrollment_no': self.resident.enrollment_no if self.resident else None,
            'room_id': self.room_id,
            'room_number': self.room.room_number if self.room else None,
            'hostel_name': self.room.hostel.name if self.room and self.room.hostel else None,
            'bed_number': self.bed_number,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'remarks': self.remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 6. Fee Model
class Fee(db.Model):
    __tablename__ = 'fees'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False)
    fee_type = db.Column(db.String(50), nullable=False)  # semester_fee, mess_fee, maintenance_fee, security_deposit
    amount = db.Column(db.Float, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='pending', index=True)  # paid, pending, overdue, partially_paid
    academic_term = db.Column(db.String(50), default='2026-Odd')
    created_at = db.Column(db.DateTime, default=get_utc_now)

    payments = db.relationship('Payment', backref='fee', lazy=True, cascade='all, delete-orphan')

    @property
    def total_paid(self):
        return sum(p.amount_paid for p in self.payments if p.payment_status == 'success')

    def update_status(self):
        paid = self.total_paid
        if paid >= self.amount:
            self.status = 'paid'
        elif paid > 0:
            self.status = 'partially_paid'
        elif self.due_date < get_utc_today():
            self.status = 'overdue'
        else:
            self.status = 'pending'

    def to_dict(self):
        return {
            'id': self.id,
            'resident_id': self.resident_id,
            'resident_name': self.resident.full_name if self.resident else None,
            'enrollment_no': self.resident.enrollment_no if self.resident else None,
            'fee_type': self.fee_type,
            'amount': float(self.amount),
            'total_paid': float(self.total_paid),
            'balance': float(self.amount - self.total_paid),
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.status,
            'academic_term': self.academic_term,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 7. Payment Model
class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fee_id = db.Column(db.Integer, db.ForeignKey('fees.id', ondelete='CASCADE'), nullable=False)
    resident_id = db.Column(db.Integer, db.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False)
    amount_paid = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(30), default='upi')  # online, upi, card, bank_transfer, cash
    transaction_ref = db.Column(db.String(100), unique=True, nullable=False)
    payment_status = db.Column(db.String(20), default='success')  # success, failed, pending
    receipt_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    payment_date = db.Column(db.DateTime, default=get_utc_now)
    notes = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'fee_id': self.fee_id,
            'resident_id': self.resident_id,
            'resident_name': self.resident.full_name if self.resident else None,
            'amount_paid': float(self.amount_paid),
            'payment_method': self.payment_method,
            'transaction_ref': self.transaction_ref,
            'payment_status': self.payment_status,
            'receipt_number': self.receipt_number,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'notes': self.notes
        }


# 8. Attendance Model
class Attendance(db.Model):
    __tablename__ = 'attendance'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(20), default='present', index=True)  # present, absent, leave, late
    marked_by = db.Column(db.String(50), default='system')
    qr_verified = db.Column(db.Boolean, default=False, nullable=False)
    check_in_time = db.Column(db.Time)
    remarks = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=get_utc_now)

    __table_args__ = (
        db.UniqueConstraint('resident_id', 'date', name='uq_resident_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'resident_id': self.resident_id,
            'resident_name': self.resident.full_name if self.resident else None,
            'enrollment_no': self.resident.enrollment_no if self.resident else None,
            'date': self.date.isoformat() if self.date else None,
            'status': self.status,
            'marked_by': self.marked_by,
            'qr_verified': self.qr_verified,
            'check_in_time': self.check_in_time.isoformat() if self.check_in_time else None,
            'remarks': self.remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 9. Visitor Model
class Visitor(db.Model):
    __tablename__ = 'visitors'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False)
    visitor_name = db.Column(db.String(120), nullable=False)
    visitor_phone = db.Column(db.String(20), nullable=False)
    visitor_id_proof = db.Column(db.String(50))
    relationship = db.Column(db.String(50), nullable=False)
    purpose = db.Column(db.Text, nullable=False)
    visit_date = db.Column(db.Date, nullable=False)
    expected_time = db.Column(db.String(20), nullable=False)
    actual_check_in = db.Column(db.DateTime)
    actual_check_out = db.Column(db.DateTime)
    pass_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    qr_code_path = db.Column(db.String(255))
    status = db.Column(db.String(20), default='pending', index=True)  # pending, approved, rejected, checked_in, checked_out
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'resident_id': self.resident_id,
            'resident_name': self.resident.full_name if self.resident else None,
            'visitor_name': self.visitor_name,
            'visitor_phone': self.visitor_phone,
            'visitor_id_proof': self.visitor_id_proof,
            'relationship': self.relationship,
            'purpose': self.purpose,
            'visit_date': self.visit_date.isoformat() if self.visit_date else None,
            'expected_time': self.expected_time,
            'actual_check_in': self.actual_check_in.isoformat() if self.actual_check_in else None,
            'actual_check_out': self.actual_check_out.isoformat() if self.actual_check_out else None,
            'pass_code': self.pass_code,
            'qr_code_path': self.qr_code_path,
            'status': self.status,
            'approved_by': self.approved_by,
            'remarks': self.remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 10. Maintenance Request Model
class MaintenanceRequest(db.Model):
    __tablename__ = 'maintenance_requests'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id', ondelete='SET NULL'))
    category = db.Column(db.String(50), nullable=False)  # plumbing, electrical, wifi, cleaning, carpentry, furniture, other
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='medium', index=True)  # low, medium, high, emergency
    status = db.Column(db.String(20), default='pending', index=True)  # pending, in_progress, resolved, cancelled
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    work_notes = db.Column(db.Text)
    resolution_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    updated_at = db.Column(db.DateTime, default=get_utc_now, onupdate=get_utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'resident_id': self.resident_id,
            'resident_name': self.resident.full_name if self.resident else None,
            'room_id': self.room_id,
            'room_number': self.room.room_number if self.room else 'General',
            'hostel_name': self.room.hostel.name if self.room and self.room.hostel else 'N/A',
            'category': self.category,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'assigned_to': self.assigned_to,
            'assignee_name': self.assignee.username if self.assignee else 'Unassigned',
            'work_notes': self.work_notes,
            'resolution_date': self.resolution_date.isoformat() if self.resolution_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# 11. Facility Model
class Facility(db.Model):
    __tablename__ = 'facilities'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    facility_code = db.Column(db.String(30), unique=True, nullable=False)
    description = db.Column(db.Text)
    capacity = db.Column(db.Integer, default=20, nullable=False)
    location = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=get_utc_now)

    reservations = db.relationship('FacilityReservation', backref='facility', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'facility_code': self.facility_code,
            'description': self.description,
            'capacity': self.capacity,
            'location': self.location,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 12. Facility Reservation Model
class FacilityReservation(db.Model):
    __tablename__ = 'facility_reservations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id', ondelete='CASCADE'), nullable=False)
    resident_id = db.Column(db.Integer, db.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False)
    reservation_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    purpose = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending', index=True)  # pending, approved, rejected, cancelled
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=get_utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'facility_id': self.facility_id,
            'facility_name': self.facility.name if self.facility else None,
            'resident_id': self.resident_id,
            'resident_name': self.resident.full_name if self.resident else None,
            'reservation_date': self.reservation_date.isoformat() if self.reservation_date else None,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'purpose': self.purpose,
            'status': self.status,
            'approved_by': self.approved_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 13. Notification Model
class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(30), default='general')  # fee, allocation, visitor, maintenance, facility, general
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    link_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=get_utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'link_url': self.link_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 14. Announcement Model
class Announcement(db.Model):
    __tablename__ = 'announcements'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(150), nullable=False)
    content = db.Column(db.Text, nullable=False)
    target_audience = db.Column(db.String(30), default='all')  # all, residents, staff
    priority = db.Column(db.String(20), default='normal')  # normal, urgent
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    expires_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'target_audience': self.target_audience,
            'priority': self.priority,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }


# 15. Utility Record Model
class UtilityRecord(db.Model):
    __tablename__ = 'utility_records'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    hostel_id = db.Column(db.Integer, db.ForeignKey('hostels.id', ondelete='CASCADE'), nullable=False)
    billing_month = db.Column(db.String(20), nullable=False)  # '2026-08'
    electricity_kwh = db.Column(db.Float, nullable=False)
    electricity_cost = db.Column(db.Float, nullable=False)
    water_liters = db.Column(db.Float, nullable=False)
    water_cost = db.Column(db.Float, nullable=False)
    logged_by = db.Column(db.String(50))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_utc_now)

    __table_args__ = (
        db.UniqueConstraint('hostel_id', 'billing_month', name='uq_hostel_month'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'hostel_id': self.hostel_id,
            'hostel_name': self.hostel.name if self.hostel else None,
            'billing_month': self.billing_month,
            'electricity_kwh': float(self.electricity_kwh),
            'electricity_cost': float(self.electricity_cost),
            'water_liters': float(self.water_liters),
            'water_cost': float(self.water_cost),
            'total_cost': float(self.electricity_cost + self.water_cost),
            'logged_by': self.logged_by,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 16. Audit Log Model
class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=get_utc_now)

    # Relationships
    user = db.relationship('User', backref=db.backref('audit_logs', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else ('System' if not self.user_id else f'User #{self.user_id}'),
            'user_role': self.user.role if self.user else None,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
