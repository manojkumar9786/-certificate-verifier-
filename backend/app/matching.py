"""Template matching.

Certificates handed out for one event share the same printed wording — only the
holder's name, the course and the date change. Comparing the *normalised* text of
two certificates therefore tells us whether an upload came from a batch the issuer
registered, which is what an exact SHA-256 match can never do.

Measured on real certificates: same template scores 0.79-0.94, an unrelated
certificate 0.37-0.39, an unrelated document 0.12-0.19. 0.65 sits in that gap.
"""
import re
from difflib import SequenceMatcher
from io import BytesIO

TEMPLATE_THRESHOLD = 0.65

_DIGITS = re.compile(r"\d+")
_NOISE = re.compile(r"[^a-z#:/.\s]")


def extract_text(data: bytes, mime_type: str) -> str:
    """Text layer of a PDF, or "" for images and scans we cannot read."""
    if mime_type != "application/pdf":
        return ""
    try:
        import pypdf

        reader = pypdf.PdfReader(BytesIO(data))
        return " ".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        return ""


def normalise(text: str) -> str:
    """Lower-case, and collapse every number so dates and roll numbers stop
    counting as differences between two certificates of the same batch."""
    text = _DIGITS.sub("#", text.lower())
    return " ".join(_NOISE.sub(" ", text).split())


def fingerprint(data: bytes, mime_type: str) -> str:
    return normalise(extract_text(data, mime_type))


def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()
