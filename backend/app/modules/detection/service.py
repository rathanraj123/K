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
from app.core.config import settings
from app.modules.detection.image_quality import image_quality_analyzer
from app.modules.detection.weather_risk import weather_risk_service, DISEASE_CATEGORY_MAP
from app.modules.detection.prompt_builder import build_full_intelligence_prompt

# Lazy-load tensorflow
try:
    import tensorflow as tf
except ImportError:
    tf = None

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

        if (
            tf
            and os.path.exists(self.model_path)
            and os.path.getsize(self.model_path) > 1000
        ):
            try:
                logger.info(f"Loading TFLite model from {self.model_path}...")
                self.interpreter = tf.lite.Interpreter(model_path=self.model_path)
                self.interpreter.allocate_tensors()
                self.input_details = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                logger.info("✅ TFLite Model loaded successfully.")
            except Exception as e:
                logger.error(f"❌ Failed to load TFLite model: {e}")
                raise RuntimeError(f"TFLite Model failed to load: {e}")
        else:
            logger.error(
                f"⚠️ Model file not found at {self.model_path} or invalid length."
            )

    # ─── Main Detection Pipeline ─────────────────────────────────

    async def predict_disease(
        self,
        image_bytes: bytes,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        crop_type: str = "Rice",
        user_role: str = "farmer",
    ) -> Dict[str, Any]:
        """
        Full intelligence pipeline:
        1. Image quality analysis (OpenCV)
        2. ML inference (TFLite) with top-k confidence breakdown
        3. Weather risk intelligence (OpenWeather)
        4. AI intelligence generation (Groq LLM)

        Each stage is isolated — failures don't cascade.
        """
        if not self.interpreter:
            raise RuntimeError("ML model is not loaded in memory")

        result: Dict[str, Any] = {}

        # ── Stage 1: Image Quality Analysis ──────────────────────
        try:
            image_quality = image_quality_analyzer.analyze(image_bytes)
            result["image_quality"] = image_quality
        except Exception as e:
            logger.error(f"Image quality analysis failed (non-fatal): {e}")
            result["image_quality"] = None

        # ── Stage 2: ML Inference ────────────────────────────────
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                raise ValueError("Invalid or corrupted image file bytes.")

            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (224, 224))
            img = img.astype("float32")
            img_array = np.expand_dims(img, axis=0)

            self.interpreter.set_tensor(self.input_details[0]["index"], img_array)
            self.interpreter.invoke()
            predictions = self.interpreter.get_tensor(
                self.output_details[0]["index"]
            )

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
            disease_name = (
                self.class_names[top_idx]
                if top_idx < len(self.class_names)
                else "Unknown"
            )
            confidence = float(probs[top_idx])

            # Severity from rules
            severity = self._compute_severity(disease_name, confidence)

            result["detected_disease"] = disease_name
            result["confidence"] = confidence
            result["severity"] = severity
            result["confidence_breakdown"] = confidence_breakdown

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

        # ── Stage 4: AI Intelligence Generation (Groq) ───────────
        ai_data = await self._generate_ai_intelligence(
            disease_name, confidence, severity, crop_type,
            confidence_breakdown, weather_data, user_role
        )
        result.update(ai_data)

        # ── Stage 5: Assemble Explainability Metadata ────────────
        result["explainability_meta"] = {
            "heatmap_url": None,  # Future GradCAM integration
            "key_features_detected": ["pattern_match", "texture_analysis"],
        }

        result["explanation"] = self._build_explanation(
            disease_name, confidence, ai_data
        )

        return result

    # ─── AI Intelligence Generation ──────────────────────────────

    async def _generate_ai_intelligence(
        self,
        disease_name: str,
        confidence: float,
        severity: str,
        crop_type: str,
        confidence_breakdown: List[Dict[str, Any]],
        weather_data: Optional[Dict[str, Any]],
        user_role: str = "farmer",
    ) -> Dict[str, Any]:
        """
        Generate comprehensive AI intelligence via Groq LLM.
        Falls back to rule-based defaults on failure.
        """
        default_data = self._get_default_intelligence(
            disease_name, confidence, severity
        )

        if not self.groq_client:
            logger.warning("No Groq client configured — using defaults")
            return default_data

        try:
            prompt = build_full_intelligence_prompt(
                disease_name=disease_name,
                confidence=confidence,
                severity=severity,
                crop_type=crop_type,
                confidence_breakdown=confidence_breakdown,
                weather_data=weather_data,
                user_role=user_role,
            )

            chat_completion = await self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
                temperature=0.2,
                max_tokens=4000,
            )

            response_text = chat_completion.choices[0].message.content.strip()

            # Clean markdown wrapping
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            generated = json.loads(response_text.strip())
            
            # Ensure the specific role report exists
            if user_role.lower() == "farmer" and "farmer_report" not in generated:
                generated["farmer_report"] = default_data["farmer_report"]
            elif user_role.lower() != "farmer" and "scientist_report" not in generated:
                generated["scientist_report"] = default_data["scientist_report"]

            return generated

        except json.JSONDecodeError as e:
            logger.error(f"Groq returned invalid JSON: {e}")
            return default_data
        except Exception as e:
            logger.error(f"Groq AI generation failed: {e}")
            return default_data

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
