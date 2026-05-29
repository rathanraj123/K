from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Any
import os
import aiofiles
from pydantic import BaseModel
from typing import Any
from app.api import deps
from app.models.user import User
from app.services.aws_s3_storage import s3_storage_service

router = APIRouter()

class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str

class PresignedUrlResponse(BaseModel):
    upload_url: str
    file_id: str
    public_url: str
    file_key: str

@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def generate_presigned_url(
    request: PresignedUrlRequest,
    current_user: User = Depends(deps.get_current_active_user),
    req: Request = None
) -> Any:
    """
    Generates a presigned URL for uploading a file directly to S3 from the client.
    """
    try:
        from botocore.exceptions import NoCredentialsError
        try:
            result = s3_storage_service.generate_presigned_url(
                filename=request.filename,
                content_type=request.content_type,
                user_id=str(current_user.id)
            )
            return result
        except NoCredentialsError:
            # Local fallback for development if AWS credentials are not set
            file_ext = request.filename.split('.')[-1] if '.' in request.filename else 'bin'
            import uuid
            file_id = str(uuid.uuid4())
            file_key = f"uploads/{current_user.id}/{file_id}.{file_ext}"
            
            base_url = str(req.base_url).rstrip("/")
            upload_url = f"{base_url}/api/v1/storage/local-upload/{file_key}"
            
            return {
                "upload_url": upload_url,
                "file_id": file_id,
                "public_url": upload_url, # For local viewing, same as upload URL (we'll implement GET on it)
                "file_key": file_key
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/local-upload/{file_key:path}")
async def local_upload(file_key: str, request: Request):
    """Fallback endpoint to accept PUT requests when running locally without S3."""
    upload_dir = os.path.join(os.getcwd(), "static", "uploads")
    os.makedirs(os.path.dirname(os.path.join(upload_dir, file_key.split('/')[-1])), exist_ok=True)
    
    file_path = os.path.join(upload_dir, file_key.split('/')[-1])
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await request.body()
        await out_file.write(content)
        
    return {"status": "success"}

@router.get("/local-upload/{file_key:path}")
async def get_local_upload(file_key: str):
    from fastapi.responses import FileResponse
    upload_dir = os.path.join(os.getcwd(), "static", "uploads")
    file_path = os.path.join(upload_dir, file_key.split('/')[-1])
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found locally")
