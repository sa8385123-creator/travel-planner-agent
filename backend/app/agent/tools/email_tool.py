import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory relative to this file
dotenv_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=dotenv_path)

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")

def send_email(to_email: str, subject: str, body: str) -> str:
    """Send a plain-text email via Brevo."""
    if not BREVO_API_KEY or not SENDER_EMAIL:
        raise ValueError("BREVO_API_KEY or SENDER_EMAIL not set in environment")

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": SENDER_EMAIL, "name": "Travel Agent"},
        subject=subject,
        text_content=body,
    )

    try:
        response = api_instance.send_transac_email(send_smtp_email)
        return f"Email sent to {to_email}. ID: {response.message_id}"
    except ApiException as e:
        raise Exception(f"Failed to send email: {e}")