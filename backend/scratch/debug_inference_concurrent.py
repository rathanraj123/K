import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import app.models.user
import app.models.agriculture
import app.models.analytics
import app.models.enterprise

from app.workers.tasks import run_detection_async
import io
from PIL import Image

async def debug_concurrent():
    img1 = Image.new('RGB', (10, 10), color = 'green')
    b1 = io.BytesIO()
    img1.save(b1, format='JPEG')
    image_bytes1 = b1.getvalue()
    
    img2 = Image.new('RGB', (10, 10), color = 'yellow')
    b2 = io.BytesIO()
    img2.save(b2, format='JPEG')
    image_bytes2 = b2.getvalue()
    
    import uuid
    id1 = str(uuid.uuid4())
    id2 = str(uuid.uuid4())
    
    print(f"Starting task 1 ({id1}) and task 2 ({id2}) concurrently...")
    
    t1 = asyncio.create_task(run_detection_async(
        detection_id=id1,
        image_bytes=image_bytes1,
        lat=None, lon=None,
        crop_type="Rice", user_role="farmer", language="English"
    ))
    
    t2 = asyncio.create_task(run_detection_async(
        detection_id=id2,
        image_bytes=image_bytes2,
        lat=None, lon=None,
        crop_type="Rice", user_role="farmer", language="English"
    ))
    
    await asyncio.gather(t1, t2)
    print("Both tasks completed.")

if __name__ == "__main__":
    asyncio.run(debug_concurrent())
