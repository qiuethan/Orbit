"""
Core module for facial recognition.
Contains the main FacialRecognitionModule class that integrates all components.
"""

import os
import cv2
import numpy as np
import logging
import json
from typing import Dict, List, Tuple, Optional, Any

from .improved_analysis import ImprovedFaceAnalysis
from .recognition import FaceRecognition

class FacialRecognitionModule:
    """
    Main class for facial recognition that integrates all components.
    """
    
    def __init__(self, 
                recognition_threshold: float = 0.8,
                cache_path: str = None,
                model_name: str = "buffalo_sc",
                detection_size: Tuple[int, int] = (640, 640),
                max_faces: int = 5):
        """
        Initialize facial recognition module.
        
        Args:
            recognition_threshold: Threshold for face recognition (0.0-1.0)
            cache_path: Path to cache directory
            model_name: Model name for face analysis
            detection_size: Size for face detection
            max_faces: Maximum number of faces to detect
        """
        self.logger = logging.getLogger("facial_recognition")
        self.logger.info(f"Initializing FacialRecognitionModule with threshold {recognition_threshold}")
        
        # Set cache path
        if cache_path is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            cache_path = os.path.join(backend_dir, "cache")
        self.cache_path = cache_path
        
        # Initialize face analyzer
        try:
            self.face_analyzer = ImprovedFaceAnalysis(
                name=model_name,
                root="~/.insightface",
                providers=['CPUExecutionProvider']
            )
            # Use better detection parameters for accuracy
            self.face_analyzer.prepare(ctx_id=0, det_size=detection_size, det_thresh=0.6)
            self.logger.info(f"Initialized face analyzer with model {model_name}")
        except Exception as e:
            self.logger.error(f"Error initializing face analyzer: {e}")
            raise
        
        # Initialize recognition component
        self.recognition = FaceRecognition(
            face_analyzer=self.face_analyzer,
            recognition_threshold=recognition_threshold
        )
        
        # Set parameters
        self.max_faces = max_faces
        self.recognition_threshold = recognition_threshold
        
        # Load cached face embeddings
        self.known_faces = {}
        self.load_cached_faces()
        
    def load_cached_faces(self) -> None:
        """
        Load face embeddings from cached JPG/PNG images.
        Generate embeddings on-the-fly from the image files.
        """
        try:
            if not os.path.exists(self.cache_path):
                self.logger.info(f"Cache directory {self.cache_path} does not exist")
                return
                
            # Find all image files in cache
            image_files = []
            for filename in os.listdir(self.cache_path):
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    image_files.append(filename)
                    
            self.logger.info(f"Found {len(image_files)} cached images to process")
            
            for image_filename in image_files:
                image_path = os.path.join(self.cache_path, image_filename)
                hash_name = os.path.splitext(image_filename)[0]  # Remove extension
                json_path = os.path.join(self.cache_path, f"{hash_name}.json")
                
                try:
                    # Load and process the image to extract face embedding
                    image = cv2.imread(image_path)
                    if image is None:
                        self.logger.warning(f"Could not load image: {image_path}")
                        continue
                        
                    # Detect faces in the cached image
                    faces = self.detect_faces(image)
                    if not faces:
                        self.logger.warning(f"No faces detected in cached image: {image_filename}")
                        continue
                        
                    # Use the first detected face
                    face = faces[0]
                    embedding = face.embedding
                    
                    # Store the face data
                    face_data = {
                        'embedding': embedding,
                        'image_path': image_path,
                        'hash_name': hash_name,
                        'bbox': face.bbox.tolist(),
                        'confidence': float(face.det_score) if hasattr(face, 'det_score') else 0.0
                    }
                    
                    # Add JSON path if it exists
                    if os.path.exists(json_path):
                        face_data['json_path'] = json_path
                        
                    self.known_faces[hash_name] = face_data
                    self.logger.info(f"Generated face embedding for {hash_name} (confidence: {face_data['confidence']:.2f})")
                    
                except Exception as e:
                    self.logger.error(f"Error processing cached image {image_filename}: {e}")
                        
            self.logger.info(f"Loaded {len(self.known_faces)} cached face embeddings")
        except Exception as e:
            self.logger.error(f"Error loading cached faces: {e}")
            
    def detect_faces(self, image: np.ndarray) -> List:
        """
        Detect faces in an image.
        
        Args:
            image: Input image
            
        Returns:
            List: Detected faces
        """
        return self.recognition.detect_faces(image, max_faces=self.max_faces)
        
    def recognize_face(self, face_embedding: np.ndarray) -> Tuple[Optional[str], float]:
        """
        Recognize a face from its embedding.
        
        Args:
            face_embedding: Face embedding vector
            
        Returns:
            Tuple[str, float]: Hash name and similarity score
        """
        return self.recognition.recognize_face(self.known_faces, face_embedding)
        
    def compare_with_cached_faces(self, target_image_path: str) -> Tuple[Optional[str], float, Optional[str]]:
        """
        Compare target image with all cached faces.
        
        Args:
            target_image_path: Path to the target image
            
        Returns:
            Tuple[hash_name, similarity, json_path]: Best match info or None if no match
        """
        try:
            # Load target image
            image = cv2.imread(target_image_path)
            if image is None:
                self.logger.error(f"Could not load image: {target_image_path}")
                return None, 0.0, None
                
            # Detect faces in target image
            faces = self.detect_faces(image)
            if not faces:
                self.logger.warning(f"No faces detected in {target_image_path}")
                return None, 0.0, None
                
            # Use the first detected face
            target_face = faces[0]
            target_embedding = target_face.embedding
            
            return self.compare_embedding_with_cached_faces(target_embedding)
                
        except Exception as e:
            self.logger.error(f"Error comparing with cached faces: {e}")
            return None, 0.0, None
    
    def compare_embedding_with_cached_faces(self, target_embedding: np.ndarray) -> Tuple[Optional[str], float, Optional[str]]:
        """
        Compare target embedding directly with all cached faces.
        This is more efficient when you already have the embedding.
        
        Args:
            target_embedding: Face embedding vector
            
        Returns:
            Tuple[hash_name, similarity, json_path]: Best match info or None if no match
        """
        try:
            if target_embedding is None:
                self.logger.error("Target embedding is None")
                return None, 0.0, None
                
            # Find best match among cached faces
            best_match = None
            best_similarity = 0.0
            best_json_path = None
            
            self.logger.info(f"Comparing embedding with {len(self.known_faces)} cached faces")
            
            # Collect ALL similarities for transparency  
            all_similarities = []
            
            for hash_name, face_data in self.known_faces.items():
                cached_embedding = face_data['embedding']
                similarity = self.recognition._calculate_similarity(target_embedding, cached_embedding)
                
                all_similarities.append((hash_name, similarity, face_data.get('json_path')))
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = hash_name
                    best_json_path = face_data.get('json_path')
            
            # Sort and log ALL similarities for debugging bias issues
            all_similarities.sort(key=lambda x: x[1], reverse=True)
            self.logger.info(f"📊 ALL face similarities:")
            for i, (name, sim, _) in enumerate(all_similarities):
                status = "✅" if sim >= self.recognition_threshold else "❌"
                self.logger.info(f"  {i+1}. {status} {name}: {sim:.4f}")
                    
            self.logger.info(f"Best match: {best_match} with similarity {best_similarity:.4f} (threshold: {self.recognition_threshold})")
                    
            if best_match and best_similarity >= self.recognition_threshold:
                self.logger.info(f"✅ Found match above threshold: {best_match} with similarity {best_similarity:.4f}")
                return best_match, best_similarity, best_json_path
            else:
                self.logger.info(f"❌ No sufficient match found (best similarity: {best_similarity:.4f} < threshold: {self.recognition_threshold})")
                return None, best_similarity, None
                
        except Exception as e:
            self.logger.error(f"Error comparing embedding with cached faces: {e}")
            return None, 0.0, None
            
    def process_image(self, image_path: str) -> Dict[str, Any]:
        """
        Process an image and return face recognition results.
        
        Args:
            image_path: Path to the image to process
            
        Returns:
            Dict: Processing results
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {
                    "error": f"Could not load image: {image_path}",
                    "faces": [],
                    "match_found": False
                }
                
            # Detect faces
            faces = self.detect_faces(image)
            
            result = {
                "image_path": image_path,
                "faces": [],
                "match_found": False,
                "best_match": None,
                "similarity": 0.0,
                "json_path": None
            }
            
            for i, face in enumerate(faces):
                face_bbox = face.bbox.astype(int)
                face_embedding = face.embedding
                
                # Try to recognize the face
                hash_name, similarity = self.recognize_face(face_embedding)
                
                face_data = {
                    "index": i,
                    "bbox": face_bbox.tolist(),
                    "landmarks": face.landmark.tolist() if hasattr(face, "landmark") else None,
                    "hash_name": hash_name,
                    "similarity": float(similarity),
                    "confidence": float(face.det_score) if hasattr(face, "det_score") else 0.0
                }
                
                result["faces"].append(face_data)
                
                # Update best match if this is better
                if similarity > result["similarity"]:
                    result["similarity"] = similarity
                    result["best_match"] = hash_name
                    if hash_name in self.known_faces:
                        result["json_path"] = self.known_faces[hash_name]["json_path"]
                        
            # Set match found flag
            result["match_found"] = result["best_match"] is not None
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error processing image {image_path}: {e}")
            return {
                "error": str(e),
                "faces": [],
                "match_found": False
            }
