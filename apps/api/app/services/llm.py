from app.core.config import settings

class LLMService:
    """Backend-only provider adapter. No SQL or unrestricted function execution is exposed."""
    @property
    def configured(self) -> bool:
        return bool(settings.openai_api_key)
