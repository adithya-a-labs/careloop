from app.agents.care_event import extract_events
from app.agents.carebridge import route_and_delegate, get_intent
from app.agents.coordination import coordinate
from app.agents.handoff import generate_handoff_summary
from app.agents.memory import extract_memory
from app.agents.intent_router import Intent
from app.schemas.common import (
    CareEventExtractionResult,
    CoordinationSuggestion,
    HandoffSummary,
    MemoryExtractionResult,
)

ALLOWED_TOOLS = frozenset({"record_care_event", "draft_task", "draft_handoff", "save_memory"})

def suggest_tool(transcript: str, circle_id: str, context: dict | None = None) -> tuple[str, dict[str, object]]:
    """Route transcript to appropriate agent and return tool proposal with preview."""
    if not context:
        context = {}

    intent = get_intent(transcript)

    base = {"circle_id": circle_id, "source": "voice", "text": transcript, "intent": intent.value}

    if intent == Intent.CARE_UPDATE:
        tool = "record_care_event"
        assert tool in ALLOWED_TOOLS
        result: CareEventExtractionResult = extract_events(
            transcript=transcript,
            speaker_id=context.get("speaker_id", ""),
            patient_id=context.get("patient_id", ""),
            role=context.get("role", ""),
            relationship=context.get("relationship", ""),
            patient_name=context.get("patient_name", ""),
            preferred_language=context.get("preferred_language", "English"),
        )
        base["extracted_events"] = [event.model_dump() for event in result.events]

    elif intent == Intent.CATCH_UP:
        tool = "draft_handoff"
        assert tool in ALLOWED_TOOLS
        handoff_summary: HandoffSummary = generate_handoff_summary(
            circle_id=circle_id,
            actor_id=context.get("speaker_id", ""),
            speaker_name=context.get("speaker_name", "Family"),
            patient_name=context.get("patient_name", "Patient"),
        )
        base["handoff_summary"] = handoff_summary.model_dump()

    elif intent == Intent.COORDINATION:
        tool = "draft_task"
        assert tool in ALLOWED_TOOLS
        coord_suggestion: CoordinationSuggestion = coordinate(
            transcript=transcript,
            circle_id=circle_id,
            actor_id=context.get("speaker_id", ""),
            speaker_name=context.get("speaker_name", "Family"),
            patient_name=context.get("patient_name", "Patient"),
        )
        base["coordination_suggestion"] = coord_suggestion.model_dump()

    elif intent == Intent.MEMORY:
        tool = "save_memory"
        assert tool in ALLOWED_TOOLS
        memory_result: MemoryExtractionResult = extract_memory(
            transcript=transcript,
            speaker_name=context.get("speaker_name", "Family"),
            patient_name=context.get("patient_name", "Patient"),
        )
        base["memory_extraction"] = memory_result.model_dump()

    else:
        tool = "draft_task" if "remind" in transcript.lower() or "task" in transcript.lower() else "record_care_event"
        assert tool in ALLOWED_TOOLS

    return tool, base
