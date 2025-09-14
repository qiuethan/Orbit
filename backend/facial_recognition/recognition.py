"""
Face recognition core module.
Provides functionality for recognizing and comparing faces.
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging
import time

class FaceRecognition:
    """
    Core functionality for face recognition.
    Includes methods for face matching, similarity calculation, and identity management.
    """
    
    def __init__(self, face_analyzer, recognition_threshold=0.8):
        """
        Initialize the face recognition module.
        
        Args:
            face_analyzer: An instance of ImprovedFaceAnalysis or similar
            recognition_threshold: Threshold for face matching (lower = more strict)
        """
        self.logger = logging.getLogger("facial_recognition.recognition")
        self.face_analyzer = face_analyzer
        self.recognition_threshold = recognition_threshold
        
        # Face tracking state
        self.current_face_name = None
        self.current_face_embedding = None
        self.last_face_check_time = 0
        self.face_recheck_interval = 1  # seconds
        
    def set_recheck_interval(self, seconds: int) -> None:
        """
        Set the interval for rechecking face identity.
        
        Args:
            seconds: Interval in seconds
        """
        self.face_recheck_interval = max(1, seconds)
        self.logger.info(f"Set face recheck interval to {self.face_recheck_interval} seconds")
    
    def update_current_face(self, face_name: str, face_embedding: np.ndarray, face_image: np.ndarray = None) -> None:
        """
        Update the current face being tracked.
        
        Args:
            face_name: Name/ID of the face
            face_embedding: Face embedding vector
            face_image: Optional face image data
        """
        self.current_face_name = face_name
        self.current_face_embedding = face_embedding
        self.last_face_check_time = time.time()
        
        self.logger.info(f"Updated current face to {face_name}")
    
    def is_same_face(self, face_embedding: np.ndarray, threshold: float = None) -> bool:
        """
        Check if a face embedding matches the current face.
        
        Args:
            face_embedding: Face embedding to compare
            threshold: Optional similarity threshold (overrides default)
            
        Returns:
            bool: True if it's the same face, False otherwise
        """
        if self.current_face_embedding is None or face_embedding is None:
            return False
            
        if threshold is None:
            threshold = self.recognition_threshold
            
        similarity = self._calculate_similarity(self.current_face_embedding, face_embedding)
        
        return similarity > threshold
    
    def recognize_face(self, face_embeddings: Dict[str, np.ndarray], new_embedding: np.ndarray) -> Tuple[str, float]:
        """
        Find the best match for a face embedding in a collection of known faces.
        
        Args:
            face_embeddings: Dictionary of known face embeddings
            new_embedding: New face embedding to match
            
        Returns:
            Tuple[str, float]: Name of the best match and similarity score
        """
        best_match = None
        best_similarity = 0
        
        for name, data in face_embeddings.items():
            embedding = None
            
            # Handle different data formats
            if isinstance(data, dict) and 'embedding' in data:
                embedding = data['embedding']
            elif isinstance(data, np.ndarray):
                embedding = data
                
            if embedding is not None:
                similarity = self._calculate_similarity(embedding, new_embedding)
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = name
        
        # Check if the best match exceeds the threshold
        if best_match and best_similarity > self.recognition_threshold:
            self.logger.info(f"Recognized face as {best_match} with similarity {best_similarity:.4f}")
            return best_match, best_similarity
        else:
            self.logger.info(f"No match found (best similarity: {best_similarity:.4f})")
            return None, best_similarity
    
    def detect_faces(self, frame: np.ndarray, max_faces: int = 0, min_face_size: int = 40) -> List:
        """
        Detect faces in an image.
        
        Args:
            frame: Input image
            max_faces: Maximum number of faces to detect (0 for unlimited)
            min_face_size: Minimum face size in pixels
            
        Returns:
            List: Detected faces with embeddings and landmarks
        """
        if frame is None:
            self.logger.error("Cannot detect faces in None frame")
            return []
            
        # Use the improved face analysis with multiple detection sizes
        faces = self.face_analyzer.get_with_multiple_sizes(frame, max_faces)
        
        # Apply Non-Maximum Suppression to remove duplicate detections
        if len(faces) > 1:
            self.logger.info(f"Before NMS: {len(faces)} faces detected")
            faces = self._remove_duplicate_faces(faces, iou_threshold=0.1)  # Stricter IoU threshold
            self.logger.info(f"After NMS: {len(faces)} faces remaining")

        # Additional deduplication by embedding similarity to avoid double boxes on same person
        if len(faces) > 1:
            faces = self._deduplicate_by_embedding(faces, sim_threshold=0.95, iou_threshold=0.3)
            self.logger.info(f"After embedding dedup: {len(faces)} faces remaining")
        
        # Filter out faces that are too small
        if min_face_size > 0:
            filtered_faces = []
            for face in faces:
                bbox = face.bbox.astype(int)
                width = bbox[2] - bbox[0]
                height = bbox[3] - bbox[1]
                
                if width >= min_face_size and height >= min_face_size:
                    filtered_faces.append(face)
                else:
                    self.logger.debug(f"Filtered out face that's too small: {width}x{height} pixels")
            
            faces = filtered_faces
        
        self.logger.info(f"Detected {len(faces)} faces in frame")
        return faces
    
    def _remove_duplicate_faces(self, faces: List, iou_threshold: float = 0.3) -> List:
        """
        Remove duplicate face detections using Non-Maximum Suppression.
        
        Args:
            faces: List of detected faces
            iou_threshold: IoU threshold for considering faces as duplicates
            
        Returns:
            List of unique faces
        """
        if len(faces) <= 1:
            return faces
        
        try:
            # Extract bounding boxes and confidence scores
            boxes = []
            scores = []
            
            for i, face in enumerate(faces):
                if hasattr(face, 'bbox') and hasattr(face, 'det_score'):
                    bbox = face.bbox
                    boxes.append([bbox[0], bbox[1], bbox[2], bbox[3]])
                    scores.append(face.det_score)
                    self.logger.debug(f"Face {i}: bbox={bbox}, score={face.det_score:.3f}")
                else:
                    # Fallback for different face object structure
                    boxes.append([0, 0, 100, 100])
                    scores.append(0.5)
                    self.logger.warning(f"Face {i}: missing bbox/score attributes")
            
            if not boxes:
                return faces
            
            # Convert to numpy arrays
            boxes = np.array(boxes, dtype=np.float32)
            scores = np.array(scores, dtype=np.float32)
            
            # Apply NMS
            keep_indices = self._nms(boxes, scores, iou_threshold)
            
            # Return only the faces that passed NMS
            return [faces[i] for i in keep_indices]
            
        except Exception as e:
            self.logger.warning(f"Error in face deduplication: {e}")
            return faces
    
    def _nms(self, boxes: np.ndarray, scores: np.ndarray, iou_threshold: float) -> List[int]:
        """
        Non-Maximum Suppression implementation.
        
        Args:
            boxes: Array of bounding boxes [x1, y1, x2, y2]
            scores: Array of confidence scores
            iou_threshold: IoU threshold
            
        Returns:
            List of indices to keep
        """
        if len(boxes) == 0:
            return []
        
        # Sort by scores in descending order
        order = scores.argsort()[::-1]
        keep = []
        
        while len(order) > 0:
            # Pick the detection with highest score
            i = order[0]
            keep.append(i)
            
            if len(order) == 1:
                break
            
            # Calculate IoU with remaining detections
            ious = self._calculate_iou(boxes[i], boxes[order[1:]])
            
            # Keep only detections with IoU below threshold
            order = order[1:][ious <= iou_threshold]
        
        return keep
    
    def _deduplicate_by_embedding(self, faces: List, sim_threshold: float = 0.95, iou_threshold: float = 0.3) -> List:
        """
        Remove near-duplicate detections by comparing face embeddings and IoU.
        Keeps the higher-confidence detection when two detections are highly similar.
        """
        try:
            if len(faces) <= 1:
                return faces

            # Normalize embeddings and collect metadata
            normalized_embeddings = []
            boxes = []
            scores = []
            for face in faces:
                emb = np.array(face.embedding, dtype=np.float32)
                norm = np.linalg.norm(emb)
                if norm == 0:
                    normalized_embeddings.append(None)
                else:
                    normalized_embeddings.append(emb / norm)
                if hasattr(face, 'bbox'):
                    boxes.append([face.bbox[0], face.bbox[1], face.bbox[2], face.bbox[3]])
                else:
                    boxes.append([0, 0, 0, 0])
                scores.append(float(getattr(face, 'det_score', 0.0)))

            boxes = np.array(boxes, dtype=np.float32)
            scores = np.array(scores, dtype=np.float32)

            keep = []
            removed = set()
            for i in range(len(faces)):
                if i in removed:
                    continue
                # Compare to subsequent faces
                for j in range(i + 1, len(faces)):
                    if j in removed:
                        continue
                    # If boxes overlap significantly, and embeddings are very similar, drop the lower score
                    if boxes.shape[0] >= 2:
                        iou = self._calculate_iou(np.array(boxes[i]), np.array([boxes[j]])).item()
                    else:
                        iou = 0.0
                    sim = 0.0
                    if normalized_embeddings[i] is not None and normalized_embeddings[j] is not None:
                        sim = float(np.dot(normalized_embeddings[i], normalized_embeddings[j]))
                    if (iou >= iou_threshold) or (sim >= sim_threshold):
                        # Remove the one with lower detection score
                        if scores[i] >= scores[j]:
                            removed.add(j)
                        else:
                            removed.add(i)
                            break
                if i not in removed:
                    keep.append(i)

            return [faces[k] for k in keep]
        except Exception as e:
            self.logger.warning(f"Error in embedding deduplication: {e}")
            return faces

    def _calculate_iou(self, box1: np.ndarray, boxes: np.ndarray) -> np.ndarray:
        """
        Calculate Intersection over Union (IoU) between one box and multiple boxes.
        
        Args:
            box1: Single bounding box [x1, y1, x2, y2]
            boxes: Multiple bounding boxes [N, 4]
            
        Returns:
            Array of IoU values
        """
        # Calculate intersection
        x1 = np.maximum(box1[0], boxes[:, 0])
        y1 = np.maximum(box1[1], boxes[:, 1])
        x2 = np.minimum(box1[2], boxes[:, 2])
        y2 = np.minimum(box1[3], boxes[:, 3])
        
        intersection = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
        
        # Calculate areas
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
        
        # Calculate IoU
        union = area1 + areas - intersection
        return intersection / np.maximum(union, 1e-8)
    
    def find_person_by_face(self, face_image: np.ndarray, known_faces: Dict, threshold: float = None) -> Tuple[str, float]:
        """
        Find a person by their face.
        
        Args:
            face_image: Face image
            known_faces: Dictionary of known faces
            threshold: Optional threshold (overrides default)
            
        Returns:
            Tuple[str, float]: Person ID and similarity score
        """
        if threshold is None:
            threshold = self.recognition_threshold
            
        faces = self.detect_faces(face_image, max_faces=1)
        
        if not faces:
            self.logger.warning("No faces detected in the image")
            return None, 0.0
            
        face = faces[0]
        face_embedding = face.embedding
        
        person_id, similarity = self.recognize_face(known_faces, face_embedding)
        
        if person_id and similarity > threshold:
            return person_id, similarity
        else:
            return None, similarity
    
    def _calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate the similarity between two face embeddings using cosine similarity.
        This matches the InsightFace approach for face verification.
        
        Args:
            embedding1: First face embedding
            embedding2: Second face embedding
            
        Returns:
            float: Similarity score between 0 and 1 (percentage confidence)
        """
        if embedding1 is None or embedding2 is None:
            return 0.0
            
        try:
            # Ensure embeddings are numpy arrays
            embedding1 = np.array(embedding1, dtype=np.float32)
            embedding2 = np.array(embedding2, dtype=np.float32)
            
            # Normalize the embeddings (L2 normalization)
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
                
            embedding1_norm = embedding1 / norm1
            embedding2_norm = embedding2 / norm2
            
            # Calculate cosine similarity (range: -1 to 1)
            cosine_sim = float(np.dot(embedding1_norm, embedding2_norm))
            
            # Strict cosine similarity mapped to [0,1]
            similarity_0_1 = (cosine_sim + 1.0) / 2.0
            
            return float(max(0.0, min(1.0, similarity_0_1)))
            
        except Exception as e:
            self.logger.error(f"Error calculating similarity: {e}")
            return float(0.0)
