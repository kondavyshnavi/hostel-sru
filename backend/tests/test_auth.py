def test_login_success(client):
    res = client.post('/api/auth/login', json={
        'username': 'test_admin',
        'password': 'Admin@123'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'token' in data
    assert data['user']['role'] == 'admin'

def test_login_invalid_password(client):
    res = client.post('/api/auth/login', json={
        'username': 'test_admin',
        'password': 'WrongPassword'
    })
    assert res.status_code == 401
    assert res.get_json()['success'] is False

def test_register_resident(client):
    res = client.post('/api/auth/register', json={
        'username': 'new_student',
        'email': 'new_student@sru.edu',
        'password': 'Password@123',
        'role': 'resident',
        'full_name': 'New Student',
        'enrollment_no': 'SRU2026CSE999',
        'phone': '9876543219',
        'emergency_contact': '9876543218'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['user']['username'] == 'new_student'

def test_role_permission_enforcement(client, resident_token):
    # Resident cannot call admin-only endpoint
    res = client.post('/api/rooms', 
        headers={'Authorization': f'Bearer {resident_token}'},
        json={'hostel_id': 1, 'room_number': '999', 'capacity': 2}
    )
    assert res.status_code == 403
