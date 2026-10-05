"""Startup tasks: create tables, add newer columns to existing tables, seed the admin account."""
from sqlalchemy import inspect, select, text

from . import config
from .db import Base, SessionLocal, engine
from .matching import fingerprint
from .models import Certificate, User
from .security import check_password, hash_password


def _add_column_if_missing(conn, table: str, column: str, ddl: str) -> None:
    cols = {c["name"] for c in inspect(conn).get_columns(table)}
    if column not in cols:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))


def ensure_schema() -> None:
    Base.metadata.create_all(engine)
    # create_all doesn't alter existing tables, so add columns introduced later by hand.
    with engine.begin() as conn:
        _add_column_if_missing(conn, "users", "role", "role VARCHAR(10) NOT NULL DEFAULT 'user'")
        _add_column_if_missing(conn, "certificates", "holder_name", "holder_name VARCHAR(120) NOT NULL DEFAULT ''")
        _add_column_if_missing(conn, "certificates", "cert_number", "cert_number VARCHAR(80)")
        _add_column_if_missing(conn, "checks", "matched_certificate_id", "matched_certificate_id INTEGER")
        blob_type = "BLOB" if conn.dialect.name == "sqlite" else "BYTEA"
        _add_column_if_missing(conn, "certificates", "data", f"data {blob_type}")
        _add_column_if_missing(conn, "certificates", "doc_text", "doc_text TEXT")
        if conn.dialect.name != "sqlite":  # SQLite doesn't enforce VARCHAR length or support ALTER COLUMN TYPE
            conn.execute(text("ALTER TABLE checks ALTER COLUMN status TYPE VARCHAR(15)"))


def seed_admin() -> None:
    email, password = config.ADMIN_EMAIL, config.ADMIN_PASSWORD
    if not email or not password:
        return
    if len(password.encode()) > 72:
        print("ADMIN_PASSWORD is longer than 72 bytes; admin not created", flush=True)
        return

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(name="Admin", email=email, password_hash=hash_password(password))
        elif not check_password(password, user.password_hash):
            user.password_hash = hash_password(password)
        user.role = "admin"
        user.verified = True
        db.add(user)
        db.commit()
    print(f"Admin account ready: {email}", flush=True)


def backfill_fingerprints() -> None:
    """Certificates registered before template matching existed have no text on
    file, so read it out of the bytes we already stored."""
    with SessionLocal() as db:
        pending = db.scalars(
            select(Certificate).where(Certificate.doc_text.is_(None), Certificate.data.is_not(None))
        ).all()
        for cert in pending:
            cert.doc_text = fingerprint(cert.data, cert.mime_type) or ""
        if pending:
            db.commit()
            print(f"Fingerprinted {len(pending)} existing certificate(s)", flush=True)


def run() -> None:
    ensure_schema()
    seed_admin()
    backfill_fingerprints()
