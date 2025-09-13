"""
Face Search Module

This module provides clean face recognition search functionality using FaceCheck.id API.
"""

import time
import requests
import urllib.request
import os
import base64
from typing import Optional, List, Dict, Union, Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class FaceSearchModule:
    """
    A clean module for face recognition searches using FaceCheck.id API.
    """
    
    def __init__(self, api_token: Optional[str] = None, testing_mode: bool = True):
        """
        Initialize the Face Search Module.
        
        Args:
            api_token (str, optional): FaceCheck.id API token. If None, loads from env.
            testing_mode (bool): If True, uses demo mode (no credits deducted)
        """
        self.api_token = api_token or os.getenv('FACECHECK_API_TOKEN')
        if not self.api_token:
            raise ValueError("FaceCheck API token is required. Set FACECHECK_API_TOKEN environment variable or pass api_token parameter.")
        
        self.testing_mode = testing_mode
        self.base_url = 'https://facecheck.id'
        self.headers = {
            'accept': 'application/json',
            'Authorization': self.api_token
        }
    
    def search(self, image_input: Union[str, bytes], input_type: str = 'auto', 
               min_score: int = 85, max_results: int = 5) -> Tuple[Optional[str], Optional[List[Dict]]]:
        """
        Search for faces in an image.
        
        Args:
            image_input: Image file path, URL, base64 string, or bytes
            input_type: Type of input ('file', 'url', 'base64', 'bytes', 'auto')
            min_score: Minimum match score (0-100)
            max_results: Maximum number of results to return
            
        Returns:
            Tuple of (error_message, filtered_results)
        """
        # Validate inputs
        if not image_input:
            return "No image input provided", None
        
        if min_score < 0 or min_score > 100:
            return "Min score must be between 0 and 100", None
        
        if max_results <= 0:
            return "Max results must be greater than 0", None
        
        if self.testing_mode:
            print('****** TESTING MODE: Results may be inaccurate, but no credits will be deducted ******')
        
        try:
            # Determine input type if auto
            if input_type == 'auto':
                input_type = self._detect_input_type(image_input)
            
            # Prepare the image
            image_file_path = self._prepare_image(image_input, input_type)
            if not image_file_path:
                return "Failed to prepare image for upload", None
            
            try:
                # Upload and search
                error, results = self._perform_search(image_file_path)
                if error:
                    return error, None
                
                # Handle empty or None results
                if not results:
                    return None, []  # Return empty list instead of None
                
                # Validate results structure
                if not isinstance(results, list):
                    return "Invalid results format received from API", None
                
                # Filter results by score and limit
                filtered_results = []
                for result in results[:max_results]:
                    if not isinstance(result, dict):
                        continue  # Skip invalid result items
                    
                    score = result.get('score', 0)
                    if isinstance(score, (int, float)) and score >= min_score:
                        filtered_results.append(result)
                
                return None, filtered_results
                    
            finally:
                # Clean up temporary files
                if input_type in ['url', 'base64', 'bytes'] and image_file_path and os.path.exists(image_file_path):
                    try:
                        os.remove(image_file_path)
                    except Exception as e:
                        print(f"Warning: Could not remove temporary file {image_file_path}: {e}")
                        
        except Exception as e:
            return f"Unexpected error during face search: {str(e)}", None
    
    def _detect_input_type(self, image_input: Union[str, bytes]) -> str:
        """Detect the type of image input."""
        if isinstance(image_input, bytes):
            return 'bytes'
        elif isinstance(image_input, str):
            if image_input.startswith(('http://', 'https://')):
                return 'url'
            elif image_input.startswith('data:image/') or len(image_input) > 100:
                return 'base64'
            else:
                return 'file'
        else:
            raise ValueError("Unsupported image input type")
    
    def _prepare_image(self, image_input: Union[str, bytes], input_type: str) -> Optional[str]:
        """Prepare image for upload based on input type."""
        try:
            if input_type == 'file':
                if not os.path.exists(image_input):
                    print(f"Error: File {image_input} does not exist")
                    return None
                return image_input
            
            elif input_type == 'url':
                temp_filename = 'temp_face_search_image.jpg'
                urllib.request.urlretrieve(image_input, temp_filename)
                return temp_filename
            
            elif input_type == 'base64':
                temp_filename = 'temp_face_search_image.jpg'
                if image_input.startswith('data:image/'):
                    image_input = image_input.split(',')[1]
                
                with open(temp_filename, 'wb') as f:
                    f.write(base64.b64decode(image_input))
                return temp_filename
            
            elif input_type == 'bytes':
                temp_filename = 'temp_face_search_image.jpg'
                with open(temp_filename, 'wb') as f:
                    f.write(image_input)
                return temp_filename
            
            return None
                
        except Exception as e:
            print(f"Error preparing image: {str(e)}")
            return None
    
    def _perform_search(self, image_file_path: str) -> Tuple[Optional[str], Optional[List[Dict]]]:
        """Perform the actual face search."""
        try:
            # Upload image
            with open(image_file_path, 'rb') as f:
                files = {'images': f, 'id_search': None}
                response = requests.post(
                    f"{self.base_url}/api/upload_pic",
                    headers=self.headers,
                    files=files
                ).json()
            
            if response.get('error'):
                return f"{response['error']} ({response.get('code', 'unknown')})", None
            
            id_search = response.get('id_search')
            if not id_search:
                return "No search ID received from upload", None
            
            print(f"{response.get('message', 'Image uploaded')} id_search={id_search}")
            
            # Poll for results
            json_data = {
                'id_search': id_search,
                'with_progress': True,
                'status_only': False,
                'demo': self.testing_mode
            }
            
            while True:
                response = requests.post(
                    f"{self.base_url}/api/search",
                    headers=self.headers,
                    json=json_data
                ).json()
                
                if response.get('error'):
                    return f"{response['error']} ({response.get('code', 'unknown')})", None
                
                if response.get('output'):
                    return None, response['output'].get('items', [])
                
                progress = response.get('progress', 0)
                message = response.get('message', 'Searching...')
                print(f'{message} progress: {progress}%')
                time.sleep(1)
                
        except Exception as e:
            return f"Search error: {str(e)}", None
    
    def get_summary(self, results: List[Dict]) -> Dict:
        """Get a summary of search results."""
        if not results or not isinstance(results, list):
            return {"total": 0, "avg_score": 0, "top_score": 0, "urls": []}
        
        try:
            # Filter out invalid results and extract scores
            valid_results = [r for r in results if isinstance(r, dict)]
            if not valid_results:
                return {"total": 0, "avg_score": 0, "top_score": 0, "urls": []}
            
            scores = []
            urls = []
            
            for result in valid_results:
                score = result.get('score', 0)
                if isinstance(score, (int, float)):
                    scores.append(score)
                
                url = result.get('url', '')
                if isinstance(url, str):
                    urls.append(url)
            
            return {
                "total": len(valid_results),
                "avg_score": sum(scores) / len(scores) if scores else 0,
                "top_score": max(scores) if scores else 0,
                "urls": urls
            }
        except Exception as e:
            print(f"Error generating summary: {e}")
            return {"total": 0, "avg_score": 0, "top_score": 0, "urls": []}


# Simple function interface
def search_face(image_input: Union[str, bytes], api_token: Optional[str] = None, 
               testing_mode: bool = True, min_score: int = 85) -> List[Dict]:
    """
    Simple function to search for faces in an image.
    
    Args:
        image_input: Image file path, URL, base64, or bytes
        api_token: FaceCheck.id API token
        testing_mode: Use demo mode if True
        min_score: Minimum match score (0-100)
        
    Returns:
        List of face search results
    """
    module = FaceSearchModule(api_token, testing_mode)
    error, results = module.search(image_input, min_score=min_score)
    
    if error:
        print(f"Face search error: {error}")
        return []
    
    return results or []


# Example usage
if __name__ == "__main__":
    print("🔍 Testing Face Search Module")
    print("=" * 40)
    
    # Test with image file
    image_file = 'image.jpg'
    if os.path.exists(image_file):
        results = search_face(image_file, testing_mode=True)
        print(f"Found {len(results)} face matches with score >= 85")
        
        for i, result in enumerate(results, 1):
            print(f"{i}. Score: {result.get('score', 'N/A')} - {result.get('url', 'N/A')}")
    else:
        print(f"Image file '{image_file}' not found")
