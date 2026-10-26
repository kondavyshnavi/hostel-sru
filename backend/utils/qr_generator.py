import os
import io
import base64
import qrcode
from flask import current_app

def generate_qr_code_image(data_str, filename=None):
    """
    Generates a QR code image.
    If filename is provided, saves to static/qrcodes/filename.
    Returns:
        tuple (relative_path_or_filename, base64_data_uri)
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data_str)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")

    # Buffer for base64
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    base64_img = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    file_path = None
    if filename:
        folder = current_app.config.get('QR_FOLDER', os.path.join(os.getcwd(), 'static', 'qrcodes'))
        os.makedirs(folder, exist_ok=True)
        file_path = os.path.join(folder, filename)
        img.save(file_path)

    return filename or 'qr_code.png', base64_img
