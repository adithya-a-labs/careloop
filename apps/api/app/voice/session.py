from app.schemas.common import ToolResult, VoiceTurn
from app.voice.tools import suggest_tool

def plan_voice_turn(turn: VoiceTurn) -> ToolResult:
    """Convert speech into a named, reviewable tool proposal; never execute raw model output."""
    tool, preview = suggest_tool(turn.transcript, turn.circle_id)
    return ToolResult(tool=tool, preview=preview, requires_confirmation=True)
