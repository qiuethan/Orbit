"""
Simple audio recorder with start and stop functionality.
"""

import os
import time
import wave
import json
from datetime import datetime
from typing import Dict, Any, Optional

try:
    import sounddevice as sd
    import numpy as np
except ImportError:
    sd = None
    np = None

from .transcriber import ConversationTranscriber

class AudioRecorder:
    """Simple audio recorder."""
    
    def __init__(self, output_dir: str = "recorded_conversations", auto_transcribe: bool = True, keep_audio: bool = False):
        """Initialize recorder."""
        self.output_dir = output_dir
        self.auto_transcribe = auto_transcribe
        self.keep_audio = keep_audio  # Whether to keep audio files after transcription
        os.makedirs(output_dir, exist_ok=True)
        
        # Recording state
        self.is_recording = False
        self.current_session = None
        self.start_time = None
        
        # Initialize transcriber
        self.transcriber = ConversationTranscriber() if auto_transcribe else None
        
    def start(self, title: Optional[str] = None) -> Dict[str, Any]:
        """Start recording."""
        if self.is_recording:
            return {"success": False, "error": "Already recording"}
            
        if sd is None:
            return {"success": False, "error": "sounddevice not available - run: pip install sounddevice"}
            
        try:
            # Generate session info
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            session_id = f"recording_{timestamp}"
            
            if title:
                clean_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
                clean_title = clean_title.replace(' ', '_')
                session_id = f"recording_{timestamp}_{clean_title}"
                
            filename = f"{session_id}.wav"
            filepath = os.path.join(self.output_dir, filename)
            
            self.current_session = {
                "session_id": session_id,
                "title": title or f"Recording {timestamp}",
                "filename": filename,
                "filepath": filepath,
                "start_time": datetime.now().isoformat(),
                "sample_rate": 16000,  # Good for speech
                "channels": 1  # Mono - works with all microphones
            }
            
            self.is_recording = True
            self.start_time = time.time()
            
            # Start real-time recording immediately
            sample_rate = self.current_session["sample_rate"]
            channels = self.current_session["channels"]
            
            # Start recording in a separate thread
            import threading
            self._recording_thread = threading.Thread(target=self._record_continuously, args=(sample_rate, channels))
            self._recording_thread.daemon = True
            self._recorded_audio = None
            self._recording_thread.start()
            
            print(f"🎙️ Recording started: {session_id}")
            print(f"📁 Will save to: {filepath}")
            print("🎤 Speak now! Audio is being captured...")
            
            return {
                "success": True,
                "session": self.current_session,
                "message": f"Recording started: {session_id}"
            }
            
        except Exception as e:
            self.is_recording = False
            return {"success": False, "error": str(e)}
            
    def stop(self) -> Dict[str, Any]:
        """Stop recording and save file."""
        if not self.is_recording:
            return {"success": False, "error": "Not recording"}
            
        try:
            # Stop the recording thread first
            self.is_recording = False
            
            # Wait for recording thread to finish
            if hasattr(self, '_recording_thread') and self._recording_thread.is_alive():
                self._recording_thread.join(timeout=2.0)
            
            # Calculate duration
            duration = time.time() - self.start_time
            
            print(f"🎙️ Recording captured {duration:.1f} seconds of audio")
            print("🎤 Processing recorded audio...")
            
            # Get the recorded audio data from our real-time recording
            sample_rate = self.current_session["sample_rate"]
            channels = self.current_session["channels"]
            
            if hasattr(self, '_recorded_audio') and self._recorded_audio is not None:
                audio_data = self._recorded_audio
                print(f"✅ Using real-time recorded audio: {len(audio_data)} samples")
            else:
                # Fallback: record what's left (this shouldn't happen)
                print("⚠️ No real-time audio found, attempting last-second capture...")
                audio_data = sd.rec(
                    int(1 * sample_rate),  # Just 1 second fallback
                    samplerate=sample_rate,
                    channels=channels,
                    dtype='int16'
                )
                sd.wait()
            
            # Save to WAV file
            filepath = self.current_session["filepath"]
            
            with wave.open(filepath, 'wb') as wav_file:
                wav_file.setnchannels(channels)
                wav_file.setsampwidth(2)  # 16-bit = 2 bytes
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data.tobytes())
                
            # Get file info
            file_size = os.path.getsize(filepath)
            max_amplitude = np.max(np.abs(audio_data))
            
            # Update session info
            self.current_session["end_time"] = datetime.now().isoformat()
            self.current_session["duration_seconds"] = duration
            self.current_session["file_size"] = file_size
            self.current_session["max_amplitude"] = float(max_amplitude)
            
            # Save metadata
            metadata_path = filepath.replace('.wav', '_metadata.json')
            with open(metadata_path, 'w') as f:
                json.dump(self.current_session, f, indent=2)
            
            print(f"✅ Recording saved: {filepath}")
            print(f"📊 Duration: {duration:.1f}s, Size: {file_size} bytes")
            print(f"🔊 Max amplitude: {max_amplitude}")
            
            if max_amplitude > 100:  # Good signal level for int16
                print("✅ Audio detected!")
            else:
                print("⚠️ Low audio levels - check microphone volume")
            
            # Auto-transcribe if enabled
            transcription_result = None
            if self.auto_transcribe and self.transcriber:
                print("🤖 Transcribing with Groq Whisper Large v3...")
                transcription_result = self.transcriber.transcribe_conversation(filepath)
                
                if transcription_result.get("success"):
                    word_count = transcription_result.get("word_count", 0)
                    language = transcription_result.get("language", "unknown")
                    print(f"✅ Transcription complete: {word_count} words ({language})")
                    print(f"📝 Preview: {transcription_result.get('transcript_text', '')[:100]}...")
                    
                    # Delete audio file if not keeping it
                    if not self.keep_audio:
                        try:
                            os.remove(filepath)
                            print(f"🗑️ Audio file deleted (transcript saved)")
                            
                            # Also delete metadata file
                            if os.path.exists(metadata_path):
                                os.remove(metadata_path)
                                
                        except Exception as e:
                            print(f"⚠️ Could not delete audio file: {e}")
                            
                else:
                    print(f"❌ Transcription failed: {transcription_result.get('error', 'Unknown error')}")
                
            return {
                "success": True,
                "session": self.current_session,
                "duration_seconds": duration,
                "file_size": file_size,
                "max_amplitude": float(max_amplitude),
                "transcription": transcription_result,
                "audio_deleted": not self.keep_audio and transcription_result and transcription_result.get("success"),
                "message": f"Recording processed: {self.current_session['filename']}"
            }
            
        except Exception as e:
            self.is_recording = False
            return {"success": False, "error": str(e)}
    
    def _record_continuously(self, sample_rate: int, channels: int):
        """Record audio continuously in a separate thread."""
        try:
            print(f"🎤 Starting continuous recording at {sample_rate}Hz, {channels} channels")
            
            # Record in chunks and accumulate
            recorded_chunks = []
            chunk_duration = 0.5  # 500ms chunks
            
            while self.is_recording:
                try:
                    # Record a small chunk
                    chunk = sd.rec(
                        int(chunk_duration * sample_rate),
                        samplerate=sample_rate,
                        channels=channels,
                        dtype='int16'
                    )
                    sd.wait()  # Wait for chunk to complete
                    
                    if self.is_recording:  # Still recording?
                        recorded_chunks.append(chunk)
                        
                except Exception as e:
                    print(f"⚠️ Error recording chunk: {e}")
                    break
            
            # Combine all chunks
            if recorded_chunks:
                self._recorded_audio = np.concatenate(recorded_chunks)
                print(f"✅ Captured {len(recorded_chunks)} audio chunks")
            else:
                print("⚠️ No audio chunks captured")
                self._recorded_audio = None
                
        except Exception as e:
            print(f"❌ Error in continuous recording: {e}")
            self._recorded_audio = None
            
    def status(self) -> Dict[str, Any]:
        """Get current recording status."""
        if self.is_recording:
            current_duration = time.time() - self.start_time if self.start_time else 0
            return {
                "is_recording": True,
                "session": self.current_session,
                "current_duration": current_duration
            }
        else:
            return {
                "is_recording": False,
                "session": None,
                "current_duration": 0
            }
            
    def list_recordings(self) -> Dict[str, Any]:
        """List all transcripts in the output directory."""
        try:
            recordings = []
            
            if os.path.exists(self.output_dir):
                for filename in os.listdir(self.output_dir):
                    if filename.endswith('_transcript.json'):
                        filepath = os.path.join(self.output_dir, filename)
                        stat = os.stat(filepath)
                        
                        # Load transcript data
                        try:
                            with open(filepath, 'r', encoding='utf-8') as f:
                                transcript_data = json.load(f)
                                
                            conversation = transcript_data.get("conversation", {})
                            transcription = transcript_data.get("transcription", {})
                            summary = transcript_data.get("summary", {})
                            
                            recording_info = {
                                "filename": filename,
                                "filepath": filepath,
                                "file_size": stat.st_size,
                                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                                "transcribed_at": conversation.get("transcribed_at", ""),
                                "text_preview": transcription.get("text", "")[:100] + "..." if len(transcription.get("text", "")) > 100 else transcription.get("text", ""),
                                "word_count": summary.get("word_count", 0),
                                "language": summary.get("language", "unknown"),
                                "confidence": summary.get("confidence_score", 0),
                                "duration": summary.get("total_duration", 0)
                            }
                            recordings.append(recording_info)
                            
                        except Exception as e:
                            # If we can't read the transcript, still show the file
                            recording_info = {
                                "filename": filename,
                                "filepath": filepath,
                                "file_size": stat.st_size,
                                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                                "error": f"Could not read transcript: {e}"
                            }
                            recordings.append(recording_info)
                        
            # Sort by creation time (newest first)
            recordings.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            return {
                "success": True,
                "recordings": recordings,
                "count": len(recordings)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def transcribe_existing(self, audio_filename: str) -> Dict[str, Any]:
        """Transcribe an existing recording."""
        if not self.transcriber:
            return {"success": False, "error": "Transcriber not initialized"}
            
        audio_path = os.path.join(self.output_dir, audio_filename)
        if not os.path.exists(audio_path):
            return {"success": False, "error": f"Audio file not found: {audio_filename}"}
            
        return self.transcriber.transcribe_conversation(audio_path)
    
    def transcribe_all(self) -> Dict[str, Any]:
        """Transcribe all recordings in the output directory."""
        if not self.transcriber:
            return {"success": False, "error": "Transcriber not initialized"}
            
        return self.transcriber.transcribe_folder(self.output_dir)
    
    def get_transcript(self, audio_filename: str) -> Dict[str, Any]:
        """Get transcript for a specific recording."""
        transcript_filename = audio_filename.replace('.wav', '_transcript.json')
        transcript_path = os.path.join(self.output_dir, transcript_filename)
        
        if not os.path.exists(transcript_path):
            return {"success": False, "error": "Transcript not found"}
            
        if not self.transcriber:
            return {"success": False, "error": "Transcriber not initialized"}
            
        return self.transcriber.get_transcript_summary(transcript_path)
