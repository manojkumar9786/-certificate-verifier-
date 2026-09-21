from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError
from ..models import Certificate, Check, User
from ..security import admin_user
from ..utils import iso

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(admin_user)])


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    count = lambda q: db.scalar(q) or 0  # noqa: E731
    return {
        "users": count(select(func.count(User.id))),
        "verifiedUsers": count(select(func.count(User.id)).where(User.verified.is_(True))),
        "certificates": count(select(func.count(Certificate.id))),
        "checks": count(select(func.count(Check.id))),
        "duplicates": count(select(func.count(Check.id)).where(Check.status == "duplicate")),
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
                "uploadedBy": u.name, "uploadedByEmail": u.email, "createdAt": iso(c.created_at),
            }
            for c, u in rows
        ]
    }


@router.delete("/certificates/{cert_id}")
def delete_certificate(cert_id: int, db: Session = Depends(get_db)):
    """Removes the record so the same file can be registered again as 'original'."""
    cert = db.get(Certificate, cert_id)
    if cert is None:
        raise ApiError(404, "Certificate not found")
    db.delete(cert)
    db.commit()
    return {"ok": True}
