from fastapi import APIRouter, HTTPException
from app.core.safety import enforce_coordination_scope
from app.schemas.common import ToolResult, VoiceTurn
from app.voice.session import plan_voice_turn
router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/turn", response_model=ToolResult)
def voice_turn(payload: VoiceTurn) -> ToolResult:
    try:
        enforce_coordination_scope(payload.transcript)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return plan_voice_turn(payload)
