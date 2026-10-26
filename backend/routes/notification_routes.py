from flask import Blueprint, request, jsonify
from database import db
from models import Notification, Announcement, User
from utils.auth_middleware import token_required, role_required
from utils.audit_logger import log_audit
from utils.email_service import send_notification

notif_bp = Blueprint('notifications', __name__, url_prefix='/api')

# --- In-app Notifications ---
@notif_bp.route('/notifications', methods=['GET'])
@token_required
def get_user_notifications(current_user):
    notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = sum(1 for n in notifications if not n.is_read)

    return jsonify({
        'success': True,
        'unread_count': unread_count,
        'notifications': [n.to_dict() for n in notifications]
    }), 200

@notif_bp.route('/notifications/<int:notif_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(current_user, notif_id):
    notif = Notification.query.filter_by(id=notif_id, user_id=current_user.id).first_or_404()
    notif.is_read = True
    db.session.commit()
    return jsonify({'success': True, 'message': 'Notification marked as read'}), 200

@notif_bp.route('/notifications/read-all', methods=['PUT'])
@token_required
def mark_all_notifications_read(current_user):
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'success': True, 'message': 'All notifications marked as read'}), 200


# --- Announcements ---
@notif_bp.route('/announcements', methods=['GET'])
@token_required
def get_announcements(current_user):
    query = Announcement.query
    if current_user.role == 'resident':
        query = query.filter(Announcement.target_audience.in_(['all', 'residents']))
    elif current_user.role == 'staff':
        query = query.filter(Announcement.target_audience.in_(['all', 'staff']))

    announcements = query.order_by(Announcement.created_at.desc()).limit(20).all()

    return jsonify({
        'success': True,
        'announcements': [a.to_dict() for a in announcements]
    }), 200

@notif_bp.route('/announcements', methods=['POST'])
@role_required('admin')
def create_announcement(current_user):
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    target_audience = data.get('target_audience', 'all')
    priority = data.get('priority', 'normal')

    if not title or not content:
        return jsonify({'success': False, 'message': 'Title and content are required'}), 400

    ann = Announcement(
        title=title,
        content=content,
        target_audience=target_audience,
        priority=priority,
        created_by=current_user.id
    )
    db.session.add(ann)
    db.session.commit()

    log_audit('CREATE_ANNOUNCEMENT', 'announcements', ann.id, f'Announcement created: {title}', user_id=current_user.id)

    # Broadcast notification to users in target audience
    user_query = User.query.filter_by(is_active=True)
    if target_audience == 'residents':
        user_query = user_query.filter_by(role='resident')
    elif target_audience == 'staff':
        user_query = user_query.filter_by(role='staff')

    target_users = user_query.all()
    for u in target_users:
        send_notification(
            user_id=u.id,
            title=f"Hostel Announcement: {title}",
            message=content[:180] + ('...' if len(content) > 180 else ''),
            notif_type='general'
        )

    return jsonify({
        'success': True,
        'message': 'Announcement published successfully',
        'announcement': ann.to_dict()
    }), 201

@notif_bp.route('/announcements/<int:ann_id>', methods=['DELETE'])
@role_required('admin')
def delete_announcement(current_user, ann_id):
    ann = Announcement.query.get_or_404(ann_id)
    db.session.delete(ann)
    db.session.commit()
    log_audit('DELETE_ANNOUNCEMENT', 'announcements', ann_id, f'Deleted announcement #{ann_id}', user_id=current_user.id)

    return jsonify({'success': True, 'message': 'Announcement deleted successfully'}), 200
