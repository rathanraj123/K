import multiprocessing
import os

# Render sets PORT, default to 8000
port = os.getenv("PORT", "8000")
bind = f"0.0.0.0:{port}"

# Worker configuration
# 1 worker per core + 1 is standard, but keeping it conservative for ML memory limits
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
if os.getenv("LOW_MEMORY_MODE", "false").lower() in ("true", "1") or os.getenv("RENDER") == "true":
    workers = int(os.getenv("WEB_CONCURRENCY", 1)) # Limit workers on Render free/starter tiers

worker_class = "uvicorn.workers.UvicornWorker"

# Timeouts
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()
