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
    track_id: Optional[int] = None

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
            recognition_threshold=0.7,
            cache_path=cache_dir,
            model_name="buffalo_sc",
            prefer_deepface=True
        )
        
        # Webcam setup
        self.cap = None
        self.is_running = False
        
        # Analysis queue and threading
        self.analysis_queue = queue.Queue(maxsize=3)  # Limit queue size
        self.analysis_thread = None
        self.analysis_results = {}  # Cache for analysis results
        
        # Face tracking/presence
        self.tracked_faces = {}  # legacy cooldown per face_key
        self.face_analysis_status = {}  # analysis status per face_key
        self.analysis_cooldown = 1.0  # Seconds before re-analyzing same area (per request)
        self.next_track_id = 1
        self.active_tracks = {}  # track_id -> {bbox, last_seen, name, similarity, recognized}
        self.track_timeout = 1.5  # seconds without seeing -> consider left
        self.presence_events = []  # buffered presence events to emit via SSE
        
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
            
            # Assign tracks based on IoU/centroid distance
            detected_bboxes = []
            for face in faces:
                detected_bboxes.append([int(x) for x in face.bbox.astype(int)])
            assignments = self._assign_tracks(detected_bboxes)

            for i, face in enumerate(faces):
                # Get bounding box (ensure Python native types)
                bbox = [int(x) for x in face.bbox.astype(int)]  # [x1, y1, x2, y2]
                confidence = float(face.det_score) if hasattr(face, 'det_score') else 0.0
                
                # Create face detection (already converted to Python types)
                detection = FaceDetection(
                    bbox=bbox,  # Already converted to Python ints
                    confidence=confidence  # Already converted to Python float
                )
                
                # Track assignment
                track_id = assignments.get(i)
                face_id = f"track_{track_id}" if track_id is not None else f"face_{i}"
                detection.track_id = track_id
                
                # Check if we have a result for this face
                last_analysis = self.tracked_faces.get(face_id, 0)
                # Attach previous result if exists
                if face_id in self.analysis_results:
                    result = self.analysis_results[face_id]
                    detection.name = result.get('name')
                    detection.json_path = result.get('json_path') 
                    detection.similarity = float(result.get('similarity', 0.0))
                    detection.is_analyzing = False
                    self.logger.debug(f"Face {face_id} has result: {detection.name} ({detection.similarity:.2f})")
                if face_id in self.face_analysis_status:
                    # Analysis is in progress
                    detection.is_analyzing = True
                    self.logger.debug(f"Face {face_id} is being analyzed...")
                # Re-analyze every cooldown seconds regardless of previous result
                if current_time - last_analysis > self.analysis_cooldown:
                    self._queue_face_for_analysis(face_id, frame, face, bbox)
                    detection.is_analyzing = True
                    self.face_analysis_status[face_id] = current_time
                    self.tracked_faces[face_id] = current_time
                    self.logger.info(f"Queuing face {face_id} for analysis (periodic)")
                else:
                    self.logger.debug(f"Face {face_id} cooldown: {(current_time - last_analysis):.1f}s < {self.analysis_cooldown}s")
                
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
                
                # Prefer DeepFace image-to-image verify across the cache for highest accuracy
                try:
                    match_name, score, json_path, verified = self.face_module.compare_face_with_cached_images(face_region)
                    # If verified but label is a hash, translate to display name
                    if verified and match_name and match_name in self.face_module.known_faces:
                        dn = self.face_module.known_faces[match_name].get('display_name')
                        if dn:
                            match_name = dn
                except Exception as e:
                    self.logger.error(f"DeepFace compare error: {e}")
                    match_name, score, json_path, verified = None, 0.0, None, False

                # If DeepFace did not verify, fall back to embedding similarity (InsightFace)
                if not verified:
                    try:
                        person_id, similarity, json_path_fallback = self.face_module.compare_embedding_with_cached_faces(face_embedding)
                        # keep the better score
                        if similarity > score:
                            # Map hash/person_id to display name if available
                            if person_id and person_id in self.face_module.known_faces:
                                display_name = self.face_module.known_faces[person_id].get('display_name')
                                match_name = display_name or person_id
                            else:
                                match_name = person_id
                            score = similarity
                            json_path = json_path_fallback
                            verified = bool(person_id and similarity >= self.face_module.recognition_threshold)
                    except Exception as e:
                        self.logger.debug(f"Embedding fallback compare failed: {e}")

                # Prepare result; only set name if verified; keep similarity for UI
                result = {
                    'name': match_name if verified else None,
                    'similarity': float(score),
                    'json_path': json_path
                }
                
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
        
        # Do not draw overlays on backend; return raw frame and data only
        annotated_frame = frame
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
            
            # Backend no longer draws; frontend overlays boxes/labels
            
            # Prepare detection data for frontend (ensure JSON serializable)
            # Determine recognition state
            recognized = bool(detection.name and detection.similarity and detection.similarity >= 0.7)

            detection_data = {
                'bbox': [int(x) for x in detection.bbox],  # Ensure Python ints
                'confidence': float(detection.confidence),  # Ensure Python float
                'name': detection.name,
                'similarity': float(detection.similarity) if detection.similarity else 0.0,
                'is_analyzing': bool(detection.is_analyzing),
                'recognized': recognized,
                'track_id': int(detection.track_id) if detection.track_id is not None else None
            }
            detections_data.append(detection_data)
        
        return annotated_frame, detections_data

    def _assign_tracks(self, bboxes: List[List[int]]) -> Dict[int, int]:
        """
        Assign detected bboxes to existing tracks using IoU and centroid distance.
        Returns mapping: detection_index -> track_id. Emits 'entered'/'left' presence events.
        """
        current_time = time.time()
        assignments: Dict[int, int] = {}
        used_tracks: set[int] = set()

        # Build simple cost matrix using 1 - IoU (prefer high IoU) with fallback to center distance
        def iou(boxA, boxB):
            xA = max(boxA[0], boxB[0]); yA = max(boxA[1], boxB[1])
            xB = min(boxA[2], boxB[2]); yB = min(boxA[3], boxB[3])
            inter = max(0, xB - xA) * max(0, yB - yA)
            areaA = max(0, boxA[2]-boxA[0]) * max(0, boxA[3]-boxA[1])
            areaB = max(0, boxB[2]-boxB[0]) * max(0, boxB[3]-boxB[1])
            union = areaA + areaB - inter
            return inter / union if union > 0 else 0.0

        # Try greedy matching to existing tracks
        track_items = list(self.active_tracks.items())
        for det_idx, box in enumerate(bboxes):
            best_track = None
            best_score = -1.0
            for track_id, t in track_items:
                if track_id in used_tracks:
                    continue
                score = iou(box, t['bbox'])
                if score > best_score:
                    best_score = score
                    best_track = track_id
            # Accept match if IoU high enough or centers close
            def center(b):
                return ((b[0]+b[2])//2, (b[1]+b[3])//2)
            cx, cy = center(box)
            accepted = False
            if best_track is not None and best_score >= 0.3:
                accepted = True
            else:
                # Fallback to nearest center distance
                min_dist = 1e9; min_track = None
                for track_id, t in track_items:
                    if track_id in used_tracks:
                        continue
                    tx, ty = center(t['bbox'])
                    d = (tx - cx)**2 + (ty - cy)**2
                    if d < min_dist:
                        min_dist = d; min_track = track_id
                if min_track is not None and min_dist <= (120**2):
                    best_track = min_track
                    accepted = True
            if accepted and best_track is not None:
                assignments[det_idx] = best_track
                used_tracks.add(best_track)
                # Update track
                self.active_tracks[best_track]['bbox'] = box
                self.active_tracks[best_track]['last_seen'] = current_time
            else:
                # New track
                track_id = self.next_track_id
                self.next_track_id += 1
                self.active_tracks[track_id] = {
                    'bbox': box,
                    'last_seen': current_time,
                    'name': None,
                    'similarity': 0.0,
                    'recognized': False
                }
                assignments[det_idx] = track_id
                used_tracks.add(track_id)
                # Presence: entered
                self.presence_events.append({'event': 'entered', 'track_id': track_id, 'timestamp': current_time})

        # Handle tracks that have not been seen recently -> left
        to_delete = []
        for track_id, t in self.active_tracks.items():
            if current_time - t['last_seen'] > self.track_timeout:
                self.presence_events.append({'event': 'left', 'track_id': track_id, 'timestamp': current_time})
                to_delete.append(track_id)
        for tid in to_delete:
            try:
                del self.active_tracks[tid]
            except Exception:
                pass

        return assignments

    def get_presence_events(self) -> List[Dict]:
        """Return and clear pending presence events."""
        events = self.presence_events[:]
        self.presence_events = []
        return events
    
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
