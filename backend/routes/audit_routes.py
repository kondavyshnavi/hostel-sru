from flask import Blueprint, request, jsonify
from models import AuditLog
from utils.auth_middleware import token_required, role_required

audit_bp = Blueprint('audit', __name__, url_prefix='/api/audit')

@audit_bp.route('', methods=['GET'])
@role_required('admin')
def get_audit_logs(current_user):
    page = int(request.args.get('page', 1))
    per_page = min(int(request.args.get('per_page', 50)), 100)
    action = request.args.get('action', '').strip()
    entity_type = request.args.get('entity_type', '').strip()

    query = AuditLog.query

    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(AuditLog.entity_type.ilike(f"%{entity_type}%"))

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False).items

    return jsonify({
        'success': True,
        'total': total,
        'page': page,
        'per_page': per_page,
        'logs': [l.to_dict() for l in logs]
    }), 200
