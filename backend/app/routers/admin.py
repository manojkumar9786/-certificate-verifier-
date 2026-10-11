import hashlib
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import config
from ..db import get_db
from ..errors import ApiError
from ..matching import fingerprint
from ..models import Certificate, Check, User
from ..qrscan import extract_qr_codes
from ..security import admin_user
from ..utils import iso
from .certificates import _detect_type

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(admin_user)])


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    count = lambda q: db.scalar(q) or 0  # noqa: E731
    return {
        "users": count(select(func.count(User.id))),
        "verifiedUsers": count(select(func.count(User.id)).where(User.verified.is_(True))),
        "certificates": count(select(func.count(Certificate.id))),
        "checks": count(select(func.count(Check.id))),
        "genuineMatches": count(select(func.count(Check.id)).where(Check.status == "genuine")),
        "notVerified": count(select(func.count(Check.id)).where(Check.status == "not_verified")),
    }


@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    """Daily counts for the last 14 days, for the admin charts. Bucketed in Python
    rather than with a DB-specific date-trunc function, so this runs the same on
    SQLite (local/dev) and Postgres (production)."""
    days = 14
    today = datetime.now(timezone.utc).date()
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    labels = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]

    checks = db.scalars(select(Check).where(Check.created_at >= cutoff)).all()
    genuine_by_day = Counter()
    not_verified_by_day = Counter()
    for c in checks:
        day = iso(c.created_at)[:10]
        (genuine_by_day if c.status == "genuine" else not_verified_by_day)[day] += 1

    signups = db.scalars(select(User).where(User.created_at >= cutoff)).all()
    signups_by_day = Counter(iso(u.created_at)[:10] for u in signups)

    match_types = Counter()
    match_rows = db.execute(
        select(Check.hash, Certificate.hash)
        .join(Certificate, Certificate.id == Check.matched_certificate_id)
    ).all()
    for check_hash, cert_hash in match_rows:
        match_types["exact" if check_hash == cert_hash else "template"] += 1

    return {
        "days": labels,
        "genuine": [genuine_by_day[d] for d in labels],
        "notVerified": [not_verified_by_day[d] for d in labels],
        "signups": [signups_by_day[d] for d in labels],
        "matchTypes": {"exact": match_types["exact"], "template": match_types["template"]},
    }


@router.get("/checks")
def all_checks(db: Session = Depends(get_db)):
    """Full audit trail: every verification attempt by every user, newest first."""
    rows = db.execute(
        select(Check, User.name, User.email, Certificate.holder_name)
        .join(User, User.id == Check.user_id)
        .outerjoin(Certificate, Certificate.id == Check.matched_certificate_id)
        .order_by(Check.created_at.desc(), Check.id.desc())
        .limit(500)
    ).all()
    return {
        "checks": [
            {
                "id": c.id, "fileName": c.file_name, "hash": c.hash, "status": c.status,
                "userName": name, "userEmail": email, "matchedHolder": holder,
                "createdAt": iso(c.created_at),
            }
            for c, name, email, holder in rows
        ]
    }


@router.get("/users")
def users(db: Session = Depends(get_db)):
    rows = db.scalars(select(User).order_by(User.created_at.desc()).limit(200)).all()
    return {
        "users": [
            {
                "id": u.id, "name": u.name, "email": u.email, "role": u.role,
                "verified": u.verified, "createdAt": iso(u.created_at),
            }
            for u in rows
        ]
    }


@router.get("/certificates")
def certificates(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Certificate, User)
        .join(User, User.id == Certificate.uploaded_by)
        .order_by(Certificate.created_at.desc())
        .limit(200)
    ).all()
    return {
        "certificates": [
            {
                "id": c.id, "fileName": c.file_name, "hash": c.hash, "size": c.size,
                "mimeType": c.mime_type, "hasPreview": c.data is not None,
                "holderName": c.holder_name, "certNumber": c.cert_number,
                "registeredBy": u.name, "registeredByEmail": u.email, "createdAt": iso(c.created_at),
            }
            for c, u in rows
        ]
    }


@router.post("/certificates", status_code=201)
def register_certificate(
    certificate: UploadFile = File(...),
    holder_name: str = Form(...),
    cert_number: str = Form(""),
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    """Adds a genuine certificate to the registry that user uploads are checked against."""
    holder_name = holder_name.strip()
    cert_number = cert_number.strip() or None
    if not holder_name:
        raise ApiError(400, "Holder name is required")
    if len(holder_name) > 120:
        raise ApiError(400, "Holder name is too long")
    if cert_number and len(cert_number) > 80:
        raise ApiError(400, "Certificate number is too long")

    data = certificate.file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise ApiError(413, "File too large (max 5 MB)")
    if not data:
        raise ApiError(400, "Please choose a certificate file")

    mime = _detect_type(data)
    if mime is None:
        raise ApiError(415, "Only PDF, PNG or JPG files are allowed")

    digest = hashlib.sha256(data).hexdigest()
    existing = db.scalar(select(Certificate).where(Certificate.hash == digest))
    if existing:
        # The same bytes can only belong to one holder, so name who holds it already —
        # otherwise an admin registering a copied file has no idea why it was refused.
        who = existing.holder_name or "another holder"
        raise ApiError(409, f"This exact file is already registered to {who}")

    cert = Certificate(
        hash=digest,
        file_name=(certificate.filename or "certificate")[:255],
        mime_type=mime,
        size=len(data),
        holder_name=holder_name,
        cert_number=cert_number,
        data=data,
        doc_text=fingerprint(data, mime),
        uploaded_by=admin.id,
    )
    db.add(cert)
    db.commit()
    return {
        "id": cert.id, "hash": cert.hash, "holderName": cert.holder_name, "certNumber": cert.cert_number,
        "embeddedQrCodes": extract_qr_codes(data, mime),
    }


@router.delete("/certificates/{cert_id}")
def delete_certificate(cert_id: int, db: Session = Depends(get_db)):
    """Removes the registry entry so the same file can be registered again if needed."""
    cert = db.get(Certificate, cert_id)
    if cert is None:
        raise ApiError(404, "Certificate not found")
    db.delete(cert)
    db.commit()
    return {"ok": True}
