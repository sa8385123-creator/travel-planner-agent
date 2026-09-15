import os
import smtplib
from email.mime.text import MIMEText
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory relative to this file
dotenv_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=dotenv_path)

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

def send_email(to_email: str, subject: str, body: str) -> str:
    """Send a plain-text email via Gmail SMTP."""
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        raise ValueError("GMAIL_ADDRESS or GMAIL_APP_PASSWORD not set in environment")
    
    msg = MIMEText(body, "plain")
    msg["Subject"] = subject
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = to_email

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.send_message(msg)
        return f"Email sent to {to_email}"
    except Exception as e:
        raise Exception(f"Failed to send email: {e}")