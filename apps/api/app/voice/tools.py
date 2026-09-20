from app.agents.care_event import extract_events
from app.agents.carebridge import get_intent
from app.agents.context import answer_context_query
from app.agents.coordination import coordinate
from app.agents.handoff import generate_handoff_summary
from app.agents.intent_router import Intent
from app.agents.memory import extract_memory
from app.schemas.common import (
    CareEventExtractionResult,
    ContextQueryResult,
    CoordinationSuggestion,
    HandoffSummary,
    MemoryExtractionResult,
)

ALLOWED_TOOLS = frozenset(
    {"record_care_event", "draft_task", "draft_handoff", "read_context", "save_memory", "no_action"}
)


def suggest_tool(
    transcript: str, circle_id: str, context: dict | None = None
) -> tuple[str, dict[str, object], bool]:
    """Route transcript to appropriate agent and return tool proposal with preview."""
    if not context:
        context = {}

    intent = get_intent(transcript)

    base: dict[str, object] = {
        "user_id": context.get("user_id", ""),
        "circle_id": circle_id,
        "speaker_id": context.get("speaker_id", ""),
        "speaker_name": context.get("speaker_name", ""),
        "patient_id": context.get("patient_id", ""),
        "patient_name": context.get("patient_name", ""),
        "role": context.get("role", ""),
        "relationship": context.get("relationship", ""),
        "preferred_language": context.get("preferred_language", "English"),
        "source": "voice",
        "text": transcript,
        "intent": intent.value,
    }
    requires_confirmation = False

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
        base["extracted_events"] = [event.model_dump(mode="json") for event in result.events]
        requires_confirmation = bool(result.events)

    elif intent == Intent.CATCH_UP:
        tool = "draft_handoff"
        assert tool in ALLOWED_TOOLS
        handoff_summary: HandoffSummary = generate_handoff_summary(
            circle_id=circle_id,
            actor_id=context.get("speaker_id", ""),
            speaker_name=context.get("speaker_name") or "Family",
            patient_name=context.get("patient_name") or "Patient",
        )
        base["handoff_summary"] = handoff_summary.model_dump(mode="json")

    elif intent == Intent.COORDINATION:
        tool = "draft_task"
        assert tool in ALLOWED_TOOLS
        coord_suggestion: CoordinationSuggestion = coordinate(
            transcript=transcript,
            circle_id=circle_id,
            actor_id=context.get("speaker_id", ""),
            speaker_name=context.get("speaker_name") or "Family",
            patient_name=context.get("patient_name") or "Patient",
            referenced_task_id=context.get("referenced_task_id"),
        )
        base["coordination_suggestion"] = coord_suggestion.model_dump(mode="json")
        requires_confirmation = coord_suggestion.requires_confirmation

    elif intent == Intent.MEMORY:
        tool = "save_memory"
        assert tool in ALLOWED_TOOLS
        if transcript.lower().strip().rstrip('.!?') in {
            "i want to tell you a memory", "i want to share a memory",
            "i want to tell you about my first job",
        }:
            base["message"] = "I'd love to hear it. Tell me what happened, then we'll review the memory together."
            return tool, base, False
        memory_result: MemoryExtractionResult = extract_memory(
            transcript=transcript,
            speaker_name=context.get("speaker_name") or "Family",
            patient_name=context.get("patient_name") or "Patient",
        )
        base["memory_extraction"] = memory_result.model_dump(mode="json")
        base["memory_create"] = {
            "subject_id": context.get("patient_id", ""),
            "kind": "voice",
            "title": memory_result.title,
            "body": memory_result.body,
            "approximate_year": memory_result.approximate_year,
        }
        requires_confirmation = True

    elif intent == Intent.CONTEXT_QUERY:
        tool = "read_context"
        assert tool in ALLOWED_TOOLS
        context_result: ContextQueryResult = answer_context_query(
            transcript=transcript,
            circle_id=circle_id,
            actor_id=context.get("speaker_id", ""),
            speaker_name=context.get("speaker_name") or "Care Circle member",
            patient_id=context.get("patient_id", ""),
            patient_name=context.get("patient_name") or "care recipient",
            role=context.get("role") or "",
        )
        base["context_query"] = context_result.model_dump(mode="json")

    else:
        tool = "no_action"
        assert tool in ALLOWED_TOOLS
        base["message"] = (
            "I can record a care update, catch you up, coordinate a task, or save a memory. "
            "Please tell me which you would like."
        )

    return tool, base, requires_confirmation
