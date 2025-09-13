"""
Main analysis pipeline that integrates facial recognition and LLM/SERP analysis.
This runs automatically when the server starts and processes image.jpg or image.png.
"""

import os
import sys
import json
import logging
from typing import Optional, Dict, Any
from pathlib import Path

# Add backend to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MainAnalysisPipeline:
    """
    Main pipeline that handles the complete analysis workflow:
    1. Check for image.jpg/image.png
    2. Run facial recognition against cache
    3. If match found: return matching JSON
    4. If no match: generate new analysis with SERP + LLM
    """
    
    def __init__(self, backend_dir: str = None):
        """Initialize the pipeline."""
        if backend_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        self.backend_dir = backend_dir
        self.cache_dir = os.path.join(backend_dir, "cache")
        
        # Ensure directories exist
        os.makedirs(self.cache_dir, exist_ok=True)
        
        logger.info(f"Initialized MainAnalysisPipeline")
        logger.info(f"Backend dir: {self.backend_dir}")
        logger.info(f"Cache dir: {self.cache_dir}")
    
    def find_input_image(self) -> Optional[str]:
        """
        Find image.jpg or image.png in the backend directory.
        
        Returns:
            str: Path to the found image, or None if not found
        """
        # Priority order: image.jpg, image.png, then other variants
        possible_names = [
            "image.jpg",
            "image.png", 
            "image.jpeg",
            "image2.jpg",
            "image2.png"
        ]
        
        for image_name in possible_names:
            image_path = os.path.join(self.backend_dir, image_name)
            if os.path.exists(image_path):
                logger.info(f"✅ Found input image: {image_name}")
                return image_path
                
        logger.warning("❌ No input image found (looking for image.jpg, image.png, etc.)")
        return None
    
    def run_facial_recognition(self, image_path: str) -> Optional[str]:
        """
        Run facial recognition on the input image.
        
        Args:
            image_path: Path to the image to analyze
            
        Returns:
            str: Path to matching JSON file, or None if no match
        """
        try:
            from facial_recognition.local_face_recognition import recognize
            
            logger.info("🔍 Running facial recognition...")
            result = recognize(image_path)
            
            if result:
                logger.info(f"✅ Facial recognition found match: {result}")
                return result
            else:
                logger.info("❌ No facial recognition match found")
                return None
                
        except Exception as e:
            logger.error(f"Error in facial recognition: {e}")
            return None
    
    def run_complete_analysis(self, image_path: str) -> Optional[str]:
        """
        Run the complete SERP + LLM analysis pipeline and save to cache.
        
        Args:
            image_path: Path to the image to analyze
            
        Returns:
            str: Path to the generated cache JSON file
        """
        try:
            import hashlib
            import shutil
            from pipeline import complete_face_analysis
            from output_schema import OutputSchemaManager
            
            logger.info("🚀 Running complete analysis pipeline (SERP + LLM)...")
            
            # Generate hash for the image
            with open(image_path, 'rb') as f:
                image_data = f.read()
            hash_name = hashlib.md5(image_data).hexdigest()
            
            # Copy image to cache with hash name
            cache_image_path = os.path.join(self.cache_dir, f"{hash_name}.jpg")
            shutil.copy2(image_path, cache_image_path)
            logger.info(f"📁 Saved image to cache: {cache_image_path}")
            
            # Run the complete analysis
            results = complete_face_analysis(
                image_path,
                use_structured_output=True
            )
            
            # Extract only the clean LLM analysis data
            clean_data = {}
            
            # Get the LLM analysis
            llm_analysis = results.get("llm_analysis", {})
            if llm_analysis:
                # Ensure structured data is JSON-serializable
                try:
                    structured_data = llm_analysis.get("structured_data")
                    if structured_data is not None:
                        if not isinstance(structured_data, dict):
                            # Convert dataclass PersonAnalysis -> dict
                            structured_data = OutputSchemaManager.to_dict(structured_data)
                        
                        # Extract just the clean analysis data
                        clean_data = {
                            "llm_analysis": {
                                "structured_data": structured_data,
                                "raw_response": llm_analysis.get("raw_response"),
                                "provider": llm_analysis.get("provider"),
                                "model": llm_analysis.get("model"),
                                "format": llm_analysis.get("format"),
                                "custom_instructions": llm_analysis.get("custom_instructions")
                            }
                        }
                    else:
                        # No structured data available
                        clean_data = {
                            "llm_analysis": {
                                "error": "No structured data available",
                                "provider": llm_analysis.get("provider"),
                                "model": llm_analysis.get("model"),
                                "format": llm_analysis.get("format")
                            }
                        }
                except Exception as e:
                    logger.warning(f"Error processing structured data: {e}")
                    clean_data = {
                        "llm_analysis": {
                            "error": f"Failed to process structured data: {e}",
                            "provider": llm_analysis.get("provider"),
                            "model": llm_analysis.get("model")
                        }
                    }
            
            # Save clean data to cache
            cache_json_path = os.path.join(self.cache_dir, f"{hash_name}.json")
            with open(cache_json_path, 'w', encoding='utf-8') as f:
                json.dump(clean_data, f, indent=2, ensure_ascii=False)
                
            logger.info(f"✅ Clean analysis data saved to cache: {cache_json_path}")
            logger.info(f"📄 Cache now contains: {hash_name}.jpg and {hash_name}.json")
            
            return cache_json_path
            
        except Exception as e:
            logger.error(f"Error in complete analysis: {e}")
            return None
    
    def run_pipeline(self) -> Optional[str]:
        """
        Run the complete pipeline.
        
        Returns:
            str: Path to the result JSON file
        """
        try:
            logger.info("🎯 Starting Main Analysis Pipeline")
            logger.info("=" * 60)
            
            # Step 1: Find input image
            image_path = self.find_input_image()
            if not image_path:
                logger.error("❌ No input image found - pipeline cannot continue")
                return None
            
            # Step 2: Try facial recognition first
            logger.info("🔍 Step 1: Checking facial recognition cache...")
            face_result = self.run_facial_recognition(image_path)
            
            if face_result:
                logger.info("✅ Facial recognition match found - returning cached result")
                logger.info("=" * 60)
                return face_result
            
            # Step 3: No match found, run complete analysis
            logger.info("🚀 Step 2: No cache match - running complete analysis...")
            analysis_result = self.run_complete_analysis(image_path)
            
            if analysis_result:
                logger.info("✅ Complete analysis finished successfully")
                logger.info("=" * 60)
                return analysis_result
            else:
                logger.error("❌ Complete analysis failed")
                logger.info("=" * 60)
                return None
                
        except Exception as e:
            logger.error(f"Error in main pipeline: {e}")
            logger.info("=" * 60)
            return None
    
    def run_on_startup(self) -> Optional[str]:
        """
        Run the pipeline on server startup.
        
        Returns:
            str: Path to result file or None if failed
        """
        logger.info("🚀 AUTO-RUNNING ANALYSIS PIPELINE ON SERVER STARTUP")
        return self.run_pipeline()


def run_analysis_pipeline() -> Optional[str]:
    """
    Convenience function to run the analysis pipeline.
    
    Returns:
        str: Path to result JSON file
    """
    pipeline = MainAnalysisPipeline()
    return pipeline.run_pipeline()


def run_on_server_startup() -> Optional[str]:
    """
    Function to be called when the server starts.
    
    Returns:
        str: Path to result JSON file
    """
    pipeline = MainAnalysisPipeline()
    return pipeline.run_on_startup()


if __name__ == "__main__":
    # Test the pipeline
    result = run_analysis_pipeline()
    if result:
        print(f"✅ Pipeline completed successfully: {result}")
    else:
        print("❌ Pipeline failed")
