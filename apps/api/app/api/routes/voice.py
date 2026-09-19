from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.agents.care_event import extract_events
from app.api.dependencies import as_http_exception, get_actor_id
from app.core.safety import enforce_coordination_scope
from app.schemas.common import (
    CareEventExtractionResult,
    LiveSessionCreate,
    LiveSessionResponse,
    ToolResult,
    VoiceTurn,
)
from app.services.care_coordination import get_care_coordination_service
from app.services.errors import ServiceError
from app.services.live import LiveService
from app.voice.session import plan_voice_turn

router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/turn", response_model=ToolResult)
def voice_turn(
    payload: VoiceTurn,
    actor_id: Annotated[str, Depends(get_actor_id)],
) -> ToolResult:
    try:
        enforce_coordination_scope(payload.transcript)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    service = get_care_coordination_service()
    context_actor_id = actor_id
    if service.uses_supabase:
        if payload.user_id != actor_id or payload.speaker_id != actor_id:
            raise HTTPException(status_code=403, detail="Voice context must match the signed-in user.")
    else:
        context_actor_id = payload.speaker_id
    try:
        service.assert_voice_context(payload.circle_id, context_actor_id, payload.patient_id)
    except ServiceError as exc:
        raise as_http_exception(exc) from exc
    return plan_voice_turn(payload)

@router.post("/extract", response_model=CareEventExtractionResult)
def extract_care_events(
    payload: VoiceTurn,
    actor_id: Annotated[str, Depends(get_actor_id)],
) -> CareEventExtractionResult:
    """Direct transcript to structured care events extraction."""
    try:
        enforce_coordination_scope(payload.transcript)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    
    service = get_care_coordination_service()
    speaker_id = payload.speaker_id or ""
    patient_id = payload.patient_id or ""
    if service.uses_supabase:
        if speaker_id != actor_id:
            raise HTTPException(status_code=403, detail="Voice context must match the signed-in user.")
        try:
            service.assert_voice_context(payload.circle_id, actor_id, patient_id)
        except ServiceError as exc:
            raise as_http_exception(exc) from exc

    return extract_events(
        transcript=payload.transcript,
        speaker_id=speaker_id,
        patient_id=patient_id,
        role=payload.role or "",
        relationship=payload.relationship or "",
        patient_name=payload.patient_name or "",
        preferred_language=payload.preferred_language or "English"
    )

@router.post("/session", response_model=LiveSessionResponse)
def create_voice_session(
    payload: LiveSessionCreate,
    actor_id: Annotated[str, Depends(get_actor_id)],
) -> LiveSessionResponse:
    """Authorize context and exchange a browser SDP offer for a GPT Live answer."""
    try:
        if payload.user_id != actor_id or payload.speaker_id != actor_id:
            raise HTTPException(status_code=403, detail="Voice context must match the signed-in user.")
        service = get_care_coordination_service()
        service.assert_voice_context(payload.circle_id, actor_id, payload.patient_id)
        return LiveService().create_session(payload)
    except ServiceError as exc:
        raise as_http_exception(exc) from exc
