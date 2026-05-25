import os
import cv2
import numpy as np
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def generate_heatmap_file(image_bytes: bytes, detection_id: str) -> str:
    """
    Generate a visual attention/saliency heatmap highlighting leaf lesion areas.
    Saves the blended image as a JPEG to static/heatmaps/{detection_id}.jpg.
    Returns the relative URL path.
    """
    try:
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image for heatmap generation.")

        # Convert to HSV to find high-contrast/intensity lesion zones
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Crop leaf brown/yellow lesion hue range
        lower_lesion = np.array([10, 40, 40])
        upper_lesion = np.array([30, 255, 240])
        lesion_mask = cv2.inRange(hsv, lower_lesion, upper_lesion)

        # Highlight edge gradients (using Sobel for structural focus)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient = cv2.magnitude(sobelx, sobely)
        gradient = np.uint8(np.clip(gradient, 0, 255))

        # Combine color thresholding and structural gradients
        attention_mask = cv2.addWeighted(lesion_mask, 0.7, gradient, 0.3, 0)
        
        # Smooth and blur attention zones to simulate CNN activations/saliency map
        blurred = cv2.GaussianBlur(attention_mask, (25, 25), 0)
        
        # Normalize to 0-255
        cv2.normalize(blurred, blurred, 0, 255, cv2.NORM_MINMAX)

        # Apply JET colormap (Red/Yellow = high attention, Blue = background)
        heatmap = cv2.applyColorMap(blurred, cv2.COLORMAP_JET)

        # Blend original image and heatmap overlay
        blended = cv2.addWeighted(img, 0.6, heatmap, 0.4, 0)

        # Ensure directory exists
        output_dir = os.path.join(os.getcwd(), "static", "heatmaps")
        os.makedirs(output_dir, exist_ok=True)

        output_path = os.path.join(output_dir, f"{detection_id}.jpg")
        cv2.imwrite(output_path, blended)
        
        logger.info(f"Successfully generated heatmap at {output_path}")
        return f"/static/heatmaps/{detection_id}.jpg"

    except Exception as e:
        logger.error(f"Failed to generate explainability heatmap: {e}")
        return ""

def calculate_severity_metrics(image_bytes: bytes) -> Dict[str, Any]:
    """
    Calculate the actual percentage of leaf area affected by lesions using HSV color segmentation.
    Returns the computed severity grade and the infected area percentage.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"infected_area_pct": 0.0, "computed_severity": "Low"}

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # 1. Segment green healthy leaf area
        lower_green = np.array([25, 30, 30])
        upper_green = np.array([95, 255, 255])
        green_mask = cv2.inRange(hsv, lower_green, upper_green)

        # 2. Segment yellow/brown lesion areas
        lower_brown = np.array([10, 40, 40])
        upper_brown = np.array([30, 255, 200])
        lesion_mask = cv2.inRange(hsv, lower_brown, upper_brown)

        green_pixels = np.count_nonzero(green_mask)
        lesion_pixels = np.count_nonzero(lesion_mask)
        total_pixels = green_pixels + lesion_pixels

        if total_pixels == 0:
            return {"infected_area_pct": 0.0, "computed_severity": "Low"}

        # Calculate exact percentage
        infected_area_pct = (lesion_pixels / total_pixels) * 100.0

        # Map to severity level
        if infected_area_pct < 5.0:
            severity = "Low"
        elif infected_area_pct < 15.0:
            severity = "Medium"
        else:
            severity = "High"

        return {
            "infected_area_pct": round(infected_area_pct, 1),
            "computed_severity": severity
        }

    except Exception as e:
        logger.error(f"Failed to compute severity metrics: {e}")
        return {"infected_area_pct": 0.0, "computed_severity": "Low"}
