"""
Background task runner for the detection pipeline.
Persists all intelligence fields from the enriched detection result.
"""
import logging
import asyncio
import time
from app.core.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.models.agriculture import DiseaseDetection
from app.models.analytics import AILog
from app.modules.detection.service import detection_service
from app.core.cache import invalidate_dashboard_cache
from typing import Optional

logger = logging.getLogger(__name__)


async def run_detection_async(
    detection_id: str,
    image_bytes: bytes,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    crop_type: str = "Rice",
    user_role: str = "farmer",
    language: str = "English",
):
    """
    Full intelligence pipeline execution as a background task.
    Persists all results to the DiseaseDetection row.
    """
    try:
        start_time = time.time()
        result = await detection_service.predict_disease(
            image_bytes,
            lat=lat,
            lon=lon,
            crop_type=crop_type,
            user_role=user_role,
            language=language,
            detection_id=detection_id,
        )
        duration_ms = (time.time() - start_time) * 1000

        # Emit Prometheus AI inference metric
        try:
            from app.core.prometheus import ai_inference_total, ai_inference_duration_seconds
            ai_inference_total.labels(model="disease-detection-cnn", status="success").inc()
            ai_inference_duration_seconds.labels(model="disease-detection-cnn").observe(duration_ms / 1000)
        except Exception:
            pass

        async with AsyncSessionLocal() as db:
            detection = await db.get(DiseaseDetection, detection_id)
            if detection:
                # Log AI Usage for metrics
                ai_log = AILog(
                    user_id=detection.user_id,
                    model_used="groq-llama-3.3-70b-versatile",
                    response_time_ms=duration_ms,
                )
                db.add(ai_log)

                # ── Core detection fields ────────────────────────
                detection.detected_disease = result["detected_disease"]
                detection.confidence = result["confidence"]
                detection.severity = result["severity"]
                detection.explainability_meta = result.get("explainability_meta")
                detection.explanation = result.get("explanation")
                detection.treatments = result.get("treatments")
                detection.farmer_treatments = result.get("farmer_treatments")
                detection.scientist_data = result.get("scientist_data")
                detection.cosmetic_insights = result.get("cosmetic_insights")

                # ── Disease identity fields ──────────────────────
                disease_identity = result.get("disease_identity", {})
                if isinstance(disease_identity, dict):
                    detection.scientific_name = disease_identity.get("scientific_name")
                    detection.disease_category = disease_identity.get("disease_category")
                    detection.spread_risk = disease_identity.get("spread_risk")
                    detection.contagiousness = disease_identity.get("contagiousness")
                    detection.crop_stage_affected = disease_identity.get("crop_stage_affected")

                # ── New Role-Specific Intelligence ───────────────
                farmer_report = result.get("farmer_report")
                if farmer_report and isinstance(farmer_report, dict) and "farmer_risk_score" in result:
                    farmer_report["farmer_risk_score"] = result["farmer_risk_score"]
                detection.farmer_report = farmer_report
                detection.scientist_report = result.get("scientist_report")
                
                # Clear legacy fields so we don't save garbage
                detection.confidence_breakdown = None
                detection.explainable_ai = None
                detection.agronomist_recommendation = None
                detection.yield_loss_estimate = None
                detection.disease_timeline = None
                detection.similar_diseases = result.get("similar_diseases")
                detection.detailed_treatments = None
                detection.smart_products = None

                # ── Environmental context ────────────────────────
                detection.image_quality = result.get("image_quality")
                detection.weather_risk = result.get("weather_risk")

                # ── Geolocation metadata ─────────────────────────
                if lat is not None:
                    detection.scan_latitude = lat
                if lon is not None:
                    detection.scan_longitude = lon
                if crop_type:
                    detection.crop_type = crop_type

                # Weather location name
                weather = result.get("weather_risk")
                if isinstance(weather, dict) and weather.get("location"):
                    detection.scan_location_name = weather["location"]

                detection.status = "completed"
                
                # ── Record scan analytics & emit telemetry ──────────────────
                try:
                    import datetime
                    from app.models.enterprise import DailyScanStat, DiseaseStatistic
                    from app.services.event_service import EventService
                    from sqlalchemy import select
                    
                    today = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
                    stat_res = await db.execute(select(DailyScanStat).where(DailyScanStat.date == today))
                    stat = stat_res.scalars().first()
                    if not stat:
                        stat = DailyScanStat(
                            date=today,
                            total_scans=1,
                            failed_scans=0,
                            avg_confidence=float(result.get("confidence", 0.0))
                        )
                        db.add(stat)
                    else:
                        old_total = stat.total_scans
                        new_conf = float(result.get("confidence", 0.0))
                        stat.avg_confidence = ((stat.avg_confidence * old_total) + new_conf) / (old_total + 1)
                        stat.total_scans += 1
                    
                    # 2. Update DiseaseStatistic
                    disease_name = result.get("detected_disease", "Healthy")
                    region = detection.scan_location_name or "Unknown"
                    dis_res = await db.execute(
                        select(DiseaseStatistic)
                        .where(DiseaseStatistic.disease_name == disease_name, DiseaseStatistic.region == region)
                    )
                    disease_stat = dis_res.scalars().first()
                    if not disease_stat:
                        disease_stat = DiseaseStatistic(
                            disease_name=disease_name,
                            occurrence_count=1,
                            region=region,
                            last_detected=datetime.datetime.now(datetime.timezone.utc)
                        )
                        db.add(disease_stat)
                    else:
                        disease_stat.occurrence_count += 1
                        disease_stat.last_detected = datetime.datetime.now(datetime.timezone.utc)
                        
                    await db.commit()
                    
                    # 3. Emit analytics_update event to push to Live Feed & update panels
                    payload = {
                        "message": f"Scan completed: {disease_name} ({float(result.get('confidence', 0))*100:.1f}%) in {region}",
                        "detection_id": detection_id,
                        "crop_type": crop_type,
                        "disease": disease_name,
                        "confidence": float(result.get("confidence", 0.0)) * 100,
                        "severity": result.get("severity", "unknown")
                    }
                    await EventService.emit_event(db, "analytics_update", payload, user_id=detection.user_id)
                    
                    # 4. Generate an AI Insight Feed entry
                    from app.models.agriculture import InsightFeed
                    severity_mapping = {"low": "green", "medium": "yellow", "high": "red", "critical": "red", "unknown": "blue"}
                    sev_level = (result.get("severity") or "unknown").lower()
                    
                    if disease_name.lower() != "healthy" and disease_name.lower() != "normal":
                        feed = InsightFeed(
                            title=f"{disease_name} Detected in {region}",
                            description=f"AI confirmed {disease_name} on {crop_type} with {float(result.get('confidence', 0))*100:.0f}% confidence. Immediate observation recommended.",
                            category="OUTBREAK",
                            severity_color=severity_mapping.get(sev_level, "red")
                        )
                        db.add(feed)
                    else:
                        feed = InsightFeed(
                            title=f"Healthy {crop_type} Verified",
                            description=f"Recent scan in {region} confirms crop is healthy.",
                            category="VERIFICATION",
                            severity_color="green"
                        )
                        db.add(feed)
                        
                except Exception as telemetry_err:
                    logger.error(f"Failed to process telemetry in background task: {telemetry_err}")

                try:
                    await db.commit()
                except Exception as commit_err:
                    logger.debug(f"Telemetry session cleanup commit skipped or failed: {commit_err}")
                    
                # Invalidate dashboard cache immediately so UI shows new scans instantly
                try:
                    await invalidate_dashboard_cache(user_id=detection.user_id)
                except Exception as cache_err:
                    logger.warning(f"Failed to invalidate dashboard cache: {cache_err}")

                logger.info(
                    f"Detection {detection_id} completed in {duration_ms:.0f}ms — "
                    f"{result['detected_disease']} ({result['confidence'] * 100:.1f}%)"
                )

    except Exception as e:
        logger.error(f"Error processing image for detection {detection_id}: {e}")
        async with AsyncSessionLocal() as db:
            detection = await db.get(DiseaseDetection, detection_id)
            if detection:
                # Update DailyScanStat for failed scan
                try:
                    import datetime
                    from app.models.enterprise import DailyScanStat
                    from sqlalchemy import select
                    
                    today = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
                    stat_res = await db.execute(select(DailyScanStat).where(DailyScanStat.date == today))
                    stat = stat_res.scalars().first()
                    if not stat:
                        stat = DailyScanStat(date=today, total_scans=1, failed_scans=1)
                        db.add(stat)
                    else:
                        stat.total_scans += 1
                        stat.failed_scans += 1
                except Exception:
                    pass
                
                detection.status = "failed"
                detection.explanation = str(e)
                await db.commit()
                logger.info(f"Updated failed detection record {detection_id} in database to status failed.")


@celery_app.task(bind=True, max_retries=3)
def process_image(self, detection_id: str, file_path: str):
    logger.info(f"Processing image for detection: {detection_id}")
    try:
        with open(file_path, "rb") as f:
            image_bytes = f.read()

        # Run async logic in sync celery worker wrapper
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        loop.run_until_complete(run_detection_async(detection_id, image_bytes))

    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        self.retry(exc=exc, countdown=5)

@celery_app.task(bind=True, queue="analytics_tasks", max_retries=3)
def aggregate_analytics(self, event_type: str, payload: dict):
    """
    Background worker that updates aggregated stats for the admin dashboard.
    This avoids expensive real-time queries.
    """
    from app.db.session import SessionLocalSync # Needs a sync session for celery
    from app.models.enterprise import DailyScanStat
    import datetime
    
    logger.info(f"Aggregating analytics for event: {event_type}")
    try:
        # In a real app we need a sync session or run async via loop
        # Since this is a standard celery task, we can run async via loop
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        async def _aggregate():
            from app.db.session import AsyncSessionLocal
            from sqlalchemy import select
            async with AsyncSessionLocal() as db:
                today = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
                if event_type == "scan_upload":
                    # Update DailyScanStat
                    result = await db.execute(select(DailyScanStat).where(DailyScanStat.date == today))
                    stat = result.scalars().first()
                    if not stat:
                        stat = DailyScanStat(date=today, total_scans=1)
                        db.add(stat)
                    else:
                        stat.total_scans += 1
                    await db.commit()

        loop.run_until_complete(_aggregate())
        
    except Exception as exc:
        logger.error(f"Analytics aggregation failed: {exc}")
        self.retry(exc=exc, countdown=10)


async def process_model_telemetry_and_drift(feedback_id: str, corrected_disease: Optional[str], rating: Optional[int]):
    """
    Continuous Learning pipeline step:
    Aggregates user rating and label corrections, computes precision drift,
    and updates the AI model metrics tables.
    """
    logger.info(f"Processing telemetry drift for feedback {feedback_id}...")
    try:
        from app.models.agriculture import DetectionFeedback
        from app.models.enterprise import AiModelMetric
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            # 1. Calculate accuracy statistics from all feedback
            feedbacks_res = await db.execute(select(DetectionFeedback))
            feedbacks = feedbacks_res.scalars().all()
            
            total = len(feedbacks)
            mismatches = sum(1 for fb in feedbacks if fb.corrected_disease is not None)
            
            accuracy = (total - mismatches) / total if total > 0 else 1.0
            
            # 2. Insert metric entry showing new accuracy level
            metric = AiModelMetric(
                model_name="disease-detection-cnn",
                inference_time_ms=0.0,
                confidence_score=accuracy,
                status="success",
                error_message=f"Continuous feedback loop check. Feedbacks count: {total}. Corrected label mismatches: {mismatches}. Latest rating: {rating or 'N/A'}"
            )
            db.add(metric)
            await db.commit()
            logger.info(f"Model metric logged: accuracy={accuracy:.2f} based on {total} feedback records.")
            
    except Exception as e:
        logger.error(f"Failed to process model telemetry drift: {e}")

