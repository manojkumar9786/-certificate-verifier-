"""Startup tasks: create tables, add newer columns to existing tables, seed the admin account."""
from sqlalchemy import inspect, select, text

from . import config
from .db import Base, SessionLocal, engine
from .models import User
from .security import check_password, hash_password


def ensure_schema() -> None:
    Base.metadata.create_all(engine)
    # create_all doesn't alter existing tables, so add columns introduced later by hand.
    cols = {c["name"] for c in inspect(engine).get_columns("users")}
    if "role" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'user'"))


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


def run() -> None:
    ensure_schema()
    seed_admin()
