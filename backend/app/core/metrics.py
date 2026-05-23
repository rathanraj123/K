from typing import Dict
from pydantic import BaseModel

class MetricsState:
    def __init__(self):
        self.total_requests: int = 0
        self.failed_requests: int = 0
        self.ai_calls: int = 0
        self.total_response_time_ms: float = 0.0
        
    def get_snapshot(self) -> Dict[str, float]:
        avg_response = (self.total_response_time_ms / self.total_requests) if self.total_requests > 0 else 0
        return {
            "total_requests": self.total_requests,
            "failed_requests": self.failed_requests,
            "ai_usage_count": self.ai_calls,
            "average_response_time_ms": round(avg_response, 2)
        }

# Global singleton to track metrics in-memory for this worker
# In a truly distributed system, these would push to Prometheus/StatsD
global_metrics = MetricsState()

class MetricsResponse(BaseModel):
    total_requests: int
    failed_requests: int
    ai_usage_count: int
    average_response_time_ms: float
