"""
Media validation utilities for social media publishing.
Validates aspect ratios, file sizes, and formats.
"""
import requests
from typing import Dict, List, Tuple, Optional
from PIL import Image
from io import BytesIO
import logging

logger = logging.getLogger(__name__)


def get_aspect_ratio(width: int, height: int) -> float:
    """Calculate aspect ratio from width and height"""
    return width / height if height > 0 else 0


def get_image_dimensions_from_url(url: str) -> Optional[Tuple[int, int]]:
    """Download image and get its dimensions"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            return img.size  # Returns (width, height)
    except Exception as e:
        logger.error(f"Failed to get image dimensions from {url}: {str(e)}")
    return None


def aspect_ratios_match(ratio1: float, ratio2: float, tolerance: float = 0.01) -> bool:
    """Check if two aspect ratios match within tolerance"""
    return abs(ratio1 - ratio2) <= tolerance


def validate_carousel_aspect_ratios(media_items: List[Dict]) -> Dict:
    """
    Validate that all media items in a carousel have matching aspect ratios.
    Returns validation result with details.
    """
    if len(media_items) <= 1:
        return {"valid": True, "message": "Single item, no validation needed"}
    
    aspect_ratios = []
    details = []
    
    for idx, item in enumerate(media_items):
        media_url = item.get("url")
        media_type = item.get("type", "image")
        
        # For images, get actual dimensions
        if media_type == "image":
            dimensions = get_image_dimensions_from_url(media_url)
            if dimensions:
                width, height = dimensions
                ratio = get_aspect_ratio(width, height)
                aspect_ratios.append(ratio)
                details.append({
                    "index": idx,
                    "type": media_type,
                    "width": width,
                    "height": height,
                    "ratio": round(ratio, 3)
                })
            else:
                # Couldn't get dimensions, assume it might work
                logger.warning(f"Could not validate dimensions for image {idx}")
                details.append({
                    "index": idx,
                    "type": media_type,
                    "error": "Could not fetch dimensions"
                })
        else:
            # For videos, we can't easily get dimensions from URL without downloading
            # Cloudinary URLs might have transformation params we could parse
            # For now, note that validation is limited
            details.append({
                "index": idx,
                "type": media_type,
                "note": "Video aspect ratio not validated (requires download)"
            })
    
    # Check if we have at least 2 measurable ratios
    if len(aspect_ratios) < 2:
        return {
            "valid": True,  # Can't validate without dimensions
            "message": "Unable to validate all aspect ratios (videos require download)",
            "warning": "Instagram may reject carousel if aspect ratios don't match",
            "details": details
        }
    
    # Check if all ratios match
    base_ratio = aspect_ratios[0]
    mismatches = []
    
    for i, ratio in enumerate(aspect_ratios[1:], 1):
        if not aspect_ratios_match(base_ratio, ratio, tolerance=0.02):
            mismatches.append({
                "item_index": i,
                "expected": round(base_ratio, 3),
                "actual": round(ratio, 3),
                "difference": round(abs(base_ratio - ratio), 3)
            })
    
    if mismatches:
        return {
            "valid": False,
            "message": f"Aspect ratio mismatch detected! Instagram requires all carousel items to have the same aspect ratio.",
            "base_ratio": round(base_ratio, 3),
            "mismatches": mismatches,
            "details": details,
            "recommendation": "Crop or resize your media to match aspect ratios before posting."
        }
    
    return {
        "valid": True,
        "message": "All aspect ratios match",
        "ratio": round(base_ratio, 3),
        "details": details
    }


def format_aspect_ratio_error(validation_result: Dict) -> str:
    """Format aspect ratio validation error for user display"""
    if validation_result.get("valid"):
        return ""
    
    message = validation_result.get("message", "Aspect ratio mismatch")
    base = validation_result.get("base_ratio")
    details = validation_result.get("details", [])
    
    error_text = f"{message}\n\n"
    error_text += f"Base aspect ratio: {base}:1\n"
    error_text += "Media details:\n"
    
    for detail in details:
        idx = detail.get("index")
        media_type = detail.get("type")
        ratio = detail.get("ratio")
        width = detail.get("width")
        height = detail.get("height")
        
        if ratio:
            error_text += f"  Item {idx + 1} ({media_type}): {width}x{height} = {ratio}:1\n"
    
    error_text += f"\n{validation_result.get('recommendation', '')}"
    
    return error_text
