name = "handoff"
allowed_tools = frozenset({"list_recent_events", "list_open_tasks", "draft_handoff"})

def plan(context: dict[str, object]) -> dict[str, object]:
    return {"agent": name, "action": "draft_handoff", "input": context, "requires_confirmation": True}
