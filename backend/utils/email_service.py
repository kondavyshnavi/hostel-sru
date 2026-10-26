import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
from database import db
from models import Notification, User

logger = logging.getLogger(__name__)

def send_notification(user_id, title, message, notif_type='general', link_url=None, send_email=False):
    """
    Creates an in-app notification and optionally attempts SMTP delivery if configured.
    """
    try:
        # 1. Create in-app notification
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notif_type,
            link_url=link_url
        )
        db.session.add(notif)
        db.session.commit()

        # 2. Email delivery if requested
        if send_email:
            user = User.query.get(user_id)
            if user and user.email:
                send_smtp_email(user.email, title, message)

        return notif
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating notification: {str(e)}")
        return None

def send_smtp_email(to_email, subject, body_text):
    smtp_server = current_app.config.get('SMTP_SERVER')
    smtp_port = current_app.config.get('SMTP_PORT', 587)
    smtp_user = current_app.config.get('SMTP_USERNAME')
    smtp_pass = current_app.config.get('SMTP_PASSWORD')
    sender = current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@sruhostel.edu')

    # If no SMTP username/password, mock deliver & log
    if not smtp_user or not smtp_pass:
        logger.info(f"[MOCK EMAIL SENT] To: {to_email} | Subject: {subject} | Content: {body_text}")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body_text, 'plain'))

        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            logger.info(f"Email sent successfully to {to_email}")
            return True
    except Exception as e:
        logger.warning(f"SMTP sending failed to {to_email}: {e}. Mock email delivery logged instead.")
        return False
