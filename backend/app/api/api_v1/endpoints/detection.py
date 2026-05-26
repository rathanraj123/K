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
from app.schemas.agriculture import DiseaseDetectionResponse, DetectionFeedbackCreate, DetectionFeedbackResponse, TreatmentTrackCreate, TreatmentTrackResponse
from app.models.agriculture import DiseaseDetection, DetectionFeedback
from app.models.treatment import TreatmentTrack
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
    language: Optional[str] = Form("English"),
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

    from app.services.storage import storage_service
    
    image_bytes = await file.read()
    
    # Upload to Supabase asynchronously (falls back to base64 if not configured)
    storage_result = await storage_service.upload_image(
        file_bytes=image_bytes,
        content_type=content_type,
        user_id=current_user.id
    )
    
    image_url = storage_result.get("url")
    thumbnail_url = storage_result.get("thumbnail_url")

    # Save the history row as 'processing'
    detection = DiseaseDetection(
        user_id=current_user.id,
        image_url=image_url,
        thumbnail_url=thumbnail_url,
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
        language=language or "English",
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
        .where(DiseaseDetection.user_id == current_user.id, DiseaseDetection.status == "completed")
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


@router.post("/{detection_id}/feedback", response_model=DetectionFeedbackResponse)
async def submit_detection_feedback(
    detection_id: str,
    feedback_in: DetectionFeedbackCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Submit user feedback and label corrections for continuous model learning.
    """
    # 1. Verify detection exists
    result = await db.execute(
        select(DiseaseDetection)
        .where(DiseaseDetection.user_id == current_user.id, DiseaseDetection.id == detection_id)
    )
    detection = result.scalars().first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")

    # 2. Add feedback record
    feedback = DetectionFeedback(
        detection_id=detection_id,
        corrected_disease=feedback_in.corrected_disease,
        rating=feedback_in.rating,
        comments=feedback_in.comments
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    # 3. Simulate continuous learning pipeline trigger in background
    from app.workers.tasks import process_model_telemetry_and_drift
    background_tasks.add_task(
        process_model_telemetry_and_drift,
        str(feedback.id),
        feedback_in.corrected_disease,
        feedback_in.rating
    )

    return feedback

@router.post("/{detection_id}/treatment", response_model=TreatmentTrackResponse)
async def submit_treatment_progress(
    detection_id: str,
    track_in: TreatmentTrackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Log or update treatment progress for a specific scan.
    """
    # Verify detection belongs to user
    result = await db.execute(
        select(DiseaseDetection)
        .where(DiseaseDetection.user_id == current_user.id, DiseaseDetection.id == detection_id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Detection not found")

    # Check if a track already exists
    track_result = await db.execute(
        select(TreatmentTrack).where(TreatmentTrack.detection_id == detection_id)
    )
    track = track_result.scalars().first()

    if track:
        # Update existing
        track.treatment_applied = track_in.treatment_applied
        track.recovery_progress = track_in.recovery_progress
        if track_in.feedback_rating is not None:
            track.feedback_rating = track_in.feedback_rating
        if track_in.comments is not None:
            track.comments = track_in.comments
    else:
        # Create new
        track = TreatmentTrack(
            detection_id=detection_id,
            treatment_applied=track_in.treatment_applied,
            recovery_progress=track_in.recovery_progress,
            feedback_rating=track_in.feedback_rating,
            comments=track_in.comments
        )
        db.add(track)

    await db.commit()
    await db.refresh(track)
    return track

@router.get("/{detection_id}/treatment", response_model=TreatmentTrackResponse)
async def get_treatment_progress(
    detection_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve treatment progress for a specific scan.
    """
    # Verify detection belongs to user
    result = await db.execute(
        select(DiseaseDetection)
        .where(DiseaseDetection.user_id == current_user.id, DiseaseDetection.id == detection_id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Detection not found")

    track_result = await db.execute(
        select(TreatmentTrack).where(TreatmentTrack.detection_id == detection_id)
    )
    track = track_result.scalars().first()
    if not track:
        raise HTTPException(status_code=404, detail="Treatment track not found")

    return track
