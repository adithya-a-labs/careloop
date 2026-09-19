from app.services.llm import LLMService
from app.schemas.common import CareEventExtractionResult, ExtractedCareEvent

name = "care_event"
allowed_tools = frozenset({"record_care_event"})

_llm = LLMService()

def extract_events(
    transcript: str,
    speaker_id: str,
    patient_id: str,
    role: str,
    relationship: str,
    patient_name: str,
    preferred_language: str = "English"
) -> CareEventExtractionResult:
    """Extract structured care events from a voice transcript."""
    return _llm.extract_care_events(
        transcript=transcript,
        speaker_id=speaker_id,
        patient_id=patient_id,
        role=role,
        relationship=relationship,
        patient_name=patient_name,
        preferred_language=preferred_language
    )

def plan(context: dict[str, object]) -> dict[str, object]:
    return {"agent": name, "action": "draft_event", "input": context}