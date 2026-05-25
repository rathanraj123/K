import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.modules.detection.yolo_validator import YoloValidator
import io
from PIL import Image

def test_yolo_sequential():
    # We don't have a real leaf image, but we can see if it throws an error or just doesn't find a leaf.
    # If it throws an error on BOTH, then it's consistent.
    # If it only throws an error on the second, it's stateful.
    
    img = Image.new('RGB', (224, 224), color = 'green')
    b = io.BytesIO()
    img.save(b, format='JPEG')
    image_bytes = b.getvalue()
    
    validator = YoloValidator()
    
    try:
        print("Run 1...")
        validator.analyze_and_crop(image_bytes)
    except Exception as e:
        print(f"Run 1 exception: {e}")
        
    try:
        print("Run 2...")
        validator.analyze_and_crop(image_bytes)
    except Exception as e:
        print(f"Run 2 exception: {e}")

if __name__ == "__main__":
    test_yolo_sequential()
