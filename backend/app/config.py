import os

from dotenv import load_dotenv

load_dotenv()  # reads backend/.env if present (no-op on Render, which uses real env vars)


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL", "sqlite:///./dev.db")
    # Providers hand out postgres:// or postgresql://; SQLAlchemy needs the psycopg3 driver name.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _database_url()
ENV = os.environ.get("ENV", "development")
IS_PROD = ENV == "production"

JWT_SECRET = os.environ.get("JWT_SECRET", "")
if not JWT_SECRET:
    if IS_PROD:
        raise RuntimeError("JWT_SECRET must be set in production")
    JWT_SECRET = "dev-only-secret-change-me"

CLIENT_URLS = [u.strip() for u in os.environ.get("CLIENT_URL", "http://localhost:5173").split(",") if u.strip()]

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "")
MAIL_FROM_NAME = os.environ.get("MAIL_FROM_NAME", "Certificate Verifier")

# If both are set, this account is created/updated as a verified admin on every startup.
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip().lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

OTP_TTL_SECONDS = 10 * 60
OTP_RESEND_GAP_SECONDS = 60
OTP_MAX_ATTEMPTS = 5
JWT_TTL_DAYS = 7
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
