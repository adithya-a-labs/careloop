"""Coordination Agent - helps coordinate care tasks using structured tool proposals."""

import json
import re
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
    actor_id: str | None = None,
) -> str | None:
    """Resolve task reference from transcript or conversation history."""
    lowered = transcript.lower()

    pending_tasks = [
        task for task in tasks if task.get("status") in ("pending", "open", "in_progress")
    ]
    candidates = pending_tasks
    if "my" in lowered.split() and actor_id:
        candidates = [task for task in pending_tasks if task.get("assigned_to") == actor_id]

    # Explicit task title mention. Never resolve an already-completed task.
    ignored = {"complete", "completed", "today", "tomorrow", "task", "mark", "done"}

    def matching(content: str) -> list[dict[str, Any]]:
        words = set(re.findall(r"\w+", content)) - ignored
        return [
            task for task in candidates
            if words & (set(re.findall(r"\w+", task.get("title", "").lower())) - ignored)
            - {"the", "a", "to", "up", "my", "with", "for", "and"}
        ]

    matches = matching(lowered)
    if matches:
        return matches[0]["id"] if len(matches) == 1 else None

    is_followup = bool(re.search(r"\b(that|it)\b", lowered)) or lowered.startswith(
        ("ask ", "assign to ", "tell ", "ചോദിക്കൂ")
    )
    if is_followup and referenced_task_id and any(
        str(task.get("id")) == referenced_task_id for task in candidates
    ):
        return referenced_task_id

    # Check history for recent task mentions
    if is_followup and history:
        for msg in reversed(history):
            content = msg.get("content", "").lower()
            matches = matching(content)
            if matches:
                return matches[0]["id"] if len(matches) == 1 else None

    # A pronoun without conversational evidence is not a task reference.
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

    deterministic = _coordinate_demo(transcript, context, conversation_history, referenced_task_id)
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
            "mark",
            "done",
            "complete",
            "finish",
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
        transcript,
        tasks,
        history,
        referenced_task_id,
        context.get("actor_id"),
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
        pending = [task for task in tasks if task["status"] in ("pending", "open")]
        if task_id:
            matches = [task for task in pending if task["id"] == task_id]
        elif "prescription" in lowered or "പ്രിസ്ക്രിപ്ഷൻ" in lowered:
            matches = [task for task in pending if "prescription" in task["title"].lower()]
        else:
            tomorrow = (datetime.now().astimezone() + timedelta(days=1)).date()
            matches = [
                task for task in pending if not task.get("assigned_to") and task.get("due_at")
                and datetime.fromisoformat(task["due_at"]).astimezone().date() == tomorrow
            ]
        if len(matches) != 1 or not matches[0].get("due_at"):
            return CoordinationSuggestion(
                action="list_availability", task_id=None, assignee_id=None,
                message="Which task and due time should I check availability for?",
                requires_confirmation=False,
            )
        prescription_task = matches[0]

        if prescription_task:
            due_at = prescription_task.get("due_at")
            target = (
                datetime.fromisoformat(due_at) if due_at else datetime.now(UTC) + timedelta(days=1)
            )
            available_members: list[dict[str, Any]] = []
            for avail in availability:
                starts_at = datetime.fromisoformat(avail["starts_at"])
                ends_at = datetime.fromisoformat(avail["ends_at"])
                if starts_at <= target <= ends_at:
                    member = next(
                        (m for m in members if m["profile_id"] == avail["profile_id"]), None
                    )
                    if member and member not in available_members:
                        available_members.append(member)

            if available_members:
                names = ", ".join(member["display_name"] for member in available_members)
                only_assignee = (
                    available_members[0]["profile_id"] if len(available_members) == 1 else None
                )
                return CoordinationSuggestion(
                    action="suggest_assignee",
                    task_id=prescription_task["id"],
                    assignee_id=only_assignee,
                    message=f"{names}: available when {prescription_task['title']} is due.",
                    requires_confirmation=False,
                )
            else:
                return CoordinationSuggestion(
                    action="list_availability",
                    task_id=prescription_task["id"],
                    assignee_id=None,
                    message="No one has recorded availability covering this task's due time.",
                    requires_confirmation=False,
                )

    # "Ask Rahul" / "Assign to Rahul"
    if any(phrase in lowered for phrase in ("ask ", "assign", "tell ", "ചോദിക്കൂ")):
        # Extract name after "ask"/"assign to"/"tell"
        assignees = {
            pid for name, pid in name_to_id.items()
            if re.search(r"\b" + re.escape(name) + r"\b", lowered)
        }
        if len(assignees) > 1:
            return CoordinationSuggestion(
                action="suggest_assignee", task_id=task_id, assignee_id=None,
                message="Who should I assign this to? Please choose one person.",
                requires_confirmation=False,
            )
        assignee_id = next(iter(assignees), None)

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
