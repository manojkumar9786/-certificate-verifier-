from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    verified: Mapped[bool] = mapped_column(default=False)
    role: Mapped[str] = mapped_column(String(10), default="user", server_default="user")  # "user" | "admin"
    otp_hash: Mapped[str | None] = mapped_column(String(64))
    otp_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    otp_attempts: Mapped[int] = mapped_column(default=0)
    otp_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Certificate(Base):
    """The genuine-certificate registry. Only admins add rows here (via /api/admin/certificates);
    a user's upload is checked against this table, never added to it."""

    __tablename__ = "certificates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(50))
    size: Mapped[int] = mapped_column(Integer)
    holder_name: Mapped[str] = mapped_column(String(120), default="", server_default="")
    cert_number: Mapped[str | None] = mapped_column(String(80))
    data: Mapped[bytes | None] = mapped_column(LargeBinary)  # raw file bytes, for preview
    doc_text: Mapped[str | None] = mapped_column(Text)  # normalised text, for template matching
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))  # admin who registered it
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Check(Base):
    """History of every verification a user has run."""

    __tablename__ = "checks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(15))  # "genuine" | "not_verified"
    matched_certificate_id: Mapped[int | None] = mapped_column(ForeignKey("certificates.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
