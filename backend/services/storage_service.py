import base64
import uuid
from firebase_config import get_storage_bucket
from typing import Optional
import mimetypes

class StorageService:
    """Service for handling file uploads to Firebase Storage"""

    def __init__(self):
        self.bucket = get_storage_bucket()

    def upload_base64_image(
        self,
        base64_data: str,
        folder: str = "generated_images",
        filename: Optional[str] = None
    ) -> str:
        """
        Upload a base64 encoded image to Firebase Storage

        Args:
            base64_data: Base64 data URL (e.g., "data:image/png;base64,iVBORw0...")
            folder: Folder path in storage bucket
            filename: Optional filename (will generate UUID if not provided)

        Returns:
            Public URL of the uploaded image
        """
        try:
            # Parse the base64 data URL
            # Format: "data:image/png;base64,{base64_string}"
            if base64_data.startswith('data:'):
                # Extract mime type and base64 string
                header, encoded = base64_data.split(',', 1)
                mime_type = header.split(':')[1].split(';')[0]
            else:
                # If no data URL prefix, assume it's pure base64
                encoded = base64_data
                mime_type = 'image/png'

            # Decode base64 to bytes
            image_bytes = base64.b64decode(encoded)

            # Generate filename if not provided
            if not filename:
                # Get file extension from mime type
                extension = mimetypes.guess_extension(mime_type) or '.png'
                filename = f"{uuid.uuid4()}{extension}"

            # Create blob path
            blob_path = f"{folder}/{filename}"
            blob = self.bucket.blob(blob_path)

            # Upload the image
            blob.upload_from_string(
                image_bytes,
                content_type=mime_type
            )

            # Make the blob publicly accessible
            blob.make_public()

            # Get the public URL
            public_url = blob.public_url

            print(f"✅ Image uploaded to Firebase Storage: {blob_path}")
            print(f"   Public URL: {public_url}")

            return public_url

        except Exception as e:
            print(f"❌ Error uploading image to Firebase Storage: {e}")
            raise Exception(f"Failed to upload image: {str(e)}")

    def delete_image(self, file_path: str) -> bool:
        """
        Delete an image from Firebase Storage

        Args:
            file_path: Path to the file in storage bucket

        Returns:
            True if deletion was successful
        """
        try:
            blob = self.bucket.blob(file_path)
            blob.delete()
            print(f"✅ Image deleted from Firebase Storage: {file_path}")
            return True
        except Exception as e:
            print(f"❌ Error deleting image: {e}")
            return False


# Create a singleton instance
storage_service = StorageService()
