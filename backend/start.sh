#!/bin/sh
set -e

# Run migrations (if you have them, uncomment the next line)
# alembic upgrade head

# Start Gunicorn with Uvicorn workers
exec gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 120
