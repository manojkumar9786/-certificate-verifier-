import hashlib
import re
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from .. import config
from ..ai_check import run_extract
from ..cert_generate import render_certificate
from ..db import get_db
from ..errors import ApiError
from ..ledger import append_block, verify_chain
from ..matching import fingerprint
from ..models import Certificate, Check, LedgerBlock, User
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
    db.flush()
    append_block(db, cert.id, cert.hash, cert.holder_name)
    db.commit()
    return {
        "id": cert.id, "hash": cert.hash, "holderName": cert.holder_name, "certNumber": cert.cert_number,
        "embeddedQrCodes": extract_qr_codes(data, mime),
    }


@router.delete("/certificates/{cert_id}")
def delete_certificate(cert_id: int, db: Session = Depends(get_db)):
    """Removes the registry entry so the same file can be registered again if needed.
    The certificate's ledger block stays - it already carries its own copy of the hash
    and holder name - only the now-dangling link to the deleted row is cleared."""
    cert = db.get(Certificate, cert_id)
    if cert is None:
        raise ApiError(404, "Certificate not found")
    db.execute(update(LedgerBlock).where(LedgerBlock.certificate_id == cert_id).values(certificate_id=None))
    db.delete(cert)
    db.commit()
    return {"ok": True}


@router.post("/certificates/extract")
def extract_certificate(certificate: UploadFile = File(...)):
    """Reads the holder name / cert number / title off an uploaded file with Gemini, to
    prefill the registration form. The admin still reviews every field before saving."""
    data = certificate.file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise ApiError(413, "File too large (max 5 MB)")
    if not data:
        raise ApiError(400, "Please choose a certificate file")

    mime = _detect_type(data)
    if mime is None:
        raise ApiError(415, "Only PDF, PNG or JPG files are allowed")

    try:
        return run_extract(data, mime)
    except RuntimeError as e:
        raise ApiError(503, str(e))


@router.post("/certificates/generate", status_code=201)
def generate_certificates(
    event_title: str = Form(...),
    body: str = Form(...),
    issue_date: str = Form(...),
    names: str = Form(...),
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    """Generates one certificate PDF per recipient from a built-in template and registers
    each straight into the registry - no design tool needed for the "one template, many
    winners" case this app exists for. Each PDF embeds a QR code to its own public verify
    page, and each registration is appended to the tamper-evident ledger exactly like a
    manually uploaded certificate is."""
    event_title, body, issue_date = event_title.strip(), body.strip(), issue_date.strip()
    if not event_title or not body or not issue_date:
        raise ApiError(400, "Title, body and date are required")

    recipient_names = [n.strip() for n in re.split(r"[\n,]+", names) if n.strip()]
    if not recipient_names:
        raise ApiError(400, "Add at least one recipient name")
    if len(recipient_names) > 100:
        raise ApiError(400, "Generate at most 100 certificates at a time")

    base_url = config.CLIENT_URLS[0].rstrip("/") if config.CLIENT_URLS else ""
    created = []
    for name in recipient_names:
        cert = Certificate(
            hash=f"gen-{uuid.uuid4().hex}",  # placeholder, unique on its own - replaced below
            file_name=f"{name}.pdf", mime_type="application/pdf", size=0,
            holder_name=name, cert_number=None, data=b"", doc_text="", uploaded_by=admin.id,
        )
        db.add(cert)
        db.flush()  # assigns cert.id, needed for the QR verify link

        pdf_bytes = render_certificate(
            title=event_title, holder_name=name, body=body.replace("{name}", name),
            issue_date=issue_date, verify_url=f"{base_url}/c/{cert.id}",
        )
        cert.hash = hashlib.sha256(pdf_bytes).hexdigest()
        cert.size = len(pdf_bytes)
        cert.data = pdf_bytes
        cert.doc_text = fingerprint(pdf_bytes, "application/pdf")
        append_block(db, cert.id, cert.hash, name)
        created.append(cert)

    db.commit()
    return {"created": [{"id": c.id, "holderName": c.holder_name, "hash": c.hash} for c in created]}


@router.get("/ledger")
def ledger(db: Session = Depends(get_db)):
    """Most recent blocks first, for the admin-facing integrity view."""
    blocks = db.scalars(select(LedgerBlock).order_by(LedgerBlock.idx.desc()).limit(200)).all()
    return {
        "blocks": [
            {
                "idx": b.idx, "certificateId": b.certificate_id, "holderName": b.holder_name,
                "certHash": b.cert_hash, "prevHash": b.prev_hash, "blockHash": b.block_hash,
                "createdAt": iso(b.created_at),
            }
            for b in blocks
        ]
    }


@router.get("/ledger/verify")
def ledger_verify(db: Session = Depends(get_db)):
    """Recomputes the whole chain and reports whether it's still intact."""
    return verify_chain(db)
