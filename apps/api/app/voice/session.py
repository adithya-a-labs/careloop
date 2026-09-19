from app.schemas.common import ToolResult, VoiceTurn
from app.voice.tools import suggest_tool


def plan_voice_turn(turn: VoiceTurn) -> ToolResult:
    """Convert speech into a named, reviewable tool proposal; never execute raw model output."""
    context = {
        "user_id": turn.user_id,
        "speaker_id": turn.speaker_id,
        "speaker_name": turn.speaker_name,
        "patient_id": turn.patient_id,
        "role": turn.role,
        "relationship": turn.relationship,
        "patient_name": turn.patient_name,
        "preferred_language": turn.preferred_language,
        "referenced_task_id": turn.referenced_task_id,
    }
    tool, preview, requires_confirmation = suggest_tool(
        turn.transcript, turn.circle_id, context
    )
    status = "draft" if requires_confirmation else "ready"
    if tool == "no_action":
        status = "no_action"
    return ToolResult(
        tool=tool,
        preview=preview,
        requires_confirmation=requires_confirmation,
        status=status,
    )
