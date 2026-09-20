import json
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.schemas.common import CareEventExtractionResult, ExtractedCareEvent


class LLMService:
    """Backend-only provider adapter. No SQL or unrestricted function execution is exposed."""

    @property
    def configured(self) -> bool:
        return bool(settings.openai_api_key)

    def _get_client(self) -> Any:
        from openai import OpenAI

        return OpenAI(api_key=settings.openai_api_key, timeout=20.0, max_retries=1)

    def _extract_demo_care_events(
        self,
        transcript: str,
        speaker_id: str,
        patient_id: str,
    ) -> CareEventExtractionResult:
        if not speaker_id or not patient_id:
            return CareEventExtractionResult(events=[])

        lowered = transcript.lower()
        events: list[ExtractedCareEvent] = []
        shared = {
            "subject_id": patient_id,
            "reported_by": speaker_id,
            "source": "voice",
            "raw_transcript": transcript,
        }

        if "sleep" in lowered and any(
            phrase in lowered for phrase in ("didn't sleep", "did not sleep", "not sleep well")
        ):
            events.append(
                ExtractedCareEvent(
                    type="sleep",
                    data={"quality": "poor"},
                    confidence=0.96,
                    **shared,
                )
            )
        if any(meal in lowered for meal in ("breakfast", "lunch", "dinner", "snack")) and any(
            phrase in lowered
            for phrase in ("didn't eat much", "did not eat much", "ate little", "ate less")
        ):
            meal = next(
                meal for meal in ("breakfast", "lunch", "dinner", "snack") if meal in lowered
            )
            events.append(
                ExtractedCareEvent(
                    type="meal",
                    data={"meal": meal, "intake": "low"},
                    confidence=0.97,
                    **shared,
                )
            )
        # Mood extraction for explicit feelings
        if any(phrase in lowered for phrase in ("feeling", "feel ", "felt ")) and any(
            word in lowered
            for word in (
                "lonely",
                "sad",
                "happy",
                "anxious",
                "worried",
                "depressed",
                "down",
                "upset",
                "good",
                "great",
                "okay",
                "fine",
                "well",
            )
        ):
            valence = "neutral"
            if any(
                word in lowered
                for word in ("lonely", "sad", "anxious", "worried", "depressed", "down", "upset")
            ):
                valence = "negative"
            elif any(word in lowered for word in ("happy", "good", "great", "well")):
                valence = "positive"
            events.append(
                ExtractedCareEvent(
                    type="mood",
                    data={"valence": valence, "note": transcript},
                    confidence=0.85,
                    **shared,
                )
            )

        # Some supported voice prompts intentionally omit a meal name or use
        # "log" language. Preserve the user's exact statement as a grounded
        # care note instead of inventing structured details.
        if not events and any(
            phrase in lowered
            for phrase in (
                "ate well",
                "ate poorly",
                "log today's visit",
                "log todays visit",
            )
        ):
            events.append(
                ExtractedCareEvent(
                    type="note",
                    data={"content": transcript},
                    confidence=0.9,
                    **shared,
                )
            )

        return CareEventExtractionResult(events=events)

    def _load_prompt(self, prompt_name: str) -> str:
        prompt_path = Path(__file__).parent.parent.parent / "prompts" / f"{prompt_name}.txt"
        return prompt_path.read_text(encoding="utf-8")

    def extract_care_events(
        self,
        transcript: str,
        speaker_id: str,
        patient_id: str,
        role: str,
        relationship: str,
        patient_name: str,
        preferred_language: str = "English",
    ) -> CareEventExtractionResult:
        """Extract structured care events from a transcript."""
        if not self.configured:
            if settings.demo_mode:
                return self._extract_demo_care_events(
                    transcript=transcript,
                    speaker_id=speaker_id,
                    patient_id=patient_id,
                )
            return CareEventExtractionResult(events=[])

        prompt = self._load_prompt("care_event_extraction")

        context = {
            "transcript": transcript,
            "speaker_id": speaker_id,
            "patient_id": patient_id,
            "role": role,
            "relationship": relationship,
            "patient_name": patient_name,
            "preferred_language": preferred_language,
        }

        client = self._get_client()

        response = client.responses.parse(
            model="gpt-5.6-luna",
            input=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
            ],
            text_format=CareEventExtractionResult,
        )

        if response.output_parsed is None:
            return CareEventExtractionResult(events=[])
        return response.output_parsed

    def generate_handoff_summary(
        self,
        events: list[dict[str, Any]],
        pending_tasks: list[dict[str, Any]],
        completed_tasks: list[dict[str, Any]],
        upcoming: list[dict[str, Any]],
        speaker_name: str,
        patient_name: str,
    ) -> Any:
        """Generate handoff summary via LLM."""
        from app.schemas.common import HandoffSummary

        if not self.configured:
            return None

        prompt = self._load_prompt("handoff_summary")
        client = self._get_client()

        response = client.responses.parse(
            model="gpt-5.6-luna",
            input=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "events_since_last_seen": events,
                            "pending_tasks": pending_tasks,
                            "completed_tasks": completed_tasks,
                            "upcoming": upcoming,
                            "speaker_name": speaker_name,
                            "patient_name": patient_name,
                        },
                        ensure_ascii=False,
                        default=str,
                    ),
                },
            ],
            text_format=HandoffSummary,
        )
        return response.output_parsed

    def coordinate(
        self,
        transcript: str,
        context: dict[str, Any],
        conversation_history: list[dict[str, Any]] | None = None,
    ) -> Any:
        """Generate coordination suggestion via LLM."""
        from app.schemas.common import CoordinationSuggestion

        if not self.configured:
            return None

        prompt = self._load_prompt("coordination")
        client = self._get_client()

        response = client.responses.parse(
            model="gpt-5.6-luna",
            input=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "transcript": transcript,
                            "context": context,
                            "conversation_history": conversation_history or [],
                        },
                        ensure_ascii=False,
                        default=str,
                    ),
                },
            ],
            text_format=CoordinationSuggestion,
        )
        return response.output_parsed

    def extract_memory(
        self,
        transcript: str,
        speaker_name: str,
        patient_name: str,
    ) -> Any:
        """Extract structured memory via LLM."""
        from app.schemas.common import MemoryExtractionResult

        if not self.configured:
            return None

        prompt = self._load_prompt("memory_extraction")
        client = self._get_client()

        response = client.responses.parse(
            model="gpt-5.6-luna",
            input=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "transcript": transcript,
                            "speaker_name": speaker_name,
                            "patient_name": patient_name,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
            text_format=MemoryExtractionResult,
        )
        return response.output_parsed
