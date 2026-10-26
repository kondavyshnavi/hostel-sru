import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file from the backend folder
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    IS_PRODUCTION = FLASK_ENV.lower() == 'production'

    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret_key_change_in_production_hostel_management_2026')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt_secret_key_change_in_production_hostel_2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_HOURS', 24)))

    # Allowed CORS Origins
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')

    # Security check: Fail safely if required production secrets are missing or weak
    INSECURE_SECRETS = [
        'default-dev-secret-key-replace-in-prod',
        'default-jwt-secret-key-replace',
        'dev_secret_key_change_in_production_hostel_management_2026',
        'jwt_secret_key_change_in_production_hostel_2026'
    ]

    if IS_PRODUCTION:
        if not JWT_SECRET_KEY or JWT_SECRET_KEY in INSECURE_SECRETS or len(JWT_SECRET_KEY) < 32:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: A secure, random JWT_SECRET_KEY "
                "with at least 32 characters must be set in production via environment variables."
            )
        if not SECRET_KEY or SECRET_KEY in INSECURE_SECRETS or len(SECRET_KEY) < 32:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: A secure, random SECRET_KEY "
                "with at least 32 characters must be set in production via environment variables."
            )
    
    # Database connection URI (auto-replaces legacy postgres:// with postgresql:// if needed by Render)
    _db_url = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(basedir, 'hostel_management.db')}")
    if _db_url and _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)

    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Uploads / QR codes
    QR_FOLDER = os.path.join(basedir, 'static', 'qrcodes')
    
    # Mail Config (Optional)
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@sruhostel.edu')

class TestConfig(Config):
    TESTING = True
    FLASK_ENV = 'testing'
    IS_PRODUCTION = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
