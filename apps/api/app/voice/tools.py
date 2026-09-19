from app.agents.care_event import extract_events
from app.schemas.common import CareEventExtractionResult

ALLOWED_TOOLS = frozenset({"record_care_event", "draft_task", "draft_handoff", "save_memory"})

def suggest_tool(transcript: str, circle_id: str, context: dict | None = None) -> tuple[str, dict[str, object]]:
    lowered = transcript.lower()
    tool = "draft_task" if "remind" in lowered or "task" in lowered else "record_care_event"
    assert tool in ALLOWED_TOOLS
    
    base = {"circle_id": circle_id, "source": "voice", "text": transcript}
    
    if tool == "record_care_event" and context:
        result: CareEventExtractionResult = extract_events(
            transcript=transcript,
            speaker_id=context.get("speaker_id", ""),
            patient_id=context.get("patient_id", ""),
            role=context.get("role", ""),
            relationship=context.get("relationship", ""),
            patient_name=context.get("patient_name", ""),
            preferred_language=context.get("preferred_language", "English")
        )
        base["extracted_events"] = [event.model_dump() for event in result.events]
    
    return tool, base
