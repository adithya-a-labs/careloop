from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CareModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CircleRole(str, Enum):
    PATIENT = "patient"
    CARE_RECIPIENT = "care_recipient"
    FAMILY = "family"
    CAREGIVER = "caregiver"
    COORDINATOR = "coordinator"


class EventSource(str, Enum):
    MANUAL = "manual"
    VOICE = "voice"
    IMPORT = "import"
    SYSTEM = "system"


class TaskStatus(str, Enum):
    PENDING = "pending"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


def _require_timezone(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        raise ValueError("timestamp must include a UTC offset")
    return value


class CircleResponse(CareModel):
    id: UUID
    name: str
    created_by: UUID
    created_at: datetime
    member_count: int


class CircleMemberResponse(CareModel):
    circle_id: UUID
    profile_id: UUID
    display_name: str
    role: CircleRole
    relationship: str | None = None
    preferred_language: str
    avatar_url: str | None = None
    joined_at: datetime


class CareEventCreate(CareModel):
    subject_id: UUID
    reported_by: UUID | None = None
    event_type: str = Field(min_length=1, max_length=48, pattern=r"^[a-z][a-z0-9_-]*$")
    event_data: dict[str, Any] = Field(default_factory=dict)
    source: EventSource = EventSource.MANUAL
    raw_transcript: str | None = Field(default=None, max_length=8000)
    confidence: float | None = Field(default=None, ge=0, le=1)
    occurred_at: datetime | None = None
    confirmed: bool = Field(
        default=False,
        description="Optional upstream review metadata; it never blocks ingestion.",
        exclude=True,
    )

    _validate_occurred_at = field_validator("occurred_at")(_require_timezone)


class CareEventResponse(CareModel):
    id: UUID
    circle_id: UUID
    subject_id: UUID
    reported_by: UUID
    event_type: str
    event_data: dict[str, Any]
    source: EventSource
    raw_transcript: str | None = None
    confidence: float | None = None
    occurred_at: datetime
    created_at: datetime


class TaskCreate(CareModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    assigned_to: UUID | None = None
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_at: datetime | None = None
    source_event_id: UUID | None = None

    _validate_due_at = field_validator("due_at")(_require_timezone)

    @model_validator(mode="after")
    def reject_precompleted_create(self) -> "TaskCreate":
        if self.status in {TaskStatus.COMPLETED, TaskStatus.DONE}:
            raise ValueError("create the task first, then mark it completed")
        return self


class TaskUpdate(CareModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    assigned_to: UUID | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_at: datetime | None = None

    _validate_due_at = field_validator("due_at")(_require_timezone)

    @model_validator(mode="after")
    def reject_null_required_fields(self) -> "TaskUpdate":
        for field_name in ("title", "status", "priority"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class TaskResponse(CareModel):
    id: UUID
    circle_id: UUID
    title: str
    description: str | None = None
    created_by: UUID
    assigned_to: UUID | None = None
    status: TaskStatus
    priority: TaskPriority
    due_at: datetime | None = None
    completed_at: datetime | None = None
    source_event_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class ScheduledItemResponse(CareModel):
    id: UUID
    circle_id: UUID
    created_by: UUID
    title: str
    starts_at: datetime
    ends_at: datetime | None = None
    recurrence_rule: str | None = None
    created_at: datetime


class AvailabilityResponse(CareModel):
    id: UUID
    circle_id: UUID
    profile_id: UUID
    starts_at: datetime
    ends_at: datetime
    note: str | None = None


class MemoryCreate(CareModel):
    subject_id: UUID
    kind: str = Field(default="story", pattern=r"^(photo|voice|story)$")
    title: str = Field(min_length=1, max_length=160)
    body: str | None = Field(default=None, max_length=8000)
    media_path: str | None = Field(default=None, max_length=500)
    approximate_year: int | None = Field(default=None, ge=1900, le=2100)


class MemoryResponse(CareModel):
    id: UUID
    circle_id: UUID
    author_id: UUID
    subject_id: UUID
    kind: str
    title: str
    body: str | None = None
    media_path: str | None = None
    approximate_year: int | None = None
    created_at: datetime


class HandoffContextResponse(CareModel):
    events_since_last_seen: list[CareEventResponse]
    pending_tasks: list[TaskResponse]
    completed_tasks: list[TaskResponse]
    upcoming: list[ScheduledItemResponse]
