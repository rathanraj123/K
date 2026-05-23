"""
Enterprise Prometheus metrics exporter for FastAPI.
Exposes:  websocket_connections, celery_queue_depth, redis_latency_ms,
          ai_inference_duration_seconds, api_response_time_seconds
"""
from prometheus_client import Counter, Gauge, Histogram, Summary, generate_latest, CONTENT_TYPE_LATEST
from fastapi import APIRouter, Response

router = APIRouter()

# ── Counters ─────────────────────────────────────────────────────────────────
http_requests_total = Counter(
    "agricosmo_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

http_errors_total = Counter(
    "agricosmo_http_errors_total",
    "Total HTTP error responses (4xx/5xx)",
    ["method", "endpoint", "status_code"],
)

websocket_connections_total = Counter(
    "agricosmo_websocket_connections_total",
    "Total WebSocket connection events",
    ["event"],  # connect | disconnect
)

celery_tasks_total = Counter(
    "agricosmo_celery_tasks_total",
    "Total Celery tasks dispatched",
    ["task_name", "status"],  # success | failure | retry
)

ai_inference_total = Counter(
    "agricosmo_ai_inference_total",
    "Total AI inference calls",
    ["model", "status"],
)

# ── Gauges ────────────────────────────────────────────────────────────────────
active_websocket_connections = Gauge(
    "agricosmo_active_websocket_connections",
    "Current number of active WebSocket connections",
)

celery_queue_depth = Gauge(
    "agricosmo_celery_queue_depth",
    "Number of pending jobs in Celery queue",
    ["queue_name"],
)

# ── Histograms ────────────────────────────────────────────────────────────────
http_request_duration_seconds = Histogram(
    "agricosmo_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

ai_inference_duration_seconds = Histogram(
    "agricosmo_ai_inference_duration_seconds",
    "AI model inference duration in seconds",
    ["model"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)

redis_operation_duration_seconds = Histogram(
    "agricosmo_redis_operation_duration_seconds",
    "Redis operation latency in seconds",
    ["operation"],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
)


@router.get("/metrics", include_in_schema=False)
async def prometheus_metrics():
    """Expose Prometheus metrics at /metrics endpoint."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
