"""Care event persistence port. Implement with parameterized Supabase calls only."""
class CareEventService:
    def create(self, circle_id: str, payload: dict[str, object]) -> dict[str, object]:
        return {"circle_id": circle_id, **payload}
