import hashlib

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import config
from ..db import get_db
from ..errors import ApiError
from ..models import Certificate, Check, User
from ..security import current_user
from ..utils import iso as _iso

router = APIRouter(prefix="/api/certificates", tags=["certificates"])


def _detect_type(buf: bytes) -> str | None:
    """Check the real file signature instead of trusting the client-sent content type."""
    if buf[:4] == b"%PDF":
        return "application/pdf"
    if buf[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if buf[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    return None


@router.post("/verify")
def verify(
    certificate: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    data = certificate.file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise ApiError(413, "File too large (max 5 MB)")
    if not data:
        raise ApiError(400, "Please choose a certificate file")

    mime = _detect_type(data)
    if mime is None:
        raise ApiError(415, "Only PDF, PNG or JPG files are allowed")

    digest = hashlib.sha256(data).hexdigest()
    file_name = (certificate.filename or "certificate")[:255]

    record = db.scalar(select(Certificate).where(Certificate.hash == digest))
    status = "duplicate"
    if record is None:
        try:
            record = Certificate(
                hash=digest, file_name=file_name, mime_type=mime, size=len(data), uploaded_by=user.id
            )
            db.add(record)
            db.commit()
            status = "original"
        except IntegrityError:  # lost a race with a simultaneous upload of the same file
            db.rollback()
            record = db.scalar(select(Certificate).where(Certificate.hash == digest))

    db.add(Check(user_id=user.id, file_name=file_name, hash=digest, status=status))
    db.commit()

    return {
        "status": status,
        "hash": digest,
        "fileName": file_name,
        "firstUploadedAt": _iso(record.created_at),
        "firstUploadedByYou": record.uploaded_by == user.id,
    }


@router.get("/history")
def history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Check).where(Check.user_id == user.id).order_by(Check.created_at.desc(), Check.id.desc()).limit(20)
    ).all()
    return {
        "checks": [
            {"id": c.id, "fileName": c.file_name, "hash": c.hash, "status": c.status, "createdAt": _iso(c.created_at)}
            for c in rows
        ]
    }
