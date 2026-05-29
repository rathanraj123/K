import logging
import time
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.responses import Response, JSONResponse
from typing import Optional
from pydantic import BaseModel
from app.modules.detection.yolo_validator import yolo_validator
from app.modules.detection.image_quality import image_quality_analyzer
from app.modules.detection.service import detection_service
from app.modules.detection.model_manager import model_manager
from app.modules.detection.explainability import generate_heatmap_file, calculate_severity_metrics
from app.core.config import settings

# Structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agricosmo_inference")

app = FastAPI(
    title="AgriCosmo AI Inference Service",
    description="Dedicated microservice for YOLO validation, OpenCV quality analysis, and TFLite model predictions.",
    version="1.0.0"
)

# Startup preloading
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing model preloading warmup...")
    await model_manager.warmup()
    logger.info("Models preloaded successfully.")

@app.post("/inference/validate")
async def validate_image(
    file: UploadFile = File(...)
):
    """
    Run YOLO leaf detection & OpenCV image quality checks.
    """
    try:
        image_bytes = await file.read()
        
        # 1. YOLO Leaf crop
        yolo_result, cropped_bytes = await yolo_validator.analyze_and_crop(image_bytes)
        
        # 2. Quality Analysis
        quality_result = image_quality_analyzer.analyze(cropped_bytes)
        
        return {
            "yolo_intelligence": yolo_result,
            "image_quality": quality_result,
            "passed": not quality_result.get("needs_retake", False)
        }
    except Exception as e:
        logger.error(f"Validation endpoint failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/inference/predict")
async def predict_disease(
    file: UploadFile = File(...),
    crop_type: str = Form("Rice"),
    user_role: str = Form("farmer"),
    language: str = Form("English"),
    detection_id: Optional[str] = Form(None)
):
    """
    Execute disease prediction pipeline (YOLO validation, OpenCV, TFLite inference).
    """
    try:
        image_bytes = await file.read()
        result = await detection_service.predict_disease(
            image_bytes=image_bytes,
            crop_type=crop_type,
            user_role=user_role,
            language=language,
            detection_id=detection_id
        )
        return result
    except Exception as e:
        logger.error(f"Inference prediction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/inference/heatmap")
async def generate_heatmap(
    file: UploadFile = File(...),
    detection_id: str = Form(...)
):
    """
    Generate an explainability heatmap and return the raw image bytes.
    """
    try:
        image_bytes = await file.read()
        
        # We will generate the heatmap and read it back to return the bytes to avoid writing local storage permanently
        heatmap_url = generate_heatmap_file(image_bytes, detection_id)
        # Read the file
        local_path = heatmap_url.lstrip("/")
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                heatmap_bytes = f.read()
            # Clean up the local file immediately since it will be uploaded to Supabase Storage by the Main API
            try:
                os.remove(local_path)
            except Exception as rmerr:
                logger.warning(f"Could not delete temporary heatmap file: {rmerr}")
                
            return Response(content=heatmap_bytes, media_type="image/jpeg")
        else:
            raise HTTPException(status_code=404, detail="Heatmap generation failed.")
    except Exception as e:
        logger.error(f"Heatmap endpoint failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/inference/warmup")
async def warmup_models():
    """Trigger manual model warmup."""
    success = await model_manager.warmup()
    return {"status": "success" if success else "failed"}

@app.get("/health")
async def health_check():
    """Liveness probe reporting model status."""
    import psutil
    import os
    
    process = psutil.Process(os.getpid())
    memory_mb = process.memory_info().rss / (1024 * 1024)
    
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "memory_usage_mb": round(memory_mb, 1),
        "models_loaded": {
            "tflite": model_manager.interpreter is not None,
            "yolo_world": model_manager.yolo_model is not None
        },
        "low_memory_mode": settings.LOW_MEMORY_MODE
    }

import os
