name = "memory"
allowed_tools = frozenset({"save_memory", "list_memories"})

def plan(context: dict[str, object]) -> dict[str, object]:
    return {"agent": name, "action": "draft_memory", "input": context, "requires_confirmation": True}
