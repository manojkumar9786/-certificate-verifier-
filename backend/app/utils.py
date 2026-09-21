from datetime import datetime, timezone


def iso(dt: datetime) -> str:
    """ISO string with timezone. SQLite returns naive datetimes; treat them as UTC."""
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()
