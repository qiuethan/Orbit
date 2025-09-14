"""
Conversation Tracker Module

Links conversation topics from recorded sessions to detected people,
building a history of topics discussed with each person.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import asdict

# Import schema
from output_schema import PersonAnalysis


class ConversationTracker:
    """
    Tracks conversation topics and links them to detected people.
    """
    
    def __init__(self, storage_dir: str = "person_profiles"):
        """
        Initialize conversation tracker.
        
        Args:
            storage_dir: Directory to store person profile data
        """
        self.logger = logging.getLogger("conversation_tracker")
        
        # Create storage directory
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        self.storage_dir = os.path.join(backend_dir, storage_dir)
        os.makedirs(self.storage_dir, exist_ok=True)
        
        self.logger.info(f"Conversation tracker initialized with storage: {self.storage_dir}")
    
    def get_person_profile_path(self, person_identifier: str) -> str:
        """
        Get the file path for a person's profile.
        
        Args:
            person_identifier: Unique identifier for the person (e.g., face hash, name)
            
        Returns:
            Path to the person's profile JSON file
        """
        # Sanitize identifier for filename
        safe_identifier = "".join(c for c in person_identifier if c.isalnum() or c in '-_').strip()
        return os.path.join(self.storage_dir, f"{safe_identifier}_profile.json")
    
    def load_person_profile(self, person_identifier: str) -> Optional[Dict[str, Any]]:
        """
        Load a person's profile from storage.
        
        Args:
            person_identifier: Unique identifier for the person
            
        Returns:
            Person profile dict or None if not found
        """
        profile_path = self.get_person_profile_path(person_identifier)
        
        try:
            if os.path.exists(profile_path):
                with open(profile_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return None
        except Exception as e:
            self.logger.error(f"Error loading profile for {person_identifier}: {e}")
            return None
    
    def save_person_profile(self, person_identifier: str, profile_data: Dict[str, Any]) -> bool:
        """
        Save a person's profile to storage.
        
        Args:
            person_identifier: Unique identifier for the person
            profile_data: Profile data to save
            
        Returns:
            True if saved successfully, False otherwise
        """
        profile_path = self.get_person_profile_path(person_identifier)
        
        try:
            with open(profile_path, 'w', encoding='utf-8') as f:
                json.dump(profile_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Profile saved for {person_identifier}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving profile for {person_identifier}: {e}")
            return False
    
    def add_conversation_record(self, person_identifier: str, 
                              conversation_topics: List[str],
                              session_id: Optional[str] = None,
                              duration: Optional[float] = None,
                              summary: Optional[str] = None) -> bool:
        """
        Add a conversation record to a person's profile.
        
        Args:
            person_identifier: Unique identifier for the person
            conversation_topics: List of topics from the conversation
            session_id: Reference to the recording session
            duration: Conversation duration in seconds
            summary: Brief summary of the conversation
            
        Returns:
            True if added successfully, False otherwise
        """
        try:
            # Load existing profile or create new one
            profile = self.load_person_profile(person_identifier)
            
            if profile is None:
                # Create new profile with minimal structure
                profile = {
                    "person_identifier": person_identifier,
                    "created_at": datetime.now().isoformat(),
                    "previous_conversation_topics": [],
                    "conversation_history": []
                }
            
            # Create new conversation record
            conversation_record = {
                "date": datetime.now().isoformat(),
                "topics": conversation_topics,
                "session_id": session_id,
                "duration": duration,
                "summary": summary
            }
            
            # Add to conversation history
            if "conversation_history" not in profile:
                profile["conversation_history"] = []
            profile["conversation_history"].append(conversation_record)
            
            # Update flattened topics list (remove duplicates)
            if "previous_conversation_topics" not in profile:
                profile["previous_conversation_topics"] = []
            
            # Add new topics to the flattened list, avoiding duplicates
            existing_topics = set(profile["previous_conversation_topics"])
            for topic in conversation_topics:
                if topic not in existing_topics:
                    profile["previous_conversation_topics"].append(topic)
                    existing_topics.add(topic)
            
            # Update metadata
            profile["last_conversation"] = datetime.now().isoformat()
            profile["total_conversations"] = len(profile["conversation_history"])
            
            # Save updated profile
            return self.save_person_profile(person_identifier, profile)
            
        except Exception as e:
            self.logger.error(f"Error adding conversation record for {person_identifier}: {e}")
            return False
    
    def get_person_conversation_history(self, person_identifier: str) -> Dict[str, Any]:
        """
        Get conversation history for a person.
        
        Args:
            person_identifier: Unique identifier for the person
            
        Returns:
            Dict with conversation history and stats
        """
        profile = self.load_person_profile(person_identifier)
        
        if profile is None:
            return {
                "found": False,
                "message": "No conversation history found for this person"
            }
        
        return {
            "found": True,
            "person_identifier": person_identifier,
            "total_conversations": len(profile.get("conversation_history", [])),
            "previous_topics": profile.get("previous_conversation_topics", []),
            "conversation_history": profile.get("conversation_history", []),
            "last_conversation": profile.get("last_conversation"),
            "created_at": profile.get("created_at")
        }
    
    def link_conversation_to_detected_people(self, conversation_summary_file: str, 
                                           detected_people: List[str]) -> Dict[str, Any]:
        """
        Link conversation topics to detected people from a webcam session.
        
        Args:
            conversation_summary_file: Path to the conversation summary JSON file
            detected_people: List of person identifiers detected in the video
            
        Returns:
            Dict with results of the linking process
        """
        try:
            # Load conversation summary
            with open(conversation_summary_file, 'r', encoding='utf-8') as f:
                summary_data = json.load(f)
            
            # Extract conversation data
            topics = summary_data.get("summary", {}).get("topics", [])
            duration = summary_data.get("summary", {}).get("original_duration", 0)
            summary_text = summary_data.get("summary", {}).get("text", "")
            session_id = os.path.basename(conversation_summary_file).replace("_summary.json", "")
            
            if not topics:
                return {
                    "success": False,
                    "error": "No topics found in conversation summary"
                }
            
            # Link topics to each detected person
            results = {
                "success": True,
                "session_id": session_id,
                "topics": topics,
                "linked_people": [],
                "failed_people": []
            }
            
            for person_id in detected_people:
                success = self.add_conversation_record(
                    person_identifier=person_id,
                    conversation_topics=topics,
                    session_id=session_id,
                    duration=duration,
                    summary=summary_text[:200] + "..." if len(summary_text) > 200 else summary_text
                )
                
                if success:
                    results["linked_people"].append(person_id)
                    self.logger.info(f"Linked conversation topics to {person_id}")
                else:
                    results["failed_people"].append(person_id)
                    self.logger.warning(f"Failed to link conversation topics to {person_id}")
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error linking conversation to people: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_all_people_with_conversations(self) -> List[Dict[str, Any]]:
        """
        Get a list of all people who have conversation history.
        
        Returns:
            List of person summaries with conversation stats
        """
        people = []
        
        try:
            for filename in os.listdir(self.storage_dir):
                if filename.endswith("_profile.json"):
                    person_id = filename.replace("_profile.json", "")
                    profile = self.load_person_profile(person_id)
                    
                    if profile and profile.get("conversation_history"):
                        people.append({
                            "person_identifier": person_id,
                            "total_conversations": len(profile.get("conversation_history", [])),
                            "total_topics": len(profile.get("previous_conversation_topics", [])),
                            "last_conversation": profile.get("last_conversation"),
                            "created_at": profile.get("created_at")
                        })
            
            # Sort by last conversation date, newest first
            people.sort(key=lambda x: x.get("last_conversation", ""), reverse=True)
            
        except Exception as e:
            self.logger.error(f"Error getting people list: {e}")
        
        return people


# Function interfaces
def add_conversation_to_person(person_identifier: str, 
                             conversation_topics: List[str],
                             session_id: Optional[str] = None,
                             duration: Optional[float] = None,
                             summary: Optional[str] = None) -> bool:
    """
    Function interface to add conversation record to a person.
    
    Args:
        person_identifier: Unique identifier for the person
        conversation_topics: List of topics from the conversation
        session_id: Reference to the recording session
        duration: Conversation duration in seconds
        summary: Brief summary of the conversation
        
    Returns:
        True if added successfully, False otherwise
    """
    tracker = ConversationTracker()
    return tracker.add_conversation_record(
        person_identifier, conversation_topics, session_id, duration, summary
    )


def get_person_topics(person_identifier: str) -> Dict[str, Any]:
    """
    Function interface to get conversation history for a person.
    
    Args:
        person_identifier: Unique identifier for the person
        
    Returns:
        Dict with conversation history and stats
    """
    tracker = ConversationTracker()
    return tracker.get_person_conversation_history(person_identifier)


def link_conversation_to_people(conversation_summary_file: str, 
                               detected_people: List[str]) -> Dict[str, Any]:
    """
    Function interface to link conversation to detected people.
    
    Args:
        conversation_summary_file: Path to the conversation summary JSON file
        detected_people: List of person identifiers detected in the video
        
    Returns:
        Dict with results of the linking process
    """
    tracker = ConversationTracker()
    return tracker.link_conversation_to_detected_people(conversation_summary_file, detected_people)


# Example usage
if __name__ == "__main__":
    print("🗣️ Conversation Tracker")
    print("=" * 40)
    
    # Test with sample data
    tracker = ConversationTracker()
    
    # Add sample conversation
    sample_topics = [
        "Project status update",
        "Frontend development", 
        "API integration",
        "Team collaboration",
        "Next sprint planning"
    ]
    
    success = tracker.add_conversation_record(
        person_identifier="john_doe_001",
        conversation_topics=sample_topics,
        session_id="test_session_001",
        duration=300.5,
        summary="Discussion about project progress and upcoming tasks"
    )
    
    if success:
        print("✅ Sample conversation record added")
        
        # Get conversation history
        history = tracker.get_person_conversation_history("john_doe_001")
        print(f"📊 Total conversations: {history.get('total_conversations', 0)}")
        print(f"📝 Total topics: {len(history.get('previous_topics', []))}")
        print(f"🔗 Topics: {', '.join(history.get('previous_topics', [])[:3])}...")
    else:
        print("❌ Failed to add conversation record")
