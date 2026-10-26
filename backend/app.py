import os
from flask import Flask, jsonify, request, send_from_directory
from config import Config
from database import db
from extensions import limiter

# Import Blueprints
from routes.auth_routes import auth_bp
from routes.resident_routes import resident_bp
from routes.room_routes import room_bp
from routes.fee_routes import fee_bp
from routes.attendance_routes import attendance_bp
from routes.visitor_routes import visitor_bp
from routes.maintenance_routes import maintenance_bp
from routes.facility_routes import facility_bp
from routes.analytics_routes import analytics_bp
from routes.recommendation_routes import recommendation_bp
from routes.notification_routes import notif_bp
from routes.utility_routes import utility_bp
from routes.audit_routes import audit_bp

def create_app(config_class=Config):
    app = Flask(__name__, static_folder='static')
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    limiter.init_app(app)

    # Enable CORS for API requests restricted to configured frontend origins
    @app.after_request
    def add_cors_headers(response):
        if request.path.startswith('/api/'):
            origin = request.headers.get('Origin')
            allowed_origins = [o.strip() for o in app.config.get('FRONTEND_URL', '').split(',') if o.strip()]
            if origin:
                # In production require origin to match whitelist; in development allow localhost origins
                if origin in allowed_origins or not app.config.get('IS_PRODUCTION', False):
                    response.headers['Access-Control-Allow-Origin'] = origin
                    response.headers.add('Vary', 'Origin')
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            requested_headers = request.headers.get('Access-Control-Request-Headers')
            if requested_headers:
                response.headers['Access-Control-Allow-Headers'] = requested_headers
        return response

    # Ensure static folders exist
    os.makedirs(app.config.get('QR_FOLDER', os.path.join(os.path.dirname(__file__), 'static', 'qrcodes')), exist_ok=True)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(resident_bp)
    app.register_blueprint(room_bp)
    app.register_blueprint(fee_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(visitor_bp)
    app.register_blueprint(maintenance_bp)
    app.register_blueprint(facility_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(recommendation_bp)
    app.register_blueprint(notif_bp)
    app.register_blueprint(utility_bp)
    app.register_blueprint(audit_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'platform': 'SR University Smart Hostel & Residential Management System',
            'version': '1.0.0',
            'database': app.config['SQLALCHEMY_DATABASE_URI'].split('://')[0]
        }), 200

    @app.route('/static/qrcodes/<path:filename>')
    def serve_qr(filename):
        return send_from_directory(app.config['QR_FOLDER'], filename)

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            'success': False,
            'message': f'Rate limit exceeded: {e.description or "Too many requests. Please try again later."}'
        }), 429

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'API endpoint not found'}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'success': False, 'message': 'An internal server error occurred'}), 500

    # Command to initialize DB schema
    @app.cli.command('init-db')
    def init_db():
        with app.app_context():
            db.create_all()
            print("Database tables initialized successfully!")

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
