def test_analytics_and_recommendations(client, admin_token):
    # Overview
    ov_res = client.get('/api/analytics/overview', headers={'Authorization': f'Bearer {admin_token}'})
    assert ov_res.status_code == 200
    ov_data = ov_res.get_json()
    assert ov_data['success'] is True
    assert 'occupancy_rate' in ov_data['metrics']

    # Occupancy
    occ_res = client.get('/api/analytics/occupancy', headers={'Authorization': f'Bearer {admin_token}'})
    assert occ_res.status_code == 200
    assert occ_res.get_json()['success'] is True

    # Recommendations
    rec_res = client.get('/api/recommendations', headers={'Authorization': f'Bearer {admin_token}'})
    assert rec_res.status_code == 200
    rec_data = rec_res.get_json()
    assert rec_data['success'] is True
    assert 'disclaimer' in rec_data
    assert isinstance(rec_data['recommendations'], list)
