from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import as_http_exception, get_actor_id
from app.schemas.care import (
    AvailabilityResponse,
    CircleMemberResponse,
    CircleResponse,
    ScheduledItemResponse,
)
from app.services.care_coordination import get_care_coordination_service
from app.services.errors import ServiceError

router = APIRouter(prefix="/circles", tags=["care circles"])


@router.get("/{circle_id}", response_model=CircleResponse)
def get_circle(
    circle_id: UUID,
    actor_id: Annotated[str, Depends(get_actor_id)],
) -> dict:
    try:
        return get_care_coordination_service().get_circle(circle_id, actor_id)
    except ServiceError as exc:
        raise as_http_exception(exc) from exc


@router.get("/{circle_id}/members", response_model=list[CircleMemberResponse])
def list_members(
    circle_id: UUID,
    actor_id: Annotated[str, Depends(get_actor_id)],
) -> list[dict]:
    try:
        return get_care_coordination_service().list_members(circle_id, actor_id)
    except ServiceError as exc:
        raise as_http_exception(exc) from exc


@router.get("/{circle_id}/availability", response_model=list[AvailabilityResponse])
def list_availability(
    circle_id: UUID,
    actor_id: Annotated[str, Depends(get_actor_id)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[dict]:
    try:
        return get_care_coordination_service().list_availability(
            circle_id, actor_id, limit, offset
        )
    except ServiceError as exc:
        raise as_http_exception(exc) from exc


@router.get("/{circle_id}/scheduled-items", response_model=list[ScheduledItemResponse])
def list_scheduled_items(
    circle_id: UUID,
    actor_id: Annotated[str, Depends(get_actor_id)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[dict]:
    try:
        return get_care_coordination_service().list_scheduled_items(
            circle_id, actor_id, limit, offset
        )
    except ServiceError as exc:
        raise as_http_exception(exc) from exc
