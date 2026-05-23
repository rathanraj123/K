#!/bin/sh
set -e

# Run migrations (if you have them, uncomment the next line)
# alembic upgrade head

# Start Gunicorn with Uvicorn workers
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
