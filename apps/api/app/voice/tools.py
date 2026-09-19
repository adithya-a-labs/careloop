ALLOWED_TOOLS = frozenset({"record_care_event", "draft_task", "draft_handoff", "save_memory"})

def suggest_tool(transcript: str, circle_id: str) -> tuple[str, dict[str, object]]:
    lowered = transcript.lower()
    tool = "draft_task" if "remind" in lowered or "task" in lowered else "record_care_event"
    assert tool in ALLOWED_TOOLS
    return tool, {"circle_id": circle_id, "source": "voice", "text": transcript}
