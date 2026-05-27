"""
Storage utility — local disk upload with S3/R2-ready interface.
Handles file saves for profile photos, documents, parcel images, etc.
"""
import os
import uuid
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import UploadFile, HTTPException, status

from common.config import settings

# Max sizes per category
MAX_FILE_SIZES = {
    "profile": 5 * 1024 * 1024,        # 5 MB
    "document": 10 * 1024 * 1024,       # 10 MB
    "vehicle": 10 * 1024 * 1024,        # 10 MB
    "parcel": 5 * 1024 * 1024,          # 5 MB
    "hotel": 8 * 1024 * 1024,           # 8 MB
    "banner": 5 * 1024 * 1024,          # 5 MB
}

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_DOCUMENT_TYPES = {
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
}


def _get_upload_path(category: str) -> str:
    """Get the upload directory path for a category."""
    base = settings.LOCAL_UPLOAD_DIR
    return os.path.join(base, category)


def _generate_filename(original_filename: str) -> str:
    """Generate a unique filename preserving extension."""
    ext = Path(original_filename).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


def get_file_url(relative_path: str) -> str:
    """Convert a stored relative path to a public URL."""
    if not relative_path:
        return ""
    return f"{settings.LOCAL_UPLOAD_URL}/{relative_path}"


async def save_upload(
    file: UploadFile,
    category: str,
    allowed_types: Optional[set] = None,
    max_size: Optional[int] = None,
) -> str:
    """
    Save an uploaded file to local disk.
    Returns relative path (e.g. 'profiles/abc123.jpg').

    In production: swap this function body to upload to S3/R2.
    """
    if allowed_types is None:
        allowed_types = ALLOWED_IMAGE_TYPES

    if max_size is None:
        max_size = MAX_FILE_SIZES.get(category, 5 * 1024 * 1024)

    # Validate MIME type
    content_type = file.content_type or ""
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{content_type}'. Allowed: {', '.join(allowed_types)}",
        )

    # Read file content
    content = await file.read()

    # Validate size
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {max_size // (1024 * 1024)} MB",
        )

    # Create directory
    upload_dir = _get_upload_path(category)
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    filename = _generate_filename(file.filename or "upload.jpg")
    file_path = os.path.join(upload_dir, filename)

    # Write to disk
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Return relative path
    return f"{category}/{filename}"


async def delete_upload(relative_path: str) -> None:
    """Delete a stored file. Silently ignores if file doesn't exist."""
    if not relative_path:
        return
    full_path = os.path.join(settings.LOCAL_UPLOAD_DIR, relative_path)
    try:
        os.remove(full_path)
    except FileNotFoundError:
        pass
