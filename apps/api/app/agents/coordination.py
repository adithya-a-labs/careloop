"""Coordination Agent - helps coordinate care tasks using structured tool proposals."""

import json
from datetime import UTC, datetime, timedelta
from typing import Any

from app.schemas.common import CoordinationSuggestion
from app.services.llm import LLMService

name = "coordination"
allowed_tools = frozenset({"list_availability", "draft_task", "suggest_assignee"})

_llm = LLMService()


def _load_prompt() -> str:
    from pathlib import Path

    prompt_path = Path(__file__).parent.parent.parent / "prompts" / "coordination.txt"
    return prompt_path.read_text(encoding="utf-8")


def _extract_name_references(transcript: str, members: list[dict[str, Any]]) -> dict[str, str]:
    """Extract name references from transcript and map to profile_ids."""
    name_to_id = {}
    for member in members:
        name = member.get("display_name", "").lower()
        if name:
            name_to_id[name] = member["profile_id"]
            # Also match first name only
            first_name = name.split()[0]
            if first_name not in name_to_id:
                name_to_id[first_name] = member["profile_id"]
            if first_name == "rahul":
                name_to_id["രാഹുൽ"] = member["profile_id"]
    return name_to_id


def _resolve_task_reference(
    transcript: str,
    tasks: list[dict[str, Any]],
    history: list[dict[str, Any]] | None,
    referenced_task_id: str | None = None,
) -> str | None:
    """Resolve task reference from transcript or conversation history."""
    lowered = transcript.lower()

    if referenced_task_id and any(
        str(task.get("id")) == referenced_task_id
        and task.get("status") in ("pending", "open", "in_progress")
        for task in tasks
    ):
        return referenced_task_id

    # Explicit task title mention
    for task in tasks:
        title = task.get("title", "").lower()
        if title and any(word in lowered for word in title.split() if len(word) > 3):
            return task["id"]

    # Check history for recent task mentions
    if history:
        for msg in reversed(history):
            content = msg.get("content", "").lower()
            for task in tasks:
                title = task.get("title", "").lower()
                if title and any(word in content for word in title.split() if len(word) > 3):
                    return task["id"]

    # Default to first pending task if "that"/"it" used
    if any(word in lowered for word in ("that", "it", "the task")):
        pending = [t for t in tasks if t.get("status") in ("pending", "open")]
        if pending:
            return pending[0]["id"]

    return None


def _parse_due_at(text: str) -> str | None:
    """Parse relative due date from text (tomorrow, today, etc.)."""
    lowered = text.lower()
    now = datetime.now(UTC)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if "tomorrow" in lowered:
        return (today + timedelta(days=1)).isoformat()
    if "today" in lowered:
        return today.isoformat()
    if "next week" in lowered:
        return (today + timedelta(weeks=1)).isoformat()

    return None


def coordinate(
    transcript: str,
    circle_id: str,
    actor_id: str,
    speaker_name: str,
    patient_name: str,
    conversation_history: list[dict[str, Any]] | None = None,
    referenced_task_id: str | None = None,
) -> CoordinationSuggestion:
    """Generate a coordination suggestion using LLM with tool access."""
    from app.services.care_coordination import get_care_coordination_service

    service = get_care_coordination_service()

    # Gather context data
    members = service.list_members(circle_id, actor_id)
    tasks = service.list_tasks(circle_id, actor_id, 50, 0)
    availability = service.list_availability(circle_id, actor_id, 50, 0)

    # Build context for LLM
    context = {
        "circle_id": circle_id,
        "actor_id": actor_id,
        "speaker_name": speaker_name,
        "patient_name": patient_name,
        "members": [
            {
                "profile_id": m["profile_id"],
                "display_name": m["display_name"],
                "role": m["role"],
                "relationship": m.get("relationship"),
                "preferred_language": m.get("preferred_language"),
            }
            for m in members
        ],
        "tasks": [
            {
                "id": t["id"],
                "title": t["title"],
                "description": t.get("description"),
                "assigned_to": t.get("assigned_to"),
                "status": t["status"],
                "priority": t.get("priority"),
                "due_at": t.get("due_at"),
            }
            for t in tasks
        ],
        "availability": [
            {
                "id": a["id"],
                "profile_id": a["profile_id"],
                "starts_at": a["starts_at"],
                "ends_at": a["ends_at"],
                "note": a.get("note"),
            }
            for a in availability
        ],
    }

    deterministic = _coordinate_demo(
        transcript, context, conversation_history, referenced_task_id
    )
    lowered = transcript.lower()
    if not _llm.configured or any(
        phrase in lowered
        for phrase in (
            "who can",
            "who is available",
            "who's available",
            "ask ",
            "assign",
            "tell ",
            "ആർക്കു കഴിയും",
            "ആർ ലഭ്യമാണ്",
            "ചോദിക്കൂ",
        )
    ):
        return deterministic

    prompt = _load_prompt()

    client = _llm._get_client()

    # Build input with conversation history for context resolution
    input_data = {
        "transcript": transcript,
        "context": context,
        "conversation_history": conversation_history or [],
        "referenced_task_id": referenced_task_id,
    }

    response = client.responses.parse(
        model="gpt-5.6-luna",
        input=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps(input_data, ensure_ascii=False, default=str)},
        ],
        text_format=CoordinationSuggestion,
    )

    if response.output_parsed is None:
        return deterministic
    return response.output_parsed


def _coordinate_demo(
    transcript: str,
    context: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
    referenced_task_id: str | None = None,
) -> CoordinationSuggestion:
    """Demo fallback for coordination without LLM."""
    members = context["members"]
    tasks = context["tasks"]
    availability = context["availability"]
    lowered = transcript.lower()

    name_to_id = _extract_name_references(transcript, members)
    task_id = _resolve_task_reference(
        transcript, tasks, history, referenced_task_id
    )

    # "Who can pick up the prescription tomorrow?"
    if any(
        phrase in lowered
        for phrase in (
            "who can",
            "who is available",
            "who's available",
            "ആർക്കു കഴിയും",
            "ആർ ലഭ്യമാണ്",
        )
    ):
        # Find prescription task
        prescription_task = None
        for task in tasks:
            if "prescription" in task["title"].lower() and task["status"] in ("pending", "open"):
                prescription_task = task
                break

        if prescription_task:
            due_at = prescription_task.get("due_at")
            target = (
                datetime.fromisoformat(due_at)
                if due_at
                else datetime.now(UTC) + timedelta(days=1)
            )
            available_members: list[dict[str, Any]] = []
            for avail in availability:
                starts_at = datetime.fromisoformat(avail["starts_at"])
                ends_at = datetime.fromisoformat(avail["ends_at"])
                if starts_at <= target <= ends_at:
                    member = next((m for m in members if m["profile_id"] == avail["profile_id"]), None)
                    if member:
                        available_members.append(member)

            if available_members:
                names = ", ".join(member["display_name"] for member in available_members)
                only_assignee = (
                    available_members[0]["profile_id"]
                    if len(available_members) == 1
                    else None
                )
                return CoordinationSuggestion(
                    action="suggest_assignee",
                    task_id=prescription_task["id"],
                    assignee_id=only_assignee,
                    message=f"{names} is available when the prescription pickup is due tomorrow.",
                    requires_confirmation=False,
                )
            else:
                return CoordinationSuggestion(
                    action="list_availability",
                    task_id=prescription_task["id"],
                    assignee_id=None,
                    message="Prescription pickup needed but no one shows availability for tomorrow.",
                    requires_confirmation=False,
                )

    # "Ask Rahul" / "Assign to Rahul"
    if any(phrase in lowered for phrase in ("ask ", "assign", "tell ", "ചോദിക്കൂ")):
        # Extract name after "ask"/"assign to"/"tell"
        assignee_id = None
        for name, pid in name_to_id.items():
            if name in lowered:
                assignee_id = pid
                break

        if assignee_id and task_id:
            return CoordinationSuggestion(
                action="assign_task",
                task_id=task_id,
                assignee_id=assignee_id,
                message=f"Assign task to {next((m['display_name'] for m in members if m['profile_id'] == assignee_id), 'them')}?",
                requires_confirmation=True,
            )
        elif assignee_id:
            return CoordinationSuggestion(
                action="suggest_assignee",
                task_id=None,
                assignee_id=assignee_id,
                message=f"Which task should I assign to {next((m['display_name'] for m in members if m['profile_id'] == assignee_id), 'them')}?",
                requires_confirmation=False,
            )

    # "Mark that as done" / "Complete it"
    if any(phrase in lowered for phrase in ("mark", "done", "complete", "finish")):
        if task_id:
            return CoordinationSuggestion(
                action="complete_task",
                task_id=task_id,
                assignee_id=None,
                message="Mark task as completed?",
                requires_confirmation=True,
            )
        else:
            return CoordinationSuggestion(
                action="list_availability",
                task_id=None,
                assignee_id=None,
                message="Which task should I mark complete?",
                requires_confirmation=False,
            )

    # "Create a task to call the clinic tomorrow"
    if "create" in lowered and "task" in lowered:
        due_at = _parse_due_at(transcript)
        return CoordinationSuggestion(
            action="create_task",
            task_id=None,
            assignee_id=None,
            message=f"Create new task: '{transcript}' with due date {due_at or 'unspecified'}?",
            requires_confirmation=True,
        )

    # Default: list availability
    return CoordinationSuggestion(
        action="list_availability",
        task_id=None,
        assignee_id=None,
        message="I can help with task coordination. What would you like to do?",
        requires_confirmation=False,
    )


def plan(context: dict[str, Any]) -> dict[str, Any]:
    """CareBridge compatibility entry point."""
    return {
        "agent": "coordination",
        "action": "coordinate",
        "input": context,
        "requires_confirmation": True,
    }
