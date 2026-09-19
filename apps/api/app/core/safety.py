SAFETY_NOTICE = "CareLoop coordinates and summarizes. It does not diagnose, prescribe, or alter medication."
BLOCKED_INTENTS = ("diagnose", "prescribe", "change my dose", "stop medication", "alter medication")

def enforce_coordination_scope(text: str) -> None:
    """Reject requests outside CareLoop's explicitly non-clinical scope."""
    if any(phrase in text.lower() for phrase in BLOCKED_INTENTS):
        raise ValueError(SAFETY_NOTICE)
