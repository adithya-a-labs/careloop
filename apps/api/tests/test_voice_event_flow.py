from fastapi.testclient import TestClient

from app.main import app
from app.services.care_coordination import (
    DEMO_AMMA_ID,
    DEMO_CIRCLE_ID,
    get_care_coordination_service,
)


def test_voice_extract_adapts_to_core_event_and_is_shared() -> None:
    get_care_coordination_service.cache_clear()
    assert get_care_coordination_service().uses_supabase is False
    client = TestClient(app)
    transcript = "I didn't sleep very well and I didn't eat much at lunch."

    extraction = client.post(
        "/api/v1/voice/extract",
        json={
            "circle_id": DEMO_CIRCLE_ID,
            "transcript": transcript,
            "speaker_id": DEMO_AMMA_ID,
            "patient_id": DEMO_AMMA_ID,
            "role": "patient",
            "relationship": "self",
            "patient_name": "Amma",
            "preferred_language": "English",
        },
    )

    assert extraction.status_code == 200
    extracted_events = extraction.json()["events"]
    assert [event["type"] for event in extracted_events] == ["sleep", "meal"]

    created_ids: list[str] = []
    for event in extracted_events:
        core_event = {
            "event_type": event["type"],
            "event_data": event["data"],
            "subject_id": event["subject_id"],
            "reported_by": event["reported_by"],
            "source": event["source"],
            "raw_transcript": event["raw_transcript"],
            "confidence": event["confidence"],
        }
        created = client.post(
            f"/api/v1/circles/{DEMO_CIRCLE_ID}/events",
            json=core_event,
        )
        assert created.status_code == 201
        created_ids.append(created.json()["id"])

    maya_timeline = client.get(f"/api/v1/circles/{DEMO_CIRCLE_ID}/events")
    assert maya_timeline.status_code == 200
    shared_events = [
        event for event in maya_timeline.json() if event["id"] in created_ids
    ]
    assert len(shared_events) == 2
    assert all(event["reported_by"] == DEMO_AMMA_ID for event in shared_events)
    assert all(event["raw_transcript"] == transcript for event in shared_events)
