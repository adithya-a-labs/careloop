from app.schemas.common import ToolResult, VoiceTurn
from app.voice.tools import suggest_tool


def plan_voice_turn(turn: VoiceTurn) -> ToolResult:
    """Convert speech into a named, reviewable tool proposal; never execute raw model output."""
    context = {
        "speaker_id": turn.speaker_id,
        "patient_id": turn.patient_id,
        "role": turn.role,
        "relationship": turn.relationship,
        "patient_name": turn.patient_name,
        "preferred_language": turn.preferred_language
    }
    tool, preview = suggest_tool(turn.transcript, turn.circle_id, context)
    return ToolResult(tool=tool, preview=preview, requires_confirmation=True)
