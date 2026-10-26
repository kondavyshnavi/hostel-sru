def test_room_allocation_and_capacity_limit(client, admin_token):
    # 1. Allocate resident 1 to Room 1 (capacity 2)
    res = client.post('/api/rooms/allocate',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'resident_id': 1, 'room_id': 1, 'bed_number': 'Bed-1'}
    )
    assert res.status_code == 201
    assert res.get_json()['success'] is True

    # 2. Try allocating same resident again -> should fail with error
    res_dup = client.post('/api/rooms/allocate',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'resident_id': 1, 'room_id': 1, 'bed_number': 'Bed-2'}
    )
    assert res_dup.status_code == 400
    assert 'already allocated' in res_dup.get_json()['message']

def test_room_overcapacity_prevention(client, admin_token):
    # Register 2 more residents
    r2 = client.post('/api/residents',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'username': 'student_2', 'email': 's2@sru.edu', 'full_name': 'Student Two', 'enrollment_no': 'EN002', 'phone': '1111111111', 'emergency_contact': '2222222222'}
    ).get_json()['resident']['id']

    r3 = client.post('/api/residents',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'username': 'student_3', 'email': 's3@sru.edu', 'full_name': 'Student Three', 'enrollment_no': 'EN003', 'phone': '3333333333', 'emergency_contact': '4444444444'}
    ).get_json()['resident']['id']

    # Room 1 has capacity 2
    # Allocate resident 1
    client.post('/api/rooms/allocate', headers={'Authorization': f'Bearer {admin_token}'}, json={'resident_id': 1, 'room_id': 1, 'bed_number': 'A'})
    # Allocate resident 2
    client.post('/api/rooms/allocate', headers={'Authorization': f'Bearer {admin_token}'}, json={'resident_id': r2, 'room_id': 1, 'bed_number': 'B'})

    # Try allocating resident 3 to Room 1 (which now has 2/2 occupants)
    res_overflow = client.post('/api/rooms/allocate',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'resident_id': r3, 'room_id': 1, 'bed_number': 'C'}
    )
    assert res_overflow.status_code == 400
    assert 'full capacity' in res_overflow.get_json()['message']
