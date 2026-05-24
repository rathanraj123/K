"""
Detection API endpoints with geolocation support.
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
import os
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.schemas.agriculture import DiseaseDetectionResponse
from app.models.agriculture import DiseaseDetection
from app.models.user import User
from app.db.session import get_db
from fastapi import BackgroundTasks

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


@router.post("/analyze", response_model=DiseaseDetectionResponse, status_code=status.HTTP_202_ACCEPTED)
async def analyze_plant_disease(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    lat: Optional[float] = Form(None),
    lon: Optional[float] = Form(None),
    crop_type: Optional[str] = Form("Rice"),
    location_name: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload an image of a plant leaf for AI-powered disease diagnosis.
    Accepts optional geolocation data for weather-aware intelligence.
    Returns 202 and processes in background.
    """
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG and PNG are supported.")
        
    # Check exact size limit
    file.file.seek(0, 2)
    file_size = file.file.tell()
    await file.seek(0)
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

    import io
    import base64
    from PIL import Image

    image_bytes = await file.read()
    
    # Compress image using PIL to avoid huge base64 strings
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # Convert RGBA to RGB if necessary (e.g. PNGs)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # Resize to max 800px width/height while maintaining aspect ratio
        img.thumbnail((800, 800), Image.Resampling.LANCZOS)
        
        output_buffer = io.BytesIO()
        img.save(output_buffer, format="JPEG", quality=75)
        compressed_bytes = output_buffer.getvalue()
        
        # We pass the compressed bytes to the ML pipeline to speed it up!
        image_bytes = compressed_bytes
        file_extension = ".jpg"
        content_type = "image/jpeg"
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Image compression failed, using original: {e}")
        # Fallback to original bytes
        file_extension = ALLOWED_IMAGE_TYPES.get(content_type, ".jpg")

    # Encode to base64 data URI for reliable storage across Render instances
    base64_str = base64.b64encode(image_bytes).decode('utf-8')
    image_url = f"data:{content_type};base64,{base64_str}"

    # Save the history row as 'processing'
    detection = DiseaseDetection(
        user_id=current_user.id,
        image_url=image_url,
        status="processing",
        scan_latitude=lat,
        scan_longitude=lon,
        scan_location_name=location_name,
        crop_type=crop_type or "Rice",
    )
    
    db.add(detection)
    await db.commit()
    await db.refresh(detection)
    
    # Emit scan_upload telemetry event
    try:
        from app.services.event_service import EventService
        await EventService.emit_event(
            db=db,
            event_type="scan_upload",
            payload={
                "message": f"New crop scan uploaded: {crop_type or 'Rice'}",
                "detection_id": str(detection.id),
                "crop_type": crop_type or "Rice",
                "location": location_name or "Unknown"
            },
            user_id=current_user.id
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to emit scan_upload event: {e}")
    
    # Spawn background task with geolocation params
    from app.workers.tasks import run_detection_async
    background_tasks.add_task(
        run_detection_async,
        str(detection.id),
        image_bytes,
        lat=lat,
        lon=lon,
        crop_type=crop_type or "Rice",
        user_role=current_user.role,
    )
    
    return detection

@router.get("/latest", response_model=Optional[DiseaseDetectionResponse])
async def get_latest_detection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get the newest disease detection for the current user.
    """
    result = await db.execute(
        select(DiseaseDetection)
        .where(DiseaseDetection.user_id == current_user.id)
        .order_by(DiseaseDetection.created_at.desc())
        .limit(1)
    )
    return result.scalars().first()

@router.get("/history", response_model=list[DiseaseDetectionResponse])
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get the history of disease detections for the current user.
    """
    result = await db.execute(
        select(DiseaseDetection)
        .where(DiseaseDetection.user_id == current_user.id)
        .order_by(DiseaseDetection.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{detection_id}", response_model=DiseaseDetectionResponse)
async def get_detection(
    detection_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Poll an exact detection by ID (useful for frontend polling).
    """
    result = await db.execute(
        select(DiseaseDetection)
        .where(DiseaseDetection.user_id == current_user.id, DiseaseDetection.id == detection_id)
    )
    detection = result.scalars().first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    return detection
