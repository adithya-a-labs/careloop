import json
from pathlib import Path
from openai import OpenAI
from app.core.config import settings
from app.schemas.common import CareEventExtractionResult

class LLMService:
    """Backend-only provider adapter. No SQL or unrestricted function execution is exposed."""
    
    @property
    def configured(self) -> bool:
        return bool(settings.openai_api_key)
    
    def _get_client(self) -> OpenAI:
        return OpenAI(api_key=settings.openai_api_key)
    
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
