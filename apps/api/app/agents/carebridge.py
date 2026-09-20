"""Routes a request to a bounded specialist; it never receives database query access."""

from app.agents import care_event, context, coordination, handoff, memory
from app.agents.intent_router import Intent, route_intent

AGENTS = {module.name: module for module in (care_event, context, coordination, handoff, memory)}

INTENT_TO_AGENT = {
    Intent.CARE_UPDATE: "care_event",
    Intent.CATCH_UP: "handoff",
    Intent.COORDINATION: "coordination",
    Intent.MEMORY: "memory",
    Intent.CONTEXT_QUERY: "context",
}


def delegate(agent_name: str, context: dict[str, object]) -> dict[str, object]:
    if agent_name not in AGENTS:
        raise ValueError(f"Unknown CareBridge specialist: {agent_name}")
    return AGENTS[agent_name].plan(context)


def route_and_delegate(transcript: str, context: dict[str, object]) -> dict[str, object]:
    """Route transcript to appropriate agent and delegate."""
    intent_result = route_intent(transcript)
    agent_name = INTENT_TO_AGENT.get(intent_result.intent)

    if agent_name is None:
        return {
            "agent": "none",
            "action": "no_action",
            "input": context,
            "intent": intent_result.intent.value,
            "reasoning": intent_result.reasoning,
        }

    return AGENTS[agent_name].plan(context)


def get_intent(transcript: str) -> Intent:
    """Get intent without delegating."""
    return route_intent(transcript).intent
