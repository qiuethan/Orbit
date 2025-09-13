import os
import sys
import cv2
import json
import subprocess
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
            
        # Check for image2.png or image2.jpg in backend directory
        image2_png = os.path.join(backend_dir, "image2.png")
        image2_jpg = os.path.join(backend_dir, "image2.jpg")
        
        # Determine which image to use
        if target_image_path == image2_png and os.path.exists(image2_png):
            input_image = image2_png
        elif target_image_path == image2_jpg and os.path.exists(image2_jpg):
            input_image = image2_jpg
        elif os.path.exists(image2_png):
            input_image = image2_png
        elif os.path.exists(image2_jpg):
            input_image = image2_jpg
        else:
            input_image = target_image_path
            
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
                    # Found a face match but no JSON file - create a minimal result
                    logger.info(f"⚠️  Face match found but no JSON file exists for {hash_name}")
                    logger.info(f"📁 Image file exists at: cache/{hash_name}.jpg")
                    
                    # Create a simple result structure
                    result_data = {
                        "match_found": True,
                        "hash_name": hash_name,
                        "similarity": similarity,
                        "message": f"Face matched against cached image {hash_name} but no detailed JSON data available"
                    }
                    
                    # Save a simple result file
                    result_path = os.path.join(cache_dir, f"{hash_name}_match_result.json")
                    try:
                        with open(result_path, 'w') as f:
                            json.dump(result_data, f, indent=2)
                        logger.info(f"📄 Created match result file: {result_path}")
                        return result_path
                    except Exception as e:
                        logger.error(f"Error creating result file: {e}")
                        return json_path  # Return the original path even if None
            else:
                logger.info(f"❌ No match found (best similarity: {similarity:.4f}), running example_client")
                
        except Exception as e:
            logger.error(f"Error in facial recognition: {e}")
            logger.info("Falling back to example_client")
            
        # No match found, run example_client
        return run_example_client(input_image, backend_dir)
        
    except Exception as e:
        logger.error(f"Error in recognize function: {e}")
        return None


def run_example_client(image_path: str, backend_dir: str) -> Optional[str]:
    """
    Run example_client.py on the given image and return the path to the resulting JSON.
    
    Args:
        image_path: Path to the image to process
        backend_dir: Backend directory path
        
    Returns:
        str: Path to the resulting JSON file
    """
    try:
        logger.info(f"Running example_client on: {image_path}")
        
        # Path to example_client.py
        example_client_path = os.path.join(backend_dir, "example_client.py")
        
        if not os.path.exists(example_client_path):
            logger.error(f"example_client.py not found at: {example_client_path}")
            return None
            
        # Run example_client.py with the image
        try:
            # Change to backend directory and run example_client
            original_cwd = os.getcwd()
            os.chdir(backend_dir)
            
            # Run the client
            result = subprocess.run(
                [sys.executable, "example_client.py", image_path],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            os.chdir(original_cwd)
            
            if result.returncode == 0:
                logger.info("example_client.py completed successfully")
                logger.info(f"Output: {result.stdout}")
                
                # Look for the generated JSON file in client_results.json
                client_results_path = os.path.join(backend_dir, "client_results.json")
                if os.path.exists(client_results_path):
                    # Read the client results to get the request_id
                    try:
                        with open(client_results_path, 'r') as f:
                            client_data = json.load(f)
                            
                        request_id = client_data.get('request_id')
                        if request_id:
                            # The actual JSON file should be in cache
                            cache_json_path = os.path.join(backend_dir, "cache", f"{request_id}.json")
                            if os.path.exists(cache_json_path):
                                logger.info(f"Found generated JSON: {cache_json_path}")
                                return cache_json_path
                            else:
                                logger.warning(f"Cache JSON not found: {cache_json_path}")
                                return client_results_path
                        else:
                            logger.warning("No request_id found in client_results.json")
                            return client_results_path
                    except Exception as e:
                        logger.error(f"Error reading client_results.json: {e}")
                        return client_results_path
                else:
                    logger.warning("client_results.json not found after running example_client")
                    return None
            else:
                logger.error(f"example_client.py failed with return code {result.returncode}")
                logger.error(f"Error output: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error("example_client.py timed out")
            return None
        except Exception as e:
            logger.error(f"Error running example_client.py: {e}")
            return None
            
    except Exception as e:
        logger.error(f"Error in run_example_client: {e}")
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