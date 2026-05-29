import httpx
import logging
import asyncio
from typing import Dict, Any, Optional, Tuple
from app.core.config import settings
from app.modules.detection.service import detection_service

logger = logging.getLogger(__name__)

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED" 

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = asyncio.get_event_loop().time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.error(f"Inference Service Circuit Breaker is now {self.state} - falling back to local/degraded execution.")

    def record_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def can_execute(self) -> bool:
        if self.state == "CLOSED":
            return True
        if self.state == "OPEN":
            if asyncio.get_event_loop().time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF-OPEN"
                return True
            return False
        return True

class InferenceClient:
    def __init__(self):
        self.service_url = settings.INFERENCE_SERVICE_URL
        self.breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
        self.client_timeout = 10.0 # Strict timeout for external API call

    async def validate_image(self, image_bytes: bytes, filename: str = "image.jpg") -> Tuple[bool, Dict[str, Any]]:
        """
        Validate image via YOLO leaf detection and OpenCV image quality analysis.
        Falls back to local analysis if external service is down/unconfigured.
        """
        if not self.service_url or not self.breaker.can_execute():
            logger.info("Executing image validation locally (fallback).")
            return await self._validate_locally(image_bytes)

        try:
            async with httpx.AsyncClient(timeout=self.client_timeout) as client:
                files = {"file": (filename, image_bytes, "image/jpeg")}
                response = await client.post(
                    f"{self.service_url}/inference/validate",
                    files=files
                )
                if response.status_code == 200:
                    self.breaker.record_success()
                    data = response.json()
                    return data.get("passed", True), data
                else:
                    self.breaker.record_failure()
                    logger.warning(f"Inference service validation returned non-200 code: {response.status_code}")
                    return await self._validate_locally(image_bytes)
        except Exception as e:
            self.breaker.record_failure()
            logger.error(f"Failed to communicate with Inference Service for validation: {e}")
            return await self._validate_locally(image_bytes)

    async def predict_disease(
        self,
        image_bytes: bytes,
        crop_type: str = "Rice",
        user_role: str = "farmer",
        language: str = "English",
        detection_id: Optional[str] = None,
        filename: str = "image.jpg"
    ) -> Dict[str, Any]:
        """
        Execute disease prediction via remote Inference Service, fallback to local models.
        """
        if not self.service_url or not self.breaker.can_execute():
            logger.info("Running disease prediction locally (fallback).")
            return await detection_service.predict_disease(
                image_bytes=image_bytes,
                crop_type=crop_type,
                user_role=user_role,
                language=language,
                detection_id=detection_id
            )

        try:
            async with httpx.AsyncClient(timeout=self.client_timeout) as client:
                files = {"file": (filename, image_bytes, "image/jpeg")}
                data = {
                    "crop_type": crop_type,
                    "user_role": user_role,
                    "language": language,
                }
                if detection_id:
                    data["detection_id"] = detection_id
                    
                response = await client.post(
                    f"{self.service_url}/inference/predict",
                    files=files,
                    data=data
                )
                if response.status_code == 200:
                    self.breaker.record_success()
                    return response.json()
                else:
                    self.breaker.record_failure()
                    logger.warning(f"Inference Service predict returned non-200: {response.status_code}")
                    return await self._predict_locally(image_bytes, crop_type, user_role, language, detection_id)
        except Exception as e:
            self.breaker.record_failure()
            logger.error(f"Failed to communicate with Inference Service for prediction: {e}")
            return await self._predict_locally(image_bytes, crop_type, user_role, language, detection_id)

    async def generate_heatmap(self, image_bytes: bytes, detection_id: str, filename: str = "image.jpg") -> bytes:
        """
        Generates explainability heatmap overlay.
        """
        if not self.service_url or not self.breaker.can_execute():
            logger.info("Generating explainability heatmap locally (fallback).")
            return await self._generate_heatmap_locally(image_bytes, detection_id)

        try:
            async with httpx.AsyncClient(timeout=self.client_timeout) as client:
                files = {"file": (filename, image_bytes, "image/jpeg")}
                data = {"detection_id": detection_id}
                response = await client.post(
                    f"{self.service_url}/inference/heatmap",
                    files=files,
                    data=data
                )
                if response.status_code == 200:
                    self.breaker.record_success()
                    return response.content
                else:
                    self.breaker.record_failure()
                    logger.warning(f"Inference Service heatmap returned non-200: {response.status_code}")
                    return await self._generate_heatmap_locally(image_bytes, detection_id)
        except Exception as e:
            self.breaker.record_failure()
            logger.error(f"Failed to communicate with Inference Service for heatmap: {e}")
            return await self._generate_heatmap_locally(image_bytes, detection_id)

    # ─── Graceful Local Fallbacks ──────────────────────────────────
    
    async def _validate_locally(self, image_bytes: bytes) -> Tuple[bool, Dict[str, Any]]:
        from app.modules.detection.yolo_validator import yolo_validator
        from app.modules.detection.image_quality import image_quality_analyzer
        try:
            yolo_result, cropped_bytes = await yolo_validator.analyze_and_crop(image_bytes)
            quality_result = image_quality_analyzer.analyze(cropped_bytes)
            return not quality_result.get("needs_retake", False), {
                "yolo_intelligence": yolo_result,
                "image_quality": quality_result
            }
        except Exception as e:
            logger.error(f"Local validation failed: {e}")
            return True, {"error": str(e)}

    async def _predict_locally(self, image_bytes: bytes, crop_type: str, user_role: str, language: str, detection_id: Optional[str]) -> Dict[str, Any]:
        return await detection_service.predict_disease(
            image_bytes=image_bytes,
            crop_type=crop_type,
            user_role=user_role,
            language=language,
            detection_id=detection_id
        )

    async def _generate_heatmap_locally(self, image_bytes: bytes, detection_id: str) -> bytes:
        from app.modules.detection.explainability import generate_heatmap_file
        import os
        heatmap_url = generate_heatmap_file(image_bytes, detection_id)
        local_path = heatmap_url.lstrip("/")
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                content = f.read()
            try:
                os.remove(local_path)
            except:
                pass
            return content
        return image_bytes

inference_client = InferenceClient()
