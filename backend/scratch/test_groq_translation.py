import os
import asyncio
import sys
import json
import groq

# Set path context
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.modules.detection.prompt_builder import build_full_intelligence_prompt

async def main():
    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Error: GROQ_API_KEY is not configured.")
        return
        
    client = groq.AsyncGroq(api_key=api_key)
    
    grounding_kb = {
        "disease_name": "blast",
        "disease_identity": {
            "display_name": "Rice Blast",
            "scientific_name": "Magnaporthe oryzae",
            "disease_category": "fungal",
            "spread_risk": "high",
            "contagiousness": "high",
            "crop_stage_affected": "tillering to flowering"
        },
        "farmer_report": {
            "diagnosis": "Rice Blast disease detected.",
            "severity": "Low",
            "crop_risk": "Low risk under current dry conditions.",
            "weather_impact": "Dry weather slows fungal propagation.",
            "immediate_actions": [
                "Avoid excessive nitrogenous fertilizer application.",
                "Ensure clean water drainage."
            ],
            "treatment_plan": {
                "recommended_product": "Tricyclazole 75% WP",
                "dosage": "0.6 g/L",
                "application_method": "Foliar spray",
                "estimated_cost_inr": "120-250 INR"
            },
            "prevention_tips": [
                "Use blast-resistant varieties.",
                "Rotate crops periodically."
            ],
            "agronomist_summary": "Rice blast is a serious fungal disease. Early monitoring is recommended."
        }
    }

    prompt = build_full_intelligence_prompt(
        disease_name="blast",
        confidence=0.87,
        severity="Low",
        grounding_kb=grounding_kb,
        weather_data={"available": True, "location": "Nellore", "current_conditions": {"temp": 32}},
        image_quality={"scan_quality_score": 85, "quality_grade": "good"},
        target_language="Telugu"
    )

    print("Sending prompt to Groq...")
    response = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are the AgriCosmo AI Intelligence System. You only output valid JSON with no markdown wrapping or extra text."},
            {"role": "user", "content": prompt}
        ],
        model="llama-3.1-8b-instant",
        temperature=0.1,
        max_tokens=1024,
        response_format={"type": "json_object"}
    )
    
    content = response.choices[0].message.content
    
    # Save output as UTF-8 file
    with open("scratch/groq_output.json", "w", encoding="utf-8") as f:
        f.write(content)
        
    print("SUCCESS: Response written to scratch/groq_output.json")
    
    try:
        data = json.loads(content)
        print("Root keys:", list(data.keys()))
        if "farmer_report" in data:
            print("farmer_report keys:", list(data["farmer_report"].keys()))
        else:
            print("WARNING: farmer_report key is missing!")
    except Exception as e:
        print("Failed to parse JSON:", e)

if __name__ == "__main__":
    asyncio.run(main())
