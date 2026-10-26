import logging
from flask import request
from database import db
from models import AuditLog

logger = logging.getLogger(__name__)

def log_audit(action, entity_type, entity_id=None, details=None, user_id=None):
    """
    Records an entry in the audit_logs table.
    """
    try:
        ip = None
        if request:
            ip = request.headers.get('X-Forwarded-For', request.remote_addr)

        audit = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip
        )
        db.session.add(audit)
        db.session.commit()
        return audit
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to record audit log: {str(e)}")
        return None
