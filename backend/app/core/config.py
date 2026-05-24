from typing import Optional, List
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

class BaseConfig(BaseSettings):
    PROJECT_NAME: str = "AgriCosmo Enterprise"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "super_secret_for_dev_only"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours for dev convenience
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # DB & Redis (Individual variables for easier user setup)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "agricosmo"
    
    # This will be computed if not provided in .env
    DATABASE_URL: Optional[str] = None

    ENV: str = "dev" # dev | prod

    @model_validator(mode='after')
    def assemble_db_url(self) -> 'BaseConfig':
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        else:
            # Render/Heroku inject DATABASE_URL starting with postgresql:// or postgres://.
            # We must convert this to postgresql+asyncpg:// for async SQLAlchemy.
            if self.DATABASE_URL.startswith("postgresql://"):
                self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif self.DATABASE_URL.startswith("postgres://"):
                self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
        return self

    REDIS_URL: str = "redis://localhost:6379/0"
    
    # APIs
    GROQ_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    OPENWEATHER_API_KEY: Optional[str] = None
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "*"
    ]
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

class DevelopmentSettings(BaseConfig):
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"

class TestingSettings(BaseConfig):
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    DATABASE_URL: str = "sqlite+aiosqlite:///agricosmo_test.db"

class ProductionSettings(BaseConfig):
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: List[str] = [
        "https://agricosmo.com", 
        "https://app.agricosmo.com",
        "https://agricosmoai.vercel.app",
        "https://agricosmoai-oyt3tar92-rathanraj123s-projects.vercel.app"
    ]

@lru_cache
def get_settings() -> BaseConfig:
    env_state = os.getenv("ENV_STATE", "development")
    
    if env_state == "production":
        # Fail-fast validation
        if not os.getenv("SECRET_KEY") or os.getenv("SECRET_KEY") == "super_secret_for_dev_only":
            raise ValueError("SECRET_KEY MUST be properly set in production environment!")
        return ProductionSettings()
        
    elif env_state == "testing":
        return TestingSettings()
        
    return DevelopmentSettings()

settings = get_settings()
