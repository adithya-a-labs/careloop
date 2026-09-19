class CoordinationService:
    def suggest_assignee(self, member_ids: list[str], availability: dict[str, bool]) -> str | None:
        return next((member_id for member_id in member_ids if availability.get(member_id)), None)
