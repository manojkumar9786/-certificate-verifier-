from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..assistant import run_chat
from ..db import get_db
from ..errors import ApiError
from ..models import Certificate, Check, User
from ..security import current_user

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class ChatTurn(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = []


@router.post("/chat")
def chat(payload: ChatRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    message = payload.message.strip()
    if not message:
        raise ApiError(400, "Type a question first")
    if len(message) > 1000:
        raise ApiError(400, "Message is too long")

    history = [
        {"role": "user" if t.role == "user" else "assistant", "text": t.text.strip()[:500]}
        for t in payload.history[-8:]
    ]

    rows = db.execute(
        select(Check, Certificate.hash)
        .outerjoin(Certificate, Certificate.id == Check.matched_certificate_id)
        .where(Check.user_id == user.id)
        .order_by(Check.created_at.desc(), Check.id.desc())
        .limit(5)
    ).all()
    checks = [
        {
            "fileName": c.file_name,
            "status": c.status,
            "matchType": (("exact" if cert_hash == c.hash else "template") if cert_hash else None),
        }
        for c, cert_hash in rows
    ]

    try:
        reply = run_chat(message, history, checks)
    except RuntimeError as e:
        raise ApiError(503, str(e))
    return {"reply": reply}
