.PHONY: run dev test migrate worker check

# Run the dev server
dev:
	ENV_STATE=development uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run the production server
run:
	ENV_STATE=production uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Apply DB Migrations
migrate:
	alembic upgrade head

# Run Celery worker
worker:
	celery -A app.core.celery_app worker -l info -Q default,ai_tasks,image_tasks,analytics_tasks

# Run Pytest
test:
	ENV_STATE=testing pytest tests/ -v

# Code Quality Check
check:
	pre-commit run --all-files || echo "Please install pre-commit"
