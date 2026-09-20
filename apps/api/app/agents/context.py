"""Read-only, grounded answers about the current Care Circle state."""

from __future__ import annotations

from datetime import UTC, datetime, time
from typing import Any, Literal

from app.schemas.common import ContextQueryResult, ContextSource

name = "context"
allowed_tools = frozenset(
    {
        "list_recent_events",
        "list_tasks",
        "list_members",
        "list_scheduled_items",
        "list_availability",
        "read_handoff_context",
    }
)

_OPEN_TASK_STATUSES = {"pending", "open", "in_progress"}


def _as_datetime(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    parsed = value if isinstance(value, datetime) else datetime.fromisoformat(value)
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)


def _when(value: str | datetime | None) -> str:
    parsed = _as_datetime(value)
    if parsed is None:
        return "with no time set"
    local = parsed.astimezone()
    today = datetime.now().astimezone().date()
    day = "today" if local.date() == today else local.strftime("%A, %d %B")
    return f"{day} at {local.strftime('%I:%M %p').lstrip('0')}"


def _is_today(value: str | datetime | None) -> bool:
    parsed = _as_datetime(value)
    return bool(parsed and parsed.astimezone().date() == datetime.now().astimezone().date())


def _is_evening(value: str | datetime | None) -> bool:
    parsed = _as_datetime(value)
    if parsed is None or not _is_today(parsed):
        return False
    return parsed.astimezone().time() >= time(17, 0)


def _source(
    kind: Literal["care_event", "task", "scheduled_item", "member", "availability"],
    row: dict[str, Any],
    label: str,
    timestamp_key: str | None = None,
) -> ContextSource:
    return ContextSource(
        kind=kind,
        id=row["id"] if "id" in row else row["profile_id"],
        label=label,
        occurred_at=row.get(timestamp_key) if timestamp_key else None,
    )


def _join(items: list[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return f"{', '.join(items[:-1])}, and {items[-1]}"


def _event_label(event: dict[str, Any]) -> str:
    transcript = event.get("raw_transcript")
    if transcript:
        return str(transcript).strip().rstrip(".!?;:")
    event_type = str(event.get("event_type", "care")).replace("_", " ")
    details = " / ".join(str(value) for value in event.get("event_data", {}).values())
    return f"{event_type}: {details}" if details else f"{event_type} update"


def _task_answer(
    transcript: str,
    circle_id: str,
    actor_id: str,
) -> ContextQueryResult:
    from app.services.care_coordination import get_care_coordination_service

    tasks = get_care_coordination_service().list_tasks(circle_id, actor_id, 100, 0)
    open_tasks = [task for task in tasks if task.get("status") in _OPEN_TASK_STATUSES]
    lowered = transcript.lower()
    assigned_tasks = [task for task in tasks if task.get("assigned_to") == actor_id]
    if "my" in lowered or "i need" in lowered:
        open_tasks = [task for task in open_tasks if task.get("assigned_to") == actor_id]
    if "today" in lowered:
        open_tasks = [task for task in open_tasks if _is_today(task.get("due_at"))]

    if not open_tasks:
        scope = "assigned to you today" if "today" in lowered else "assigned to you"
        recent_completed = [
            task for task in assigned_tasks if task.get("status") in {"completed", "done"}
        ][:3]
        if recent_completed and "today" not in lowered:
            titles = _join([task["title"] for task in recent_completed])
            return ContextQueryResult(
                heading="YOUR TASKS",
                answer=f"There are no open tasks {scope}. Recently completed: {titles}.",
                sources=[
                    _source("task", task, task["title"], "completed_at")
                    for task in recent_completed
                ],
            )
        return ContextQueryResult(
            heading="YOUR TASKS",
            answer=f"There are no open tasks {scope} in CareLoop.",
            sources=[],
        )

    details = [f"{task['title']} ({_when(task.get('due_at'))})" for task in open_tasks[:4]]
    return ContextQueryResult(
        heading="YOUR TASKS",
        answer=f"Open tasks: {_join(details)}.",
        sources=[_source("task", task, task["title"], "due_at") for task in open_tasks[:4]],
    )


def _schedule_answer(
    transcript: str,
    circle_id: str,
    actor_id: str,
    speaker_name: str,
) -> ContextQueryResult:
    from app.services.care_coordination import get_care_coordination_service

    service = get_care_coordination_service()
    items = service.list_scheduled_items(circle_id, actor_id, 100, 0)
    lowered = transcript.lower()
    now = datetime.now(UTC)
    future = [item for item in items if (_as_datetime(item.get("starts_at")) or now) >= now]

    if "today" in lowered or "this evening" in lowered:
        future = [item for item in items if _is_today(item.get("starts_at"))]
    if "evening" in lowered:
        future = [item for item in future if _is_evening(item.get("starts_at"))]
    if "my visit" in lowered:
        named = [item for item in future if speaker_name.lower() in item["title"].lower()]
        future = named or [item for item in future if "visit" in item["title"].lower()]
    else:
        members = service.list_members(circle_id, actor_id)
        mentioned = next(
            (
                member["display_name"]
                for member in members
                if member["display_name"].lower() in lowered
            ),
            None,
        )
        if mentioned:
            future = [item for item in future if mentioned.lower() in item["title"].lower()]
    if "who is visiting" in lowered or "who's visiting" in lowered:
        future = [item for item in future if "visit" in item["title"].lower()]

    if not future:
        return ContextQueryResult(
            heading="TODAY",
            answer="There is no matching scheduled item in the current CareLoop schedule.",
            sources=[],
        )

    details = [f"{item['title']} is {_when(item['starts_at'])}" for item in future[:4]]
    return ContextQueryResult(
        heading="TODAY",
        answer=f"{_join(details)}.",
        sources=[
            _source("scheduled_item", item, item["title"], "starts_at") for item in future[:4]
        ],
    )


def _meal_answer(
    transcript: str,
    circle_id: str,
    actor_id: str,
    patient_id: str,
    patient_name: str,
) -> ContextQueryResult:
    from app.services.care_coordination import get_care_coordination_service

    events = get_care_coordination_service().list_events(circle_id, actor_id, 100, 0)
    lowered = transcript.lower()
    meal_name = next(
        (meal for meal in ("breakfast", "lunch", "dinner", "snack") if meal in lowered), None
    )
    matches = [
        event
        for event in events
        if event.get("subject_id") == patient_id
        and event.get("event_type") == "meal"
        and (meal_name is None or event.get("event_data", {}).get("meal") == meal_name)
        and ("today" not in lowered or _is_today(event.get("occurred_at")))
    ]
    if not matches:
        return ContextQueryResult(
            heading="TODAY",
            answer=f"CareLoop has no matching {meal_name or 'meal'} update for {patient_name}.",
            sources=[],
        )
    event = matches[0]
    intake = str(event.get("event_data", {}).get("intake", "recorded")).replace("_", " ")
    return ContextQueryResult(
        heading="TODAY",
        answer=f"Yes. {patient_name}'s {meal_name or 'meal'} was recorded as {intake} {_when(event['occurred_at'])}.",
        sources=[_source("care_event", event, _event_label(event), "occurred_at")],
    )


def _past_visit_answer(
    transcript: str,
    circle_id: str,
    actor_id: str,
    patient_id: str,
) -> ContextQueryResult:
    from app.services.care_coordination import get_care_coordination_service

    service = get_care_coordination_service()
    members = service.list_members(circle_id, actor_id)
    lowered = transcript.lower()
    person = next(
        (member for member in members if member["display_name"].lower() in lowered),
        None,
    )
    events = service.list_events(circle_id, actor_id, 100, 0)
    matches = [
        event
        for event in events
        if event.get("subject_id") == patient_id
        and event.get("event_type") == "visit"
        and (person is None or event.get("reported_by") == person["profile_id"])
    ]
    if not matches:
        who = person["display_name"] if person else "that person"
        return ContextQueryResult(
            heading="CARELOOP",
            answer=f"CareLoop has no recorded visit from {who}.",
            sources=[],
        )
    event = matches[0]
    who = person["display_name"] if person else "The caregiver"
    return ContextQueryResult(
        heading="CARELOOP",
        answer=f"{who}'s most recent recorded visit was {_when(event['occurred_at'])}.",
        sources=[_source("care_event", event, _event_label(event), "occurred_at")],
    )


def _synthesis_answer(
    transcript: str,
    circle_id: str,
    actor_id: str,
    speaker_name: str,
    patient_name: str,
) -> ContextQueryResult:
    from app.services.care_coordination import get_care_coordination_service

    service = get_care_coordination_service()
    lowered = transcript.lower()
    since: datetime | None = None
    last_visit_id: str | None = None
    heading: Literal["CARELOOP", "BEFORE YOUR VISIT", "TODAY", "YOUR TASKS"] = "CARELOOP"

    if "changed" in lowered and "visit" in lowered:
        all_events = service.list_events(circle_id, actor_id, 100, 0)
        last_visit = next(
            (
                event
                for event in all_events
                if event.get("event_type") == "visit" and event.get("reported_by") == actor_id
            ),
            None,
        )
        since = _as_datetime(last_visit.get("occurred_at")) if last_visit else None
        last_visit_id = str(last_visit["id"]) if last_visit else None
        heading = "BEFORE YOUR VISIT"
    elif "before my visit" in lowered:
        heading = "BEFORE YOUR VISIT"

    context = service.handoff_context(circle_id, actor_id, since)
    events = [
        event
        for event in context["events_since_last_seen"]
        if str(event["id"]) != last_visit_id
        and (since is None or (_as_datetime(event.get("occurred_at")) or since) > since)
    ][:3]
    tasks = [task for task in context["pending_tasks"] if task.get("assigned_to") == actor_id][:2]
    upcoming = context["upcoming"][:2]

    parts: list[str] = []
    if events:
        parts.append("Recent updates: " + _join([_event_label(event) for event in events]))
    if tasks:
        parts.append("Your open work: " + _join([task["title"] for task in tasks]))
    if "before my visit" in lowered and upcoming:
        parts.append(
            "Coming up: "
            + _join([f"{item['title']} {_when(item['starts_at'])}" for item in upcoming])
        )
    if not parts:
        parts.append(f"There are no matching new CareLoop updates for {patient_name}.")

    sources = [_source("care_event", event, _event_label(event), "occurred_at") for event in events]
    sources.extend(_source("task", task, task["title"], "due_at") for task in tasks)
    if "before my visit" in lowered:
        sources.extend(
            _source("scheduled_item", item, item["title"], "starts_at") for item in upcoming
        )

    return ContextQueryResult(
        heading=heading,
        answer=" ".join(f"{part}." if not part.endswith(".") else part for part in parts),
        sources=sources[:6],
    )


def answer_context_query(
    transcript: str,
    circle_id: str,
    actor_id: str,
    speaker_name: str,
    patient_id: str,
    patient_name: str,
    role: str,
) -> ContextQueryResult:
    """Answer from named read services only; MemoryBox is never queried."""
    lowered = transcript.lower()

    if any(
        phrase in lowered
        for phrase in ("my tasks", "i need to do", "hasn't been done", "has not been done")
    ):
        return _task_answer(transcript, circle_id, actor_id)
    if "did " in lowered and any(
        meal in lowered for meal in ("breakfast", "lunch", "dinner", "snack", "eat")
    ):
        return _meal_answer(transcript, circle_id, actor_id, patient_id, patient_name)
    if "when did" in lowered and "visit" in lowered:
        return _past_visit_answer(transcript, circle_id, actor_id, patient_id)
    if any(
        phrase in lowered
        for phrase in (
            "what do i have",
            "what do we have",
            "when is",
            "who is visiting",
            "who's visiting",
            "what's happening this evening",
            "what is happening this evening",
            "what is scheduled",
            "what's scheduled",
        )
    ):
        return _schedule_answer(transcript, circle_id, actor_id, speaker_name)
    return _synthesis_answer(
        transcript,
        circle_id,
        actor_id,
        speaker_name,
        patient_name,
    )


def plan(context: dict[str, Any]) -> dict[str, Any]:
    return {
        "agent": "context",
        "action": "answer_context_query",
        "input": context,
        "requires_confirmation": False,
    }
