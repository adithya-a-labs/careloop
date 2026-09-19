from fastapi import APIRouter
from app.schemas.common import TaskCreate
router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("")
def list_tasks(circle_id: str) -> list[dict]:
    return []

@router.post("")
def create_task(payload: TaskCreate) -> dict:
    return {"id": "demo-task", **payload.model_dump(), "status": "open"}
