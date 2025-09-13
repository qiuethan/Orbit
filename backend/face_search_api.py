"""
FaceCheck.id Face Search API Module

This module provides a clean interface for searching the internet by face using the FaceCheck.id API.
"""

import time
import requests
import urllib.request
import os
import base64
from typing import Optional, List, Dict, Union, Tuple
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class FaceSearchAPI:
    """
    A class to handle face search operations using the FaceCheck.id API.
    """
    
    def __init__(self, api_token: str, testing_mode: bool = True):
        """
        Initialize the FaceSearchAPI with your API token.
        
        Args:
            api_token (str): Your FaceCheck.id API token
            testing_mode (bool): If True, uses demo mode (inaccurate results but no credits deducted)
        """
        self.api_token = api_token
        self.testing_mode = testing_mode
        self.base_url = 'https://facecheck.id'
        self.headers = {
            'accept': 'application/json',
            'Authorization': api_token
        }
    
    def search_by_image(self, image_input: Union[str, bytes], input_type: str = 'auto') -> Tuple[Optional[str], Optional[List[Dict]]]:
        """
        Search the internet by face using an image.
        
        Args:
            image_input: Can be:
                - File path to an image (str)
                - URL to an image (str)
                - Base64 encoded image (str)
                - Raw image bytes (bytes)
            input_type: Type of input ('file', 'url', 'base64', 'bytes', 'auto')
                       'auto' will attempt to detect the type automatically
        
        Returns:
            Tuple of (error_message, results_list)
            - If successful: (None, list of search results)
            - If error: (error_message, None)
        """
        if self.testing_mode:
            print('****** TESTING MODE search, results are inaccurate, and queue wait is long, but credits are NOT deducted ******')
        
        # Determine input type if auto
        if input_type == 'auto':
            input_type = self._detect_input_type(image_input)
        
        # Prepare the image file for upload
        image_file_path = self._prepare_image(image_input, input_type)
        if not image_file_path:
            return "Failed to prepare image for upload", None
        
        try:
            # Upload the image
            error, id_search = self._upload_image(image_file_path)
            if error:
                return error, None
            
            # Search for results
            error, results = self._search_results(id_search)
            return error, results
            
        finally:
            # Clean up temporary file if we created one
            if input_type in ['url', 'base64'] and os.path.exists(image_file_path):
                os.remove(image_file_path)
    
    def _detect_input_type(self, image_input: Union[str, bytes]) -> str:
        """Automatically detect the type of image input."""
        if isinstance(image_input, bytes):
            return 'bytes'
        elif isinstance(image_input, str):
            if image_input.startswith('http://') or image_input.startswith('https://'):
                return 'url'
            elif image_input.startswith('data:image/') or len(image_input) > 100:
                return 'base64'
            else:
                return 'file'
        else:
            raise ValueError("Unsupported image input type")
    
    def _prepare_image(self, image_input: Union[str, bytes], input_type: str) -> Optional[str]:
        """Prepare the image for upload based on input type."""
        try:
            if input_type == 'file':
                if not os.path.exists(image_input):
                    print(f"Error: File {image_input} does not exist")
                    return None
                return image_input
            
            elif input_type == 'url':
                # Download the image from URL
                temp_filename = 'temp_face_search_image.jpg'
                urllib.request.urlretrieve(image_input, temp_filename)
                return temp_filename
            
            elif input_type == 'base64':
                # Decode base64 and save to temporary file
                temp_filename = 'temp_face_search_image.jpg'
                if image_input.startswith('data:image/'):
                    # Remove data URL prefix
                    image_input = image_input.split(',')[1]
                
                with open(temp_filename, 'wb') as f:
                    f.write(base64.b64decode(image_input))
                return temp_filename
            
            elif input_type == 'bytes':
                # Save bytes to temporary file
                temp_filename = 'temp_face_search_image.jpg'
                with open(temp_filename, 'wb') as f:
                    f.write(image_input)
                return temp_filename
            
            else:
                print(f"Error: Unsupported input type: {input_type}")
                return None
                
        except Exception as e:
            print(f"Error preparing image: {str(e)}")
            return None
    
    def _upload_image(self, image_file_path: str) -> Tuple[Optional[str], Optional[str]]:
        """Upload image to FaceCheck.id and get search ID."""
        try:
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
            return None, id_search
            
        except Exception as e:
            return f"Upload error: {str(e)}", None
    
    def _search_results(self, id_search: str) -> Tuple[Optional[str], Optional[List[Dict]]]:
        """Poll for search results."""
        json_data = {
            'id_search': id_search,
            'with_progress': True,
            'status_only': False,
            'demo': self.testing_mode
        }
        
        try:
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


def search_face_simple(image_input: Union[str, bytes], api_token: str, testing_mode: bool = True) -> List[Dict]:
    """
    Simple function to search for a face in an image.
    
    Args:
        image_input: Image file path, URL, base64 string, or bytes
        api_token: Your FaceCheck.id API token
        testing_mode: If True, uses demo mode (no credits deducted)
    
    Returns:
        List of search results, or empty list if error occurred
    """
    api = FaceSearchAPI(api_token, testing_mode)
    error, results = api.search_by_image(image_input)
    
    if error:
        print(f"Error: {error}")
        return []
    
    return results or []


# Example usage - similar to original face_search.py
if __name__ == "__main__":
    import urllib.request
    
    TESTING_MODE = False
    
    # Load API token from environment variable
    APITOKEN = os.getenv('FACECHECK_API_TOKEN')
    
    if not APITOKEN:
        print("Error: FACECHECK_API_TOKEN not found in environment variables.")
        print("Please create a .env file with your API token:")
        print("FACECHECK_API_TOKEN=your_api_token_here")
        exit(1)

    # Download the photo of the person you want to find
    image_file = 'image.jpg' 

    # Create API instance
    api = FaceSearchAPI(APITOKEN, testing_mode=TESTING_MODE)
    
    # Search the Internet by face
    error, urls_images = api.search_by_image(image_file)

    if urls_images:
        for im in urls_images:      # Iterate search results
            score = im['score']     # 0 to 100 score how well the face is matching found image
            url = im['url']         # url to webpage where the person was found
            image_base64 = im['base64']     # thumbnail image encoded as base64 string
            print(f"{score} {url} {image_base64[:32]}...")
    else:
        print(error)
