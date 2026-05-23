from fastapi import HTTPException, status
from typing import Any, Dict, Optional

class AppError(Exception):
    """Base generic exception for the application."""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class AuthError(AppError):
    """Authentication and Authorization exception."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, details)

class NotFoundError(AppError):
    """Resource not found exception."""
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_404_NOT_FOUND, details)

class AIServiceError(AppError):
    """AI Service processing exception."""
    def __init__(self, message: str = "AI subsystem failed", provider: str = "unknown"):
        super().__init__(message, status.HTTP_503_SERVICE_UNAVAILABLE, {"provider": provider})

class PermissionError(AppError):
    """RBAC Permission exception."""
    def __init__(self, message: str = "Insufficient permissions to perform this action", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_403_FORBIDDEN, details)

class ValidationError(AppError):
    """Business rule validation exception."""
    def __init__(self, message: str = "Data validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)
