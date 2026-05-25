import io
import os
import uuid
from typing import Optional, Tuple
from PIL import Image
from loguru import logger
from app.core.config import settings

# Attempt to import Supabase, but provide a safe fallback if missing or not configured
try:
    from supabase import create_client, Client
except ImportError:
    Client = None

class StorageService:
    def __init__(self):
        self.supabase: Optional[Client] = None
        self.bucket_name = "agricosmo-scans"
        
        if settings.SUPABASE_URL and settings.SUPABASE_KEY and Client:
            try:
                self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("Supabase storage client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
        else:
            logger.warning("Supabase credentials not found or supabase package missing. Storage will fallback to Base64.")

    def process_and_compress_image(self, file_bytes: bytes, max_size=(1024, 1024), quality=85) -> Tuple[bytes, bytes]:
        """
        Compresses an image and also generates a smaller thumbnail.
        Returns (compressed_bytes, thumbnail_bytes)
        """
        try:
            img = Image.open(io.BytesIO(file_bytes))
            # Convert to RGB if needed
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Create main compressed variant
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            main_io = io.BytesIO()
            img.save(main_io, format="JPEG", quality=quality, optimize=True)
            main_bytes = main_io.getvalue()
            
            # Create thumbnail
            thumb = img.copy()
            thumb.thumbnail((256, 256), Image.Resampling.LANCZOS)
            thumb_io = io.BytesIO()
            thumb.save(thumb_io, format="JPEG", quality=70, optimize=True)
            thumb_bytes = thumb_io.getvalue()
            
            return main_bytes, thumb_bytes
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            return file_bytes, file_bytes # Return originals on failure

    async def upload_image(self, file_bytes: bytes, content_type: str = "image/jpeg", user_id: str = "anonymous") -> dict:
        """
        Uploads an image (and its thumbnail) to Supabase Storage.
        Returns a dict with 'url', 'thumbnail_url', and 'path'.
        If Supabase is not configured, it will return the raw bytes as a Base64 data URI fallback.
        """
        main_bytes, thumb_bytes = self.process_and_compress_image(file_bytes)
        
        if not self.supabase:
            # Fallback to Base64 if no Supabase configured
            import base64
            b64_str = base64.b64encode(main_bytes).decode('utf-8')
            data_uri = f"data:{content_type};base64,{b64_str}"
            return {
                "url": data_uri,
                "thumbnail_url": data_uri,
                "path": "local_base64",
                "storage_type": "base64"
            }
            
        try:
            file_ext = content_type.split('/')[-1]
            if file_ext == "jpeg": file_ext = "jpg"
            
            base_filename = f"{user_id}/{uuid.uuid4()}"
            main_path = f"{base_filename}.{file_ext}"
            thumb_path = f"{base_filename}_thumb.{file_ext}"
            
            # Upload Main Image
            res = self.supabase.storage.from_(self.bucket_name).upload(
                path=main_path,
                file=main_bytes,
                file_options={"content-type": content_type}
            )
            
            # Upload Thumbnail
            thumb_res = self.supabase.storage.from_(self.bucket_name).upload(
                path=thumb_path,
                file=thumb_bytes,
                file_options={"content-type": content_type}
            )
            
            # Get Public URLs (assuming bucket is public. If private, use create_signed_url)
            main_url = self.supabase.storage.from_(self.bucket_name).get_public_url(main_path)
            thumb_url = self.supabase.storage.from_(self.bucket_name).get_public_url(thumb_path)
            
            return {
                "url": main_url,
                "thumbnail_url": thumb_url,
                "path": main_path,
                "storage_type": "supabase"
            }
        except Exception as e:
            logger.error(f"Supabase upload failed: {e}")
            # Ultimate fallback if network fails
            import base64
            b64_str = base64.b64encode(main_bytes).decode('utf-8')
            data_uri = f"data:{content_type};base64,{b64_str}"
            return {
                "url": data_uri,
                "thumbnail_url": data_uri,
                "path": "fallback_base64",
                "storage_type": "base64"
            }

storage_service = StorageService()
