"""
Real-time webcam facial recognition module.
Captures video from webcam, detects faces, and runs analysis pipeline.
"""

import cv2
import numpy as np
import json
import time
import logging
from typing import Dict, List, Optional, Tuple, Any
import threading
import queue
from dataclasses import dataclass

from .local_face_recognition import recognize

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FaceDetection:
    """Data class for face detection results."""
    bbox: List[int]  # [x1, y1, x2, y2]
    confidence: float
    name: Optional[str] = None
    json_path: Optional[str] = None
    similarity: float = 0.0
    is_analyzing: bool = False

class WebcamFaceRecognition:
    """
    Real-time webcam facial recognition system.
    """
    
    def __init__(self):
        """Initialize the webcam recognition system."""
        self.logger = logging.getLogger("webcam_recognition")
        
        # Initialize facial recognition components
        from .core import FacialRecognitionModule
        import os
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cache_dir = os.path.join(backend_dir, "cache")
        
        self.face_module = FacialRecognitionModule(
            recognition_threshold=0.6,
            cache_path=cache_dir
        )
        
        # Webcam setup
        self.cap = None
        self.is_running = False
        
        # Analysis queue and threading
        self.analysis_queue = queue.Queue(maxsize=3)  # Limit queue size
        self.analysis_thread = None
        self.analysis_results = {}  # Cache for analysis results
        
        # Face tracking for one-time analysis
        self.tracked_faces = {}  # Track faces that have been analyzed
        self.face_analysis_status = {}  # Track analysis status per face
        self.analysis_cooldown = 5.0  # Seconds before re-analyzing same area
        
        self.logger.info("WebcamFaceRecognition initialized")
    
    def start_webcam(self, camera_index: int = 0) -> bool:
        """
        Start the webcam capture.
        
        Args:
            camera_index: Camera index (0 for default webcam)
            
        Returns:
            bool: True if webcam started successfully
        """
        try:
            self.cap = cv2.VideoCapture(camera_index)
            if not self.cap.isOpened():
                self.logger.error(f"Could not open camera {camera_index}")
                return False
                
            # Set camera properties for better performance
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            self.is_running = True
            
            # Start analysis worker thread
            self.analysis_thread = threading.Thread(target=self._analysis_worker, daemon=True)
            self.analysis_thread.start()
            
            self.logger.info(f"Webcam started successfully on camera {camera_index}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error starting webcam: {e}")
            return False
    
    def stop_webcam(self):
        """Stop the webcam capture."""
        self.is_running = False
        
        if self.cap:
            self.cap.release()
            self.cap = None
            
        if self.analysis_thread:
            self.analysis_thread.join(timeout=2.0)
            
        self.logger.info("Webcam stopped")
    
    def capture_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """
        Capture a single frame from webcam.
        
        Returns:
            Tuple[bool, np.ndarray]: (success, frame)
        """
        if not self.cap or not self.is_running:
            return False, None
            
        ret, frame = self.cap.read()
        return ret, frame
    
    def detect_faces_in_frame(self, frame: np.ndarray) -> List[FaceDetection]:
        """
        Detect faces in a frame and return detection results.
        
        Args:
            frame: Input frame
            
        Returns:
            List[FaceDetection]: List of detected faces
        """
        if frame is None:
            return []
            
        try:
            # Use the face module to detect faces
            faces = self.face_module.detect_faces(frame)
            
            detections = []
            current_time = time.time()
            
            for i, face in enumerate(faces):
                # Get bounding box (ensure Python native types)
                bbox = [int(x) for x in face.bbox.astype(int)]  # [x1, y1, x2, y2] - convert to Python ints
                confidence = float(face.det_score) if hasattr(face, 'det_score') else 0.0
                
                # Create face detection (already converted to Python types)
                detection = FaceDetection(
                    bbox=bbox,  # Already converted to Python ints
                    confidence=confidence  # Already converted to Python float
                )
                
                # Create a stable face ID based on position (with some tolerance for movement)
                center_x = (bbox[0] + bbox[2]) // 2
                center_y = (bbox[1] + bbox[3]) // 2
                face_id = f"face_{center_x//100}_{center_y//100}"  # Grid-based tracking with 100px tolerance for more stability
                
                # Check if we have a result for this face
                if face_id in self.analysis_results:
                    result = self.analysis_results[face_id]
                    detection.name = result.get('name')
                    detection.json_path = result.get('json_path') 
                    detection.similarity = float(result.get('similarity', 0.0))
                    detection.is_analyzing = False
                    self.logger.debug(f"Face {face_id} has result: {detection.name} ({detection.similarity:.2f})")
                elif face_id in self.face_analysis_status:
                    # Analysis is in progress
                    detection.is_analyzing = True
                    self.logger.debug(f"Face {face_id} is being analyzed...")
                else:
                    # New face - check if we should analyze it
                    last_analysis = self.tracked_faces.get(face_id, 0)
                    if current_time - last_analysis > self.analysis_cooldown:
                        # Queue for analysis (one-time only)
                        self._queue_face_for_analysis(face_id, frame, face, bbox)
                        detection.is_analyzing = True
                        self.face_analysis_status[face_id] = current_time
                        self.tracked_faces[face_id] = current_time
                        self.logger.info(f"Queuing new face {face_id} for analysis")
                    else:
                        self.logger.debug(f"Face {face_id} still in cooldown ({current_time - last_analysis:.1f}s < {self.analysis_cooldown}s)")
                
                detections.append(detection)
                
            return detections
            
        except Exception as e:
            self.logger.error(f"Error detecting faces: {e}")
            return []
    
    def _queue_face_for_analysis(self, face_id: str, frame: np.ndarray, face, bbox: List[int]):
        """
        Queue a face for analysis.
        
        Args:
            face_id: Unique face identifier
            frame: Full frame
            face: InsightFace face object
            bbox: Bounding box coordinates
        """
        try:
            # Extract face region
            x1, y1, x2, y2 = bbox
            face_region = frame[y1:y2, x1:x2]
            
            if face_region.size > 0:
                # Add to analysis queue (non-blocking)
                analysis_data = {
                    'face_key': face_id,
                    'face_region': face_region.copy(),
                    'face_embedding': face.embedding,
                    'timestamp': time.time()
                }
                
                try:
                    self.analysis_queue.put(analysis_data, block=False)
                    self.logger.debug(f"Queued face {face_id} for analysis")
                except queue.Full:
                    self.logger.warning("Analysis queue is full, skipping face")
                    
        except Exception as e:
            self.logger.error(f"Error queuing face for analysis: {e}")
    
    def _analysis_worker(self):
        """
        Background worker thread for face analysis.
        """
        self.logger.info("Analysis worker thread started")
        
        while self.is_running:
            try:
                # Get analysis task from queue
                analysis_data = self.analysis_queue.get(timeout=1.0)
                
                face_id = analysis_data['face_key']
                face_region = analysis_data['face_region']
                face_embedding = analysis_data['face_embedding']
                
                self.logger.info(f"Analyzing face {face_id}")
                
                # Run recognition by comparing with cached faces
                import tempfile
                import cv2
                
                # Save face region as temporary image for recognition
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                    cv2.imwrite(tmp_file.name, face_region)
                    
                    # Use the existing compare_with_cached_faces method
                    person_id, similarity, json_path = self.face_module.compare_with_cached_faces(tmp_file.name)
                    
                    # Clean up temp file
                    import os
                    os.unlink(tmp_file.name)
                
                result = {
                    'name': person_id,
                    'similarity': float(similarity),  # Ensure Python float
                    'json_path': json_path
                }
                
                # Load name from JSON if available
                if json_path:
                    try:
                        with open(json_path, 'r') as f:
                            data = json.load(f)
                        
                        # Extract name from analysis data (try both formats)
                        llm_analysis = data.get('llm_analysis', {})
                        structured_data = llm_analysis.get('structured_data', {})
                        personal_info = structured_data.get('personal_info', {})
                        full_name = personal_info.get('full_name')
                        
                        # Try alternative format (person_analysis)
                        if not full_name:
                            person_analysis = data.get('person_analysis', {})
                            personal_info = person_analysis.get('personal_info', {})
                            full_name = personal_info.get('full_name')
                        
                        if full_name:
                            result['name'] = full_name
                            self.logger.info(f"Found person name: {full_name}")
                        else:
                            self.logger.warning(f"No full_name found in JSON: {json_path}")
                            self.logger.debug(f"Available data: {personal_info}")
                            
                    except Exception as e:
                        self.logger.error(f"Error reading JSON {json_path}: {e}")
                else:
                    self.logger.warning(f"No JSON path available for {person_id}")
                
                # Store result and remove from analyzing status
                self.analysis_results[face_id] = result
                if face_id in self.face_analysis_status:
                    del self.face_analysis_status[face_id]
                
                self.logger.info(f"Analysis complete for {face_id}: {result['name']} (similarity: {result['similarity']:.2f})")
                self.logger.debug(f"Analysis results now cached: {list(self.analysis_results.keys())}")
                
            except queue.Empty:
                continue
            except Exception as e:
                self.logger.error(f"Error in analysis worker: {e}")
        
        self.logger.info("Analysis worker thread stopped")
    
    def process_frame_with_analysis(self, frame: np.ndarray) -> Tuple[np.ndarray, List[Dict]]:
        """
        Process frame with face detection and return annotated frame plus detection data.
        
        Args:
            frame: Input frame
            
        Returns:
            Tuple[np.ndarray, List[Dict]]: (annotated_frame, detections_data)
        """
        if frame is None:
            return frame, []
        
        # Detect faces
        detections = self.detect_faces_in_frame(frame)
        
        # Create annotated frame
        annotated_frame = frame.copy()
        detections_data = []
        
        for detection in detections:
            x1, y1, x2, y2 = detection.bbox
            
            # Determine color based on status
            if detection.is_analyzing:
                color = (0, 255, 255)  # Yellow for analyzing
                label = "Analyzing..."
            elif detection.name:
                color = (0, 255, 0)  # Green for recognized
                label = f"{detection.name} ({detection.similarity:.2f})"
            else:
                color = (0, 0, 255)  # Red for unknown
                label = "Unknown"
            
            # Draw bounding box
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label background
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            cv2.rectangle(annotated_frame, (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0], y1), color, -1)
            
            # Draw label text
            cv2.putText(annotated_frame, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Prepare detection data for frontend (ensure JSON serializable)
            detection_data = {
                'bbox': [int(x) for x in detection.bbox],  # Ensure Python ints
                'confidence': float(detection.confidence),  # Ensure Python float
                'name': detection.name,
                'similarity': float(detection.similarity) if detection.similarity else 0.0,
                'is_analyzing': bool(detection.is_analyzing)
            }
            detections_data.append(detection_data)
        
        return annotated_frame, detections_data
    
    def get_frame_with_detections(self) -> Tuple[bool, Optional[np.ndarray], List[Dict]]:
        """
        Get current frame with face detections.
        
        Returns:
            Tuple[bool, np.ndarray, List[Dict]]: (success, annotated_frame, detections)
        """
        ret, frame = self.capture_frame()
        if not ret or frame is None:
            return False, None, []
        
        annotated_frame, detections = self.process_frame_with_analysis(frame)
        return True, annotated_frame, detections


# Global webcam instance
_webcam_instance = None

def get_webcam_instance() -> WebcamFaceRecognition:
    """Get the global webcam instance."""
    global _webcam_instance
    if _webcam_instance is None:
        _webcam_instance = WebcamFaceRecognition()
    return _webcam_instance

def start_webcam_recognition(camera_index: int = 0) -> bool:
    """Start webcam recognition."""
    webcam = get_webcam_instance()
    return webcam.start_webcam(camera_index)

def stop_webcam_recognition():
    """Stop webcam recognition."""
    global _webcam_instance
    if _webcam_instance:
        _webcam_instance.stop_webcam()
        _webcam_instance = None
