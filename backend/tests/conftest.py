import sys
import os
import pytest

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from database import db
from config import TestConfig
from models import User, Resident, Hostel, Room

@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        
        # Setup base test users
        admin = User(username='test_admin', email='test_admin@sru.edu', role='admin')
        admin.set_password('Admin@123')
        
        staff = User(username='test_staff', email='test_staff@sru.edu', role='staff')
        staff.set_password('Staff@123')

        r_user = User(username='test_resident', email='test_resident@sru.edu', role='resident')
        r_user.set_password('Student@123')

        db.session.add_all([admin, staff, r_user])
        db.session.flush()

        res = Resident(
            user_id=r_user.id,
            full_name='Test Resident',
            enrollment_no='TEST2026CSE001',
            phone='9999999999',
            emergency_contact='8888888888',
            course='B.Tech CSE',
            branch='Computer Science',
            year_of_study=3,
            gender='male',
            status='active'
        )
        db.session.add(res)

        hostel = Hostel(
            name='Test Boys Hostel',
            code='TBH-01',
            type='boys',
            total_floors=2,
            warden_name='Test Warden'
        )
        db.session.add(hostel)
        db.session.flush()

        room = Room(
            hostel_id=hostel.id,
            room_number='101',
            floor=1,
            room_type='double',
            capacity=2,
            base_fee=30000.0,
            status='available'
        )
        db.session.add(room)
        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_token(client):
    res = client.post('/api/auth/login', json={'username': 'test_admin', 'password': 'Admin@123'})
    return res.get_json()['token']

@pytest.fixture
def resident_token(client):
    res = client.post('/api/auth/login', json={'username': 'test_resident', 'password': 'Student@123'})
    return res.get_json()['token']

@pytest.fixture
def staff_token(client):
    res = client.post('/api/auth/login', json={'username': 'test_staff', 'password': 'Staff@123'})
    return res.get_json()['token']
