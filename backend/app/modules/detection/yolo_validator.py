import cv2
import numpy as np
import io
import logging
from typing import Dict, Any, Tuple, Optional
from PIL import Image
from ultralytics import YOLOWorld

logger = logging.getLogger(__name__)

class YoloValidator:
    def __init__(self, model_path: str = "yolov8s-world.pt"):
        """
        Initialize the YOLO-World Open-Vocabulary model.
        YOLO-World can detect objects dynamically based on text prompts.
        """
        self.model = None
        self.model_path = model_path
        
        # Define the custom classes we want to detect in any uploaded image
        # Broadening the plant-related terms ensures we don't miss generic leaves
        self.classes = [
            "rice leaf", 
            "plant leaf", 
            "leaf",
            "plant",
            "crop",
            "animal", 
            "person", 
            "vehicle",
            "hand"
        ]
        
    def _load_model(self):
        if self.model is None:
            logger.info(f"Loading YOLO-World model: {self.model_path}...")
            self.model = YOLOWorld(self.model_path)
            self.model.set_classes(self.classes)
            logger.info("YOLO-World model loaded with custom classes.")

    def analyze_and_crop(self, image_bytes: bytes) -> Tuple[Dict[str, Any], Optional[bytes]]:
        """
        Analyzes the scene using YOLO-World.
        Returns:
            - intelligence_scores: Dict with leaf_detected, coverage, noise, etc.
            - cropped_image_bytes: The ROI of the leaf (or None if no leaf).
            - Raises ValueError if no leaf is detected at all.
        """
        self._load_model()
        
        # Convert bytes to cv2 image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Invalid image file format.")
            
        img_h, img_w = img.shape[:2]
        total_area = img_h * img_w
        
        # Run inference with a lower confidence threshold for zero-shot text prompts
        # Lowered to 0.05 to detect dense fields of crops that don't have distinct boundaries
        results = self.model(img, conf=0.05, verbose=False)[0]
        
        detected_objects = []
        leaves = []
        noise_level = "low"
        
        valid_plant_classes = ["rice leaf", "plant leaf", "leaf", "plant", "crop"]
        
        # Parse results
        for box in results.boxes:
            class_id = int(box.cls[0].item())
            class_name = self.classes[class_id]
            conf = float(box.conf[0].item())
            
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            area = (x2 - x1) * (y2 - y1)
            coverage_pct = (area / total_area) * 100
            
            obj_data = {
                "class": class_name,
                "confidence": conf,
                "coverage_pct": coverage_pct,
                "box": (x1, y1, x2, y2)
            }
            detected_objects.append(obj_data)
            
            if class_name in valid_plant_classes:
                leaves.append(obj_data)
            else:
                noise_level = "high" if coverage_pct > 20 else "moderate"

        # Logic Matrix
        if not leaves:
            # Check if it's explicitly an animal or person
            if any(obj["class"] in ["animal", "person", "vehicle"] for obj in detected_objects):
                detected_names = [obj["class"] for obj in detected_objects]
                raise ValueError(f"No plant detected. We found: {', '.join(detected_names)}. Please upload a clear image of a crop.")
            else:
                raise ValueError("No plant leaf detected in the image. Please upload a clear image of a crop.")

        # Find the dominant leaf (largest area)
        dominant_leaf = max(leaves, key=lambda x: x["coverage_pct"])
        leaf_coverage = dominant_leaf["coverage_pct"]
        is_rice_leaf = dominant_leaf["class"] == "rice leaf"
        
        recommendation = "Proceed"
        if leaf_coverage < 10:
            recommendation = "Warning: Leaf is very small. Moving closer may improve diagnostic accuracy."
        elif not is_rice_leaf:
            recommendation = "Warning: Plant detected, but it does not appear to be a rice leaf."

        intelligence_scores = {
            "leaf_detected": True,
            "is_rice_leaf": is_rice_leaf,
            "leaf_coverage_pct": round(leaf_coverage, 1),
            "background_noise": noise_level,
            "recommendation": recommendation,
            "detected_objects": [obj["class"] for obj in detected_objects]
        }
        
        # Crop ROI
        x1, y1, x2, y2 = dominant_leaf["box"]
        
        # Add 5% margin to the crop
        margin_x = int((x2 - x1) * 0.05)
        margin_y = int((y2 - y1) * 0.05)
        
        crop_x1 = max(0, x1 - margin_x)
        crop_y1 = max(0, y1 - margin_y)
        crop_x2 = min(img_w, x2 + margin_x)
        crop_y2 = min(img_h, y2 + margin_y)
        
        cropped_img = img[crop_y1:crop_y2, crop_x1:crop_x2]
        
        # Convert back to bytes
        is_success, buffer = cv2.imencode(".jpg", cropped_img)
        if not is_success:
            cropped_bytes = image_bytes  # Fallback to original
        else:
            cropped_bytes = buffer.tobytes()

        return intelligence_scores, cropped_bytes

# Singleton instance
yolo_validator = YoloValidator()
