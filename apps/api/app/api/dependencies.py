from typing import Annotated

from fastapi import Header, HTTPException

from app.services.care_coordination import get_care_coordination_service
from app.services.errors import ServiceError


def get_actor_id(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    try:
        return get_care_coordination_service().resolve_actor(authorization)
    except ServiceError as exc:
        raise as_http_exception(exc) from exc


def as_http_exception(exc: ServiceError) -> HTTPException:
    detail = {"code": exc.code, "message": exc.message, **exc.details}
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return HTTPException(status_code=exc.status_code, detail=detail, headers=headers)
