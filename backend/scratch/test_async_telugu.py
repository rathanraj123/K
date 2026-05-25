import os
import sys
import asyncio
import io
from PIL import Image

# Set path context
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.workers.tasks import run_detection_async
from app.db.session import AsyncSessionLocal
from app.models.agriculture import DiseaseDetection

async def main():
    # Generate a valid green image to simulate a leaf
    img = Image.new('RGB', (300, 300), color=(34, 139, 34)) # Forest Green
    output = io.BytesIO()
    img.save(output, format='JPEG')
    image_bytes = output.getvalue()
        
    # Create a mock detection row
    async with AsyncSessionLocal() as db:
        async with db.begin():
            # Get first user
            from app.models.user import User
            from sqlalchemy import select
            res = await db.execute(select(User))
            user = res.scalars().first()
            if not user:
                print("Error: No user found in database. Create a user first.")
                return
                
            detection = DiseaseDetection(
                user_id=user.id,
                image_url="data:image/jpeg;base64,mock",
                status="processing",
                crop_type="Rice"
            )
            db.add(detection)
            await db.flush()
            detection_id = str(detection.id)
            print(f"Created detection row with ID: {detection_id}")

    print("Running run_detection_async in Telugu...")
    try:
        await run_detection_async(
            detection_id=detection_id,
            image_bytes=image_bytes,
            crop_type="Rice",
            user_role="farmer",
            language="Telugu"
        )
        print("Task finished successfully!")
        
        # Verify the saved row
        async with AsyncSessionLocal() as db:
            detection = await db.get(DiseaseDetection, detection_id)
            print(f"Saved Status: {detection.status}")
            print(f"Explanation: {detection.explanation}")
            print(f"Farmer Report keys: {list(detection.farmer_report.keys()) if detection.farmer_report else None}")
            if detection.farmer_report:
                print(f"Farmer Report details:")
                print(f"  Diagnosis: {detection.farmer_report.get('diagnosis')}")
                print(f"  Severity: {detection.farmer_report.get('severity')}")
                print(f"  Farmer Risk Score: {detection.farmer_report.get('farmer_risk_score')}")
            
    except Exception as e:
        print(f"Task failed with exception: {e}")

if __name__ == "__main__":
    asyncio.run(main())
