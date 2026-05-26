from typing import Optional, List, Union
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

class BaseConfig(BaseSettings):
    # App Info
    APP_NAME: str = "AgriCosmo Enterprise"
    PROJECT_NAME: str = "AgriCosmo Enterprise"  # Keep for backward compatibility
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"  # development | production | testing
    ENV: str = "dev" # dev | prod (backward compatibility)
    LOG_LEVEL: str = "DEBUG"
    
    # Security
    SECRET_KEY: str = "super_secret_for_dev_only"
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # DB Configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "agricosmo"
    DATABASE_URL: Optional[str] = None
    REDIS_URL: str = "redis://localhost:6379/0"
    API_V1_STR: str = "/api/v1"
    
    # Supabase (Auth / Storage)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None  # Backward compatibility
    
    # AI & Third Party APIs
    GROQ_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    OPENWEATHER_API_KEY: Optional[str] = None
    NEWS_API_KEY: str = "3adf64d4b590437390c62a98cb682d49"
    DATA_GOV_API_KEY: str = "579b464db66ec23bdd00000102b36f18cefb44a44aae8335aad3af27"
    
    # Elasticsearch
    ELASTICSEARCH_URL: Optional[str] = None
    ELASTICSEARCH_API_KEY: Optional[str] = None
    ELASTICSEARCH_ENABLED: bool = True
    
    # CORS & URLs
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "*"
    ]
    BACKEND_CORS_ORIGINS: Optional[Union[List[str], str]] = None
    FRONTEND_URL: str = "http://localhost:5173"
    API_BASE_URL: str = "http://localhost:8000/api/v1"
    RENDER_EXTERNAL_URL: Optional[str] = None
    
    # Local Paths
    MODEL_PATH: str = "model.tflite"
    UPLOAD_DIR: str = "static/uploads"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode='after')
    def assemble_and_validate(self) -> 'BaseConfig':
        # Align PROJECT_NAME and APP_NAME
        if self.APP_NAME != "AgriCosmo Enterprise" and self.PROJECT_NAME == "AgriCosmo Enterprise":
            self.PROJECT_NAME = self.APP_NAME
        elif self.PROJECT_NAME != "AgriCosmo Enterprise" and self.APP_NAME == "AgriCosmo Enterprise":
            self.APP_NAME = self.PROJECT_NAME

        # Assemble DATABASE_URL if not provided
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        else:
            # Handle render/postgres scheme issues
            if self.DATABASE_URL.startswith("postgresql://"):
                self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif self.DATABASE_URL.startswith("postgres://"):
                self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
        
        # Resolve JWT Secret
        if not self.JWT_SECRET_KEY:
            self.JWT_SECRET_KEY = self.SECRET_KEY
            
        # Resolve Supabase Key (Default to Service Role Key for backend administration)
        if not self.SUPABASE_KEY:
            self.SUPABASE_KEY = self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_ANON_KEY
            
        # Handle parsed backend cors origins
        # Handle parsed backend cors origins / string representation
        raw_origins = self.BACKEND_CORS_ORIGINS if self.BACKEND_CORS_ORIGINS is not None else self.CORS_ORIGINS
        if isinstance(raw_origins, str):
            raw_origins = raw_origins.strip()
            if raw_origins.startswith("[") and raw_origins.endswith("]"):
                try:
                    import json
                    self.CORS_ORIGINS = json.loads(raw_origins)
                except Exception:
                    self.CORS_ORIGINS = [x.strip() for x in raw_origins[1:-1].split(",") if x.strip()]
            else:
                self.CORS_ORIGINS = [x.strip() for x in raw_origins.split(",") if x.strip()]
        else:
            self.CORS_ORIGINS = raw_origins
            
        # Set short alias env string based on environment setting
        if self.ENVIRONMENT == "production":
            self.ENV = "prod"
            self.DEBUG = False
            self.LOG_LEVEL = "INFO"
        else:
            self.ENV = "dev"
            
        return self

class DevelopmentSettings(BaseConfig):
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    ENVIRONMENT: str = "development"

class TestingSettings(BaseConfig):
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    ENVIRONMENT: str = "testing"
    DATABASE_URL: str = "sqlite+aiosqlite:///agricosmo_test.db"

class ProductionSettings(BaseConfig):
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "production"
    CORS_ORIGINS: List[str] = [
        "https://agricosmo.com", 
        "https://app.agricosmo.com",
        "https://agricosmoai.vercel.app",
        "https://agricosmoai-oyt3tar92-rathanraj123s-projects.vercel.app"
    ]

@lru_cache
def get_settings() -> BaseConfig:
    env_state = os.getenv("ENV_STATE", os.getenv("ENVIRONMENT", "development"))
    
    if env_state in ("production", "prod"):
        # Fail-fast validation
        if not os.getenv("SECRET_KEY") or os.getenv("SECRET_KEY") == "super_secret_for_dev_only":
            raise ValueError("SECRET_KEY MUST be properly set in production environment!")
        return ProductionSettings()
        
    elif env_state in ("testing", "test"):
        return TestingSettings()
        
    return DevelopmentSettings()

settings = get_settings()
