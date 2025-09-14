"""
Conversation Integration Module

Links frame presence participants with conversation topics and updates cache files.
"""

import os
import json
import logging
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

# Import required modules
from facial_recognition.webcam_recognition import get_webcam_instance
from recording.summarizer import summarize_conversation
from conversation_tracker import ConversationTracker

class ConversationCacheIntegrator:
    """Integrates conversation topics with participant cache files."""
    
    def __init__(self):
        """Initialize the conversation cache integrator."""
        self.logger = logging.getLogger("conversation_cache_integrator")
        
        # Setup directories
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        self.cache_dir = os.path.join(backend_dir, "cache")
        self.logs_dir = os.path.join(backend_dir, "logs")
        self.conversations_dir = os.path.join(backend_dir, "recorded_conversations")
        
        # Ensure directories exist
        for directory in [self.cache_dir, self.logs_dir, self.conversations_dir]:
            os.makedirs(directory, exist_ok=True)
        
        self.logger.info("Conversation cache integrator initialized")
    
    def process_session_conversation(self, session_id: str = None) -> Dict[str, Any]:
        """
        Process a conversation session: extract topics and update participant cache files.
        
        Args:
            session_id: Optional session ID. If None, finds the most recent session.
            
        Returns:
            Dict with processing results
        """
        try:
            # Find session data
            if session_id:
                frame_presence_file = os.path.join(self.logs_dir, f"frame_presence_session_{session_id}.json")
                transcript_file = self._find_transcript_file(session_id)
            else:
                # Find most recent session
                frame_presence_file, transcript_file = self._find_most_recent_session()
            
            if not frame_presence_file or not os.path.exists(frame_presence_file):
                return {"success": False, "error": "Frame presence log not found"}
            
            if not transcript_file or not os.path.exists(transcript_file):
                return {"success": False, "error": "Transcript file not found"}
            
            self.logger.info(f"Processing session: {os.path.basename(frame_presence_file)}")
            
            # Load frame presence data
            with open(frame_presence_file, 'r', encoding='utf-8') as f:
                presence_data = json.load(f)
            
            # Extract conversation topics
            topic_result = self._extract_conversation_topics(transcript_file)
            if not topic_result["success"]:
                return {"success": False, "error": f"Failed to extract topics: {topic_result['error']}"}
            
            conversation_topics = topic_result["topics"]
            
            # Get participants from frame presence
            participants = presence_data.get("participants_summary", {})
            session_metadata = presence_data.get("session_metadata", {})
            
            if not participants:
                return {"success": False, "error": "No participants found in frame presence data"}
            
            # Update cache files for each participant
            update_results = self._update_participant_caches(
                participants, 
                conversation_topics,
                session_metadata
            )
            
            # Create comprehensive result
            result = {
                "success": True,
                "session_id": session_metadata.get("session_id", "unknown"),
                "session_duration": session_metadata.get("duration_seconds", 0),
                "conversation_topics": conversation_topics,
                "participants_processed": len(update_results["updated"]),
                "participants_failed": len(update_results["failed"]),
                "updated_participants": update_results["updated"],
                "failed_participants": update_results["failed"],
                "cache_updates": update_results["cache_details"]
            }
            
            # Log the integration results
            self._log_integration_results(result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error processing session conversation: {e}")
            return {"success": False, "error": str(e)}
    
    def _find_most_recent_session(self) -> Tuple[Optional[str], Optional[str]]:
        """
        Find the most recent session files.
        
        Returns:
            Tuple of (frame_presence_file, transcript_file) paths or (None, None)
        """
        try:
            # Find most recent frame presence log
            presence_files = [f for f in os.listdir(self.logs_dir) 
                            if f.startswith("frame_presence_session_") and f.endswith(".json")]
            
            if not presence_files:
                return None, None
            
            # Sort by filename (contains timestamp)
            presence_files.sort(reverse=True)
            latest_presence = os.path.join(self.logs_dir, presence_files[0])
            
            # Extract session ID from filename
            session_id = presence_files[0].replace("frame_presence_session_", "").replace(".json", "")
            
            # Find corresponding transcript
            transcript_file = self._find_transcript_file(session_id)
            
            return latest_presence, transcript_file
            
        except Exception as e:
            self.logger.error(f"Error finding recent session: {e}")
            return None, None
    
    def _find_transcript_file(self, session_id: str) -> Optional[str]:
        """
        Find transcript file for a session ID.
        
        Args:
            session_id: Session ID to search for
            
        Returns:
            Path to transcript file or None
        """
        try:
            # Look for transcript files containing the session ID
            transcript_files = [f for f in os.listdir(self.conversations_dir) 
                              if session_id in f and f.endswith("_transcript.json")]
            
            if transcript_files:
                return os.path.join(self.conversations_dir, transcript_files[0])
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error finding transcript file: {e}")
            return None
    
    def _extract_conversation_topics(self, transcript_file: str) -> Dict[str, Any]:
        """
        Extract conversation topics from transcript file.
        
        Args:
            transcript_file: Path to transcript file
            
        Returns:
            Dict with topics and summary
        """
        try:
            # Use the summarizer to extract topics
            result = summarize_conversation(transcript_file)
            
            if result["success"]:
                summary_data = result["summary_data"]
                return {
                    "success": True,
                    "topics": summary_data.get("topics", [])
                }
            else:
                return {"success": False, "error": result["error"]}
                
        except Exception as e:
            self.logger.error(f"Error extracting topics: {e}")
            return {"success": False, "error": str(e)}
    
    def _update_participant_caches(self, 
                                 participants: Dict[str, Any], 
                                 topics: List[str],
                                 session_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update cache files for all participants with conversation data.
        
        Args:
            participants: Participant data from frame presence
            topics: Conversation topics
            session_metadata: Session metadata
            
        Returns:
            Dict with update results
        """
        updated = []
        failed = []
        cache_details = []
        
        try:
            for track_id, participant in participants.items():
                try:
                    participant_name = participant.get("name")
                    recognition_status = participant.get("recognition_status", "unknown")
                    
                    # Find or create cache entry
                    cache_result = self._find_or_create_cache_entry(participant, session_metadata)
                    
                    if cache_result["success"]:
                        cache_path = cache_result["cache_path"]
                        cache_hash = cache_result["cache_hash"]
                        
                        # Update cache with conversation data
                        update_result = self._update_cache_with_conversation(
                            cache_path, 
                            topics, 
                            session_metadata,
                            participant
                        )
                        
                        if update_result["success"]:
                            updated.append({
                                "track_id": track_id,
                                "name": participant_name or f"Track_{track_id}",
                                "cache_hash": cache_hash,
                                "recognition_status": recognition_status
                            })
                            
                            cache_details.append({
                                "participant": participant_name or f"Track_{track_id}",
                                "cache_file": os.path.basename(cache_path),
                                "topics_added": len(topics),
                                "update_type": update_result["update_type"]
                            })
                            
                            self.logger.info(f"✅ Updated cache for {participant_name or f'Track_{track_id}'}")
                        else:
                            failed.append({
                                "track_id": track_id,
                                "name": participant_name or f"Track_{track_id}",
                                "error": update_result["error"]
                            })
                    else:
                        failed.append({
                            "track_id": track_id,
                            "name": participant_name or f"Track_{track_id}",
                            "error": cache_result["error"]
                        })
                        
                except Exception as e:
                    failed.append({
                        "track_id": track_id,
                        "name": participant.get("name", f"Track_{track_id}"),
                        "error": str(e)
                    })
            
            return {
                "updated": updated,
                "failed": failed,
                "cache_details": cache_details
            }
            
        except Exception as e:
            self.logger.error(f"Error updating participant caches: {e}")
            return {"updated": [], "failed": [], "cache_details": []}
    
    def _find_or_create_cache_entry(self, participant: Dict[str, Any], session_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Find existing cache entry or create new one for participant.
        
        Args:
            participant: Participant data
            session_metadata: Session metadata
            
        Returns:
            Dict with cache path and hash
        """
        try:
            participant_name = participant.get("name")
            
            if participant_name:
                # Look for existing cache entry by name
                cache_hash = self._find_cache_by_name(participant_name)
                if cache_hash:
                    cache_path = os.path.join(self.cache_dir, f"{cache_hash}.json")
                    return {
                        "success": True,
                        "cache_path": cache_path,
                        "cache_hash": cache_hash,
                        "is_new": False
                    }
            
            # Create new cache entry for unknown participant
            return self._create_new_cache_entry(participant, session_metadata)
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _find_cache_by_name(self, participant_name: str) -> Optional[str]:
        """
        Find cache entry by participant name.
        
        Args:
            participant_name: Name to search for
            
        Returns:
            Cache hash if found, None otherwise
        """
        try:
            # Search through existing cache files
            cache_files = [f for f in os.listdir(self.cache_dir) if f.endswith('.json')]
            
            self.logger.info(f"🔍 Searching for cache entry for: {participant_name}")
            self.logger.info(f"📁 Found {len(cache_files)} cache files to search")
            
            for cache_file in cache_files:
                try:
                    cache_path = os.path.join(self.cache_dir, cache_file)
                    with open(cache_path, 'r', encoding='utf-8') as f:
                        cache_data = json.load(f)
                    
                    # Check if this cache entry matches the participant name
                    cached_name = cache_data.get("person_analysis", {}).get("personal_info", {}).get("full_name")
                    
                    if cached_name:
                        self.logger.debug(f"🔍 Checking cache {cache_file[:8]}... name: {cached_name}")
                        
                        if cached_name.lower() == participant_name.lower():
                            self.logger.info(f"✅ Found matching cache for {participant_name}: {cache_file}")
                            return cache_file.replace('.json', '')
                        
                except Exception as e:
                    self.logger.debug(f"Error reading cache file {cache_file}: {e}")
                    continue
            
            self.logger.info(f"❌ No existing cache found for: {participant_name}")
            return None
            
        except Exception as e:
            self.logger.error(f"Error searching cache by name: {e}")
            return None
    
    def _create_new_cache_entry(self, participant: Dict[str, Any], session_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create new cache entry for participant.
        
        Args:
            participant: Participant data
            session_metadata: Session metadata
            
        Returns:
            Dict with new cache path and hash
        """
        try:
            # Generate unique hash for new cache entry
            track_id = participant.get("track_id")
            session_id = session_metadata.get("session_id", "unknown")
            timestamp = datetime.now().isoformat()
            
            unique_string = f"conversation_participant_{session_id}_{track_id}_{timestamp}"
            cache_hash = hashlib.md5(unique_string.encode()).hexdigest()
            
            participant_name = participant.get("name", f"Conversation_Participant_{track_id}")
            
            # Create basic cache structure
            cache_data = {
                "person_analysis": {
                    "personal_info": {
                        "full_name": participant_name,
                        "age": None,
                        "location": "Unknown",
                        "nationality": None,
                        "languages": ["English"],
                        "interests": []
                    },
                    "professional_info": {
                        "current_position": "Unknown",
                        "company": "Unknown",
                        "industry": "Unknown",
                        "previous_positions": [],
                        "skills": [],
                        "achievements": []
                    },
                    "conversation_history": [],
                    "last_updated": timestamp
                },
                "best_match_photo": {
                    "base64_data": None,
                    "source_url": None,
                    "confidence_score": None,
                    "description": "Face detected during conversation"
                },
                "metadata": {
                    "source": "conversation_frame_presence",
                    "track_id": track_id,
                    "session_id": session_id,
                    "recognition_status": participant.get("recognition_status", "unknown"),
                    "similarity_scores": participant.get("similarity_scores", []),
                    "total_presence_time": participant.get("total_presence_time", 0),
                    "appearance_count": participant.get("appearance_count", 0)
                }
            }
            
            # Save cache file
            cache_path = os.path.join(self.cache_dir, f"{cache_hash}.json")
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"✅ Created new cache entry: {cache_hash} for {participant_name}")
            
            return {
                "success": True,
                "cache_path": cache_path,
                "cache_hash": cache_hash,
                "is_new": True
            }
            
        except Exception as e:
            self.logger.error(f"Error creating cache entry: {e}")
            return {"success": False, "error": str(e)}
    
    def _update_cache_with_conversation(self, 
                                      cache_path: str, 
                                      topics: List[str], 
                                      session_metadata: Dict[str, Any],
                                      participant: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update cache file with conversation data.
        
        Args:
            cache_path: Path to cache file
            topics: Conversation topics
            session_metadata: Session metadata
            participant: Participant data
            
        Returns:
            Dict with update results
        """
        try:
            # Load existing cache data
            with open(cache_path, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            
            # Create conversation record
            conversation_record = {
                "date": datetime.now().isoformat(),
                "session_id": session_metadata.get("session_id"),
                "topics": topics,
                "duration": session_metadata.get("duration_seconds", 0),
                "presence_time": participant.get("total_presence_time", 0),
                "recognition_status": participant.get("recognition_status", "unknown"),
                "source": "webcam_conversation_integration"
            }
            
            # Add to conversation history
            person_analysis = cache_data.get("person_analysis", {})
            if "conversation_history" not in person_analysis:
                person_analysis["conversation_history"] = []
            
            person_analysis["conversation_history"].append(conversation_record)
            
            # Update topics list (avoid duplicates)
            if "previous_conversation_topics" not in person_analysis:
                person_analysis["previous_conversation_topics"] = []
            
            existing_topics = set(person_analysis["previous_conversation_topics"])
            for topic in topics:
                if topic not in existing_topics:
                    person_analysis["previous_conversation_topics"].append(topic)
                    existing_topics.add(topic)
            
            # Update metadata
            person_analysis["last_updated"] = datetime.now().isoformat()
            person_analysis["total_conversations"] = len(person_analysis["conversation_history"])
            
            # Update metadata section
            metadata = cache_data.get("metadata", {})
            metadata["last_conversation_update"] = datetime.now().isoformat()
            metadata["conversation_integration_version"] = "1.0"
            
            # Save updated cache
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=2, ensure_ascii=False)
            
            return {
                "success": True,
                "update_type": "conversation_topics_added",
                "topics_added": len(topics)
            }
            
        except Exception as e:
            self.logger.error(f"Error updating cache with conversation: {e}")
            return {"success": False, "error": str(e)}
    
    def _log_integration_results(self, result: Dict[str, Any]):
        """
        Log the integration results to file.
        
        Args:
            result: Integration results
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = os.path.join(self.logs_dir, f"conversation_integration_{timestamp}.json")
            
            log_data = {
                "integration_timestamp": datetime.now().isoformat(),
                "integration_type": "conversation_cache_update",
                "results": result
            }
            
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(log_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"📁 Integration results logged: {os.path.basename(log_file)}")
            
        except Exception as e:
            self.logger.error(f"Error logging integration results: {e}")


# Function interfaces
def process_latest_conversation_session() -> Dict[str, Any]:
    """
    Process the most recent conversation session.
    
    Returns:
        Dict with processing results
    """
    integrator = ConversationCacheIntegrator()
    return integrator.process_session_conversation()


def process_conversation_session(session_id: str) -> Dict[str, Any]:
    """
    Process a specific conversation session.
    
    Args:
        session_id: Session ID to process
        
    Returns:
        Dict with processing results
    """
    integrator = ConversationCacheIntegrator()
    return integrator.process_session_conversation(session_id)


# Example usage
if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    
    print("🔗 Conversation Cache Integration Test")
    print("=" * 50)
    
    result = process_latest_conversation_session()
    
    if result["success"]:
        print(f"✅ Successfully processed session: {result['session_id']}")
        print(f"📝 Topics: {', '.join(result['conversation_topics'])}")
        print(f"👥 Participants updated: {result['participants_processed']}")
        print(f"❌ Participants failed: {result['participants_failed']}")
        
        if result["updated_participants"]:
            print("\n👤 Updated participants:")
            for participant in result["updated_participants"]:
                print(f"  - {participant['name']} ({participant['cache_hash']})")
    else:
        print(f"❌ Processing failed: {result['error']}")
