from types import SimpleNamespace

from app.core.config import settings
from app.schemas.common import CareEventExtractionResult, ExtractedCareEvent
from app.services.live import LiveService
from app.services.llm import LLMService


def test_luna_structured_extraction_preserves_application_identity(monkeypatch) -> None:
    transcript = "Amma ate very little at lunch."
    parsed = CareEventExtractionResult(
        events=[
            ExtractedCareEvent(
                type="meal",
                data={"meal": "lunch", "intake": "low"},
                subject_id="amma-id",
                reported_by="maya-id",
                source="voice",
                raw_transcript=transcript,
                confidence=0.97,
            )
        ]
    )
    calls: dict[str, object] = {}

    class Responses:
        def parse(self, **kwargs):
            calls.update(kwargs)
            return SimpleNamespace(output_parsed=parsed)

    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(
        LLMService,
        "_get_client",
        lambda _self: SimpleNamespace(responses=Responses()),
    )

    result = LLMService().extract_care_events(
        transcript=transcript,
        speaker_id="maya-id",
        patient_id="amma-id",
        role="family",
        relationship="daughter",
        patient_name="Amma",
        preferred_language="English",
    )

    assert calls["model"] == "gpt-5.6-luna"
    assert calls["text_format"] is CareEventExtractionResult
    assert result.events[0].subject_id == "amma-id"
    assert result.events[0].reported_by == "maya-id"


def test_live_session_uses_server_side_gpt_live_webrtc(monkeypatch) -> None:
    captured: dict[str, object] = {}

    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {
                "session": {"id": "live_test"},
                "transport": {"type": "webrtc", "sdp": "answer"},
            }

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return Response()

    monkeypatch.setattr(settings, "openai_api_key", "server-only-key")
    monkeypatch.setattr("app.services.live.httpx.post", fake_post)

    from app.schemas.common import LiveSessionCreate

    result = LiveService().create_session(
        LiveSessionCreate(
            sdp="offer",
            user_id="maya-id",
            circle_id="circle-id",
            speaker_id="maya-id",
            patient_id="amma-id",
            role="family",
            relationship="daughter",
            patient_name="Amma",
            preferred_language="English",
        )
    )

    assert captured["url"] == "https://api.openai.com/v1/live/sessions"
    assert captured["json"]["session"]["model"] == "gpt-live-1"
    assert captured["json"]["transport"] == {"type": "webrtc", "sdp": "offer"}
    assert result.transport.type == "webrtc"
