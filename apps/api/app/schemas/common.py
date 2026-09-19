from pydantic import BaseModel, Field

from app.schemas.care import CareEventCreate, TaskCreate


class Message(BaseModel):
    message: str


class VoiceTurn(BaseModel):
    circle_id: str
    transcript: str = Field(min_length=1, max_length=8000)


class ToolResult(BaseModel):
    tool: str
    status: str = "draft"
    preview: dict[str, object]
    requires_confirmation: bool = True


__all__ = ["CareEventCreate", "Message", "TaskCreate", "ToolResult", "VoiceTurn"]
