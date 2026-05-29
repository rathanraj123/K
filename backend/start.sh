#!/bin/sh
set -e

echo "Starting deployment process..."

# Run migrations automatically
echo "Running database migrations..."
alembic upgrade head || echo "WARNING: Alembic migration failed, continuing anyway..."

# Start Gunicorn with Uvicorn workers
echo "Starting Gunicorn server..."
exec gunicorn app.main:app -c gunicorn_conf.py
