"""Handoff Agent - generates concise care summaries from structured data."""

import json
from datetime import datetime
from typing import Any

from app.schemas.common import HandoffNarrative, HandoffSummary
from app.services.llm import LLMService

name = "handoff"
allowed_tools = frozenset({"list_recent_events", "list_open_tasks", "draft_handoff"})

_llm = LLMService()
_SUMMARY_WORD_LIMIT = 22


def _trim_summary(summary: str) -> str:
    """Keep the spoken handoff close to the five-second product target."""
    words = summary.split()
    if len(words) <= _SUMMARY_WORD_LIMIT:
        return summary.strip()
    return " ".join(words[:_SUMMARY_WORD_LIMIT]).rstrip(".,;:") + "…"


def _load_prompt() -> str:
    from pathlib import Path

    prompt_path = Path(__file__).parent.parent.parent / "prompts" / "handoff_summary.txt"
    return prompt_path.read_text(encoding="utf-8")


def _format_events_for_prompt(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Format events for the LLM prompt with human-readable names."""
    formatted = []
    for event in events:
        formatted.append(
            {
                "event_type": event.get("event_type"),
                "event_data": event.get("event_data", {}),
                "subject_name": event.get("subject", {}).get("display_name", "Unknown"),
                "reported_by_name": event.get("reporter", {}).get("display_name", "Unknown"),
                "occurred_at": event.get("occurred_at"),
                "source": event.get("source"),
                "raw_transcript": event.get("raw_transcript"),
            }
        )
    return formatted


def _format_tasks_for_prompt(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Format tasks for the LLM prompt with human-readable names."""
    formatted = []
    for task in tasks:
        formatted.append(
            {
                "title": task.get("title"),
                "description": task.get("description"),
                "assigned_to_name": (task.get("assignee") or {}).get("display_name"),
                "due_at": task.get("due_at"),
                "priority": task.get("priority"),
                "completed_at": task.get("completed_at"),
            }
        )
    return formatted


def _format_upcoming_for_prompt(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Format upcoming scheduled items for the LLM prompt."""
    formatted = []
    for item in items:
        formatted.append(
            {
                "title": item.get("title"),
                "starts_at": item.get("starts_at"),
                "ends_at": item.get("ends_at"),
            }
        )
    return formatted


def generate_handoff_summary(
    circle_id: str,
    actor_id: str,
    speaker_name: str,
    patient_name: str,
    since: datetime | None = None,
) -> HandoffSummary:
    """Generate a handoff summary using the LLM."""
    from app.services.care_coordination import get_care_coordination_service

    service = get_care_coordination_service()

    # Get the handoff context data
    ctx = service.handoff_context(circle_id, actor_id, since)

    events = ctx["events_since_last_seen"]
    pending_tasks = ctx["pending_tasks"]
    completed_tasks = ctx["completed_tasks"]

    # Prepare prompt input
    prompt_input = {
        "events_since_last_seen": _format_events_for_prompt(events),
        "pending_tasks": _format_tasks_for_prompt(pending_tasks),
        "completed_tasks": _format_tasks_for_prompt(completed_tasks),
        "upcoming": _format_upcoming_for_prompt(ctx["upcoming"]),
        "speaker_name": speaker_name,
        "patient_name": patient_name,
    }

    if not _llm.configured:
        return _generate_demo_handoff(ctx, speaker_name, patient_name)

    prompt = _load_prompt()

    client = _llm._get_client()

    response = client.responses.parse(
        model="gpt-5.6-luna",
        input=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps(prompt_input, ensure_ascii=False, default=str)},
        ],
        text_format=HandoffNarrative,
    )

    if response.output_parsed is None:
        return _generate_demo_handoff(ctx, speaker_name, patient_name)
    return HandoffSummary(
        important=events[:3],
        pending=pending_tasks[:3],
        completed=completed_tasks[:3],
        upcoming=ctx["upcoming"][:3],
        summary=_trim_summary(response.output_parsed.summary),
    )


def _generate_demo_handoff(
    ctx: dict[str, Any], speaker_name: str, patient_name: str
) -> HandoffSummary:
    """Generate a demo handoff summary without LLM."""
    events = ctx["events_since_last_seen"]
    pending = ctx["pending_tasks"]
    completed = ctx["completed_tasks"]
    upcoming = ctx["upcoming"]

    parts: list[str] = []
    if events:
        recent = events[:2]
        for e in recent:
            etype = e.get("event_type")
            reporter = e.get("reporter", {}).get("display_name", "the Care Circle")
            if etype == "meal":
                parts.append(
                    f"{reporter} shared that {patient_name} ate little at "
                    f"{e['event_data'].get('meal', 'a meal')}"
                )
            elif etype == "visit":
                parts.append(
                    f"{reporter} recorded a completed "
                    f"{e['event_data'].get('visit_type', 'visit')}"
                )
            else:
                parts.append(f"{reporter} shared a {etype.replace('_', ' ')} update")

    if pending:
        task = next(
            (item for item in pending if item.get("priority") in {"high", "urgent"}),
            pending[0],
        )
        assignee = (task.get("assignee") or {}).get("display_name")
        owner_text = f" with {assignee}" if assignee else " and still needs someone"
        parts.append(f"{task['title']} is pending{owner_text}")

    if not parts:
        summary = f"There are no new Care Circle updates for {patient_name} in this handoff window."
    else:
        summary = ". ".join(parts[:3]) + "."

    return HandoffSummary(
        important=events[:3],
        pending=pending[:3],
        completed=completed[:3],
        upcoming=upcoming[:3],
        summary=_trim_summary(summary),
    )


def plan(context: dict[str, Any]) -> dict[str, Any]:
    """CareBridge compatibility entry point."""
    return {
        "agent": "handoff",
        "action": "generate_handoff_summary",
        "input": context,
        "requires_confirmation": False,
    }
