from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal, Union

class Message(BaseModel):
    message: str

class CareEventCreate(BaseModel):
    circle_id: str
    kind: str = Field(pattern="^(check-in|appointment|note|task|memory)$")
    title: str = Field(min_length=1, max_length=160)
    details: str | None = Field(default=None, max_length=4000)

class TaskCreate(BaseModel):
    circle_id: str
    title: str = Field(min_length=1, max_length=160)
    assignee_id: str | None = None
    due_at: datetime | None = None

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
