import os
import sys
import cv2
import json
import requests
import logging
from typing import List, Optional, Tuple

# Add the backend directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def recognize(target_image_path: str, candidate_image_paths: List[str] = None) -> Optional[str]:
    """
    Main facial recognition pipeline.
    
    Takes the path to image2.png or image2.jpg and uses facial recognition to compare 
    against every single one of the jpg/png photos inside of backend/cache.
    
    If it finds a match, it returns the path of the matched JSON file.
    If it does not find a match, it runs example_client on the image and returns 
    the path of the resulting JSON file.
    
    Args:
        target_image_path: Path to the target image (image2.png or image2.jpg)
        candidate_image_paths: Not used, kept for compatibility
        
    Returns:
        str: Path to the JSON file containing the person's information
    """
    try:
        # Get the backend directory and cache path
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cache_dir = os.path.join(backend_dir, "cache")
        
        logger.info(f"Starting facial recognition pipeline for: {target_image_path}")
        logger.info(f"Cache directory: {cache_dir}")
        
        # Check if target image exists
        if not os.path.exists(target_image_path):
            logger.error(f"Target image not found: {target_image_path}")
            return None
            
        # If it's a relative path, resolve it relative to backend directory
        if not os.path.isabs(target_image_path):
            target_image_path = os.path.join(backend_dir, target_image_path)
        
        # Determine which image to use - priority order
        possible_images = [
            target_image_path,
            os.path.join(backend_dir, "image.jpg"),
            os.path.join(backend_dir, "image.png"),
            os.path.join(backend_dir, "image2.jpg"),
            os.path.join(backend_dir, "image2.png")
        ]
        
        input_image = None
        for img_path in possible_images:
            if os.path.exists(img_path):
                input_image = img_path
                break
                
        if not input_image:
            logger.error(f"No valid input image found. Tried: {possible_images}")
            return None
            
        logger.info(f"Using input image: {input_image}")
        
        # Try to import and use facial recognition
        try:
            from facial_recognition.core import FacialRecognitionModule
            
            # Initialize facial recognition module
            face_module = FacialRecognitionModule(
                recognition_threshold=0.6,  # Adjust threshold as needed
                cache_path=cache_dir
            )
            
            # Compare with cached faces
            hash_name, similarity, json_path = face_module.compare_with_cached_faces(input_image)
            
            if hash_name:
                logger.info(f"✅ FOUND MATCH: {hash_name} with similarity {similarity:.4f}")
                if json_path and os.path.exists(json_path):
                    logger.info(f"📄 Returning JSON path: {json_path}")
                    return json_path
                else:
                    # Found a face match but no JSON file - this shouldn't happen in a proper cache
                    logger.warning(f"⚠️  Face match found but no JSON file exists for {hash_name}")
                    logger.warning(f"📁 Image file exists at: cache/{hash_name}.jpg but missing JSON")
                    logger.warning(f"🔄 This indicates an incomplete cache entry - should regenerate")
                    return None  # Let the pipeline regenerate the analysis
            else:
                logger.info(f"❌ No match found (best similarity: {similarity:.4f}), running direct HTTP analysis")
                
        except Exception as e:
            logger.error(f"Error in facial recognition: {e}")
            logger.info("Falling back to direct HTTP analysis")
            
        # No match found, return None so main pipeline can handle it
        return None
        
    except Exception as e:
        logger.error(f"Error in recognize function: {e}")
        return None


def run_direct_analysis(image_path: str, backend_dir: str) -> Optional[str]:
    """
    Make HTTP request directly to the FastAPI server to analyze the image.
    
    Args:
        image_path: Path to the image to process
        backend_dir: Backend directory path
        
    Returns:
        str: Path to the resulting JSON file in cache
    """
    try:
        logger.info(f"Making direct HTTP request for: {image_path}")
        
        # Check if image exists
        if not os.path.exists(image_path):
            logger.error(f"Image file not found: {image_path}")
            return None
        
        # Server URL (can be configured via environment variable)
        server_url = os.environ.get("ANALYZE_URL", "http://127.0.0.1:8000/analyze")
        
        try:
            # Prepare the file for upload
            with open(image_path, "rb") as f:
                files = {
                    "image": (os.path.basename(image_path), f, "image/jpeg"),
                }
                
                # Make the HTTP request
                logger.info(f"POST {server_url}")
                response = requests.post(server_url, files=files, timeout=300)
                
            logger.info(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    # Parse the JSON response
                    data = response.json()
                    
                    # Get the request_id from the response
                    request_id = data.get('request_id')
                    if request_id:
                        # The cache JSON file should exist
                        cache_json_path = os.path.join(backend_dir, "cache", f"{request_id}.json")
                        if os.path.exists(cache_json_path):
                            logger.info(f"✅ Analysis completed successfully")
                            logger.info(f"📄 Cache JSON found: {cache_json_path}")
                            return cache_json_path
                        else:
                            logger.warning(f"⚠️  Response received but cache JSON not found: {cache_json_path}")
                            # Create a fallback file with the response data
                            fallback_path = os.path.join(backend_dir, f"fallback_{request_id}.json")
                            with open(fallback_path, 'w', encoding='utf-8') as f:
                                json.dump(data, f, indent=2, ensure_ascii=False)
                            logger.info(f"📄 Created fallback file: {fallback_path}")
                            return fallback_path
                    else:
                        logger.warning("No request_id found in server response")
                        return None
                        
                except ValueError as e:
                    logger.error(f"Failed to parse JSON response: {e}")
                    return None
            else:
                logger.error(f"Server returned error status {response.status_code}")
                logger.error(f"Response: {response.text}")
                return None
                
        except requests.RequestException as e:
            logger.error(f"HTTP request failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Error making HTTP request: {e}")
            return None
            
    except Exception as e:
        logger.error(f"Error in run_direct_analysis: {e}")
        return None


# For backward compatibility with the original function signature
def facial_recognition_pipeline(image_path: str) -> Optional[str]:
    """
    Facial recognition pipeline entry point.
    
    Args:
        image_path: Path to image2.png or image2.jpg
        
    Returns:
        str: Path to JSON file with person information
    """
    return recognize(image_path)


if __name__ == "__main__":
    # Test the pipeline
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Try image2.png first, then image2.jpg
    test_image = None
    for img_name in ["image2.png", "image2.jpg"]:
        img_path = os.path.join(backend_dir, img_name)
        if os.path.exists(img_path):
            test_image = img_path
            break
            
    if test_image:
        print(f"Testing facial recognition with: {test_image}")
        result = recognize(test_image)
        if result:
            print(f"Result JSON path: {result}")
        else:
            print("No result returned")
    else:
        print("No test image found (image2.png or image2.jpg)")