import boto3
import uuid
from loguru import logger
from typing import Optional
from botocore.exceptions import ClientError
from app.core.config import settings

class AWSS3StorageService:
    def __init__(self):
        self.bucket_name = getattr(settings, "S3_BUCKET_NAME", "agricosmo-bucket")
        self.region_name = getattr(settings, "AWS_REGION", "us-east-1")
        try:
            self.s3_client = boto3.client(
                's3',
                region_name=self.region_name,
                aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
                aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
            )
        except Exception as e:
            logger.error(f"Failed to initialize AWS S3 client: {e}")
            self.s3_client = None

    def generate_presigned_url(self, filename: str, content_type: str, user_id: str = "anonymous", expires_in: int = 3600) -> dict:
        """
        Generates a presigned URL for PUT uploads.
        Returns {upload_url, file_id, public_url, file_key}.
        """
        if not self.s3_client:
            logger.warning("S3 client not initialized. Cannot generate presigned URL.")
            raise Exception("S3 client not initialized.")
            
        file_ext = filename.split('.')[-1] if '.' in filename else 'bin'
        file_id = str(uuid.uuid4())
        file_key = f"uploads/{user_id}/{file_id}.{file_ext}"

        try:
            upload_url = self.s3_client.generate_presigned_url(
                ClientMethod='put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': file_key,
                    'ContentType': content_type
                },
                ExpiresIn=expires_in
            )
            public_url = f"https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{file_key}"
            return {
                "upload_url": upload_url,
                "file_id": file_id,
                "public_url": public_url,
                "file_key": file_key
            }
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise Exception(f"S3 Presigned URL error: {e}")

    async def delete_file(self, file_key: str) -> bool:
        if not self.s3_client:
            return False
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
            return True
        except ClientError as e:
            logger.error(f"Failed to delete file {file_key}: {e}")
            return False

s3_storage_service = AWSS3StorageService()
