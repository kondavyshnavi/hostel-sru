from datetime import date

def test_facility_reservation_and_conflict_prevention(client, admin_token, resident_token):
    # 1. Admin creates facility
    f_res = client.post('/api/facilities',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'name': 'Study Hall Alpha',
            'facility_code': 'SHA-01',
            'location': 'Ground Floor',
            'capacity': 25
        }
    )
    assert f_res.status_code == 201
    fac_id = f_res.get_json()['facility']['id']

    today_str = date.today().isoformat()

    # 2. Resident reserves slot: 14:00 to 16:00
    resv_1 = client.post('/api/facilities/reserve',
        headers={'Authorization': f'Bearer {resident_token}'},
        json={
            'facility_id': fac_id,
            'reservation_date': today_str,
            'start_time': '14:00',
            'end_time': '16:00',
            'purpose': 'Group study'
        }
    )
    assert resv_1.status_code == 201
    resv_id = resv_1.get_json()['reservation']['id']

    # 3. Admin approves slot 1
    approve_res = client.put(f'/api/facilities/reservations/{resv_id}/status',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'status': 'approved'}
    )
    assert approve_res.status_code == 200

    # 4. Another reservation request with overlapping slot (15:00 to 17:00) -> should be rejected with 409 conflict
    resv_conflict = client.post('/api/facilities/reserve',
        headers={'Authorization': f'Bearer {resident_token}'},
        json={
            'facility_id': fac_id,
            'reservation_date': today_str,
            'start_time': '15:00',
            'end_time': '17:00',
            'purpose': 'Club presentation'
        }
    )
    assert resv_conflict.status_code == 409
    assert 'already booked' in resv_conflict.get_json()['message']
