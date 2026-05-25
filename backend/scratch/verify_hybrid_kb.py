import os
import sys
import numpy as np
import cv2

# Set path context
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.modules.detection.explainability import calculate_severity_metrics, generate_heatmap_file
from app.modules.detection.prompt_builder import build_full_intelligence_prompt
from app.modules.detection.image_quality import image_quality_analyzer

def test_explainability_and_severity():
    print("=== Testing Severity Metrics & Explainability ===")
    
    # 1. Create a dummy image representing a leaf:
    # 300x300 canvas, green background (healthy leaf) with a brown spot (lesion)
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    
    # Green leaves in BGR
    img[:, :] = [40, 150, 40]
    
    # Add a brown spot (BGR [30, 70, 110])
    cv2.circle(img, (150, 150), 30, [30, 70, 110], -1)
    
    # Encode as JPEG bytes
    success, encoded_img = cv2.imencode(".jpg", img)
    assert success, "Failed to encode dummy image."
    image_bytes = encoded_img.tobytes()

    # Test Severity Analysis
    metrics = calculate_severity_metrics(image_bytes)
    print(f"Calculated severity metrics: {metrics}")
    assert "infected_area_pct" in metrics
    assert "computed_severity" in metrics
    print("SUCCESS: Severity metric calculations verified.")

    # Test Heatmap Generation
    test_id = "test_verification_id"
    heatmap_path = generate_heatmap_file(image_bytes, test_id)
    print(f"Generated Heatmap path: {heatmap_path}")
    assert heatmap_path.endswith(f"/static/heatmaps/{test_id}.jpg")
    
    absolute_filepath = os.path.join(os.getcwd(), "static", "heatmaps", f"{test_id}.jpg")
    assert os.path.exists(absolute_filepath), f"Heatmap file was not written to: {absolute_filepath}"
    print(f"SUCCESS: Disk-based heatmap generation verified. File size: {os.path.getsize(absolute_filepath)} bytes")

    # Clean up verification heatmap
    try:
        os.remove(absolute_filepath)
        print("Cleaned up verification heatmap file.")
    except Exception as e:
        print(f"Warning: Failed to clean up verification heatmap: {e}")

def test_prompt_builder():
    print("\n=== Testing Grounded Prompt Builder ===")
    
    grounding_kb = {
        "disease_name": "blast",
        "disease_identity": {
            "display_name": "Rice Blast",
            "scientific_name": "Magnaporthe oryzae"
        },
        "farmer_report": {
            "treatment_plan": {
                "recommended_product": "Tricyclazole 75% WP",
                "dosage": "0.6 g/L",
                "application_method": "Foliar spray"
            }
        }
    }

    prompt = build_full_intelligence_prompt(
        disease_name="blast",
        confidence=0.87,
        severity="High",
        grounding_kb=grounding_kb,
        weather_data={"available": True, "location": "Nellore", "current_conditions": {"temp": 32}},
        image_quality={"scan_quality_score": 85, "quality_grade": "good"},
        target_language="Telugu"
    )
    
    # Assertions
    assert "Telugu" in prompt
    assert "blast" in prompt
    assert "Tricyclazole 75% WP" in prompt
    assert "SECURITY & SAFETY RULE" in prompt
    
    print("SUCCESS: Multilingual grounded prompt structure with injection guardrails verified.")

def test_image_quality():
    print("\n=== Testing Image Quality Pre-Inference Validator ===")
    
    # Create dark image (too dark)
    dark_img = np.zeros((300, 300, 3), dtype=np.uint8)
    _, encoded_dark = cv2.imencode(".jpg", dark_img)
    dark_bytes = encoded_dark.tobytes()

    quality = image_quality_analyzer.analyze(dark_bytes)
    print(f"Quality analyzer output for dark image: {quality}")
    assert quality.get("needs_retake") is True
    assert "retake_suggestions" in quality
    print("SUCCESS: Quality analyzer pre-inference rejection gate verified.")

if __name__ == "__main__":
    try:
        test_explainability_and_severity()
        test_prompt_builder()
        test_image_quality()
        print("\nALL LOCAL HYBRID PLATFORM UNIT TESTS PASSED SUCCESSFULLY!")
    except Exception as e:
        print(f"\nVerification tests failed: {e}")
        sys.exit(1)
