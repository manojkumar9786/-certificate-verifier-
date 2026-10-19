"""Renders a ready-to-register certificate PDF from a simple built-in template, for an
issuer who doesn't already have a design. The same body/title text goes onto every
recipient's copy — only the name differs — so template matching picks up the whole
batch exactly the way a batch of pre-made PDFs would.
"""
import textwrap
from io import BytesIO

import qrcode
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


def _wrap(text: str, width: int) -> list[str]:
    lines: list[str] = []
    for para in text.splitlines() or [""]:
        lines.extend(textwrap.wrap(para, width) or [""])
    return lines


def render_certificate(*, title: str, holder_name: str, body: str, issue_date: str, verify_url: str) -> bytes:
    buf = BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buf, pagesize=(width, height))

    c.setStrokeColorRGB(0.08, 0.1, 0.18)
    c.setLineWidth(3)
    c.rect(1.2 * cm, 1.2 * cm, width - 2.4 * cm, height - 2.4 * cm)
    c.setLineWidth(0.75)
    c.rect(1.5 * cm, 1.5 * cm, width - 3 * cm, height - 3 * cm)

    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 4 * cm, title[:90])

    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 5.3 * cm, "This certificate is proudly presented to")

    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(width / 2, height - 7.2 * cm, holder_name[:90])

    c.setFont("Helvetica", 13)
    text_obj = c.beginText(3 * cm, height - 9 * cm)
    text_obj.setLeading(18)
    for line in _wrap(body, 95):
        text_obj.textLine(line)
    c.drawText(text_obj)

    c.setFont("Helvetica", 11)
    c.drawString(3 * cm, 2.6 * cm, f"Issued: {issue_date}")

    qr_buf = BytesIO()
    qrcode.make(verify_url).save(qr_buf, format="PNG")
    qr_buf.seek(0)
    c.drawImage(ImageReader(qr_buf), width - 5 * cm, 2 * cm, 2.6 * cm, 2.6 * cm)
    c.setFont("Helvetica", 8)
    c.drawCentredString(width - 3.7 * cm, 1.7 * cm, "Scan to verify")

    c.showPage()
    c.save()
    return buf.getvalue()
