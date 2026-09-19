from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.dependencies import as_http_exception, get_actor_id
from app.schemas.care import MemoryCreate, MemoryResponse
from app.services.care_coordination import get_care_coordination_service
from app.services.errors import ServiceError

router = APIRouter(tags=["memories"])


@router.post(
    "/circles/{circle_id}/memories",
    response_model=MemoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_memory(
    circle_id: UUID,
    payload: MemoryCreate,
    actor_id: Annotated[str, Depends(get_actor_id)],
) -> dict:
    try:
        return get_care_coordination_service().create_memory(circle_id, actor_id, payload)
    except ServiceError as exc:
        raise as_http_exception(exc) from exc
