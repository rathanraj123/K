import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import request_id_var
from app.core.metrics import global_metrics
import logging

logger = logging.getLogger("api.middleware")

class ObservabilityMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Reconstruct X-Request-ID from headers
        headers_dict = dict(scope.get("headers", []))
        req_id = headers_dict.get(b"x-request-id", b"").decode("utf-8")
        if not req_id:
            req_id = str(uuid.uuid4())

        request_id_var.set(req_id)
        start_time = time.perf_counter()
        global_metrics.total_requests += 1

        endpoint = scope.get("path", "")
        method = scope.get("method", "GET")
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = list(message.get("headers", []))
                process_time_ms = (time.perf_counter() - start_time) * 1000
                
                headers.append((b"x-request-id", req_id.encode("utf-8")))
                headers.append((b"x-process-time", str(round(process_time_ms, 2)).encode("utf-8")))
                headers.append((b"x-content-type-options", b"nosniff"))
                headers.append((b"x-frame-options", b"DENY"))
                headers.append((b"x-xss-protection", b"1; mode=block"))
                message["headers"] = headers
                
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            global_metrics.failed_requests += 1
            raise e
        finally:
            process_time = time.perf_counter() - start_time
            process_time_ms = process_time * 1000
            global_metrics.total_response_time_ms += process_time_ms
            
            if status_code >= 400:
                global_metrics.failed_requests += 1

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
                        "url": endpoint,
                        "status_code": status_code,
                        "execution_time_ms": round(process_time_ms, 2),
                        "request_id": req_id,
                    }
                },
            )
