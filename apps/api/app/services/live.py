import httpx

from app.core.config import settings
from app.schemas.common import LiveSessionCreate, LiveSessionResponse
from app.services.errors import BackendUnavailableError


class LiveService:
    """Backend-only GPT Live WebRTC session exchange."""

    def create_session(self, payload: LiveSessionCreate) -> LiveSessionResponse:
        if not settings.openai_api_key:
            raise BackendUnavailableError()

        context = (
            f"user_id={payload.user_id}; circle_id={payload.circle_id}; "
            f"speaker_id={payload.speaker_id}; role={payload.role}; "
            f"relationship={payload.relationship}; patient_id={payload.patient_id}; "
            f"patient_name={payload.patient_name}; preferred_language={payload.preferred_language}."
        )
        instructions = (
            "You are CareLoop's warm live voice companion. CareLoop coordinates and summarizes; "
            "it does not diagnose, prescribe, or alter medication. Keep replies brief and natural. "
            "Never infer identity from voice. Use only this application-provided identity context: "
            f"{context} Ask a short follow-up only when it helps clarify an everyday care update."
        )
        request = {
            "session": {
                "model": "gpt-live-1",
                "instructions": instructions,
            },
            "transport": {"type": "webrtc", "sdp": payload.sdp},
        }
        try:
            response = httpx.post(
                "https://api.openai.com/v1/live/sessions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=request,
                timeout=30,
            )
            response.raise_for_status()
            return LiveSessionResponse.model_validate(response.json())
        except (httpx.HTTPError, ValueError) as exc:
            raise BackendUnavailableError() from exc
