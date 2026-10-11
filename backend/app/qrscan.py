"""Reads QR codes printed on the certificate itself — e.g. the issuer's own
verification QR — as an extra signal alongside our hash/template match. Decoding
never throws: a certificate with no readable QR just gets an empty list back.
"""
import cv2
import numpy as np

MAX_PAGES = 5
MAX_CODES = 10
MAX_TEXT_LEN = 500

_detector = cv2.QRCodeDetector()


def _decode_image(img_bytes: bytes) -> list[str]:
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return []
    try:
        ok, texts, _points, _straight = _detector.detectAndDecodeMulti(img)
    except cv2.error:
        return []
    if not ok:
        return []
    return [t[:MAX_TEXT_LEN] for t in texts if t]


def extract_qr_codes(data: bytes, mime_type: str) -> list[str]:
    """Every distinct QR payload found on the certificate, first few pages only."""
    found: list[str] = []
    try:
        if mime_type == "application/pdf":
            import pymupdf

            with pymupdf.open(stream=data, filetype="pdf") as doc:
                for page in doc[:MAX_PAGES]:
                    pix = page.get_pixmap(dpi=200)
                    found.extend(_decode_image(pix.tobytes("png")))
        else:
            found.extend(_decode_image(data))
    except Exception:
        return []

    seen, unique = set(), []
    for text in found:
        if text not in seen:
            seen.add(text)
            unique.append(text)
    return unique[:MAX_CODES]
