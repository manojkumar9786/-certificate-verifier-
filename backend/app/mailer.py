"""Sends OTP mail through Brevo's HTTP API (works on Render free tier, unlike SMTP)."""
import html

import httpx

from . import config


def send_otp_email(to: str, name: str, otp: str) -> None:
    if not config.BREVO_API_KEY:
        if config.IS_PROD:
            raise RuntimeError("Email service not configured")
        print(f"\n[DEV] OTP for {to}: {otp}\n", flush=True)
        return

    body = f"""<div style="font-family:sans-serif">
      <p>Hi {html.escape(name)},</p>
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{otp}</p>
      <p>It expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>"""

    resp = httpx.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={"api-key": config.BREVO_API_KEY, "accept": "application/json"},
        json={
            "sender": {"email": config.MAIL_FROM, "name": config.MAIL_FROM_NAME},
            "to": [{"email": to, "name": name}],
            "subject": "Your verification code",
            "htmlContent": body,
        },
        timeout=15,
    )
    if resp.status_code >= 400:
        print("Brevo error:", resp.status_code, resp.text, flush=True)
        raise RuntimeError("Could not send email")
