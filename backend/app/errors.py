class ApiError(Exception):
    """Raised anywhere; rendered as {"error": message, **extra} so the frontend has one error shape."""

    def __init__(self, status: int, message: str, **extra):
        self.status = status
        self.message = message
        self.extra = extra
