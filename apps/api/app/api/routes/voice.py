from fastapi import APIRouter, HTTPException
from app.core.safety import enforce_coordination_scope
from app.schemas.common import ToolResult, VoiceTurn, CareEventExtractionResult
from app.voice.session import plan_voice_turn
from app.agents.care_event import extract_events
router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/turn", response_model=ToolResult)
def voice_turn(payload: VoiceTurn) -> ToolResult:
    try:
        enforce_coordination_scope(payload.transcript)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return plan_voice_turn(payload)

@router.post("/extract", response_model=CareEventExtractionResult)
def extract_care_events(payload: VoiceTurn) -> CareEventExtractionResult:
    """Direct transcript to structured care events extraction."""
    try:
        enforce_coordination_scope(payload.transcript)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    
    return extract_events(
        transcript=payload.transcript,
        speaker_id=payload.speaker_id or "",
        patient_id=payload.patient_id or "",
        role=payload.role or "",
        relationship=payload.relationship or "",
        patient_name=payload.patient_name or "",
        preferred_language=payload.preferred_language or "English"
    )

@router.post("/session")
def create_voice_session(payload: VoiceTurn) -> dict:
    """Create a realtime voice session configuration."""
    try:
        enforce_coordination_scope(payload.transcript)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    
    return {
        "session_id": "realtime-session-" + payload.circle_id[:8],
        "ws_url": "/api/v1/voice/ws",
        "context": {
            "circle_id": payload.circle_id,
            "speaker_id": payload.speaker_id,
            "patient_id": payload.patient_id,
            "role": payload.role,
            "relationship": payload.relationship,
            "patient_name": payload.patient_name,
            "preferred_language": payload.preferred_language
        }
    }
