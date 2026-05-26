"""
Enhanced detection service with full AI intelligence pipeline.
Integrates: TFLite ML model → Image quality analysis → Weather risk →
Modular prompt builder → Groq LLM → Structured intelligence output.

Each intelligence subsystem fails independently — graceful degradation.
"""
import logging
import json
from typing import Dict, Any, List, Optional
import numpy as np
import cv2
import groq
import uuid
from app.core.config import settings
from app.modules.detection.image_quality import image_quality_analyzer
from app.modules.detection.weather_risk import weather_risk_service, DISEASE_CATEGORY_MAP
from app.modules.detection.prompt_builder import build_full_intelligence_prompt
from app.modules.detection.explainability import generate_heatmap_file, calculate_severity_metrics

# TensorFlow will be lazy-loaded to prevent memory/timeout issues during Render deployment

import os

logger = logging.getLogger(__name__)


class DetectionService:
    def __init__(self):
        self.model_path = os.path.join(os.getcwd(), "model.tflite")

        self.groq_api_key = settings.GROQ_API_KEY
        self.groq_client = (
            groq.AsyncGroq(api_key=self.groq_api_key, max_retries=1)
            if self.groq_api_key
            else None
        )

        self.interpreter = None
        self.input_details = None
        self.output_details = None
        self.class_names = [
            "bacterial_leaf_blight",
            "bacterial_leaf_streak",
            "bacterial_panicle_blight",
            "blast",
            "brown_spot",
            "dead_heart",
            "downy_mildew",
            "hispa",
            "normal",
            "tungro",
        ]

    async def _get_interpreter(self):
        """Lazy load TFLite to save RAM and prevent Uvicorn port binding timeouts."""
        if self.interpreter is not None:
            return self.interpreter, self.input_details, self.output_details

        try:
            import ai_edge_litert.interpreter as tflite
        except ImportError:
            logger.error("ai-edge-litert is not installed.")
            return None, None, None

        if os.path.exists(self.model_path) and os.path.getsize(self.model_path) > 1000:
            import asyncio
            try:
                logger.info(f"Loading TFLite model from {self.model_path}...")
                # Load model in a separate thread to prevent blocking the async event loop
                def load_tf():
                    interpreter = tflite.Interpreter(model_path=self.model_path)
                    interpreter.allocate_tensors()
                    return interpreter, interpreter.get_input_details(), interpreter.get_output_details()
                
                self.interpreter, self.input_details, self.output_details = await asyncio.to_thread(load_tf)
                logger.info("✅ TFLite Model loaded successfully.")
                return self.interpreter, self.input_details, self.output_details
            except Exception as e:
                logger.error(f"❌ Failed to load TFLite model: {e}")
                return None, None, None
        else:
            logger.error(f"⚠️ Model file not found at {self.model_path} or invalid length.")
            return None, None, None

    async def preload_model(self):
        """Preloads the model into memory. Designed to be called at application startup."""
        await self._get_interpreter()

    # ─── Main Detection Pipeline ─────────────────────────────────

    async def predict_disease(
        self,
        image_bytes: bytes,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        crop_type: str = "Rice",
        user_role: str = "farmer",
        language: str = "English",
        detection_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Full intelligence pipeline:
        1. Image quality validation (early fail if quality too low)
        2. ML inference (TFLite) with 55% confidence thresholding
        3. HSV-based severity and affected leaf area estimation
        4. Weather risk intelligence (OpenWeather)
        5. AI intelligence generation (Grounded Groq LLM)
        6. Explainability heatmap generation (Disk-based)
        """
        result: Dict[str, Any] = {}
        det_id = detection_id or str(uuid.uuid4())

        # ── Stage 0: Scene Understanding & Auto-Cropping (YOLO-World) ──
        if not settings.LOW_MEMORY_MODE:
            try:
                from app.modules.detection.yolo_validator import yolo_validator
                intelligence_scores, cropped_bytes = yolo_validator.analyze_and_crop(image_bytes)
                
                # Inject YOLO intelligence scores into result
                result["yolo_intelligence"] = intelligence_scores
                
                # Replace original image with isolated leaf for better inference
                image_bytes = cropped_bytes
                
            except Exception as e:
                logger.error(f"Scene understanding validation failed: {e}")
                raise ValueError(str(e))
        else:
            logger.info("Low Memory Mode: skipping YOLO scene understanding validation.")
            result["yolo_intelligence"] = {
                "leaf_detected": True,
                "is_rice_leaf": True,
                "leaf_coverage_pct": 100.0,
                "background_noise": "low",
                "recommendation": "Proceed (Low Memory Mode - YOLO bypassed)",
                "detected_objects": ["leaf"]
            }

        # ── Stage 1: Image Quality Analysis & Validation ─────────
        try:
            image_quality = image_quality_analyzer.analyze(image_bytes)
            result["image_quality"] = image_quality
            if image_quality and image_quality.get("needs_retake"):
                suggestions = " ".join(image_quality.get("retake_suggestions", []))
                # Only raise error if YOLO didn't already override this with a warning
                yolo_rec = result.get("yolo_intelligence", {}).get("recommendation", "")
                if "Warning" not in yolo_rec:
                    raise ValueError(f"Image quality is too low for a reliable diagnosis. suggestions: {suggestions}")
        except Exception as e:
            logger.error(f"Image quality validation failed: {e}")
            raise ValueError(f"Image quality validation failed: {e}")

        # ── Stage 2: ML Inference ────────────────────────────────
        try:
            interpreter, input_details, output_details = await self._get_interpreter()
            if not interpreter:
                raise RuntimeError("ML model is not loaded in memory")

            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                raise ValueError("Invalid or corrupted image file bytes.")

            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img_rgb, (224, 224))
            img_normalized = img_resized.astype("float32")
            img_array = np.expand_dims(img_normalized, axis=0)

            interpreter.set_tensor(input_details[0]["index"], img_array)
            interpreter.invoke()
            predictions = interpreter.get_tensor(output_details[0]["index"])

            # Top-k confidence breakdown
            probs = predictions[0]
            # Softmax normalization if not already
            if np.sum(probs) > 1.5 or np.any(probs < 0):
                exp_probs = np.exp(probs - np.max(probs))
                probs = exp_probs / np.sum(exp_probs)

            sorted_indices = np.argsort(probs)[::-1]
            confidence_breakdown = []
            for idx in sorted_indices:
                label = (
                    self.class_names[idx]
                    if idx < len(self.class_names)
                    else "Unknown"
                )
                confidence_breakdown.append(
                    {"label": label, "value": round(float(probs[idx]) * 100, 2)}
                )

            top_idx = int(sorted_indices[0])
            confidence = float(probs[top_idx])

            # Apply strict confidence threshold of 55%
            similar_diseases = []
            uncertainty_reasons = []
            escalate_to_expert = False

            if confidence < 0.55:
                disease_name = "uncertain_prediction"
                severity = "Low"
                infected_area_pct = 0.0
                
                # Analyze reasons for uncertainty
                metrics = image_quality.get("metrics", {}) if 'image_quality' in locals() and image_quality else {}
                if metrics.get("brightness", 128) < 80:
                    uncertainty_reasons.append("Low lighting conditions")
                if metrics.get("blur_score", 100) < 150:
                    uncertainty_reasons.append("Motion blur or out of focus")
                if metrics.get("leaf_coverage_pct", 100) < 30:
                    uncertainty_reasons.append("Partial leaf visibility or atypical symptom presentation")
                
                if len(sorted_indices) > 1:
                    top2_diff = confidence - float(probs[sorted_indices[1]])
                    if top2_diff < 0.15:
                        alt_name = self.class_names[sorted_indices[1]] if sorted_indices[1] < len(self.class_names) else "Unknown"
                        uncertainty_reasons.append(f"High class ambiguity (similar visual symptoms to {alt_name.replace('_', ' ').title()})")
                
                if not uncertainty_reasons:
                    uncertainty_reasons.append("Unusual symptom presentation not strongly matching known patterns")
            else:
                disease_name = self.class_names[top_idx]
                # Severity and leaf coverage calculations via HSV color segmentation
                severity_data = calculate_severity_metrics(image_bytes)
                infected_area_pct = severity_data.get("infected_area_pct", 0.0)
                severity = severity_data.get("computed_severity", "Low")
                
                # Expert Escalation Logic
                if severity == "High" and confidence < 0.65:
                    escalate_to_expert = True
                
                # Top visual similarity alternative candidates (confidence > 5%)
                if len(sorted_indices) > 1:
                    for idx in sorted_indices[1:3]:
                        alt_conf = float(probs[idx])
                        if alt_conf > 0.05:
                            alt_name = self.class_names[idx] if idx < len(self.class_names) else "Unknown"
                            similar_diseases.append({
                                "disease_name": alt_name,
                                "confidence": round(alt_conf * 100, 2)
                            })

            result["detected_disease"] = disease_name
            result["confidence"] = confidence
            result["severity"] = severity
            result["confidence_breakdown"] = confidence_breakdown
            result["similar_diseases"] = similar_diseases
            result["uncertainty_reasons"] = uncertainty_reasons
            result["escalate_to_expert"] = escalate_to_expert

        except Exception as e:
            logger.error(f"ML inference failed: {e}")
            raise ValueError(f"Failed to infer image: {e}")

        # ── Stage 3: Weather Risk Intelligence ───────────────────
        weather_data = None
        if lat is not None and lon is not None:
            try:
                weather_data = await weather_risk_service.get_weather_risk(
                    disease_name, lat, lon
                )
                result["weather_risk"] = weather_data
            except Exception as e:
                logger.error(f"Weather risk analysis failed (non-fatal): {e}")
                result["weather_risk"] = None
        else:
            result["weather_risk"] = None

        # ── Stage 3.5: Disease Evolution Prediction (Forecasting) ───
        evolution_prediction = None
        if disease_name != "uncertain_prediction":
            # Baseline deterministic rules based on weather and severity
            humidity = weather_data.get("main", {}).get("humidity", 50) if weather_data else 50
            temp = weather_data.get("main", {}).get("temp", 25) if weather_data else 25
            
            risk_level = "LOW"
            growth_rate = 5 # baseline 5%
            window = 72 # 72 hours
            
            if severity == "High":
                growth_rate += 15
                window = 24
                risk_level = "HIGH"
            elif severity == "Medium":
                growth_rate += 8
                window = 48
                risk_level = "MEDIUM"
                
            # Weather acceleration
            if humidity > 80:
                growth_rate += 10
                if risk_level != "HIGH":
                    risk_level = "HIGH"
                    window = max(24, window - 24)
            if 25 < temp < 32:
                growth_rate += 5
                
            evolution_prediction = {
                "spread_risk_next_7_days": risk_level,
                "expected_infection_growth_pct": min(growth_rate, 100),
                "recommended_intervention_window": f"{window} hours"
            }
        
        result["evolution_prediction"] = evolution_prediction

        # ── Stage 4: AI Intelligence Generation (Grounded Groq LLM)
        from app.services.kb_service import kb_service
        
        # Grounding data config
        if disease_name == "uncertain_prediction":
            kb_data = {
                "disease_name": "uncertain_prediction",
                "disease_identity": {
                    "display_name": "Uncertain Diagnosis",
                    "scientific_name": "N/A",
                    "disease_category": "none",
                    "spread_risk": "none",
                    "contagiousness": "none",
                    "crop_stage_affected": "none"
                },
                "farmer_report": {
                    "diagnosis": "Uncertain Diagnosis",
                    "severity": "Low",
                    "crop_risk": "Undetermined crop risk. The uploaded image is not clear enough for a reliable diagnosis.",
                    "weather_impact": "Weather risk cannot be determined for an uncertain diagnosis.",
                    "immediate_actions": [
                        "Capture a new photo closer to the crop leaf.",
                        "Ensure the leaf is in focus and well-lit by natural sunlight.",
                        "Avoid heavy shadows, glares, or blur."
                    ],
                    "treatment_plan": {
                        "recommended_product": "None",
                        "dosage": "N/A",
                        "application_method": "N/A",
                        "estimated_cost_inr": "₹0"
                    },
                    "prevention_tips": [
                        "Keep the camera lens clean when capturing crop scans.",
                        "Standard daily inspection of plant leaves for spots or pests."
                    ],
                    "agronomist_summary": "Uncertain prediction. Please capture a clearer, high-contrast, well-focused image."
                },
                "scientist_report": {
                    "primary_pathology": "Model confidence is below the 55% reliability threshold.",
                    "confidence_interpretation": f"Low confidence classification of {confidence*100:.1f}%. Model requires higher clarity for taxonomy matching.",
                    "visual_feature_analysis": ["Insufficient key visual structures detected"],
                    "pathogen_profile": {
                        "scientific_name": "N/A",
                        "taxonomy": "N/A",
                        "infection_mechanism": "N/A",
                        "disease_cycle_stage": "N/A"
                    },
                    "environmental_correlation": "Pathogen environmental correlation cannot be established without a reliable classification.",
                    "biochemical_impact": ["Physiological state cannot be mapped due to uncertain prediction."],
                    "epidemiological_risk": "Epidemiological profiling requires a model confidence above 55%.",
                    "model_reasoning": f"Max class probability of {confidence*100:.1f}% is below the 55% safety threshold.",
                    "research_recommendation": "Submit a higher resolution image under standardized daylight conditions for visual feature extraction."
                }
            }
        else:
            kb_data = kb_service.get_disease_info(disease_name)
        
        ai_data = None
        if kb_data and self.groq_client:
            try:
                prompt = build_full_intelligence_prompt(
                    disease_name=disease_name,
                    confidence=confidence,
                    severity=severity,
                    grounding_kb=kb_data,
                    weather_data=result.get("weather_risk"),
                    image_quality=result.get("image_quality"),
                    target_language=language
                )
                
                response = await self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are the AgriCosmo AI Intelligence System. You only output valid JSON with no markdown wrapping or extra text."},
                        {"role": "user", "content": prompt}
                    ],
                    model="llama-3.1-8b-instant",
                    temperature=0.1,
                    max_tokens=2048,
                    response_format={"type": "json_object"}
                )
                
                content = response.choices[0].message.content
                ai_data = json.loads(content)
                logger.info("Successfully generated hybrid dynamic AI intelligence using Groq llama-3.1-8b-instant.")
            except Exception as ex:
                logger.error(f"Groq dynamic AI generation failed (falling back to static KB): {ex}")

        # Fallback to static KB structure if Groq call failed or was not configured
        if not ai_data:
            if kb_data:
                ai_data = kb_data
                if "farmer_report" in ai_data:
                    ai_data["farmer_report"]["severity"] = severity
            else:
                logger.warning(f"No local KB data found for {disease_name}, using defaults")
                ai_data = self._get_default_intelligence(disease_name, confidence, severity)

        # Merge results
        result.update(ai_data)
        
        # Inject default risk score if missing
        if "farmer_risk_score" not in result:
            crop_risk_pct = 15 if severity == "Low" else (50 if severity == "Medium" else 85)
            yield_loss = "0-5%" if severity == "Low" else ("5-15%" if severity == "Medium" else "15-30%")
            urgency = "Low" if severity == "Low" else ("Moderate" if severity == "Medium" else "High")
            result["farmer_risk_score"] = {
                "crop_risk_score": crop_risk_pct,
                "estimated_yield_loss": yield_loss,
                "urgency_level": urgency
            }

        # Pull disease identity from KB
        disease_identity = ai_data.get("disease_identity", {})
        result["disease_identity"] = disease_identity

        # ── Stage 5: Explainability Heatmap & Metadata ───────────
        heatmap_url = generate_heatmap_file(image_bytes, det_id)
        result["explainability_meta"] = {
            "heatmap_url": heatmap_url,
            "key_features_detected": ["lesion_contrast_analysis", "hsv_chroma_segmentation"],
            "infected_area_pct": infected_area_pct,
            "computed_severity": severity
        }

        # ── Stage 6: Versioning Metadata ──────────────────────────
        result["version_meta"] = {
            "model_version": "v1.0-tflite",
            "kb_version": "2026.05",
            "prompt_version": "v2.1-grounded-llama"
        }

        result["explanation"] = self._build_explanation(
            disease_name, confidence, ai_data
        )

        return result

    # ─── Rule-Based Defaults (Fallback) ──────────────────────────

    def _get_default_intelligence(
        self, disease_name: str, confidence: float, severity: str
    ) -> Dict[str, Any]:
        """Minimal rule-based intelligence when LLM is unavailable."""
        category = "unknown"
        is_healthy = disease_name.lower() in ("normal", "healthy")

        return {
            "farmer_report": {
                "diagnosis": "Healthy Plant" if is_healthy else f"{disease_name.replace('_', ' ').title()} Detected",
                "severity": "None" if is_healthy else severity,
                "crop_risk": "Low risk" if is_healthy else "Moderate to High crop damage expected if untreated.",
                "weather_impact": "Monitor standard conditions." if is_healthy else "Humid conditions may accelerate spread.",
                "immediate_actions": ["Monitor health"] if is_healthy else ["Isolate plant", "Improve air circulation"],
                "treatment_plan": {
                    "recommended_product": "None" if is_healthy else "Mancozeb 75% WP",
                    "dosage": "N/A" if is_healthy else "2g/L",
                    "application_method": "N/A" if is_healthy else "Foliar spray",
                    "estimated_cost_inr": "₹0" if is_healthy else "₹450"
                },
                "prevention_tips": ["Maintain regular watering"] if is_healthy else ["Crop rotation", "Use resistant varieties"],
                "agronomist_summary": "Crop appears healthy." if is_healthy else "Action required to prevent yield loss."
            },
            "scientist_report": {
                "primary_pathology": "Healthy specimen" if is_healthy else f"{disease_name} infection.",
                "confidence_interpretation": f"Model confidence is {confidence*100:.1f}%.",
                "visual_feature_analysis": ["No abnormal lesions"] if is_healthy else ["Lesion geometric analysis", "Chlorosis detection"],
                "pathogen_profile": {
                    "scientific_name": "N/A" if is_healthy else "Unknown pathogen",
                    "taxonomy": "N/A",
                    "infection_mechanism": "N/A",
                    "disease_cycle_stage": "N/A"
                },
                "environmental_correlation": "Standard environmental conditions observed.",
                "biochemical_impact": ["None"] if is_healthy else ["Chlorophyll degradation"],
                "epidemiological_risk": "None" if is_healthy else "Potential local spread risk.",
                "model_reasoning": "Pattern matching confirmed diagnosis.",
                "research_recommendation": "No action needed." if is_healthy else "Further field sampling recommended."
            }
        }

    # ─── Helpers ─────────────────────────────────────────────────

    def _compute_severity(self, disease_name: str, confidence: float) -> str:
        """Rule-based severity computation."""
        if disease_name.lower() in ("normal", "healthy"):
            return "None"

        high_severity_diseases = {"bacterial_leaf_blight", "bacterial_panicle_blight", "blast", "tungro"}
        if disease_name.lower() in high_severity_diseases and confidence > 0.7:
            return "High"
        elif confidence > 0.8:
            return "High"
        elif confidence > 0.5:
            return "Medium"
        else:
            return "Low"

    def _build_explanation(
        self, disease_name: str, confidence: float, ai_data: Dict[str, Any]
    ) -> str:
        """Build human-readable explanation string."""
        base = (
            f"AI identified {disease_name.replace('_', ' ').title()} "
            f"with {confidence * 100:.1f}% confidence using the AgriCosmo TFLite model."
        )

        farmer_report = ai_data.get("farmer_report", {})
        if farmer_report and "diagnosis" in farmer_report:
            base += f" {farmer_report['diagnosis']}"

        scientist_report = ai_data.get("scientist_report", {})
        if scientist_report and "primary_pathology" in scientist_report:
            base += f" {scientist_report['primary_pathology']}"

        return base


detection_service = DetectionService()
