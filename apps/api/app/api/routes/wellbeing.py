from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/wellbeing", tags=["wellbeing"])

class CheckIn(BaseModel):
    circle_id: str
    mood: str = Field(pattern="^(good|okay|low|unwell)$")
    note: str | None = Field(default=None, max_length=1000)

@router.post("/check-ins")
def check_in(payload: CheckIn) -> dict:
    return {**payload.model_dump(), "status": "shared", "clinical_assessment": False}
