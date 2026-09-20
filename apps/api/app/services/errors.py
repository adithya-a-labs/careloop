from typing import Any


class ServiceError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class UnauthorizedError(ServiceError):
    def __init__(self, message: str = "A valid bearer token is required.") -> None:
        super().__init__("unauthorized", message, 401)


class ForbiddenError(ServiceError):
    def __init__(self, message: str = "You do not have access to this Care Circle.") -> None:
        super().__init__("circle_access_denied", message, 403)


class MemoryAccessDeniedError(ForbiddenError):
    def __init__(self) -> None:
        super().__init__(
            "MemoryBox is private to the care recipient and family members.",
        )
        self.code = "memory_access_denied"


class NotFoundError(ServiceError):
    def __init__(self, resource: str) -> None:
        super().__init__("not_found", f"{resource} was not found.", 404)


class InvalidOperationError(ServiceError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(code, message, 409)


class BackendUnavailableError(ServiceError):
    def __init__(self) -> None:
        super().__init__(
            "backend_unavailable",
            "The care coordination store is temporarily unavailable.",
            503,
        )
