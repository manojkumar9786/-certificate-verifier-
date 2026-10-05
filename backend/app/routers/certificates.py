import hashlib

from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy import delete, select
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
    """Checks an uploaded file's hash against the admin-maintained registry of genuine
    certificates. This endpoint never adds anything to that registry — only an admin can
    (POST /api/admin/certificates)."""
    data = certificate.file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise ApiError(413, "File too large (max 5 MB)")
    if not data:
        raise ApiError(400, "Please choose a certificate file")

    if _detect_type(data) is None:
        raise ApiError(415, "Only PDF, PNG or JPG files are allowed")

    digest = hashlib.sha256(data).hexdigest()
    file_name = (certificate.filename or "certificate")[:255]

    match = db.scalar(select(Certificate).where(Certificate.hash == digest))
    status = "genuine" if match else "not_verified"

    db.add(
        Check(
            user_id=user.id, file_name=file_name, hash=digest, status=status,
            matched_certificate_id=match.id if match else None,
        )
    )
    db.commit()

    result = {"status": status, "hash": digest, "fileName": file_name}
    if match:
        result.update(
            certificateId=match.id,
            holderName=match.holder_name,
            certNumber=match.cert_number,
            registeredAt=_iso(match.created_at),
            mimeType=match.mime_type,
            hasPreview=match.data is not None,
        )
    return result


@router.get("/{cert_id}/file")
def certificate_file(cert_id: int, db: Session = Depends(get_db)):
    """Serves a registered certificate's original bytes for preview (public: registry
    entries aren't sensitive beyond what's already printed on the certificate itself)."""
    cert = db.get(Certificate, cert_id)
    if cert is None or not cert.data:
        raise ApiError(404, "No preview available")
    return Response(content=cert.data, media_type=cert.mime_type)


@router.get("/history")
def history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Check, Certificate.mime_type, Certificate.data.is_not(None))
        .outerjoin(Certificate, Certificate.id == Check.matched_certificate_id)
        .where(Check.user_id == user.id)
        .order_by(Check.created_at.desc(), Check.id.desc())
        .limit(20)
    ).all()
    return {
        "checks": [
            {
                "id": c.id, "fileName": c.file_name, "hash": c.hash, "status": c.status,
                "certificateId": c.matched_certificate_id, "mimeType": mime, "hasPreview": bool(has_preview),
                "createdAt": _iso(c.created_at),
            }
            for c, mime, has_preview in rows
        ]
    }


@router.delete("/history")
def clear_history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Clears the signed-in user's own check history. The registry itself is untouched."""
    removed = db.execute(delete(Check).where(Check.user_id == user.id)).rowcount
    db.commit()
    return {"deleted": removed}
