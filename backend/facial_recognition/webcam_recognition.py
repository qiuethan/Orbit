"""
Real-time webcam facial recognition module.
Captures video from webcam, detects faces, and runs analysis pipeline.
"""

import cv2
import numpy as np
import json
import time
import logging
import os
from typing import Dict, List, Optional, Tuple, Any
import threading
import queue
from dataclasses import dataclass
from datetime import datetime

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
        
        # Search queue and threading for unknown person searches
        self.search_queue = queue.Queue()  # No size limit for search requests
        self.search_thread = None
        
        # Face tracking/presence
        self.tracked_faces = {}  # legacy cooldown per face_key
        self.face_analysis_status = {}  # analysis status per face_key
        self.analysis_cooldown = 1.0  # Seconds before re-analyzing same area (per request)
        self.next_track_id = 1
        self.active_tracks = {}  # track_id -> {bbox, last_seen, name, similarity, recognized}
        self.track_timeout = 1.5  # seconds without seeing -> consider left
        self.presence_events = []  # buffered presence events to emit via SSE
        
        # Frame presence tracking for conversation participants
        self.session_participants = {}  # track_id -> participant info
        self.frame_presence_log = []  # comprehensive log of all frame appearances
        self.session_start_time = None  # when camera session started
        self.total_session_participants = set()  # all unique participants in session
        
        # Unknown person logging
        self.unknown_person_timeout = 5.0  # Log after 5 seconds of being unknown
        self.unknown_tracks = {}  # track_id -> first_unknown_time
        self.logged_unknown_tracks = set()  # track_ids that have already been logged
        self.face_regions = {}  # track_id -> latest face region for search
        
        # Setup log file path, cache directory, and logs directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.unknown_log_path = os.path.join(backend_dir, "unknown_person.txt")
        self.cache_dir = os.path.join(backend_dir, "cache")
        self.logs_dir = os.path.join(backend_dir, "logs")
        
        # Ensure logs directory exists
        os.makedirs(self.logs_dir, exist_ok=True)
        
        # Audio recording setup
        self.audio_recorder = None
        self.is_recording_audio = False
        
        self.logger.info("WebcamFaceRecognition initialized")
        
    def test_search_thread(self):
        """Test method to verify search thread is working."""
        if not self.is_running or not self.search_thread or not self.search_thread.is_alive():
            self.logger.error("Search thread is not running - cannot test")
            return False
            
        # Create a dummy search request
        import numpy as np
        dummy_face = np.zeros((50, 50, 3), dtype=np.uint8)
        test_data = {
            'track_id': 999,
            'face_region': dummy_face
        }
        
        try:
            self.search_queue.put(test_data, block=False)
            self.logger.info("✅ Test search request queued successfully")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to queue test search request: {e}")
            return False
    
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
            
            # Initialize session tracking
            self.session_start_time = datetime.now()
            self._initialize_session_tracking()
            
            # Start analysis worker thread
            self.analysis_thread = threading.Thread(target=self._analysis_worker, daemon=True)
            self.analysis_thread.start()
            
            # Start search worker thread
            self.search_thread = threading.Thread(target=self._search_worker, daemon=True)
            self.search_thread.start()
            
            # Verify threads started
            time.sleep(0.1)  # Give threads a moment to start
            if self.analysis_thread.is_alive():
                self.logger.info("✅ Analysis thread is running")
            else:
                self.logger.error("❌ Analysis thread failed to start")
                
            if self.search_thread.is_alive():
                self.logger.info("✅ Search thread is running")
            else:
                self.logger.error("❌ Search thread failed to start")
            
            # Start audio recording
            self._start_audio_recording()
            
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
            
        if self.search_thread:
            self.search_thread.join(timeout=2.0)
        
        # Stop audio recording
        self._stop_audio_recording()
        
        # Finalize session tracking and save comprehensive log
        self._finalize_session_tracking()
        
        # Automatically process conversation integration
        self._process_conversation_integration()
            
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
    
    def _initialize_session_tracking(self):
        """
        Initialize session tracking when camera starts.
        """
        try:
            # Clear previous session data
            self.session_participants = {}
            self.frame_presence_log = []
            self.total_session_participants = set()
            
            # Log session start
            session_info = {
                "event": "session_start",
                "timestamp": self.session_start_time.isoformat(),
                "session_id": self.session_start_time.strftime("%Y%m%d_%H%M%S"),
                "message": "Camera session started - tracking all frame appearances"
            }
            
            self.frame_presence_log.append(session_info)
            
            # Write initial log entry
            timestamp = self.session_start_time.strftime("%Y-%m-%d %H:%M:%S")
            initial_entry = f"[{timestamp}] FRAME PRESENCE TRACKING SESSION STARTED\n"
            
            with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                f.write(initial_entry)
            
            self.logger.info("🎬 Frame presence tracking session initialized")
            
        except Exception as e:
            self.logger.error(f"❌ Error initializing session tracking: {e}")
    
    def _finalize_session_tracking(self):
        """
        Finalize session tracking and save comprehensive log when camera stops.
        """
        try:
            if self.session_start_time is None:
                return
            
            session_end_time = datetime.now()
            session_duration = (session_end_time - self.session_start_time).total_seconds()
            
            # Final session info
            session_summary = {
                "event": "session_end",
                "timestamp": session_end_time.isoformat(),
                "session_duration_seconds": session_duration,
                "total_unique_participants": len(self.total_session_participants),
                "participant_details": dict(self.session_participants),
                "message": f"Camera session ended after {session_duration:.1f} seconds with {len(self.total_session_participants)} unique participants"
            }
            
            self.frame_presence_log.append(session_summary)
            
            # Save comprehensive session log
            self._save_session_presence_log()
            
            # Write summary to unknown person log
            timestamp = session_end_time.strftime("%Y-%m-%d %H:%M:%S")
            summary_entry = f"[{timestamp}] FRAME PRESENCE SESSION ENDED - Duration: {session_duration:.1f}s, Participants: {len(self.total_session_participants)}\n"
            
            # List all participants
            for track_id in self.total_session_participants:
                participant = self.session_participants.get(track_id, {})
                name = participant.get('name', 'Unknown')
                total_time = participant.get('total_presence_time', 0)
                appearances = participant.get('appearance_count', 0)
                participant_entry = f"[{timestamp}] Participant {track_id}: {name} - {total_time:.1f}s total, {appearances} appearances\n"
                summary_entry += participant_entry
            
            with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                f.write(summary_entry)
            
            self.logger.info(f"🎬 Frame presence tracking session finalized: {len(self.total_session_participants)} participants, {session_duration:.1f}s duration")
            
        except Exception as e:
            self.logger.error(f"❌ Error finalizing session tracking: {e}")
    
    def _save_session_presence_log(self):
        """
        Save comprehensive session presence log to file.
        """
        try:
            session_id = self.session_start_time.strftime("%Y%m%d_%H%M%S") if self.session_start_time else "unknown"
            log_filename = f"frame_presence_session_{session_id}.json"
            log_path = os.path.join(self.logs_dir, log_filename)
            
            # Create comprehensive log data
            log_data = {
                "session_metadata": {
                    "session_id": session_id,
                    "start_time": self.session_start_time.isoformat() if self.session_start_time else None,
                    "end_time": datetime.now().isoformat(),
                    "duration_seconds": (datetime.now() - self.session_start_time).total_seconds() if self.session_start_time else 0,
                    "total_unique_participants": len(self.total_session_participants),
                    "log_type": "frame_presence_tracking"
                },
                "participants_summary": dict(self.session_participants),
                "frame_presence_events": self.frame_presence_log,
                "participant_statistics": self._calculate_participant_statistics()
            }
            
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(log_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"📁 Session presence log saved: {log_filename}")
            
        except Exception as e:
            self.logger.error(f"❌ Error saving session presence log: {e}")
    
    def _calculate_participant_statistics(self) -> Dict[str, Any]:
        """
        Calculate statistics about participant presence.
        """
        try:
            stats = {
                "total_participants": len(self.total_session_participants),
                "recognized_participants": 0,
                "unknown_participants": 0,
                "average_presence_time": 0.0,
                "most_present_participant": None,
                "total_session_time": (datetime.now() - self.session_start_time).total_seconds() if self.session_start_time else 0
            }
            
            if not self.session_participants:
                return stats
            
            total_presence_time = 0
            max_presence_time = 0
            max_presence_participant = None
            
            for track_id, participant in self.session_participants.items():
                presence_time = participant.get('total_presence_time', 0)
                total_presence_time += presence_time
                
                if presence_time > max_presence_time:
                    max_presence_time = presence_time
                    max_presence_participant = {
                        "track_id": track_id,
                        "name": participant.get('name', 'Unknown'),
                        "total_time": presence_time
                    }
                
                if participant.get('name'):
                    stats["recognized_participants"] += 1
                else:
                    stats["unknown_participants"] += 1
            
            stats["average_presence_time"] = total_presence_time / len(self.session_participants)
            stats["most_present_participant"] = max_presence_participant
            
            return stats
            
        except Exception as e:
            self.logger.error(f"❌ Error calculating participant statistics: {e}")
            return {}
    
    def _track_frame_presence(self, detections_data: List[Dict]):
        """
        Track all users present in the current frame.
        
        Args:
            detections_data: List of detection data from current frame
        """
        try:
            current_time = datetime.now()
            frame_timestamp = current_time.isoformat()
            
            # Track each detected person
            for detection in detections_data:
                track_id = detection.get('track_id')
                if track_id is None:
                    continue
                
                # Add to total session participants
                self.total_session_participants.add(track_id)
                
                # Get or initialize participant info
                if track_id not in self.session_participants:
                    self.session_participants[track_id] = {
                        "track_id": track_id,
                        "name": None,
                        "first_seen": frame_timestamp,
                        "last_seen": frame_timestamp,
                        "total_presence_time": 0.0,
                        "appearance_count": 1,
                        "recognition_status": "unknown",
                        "similarity_scores": [],
                        "cache_id": None
                    }
                    
                    # Log new participant appearance
                    presence_event = {
                        "event": "participant_first_appearance",
                        "timestamp": frame_timestamp,
                        "track_id": track_id,
                        "name": detection.get('name'),
                        "recognized": detection.get('recognized', False),
                        "similarity": detection.get('similarity', 0.0)
                    }
                    self.frame_presence_log.append(presence_event)
                    
                    self.logger.info(f"👤 New participant in frame: Track {track_id}")
                
                else:
                    # Update existing participant
                    participant = self.session_participants[track_id]
                    
                    # Calculate time since last seen
                    try:
                        last_seen_dt = datetime.fromisoformat(participant['last_seen'])
                        time_diff = (current_time - last_seen_dt).total_seconds()
                        
                        # If they were away for more than track_timeout, count as new appearance
                        if time_diff > self.track_timeout:
                            participant['appearance_count'] += 1
                            
                            reappearance_event = {
                                "event": "participant_reappeared",
                                "timestamp": frame_timestamp,
                                "track_id": track_id,
                                "name": detection.get('name'),
                                "away_duration": time_diff
                            }
                            self.frame_presence_log.append(reappearance_event)
                            
                        # Add to total presence time
                        participant['total_presence_time'] += min(time_diff, 1.0)  # Cap at 1 second per frame
                        
                    except Exception:
                        # Fallback if timestamp parsing fails
                        participant['total_presence_time'] += 0.1
                
                # Update participant info
                participant = self.session_participants[track_id]
                participant['last_seen'] = frame_timestamp
                
                # Update recognition info if available
                if detection.get('name'):
                    if participant['name'] != detection['name']:
                        # Recognition status changed
                        recognition_event = {
                            "event": "participant_recognized",
                            "timestamp": frame_timestamp,
                            "track_id": track_id,
                            "previous_name": participant['name'],
                            "new_name": detection['name'],
                            "similarity": detection.get('similarity', 0.0)
                        }
                        self.frame_presence_log.append(recognition_event)
                        
                        self.logger.info(f"✅ Participant {track_id} recognized as: {detection['name']}")
                    
                    participant['name'] = detection['name']
                    participant['recognition_status'] = "recognized"
                    
                    # Track similarity scores for analysis
                    similarity = detection.get('similarity', 0.0)
                    if similarity > 0:
                        participant['similarity_scores'].append(similarity)
                        # Keep only last 10 scores
                        participant['similarity_scores'] = participant['similarity_scores'][-10:]
                
                elif detection.get('is_analyzing'):
                    participant['recognition_status'] = "analyzing"
                else:
                    participant['recognition_status'] = "unknown"
            
        except Exception as e:
            self.logger.error(f"❌ Error tracking frame presence: {e}")
    
    def get_session_participants_summary(self) -> Dict[str, Any]:
        """
        Get current session participants summary.
        
        Returns:
            Dict with session participant information
        """
        try:
            if self.session_start_time is None:
                return {"error": "No active session"}
            
            current_duration = (datetime.now() - self.session_start_time).total_seconds()
            
            return {
                "session_active": True,
                "session_duration": current_duration,
                "total_participants": len(self.total_session_participants),
                "current_participants": len([p for p in self.session_participants.values() 
                                           if (datetime.now() - datetime.fromisoformat(p['last_seen'])).total_seconds() <= self.track_timeout]),
                "recognized_participants": len([p for p in self.session_participants.values() if p.get('name')]),
                "participants": dict(self.session_participants),
                "statistics": self._calculate_participant_statistics()
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error getting session summary: {e}")
            return {"error": str(e)}
    
    def _process_conversation_integration(self):
        """
        Process conversation integration after session ends.
        Links conversation topics with participants and updates cache files.
        """
        try:
            if self.session_start_time is None:
                self.logger.warning("⚠️ No session data available for conversation integration")
                return
            
            session_id = self.session_start_time.strftime("%Y%m%d_%H%M%S")
            
            # Give time for transcription to complete
            import time
            time.sleep(5)  # Wait longer for transcription to finish
            
            self.logger.info("🔗 Starting conversation integration...")
            
            # Import and run conversation integration
            try:
                from conversation_integration import process_conversation_session
                
                result = process_conversation_session(session_id)
                
                if result["success"]:
                    self.logger.info(f"✅ Conversation integration completed successfully")
                    self.logger.info(f"📝 Topics extracted: {', '.join(result['conversation_topics'][:3])}...")
                    self.logger.info(f"👥 Participants updated: {result['participants_processed']}")
                    
                    # Log to unknown person file for visibility
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    integration_entry = f"[{timestamp}] CONVERSATION INTEGRATION COMPLETED - Topics: {len(result['conversation_topics'])}, Updated: {result['participants_processed']} participants\n"
                    
                    for participant in result["updated_participants"]:
                        participant_entry = f"[{timestamp}] Cache updated for {participant['name']} ({participant['cache_hash']})\n"
                        integration_entry += participant_entry
                    
                    with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                        f.write(integration_entry)
                    
                else:
                    self.logger.warning(f"⚠️ Conversation integration failed: {result['error']}")
                    
                    # Log failure
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    error_entry = f"[{timestamp}] CONVERSATION INTEGRATION FAILED - {result['error']}\n"
                    
                    with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                        f.write(error_entry)
                
            except ImportError as e:
                self.logger.error(f"❌ Failed to import conversation integration: {e}")
            except Exception as e:
                self.logger.error(f"❌ Conversation integration error: {e}")
                
        except Exception as e:
            self.logger.error(f"❌ Error in conversation integration process: {e}")

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
    
    def _search_worker(self):
        """
        Background worker thread for processing image search requests.
        """
        self.logger.info("🔍 Search worker thread started")
        
        while self.is_running:
            try:
                # Get search task from queue
                self.logger.debug("Search worker waiting for tasks...")
                search_data = self.search_queue.get(timeout=1.0)
                
                track_id = search_data['track_id']
                face_region = search_data['face_region']
                
                self.logger.info(f"🔍 Processing search request for Track ID {track_id}")
                
                # Add a small delay to prevent resource conflicts
                time.sleep(0.1)
                
                # Run the image search pipeline (synchronously in this thread)
                try:
                    # For now, let's do a simple test instead of the full pipeline
                    # to see if the thread is working
                    if track_id == 999:  # Test request
                        self.logger.info(f"🧪 Processing test search request for Track ID {track_id}")
                        time.sleep(1)  # Simulate work
                        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        test_log_entry = f"[{timestamp}] Test search completed for Track ID {track_id}\n"
                        with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                            f.write(test_log_entry)
                        self.logger.info(f"✅ Test search completed for Track ID {track_id}")
                    else:
                        # Real search request - run search and update cache
                        result = self._run_image_search_sync(face_region, track_id)
                        
                        if result:
                            # Save detailed search results to logs directory
                            self._save_search_log(track_id, search_data, result)
                            
                            # Always update cache with search results (successful or failed)
                            # This ensures the face image is saved for future recognition
                            cache_hash = self._update_cache_with_search_results(track_id, face_region, result)
                            
                            if cache_hash:
                                # Reload facial recognition cache to include new entry
                                self._reload_facial_recognition_cache()
                                
                                # Notify server about new cache entry
                                self._notify_server_new_cache_entry(cache_hash, track_id)
                                
                                self.logger.info(f"🎯 Complete cache integration successful for Track ID {track_id}")
                            else:
                                self.logger.error(f"❌ Failed to update cache for Track ID {track_id}")
                        else:
                            self.logger.error(f"❌ No search results received for Track ID {track_id}")
                        
                        self.logger.info(f"✅ Search completed for Track ID {track_id}")
                except Exception as search_error:
                    self.logger.error(f"❌ Search failed for Track ID {track_id}: {search_error}")
                    # Log the error to file
                    try:
                        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        error_log_entry = f"[{timestamp}] Search failed for Track ID {track_id} - Error: {str(search_error)}\n"
                        with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                            f.write(error_log_entry)
                    except Exception:
                        pass
                
                # Mark task as done
                self.search_queue.task_done()
                
            except queue.Empty:
                self.logger.debug("Search worker timeout, checking if still running...")
                continue
            except Exception as e:
                self.logger.error(f"Error in search worker: {e}")
                # Continue running even if there's an error
                continue
        
        self.logger.info("🔍 Search worker thread stopped")
    
    def _run_image_search_sync(self, face_region: np.ndarray, track_id: int) -> Optional[Dict]:
        """
        Run synchronous image search pipeline for an unknown person's face.
        This runs in the dedicated search worker thread.
        
        Args:
            face_region: The face image region to search
            track_id: The track ID of the unknown person
            
        Returns:
            Dict: Search pipeline results, or None if failed
        """
        try:
            self.logger.info(f"🔍 Starting search pipeline import for Track ID {track_id}")
            
            # Import pipeline here to avoid circular imports
            import sys
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if backend_dir not in sys.path:
                sys.path.append(backend_dir)
                self.logger.debug(f"Added backend directory to path: {backend_dir}")
            
            try:
                from pipeline import SearchAnalysisPipeline
                self.logger.info(f"✅ Successfully imported SearchAnalysisPipeline for Track ID {track_id}")
            except ImportError as import_error:
                self.logger.error(f"❌ Failed to import SearchAnalysisPipeline: {import_error}")
                raise
            
            self.logger.info(f"🔍 Starting image search for unknown person (Track ID: {track_id})")
            
            # Save the face region to a temporary file for the search pipeline
            temp_image_path = os.path.join(self.cache_dir, f"unknown_track_{track_id}_{int(time.time())}.jpg")
            cv2.imwrite(temp_image_path, face_region)
            
            # Initialize the search pipeline
            pipeline = SearchAnalysisPipeline()
            
            # Run the complete face search pipeline with very conservative settings
            # to prevent blocking and resource issues
            self.logger.info(f"🔍 Initializing search pipeline for Track ID {track_id}")
            result = pipeline.complete_face_search(
                image_input=temp_image_path,
                min_score=85,  # Higher threshold for faster processing
                max_face_results=3,  # Very few results for speed
                max_serp_per_url=2,  # Minimal SERP results
                use_structured_output=True,
                max_working_results=2  # Process very few URLs
            )
            self.logger.info(f"🔍 Search pipeline completed for Track ID {track_id}")
            
            # Save search results (with proper JSON serialization)
            result_path = os.path.join(self.cache_dir, f"unknown_search_{track_id}_{int(time.time())}.json")
            
            # Convert result to JSON-serializable format
            try:
                serializable_result = self._make_json_serializable(result)
                with open(result_path, "w", encoding="utf-8") as f:
                    json.dump(serializable_result, f, indent=2, ensure_ascii=False)
                self.logger.info(f"💾 Search results saved to: {result_path}")
            except Exception as save_error:
                self.logger.error(f"❌ Failed to save search results: {save_error}")
                # Continue without saving file
                pass
            
            # Log the search completion
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if result.get("success") and result.get("analysis", {}).get("found_person"):
                person_info = result["analysis"]["found_person"]
                self.logger.info(f"✅ Search found potential match for Track ID {track_id}: {person_info.get('name', 'Unknown name')}")
                
                # Update log with search results
                search_log_entry = f"[{timestamp}] Search completed for Track ID {track_id} - Found: {person_info.get('name', 'No name')} (Confidence: {person_info.get('confidence', 'Unknown')}) - Adding to cache...\n"
                
                with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                    f.write(search_log_entry)
            else:
                self.logger.info(f"❌ No matches found in search for Track ID {track_id}")
                
                # Log no results
                search_log_entry = f"[{timestamp}] Search completed for Track ID {track_id} - No matches found\n"
                
                with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                    f.write(search_log_entry)
            
            # Clean up temporary image
            try:
                os.remove(temp_image_path)
            except Exception:
                pass
            
            # Return the search results
            return result
                
        except Exception as e:
            self.logger.error(f"Error in image search for Track ID {track_id}: {e}")
            
            # Log the error
            try:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                error_log_entry = f"[{timestamp}] Search failed for Track ID {track_id} - Error: {str(e)}\n"
                
                with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                    f.write(error_log_entry)
            except Exception:
                pass
            
            # Return None on error
            return None
    
    def _log_unknown_person(self, track_id: int):
        """
        Log an unknown person to the log file and trigger async image search.
        
        Args:
            track_id: The track ID of the unknown person
        """
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] Unknown person detected (Track ID: {track_id}) - present for 5+ seconds\n"
            
            with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                f.write(log_entry)
            
            self.logger.info(f"Logged unknown person: Track ID {track_id}")
            
            # Queue image search if we have a face region
            if track_id in self.face_regions:
                face_region = self.face_regions[track_id]
                
                # Log search initiation to the file
                search_start_entry = f"[{timestamp}] Starting image search for Track ID {track_id}...\n"
                with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                    f.write(search_start_entry)
                
                # Queue the search request (non-blocking)
                search_data = {
                    'track_id': track_id,
                    'face_region': face_region.copy()  # Make a copy to avoid race conditions
                }
                
                try:
                    self.search_queue.put(search_data, block=False)
                    queue_size = self.search_queue.qsize()
                    self.logger.info(f"🚀 Queued image search for Track ID {track_id} (queue size: {queue_size})")
                    
                    # Log queue status to file as well
                    queue_log_entry = f"[{timestamp}] Search queued for Track ID {track_id} (queue size: {queue_size})\n"
                    with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                        f.write(queue_log_entry)
                        
                except queue.Full:
                    self.logger.warning(f"Search queue is full, skipping search for Track ID {track_id}")
                    # Log queue full
                    queue_full_entry = f"[{timestamp}] Search queue full for Track ID {track_id} - search skipped\n"
                    with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                        f.write(queue_full_entry)
            else:
                self.logger.warning(f"No face region available for Track ID {track_id} - skipping search")
                
                # Log that search was skipped
                skip_entry = f"[{timestamp}] Search skipped for Track ID {track_id} - No face region available\n"
                with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                    f.write(skip_entry)
            
        except Exception as e:
            self.logger.error(f"Error logging unknown person: {e}")
    
    def _make_json_serializable(self, obj):
        """
        Convert objects to JSON-serializable format.
        
        Args:
            obj: Object to convert
            
        Returns:
            JSON-serializable version of the object
        """
        if hasattr(obj, '__dict__'):
            # Convert custom objects to dictionaries
            result = {}
            for key, value in obj.__dict__.items():
                try:
                    # Recursively make nested objects serializable
                    result[key] = self._make_json_serializable(value)
                except Exception:
                    # If we can't serialize it, convert to string
                    result[key] = str(value)
            return result
        elif isinstance(obj, dict):
            # Process dictionaries recursively
            return {key: self._make_json_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, (list, tuple)):
            # Process lists/tuples recursively
            return [self._make_json_serializable(item) for item in obj]
        elif isinstance(obj, (str, int, float, bool, type(None))):
            # Already JSON serializable
            return obj
        else:
            # Convert everything else to string
            return str(obj)
    
    def _update_cache_with_search_results(self, track_id: int, face_region: np.ndarray, result: Dict) -> Optional[str]:
        """
        Update the facial recognition cache with search results (successful or failed).
        Always saves the face image so it can be recognized later.
        
        Args:
            track_id: The track ID of the unknown person
            face_region: The face image region
            result: The search pipeline results
            
        Returns:
            Hash name of the cached entry, or None if failed
        """
        try:
            # Generate hash name for cache (using timestamp and track_id for uniqueness)
            import hashlib
            unique_string = f"unknown_search_{track_id}_{int(time.time())}"
            hash_name = hashlib.md5(unique_string.encode()).hexdigest()
            
            # Always save the face image, even if search failed
            image_path = os.path.join(self.cache_dir, f"{hash_name}.jpg")
            cv2.imwrite(image_path, face_region)
            self.logger.info(f"💾 Saved face image to cache: {hash_name}.jpg")
            
            # Check if we found a person in the search results
            search_successful = result.get("success") and result.get("analysis", {}).get("found_person")
            
            if search_successful:
                person_info = result["analysis"]["found_person"]
                person_name = person_info.get("name", f"Unknown_Track_{track_id}")
                
                self.logger.info(f"🔄 Updating cache with successful search results for {person_name} (Track ID: {track_id})")
                
                # Create structured cache data with search results
                cache_data = {
                    "request_id": hash_name,
                    "cached_at": datetime.now().isoformat(),
                    "source": "unknown_person_search",
                    "track_id": track_id,
                    "search_status": "successful",
                    "person_analysis": {
                        "personal_info": {
                            "full_name": person_name,
                            "description": person_info.get("description", ""),
                            "confidence": person_info.get("confidence", "unknown"),
                            "source": "facial_search_pipeline"
                        }
                    },
                    "search_metadata": {
                        "face_search_results": result.get("face_results", []),
                        "serp_search_summary": result.get("serp_results", {}),
                        "search_timestamp": datetime.now().isoformat(),
                        "pipeline_version": "unknown_person_search"
                    }
                }
                
                # If we have structured LLM analysis, include it
                if result.get("analysis", {}).get("structured_data"):
                    cache_data["llm_analysis"] = {
                        "structured_data": result["analysis"]["structured_data"],
                        "provider": result.get("analysis", {}).get("provider", "unknown"),
                        "model": result.get("analysis", {}).get("model", "unknown")
                    }
            else:
                # Search failed, but still create a cache entry for the face
                error_message = result.get("error", "Search failed - unknown reason")
                person_name = f"Unknown_Track_{track_id}"
                
                self.logger.info(f"🔄 Creating cache entry for failed search (Track ID: {track_id}): {error_message}")
                
                cache_data = {
                    "request_id": hash_name,
                    "cached_at": datetime.now().isoformat(),
                    "source": "unknown_person_search",
                    "track_id": track_id,
                    "search_status": "failed",
                    "person_analysis": {
                        "personal_info": {
                            "full_name": person_name,
                            "description": f"Face detected but search failed: {error_message}",
                            "confidence": "low",
                            "source": "facial_detection_only"
                        }
                    },
                    "search_metadata": {
                        "search_error": error_message,
                        "search_timestamp": datetime.now().isoformat(),
                        "pipeline_version": "unknown_person_search",
                        "note": "Image saved for future recognition even though search failed"
                    }
                }
            
            # Save JSON to cache directory
            json_path = os.path.join(self.cache_dir, f"{hash_name}.json")
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(cache_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"💾 Saved cache JSON: {hash_name}.json")
            self.logger.info(f"✅ Cache updated successfully for {person_name} (Status: {cache_data['search_status']})")
            
            return hash_name
            
        except Exception as e:
            self.logger.error(f"❌ Failed to update cache for Track ID {track_id}: {e}")
            return None
    
    def _reload_facial_recognition_cache(self):
        """
        Reload the facial recognition cache to include new entries.
        """
        try:
            self.logger.info("🔄 Reloading facial recognition cache...")
            self.face_module.load_cached_faces()
            self.logger.info(f"✅ Cache reloaded, now contains {len(self.face_module.known_faces)} faces")
        except Exception as e:
            self.logger.error(f"❌ Failed to reload facial recognition cache: {e}")
    
    def _notify_server_new_cache_entry(self, cache_hash: str, track_id: int):
        """
        Notify the server about a new cache entry so it can be included in listings.
        
        Args:
            cache_hash: The hash name of the new cache entry
            track_id: The track ID of the unknown person
        """
        try:
            # For now, we'll use a simple log-based notification
            # In a more advanced system, this could be a WebSocket message or API call
            
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            notification_entry = f"[{timestamp}] New cache entry added: {cache_hash}.jpg/.json for Track ID {track_id}\n"
            
            with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                f.write(notification_entry)
            
            self.logger.info(f"📢 Server notified of new cache entry: {cache_hash}")
            
            # TODO: In the future, this could trigger:
            # - WebSocket broadcast to connected clients
            # - Cache invalidation for /list endpoint
            # - Real-time UI updates
            
        except Exception as e:
            self.logger.error(f"❌ Failed to notify server of new cache entry: {e}")
    
    def _start_audio_recording(self):
        """
        Start audio recording when webcam starts.
        Saves audio without transcription to recorded_conversations directory.
        """
        try:
            # Import AudioRecorder
            from recording.recorder import AudioRecorder
            
            # Initialize audio recorder with automatic transcription
            self.audio_recorder = AudioRecorder(
                output_dir="recorded_conversations", 
                auto_transcribe=True,  # Enable automatic transcription
                keep_audio=True  # Keep the audio file
            )
            
            # Start recording with webcam session title
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            title = f"Webcam_Session_{timestamp}"
            
            result = self.audio_recorder.start(title=title)
            
            if result.get("success"):
                self.is_recording_audio = True
                self.logger.info(f"🎙️ Audio recording started: {title}")
            else:
                error = result.get("error", "Unknown error")
                self.logger.warning(f"⚠️ Failed to start audio recording: {error}")
                self.audio_recorder = None
                
        except Exception as e:
            self.logger.error(f"❌ Error starting audio recording: {e}")
            self.audio_recorder = None
    
    def _stop_audio_recording(self):
        """
        Stop audio recording when webcam stops. 
        AudioRecorder will automatically transcribe with Whisper Large Turbo.
        """
        try:
            if self.audio_recorder and self.is_recording_audio:
                result = self.audio_recorder.stop()
                
                if result.get("success"):
                    self.logger.info(f"🎙️ Audio recording stopped successfully")
                    
                    # Log session summary to unknown person log
                    duration = result.get("duration_seconds", 0)
                    filepath = result.get("session", {}).get("filepath", "")
                    transcription = result.get("transcription", {})
                    
                    self.logger.info(f"📁 Audio saved to: {filepath}")
                    self.logger.info(f"⏱️ Duration: {duration:.1f} seconds")
                    
                    # Log transcription status
                    if transcription and transcription.get("success"):
                        word_count = transcription.get("word_count", 0)
                        language = transcription.get("language", "unknown")
                        self.logger.info(f"✅ Auto-transcription complete: {word_count} words ({language})")
                        
                        # Log to unknown person file
                        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        session_summary = f"[{timestamp}] Webcam session completed - Duration: {duration:.1f}s, Transcription: {word_count} words ({language})\n"
                        
                        with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                            f.write(session_summary)
                    else:
                        transcription_error = transcription.get("error", "Unknown error") if transcription else "No transcription attempted"
                        self.logger.warning(f"⚠️ Auto-transcription failed: {transcription_error}")
                        
                        # Log transcription failure
                        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        error_entry = f"[{timestamp}] Webcam session completed - Duration: {duration:.1f}s, Transcription failed: {transcription_error}\n"
                        
                        with open(self.unknown_log_path, "a", encoding="utf-8") as f:
                            f.write(error_entry)
                else:
                    error = result.get("error", "Unknown error")
                    self.logger.warning(f"⚠️ Error stopping audio recording: {error}")
                
                self.is_recording_audio = False
                self.audio_recorder = None
            else:
                self.logger.debug("No active audio recording to stop")
                
        except Exception as e:
            self.logger.error(f"❌ Error stopping audio recording: {e}")
            self.is_recording_audio = False
            self.audio_recorder = None
    
    
    def get_audio_recording_status(self) -> Dict[str, Any]:
        """
        Get the current audio recording status.
        
        Returns:
            Dict with recording status information
        """
        if self.is_recording_audio and self.audio_recorder:
            return {
                "is_recording": True,
                "session": self.audio_recorder.current_session if self.audio_recorder.current_session else None,
                "status": "Recording audio..."
            }
        else:
            return {
                "is_recording": False,
                "session": None,
                "status": "Audio recording inactive"
            }
    
    def get_available_audio_devices(self) -> Dict[str, Any]:
        """
        Get information about available audio input devices and their capabilities.
        
        Returns:
            Dict with device information and supported sample rates
        """
        try:
            import sounddevice as sd
            
            devices = sd.query_devices()
            hostapis = sd.query_hostapis()
            
            input_devices = []
            for i, device in enumerate(devices):
                if device['max_input_channels'] > 0:
                    # Test supported sample rates
                    supported_rates = []
                    test_rates = [16000, 22050, 44100, 48000, 96000]
                    
                    for rate in test_rates:
                        try:
                            sd.check_input_settings(
                                device=i,
                                channels=min(device['max_input_channels'], 2),
                                samplerate=rate
                            )
                            supported_rates.append(rate)
                        except:
                            continue
                    
                    input_devices.append({
                        'index': i,
                        'name': device['name'],
                        'max_input_channels': device['max_input_channels'],
                        'default_samplerate': device['default_samplerate'],
                        'supported_rates': supported_rates,
                        'hostapi': hostapis[device['hostapi']]['name'] if device['hostapi'] < len(hostapis) else 'Unknown'
                    })
            
            default_device = sd.default.device[0] if sd.default.device else None
            
            return {
                "success": True,
                "default_input_device": default_device,
                "input_devices": input_devices,
                "recommended_settings": {
                    "high_quality": {"sample_rate": 48000, "channels": 2},
                    "standard_quality": {"sample_rate": 44100, "channels": 2},
                    "speech_quality": {"sample_rate": 16000, "channels": 1}
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to query audio devices: {e}",
                "input_devices": []
            }
    
    def _save_search_log(self, track_id: int, search_data: Dict, result: Dict) -> str:
        """
        Save search results to logs directory similar to pipeline logging.
        
        Args:
            track_id: The track ID of the unknown person
            search_data: The original search request data
            result: The search pipeline results
            
        Returns:
            Filename where data was saved
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = os.path.join(self.logs_dir, f"unknown_search_log_{timestamp}_track_{track_id}.json")
            
            # Create comprehensive log data
            log_data = {
                "timestamp": datetime.now().isoformat(),
                "event_type": "unknown_person_search",
                "track_id": track_id,
                "search_request": {
                    "track_id": track_id,
                    "face_region_shape": search_data.get('face_region', np.array([])).shape if 'face_region' in search_data else None,
                    "initiated_at": timestamp
                },
                "search_results": self._make_json_serializable(result),
                "metadata": {
                    "pipeline_version": "unknown_person_search",
                    "search_parameters": {
                        "min_score": 85,
                        "max_face_results": 3,
                        "max_serp_per_url": 2,
                        "max_working_results": 2
                    }
                }
            }
            
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(log_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"📁 Search results logged to: {filename}")
            return filename
            
        except Exception as e:
            self.logger.error(f"⚠️ Failed to save search log: {e}")
            return ""
    
    def _check_unknown_person_timeout(self):
        """
        Check if any unknown persons have been present for longer than the timeout period.
        Log them if they haven't been logged already.
        """
        current_time = time.time()
        
        for track_id, first_unknown_time in list(self.unknown_tracks.items()):
            # Check if this track has been unknown for more than the timeout
            if (current_time - first_unknown_time >= self.unknown_person_timeout and 
                track_id not in self.logged_unknown_tracks):
                
                # Log this unknown person
                self._log_unknown_person(track_id)
                self.logged_unknown_tracks.add(track_id)
    
    def _update_unknown_person_tracking(self, detections_data: List[Dict], frame: np.ndarray):
        """
        Update unknown person tracking based on current detections and capture face regions.
        
        Args:
            detections_data: List of detection data dictionaries
            frame: Current video frame for face region extraction
        """
        current_time = time.time()
        current_track_ids = set()
        
        for detection in detections_data:
            track_id = detection.get('track_id')
            if track_id is None:
                continue
                
            current_track_ids.add(track_id)
            
            # Check if person is recognized (has a name and is not analyzing)
            is_recognized = (detection.get('recognized', False) and 
                           detection.get('name') is not None and 
                           not detection.get('is_analyzing', False))
            
            if is_recognized:
                # Person is recognized, remove from unknown tracking
                if track_id in self.unknown_tracks:
                    del self.unknown_tracks[track_id]
                # Also remove from logged set when they become recognized
                self.logged_unknown_tracks.discard(track_id)
                # Remove face region since no longer needed
                if track_id in self.face_regions:
                    del self.face_regions[track_id]
            else:
                # Person is unknown or still analyzing
                if track_id not in self.unknown_tracks:
                    # First time seeing this person as unknown
                    self.unknown_tracks[track_id] = current_time
                    self.logger.debug(f"Started tracking unknown person: Track ID {track_id}")
                
                # Capture and store face region for potential search
                bbox = detection.get('bbox')
                if bbox and len(bbox) == 4:
                    x1, y1, x2, y2 = bbox
                    # Ensure coordinates are within frame bounds
                    h, w = frame.shape[:2]
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(w, x2), min(h, y2)
                    
                    if x2 > x1 and y2 > y1:
                        face_region = frame[y1:y2, x1:x2]
                        if face_region.size > 0:
                            self.face_regions[track_id] = face_region.copy()
        
        # Clean up unknown tracks for people who are no longer detected
        tracks_to_remove = []
        for track_id in self.unknown_tracks:
            if track_id not in current_track_ids:
                tracks_to_remove.append(track_id)
        
        for track_id in tracks_to_remove:
            del self.unknown_tracks[track_id]
            self.logged_unknown_tracks.discard(track_id)
            # Clean up face region
            if track_id in self.face_regions:
                del self.face_regions[track_id]
            self.logger.debug(f"Stopped tracking unknown person: Track ID {track_id} (no longer detected)")
    
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
        
        # Check for unknown person timeouts
        self._check_unknown_person_timeout()
        
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
        
        # Update unknown person tracking based on current detections
        self._update_unknown_person_tracking(detections_data, frame)
        
        # Track frame presence for all participants
        self._track_frame_presence(detections_data)
        
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
                # Also clean up unknown person tracking
                if tid in self.unknown_tracks:
                    del self.unknown_tracks[tid]
                self.logged_unknown_tracks.discard(tid)
                # Clean up face regions
                if tid in self.face_regions:
                    del self.face_regions[tid]
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
    
    def get_frame_presence_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive frame presence summary for logging purposes.
        This is the main method to get all users who appeared in frames.
        
        Returns:
            Dict with all frame presence data
        """
        return self.get_session_participants_summary()
    
    def export_session_participants_for_conversation_linking(self) -> List[str]:
        """
        Export participant identifiers for conversation linking.
        
        Returns:
            List of participant identifiers (names or track_ids) who appeared in session
        """
        try:
            participants = []
            
            for track_id, participant in self.session_participants.items():
                # Prefer name if recognized, otherwise use track_id
                if participant.get('name'):
                    participants.append(participant['name'])
                else:
                    participants.append(f"Track_{track_id}")
            
            return participants
            
        except Exception as e:
            self.logger.error(f"❌ Error exporting participants for conversation linking: {e}")
            return []


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
