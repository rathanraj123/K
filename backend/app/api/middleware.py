import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import request_id_var
from app.core.metrics import global_metrics
import logging

logger = logging.getLogger("api.middleware")

class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_var.set(req_id)

        start_time = time.perf_counter()
        request.state.request_id = req_id

        # Track global metrics
        global_metrics.total_requests += 1

        # Normalise endpoint path (strip query params) to avoid high cardinality
        endpoint = request.url.path
        method = request.method
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code

            if response.status_code >= 400:
                global_metrics.failed_requests += 1

        except Exception as e:
            global_metrics.failed_requests += 1
            raise e
        finally:
            process_time = time.perf_counter() - start_time
            process_time_ms = process_time * 1000
            global_metrics.total_response_time_ms += process_time_ms

            # ── Record Hourly API Metric Asynchronously ─────────────────────
            try:
                import asyncio
                from app.db.session import AsyncSessionLocal
                from app.models.enterprise import HourlyApiMetric
                from sqlalchemy import select
                import datetime

                async def log_api_metric(ep, meth, code, lat_ms):
                    async with AsyncSessionLocal() as db:
                        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                        hour = now.replace(minute=0, second=0, microsecond=0)
                        res = await db.execute(select(HourlyApiMetric).where(HourlyApiMetric.timestamp == hour))
                        metric = res.scalars().first()
                        if not metric:
                            metric = HourlyApiMetric(
                                timestamp=hour,
                                total_requests=1,
                                avg_latency_ms=lat_ms,
                                error_count=1 if code >= 400 else 0
                            )
                            db.add(metric)
                        else:
                            total = metric.total_requests
                            metric.avg_latency_ms = ((metric.avg_latency_ms * total) + lat_ms) / (total + 1)
                            metric.total_requests += 1
                            if code >= 400:
                                metric.error_count += 1
                        await db.commit()

                # Dispatch without blocking request thread
                asyncio.create_task(log_api_metric(endpoint, method, status_code, process_time_ms))
            except Exception:
                pass

            # ── Emit Prometheus metrics ──────────────────────────────────────
            try:
                from app.core.prometheus import (
                    http_requests_total,
                    http_errors_total,
                    http_request_duration_seconds,
                )
                http_requests_total.labels(method=method, endpoint=endpoint, status_code=str(status_code)).inc()
                http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(process_time)
                if status_code >= 400:
                    http_errors_total.labels(method=method, endpoint=endpoint, status_code=str(status_code)).inc()
            except Exception:
                pass  # Never let metrics crash the request

            logger.info(
                "Request completed",
                extra={
                    "extra_meta": {
                        "method": method,
                        "url": str(request.url),
                        "status_code": status_code,
                        "execution_time_ms": round(process_time_ms, 2),
                        "request_id": req_id,
                    }
                },
            )

        if "response" in locals():
            response.headers["X-Request-ID"] = req_id
            response.headers["X-Process-Time"] = str(round(process_time_ms, 2))
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            return response
