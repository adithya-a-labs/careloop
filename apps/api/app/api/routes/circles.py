from fastapi import APIRouter
router = APIRouter(prefix="/circles", tags=["care circles"])

@router.get("/{circle_id}")
def get_circle(circle_id: str) -> dict:
    return {"id": circle_id, "name": "Demo family", "members": [], "demo": True}
