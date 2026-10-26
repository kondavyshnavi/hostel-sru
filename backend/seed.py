import os
from datetime import datetime, date, timedelta, time
from app import create_app
from database import db
from models import (
    User, Resident, Hostel, Room, RoomAllocation, Fee, Payment,
    Attendance, Visitor, MaintenanceRequest, Facility, FacilityReservation,
    Notification, Announcement, UtilityRecord, AuditLog
)
from utils.qr_generator import generate_qr_code_image

def seed_database():
    app = create_app()
    with app.app_context():
        print("Creating all database tables...")
        db.create_all()

        # Check if already seeded
        if User.query.filter_by(username='admin').first():
            print("Database already contains seed data. Skipping re-seeding.")
            return

        print("Seeding initial data...")

        # 1. Users
        # Admin
        admin = User(username='admin', email='admin@sruhostel.edu', role='admin')
        admin.set_password('Admin@123')
        db.session.add(admin)

        # Maintenance Staff
        staff1 = User(username='staff_rajesh', email='rajesh.staff@sruhostel.edu', role='staff')
        staff1.set_password('Staff@123')
        db.session.add(staff1)

        staff2 = User(username='staff_priya', email='priya.staff@sruhostel.edu', role='staff')
        staff2.set_password('Staff@123')
        db.session.add(staff2)

        # Resident Users
        r_user1 = User(username='rahul_sharma', email='rahul.cse@sru.edu.in', role='resident')
        r_user1.set_password('Student@123')
        db.session.add(r_user1)

        r_user2 = User(username='sneha_reddy', email='sneha.cse@sru.edu.in', role='resident')
        r_user2.set_password('Student@123')
        db.session.add(r_user2)

        r_user3 = User(username='arjun_varma', email='arjun.cse@sru.edu.in', role='resident')
        r_user3.set_password('Student@123')
        db.session.add(r_user3)

        r_user4 = User(username='ananya_singh', email='ananya.ece@sru.edu.in', role='resident')
        r_user4.set_password('Student@123')
        db.session.add(r_user4)

        r_user5 = User(username='karthik_rao', email='karthik.mech@sru.edu.in', role='resident')
        r_user5.set_password('Student@123')
        db.session.add(r_user5)

        db.session.flush()

        # 2. Hostels
        hostel_a = Hostel(
            name='Aryabhata Boys Hostel (Block A)',
            code='BH-A',
            type='boys',
            total_floors=3,
            warden_name='Dr. K. Srinivas',
            warden_contact='9848011223',
            address='North Wing, SR University Campus'
        )
        hostel_b = Hostel(
            name='Bhaskara Boys Hostel (Block B)',
            code='BH-B',
            type='boys',
            total_floors=3,
            warden_name='Prof. V. Ramana',
            warden_contact='9848011224',
            address='East Wing, SR University Campus'
        )
        hostel_c = Hostel(
            name='Kalpana Chawla Girls Hostel (Block C)',
            code='GH-C',
            type='girls',
            total_floors=4,
            warden_name='Dr. M. Lakshmi',
            warden_contact='9848011225',
            address='South Wing, SR University Campus'
        )
        db.session.add_all([hostel_a, hostel_b, hostel_c])
        db.session.flush()

        # 3. Rooms
        rooms = [
            # Hostel A
            Room(hostel_id=hostel_a.id, room_number='A-101', floor=1, room_type='double', capacity=2, base_fee=35000.0, status='available'),
            Room(hostel_id=hostel_a.id, room_number='A-102', floor=1, room_type='double', capacity=2, base_fee=35000.0, status='available'),
            Room(hostel_id=hostel_a.id, room_number='A-201', floor=2, room_type='single', capacity=1, base_fee=50000.0, status='available'),
            Room(hostel_id=hostel_a.id, room_number='A-202', floor=2, room_type='triple', capacity=3, base_fee=28000.0, status='available'),
            Room(hostel_id=hostel_a.id, room_number='A-301', floor=3, room_type='quad', capacity=4, base_fee=22000.0, status='available'),
            # Hostel B
            Room(hostel_id=hostel_b.id, room_number='B-101', floor=1, room_type='double', capacity=2, base_fee=32000.0, status='available'),
            Room(hostel_id=hostel_b.id, room_number='B-102', floor=1, room_type='double', capacity=2, base_fee=32000.0, status='available'),
            Room(hostel_id=hostel_b.id, room_number='B-201', floor=2, room_type='triple', capacity=3, base_fee=25000.0, status='maintenance'),
            # Hostel C
            Room(hostel_id=hostel_c.id, room_number='C-101', floor=1, room_type='double', capacity=2, base_fee=36000.0, status='available'),
            Room(hostel_id=hostel_c.id, room_number='C-201', floor=2, room_type='double', capacity=2, base_fee=36000.0, status='available'),
            Room(hostel_id=hostel_c.id, room_number='C-202', floor=2, room_type='single', capacity=1, base_fee=52000.0, status='available'),
            Room(hostel_id=hostel_c.id, room_number='C-301', floor=3, room_type='triple', capacity=3, base_fee=28000.0, status='available'),
        ]
        db.session.add_all(rooms)
        db.session.flush()

        # 4. Residents
        res1 = Resident(
            user_id=r_user1.id,
            full_name='Rahul Sharma',
            enrollment_no='SRU2023CSE045',
            phone='9876501234',
            emergency_contact='9876501230',
            parent_name='Ramesh Sharma',
            parent_phone='9876501239',
            address='Plot 42, Jubilee Hills, Hyderabad',
            blood_group='O+',
            course='B.Tech CSE',
            branch='Computer Science & Engineering',
            year_of_study=3,
            gender='male',
            status='active'
        )
        res2 = Resident(
            user_id=r_user2.id,
            full_name='Sneha Reddy',
            enrollment_no='SRU2024CSE112',
            phone='9876502234',
            emergency_contact='9876502230',
            parent_name='Srinivas Reddy',
            parent_phone='9876502239',
            address='Road No 12, Banjara Hills, Hyderabad',
            blood_group='B+',
            course='B.Tech CSE',
            branch='Artificial Intelligence & Machine Learning',
            year_of_study=2,
            gender='female',
            status='active'
        )
        res3 = Resident(
            user_id=r_user3.id,
            full_name='Arjun Varma',
            enrollment_no='SRU2025CSE018',
            phone='9876503234',
            emergency_contact='9876503230',
            parent_name='Bhaskara Varma',
            parent_phone='9876503239',
            address='MVP Colony, Visakhapatnam',
            blood_group='A+',
            course='B.Tech CSE',
            branch='Computer Science & Engineering',
            year_of_study=1,
            gender='male',
            status='active'
        )
        res4 = Resident(
            user_id=r_user4.id,
            full_name='Ananya Singh',
            enrollment_no='SRU2023ECE077',
            phone='9876504234',
            emergency_contact='9876504230',
            parent_name='Vikram Singh',
            parent_phone='9876504239',
            address='Civil Lines, Jaipur',
            blood_group='AB+',
            course='B.Tech ECE',
            branch='Electronics & Communication Engineering',
            year_of_study=3,
            gender='female',
            status='active'
        )
        res5 = Resident(
            user_id=r_user5.id,
            full_name='Karthik Rao',
            enrollment_no='SRU2024MEC033',
            phone='9876505234',
            emergency_contact='9876505230',
            parent_name='Govind Rao',
            parent_phone='9876505239',
            address='Subedari, Hanamkonda, Warangal',
            blood_group='O-',
            course='B.Tech MECH',
            branch='Mechanical Engineering',
            year_of_study=2,
            gender='male',
            status='active'
        )
        db.session.add_all([res1, res2, res3, res4, res5])
        db.session.flush()

        # 5. Room Allocations
        alloc1 = RoomAllocation(resident_id=res1.id, room_id=rooms[0].id, bed_number='Bed-1', start_date=date(2026, 7, 1), status='active', remarks='Allocated Odd Semester 2026')
        alloc2 = RoomAllocation(resident_id=res2.id, room_id=rooms[9].id, bed_number='Bed-1', start_date=date(2026, 7, 1), status='active', remarks='Allocated Odd Semester 2026')
        alloc3 = RoomAllocation(resident_id=res3.id, room_id=rooms[1].id, bed_number='Bed-1', start_date=date(2026, 7, 1), status='active', remarks='Allocated Odd Semester 2026')
        alloc4 = RoomAllocation(resident_id=res4.id, room_id=rooms[10].id, bed_number='Bed-1', start_date=date(2026, 7, 1), status='active', remarks='Single room allocation')
        # res5 is intentionally left unallocated to demonstrate intelligent allocation suggestions!

        db.session.add_all([alloc1, alloc2, alloc3, alloc4])

        for r in rooms:
            r.update_occupancy_status()
        db.session.flush()

        # 6. Fees
        fee1 = Fee(resident_id=res1.id, fee_type='semester_fee', amount=35000.0, due_date=date(2026, 8, 15), status='paid', academic_term='2026-Odd')
        fee2 = Fee(resident_id=res1.id, fee_type='mess_fee', amount=18000.0, due_date=date(2026, 10, 20), status='pending', academic_term='2026-Odd')
        fee3 = Fee(resident_id=res2.id, fee_type='semester_fee', amount=36000.0, due_date=date(2026, 8, 15), status='paid', academic_term='2026-Odd')
        fee4 = Fee(resident_id=res3.id, fee_type='semester_fee', amount=35000.0, due_date=date(2026, 8, 10), status='overdue', academic_term='2026-Odd')
        fee5 = Fee(resident_id=res4.id, fee_type='semester_fee', amount=52000.0, due_date=date(2026, 8, 15), status='paid', academic_term='2026-Odd')
        fee6 = Fee(resident_id=res5.id, fee_type='security_deposit', amount=5000.0, due_date=date(2026, 10, 18), status='pending', academic_term='2026-Odd')

        db.session.add_all([fee1, fee2, fee3, fee4, fee5, fee6])
        db.session.flush()

        # 7. Payments
        pay1 = Payment(fee_id=fee1.id, resident_id=res1.id, amount_paid=35000.0, payment_method='upi', transaction_ref='TXN-UPI88329104', payment_status='success', receipt_number='RCP-202608-00129', payment_date=datetime(2026, 8, 12, 11, 30))
        pay2 = Payment(fee_id=fee3.id, resident_id=res2.id, amount_paid=36000.0, payment_method='online', transaction_ref='TXN-NET88329402', payment_status='success', receipt_number='RCP-202608-00130', payment_date=datetime(2026, 8, 14, 15, 20))
        pay3 = Payment(fee_id=fee5.id, resident_id=res4.id, amount_paid=52000.0, payment_method='card', transaction_ref='TXN-CRD99210041', payment_status='success', receipt_number='RCP-202608-00131', payment_date=datetime(2026, 8, 10, 9, 45))
        db.session.add_all([pay1, pay2, pay3])

        # 8. Attendance (past 10 days)
        today = date.today()
        for i in range(10):
            d = today - timedelta(days=i)
            # Rahul
            db.session.add(Attendance(resident_id=res1.id, date=d, status='present', marked_by='system', qr_verified=(i % 2 == 0), check_in_time=time(8, 30)))
            # Sneha
            db.session.add(Attendance(resident_id=res2.id, date=d, status='present' if i != 3 else 'leave', marked_by='warden', qr_verified=True, check_in_time=time(8, 25)))
            # Arjun
            db.session.add(Attendance(resident_id=res3.id, date=d, status='absent' if i in [2, 5] else 'present', marked_by='warden', qr_verified=False, check_in_time=time(8, 45)))
            # Ananya
            db.session.add(Attendance(resident_id=res4.id, date=d, status='present', marked_by='system', qr_verified=True, check_in_time=time(8, 20)))

        # 9. Visitors
        _, vis1_qr = generate_qr_code_image("VISITOR_PASS:VP-20261014-998811")
        _, vis2_qr = generate_qr_code_image("VISITOR_PASS:VP-20261014-998822")

        v1 = Visitor(
            resident_id=res1.id,
            visitor_name='Suresh Sharma',
            visitor_phone='9849012345',
            visitor_id_proof='Aadhar 4432-8891-0021',
            relationship='Uncle',
            purpose='Delivering academic textbooks and home snacks',
            visit_date=today,
            expected_time='04:00 PM',
            pass_code='VP-20261014-998811',
            qr_code_path=vis1_qr,
            status='approved',
            approved_by=admin.id
        )
        v2 = Visitor(
            resident_id=res2.id,
            visitor_name='Radha Reddy',
            visitor_phone='9849012399',
            visitor_id_proof='PAN Card ABCPR1234K',
            relationship='Mother',
            purpose='Weekend family visit',
            visit_date=today + timedelta(days=1),
            expected_time='11:00 AM',
            pass_code='VP-20261014-998822',
            qr_code_path=vis2_qr,
            status='pending'
        )
        db.session.add_all([v1, v2])

        # 10. Maintenance Requests
        m1 = MaintenanceRequest(
            resident_id=res1.id,
            room_id=rooms[0].id,
            category='electrical',
            title='Ceiling fan making clicking sound',
            description='The study room fan has a rattling noise at high speed.',
            priority='medium',
            status='in_progress',
            assigned_to=staff1.id,
            work_notes='[14-Oct 08:30 - staff_rajesh]: Inspected capacitor and ball bearing. Replacement scheduled today.'
        )
        m2 = MaintenanceRequest(
            resident_id=res3.id,
            room_id=rooms[1].id,
            category='plumbing',
            title='Washroom tap water leak',
            description='Continuous drip in washroom tap causing water puddle.',
            priority='high',
            status='pending',
            assigned_to=None
        )
        m3 = MaintenanceRequest(
            resident_id=res2.id,
            room_id=rooms[9].id,
            category='wifi',
            title='Weak Wi-Fi signal in room C-201',
            description='Access point signal drops intermittently in evening hours.',
            priority='low',
            status='resolved',
            assigned_to=staff2.id,
            work_notes='[13-Oct 14:00 - staff_priya]: Repositioned 5GHz access point antenna and updated channel frequency.',
            resolution_date=datetime.utcnow() - timedelta(days=1)
        )
        db.session.add_all([m1, m2, m3])

        # 11. Facilities
        f1 = Facility(name='Central Digital Study Room', facility_code='FAC-STUDY-01', description='Air conditioned quiet study hall with high-speed fiber internet and power ports', capacity=30, location='Block A Ground Floor')
        f2 = Facility(name='Indoor Badminton Court', facility_code='FAC-SPORTS-01', description='Wooden court for badminton and table tennis', capacity=12, location='Hostel Sports Complex')
        f3 = Facility(name='Seminar & Common Discussion Hall', facility_code='FAC-HALL-01', description='Projector equipped room for group study, workshops, and student meetings', capacity=40, location='Central Block 1st Floor')
        f4 = Facility(name='Fitness & Gymnasium Hub', facility_code='FAC-GYM-01', description='Equipped with treadmills, free weights, and multi-gym stations', capacity=20, location='Sports Complex Ground Floor')
        db.session.add_all([f1, f2, f3, f4])
        db.session.flush()

        # 12. Facility Reservations
        resv1 = FacilityReservation(
            facility_id=f1.id,
            resident_id=res1.id,
            reservation_date=today,
            start_time=time(18, 0),
            end_time=time(20, 0),
            purpose='Group project coding session for final year exhibition',
            status='approved',
            approved_by=admin.id
        )
        resv2 = FacilityReservation(
            facility_id=f2.id,
            resident_id=res3.id,
            reservation_date=today + timedelta(days=1),
            start_time=time(17, 0),
            end_time=time(18, 30),
            purpose='Intra-hostel doubles match preparation',
            status='pending'
        )
        db.session.add_all([resv1, resv2])

        # 13. Notifications
        n1 = Notification(user_id=r_user1.id, title='Room Allocation Confirmed', message='You have been assigned to Room A-101 in Aryabhata Boys Hostel.', type='allocation', is_read=True)
        n2 = Notification(user_id=r_user1.id, title='Fee Payment Received', message='Your semester fee of ₹35,000 has been received. Receipt RCP-202608-00129 is ready.', type='fee', is_read=True)
        n3 = Notification(user_id=r_user1.id, title='Visitor Pass Approved', message='Visitor Suresh Sharma pass has been approved for today.', type='visitor', is_read=False)
        n4 = Notification(user_id=r_user2.id, title='Maintenance Resolved', message='Your Wi-Fi connectivity complaint has been marked resolved.', type='maintenance', is_read=False)
        db.session.add_all([n1, n2, n3, n4])

        # 14. Announcements
        a1 = Announcement(
            title='Hostel Biometric & QR Attendance Guidelines',
            content='All residents are requested to ensure daily attendance is marked between 08:00 AM and 09:30 AM either at the hostel entrance scanner or through the student mobile portal QR check-in.',
            target_audience='residents',
            priority='normal',
            created_by=admin.id
        )
        a2 = Announcement(
            title='Campus Water Tank Cleaning & Maintenance Notice',
            content='Overhead water reservoir inspection and chemical cleaning will take place this Saturday between 10:00 AM and 01:00 PM. Please conserve water accordingly.',
            target_audience='all',
            priority='urgent',
            created_by=admin.id
        )
        db.session.add_all([a1, a2])

        # 15. Utility Records (past 4 months)
        u1 = UtilityRecord(hostel_id=hostel_a.id, billing_month='2026-05', electricity_kwh=4200.0, electricity_cost=33600.0, water_liters=65000.0, water_cost=6500.0, logged_by='admin', notes='Regular summer consumption')
        u2 = UtilityRecord(hostel_id=hostel_a.id, billing_month='2026-06', electricity_kwh=4500.0, electricity_cost=36000.0, water_liters=68000.0, water_cost=6800.0, logged_by='admin', notes='Semester end exams period')
        u3 = UtilityRecord(hostel_id=hostel_a.id, billing_month='2026-07', electricity_kwh=3900.0, electricity_cost=31200.0, water_liters=59000.0, water_cost=5900.0, logged_by='admin', notes='Semester vacation partial occupancy')
        u4 = UtilityRecord(hostel_id=hostel_a.id, billing_month='2026-08', electricity_kwh=4950.0, electricity_cost=39600.0, water_liters=76000.0, water_cost=7600.0, logged_by='admin', notes='New semester commencement. 26.9% jump in electricity!')
        db.session.add_all([u1, u2, u3, u4])

        # 16. Audit Log
        audit1 = AuditLog(user_id=admin.id, action='SYSTEM_SEED', entity_type='system', entity_id=1, details='Initial seed data loaded into hostel management platform')
        db.session.add(audit1)

        db.session.commit()
        print("Database successfully seeded with realistic academic data!")

if __name__ == '__main__':
    seed_database()
