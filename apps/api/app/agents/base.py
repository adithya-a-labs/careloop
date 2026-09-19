from typing import Protocol

class CareAgent(Protocol):
    name: str
    allowed_tools: frozenset[str]
    def plan(self, context: dict[str, object]) -> dict[str, object]: ...
