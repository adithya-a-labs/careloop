from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import as_http_exception, get_actor_id
from app.schemas.care import TaskCreate, TaskResponse, TaskStatus, TaskUpdate
from app.services.care_coordination import get_care_coordination_service
from app.services.errors import ServiceError

router = APIRouter(tags=["tasks"])


@router.get("/circles/{circle_id}/tasks", response_model=list[TaskResponse])
def list_tasks(
    circle_id: UUID,
    actor_id: Annotated[str, Depends(get_actor_id)],
    task_status: Annotated[TaskStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[dict]:
    try:
        return get_care_coordination_service().list_tasks(
            circle_id,
            actor_id,
            limit,
            offset,
            task_status.value if task_status else None,
        )
    except ServiceError as exc:
        raise as_http_exception(exc) from exc


@router.post(
    "/circles/{circle_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    circle_id: UUID,
    payload: TaskCreate,
    actor_id: Annotated[str, Depends(get_actor_id)],
) -> dict:
    try:
        return get_care_coordination_service().create_task(circle_id, actor_id, payload)
    except ServiceError as exc:
        raise as_http_exception(exc) from exc


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    actor_id: Annotated[str, Depends(get_actor_id)],
) -> dict:
    try:
        return get_care_coordination_service().update_task(task_id, actor_id, payload)
    except ServiceError as exc:
        raise as_http_exception(exc) from exc
