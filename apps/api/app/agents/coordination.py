name = "coordination"
allowed_tools = frozenset({"list_availability", "draft_task", "suggest_assignee"})

def plan(context: dict[str, object]) -> dict[str, object]:
    return {"agent": name, "action": "suggest_coordination", "input": context}
