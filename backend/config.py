from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App settings
    app_name: str = "TacitSNS API"
    debug: bool = True

    # OpenAI settings
    openai_api_key: str

    # Gemini settings
    gemini_api_key: str

    # Firebase settings
    firebase_credentials_path: str = "firebase-credentials.json"
    firebase_storage_bucket: str

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings():
    return Settings()
