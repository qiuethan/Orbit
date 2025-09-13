import os
import hashlib
import uuid
from fastapi import FastAPI, HTTPException
from PIL import Image
import cv2
import numpy as np

app = FastAPI(title="Image Converter")

# Get the backend directory
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BACKEND_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

@app.post("/convert-image")
async def convert_image():
    """
    Convert image.png or image.jpg from backend directory to a hashed image.jpg in cache.
    Returns the hash and file path of the converted image.
    """
    # Look for image files in the backend directory
    image_files = []
    for filename in ["image.png", "image.jpg", "image.jpeg"]:
        file_path = os.path.join(BACKEND_DIR, filename)
        if os.path.exists(file_path):
            image_files.append(file_path)
    
    if not image_files:
        raise HTTPException(
            status_code=404, 
            detail="No image.png or image.jpg found in backend directory"
        )
    
    # Use the first found image file
    source_path = image_files[0]
    
    try:
        # Generate a hash for the filename
        image_hash = hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()
        output_filename = f"{image_hash}.jpg"
        output_path = os.path.join(CACHE_DIR, output_filename)
        
        # Load and convert the image
        with Image.open(source_path) as img:
            # Convert to RGB if necessary (handles PNG with transparency)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create a white background for transparent images
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Save as JPEG
            img.save(output_path, 'JPEG', quality=95)
        
        return {
            "status": "success",
            "message": f"Converted {os.path.basename(source_path)} to {output_filename}",
            "source_file": os.path.basename(source_path),
            "output_file": output_filename,
            "hash": image_hash,
            "output_path": output_path,
            "file_size": os.path.getsize(output_path)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to convert image: {str(e)}"
        )

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
