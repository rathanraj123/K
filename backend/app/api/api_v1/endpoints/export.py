from typing import Any
import csv
from io import StringIO
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import require_scientist, require_admin
from app.db.session import get_db
from app.models.user import User
from app.models.agriculture import DiseaseDetection

router = APIRouter()

@router.get("/disease-data/csv")
async def export_disease_data_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_scientist)
) -> Any:
    """
    Export raw disease detection aggregations directly to a CSV stream.
    Restricted strictly to the SCIENTIST and ADMIN roles.
    """
    
    query = select(DiseaseDetection).limit(1000) # Safeguard limit for streaming
    result = await db.execute(query)
    detections = result.scalars().all()
    
    def iter_csv():
        output = StringIO()
        writer = csv.writer(output)
        # Header
        writer.writerow(["ID", "User ID", "Detected Disease", "Confidence", "Severity", "Created At"])
        output.seek(0)
        yield output.read()
        output.seek(0)
        output.truncate(0)
        
        for d in detections:
            writer.writerow([d.id, d.user_id, d.detected_disease, d.confidence, d.severity, d.created_at.isoformat()])
            output.seek(0)
            yield output.read()
            output.seek(0)
            output.truncate(0)

    response = StreamingResponse(iter_csv(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=agricosmo_disease_export.csv"
    return response
