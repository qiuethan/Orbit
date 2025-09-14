"""
Groq Whisper Large transcription for recorded conversations.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

try:
    from groq import Groq
except ImportError:
    Groq = None

# Load environment variables from backend root
try:
    from dotenv import load_dotenv
    # Load from backend directory (where .env should be)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, '.env')
    load_dotenv(env_path)
except ImportError:
    pass

class ConversationTranscriber:
    """Transcribes audio files using Groq Whisper Large."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize transcriber with Groq API key."""
        self.logger = logging.getLogger("transcriber")
        
        # Get API key from parameter or environment
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        
        if not self.api_key:
            self.logger.warning("Groq API key not found. Set GROQ_API_KEY environment variable.")
            self.groq_client = None
        else:
            try:
                self.groq_client = Groq(api_key=self.api_key)
                self.logger.info("Groq client initialized successfully")
            except Exception as e:
                self.logger.error(f"Failed to initialize Groq client: {e}")
                self.groq_client = None
    
    def transcribe_file(self, audio_path: str, language: str = "en") -> Dict[str, Any]:
        """
        Transcribe an audio file using Groq Whisper Large.
        
        Args:
            audio_path: Path to the audio file
            language: Language code (e.g., "en", "es", "fr")
            
        Returns:
            Dict with transcription results
        """
        if not os.path.exists(audio_path):
            return {"success": False, "error": f"Audio file not found: {audio_path}"}
            
        if self.groq_client is None:
            return {"success": False, "error": "Groq client not initialized. Check API key."}
            
        try:
            self.logger.info(f"Transcribing with Groq Whisper Large v3: {audio_path}")
            
            with open(audio_path, "rb") as audio_file:
                # Use Groq's standard Whisper model
                transcription = self.groq_client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3",
                    language=language if language != "auto" else None,
                    response_format="verbose_json",
                    temperature=0.0
                )
                
            # Extract segments if available
            segments = []
            
            # Handle segments (they come as list of dicts)
            if hasattr(transcription, 'segments') and transcription.segments:
                for segment in transcription.segments:
                    # Segments are dictionaries
                    segments.append({
                        "start": segment.get('start', 0),
                        "end": segment.get('end', 0),
                        "text": segment.get('text', '').strip(),
                        "confidence": segment.get('avg_logprob', 0.0)
                    })
            else:
                # No segments available, create a single segment
                segments.append({
                    "start": 0,
                    "end": 0,
                    "text": transcription.text.strip(),
                    "confidence": 1.0
                })
                    
            result = {
                "success": True,
                "text": transcription.text.strip(),
                "language": getattr(transcription, 'language', language),
                "segments": segments,
                "word_count": len(transcription.text.split()),
                "confidence": sum(s.get("confidence", 0) for s in segments) / len(segments) if segments else 0,
                "model": "whisper-large-v3",
                "transcribed_at": datetime.now().isoformat(),
                "audio_file": audio_path
            }
            
            self.logger.info(f"Transcription completed: {len(result['text'])} characters, {result['word_count']} words")
            return result
            
        except Exception as e:
            self.logger.error(f"Groq transcription error: {e}")
            return {"success": False, "error": str(e)}
    
    def transcribe_conversation(self, audio_path: str, save_transcript: bool = True) -> Dict[str, Any]:
        """
        Transcribe a conversation recording and optionally save the transcript.
        
        Args:
            audio_path: Path to the audio file
            save_transcript: Whether to save transcript to JSON file
            
        Returns:
            Dict with transcription results
        """
        try:
            # Transcribe the audio
            result = self.transcribe_file(audio_path)
            
            if not result.get("success"):
                return result
                
            # Add conversation-specific metadata
            conversation_data = {
                "conversation": {
                    "audio_file": audio_path,
                    "transcribed_at": datetime.now().isoformat(),
                    "model": "groq-whisper-large-v3"
                },
                "transcription": result,
                "summary": {
                    "total_duration": result["segments"][-1]["end"] if result["segments"] else 0,
                    "word_count": result["word_count"],
                    "language": result["language"],
                    "confidence_score": result["confidence"]
                }
            }
            
            if save_transcript:
                # Save transcript next to audio file
                transcript_path = audio_path.replace('.wav', '_transcript.json')
                
                with open(transcript_path, 'w', encoding='utf-8') as f:
                    json.dump(conversation_data, f, indent=2, ensure_ascii=False)
                    
                self.logger.info(f"Transcript saved: {transcript_path}")
                conversation_data["transcript_file"] = transcript_path
            
            return {
                "success": True,
                "conversation_data": conversation_data,
                "transcript_text": result["text"],
                "word_count": result["word_count"],
                "language": result["language"],
                "confidence": result["confidence"]
            }
            
        except Exception as e:
            self.logger.error(f"Error transcribing conversation: {e}")
            return {"success": False, "error": str(e)}
    
    def transcribe_folder(self, folder_path: str) -> Dict[str, Any]:
        """
        Transcribe all audio files in a folder.
        
        Args:
            folder_path: Path to folder containing audio files
            
        Returns:
            Dict with results for all files
        """
        if not os.path.exists(folder_path):
            return {"success": False, "error": f"Folder not found: {folder_path}"}
            
        try:
            results = []
            audio_files = []
            
            # Find all audio files
            for filename in os.listdir(folder_path):
                if filename.endswith(('.wav', '.mp3', '.m4a', '.flac', '.ogg')):
                    audio_path = os.path.join(folder_path, filename)
                    audio_files.append(audio_path)
                    
            self.logger.info(f"Found {len(audio_files)} audio files to transcribe")
            
            # Transcribe each file
            for audio_path in audio_files:
                self.logger.info(f"Processing: {os.path.basename(audio_path)}")
                
                # Check if transcript already exists
                transcript_path = audio_path.replace('.wav', '_transcript.json')
                if os.path.exists(transcript_path):
                    self.logger.info(f"Transcript already exists, skipping: {transcript_path}")
                    continue
                    
                result = self.transcribe_conversation(audio_path, save_transcript=True)
                results.append({
                    "audio_file": audio_path,
                    "filename": os.path.basename(audio_path),
                    "result": result
                })
                
            successful = sum(1 for r in results if r["result"].get("success"))
            failed = len(results) - successful
            
            return {
                "success": True,
                "total_files": len(audio_files),
                "processed_files": len(results),
                "successful": successful,
                "failed": failed,
                "results": results
            }
            
        except Exception as e:
            self.logger.error(f"Error transcribing folder: {e}")
            return {"success": False, "error": str(e)}
    
    def get_transcript_summary(self, transcript_path: str) -> Dict[str, Any]:
        """
        Get a summary of a transcript file.
        
        Args:
            transcript_path: Path to transcript JSON file
            
        Returns:
            Dict with transcript summary
        """
        try:
            if not os.path.exists(transcript_path):
                return {"success": False, "error": "Transcript file not found"}
                
            with open(transcript_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            transcription = data.get("transcription", {})
            summary = data.get("summary", {})
            
            return {
                "success": True,
                "text_preview": transcription.get("text", "")[:200] + "..." if len(transcription.get("text", "")) > 200 else transcription.get("text", ""),
                "full_text": transcription.get("text", ""),
                "word_count": summary.get("word_count", 0),
                "duration": summary.get("total_duration", 0),
                "language": summary.get("language", "unknown"),
                "confidence": summary.get("confidence_score", 0),
                "transcribed_at": data.get("conversation", {}).get("transcribed_at", "")
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
