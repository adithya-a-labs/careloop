"""Memory Agent - extracts structured memories from spoken stories."""

import json
from typing import Any

from app.services.llm import LLMService
from app.schemas.common import MemoryExtractionResult

_llm = LLMService()


def _load_prompt() -> str:
    from pathlib import Path

    prompt_path = Path(__file__).parent.parent.parent / "prompts" / "memory_extraction.txt"
    return prompt_path.read_text(encoding="utf-8")


def extract_memory(
    transcript: str,
    speaker_name: str,
    patient_name: str,
) -> MemoryExtractionResult:
    """Extract structured memory from a spoken story."""
    if not _llm.configured:
        return _extract_demo_memory(transcript, speaker_name, patient_name)

    prompt = _load_prompt()

    context = {
        "transcript": transcript,
        "speaker_name": speaker_name,
        "patient_name": patient_name,
    }

    client = _llm._get_client()

    response = client.responses.parse(
        model="gpt-5.6-luna",
        input=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
        ],
        text_format=MemoryExtractionResult,
    )

    if response.output_parsed is None:
        return _extract_demo_memory(transcript, speaker_name, patient_name)
    return response.output_parsed


def _extract_demo_memory(
    transcript: str,
    speaker_name: str,
    patient_name: str,
) -> MemoryExtractionResult:
    """Demo fallback for memory extraction."""
    import re

    # Try to extract year
    year_match = re.search(r"\b(19|20)\d{2}\b", transcript)
    approximate_year = int(year_match.group()) if year_match else None

    # Simple theme detection
    themes = []
    lowered = transcript.lower()
    theme_keywords = {
        "work": ("job", "work", "career", "factory", "office", "employment"),
        "family": ("wedding", "marriage", "birth", "child", "grandchild", "sister", "brother", "mother", "father"),
        "travel": ("travel", "trip", "journey", "moved", "migration", "immigrated"),
        "independence": ("first job", "independence", "on my own"),
        "war": ("war", "conflict", "soldier", "army"),
        "education": ("school", "college", "university", "graduation", "study"),
        "love": ("love", "romance", "met", "dating", "courted"),
        "childhood": ("childhood", "kid", "young", "growing up", "played"),
    }
    for theme, keywords in theme_keywords.items():
        if any(kw in lowered for kw in keywords):
            themes.append(theme)

    # Simple place detection (capitalized words that might be places)
    places = []
    place_keywords = ("kochi", "trivandrum", "bangalore", "mumbai", "delhi", "chennai", "hyderabad", "kerala", "india", "church", "temple", "hospital", "school", "factory", "office")
    for place in place_keywords:
        if place in lowered:
            places.append(place.title())

    # People detection (capitalized names - simplified)
    people = []
    name_keywords = ("maya", "rahul", "anu", "amma", "appa", "sister", "brother", "mother", "father", "husband", "wife", "daughter", "son")
    for name in name_keywords:
        if name in lowered:
            people.append(name.title())

    # Generate title from first sentence or key phrase
    sentences = transcript.split(".")
    title = sentences[0].strip()[:80] if sentences else "Memory"
    if len(title) > 80:
        title = title[:77] + "..."

    return MemoryExtractionResult(
        title=title,
        approximate_year=approximate_year,
        people=people,
        places=places,
        themes=themes,
        body=transcript,
        confidence=0.8 if approximate_year or themes else 0.6,
    )


def plan(context: dict[str, Any]) -> dict[str, Any]:
    """CareBridge compatibility entry point."""
    return {
        "agent": "memory",
        "action": "extract_memory",
        "input": context,
        "requires_confirmation": True,
    }