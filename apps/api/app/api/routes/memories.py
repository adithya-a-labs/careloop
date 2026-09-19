from fastapi import APIRouter
router = APIRouter(prefix="/memories", tags=["memories"])

@router.get("")
def list_memories(circle_id: str) -> list[dict]:
    return []
