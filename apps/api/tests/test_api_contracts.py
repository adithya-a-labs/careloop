from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.care_coordination import (
    DEMO_AMMA_ID,
    DEMO_CIRCLE_ID,
    DEMO_MAYA_ID,
    DEMO_RAHUL_ID,
    get_care_coordination_service,
)


@pytest.fixture
def demo_client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setattr(settings, "demo_mode", True)
    monkeypatch.setattr(settings, "openai_api_key", "")
    get_care_coordination_service.cache_clear()
    with TestClient(app) as client:
        yield client
    get_care_coordination_service.cache_clear()


def test_event_contract_preserves_subject_and_reporter(demo_client: TestClient) -> None:
    response = demo_client.post(
        f"/api/v1/circles/{DEMO_CIRCLE_ID}/events",
        json={
            "subject_id": DEMO_AMMA_ID,
            "reported_by": DEMO_MAYA_ID,
            "event_type": "meal",
            "event_data": {"meal": "lunch", "intake": "low"},
            "source": "manual",
            "raw_transcript": "Synthetic contract test",
            "confidence": 0.97,
        },
    )

    assert response.status_code == 201
    assert response.json()["subject_id"] == DEMO_AMMA_ID
    assert response.json()["reported_by"] == DEMO_MAYA_ID


@pytest.mark.parametrize(
    ("payload_update", "missing_field"),
    [({"source": "manual-test"}, None), ({}, "subject_id"), ({"event_type": "NOT VALID"}, None)],
)
def test_invalid_event_contract_returns_422(
    demo_client: TestClient,
    payload_update: dict[str, str],
    missing_field: str | None,
) -> None:
    payload = {
        "subject_id": DEMO_AMMA_ID,
        "reported_by": DEMO_MAYA_ID,
        "event_type": "sleep",
        "event_data": {"quality": "poor"},
        "source": "manual",
    }
    payload.update(payload_update)
    if missing_field:
        payload.pop(missing_field)

    response = demo_client.post(
        f"/api/v1/circles/{DEMO_CIRCLE_ID}/events",
        json=payload,
    )

    assert response.status_code == 422


def test_task_create_assignment_and_completion_contract(demo_client: TestClient) -> None:
    created = demo_client.post(
        f"/api/v1/circles/{DEMO_CIRCLE_ID}/tasks",
        json={
            "title": "Synthetic API verification task",
            "description": "Contract test",
            "status": "pending",
            "priority": "medium",
        },
    )

    assert created.status_code == 201
    task_id = created.json()["id"]
    assigned = demo_client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"assigned_to": DEMO_RAHUL_ID},
    )
    assert assigned.status_code == 200
    assert assigned.json()["assigned_to"] == DEMO_RAHUL_ID

    completed = demo_client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"status": "completed"},
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"
    assert completed.json()["completed_at"] is not None


def test_memory_and_handoff_use_current_contract(demo_client: TestClient) -> None:
    memory = demo_client.post(
        f"/api/v1/circles/{DEMO_CIRCLE_ID}/memories",
        json={
            "subject_id": DEMO_AMMA_ID,
            "kind": "story",
            "title": "Synthetic API contract memory",
            "body": "Uses body and approximate_year, not legacy fields.",
            "approximate_year": 1978,
        },
    )

    assert memory.status_code == 201
    assert memory.json()["body"] == "Uses body and approximate_year, not legacy fields."
    assert memory.json()["approximate_year"] == 1978

    handoff = demo_client.get(f"/api/v1/circles/{DEMO_CIRCLE_ID}/handoff-context")
    assert handoff.status_code == 200
    assert set(handoff.json()) == {
        "events_since_last_seen",
        "pending_tasks",
        "completed_tasks",
        "upcoming",
    }


def test_irrelevant_voice_transcript_creates_no_event(demo_client: TestClient) -> None:
    response = demo_client.post(
        "/api/v1/voice/extract",
        json={
            "circle_id": DEMO_CIRCLE_ID,
            "speaker_id": DEMO_AMMA_ID,
            "patient_id": DEMO_AMMA_ID,
            "role": "patient",
            "relationship": "self",
            "patient_name": "Amma",
            "preferred_language": "Malayalam",
            "transcript": "The weather is lovely today.",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"events": []}


def test_real_mode_requires_bearer_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "demo_mode", False)
    monkeypatch.setattr(settings, "supabase_url", "https://configured.invalid")
    monkeypatch.setattr(settings, "supabase_secret_key", "configured")
    get_care_coordination_service.cache_clear()

    response = TestClient(app).get(f"/api/v1/circles/{DEMO_CIRCLE_ID}")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "unauthorized"
    get_care_coordination_service.cache_clear()
