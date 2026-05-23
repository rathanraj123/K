from celery import Celery
from kombu import Queue, Exchange
from app.core.config import settings
import os

# Initialize Celery
celery_app = Celery("agricosmo_worker", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

# Configure Queues
celery_app.conf.task_queues = (
    Queue("default", Exchange("default"), routing_key="default"),
    Queue("ai_tasks", Exchange("ai_tasks"), routing_key="ai.#"),
    Queue("image_tasks", Exchange("image_tasks"), routing_key="image.#"),
    Queue("analytics_tasks", Exchange("analytics_tasks"), routing_key="analytics.#"),
)

celery_app.conf.task_default_queue = "default"
celery_app.conf.task_default_exchange = "default"
celery_app.conf.task_default_routing_key = "default"

# Task settings (Retries and Timeouts)
celery_app.conf.task_acks_late = True
celery_app.conf.worker_prefetch_multiplier = 1
celery_app.conf.task_time_limit = 300 # 5 minutes hard limit
celery_app.conf.task_soft_time_limit = 240 # 4 minutes soft limit raises SoftTimeLimitExceeded

# Route specific tasks to queues automatically
celery_app.conf.task_routes = {
    "app.workers.tasks.process_image": {"queue": "image_tasks", "routing_key": "image.process"},
    "app.workers.tasks.ask_ai": {"queue": "ai_tasks", "routing_key": "ai.ask"},
    "app.workers.tasks.log_analytics": {"queue": "analytics_tasks", "routing_key": "analytics.log"},
}
