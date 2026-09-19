from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import as_http_exception, get_actor_id
from app.schemas.care import HandoffContextResponse
from app.services.care_coordination import get_care_coordination_service
from app.services.errors import ServiceError

router = APIRouter(tags=["handoffs"])


@router.get(
    "/circles/{circle_id}/handoff-context",
    response_model=HandoffContextResponse,
)
def get_handoff_context(
    circle_id: UUID,
    actor_id: Annotated[str, Depends(get_actor_id)],
    since: Annotated[
        datetime | None,
        Query(
            description=(
                "UTC ingestion-time cursor. When omitted, events created in the last "
                "48 hours are returned."
            )
        ),
    ] = None,
) -> dict:
    """Return structured catch-up data; this endpoint never generates prose."""
    if since is not None and since.tzinfo is None:
        raise HTTPException(
            status_code=422,
            detail={"code": "invalid_timestamp", "message": "since must include a UTC offset."},
        )
    try:
        return get_care_coordination_service().handoff_context(circle_id, actor_id, since)
    except ServiceError as exc:
        raise as_http_exception(exc) from exc
