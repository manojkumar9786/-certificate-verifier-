"""Append-only hash chain over the certificate registry (see LedgerBlock for why). Every
registration — manual or generated — appends a block here; nothing ever edits one in place.
"""
import hashlib
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import LedgerBlock

GENESIS_HASH = "0" * 64


def _block_hash(idx: int, cert_hash: str, holder_name: str, prev_hash: str, created_at: datetime) -> str:
    # strftime, not isoformat(): SQLite's DateTime(timezone=True) drops tzinfo on
    # round-trip (Postgres keeps it), so isoformat()'s "+00:00" suffix would differ
    # between the block as first written and the same block re-read for verification -
    # a false "tampered" result on every check. The wall-clock value itself is unaffected.
    stamp = created_at.strftime("%Y-%m-%dT%H:%M:%S.%f")
    payload = f"{idx}|{cert_hash}|{holder_name}|{prev_hash}|{stamp}"
    return hashlib.sha256(payload.encode()).hexdigest()


def append_block(db: Session, certificate_id: int, cert_hash: str, holder_name: str) -> LedgerBlock:
    last = db.scalar(select(LedgerBlock).order_by(LedgerBlock.idx.desc()))
    idx = (last.idx + 1) if last else 0
    prev_hash = last.block_hash if last else GENESIS_HASH
    created_at = datetime.now(timezone.utc)
    block = LedgerBlock(
        idx=idx,
        certificate_id=certificate_id,
        cert_hash=cert_hash,
        holder_name=holder_name,
        prev_hash=prev_hash,
        block_hash=_block_hash(idx, cert_hash, holder_name, prev_hash, created_at),
        created_at=created_at,
    )
    db.add(block)
    # Sessions here run with autoflush=False (see db.py), so without this, a second
    # append_block() call in the same session - e.g. the backfill loop - would still
    # see an empty table via the SELECT above and reuse idx 0, duplicate-key-crashing
    # the whole app on commit instead of just this block.
    db.flush()
    return block


def verify_chain(db: Session) -> dict:
    """Recomputes every block's hash from its stored fields and checks the chain is
    unbroken. Returns the first block (if any) where a stored value no longer matches
    what it should be — proof that something in the registry's history was tampered with."""
    blocks = db.scalars(select(LedgerBlock).order_by(LedgerBlock.idx)).all()
    prev_hash = GENESIS_HASH
    for b in blocks:
        expected = _block_hash(b.idx, b.cert_hash, b.holder_name, prev_hash, b.created_at)
        if b.prev_hash != prev_hash or b.block_hash != expected:
            return {"valid": False, "blocks": len(blocks), "brokenAt": b.idx}
        prev_hash = b.block_hash
    return {"valid": True, "blocks": len(blocks), "brokenAt": None}
