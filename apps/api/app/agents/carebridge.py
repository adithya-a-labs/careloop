"""Routes a request to a bounded specialist; it never receives database query access."""
from app.agents import care_event, coordination, handoff, memory

AGENTS = {module.name: module for module in (care_event, coordination, handoff, memory)}

def delegate(agent_name: str, context: dict[str, object]) -> dict[str, object]:
    if agent_name not in AGENTS:
        raise ValueError(f"Unknown CareBridge specialist: {agent_name}")
    return AGENTS[agent_name].plan(context)
