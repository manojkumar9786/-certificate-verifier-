"""Conversational help assistant embedded in the app (Gemini, free tier). Unlike the
AI plausibility check, this one never looks at a file - it answers questions about how
CertVerify works, and can reference the signed-in user's own recent checks, so "why
didn't my certificate verify" gets a real, grounded answer instead of a canned FAQ line.
"""
import httpx

from . import config

MODEL = "gemini-2.5-flash-lite"  # see ai_check.py - gemini-3.6-flash's free tier is
# capped at 20 requests/day, shared across every AI feature in this app
MAX_OUTPUT_TOKENS = 300
MAX_HISTORY_TURNS = 8
MAX_MESSAGE_CHARS = 1000

KNOWLEDGE = """You are the CertVerify help assistant, embedded in the CertVerify web app.
Answer only questions about using CertVerify or understanding a verification result -
nothing else. If asked about something unrelated, politely say this assistant only
helps with CertVerify and redirect back. Keep answers short: 2-4 sentences, plain
language, no markdown headings.

How CertVerify actually works:
- An institution's admin registers genuine certificates into a registry (PDF, PNG or
  JPG, max 5 MB). Users never add to this registry themselves.
- Verifying an upload checks it two ways: (1) an exact match against a registered
  file's SHA-256 hash, and (2) for text-based PDFs, a similarity match against every
  registered certificate's text, so a certificate from the same event/template as a
  registered sample (same wording, different name) also verifies as genuine even if
  that exact file was never registered. Images and scanned PDFs only ever match
  exactly, since they have no extractable text.
- A result is "Genuine" if either check finds a match, with the registered holder's
  details shown; otherwise it's "Not verified" - that just means no registered sample
  matched closely enough, not that the file is proven fake.
- Any QR code printed on the certificate itself is also scanned and shown as a second,
  independent signal, separate from CertVerify's own match.
- An optional "AI plausibility check" (beta) is a visual opinion only, looking for
  mismatched fonts/colours/spelling - it never proves a certificate genuine or fake.
- Every registration is chained into a tamper-evident ledger admins can verify.
- A registered certificate gets a public /c/:id link and QR code, checkable with no
  login, and admins can bulk-generate certificates from a template for a whole event.

Never claim you personally verified, scored, or inspected a certificate in this chat -
that only ever happens through the real Verify page upload. If asked to verify
something right now, tell the user to use the Verify page."""


def _history_text(history: list[dict]) -> str:
    lines = [f"{'User' if t['role'] == 'user' else 'Assistant'}: {t['text']}" for t in history if t["text"]]
    return "\n".join(lines) if lines else "(no earlier messages)"


def _checks_text(checks: list[dict]) -> str:
    if not checks:
        return "This user has no verification checks yet."
    lines = [
        f'- "{c["fileName"]}" -> {c["status"]}' + (f' ({c["matchType"]} match)' if c["matchType"] else "")
        for c in checks
    ]
    return "This user's recent checks, most recent first:\n" + "\n".join(lines)


def run_chat(message: str, history: list[dict], checks: list[dict]) -> str:
    if not config.GEMINI_API_KEY:
        raise RuntimeError("Assistant is not configured")

    message = message.strip()[:MAX_MESSAGE_CHARS]
    if not message:
        raise RuntimeError("Type a question first")

    prompt = (
        f"{KNOWLEDGE}\n\n{_checks_text(checks)}\n\n"
        f"Conversation so far:\n{_history_text(history[-MAX_HISTORY_TURNS:])}\n\n"
        f"User: {message}\nAssistant:"
    )

    resp = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        headers={"x-goog-api-key": config.GEMINI_API_KEY, "content-type": "application/json"},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": MAX_OUTPUT_TOKENS},
        },
        timeout=30,
    )
    if resp.status_code >= 400:
        print("Gemini error:", resp.status_code, resp.text, flush=True)
        raise RuntimeError("Assistant failed, try again")

    candidates = resp.json().get("candidates") or []
    if not candidates:
        return "Sorry, I couldn't come up with an answer to that."
    try:
        text = candidates[0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return "Sorry, I couldn't come up with an answer to that."
    return text[:800]
