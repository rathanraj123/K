import os
import json
import asyncio
from dotenv import load_dotenv
import groq

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

CLASSES = [
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

PROMPT_TEMPLATE = """
You are an expert agricultural scientist and agronomist.
Generate a strictly valid JSON knowledge base entry for the rice disease: "{disease}".

Output ONLY JSON. Do not include any markdown wrappers (no ```json).

The JSON must exactly match this structure and fill it with highly accurate, professional, and useful data.
For "normal" (healthy), provide appropriate healthy maintenance data.

{{
    "disease_name": "{disease}",
    "disease_identity": {{
        "scientific_name": "",
        "disease_category": "",
        "spread_risk": "",
        "contagiousness": "",
        "crop_stage_affected": ""
    }},
    "farmer_report": {{
        "diagnosis": "",
        "severity": "",
        "crop_risk": "",
        "weather_impact": "",
        "immediate_actions": ["", ""],
        "treatment_plan": {{
            "recommended_product": "",
            "dosage": "",
            "application_method": "",
            "estimated_cost_inr": ""
        }},
        "prevention_tips": ["", ""],
        "agronomist_summary": ""
    }},
    "scientist_report": {{
        "primary_pathology": "",
        "confidence_interpretation": "Analyzed via CNN model.",
        "visual_feature_analysis": ["", ""],
        "pathogen_profile": {{
            "scientific_name": "",
            "taxonomy": "",
            "infection_mechanism": "",
            "disease_cycle_stage": ""
        }},
        "environmental_correlation": "",
        "biochemical_impact": ["", ""],
        "epidemiological_risk": "",
        "model_reasoning": "Pattern matching confirmed diagnosis.",
        "research_recommendation": ""
    }}
}}
"""

async def generate_kb():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Error: GROQ_API_KEY not found.")
        return

    client = groq.AsyncGroq(api_key=api_key)
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_data")
    os.makedirs(output_dir, exist_ok=True)
    
    kb = {}
    
    for idx, disease in enumerate(CLASSES):
        print(f"[{idx+1}/{len(CLASSES)}] Generating knowledge base for: {disease}...")
        prompt = PROMPT_TEMPLATE.format(disease=disease)
        
        try:
            chat_completion = await client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
                temperature=0.1,
                max_tokens=2000,
            )
            
            content = chat_completion.choices[0].message.content.strip()
            
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
                
            data = json.loads(content.strip())
            kb[disease] = data
            print(f"  -> Success")
        except Exception as e:
            print(f"  -> Failed: {e}")
            
    output_file = os.path.join(output_dir, "diseases.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(kb, f, indent=4)
        
    print(f"\nKnowledge base generated successfully at {output_file}")

if __name__ == "__main__":
    asyncio.run(generate_kb())
