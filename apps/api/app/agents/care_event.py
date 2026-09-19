name = "care_event"
allowed_tools = frozenset({"record_care_event"})

def plan(context: dict[str, object]) -> dict[str, object]:
    return {"agent": name, "action": "draft_event", "input": context}
