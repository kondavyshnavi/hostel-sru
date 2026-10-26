from datetime import date

def test_attendance_marking_and_duplicate_prevention(client, admin_token):
    today = date.today().isoformat()
    # 1. Mark attendance for resident 1
    res = client.post('/api/attendance',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'resident_id': 1, 'date': today, 'status': 'present', 'remarks': 'Test check-in'}
    )
    assert res.status_code == 201
    assert res.get_json()['success'] is True

    # 2. Try marking again for same resident and date -> must return 409 conflict
    res_dup = client.post('/api/attendance',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'resident_id': 1, 'date': today, 'status': 'absent'}
    )
    assert res_dup.status_code == 409
    assert 'already been marked' in res_dup.get_json()['message']

def test_daily_qr_token(client, resident_token):
    res = client.get('/api/attendance/daily-qr',
        headers={'Authorization': f'Bearer {resident_token}'}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'qr_data_uri' in data
    assert 'token' in data
