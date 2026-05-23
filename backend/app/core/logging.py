import json
import logging
import sys
from datetime import datetime, timezone
from contextvars import ContextVar
import uuid

# Context variable to track request ID across async calls
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

class JSONFormatter(logging.Formatter):
    """Formats log records as JSON for structured observability."""
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "request_id": request_id_var.get(),
        }
        
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        # Add custom fields if passed in 'extra'
        if hasattr(record, 'extra_meta'):
            log_obj.update(record.extra_meta)
            
        return json.dumps(log_obj)

def setup_logging(log_level: str = "INFO"):
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Remove default handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        
    formatter = JSONFormatter()
    
    # Console output
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File output for app
    file_handler = logging.FileHandler("app.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Error specific log
    error_handler = logging.FileHandler("error.log", encoding="utf-8")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)
    
    return logger
