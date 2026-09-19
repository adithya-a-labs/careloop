from datetime import datetime
from pydantic import BaseModel, Field

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

class ToolResult(BaseModel):
    tool: str
    status: str = "draft"
    preview: dict[str, object]
    requires_confirmation: bool = True
