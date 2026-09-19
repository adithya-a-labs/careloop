from fastapi import APIRouter
router = APIRouter(prefix="/handoffs", tags=["handoffs"])

@router.post("/draft")
def draft_handoff(circle_id: str) -> dict:
    return {"circle_id": circle_id, "summary": "Demo handoff summary", "status": "draft", "requires_confirmation": True}
