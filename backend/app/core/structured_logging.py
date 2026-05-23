"""
Structured JSON logging using loguru.
Replaces the standard stdlib logging with a richer, contextual output format.
"""
import sys
import json
from loguru import logger
from contextvars import ContextVar

# Context variable for request-ID propagation across async calls
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

def json_sink(message):
    """Custom loguru sink that emits pure JSON records."""
    record = message.record
    log_entry = {
        "timestamp": record["time"].isoformat(),
        "level": record["level"].name,
        "message": record["message"],
        "logger": record["name"],
        "function": record["function"],
        "line": record["line"],
        "request_id": request_id_var.get(""),
    }
    # Merge any extra fields passed via bind() or extra={}
    if record["extra"]:
        log_entry.update(record["extra"])
    if record["exception"]:
        log_entry["exception"] = str(record["exception"])

    print(json.dumps(log_entry), file=sys.stdout)


def setup_loguru(log_level: str = "INFO") -> None:
    """Configure loguru for enterprise JSON structured logging."""
    logger.remove()  # Remove default handler

    # JSON console sink
    logger.add(json_sink, level=log_level, enqueue=True)

    # Rotating file sink — app.log (max 50 MB, 7 days retention)
    logger.add(
        "app.log",
        level=log_level,
        rotation="50 MB",
        retention="7 days",
        compression="gz",
        serialize=True,  # writes JSON natively
        enqueue=True,
    )

    # Separate error log
    logger.add(
        "error.log",
        level="ERROR",
        rotation="20 MB",
        retention="14 days",
        serialize=True,
        enqueue=True,
    )

    logger.info("Loguru structured logging initialized.", level=log_level)
    return logger


# Pre-configured module-level loggers for domain events
class AdminLogger:
    """Contextual logger for admin events."""
    @staticmethod
    def log_admin_action(admin_id: str, action: str, target: str = None, details: dict = None):
        logger.bind(
            domain="admin",
            admin_id=admin_id,
            action=action,
            target=target or "",
            details=details or {}
        ).info(f"Admin action: {action}")

    @staticmethod
    def log_inference(model: str, duration_ms: float, status: str, confidence: float = None):
        logger.bind(
            domain="inference",
            model=model,
            duration_ms=round(duration_ms, 2),
            status=status,
            confidence=confidence,
        ).info(f"AI inference completed: {model} [{status}]")

    @staticmethod
    def log_websocket(event: str, connections: int):
        logger.bind(
            domain="websocket",
            event=event,
            active_connections=connections,
        ).info(f"WebSocket event: {event}")

    @staticmethod
    def log_api_failure(endpoint: str, status_code: int, error: str):
        logger.bind(
            domain="api",
            endpoint=endpoint,
            status_code=status_code,
            error=error,
        ).error(f"API failure on {endpoint}: {error}")


admin_logger = AdminLogger()
