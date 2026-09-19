from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.care import (
    CareEventCreate,
    HandoffEventResponse,
    HandoffTaskResponse,
    ScheduledItemResponse,
    TaskCreate,
)


class Message(BaseModel):
    message: str


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HandoffSummary(StrictModel):
    important: list[HandoffEventResponse]
    pending: list[HandoffTaskResponse]
    completed: list[HandoffTaskResponse]
    upcoming: list[ScheduledItemResponse]
    summary: str


class HandoffNarrative(StrictModel):
    """Provider output kept separate from authoritative database records."""

    summary: str = Field(min_length=1, max_length=420)


class CoordinationSuggestion(StrictModel):
    action: Literal["suggest_assignee", "create_task", "assign_task", "complete_task", "list_availability"]
    task_id: UUID | None = None
    assignee_id: UUID | None = None
    message: str
    requires_confirmation: bool = True


class MemoryExtractionResult(StrictModel):
    title: str
    approximate_year: int | None = None
    people: list[str] = Field(default_factory=list)
    places: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    body: str
    confidence: float = Field(ge=0.0, le=1.0)


class VoiceTurn(StrictModel):
    circle_id: str
    transcript: str = Field(min_length=1, max_length=8000)
    user_id: str | None = None
    speaker_id: str
    speaker_name: str | None = None
    patient_id: str
    role: str
    relationship: str
    patient_name: str
    preferred_language: str
    referenced_task_id: str | None = None


class LiveSessionCreate(StrictModel):
    sdp: str = Field(min_length=1, max_length=100_000)
    user_id: str
    circle_id: str
    speaker_id: str
    patient_id: str
    role: str
    relationship: str
    patient_name: str
    preferred_language: str


class LiveTransport(StrictModel):
    type: Literal["webrtc"]
    sdp: str


class LiveSessionReference(StrictModel):
    id: str


class LiveSessionResponse(StrictModel):
    session: LiveSessionReference
    transport: LiveTransport


class ToolResult(StrictModel):
    tool: str
    status: Literal["draft", "ready", "no_action"] = "draft"
    preview: dict[str, object]
    requires_confirmation: bool = True

class SleepData(StrictModel):
    quality: Literal["good", "fair", "poor"]
    duration_hours: float | None = None

class MealData(StrictModel):
    meal: Literal["breakfast", "lunch", "dinner", "snack"]
    intake: Literal["normal", "low", "none"]

class MoodData(StrictModel):
    valence: Literal["positive", "neutral", "negative"]
    note: str | None = None

class MedicationData(StrictModel):
    name: str
    taken: bool
    note: str | None = None

class ActivityData(StrictModel):
    type: str
    duration_minutes: int | None = None
    note: str | None = None

class SymptomData(StrictModel):
    name: str
    severity: Literal["mild", "moderate", "severe"]
    note: str | None = None

class AppointmentData(StrictModel):
    type: str
    scheduled_for: str | None = None
    note: str | None = None

class NoteData(StrictModel):
    content: str

EventData = (
    SleepData
    | MealData
    | MoodData
    | MedicationData
    | ActivityData
    | SymptomData
    | AppointmentData
    | NoteData
)

class ExtractedCareEvent(StrictModel):
    type: Literal["sleep", "meal", "mood", "medication", "activity", "symptom", "appointment", "note"]
    data: EventData
    subject_id: str
    reported_by: str
    source: Literal["voice"] = "voice"
    raw_transcript: str
    confidence: float = Field(ge=0.0, le=1.0)

class CareEventExtractionResult(StrictModel):
    events: list[ExtractedCareEvent]


__all__ = [
    "CareEventCreate",
    "CareEventExtractionResult",
    "ExtractedCareEvent",
    "LiveSessionCreate",
    "LiveSessionResponse",
    "Message",
    "TaskCreate",
    "ToolResult",
    "VoiceTurn",
]
