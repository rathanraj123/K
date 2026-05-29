import logging
import asyncio
import time
import datetime
from typing import Optional

from app.db.session import AsyncSessionLocal
from app.models.agriculture import DiseaseDetection
from app.models.analytics import AILog
from app.modules.detection.service import detection_service
from app.cache.redis_cache import redis_cache

logger = logging.getLogger(__name__)

class InferenceService:
    async def _update_pipeline_state(self, detection_id: str, state: str) -> None:
        try:
            async with AsyncSessionLocal() as db:
                detection = await db.get(DiseaseDetection, detection_id)
                if detection:
                    detection.pipeline_state = state
                    await db.commit()
        except Exception as e:
            logger.debug(f"Pipeline state -> {state} failed: {e}")

    async def _save_partial_result(self, detection_id: str, fast_result: dict, lat: Optional[float], lon: Optional[float], crop_type: str) -> None:
        try:
            async with AsyncSessionLocal() as db:
                detection = await db.get(DiseaseDetection, detection_id)
                if detection:
                    detection.detected_disease = fast_result.get("detected_disease")
                    detection.confidence = fast_result.get("confidence")
                    detection.severity = fast_result.get("severity")
                    detection.image_quality = fast_result.get("image_quality")
                    detection.similar_diseases = fast_result.get("similar_diseases")
                    detection.status = "partial"
                    detection.pipeline_state = "INFERENCE"
                    if lat is not None:
                        detection.scan_latitude = lat
                    if lon is not None:
                        detection.scan_longitude = lon
                    if crop_type:
                        detection.crop_type = crop_type
                    await db.commit()
        except Exception as e:
            logger.debug(f"_save_partial_result failed: {e}")

    async def _run_enrichment_phase(self, detection_id: str, image_bytes: bytes, fast_result: dict, lat: Optional[float], lon: Optional[float], crop_type: str, user_role: str, language: str, image_hash: Optional[str]) -> None:
        try:
            asyncio.create_task(self._update_pipeline_state(detection_id, "WEATHER_ANALYSIS"))
            full_result = await detection_service.predict_disease(
                image_bytes, lat=lat, lon=lon, crop_type=crop_type, user_role=user_role, language=language, detection_id=detection_id
            )
            full_result["cache_hit"] = False
            full_result["enrichment_status"] = "completed"
            asyncio.create_task(self._update_pipeline_state(detection_id, "COMPLETED"))

            if image_hash:
                try:
                    await redis_cache.set_prediction(image_hash, full_result)
                except Exception:
                    pass

            async with AsyncSessionLocal() as db:
                detection = await db.get(DiseaseDetection, detection_id)
                if not detection:
                    return

                ai_log = AILog(user_id=detection.user_id, model_used="groq-llama-3.1-8b-instant", response_time_ms=0)
                db.add(ai_log)

                detection.detected_disease = full_result.get("detected_disease")
                detection.confidence = full_result.get("confidence")
                detection.severity = full_result.get("severity")
                detection.explainability_meta = full_result.get("explainability_meta")
                detection.explanation = full_result.get("explanation")
                detection.treatments = full_result.get("treatments")
                detection.farmer_treatments = full_result.get("farmer_treatments")
                detection.cosmetic_insights = full_result.get("cosmetic_insights")

                disease_identity = full_result.get("disease_identity", {})
                if isinstance(disease_identity, dict):
                    detection.scientific_name = disease_identity.get("scientific_name")
                    detection.disease_category = disease_identity.get("disease_category")
                    detection.spread_risk = disease_identity.get("spread_risk")
                    detection.contagiousness = disease_identity.get("contagiousness")
                    detection.crop_stage_affected = disease_identity.get("crop_stage_affected")

                farmer_report = full_result.get("farmer_report")
                if farmer_report and isinstance(farmer_report, dict) and "farmer_risk_score" in full_result:
                    farmer_report["farmer_risk_score"] = full_result["farmer_risk_score"]
                detection.farmer_report = farmer_report
                detection.similar_diseases = full_result.get("similar_diseases")
                detection.image_quality = full_result.get("image_quality")
                detection.weather_risk = full_result.get("weather_risk")
                
                if lat is not None:
                    detection.scan_latitude = lat
                if lon is not None:
                    detection.scan_longitude = lon
                if crop_type:
                    detection.crop_type = crop_type

                weather = full_result.get("weather_risk")
                if isinstance(weather, dict) and weather.get("location"):
                    detection.scan_location_name = weather["location"]

                detection.status = "completed"

                # Analytics tracking
                try:
                    from app.models.enterprise import DailyScanStat, DiseaseStatistic
                    from app.services.event_service import EventService
                    from sqlalchemy import select

                    today = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
                    stat_res = await db.execute(select(DailyScanStat).where(DailyScanStat.date == today))
                    stat = stat_res.scalars().first()
                    if not stat:
                        stat = DailyScanStat(date=today, total_scans=1, failed_scans=0, avg_confidence=float(full_result.get("confidence", 0.0)))
                        db.add(stat)
                    else:
                        old = stat.total_scans
                        nc = float(full_result.get("confidence", 0.0))
                        stat.avg_confidence = ((stat.avg_confidence * old) + nc) / (old + 1)
                        stat.total_scans += 1

                    disease_name = full_result.get("detected_disease", "Unknown")
                    region = detection.scan_location_name or "Unknown"
                    dis_res = await db.execute(select(DiseaseStatistic).where(DiseaseStatistic.disease_name == disease_name, DiseaseStatistic.region == region))
                    disease_stat = dis_res.scalars().first()
                    if not disease_stat:
                        disease_stat = DiseaseStatistic(disease_name=disease_name, occurrence_count=1, region=region, last_detected=datetime.datetime.now(datetime.timezone.utc))
                        db.add(disease_stat)
                    else:
                        disease_stat.occurrence_count += 1
                        disease_stat.last_detected = datetime.datetime.now(datetime.timezone.utc)

                    await db.commit()
                    payload = {
                        "message": f"Scan completed: {disease_name} ({float(full_result.get('confidence', 0)) * 100:.1f}%) in {region}",
                        "detection_id": detection_id,
                        "crop_type": crop_type,
                        "disease": disease_name,
                        "confidence": float(full_result.get("confidence", 0.0)) * 100,
                        "severity": full_result.get("severity", "unknown"),
                    }
                    await EventService.emit_event(db, "analytics_update", payload, user_id=detection.user_id)
                except Exception:
                    pass

                try:
                    await db.commit()
                except Exception:
                    pass

        except Exception as enrich_err:
            logger.error(f"Enrichment phase failed for {detection_id}: {enrich_err}")
            asyncio.create_task(self._update_pipeline_state(detection_id, "FAILED"))
            try:
                async with AsyncSessionLocal() as db:
                    detection = await db.get(DiseaseDetection, detection_id)
                    if detection and detection.status in ("partial", "processing"):
                        detection.explanation = f"AI report unavailable: {enrich_err}."
                        detection.status = "partial_failed"
                        await db.commit()
            except Exception:
                pass

    async def run_detection_async(self, detection_id: str, image_bytes: bytes, lat: Optional[float] = None, lon: Optional[float] = None, crop_type: str = "Rice", user_role: str = "farmer", language: str = "English", file_key: Optional[str] = None) -> None:
        dedup_lock_name = None
        lock_acquired = False
        image_hash = None

        try:
            start_time = time.time()
            try:
                image_hash = redis_cache.compute_image_hash(image_bytes)
                cached = await redis_cache.get_prediction(image_hash)
                if cached:
                    cached["cache_hit"] = True
                    cached["enrichment_status"] = "completed"
                    asyncio.create_task(self._update_pipeline_state(detection_id, "COMPLETED"))

                    async with AsyncSessionLocal() as db:
                        detection = await db.get(DiseaseDetection, detection_id)
                        if detection:
                            detection.detected_disease = cached.get("detected_disease")
                            detection.confidence = cached.get("confidence")
                            detection.severity = cached.get("severity")
                            detection.explainability_meta = cached.get("explainability_meta")
                            detection.explanation = cached.get("explanation")
                            detection.farmer_report = cached.get("farmer_report")
                            detection.image_quality = cached.get("image_quality")
                            detection.weather_risk = cached.get("weather_risk")
                            detection.similar_diseases = cached.get("similar_diseases")
                            detection.status = "completed"
                            if lat is not None:
                                detection.scan_latitude = lat
                            if lon is not None:
                                detection.scan_longitude = lon
                            if crop_type:
                                detection.crop_type = crop_type
                            await db.commit()
                    return
            except Exception:
                pass

            if image_hash:
                try:
                    dedup_lock_name = f"dedup:{image_hash}"
                    lock_acquired = await redis_cache.acquire_lock(dedup_lock_name, expire_seconds=120)
                except Exception:
                    pass

            asyncio.create_task(self._update_pipeline_state(detection_id, "VALIDATING"))
            fast_result = await detection_service.predict_disease_fast(image_bytes, detection_id=detection_id)
            asyncio.create_task(self._save_partial_result(detection_id, fast_result, lat, lon, crop_type))

            # Trigger Phase B via celery instead of asyncio task (Phase 3 spec)
            from app.workers.tasks import enrich_image
            enrich_image.delay(
                detection_id=detection_id,
                fast_result=fast_result,
                lat=lat,
                lon=lon,
                crop_type=crop_type,
                user_role=user_role,
                language=language,
                image_hash=image_hash,
                file_key=file_key
            )

        except Exception as e:
            logger.error(f"[Phase A] Detection {detection_id} failed: {e}")
            asyncio.create_task(self._update_pipeline_state(detection_id, "FAILED"))
            try:
                from app.models.enterprise import DailyScanStat
                from sqlalchemy import select
                async with AsyncSessionLocal() as db:
                    today = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
                    stat_res = await db.execute(select(DailyScanStat).where(DailyScanStat.date == today))
                    stat = stat_res.scalars().first()
                    if not stat:
                        stat = DailyScanStat(date=today, total_scans=1, failed_scans=1)
                        db.add(stat)
                    else:
                        stat.total_scans += 1
                        stat.failed_scans += 1
                    detection = await db.get(DiseaseDetection, detection_id)
                    if detection:
                        detection.status = "failed"
                        detection.explanation = str(e)
                    await db.commit()
            except Exception:
                pass

        finally:
            if lock_acquired and dedup_lock_name:
                try:
                    await redis_cache.release_lock(dedup_lock_name)
                except Exception:
                    pass

inference_service = InferenceService()
