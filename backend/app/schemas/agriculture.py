"""
Pydantic schemas for the agriculture/detection API.
Fully typed response models for the AI diagnostic dashboard.
"""
from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime


# ─── Farmer Treatment Schemas ────────────────────────────────────

class FarmerTreatmentFertilizer(BaseModel):
    name: str
    dosage: str
    cost: str

class FarmerTreatmentPesticide(BaseModel):
    name: str
    dosage: str
    cost: str

class FarmerTreatments(BaseModel):
    home_remedies: list[str]
    fertilizers: list[FarmerTreatmentFertilizer]
    pesticides: list[FarmerTreatmentPesticide]
    urgency: str
    recovery_time: str


# ─── Scientist Data Schemas ──────────────────────────────────────

class ProbabilityDistribution(BaseModel):
    label: str
    value: float

class FeatureImportance(BaseModel):
    feature: str
    importance: float

class ChemicalComposition(BaseModel):
    compound: str
    percentage: float

class ScientistData(BaseModel):
    pathogen_info: Optional[str] = None
    disease_lifecycle: Optional[str] = None
    spread_mechanism: Optional[str] = None
    environmental_conditions: Optional[str] = None
    treatment_rationale: Optional[str] = None
    probabilities: list[ProbabilityDistribution] = []
    feature_importance: list[FeatureImportance] = []
    classification_hierarchy: list[str] = []
    dataset_ref: str = ""
    chemical_composition: list[ChemicalComposition] = []


# ─── Disease Identity ────────────────────────────────────────────

class DiseaseIdentity(BaseModel):
    display_name: str
    scientific_name: str
    disease_category: str   # fungal/bacterial/viral/pest/abiotic/none
    spread_risk: str        # none/low/moderate/high/critical
    contagiousness: str
    crop_stage_affected: str


# ─── Explainable AI ──────────────────────────────────────────────

class VisualEvidence(BaseModel):
    feature: str
    description: str
    confidence_contribution: str  # high/medium/low

class ExplainableAI(BaseModel):
    visual_evidence: list[VisualEvidence] = []
    reasoning_summary: str = ""


# ─── Confidence Breakdown ────────────────────────────────────────

class ConfidenceEntry(BaseModel):
    label: str
    value: float  # percentage 0-100


# ─── Detailed Treatments ─────────────────────────────────────────

class ImmediateAction(BaseModel):
    action: str
    timing: str
    precaution: str

class OrganicTreatment(BaseModel):
    name: str
    method: str
    frequency: str

class ChemicalTreatment(BaseModel):
    name: str
    dosage: str
    timing: str
    precaution: str
    cost_inr: str

class PreventionMeasure(BaseModel):
    measure: str
    description: str

class DetailedTreatments(BaseModel):
    immediate_actions: list[ImmediateAction] = []
    organic_treatments: list[OrganicTreatment] = []
    chemical_treatments: list[ChemicalTreatment] = []
    prevention: list[PreventionMeasure] = []
    irrigation_advice: str = ""
    soil_recommendations: str = ""


# ─── Yield Loss ──────────────────────────────────────────────────

class YieldLossEstimate(BaseModel):
    estimated_loss_pct_min: float = 0
    estimated_loss_pct_max: float = 0
    economic_impact: str = ""
    factors: list[str] = []
    mitigation_potential: str = ""


# ─── Disease Timeline ────────────────────────────────────────────

class TimelineEntry(BaseModel):
    days: int
    stage: str
    description: str
    severity_change: str


# ─── Similar Diseases ────────────────────────────────────────────

class SimilarDisease(BaseModel):
    name: str
    probability_pct: float
    reason_rejected: str
    key_difference: Optional[str] = None


# ─── Smart Products ──────────────────────────────────────────────

class SmartProduct(BaseModel):
    name: str
    type: str  # fungicide/insecticide/bactericide/bio-agent/fertilizer
    active_ingredient: Optional[str] = None
    dosage: str
    treatment_duration: str
    price_inr: str
    precautions: str
    application_method: Optional[str] = None


# ─── Agronomist Recommendation ───────────────────────────────────

class AgronomistRecommendation(BaseModel):
    diagnosis_summary: str
    urgency_level: str  # immediate/urgent/moderate/routine/none
    recommended_actions: list[str] = []
    progression_warning: str = ""
    recovery_prognosis: str = ""
    field_inspection_notes: str = ""


# ─── Image Quality ───────────────────────────────────────────────

class ImageQualityMetrics(BaseModel):
    blur_score: Optional[float] = None
    brightness: Optional[float] = None
    contrast: Optional[float] = None
    leaf_coverage_pct: Optional[float] = None
    shadow_ratio_pct: Optional[float] = None
    overexposure_ratio_pct: Optional[float] = None
    background_noise_pct: Optional[float] = None
    centering_deviation: Optional[float] = None

class ImageQuality(BaseModel):
    scan_quality_score: float = 0
    quality_grade: str = "unknown"
    metrics: Optional[Dict[str, Any]] = None
    component_scores: Optional[Dict[str, float]] = None
    flags: Optional[Dict[str, bool]] = None
    retake_suggestions: list[str] = []
    needs_retake: bool = False


# ─── Weather Risk ────────────────────────────────────────────────

class WeatherConditions(BaseModel):
    temperature_c: float = 0
    humidity_pct: float = 0
    rainfall_mm: float = 0
    description: str = ""

class DiseaseRisk(BaseModel):
    fungal_spread_risk_pct: float = 0
    risk_level: str = "unknown"
    disease_category: str = ""

class WeatherRisk(BaseModel):
    available: bool = False
    location: Optional[str] = None
    current_conditions: Optional[WeatherConditions] = None
    disease_risk: Optional[DiseaseRisk] = None
    correlations: list[str] = []
    agri_warnings: list[str] = []
    error: Optional[str] = None


# ─── Cosmetic Insight ────────────────────────────────────────────

class CosmeticInsight(BaseModel):
    compound: str
    use_case: str


# ─── Main Detection Schemas ─────────────────────────────────────

class DiseaseDetectionBase(BaseModel):
    image_url: Optional[str] = None
    detected_disease: Optional[str] = None
    confidence: Optional[float] = None
    status: str = "completed"
    severity: Optional[str] = None
    explainability_meta: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None
    treatments: Optional[list[str]] = None
    farmer_treatments: Optional[Dict[str, Any]] = None
    scientist_data: Optional[Dict[str, Any]] = None
    cosmetic_insights: Optional[list[Dict[str, Any]]] = None

    # New intelligence fields
    scientific_name: Optional[str] = None
    disease_category: Optional[str] = None
    spread_risk: Optional[str] = None
    contagiousness: Optional[str] = None
    crop_stage_affected: Optional[str] = None
    confidence_breakdown: Optional[list[Dict[str, Any]]] = None
    explainable_ai: Optional[Dict[str, Any]] = None
    agronomist_recommendation: Optional[Dict[str, Any]] = None
    yield_loss_estimate: Optional[Dict[str, Any]] = None
    disease_timeline: Optional[list[Dict[str, Any]]] = None
    similar_diseases: Optional[list[Dict[str, Any]]] = None
    detailed_treatments: Optional[Dict[str, Any]] = None
    smart_products: Optional[list[Dict[str, Any]]] = None
    image_quality: Optional[Dict[str, Any]] = None
    weather_risk: Optional[Dict[str, Any]] = None
    farmer_report: Optional[Dict[str, Any]] = None
    scientist_report: Optional[Dict[str, Any]] = None
    
    scan_latitude: Optional[float] = None
    scan_longitude: Optional[float] = None
    scan_location_name: Optional[str] = None
    crop_type: Optional[str] = None

class DiseaseDetectionCreate(DiseaseDetectionBase):
    pass

class DiseaseDetectionResponse(DiseaseDetectionBase):
    id: str
    user_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Crop Schemas ────────────────────────────────────────────────

class CropBase(BaseModel):
    name: str
    description: Optional[str] = None
    optimal_conditions: Optional[Dict[str, Any]] = None

class CropResponse(CropBase):
    id: str
    
    model_config = {"from_attributes": True}

class DetectionFeedbackCreate(BaseModel):
    corrected_disease: Optional[str] = None
    rating: Optional[int] = None
    comments: Optional[str] = None

class DetectionFeedbackResponse(BaseModel):
    id: str
    detection_id: str
    corrected_disease: Optional[str] = None
    rating: Optional[int] = None
    comments: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class TreatmentTrackCreate(BaseModel):
    treatment_applied: str
    recovery_progress: int
    feedback_rating: Optional[int] = None
    comments: Optional[str] = None

class TreatmentTrackResponse(BaseModel):
    id: str
    detection_id: str
    treatment_applied: str
    recovery_progress: int
    feedback_rating: Optional[int] = None
    comments: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
