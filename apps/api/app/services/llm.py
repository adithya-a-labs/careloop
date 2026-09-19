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

        return OpenAI(api_key=settings.openai_api_key)

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
                meal
                for meal in ("breakfast", "lunch", "dinner", "snack")
                if meal in lowered
            )
            events.append(
                ExtractedCareEvent(
                    type="meal",
                    data={"meal": meal, "intake": "low"},
                    confidence=0.97,
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
        preferred_language: str = "English"
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
            "preferred_language": preferred_language
        }
        
        client = self._get_client()
        
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(context, ensure_ascii=False)}
            ],
            response_format=CareEventExtractionResult,
            temperature=0.1
        )
        
        return completion.choices[0].message.parsed
