"""Lightweight deterministic intent router for CareLoop voice."""

from enum import Enum

from pydantic import BaseModel, ConfigDict


class Intent(str, Enum):
    CARE_UPDATE = "care_update"
    CATCH_UP = "catch_up"
    COORDINATION = "coordination"
    MEMORY = "memory"
    UNKNOWN = "unknown"


class IntentResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intent: Intent
    confidence: float
    reasoning: str


_CARE_UPDATE_PATTERNS = (
    "didn't sleep",
    "did not sleep",
    "not sleep well",
    "sleep quality",
    " sleep",
    " meal",
    " meals",
    " breakfast",
    " lunch",
    " dinner",
    " snack",
    "food",
    "medication",
    "medicine",
    "pill",
    "dose",
    "mood",
    "feeling",
    "pain",
    "hurt",
    "ache",
    "symptom",
    "nausea",
    "dizzy",
    "tired",
    "energy",
    "activity",
    "walk",
    "exercise",
    "appointment",
    "doctor",
    "visit",
    "checkup",
    "check-in",
    "check in",
    "bathroom",
    "bowel",
    "urine",
    "temperature",
    "fever",
    "blood pressure",
    "sugar",
    "glucose",
    "insulin",
    "weight",
    "vitals",
    "didn't eat",
    "did not eat",
    "ate little",
    "ate less",
    "feel lonely",
    "feel sad",
    "feel anxious",
    # Malayalam patterns
    "urakkam",
    "kittiyilla",
    "thinnilla",
    "thinnu",
    "kazhicho",
    "bhakshanam",
    "oushadham",
    "marunnu",
    "thonnunnu",
    "vedana",
    "aswasamilla",
    "ഉറക്കം",
    "ഭക്ഷണം",
    "മരുന്ന് കഴിച്ചു",
    "വേദന",
    "സുഖം",
)

_CATCH_UP_PATTERNS = (
    "catch me up",
    "catch up",
    "what happened",
    "what's happened",
    "what has happened",
    "while i was away",
    "while i was gone",
    "update me",
    "brief me",
    "summary",
    "recap",
    "recent",
    "latest",
    "missed",
    # Malayalam patterns
    "update tharoo",
    "enthokke nadannu",
    "njan poyiirunnu",
    "kurachu samayam",
    "എന്തൊക്കെ നടന്നു",
    "എനിക്ക് അപ്ഡേറ്റ് തരൂ",
    "ചുരുക്കി പറയൂ",
    "പുതിയ കാര്യങ്ങൾ എന്താണ്",
)

_COORDINATION_PATTERNS = (
    "who can",
    "who is available",
    "who's available",
    "assign",
    "ask",
    "tell",
    "remind",
    "task",
    "pick up",
    "pickup",
    "collect",
    "get the",
    "fetch",
    "pharmacy",
    "prescription",
    "schedule",
    "book",
    "arrange",
    "coordinate",
    "available",
    "availability",
    "can you",
    "could you",
    "would you",
    "mark",
    "done",
    "complete",
    "finished",
    "create a task",
    "new task",
    # Malayalam patterns
    "chodikkoo",
    "chodyam",
    "arahane",
    "veyandum",
    "kazhikkam",
    "prescription edukkam",
    "ആർക്കു കഴിയും",
    "ആർ ലഭ്യമാണ്",
    "രാഹുലിനോട് ചോദിക്കൂ",
    "ചോദിക്കൂ",
    "പ്രിസ്ക്രിപ്ഷൻ എടുക്കാൻ",
    "നാളെ ആരുണ്ട്",
)

_MEMORY_PATTERNS = (
    "tell you about",
    "story about",
    "remember when",
    "i want to tell",
    "i'd like to tell",
    "i would like to tell",
    "memory",
    "first job",
    "childhood",
    "growing up",
    "wedding",
    "birth",
    "graduation",
    "reminisce",
    "recall",
    "i remember",
    "when i was",
    "back in",
    "years ago",
    # Malayalam patterns
    "parayanulla",
    "katha",
    "ormayundo",
    "orkunnu",
    "munnile",
    "balyam",
    "kalyanam",
    "എനിക്ക് ഒരു കഥ പറയാനുണ്ട്",
    "ഞാൻ ഓർക്കുന്നു",
    "എന്റെ ആദ്യ ജോലി",
)


def _match_any(text: str, patterns: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(pattern in lowered for pattern in patterns)


def route_intent(transcript: str) -> IntentResult:
    """Determine the intent from a transcript using deterministic pattern matching."""
    if not transcript or not transcript.strip():
        return IntentResult(
            intent=Intent.UNKNOWN, confidence=0.0, reasoning="Empty transcript"
        )

    lowered = transcript.lower().strip()

    if _match_any(lowered, _CATCH_UP_PATTERNS):
        return IntentResult(
            intent=Intent.CATCH_UP,
            confidence=0.95,
            reasoning="Matched catch-up patterns (catch me up, what happened, etc.)",
        )

    if _match_any(lowered, _MEMORY_PATTERNS):
        return IntentResult(
            intent=Intent.MEMORY,
            confidence=0.85,
            reasoning="Matched memory patterns (tell you about, story, remember, etc.)",
        )

    if _match_any(lowered, _COORDINATION_PATTERNS):
        return IntentResult(
            intent=Intent.COORDINATION,
            confidence=0.9,
            reasoning="Matched coordination patterns (who can, assign, task, etc.)",
        )

    if _match_any(lowered, _CARE_UPDATE_PATTERNS):
        return IntentResult(
            intent=Intent.CARE_UPDATE,
            confidence=0.85,
            reasoning="Matched care update patterns (sleep, meal, medication, mood, etc.)",
        )

    return IntentResult(
        intent=Intent.UNKNOWN,
        confidence=0.5,
        reasoning="No clear intent patterns matched",
    )


__all__ = ["Intent", "IntentResult", "route_intent"]
