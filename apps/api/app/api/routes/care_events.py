from fastapi import APIRouter
from app.schemas.common import CareEventCreate
router = APIRouter(prefix="/care-events", tags=["care events"])

@router.post("")
def create_event(payload: CareEventCreate) -> dict:
    return {"id": "demo-event", **payload.model_dump(), "status": "recorded"}
