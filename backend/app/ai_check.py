"""Visual plausibility check via Google's Gemini API (free tier, no card needed) - an
opinion, not a verification. No model is trained here and no database is consulted: this
only flags things that look visually inconsistent (fonts, alignment, colour, spelling),
the way a careful skim might. It can be wrong in both directions and the frontend shows
it with that caveat, as a second signal next to the real hash/template result, never in
place of it.
"""
import base64
import json

import cv2
import httpx
import numpy as np

from . import config

MODEL = "gemini-3.6-flash"
MAX_DIM = 1024  # keep the image small - vision tokens scale with pixel area
JPEG_QUALITY = 70
MAX_OUTPUT_TOKENS = 400  # thinking (even at "minimal") plus the JSON answer both count here

PROMPT = (
    "Look at this certificate/ID image only for VISUAL signs of inconsistency: mismatched "
    "fonts, misaligned text, spelling errors, odd colours, or missing elements you'd expect "
    "for this kind of document. You cannot know whether it is officially genuine - never "
    "claim that either way, only describe what you see. Reply with ONLY this compact JSON, "
    'nothing else: {"flags": ["short phrase", ...up to 4], "note": "one short plain '
    'sentence"}. Empty flags list if nothing looks off.'
)

EXTRACT_PROMPT = (
    "Read this certificate image and find: the recipient's full name, any certificate/"
    "reference number printed on it, and the course, event or award title. Reply with "
    'ONLY this compact JSON, nothing else: {"holderName": "...", "certNumber": "...", '
    '"title": "..."}. Use "" for a field you cannot find - never guess.'
)


def _to_jpeg(img_bgr) -> bytes:
    h, w = img_bgr.shape[:2]
    scale = min(1.0, MAX_DIM / max(h, w))
    if scale < 1.0:
        img_bgr = cv2.resize(img_bgr, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    if not ok:
        raise RuntimeError("Could not prepare this image")
    return buf.tobytes()


def _first_page_image(data: bytes, mime_type: str) -> bytes:
    if mime_type == "application/pdf":
        import pymupdf

        with pymupdf.open(stream=data, filetype="pdf") as doc:
            png_bytes = doc[0].get_pixmap(dpi=150).tobytes("png")
    else:
        png_bytes = data

    arr = np.frombuffer(png_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError("Could not read this file as an image")
    return _to_jpeg(img)


def _generate(jpeg_b64: str, prompt: str, max_tokens: int) -> str | None:
    """Calls Gemini with one image + prompt, returns the raw text answer (already
    stripped of any ```json fencing), or None if nothing usable came back."""
    if not config.GEMINI_API_KEY:
        raise RuntimeError("AI check is not configured")

    resp = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        headers={"x-goog-api-key": config.GEMINI_API_KEY, "content-type": "application/json"},
        json={
            "contents": [{
                "parts": [
                    {"inlineData": {"mimeType": "image/jpeg", "data": jpeg_b64}},
                    {"text": prompt},
                ],
            }],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                # Gemini 3's thinking can't be fully disabled, only turned down - without
                # this, reasoning tokens alone can exceed maxOutputTokens and leave no
                # room for the actual JSON answer (seen in testing: MAX_TOKENS with an
                # empty/truncated response).
                "thinkingConfig": {"thinkingLevel": "minimal"},
            },
        },
        timeout=30,
    )
    if resp.status_code >= 400:
        print("Gemini error:", resp.status_code, resp.text, flush=True)
        raise RuntimeError("AI check failed, try again")

    candidates = resp.json().get("candidates") or []
    if not candidates:
        return None

    try:
        text = candidates[0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return None

    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    return text


def run_ai_check(data: bytes, mime_type: str) -> dict:
    """Returns {"flags": [...], "note": "..."}. Raises RuntimeError with a user-facing
    message on any failure - never silently pretends nothing was found."""
    jpeg_b64 = base64.b64encode(_first_page_image(data, mime_type)).decode()
    text = _generate(jpeg_b64, PROMPT, MAX_OUTPUT_TOKENS)
    if text is None:
        return {"flags": [], "note": "Could not read the model's response."}

    try:
        parsed = json.loads(text)
    except ValueError:
        return {"flags": [], "note": "Could not read the model's response."}

    flags = [str(f)[:120] for f in parsed.get("flags", [])][:4]
    note = str(parsed.get("note", ""))[:300]
    return {"flags": flags, "note": note}


def run_extract(data: bytes, mime_type: str) -> dict:
    """Best-effort read of holder name / cert number / title off an uploaded certificate,
    to prefill the admin registration form. Returns "" for any field it can't find -
    the admin always reviews and can edit before registering, so a wrong guess never
    reaches the registry on its own."""
    jpeg_b64 = base64.b64encode(_first_page_image(data, mime_type)).decode()
    text = _generate(jpeg_b64, EXTRACT_PROMPT, 200)
    if text is None:
        return {"holderName": "", "certNumber": "", "title": ""}

    try:
        parsed = json.loads(text)
    except ValueError:
        return {"holderName": "", "certNumber": "", "title": ""}

    return {
        "holderName": str(parsed.get("holderName", ""))[:120],
        "certNumber": str(parsed.get("certNumber", ""))[:80],
        "title": str(parsed.get("title", ""))[:120],
    }
