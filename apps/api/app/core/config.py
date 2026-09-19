from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    web_origin: str = "http://localhost:5173"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    openai_api_key: str = ""
    demo_mode: bool = True
    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
