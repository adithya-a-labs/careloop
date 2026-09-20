from app.agents.coordination import _coordinate_demo, _resolve_task_reference

TASKS = [
    {"id": "40000000-0000-0000-0000-000000000001", "title": "Pick up prescription",
     "assigned_to": None, "status": "pending"},
    {"id": "40000000-0000-0000-0000-000000000002", "title": "Complete today's visit",
     "assigned_to": "anu", "status": "pending"},
]


def test_pronoun_without_context_never_selects_first_task():
    assert _resolve_task_reference("Mark that done", TASKS, None) is None
    assert _resolve_task_reference("Complete it", TASKS, None) is None


def test_my_tasks_never_falls_back_to_someone_else():
    assert _resolve_task_reference("Mark my visit complete", TASKS, None, actor_id="rahul") is None
    assert _resolve_task_reference("Mark my visit complete", TASKS, None, actor_id="anu") == TASKS[1]["id"]
    unrelated = [dict(TASKS[1], title="Evening medicine check")]
    assert _resolve_task_reference("Mark my visit complete", unrelated, None, actor_id="anu") is None


def test_reference_requires_pending_task_and_explicit_title_wins():
    assert _resolve_task_reference("Mark that done", TASKS, None, TASKS[0]["id"]) == TASKS[0]["id"]
    assert _resolve_task_reference("Complete the visit", TASKS, None, TASKS[0]["id"]) == TASKS[1]["id"]
    completed = [dict(TASKS[0], status="completed")]
    assert _resolve_task_reference("Mark that done", completed, None, TASKS[0]["id"]) is None


def test_ambiguous_title_or_person_requires_clarification():
    tasks = [*TASKS, dict(TASKS[0], id="40000000-0000-0000-0000-000000000003")]
    assert _resolve_task_reference("Complete prescription pickup", tasks, None) is None
    result = _coordinate_demo("Ask Rahul or Maya", {
        "actor_id": "maya", "tasks": TASKS, "availability": [],
        "members": [
            {"display_name": "Rahul", "profile_id": "10000000-0000-0000-0000-000000000003"},
            {"display_name": "Maya", "profile_id": "10000000-0000-0000-0000-000000000002"},
        ],
    }, referenced_task_id=TASKS[0]["id"])
    assert result.requires_confirmation is False
    assert result.assignee_id is None
