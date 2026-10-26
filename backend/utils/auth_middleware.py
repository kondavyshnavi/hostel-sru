import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from models import User

def generate_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.now(timezone.utc) + current_app.config['JWT_ACCESS_TOKEN_EXPIRES'],
        'iat': datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
    return token

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
        
        if not token:
            return jsonify({'success': False, 'message': 'Authentication token is missing'}), 401
        
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            user = User.query.get(payload['user_id'])
            if not user or not user.is_active:
                return jsonify({'success': False, 'message': 'User is inactive or not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired. Please log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid authentication token'}), 401
        except Exception as e:
            return jsonify({'success': False, 'message': f'Auth error: {str(e)}'}), 401

        return f(current_user=user, *args, **kwargs)
    return decorated

def role_required(roles):
    """
    Decorator to restrict access by role.
    Accepts string or list of strings, e.g. role_required('admin') or role_required(['admin', 'staff'])
    """
    if isinstance(roles, str):
        roles = [roles]
        
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            if current_user.role not in roles:
                return jsonify({
                    'success': False,
                    'message': f'Access forbidden: requires one of the following roles: {", ".join(roles)}'
                }), 403
            return f(current_user=current_user, *args, **kwargs)
        return token_required(decorated_function)
    return decorator
