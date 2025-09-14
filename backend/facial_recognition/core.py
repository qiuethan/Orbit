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
from typing import Any
try:
    # Optional DeepFace import
    from deepface import DeepFace  # type: ignore
    _HAS_DEEPFACE = True
except Exception:
    DeepFace = None  # type: ignore
    _HAS_DEEPFACE = False

class FacialRecognitionModule:
    """
    Main class for facial recognition that integrates all components.
    """
    
    def __init__(self, 
                recognition_threshold: float = 0.8,
                cache_path: str = None,
                model_name: str = "buffalo_sc",
                detection_size: Tuple[int, int] = (640, 640),
                max_faces: int = 5,
                prefer_deepface: bool = True):
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
        
        # Choose backend: DeepFace (VGGFace/ArcFace backends) or InsightFace
        self.use_deepface = False
        self.deepface_model_name = "Facenet512"  # robust default for verification
        self.deepface_detector_backend = "retinaface"  # accurate detector

        if prefer_deepface and _HAS_DEEPFACE:
            # Probe DeepFace models at runtime; lazy evaluation in methods
            self.use_deepface = True
            self.logger.info("Using DeepFace backend (detector: retinaface, model: Facenet512)")
        else:
            # Initialize InsightFace fallback
            try:
                self.face_analyzer = ImprovedFaceAnalysis(
                    name=model_name,
                    root="~/.insightface",
                    providers=['CPUExecutionProvider']
                )
                # Use better detection parameters for accuracy
                self.face_analyzer.prepare(ctx_id=0, det_size=detection_size, det_thresh=0.6)
                self.logger.info(f"Initialized InsightFace analyzer with model {model_name}")
            except Exception as e:
                self.logger.error(f"Error initializing face analyzer: {e}")
                raise
        
        # Initialize recognition component when InsightFace path is used
        if not self.use_deepface:
            self.recognition = FaceRecognition(
                face_analyzer=self.face_analyzer,
                recognition_threshold=recognition_threshold
            )
        
        # Set parameters
        self.max_faces = max_faces
        self.recognition_threshold = recognition_threshold
        
        # Load cached face embeddings or templates
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
                    # Extract face template/embedding
                    image = cv2.imread(image_path)
                    if image is None:
                        self.logger.warning(f"Could not load image: {image_path}")
                        continue

                    if self.use_deepface:
                        # DeepFace: build representation with chosen model
                        # Represent returns a list with embeddings; enforce detector backend
                        reps = DeepFace.represent(
                            img_path=image[:, :, ::-1],  # convert BGR to RGB
                            model_name=self.deepface_model_name,
                            detector_backend=self.deepface_detector_backend,
                            enforce_detection=True
                        )
                        if not reps:
                            self.logger.warning(f"No faces detected (DeepFace) in cached image: {image_filename}")
                            continue
                        embedding = np.array(reps[0]['embedding'], dtype=np.float32)
                        bbox = reps[0].get('facial_area') or {}
                        bbox_list = [bbox.get('x',0), bbox.get('y',0), bbox.get('x',0)+bbox.get('w',0), bbox.get('y',0)+bbox.get('h',0)]
                        confidence = 1.0
                    else:
                        faces = self.detect_faces(image)
                        if not faces:
                            self.logger.warning(f"No faces detected in cached image: {image_filename}")
                            continue
                        face = faces[0]
                        embedding = face.embedding
                        bbox_list = face.bbox.tolist()
                        confidence = float(face.det_score) if hasattr(face, 'det_score') else 0.0
                    
                    # Attempt to read display name from JSON for better labels
                    display_name = None
                    if os.path.exists(json_path):
                        try:
                            with open(json_path, 'r') as jf:
                                jd = json.load(jf)
                            person_analysis = (jd.get('person_analysis') or {}).get('personal_info', {})
                            display_name = person_analysis.get('full_name')
                            if not display_name:
                                llm = jd.get('llm_analysis', {})
                                sd = llm.get('structured_data', {}) if isinstance(llm, dict) else {}
                                display_name = (sd.get('personal_info') or {}).get('full_name')
                        except Exception:
                            display_name = None

                    # Store the face data
                    face_data = {
                        'embedding': embedding,
                        'image_path': image_path,
                        'hash_name': hash_name,
                        'bbox': bbox_list,
                        'confidence': confidence,
                        'json_path': json_path if os.path.exists(json_path) else None,
                        'display_name': display_name
                    }
                    
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
        if self.use_deepface:
            # For DeepFace, we will use represent to get embeddings, but for detection-only
            try:
                reps = DeepFace.represent(
                    img_path=image[:, :, ::-1],  # RGB
                    model_name=self.deepface_model_name,
                    detector_backend=self.deepface_detector_backend,
                    enforce_detection=False
                )
                # Return in a pseudo-face format with bbox/embedding similar to InsightFace
                faces: List[Any] = []
                for rep in reps or []:
                    emb = np.array(rep.get('embedding'), dtype=np.float32)
                    fa = rep.get('facial_area') or {}
                    x = int(fa.get('x', 0)); y = int(fa.get('y', 0)); w = int(fa.get('w', 0)); h = int(fa.get('h', 0))
                    bbox = np.array([x, y, x + w, y + h], dtype=np.int32)
                    # Build a lightweight object with expected attributes
                    faces.append(type('DFace', (), {
                        'embedding': emb,
                        'bbox': bbox,
                        'det_score': 1.0
                    }))
                return faces
            except Exception as e:
                self.logger.error(f"DeepFace detection error: {e}")
                return []
        else:
            return self.recognition.detect_faces(image, max_faces=self.max_faces)
        
    def recognize_face(self, face_embedding: np.ndarray) -> Tuple[Optional[str], float]:
        """
        Recognize a face from its embedding.
        
        Args:
            face_embedding: Face embedding vector
            
        Returns:
            Tuple[str, float]: Hash name and similarity score
        """
        if self.use_deepface:
            # Compare embedding with cached embeddings using cosine similarity mapped to [0,1]
            def cosine_similarity_0_1(a: np.ndarray, b: np.ndarray) -> float:
                a = np.array(a, dtype=np.float32)
                b = np.array(b, dtype=np.float32)
                na = np.linalg.norm(a)
                nb = np.linalg.norm(b)
                if na == 0 or nb == 0:
                    return 0.0
                cos = float(np.dot(a / na, b / nb))
                return float(max(0.0, min(1.0, (cos + 1.0) / 2.0)))

            best_name = None
            best_sim = 0.0
            for name, data in self.known_faces.items():
                emb2 = np.array(data['embedding'], dtype=np.float32)
                sim = cosine_similarity_0_1(face_embedding, emb2)
                if sim > best_sim:
                    best_sim = sim
                    best_name = name
            if best_name and best_sim >= self.recognition_threshold:
                return best_name, best_sim
            return None, best_sim
        else:
            return self.recognition.recognize_face(self.known_faces, face_embedding)

    def compare_face_with_cached_images(self, face_image: np.ndarray) -> Tuple[Optional[str], float, Optional[str], bool]:
        """
        Compare a cropped face image against cached face images using DeepFace.verify.
        Tries a sequence of strong models and returns the first verified match, or best overall.
        Returns: (match_id, confidence_like, json_path, verified)
        """
        if not self.use_deepface:
            # Fallback: compute embedding and compare
            faces = self.detect_faces(face_image)
            if not faces:
                return None, 0.0, None, False
            emb = faces[0].embedding
            name, sim = self.recognize_face(emb)
            jp = self.known_faces.get(name, {}).get('json_path') if name else None
            return name, float(sim), jp, bool(name and sim >= self.recognition_threshold)

        # Ensure RGB
        try:
            rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
        except Exception:
            rgb = face_image

        candidate_models = ["ArcFace", "Facenet512", "VGG-Face"]
        distance_metric = "cosine"
        best = {
            'name': None,
            'score': 0.0,
            'json_path': None,
            'verified': False
        }

        for cached_id, data in self.known_faces.items():
            img_path = data.get('image_path')
            if not img_path or not os.path.exists(img_path):
                continue
            # Prefer display name if available
            label = data.get('display_name') or cached_id
            # Try multiple models until verified
            is_verified_any = False
            best_score_this = 0.0
            for model_name in candidate_models:
                try:
                    res = DeepFace.verify(
                        img1_path=rgb,
                        img2_path=img_path,
                        detector_backend=self.deepface_detector_backend,
                        model_name=model_name,
                        distance_metric=distance_metric,
                        align=True,
                        enforce_detection=True
                    )
                    verified = bool(res.get('verified', False))
                    # DeepFace returns a raw distance; map to confidence via threshold
                    distance = float(res.get('distance', 1.0))
                    threshold = float(res.get('threshold', 0.0)) or 0.0
                    # Higher confidence when below threshold. Map to 0..1
                    if threshold > 0:
                        score = float(max(0.0, min(1.0, 1.0 - (distance / threshold))))
                    else:
                        # Fallback simple mapping
                        score = float(max(0.0, min(1.0, 1.0 - distance)))

                    if score > best_score_this:
                        best_score_this = score

                    if verified:
                        is_verified_any = True
                        # Accept immediately if verified for any strong model
                        if score > best['score']:
                            best.update({'name': label, 'score': score, 'json_path': data.get('json_path'), 'verified': True})
                        break
                except Exception as e:
                    self.logger.debug(f"DeepFace.verify error for {label}: {e}")
                    continue

            # If not verified, keep best score
            if not is_verified_any and best_score_this > best['score']:
                best.update({'name': label, 'score': best_score_this, 'json_path': data.get('json_path'), 'verified': False})

        return best['name'], float(best['score']), best['json_path'], bool(best['verified'])
        
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
