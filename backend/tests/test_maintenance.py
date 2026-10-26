def test_maintenance_workflow(client, admin_token, resident_token, staff_token):
    # 1. Resident logs complaint
    res_create = client.post('/api/maintenance',
        headers={'Authorization': f'Bearer {resident_token}'},
        json={
            'category': 'plumbing',
            'title': 'Leaking tap in bathroom',
            'description': 'Water is leaking continuously.',
            'priority': 'high'
        }
    )
    assert res_create.status_code == 201
    complaint_id = res_create.get_json()['request']['id']

    # 2. Admin assigns complaint to staff (test_staff has id=2)
    res_assign = client.put(f'/api/maintenance/{complaint_id}/assign',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'assigned_to': 2}
    )
    assert res_assign.status_code == 200
    assert res_assign.get_json()['request']['status'] == 'in_progress'

    # 3. Staff updates complaint status to resolved
    res_update = client.put(f'/api/maintenance/{complaint_id}/status',
        headers={'Authorization': f'Bearer {staff_token}'},
        json={
            'status': 'resolved',
            'work_notes': 'Replaced damaged rubber washer. Tap sealed completely.'
        }
    )
    assert res_update.status_code == 200
    updated_data = res_update.get_json()['request']
    assert updated_data['status'] == 'resolved'
    assert 'Replaced damaged rubber washer' in updated_data['work_notes']
