"""
Modular prompt builder for AI intelligence generation.
Generates role-specific JSON reports based on the user's role.
"""
from typing import Dict, Any, List, Optional
import json

def build_full_intelligence_prompt(
    disease_name: str,
    confidence: float,
    severity: str,
    crop_type: str = "Rice",
    confidence_breakdown: Optional[List[Dict[str, Any]]] = None,
    weather_data: Optional[Dict[str, Any]] = None,
    user_role: str = "farmer",
    image_quality: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generate a HIGHLY STRUCTURED, NON-REPETITIVE, ROLE-SPECIFIC intelligence report.
    """
    
    # Format context variables
    prediction_data = json.dumps({
        "disease_name": disease_name,
        "confidence_pct": round(confidence * 100, 1),
        "crop_type": crop_type
    })
    
    top_predictions = "None"
    if confidence_breakdown:
        top_predictions = json.dumps(
            [{"disease": item["label"], "prob": round(item["value"], 1)} for item in confidence_breakdown[:3]]
        )
        
    weather_context = "Unavailable"
    weather_risk_context = "Unavailable"
    location_context = "Unknown"
    
    if weather_data and weather_data.get("available"):
        weather_context = json.dumps(weather_data.get("current_conditions", {}))
        weather_risk_context = json.dumps(weather_data.get("disease_risk", {}))
        location_context = weather_data.get("location", "Unknown")

    img_quality_context = "Unknown"
    if image_quality:
        img_quality_context = json.dumps({
            "score": image_quality.get("scan_quality_score"),
            "grade": image_quality.get("quality_grade")
        })

    prompt = f"""
You are AgriCosmo Intelligence Engine, an advanced agricultural AI system specialized in crop pathology, agronomy, plant disease diagnostics, environmental risk analysis, and scientific research interpretation.

Your task is to generate a HIGHLY STRUCTURED, NON-REPETITIVE, ROLE-SPECIFIC intelligence report from the provided ML inference and environmental analysis.

-----------------------------------
CRITICAL RULES
-----------------------------------

1. NEVER repeat the same information in multiple sections.
2. Every section MUST provide UNIQUE information.
3. Keep responses concise but information-dense.
4. Avoid generic AI explanations.
5. Avoid repeating disease names excessively.
6. Do NOT restate confidence score repeatedly.
7. Farmer and Scientist outputs MUST be COMPLETELY DIFFERENT in:
   - language
   - depth
   - terminology
   - recommendations
   - structure
8. Use role-adaptive reasoning.
9. Generate ONLY JSON.
10. No markdown.
11. No long introductions.
12. No disclaimers.
13. Avoid unnecessary adjectives.
14. Maximum response size: compact and optimized.
15. Each field should contain NEW information only.
16. If a section overlaps semantically with another section, summarize instead of repeating.
17. Use contextual intelligence instead of templates.

-----------------------------------
INPUT CONTEXT
-----------------------------------

USER ROLE:
{user_role.upper()}

IMAGE QUALITY:
{img_quality_context}

ML PREDICTION:
{prediction_data}

TOP ALTERNATIVES:
{top_predictions}

SEVERITY:
{severity}

WEATHER DATA:
{weather_context}

WEATHER RISK:
{weather_risk_context}

LOCATION:
{location_context}

-----------------------------------
ROLE LOGIC
-----------------------------------

IF USER ROLE = FARMER:
Generate:
- practical guidance
- actionable treatment
- cost-efficient suggestions
- simple language
- fast response
- minimal technical jargon
- immediate prevention strategies
- local farming relevance
- pesticide dosage
- estimated treatment cost in INR
- crop-saving priority actions

DO NOT include:
- taxonomy
- deep pathology
- molecular analysis
- statistical reasoning
- biochemical pathways
- scientific terminology overload

Tone:
Simple, practical, supportive, field-oriented.

-----------------------------------

IF USER ROLE = SCIENTIST:
Generate:
- technical pathology analysis
- disease morphology interpretation
- probable feature attribution
- environmental correlation analysis
- taxonomic classification
- lesion/chlorosis pattern reasoning
- biochemical impact estimation
- epidemiological observations
- scientific inference
- model interpretability insights

DO NOT include:
- home remedies
- simplistic advice
- generic farming instructions
- market pricing
- overly simplified language

Tone:
Formal, research-oriented, analytical, data-driven.

-----------------------------------
ANTI-REPETITION RULES
-----------------------------------

- Never explain the same disease symptom twice.
- If confidence is already mentioned once, do not restate numerically elsewhere.
- Recommendations must not repeat diagnosis wording.
- Weather analysis must focus ONLY on environmental acceleration risk.
- Explainable AI section must ONLY discuss visual reasoning patterns.
- Agronomist recommendation must summarize actions, not repeat previous sections.
- Keep each section semantically independent.

-----------------------------------
OUTPUT FORMAT
-----------------------------------
"""

    if user_role.lower() == "farmer":
        prompt += """
FOR FARMER RETURN ONLY THIS EXACT JSON FORMAT:
{
  "farmer_report": {
    "diagnosis": "string",
    "severity": "string",
    "crop_risk": "string",
    "weather_impact": "string",
    "immediate_actions": ["string"],
    "treatment_plan": {
      "recommended_product": "string",
      "dosage": "string",
      "application_method": "string",
      "estimated_cost_inr": "string"
    },
    "prevention_tips": ["string"],
    "agronomist_summary": "string"
  }
}
"""
    else:
        prompt += """
FOR SCIENTIST RETURN ONLY THIS EXACT JSON FORMAT:
{
  "scientist_report": {
    "primary_pathology": "string",
    "confidence_interpretation": "string",
    "visual_feature_analysis": ["string"],
    "pathogen_profile": {
      "scientific_name": "string",
      "taxonomy": "string",
      "infection_mechanism": "string",
      "disease_cycle_stage": "string"
    },
    "environmental_correlation": "string",
    "biochemical_impact": ["string"],
    "epidemiological_risk": "string",
    "model_reasoning": "string",
    "research_recommendation": "string"
  }
}
"""

    return prompt
