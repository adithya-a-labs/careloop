from dataclasses import dataclass


@dataclass(frozen=True)
class VoiceContext:
    user_id: str
    circle_id: str
    role: str
    speaker_id: str
    patient_id: str
    relationship: str
    patient_name: str
    preferred_language: str = "English"

    def can_write(self, requested_circle_id: str) -> bool:
        return self.circle_id == requested_circle_id
