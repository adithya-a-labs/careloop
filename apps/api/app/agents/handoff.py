"""Handoff Agent - generates concise care summaries from structured data."""

import json
from typing import Any

from app.services.llm import LLMService
from app.schemas.common import HandoffSummary

name = "handoff"
allowed_tools = frozenset({"list_recent_events", "list_open_tasks", "draft_handoff"})

_llm = LLMService()


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
                "subject_name": event.get("subject_name", "Unknown"),
                "reported_by_name": event.get("reported_by_name", "Unknown"),
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
                "assigned_to_name": task.get("assigned_to_name"),
                "due_at": task.get("due_at"),
                "priority": task.get("priority"),
                "completed_at": task.get("completed_at"),
            }
        )
    return formatted


def _strip_extra_fields(data: list[dict[str, Any]], allowed_fields: set[str]) -> list[dict[str, Any]]:
    """Remove extra fields not in the schema to avoid validation errors."""
    result = []
    for item in data:
        filtered = {k: v for k, v in item.items() if k in allowed_fields}
        result.append(filtered)
    return result


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
    since: str | None = None,
) -> HandoffSummary:
    """Generate a handoff summary using the LLM."""
    from app.services.care_coordination import get_care_coordination_service

    service = get_care_coordination_service()

    # Get the handoff context data
    ctx = service.handoff_context(circle_id, actor_id, since)

    # Enrich with profile names for the prompt
    profiles = service.list_members(circle_id, actor_id)
    profile_map = {p["profile_id"]: p for p in profiles}

    # Enrich events with names
    events = ctx["events_since_last_seen"]
    for event in events:
        subject_id = event.get("subject_id")
        reported_by = event.get("reported_by")
        event["subject_name"] = profile_map.get(subject_id, {}).get("display_name", "Unknown")
        event["reported_by_name"] = profile_map.get(reported_by, {}).get("display_name", "Unknown")

    # Enrich tasks with names
    pending_tasks = ctx["pending_tasks"]
    completed_tasks = ctx["completed_tasks"]
    for task in pending_tasks + completed_tasks:
        assigned_to = task.get("assigned_to")
        if assigned_to:
            task["assigned_to_name"] = profile_map.get(assigned_to, {}).get("display_name", "Unknown")
        else:
            task["assigned_to_name"] = None

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
        # Demo fallback
        return _generate_demo_handoff(ctx, speaker_name, patient_name)

    prompt = _load_prompt()

    client = _llm._get_client()

    response = client.responses.parse(
        model="gpt-5.6-luna",
        input=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps(prompt_input, ensure_ascii=False, default=str)},
        ],
        text_format=HandoffSummary,
    )

    if response.output_parsed is None:
        return _generate_demo_handoff(ctx, speaker_name, patient_name)
    return response.output_parsed


def _generate_demo_handoff(
    ctx: dict[str, Any], speaker_name: str, patient_name: str
) -> HandoffSummary:
    """Generate a demo handoff summary without LLM."""
    events = ctx["events_since_last_seen"]
    pending = ctx["pending_tasks"]
    completed = ctx["completed_tasks"]
    upcoming = ctx["upcoming"]

    # Strip extra fields that aren't in the schema
    event_fields = {"id", "circle_id", "subject_id", "reported_by", "event_type", "event_data", 
                    "source", "raw_transcript", "confidence", "occurred_at", "created_at"}
    task_fields = {"id", "circle_id", "title", "description", "created_by", "assigned_to", "status", 
                   "priority", "due_at", "completed_at", "source_event_id", "created_at", "updated_at"}
    upcoming_fields = {"id", "circle_id", "created_by", "title", "starts_at", "ends_at", "recurrence_rule", "created_at"}

    events = _strip_extra_fields(events, event_fields)
    pending = _strip_extra_fields(pending, task_fields)
    completed = _strip_extra_fields(completed, task_fields)
    upcoming = _strip_extra_fields(upcoming, upcoming_fields)

    # Build summary text
    parts = []
    if events:
        recent = events[:2]
        for e in recent:
            etype = e.get("event_type")
            if etype == "meal":
                parts.append(f"{patient_name} ate little at {e['event_data'].get('meal', 'a meal')}")
            elif etype == "visit":
                parts.append(f"{patient_name} had a {e['event_data'].get('visit_type', 'visit')}")
            elif etype == "check_in":
                parts.append(f"{patient_name}'s check-in: {e['event_data'].get('mood', 'okay')}")

    if pending:
        high_priority = [t for t in pending if t.get("priority") == "high"]
        if high_priority:
            task = high_priority[0]
            assignee = task.get("assigned_to") or "someone"
            parts.append(f"{task['title']} pending for {assignee}")

    if not parts:
        summary = f"No significant updates for {patient_name}."
    else:
        summary = ". ".join(parts) + "."

    return HandoffSummary(
        important=events[:3],
        pending=pending[:3],
        completed=completed[:3],
        upcoming=upcoming[:3],
        summary=summary,
    )


def plan(context: dict[str, Any]) -> dict[str, Any]:
    """CareBridge compatibility entry point."""
    return {
        "agent": "handoff",
        "action": "generate_handoff_summary",
        "input": context,
        "requires_confirmation": False,
    }
