from pydantic import BaseModel, Field
from typing import Literal, Union

from app.schemas.care import CareEventCreate, TaskCreate


class Message(BaseModel):
    message: str


class VoiceTurn(BaseModel):
    circle_id: str
    transcript: str = Field(min_length=1, max_length=8000)
    speaker_id: str | None = None
    patient_id: str | None = None
    role: str | None = None
    relationship: str | None = None
    patient_name: str | None = None
    preferred_language: str | None = None


class ToolResult(BaseModel):
    tool: str
    status: str = "draft"
    preview: dict[str, object]
    requires_confirmation: bool = True

class SleepData(BaseModel):
    quality: Literal["good", "fair", "poor"]
    duration_hours: float | None = None

class MealData(BaseModel):
    meal: Literal["breakfast", "lunch", "dinner", "snack"]
    intake: Literal["normal", "low", "none"]

class MoodData(BaseModel):
    valence: Literal["positive", "neutral", "negative"]
    note: str | None = None

class MedicationData(BaseModel):
    name: str
    taken: bool
    note: str | None = None

class ActivityData(BaseModel):
    type: str
    duration_minutes: int | None = None
    note: str | None = None

class SymptomData(BaseModel):
    name: str
    severity: Literal["mild", "moderate", "severe"]
    note: str | None = None

class AppointmentData(BaseModel):
    type: str
    scheduled_for: str | None = None
    note: str | None = None

class NoteData(BaseModel):
    content: str

EventData = Union[SleepData, MealData, MoodData, MedicationData, ActivityData, SymptomData, AppointmentData, NoteData]

class ExtractedCareEvent(BaseModel):
    type: Literal["sleep", "meal", "mood", "medication", "activity", "symptom", "appointment", "note"]
    data: EventData
    subject_id: str
    reported_by: str
    source: Literal["voice"] = "voice"
    raw_transcript: str
    confidence: float = Field(ge=0.0, le=1.0)

class CareEventExtractionResult(BaseModel):
    events: list[ExtractedCareEvent]


__all__ = [
    "CareEventCreate",
    "CareEventExtractionResult",
    "ExtractedCareEvent",
    "Message",
    "TaskCreate",
    "ToolResult",
    "VoiceTurn",
]
