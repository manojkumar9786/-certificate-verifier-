import math
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..db import get_db
from ..errors import ApiError
from ..mailer import send_otp_email
from ..models import User, utcnow
from ..security import check_password, create_token, current_user, hash_otp, hash_password, safe_equal

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class RegisterIn(BaseModel):
    name: str = ""
    email: str = ""
    password: str = ""


class VerifyIn(BaseModel):
    email: str = ""
    otp: str = ""


class EmailIn(BaseModel):
    email: str = ""


class LoginIn(BaseModel):
    email: str = ""
    password: str = ""


def _norm(email: str) -> str:
    return email.strip().lower()


def _aware(dt: datetime | None) -> datetime | None:
    # SQLite returns naive datetimes; Postgres returns aware ones. Treat naive as UTC.
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _public(user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


def _cooldown_left(user: User) -> int:
    sent = _aware(user.otp_sent_at)
    if not sent:
        return 0
    left = (sent + timedelta(seconds=config.OTP_RESEND_GAP_SECONDS) - utcnow()).total_seconds()
    return math.ceil(left) if left > 0 else 0


def _issue_otp(db: Session, user: User) -> None:
    otp = f"{secrets.randbelow(900000) + 100000}"
    user.otp_hash = hash_otp(otp)
    user.otp_expires = utcnow() + timedelta(seconds=config.OTP_TTL_SECONDS)
    user.otp_attempts = 0
    user.otp_sent_at = utcnow()
    db.add(user)
    db.commit()
    send_otp_email(user.email, user.name, otp)


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    name = body.name.strip()
    email = _norm(body.email)
    password = body.password

    if not name:
        raise ApiError(400, "Name is required")
    if len(name) > 80:
        raise ApiError(400, "Name is too long")
    if not EMAIL_RE.match(email) or len(email) > 254:
        raise ApiError(400, "Enter a valid email")
    if len(password) < 8:
        raise ApiError(400, "Password must be at least 8 characters")
    if len(password.encode()) > 72:
        raise ApiError(400, "Password must be at most 72 bytes")

    user = db.scalar(select(User).where(User.email == email))
    if user and user.verified:
        raise ApiError(409, "This email is already registered. Please login.")

    if user is None:
        user = User(name=name, email=email, password_hash=hash_password(password))
    else:  # unverified account registering again: refresh details
        user.name = name
        user.password_hash = hash_password(password)

    try:
        _issue_otp(db, user)
    except Exception:
        raise ApiError(502, "Could not send OTP email. Try again in a moment.")
    return {"message": "OTP sent to your email", "email": email}


@router.post("/verify-otp")
def verify_otp(body: VerifyIn, db: Session = Depends(get_db)):
    email = _norm(body.email)
    otp = body.otp.strip()

    user = db.scalar(select(User).where(User.email == email))
    if user is None or user.verified or not user.otp_hash:
        raise ApiError(400, "Invalid or expired OTP")
    if user.otp_attempts >= config.OTP_MAX_ATTEMPTS:
        raise ApiError(429, "Too many wrong attempts. Request a new OTP.")
    if _aware(user.otp_expires) < utcnow():
        raise ApiError(400, "OTP expired. Request a new one.")

    if not safe_equal(hash_otp(otp), user.otp_hash):
        user.otp_attempts += 1
        db.commit()
        raise ApiError(400, "Incorrect OTP")

    user.verified = True
    user.otp_hash = None
    user.otp_expires = None
    user.otp_attempts = 0
    db.commit()
    return {"token": create_token(user), "user": _public(user)}


@router.post("/resend-otp")
def resend_otp(body: EmailIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == _norm(body.email)))
    # Same response whether or not the account exists.
    if user is None or user.verified:
        return {"message": "If the account exists, an OTP was sent"}

    wait = _cooldown_left(user)
    if wait > 0:
        raise ApiError(429, f"Please wait {wait}s before requesting another OTP")

    try:
        _issue_otp(db, user)
    except Exception:
        raise ApiError(502, "Could not send OTP email. Try again in a moment.")
    return {"message": "OTP sent"}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == _norm(body.email)))
    if user is None or not check_password(body.password, user.password_hash):
        raise ApiError(401, "Incorrect email or password")

    if not user.verified:
        if _cooldown_left(user) == 0:
            try:
                _issue_otp(db, user)
            except Exception:
                pass  # user can hit "resend" on the verify page
        raise ApiError(
            403, "Email not verified. Enter the OTP sent to your email.",
            needsVerification=True, email=user.email,
        )

    return {"token": create_token(user), "user": _public(user)}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"user": _public(user)}
