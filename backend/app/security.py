import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import JWT_SECRET, JWT_TTL_DAYS
from .db import get_db
from .errors import ApiError
from .models import User

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def hash_otp(otp: str) -> str:
    return hashlib.sha256((otp + JWT_SECRET).encode()).hexdigest()


def safe_equal(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


def create_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=JWT_TTL_DAYS)
    return jwt.encode({"sub": str(user.id), "exp": exp}, JWT_SECRET, algorithm="HS256")


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise ApiError(401, "Login required")
    try:
        user_id = int(jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise ApiError(401, "Session expired, please login again")
    user = db.get(User, user_id)
    if user is None or not user.verified:
        raise ApiError(401, "Login required")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise ApiError(403, "Admin access only")
    return user
