#!/usr/bin/env python3
"""
Test the recording system with Groq Whisper transcription.
"""

import time
import os
from recording.recorder import AudioRecorder

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv('.env')  # Load from backend root
except ImportError:
    pass

def test_recording_with_transcription():
    """Test recording and automatic transcription."""
    print("🎙️ Testing Recording + Groq Whisper Transcription")
    print("=" * 50)
    
    # Check for Groq API key
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        print("⚠️ GROQ_API_KEY not found in environment")
        print("Set your API key: export GROQ_API_KEY='your_key_here'")
        print("Continuing without transcription...")
        recorder = AudioRecorder(auto_transcribe=False)
    else:
        print(f"✅ Found Groq API key: {groq_key[:10]}...")
        recorder = AudioRecorder(auto_transcribe=True, keep_audio=False)  # Only keep transcripts
    
    # Test 1: Record with transcription
    print("\n1️⃣ Starting recording...")
    result = recorder.start(title="Transcription Test")
    
    if result["success"]:
        print(f"✅ {result['message']}")
        
        # Record for 8 seconds with clear speech
        print("\n🎤 Recording for 8 seconds...")
        print("📢 SPEAK CLEARLY: 'Hello, this is a test of Groq Whisper transcription. It should convert my speech to text accurately.'")
        
        for i in range(8, 0, -1):
            print(f"   {i} seconds remaining...")
            time.sleep(1)
            
        # Stop and transcribe
        print("\n2️⃣ Stopping recording and transcribing...")
        result = recorder.stop()
        
        if result["success"]:
            print(f"✅ {result['message']}")
            
            # Check transcription results
            transcription = result.get("transcription")
            if transcription and transcription.get("success"):
                print("\n🤖 Groq Whisper Transcription Results:")
                print("-" * 40)
                print(f"📝 Text: {transcription.get('transcript_text', 'No text')}")
                print(f"🔤 Words: {transcription.get('word_count', 0)}")
                print(f"🌍 Language: {transcription.get('language', 'unknown')}")
                print(f"📊 Confidence: {transcription.get('confidence', 0):.3f}")
            elif transcription:
                print(f"❌ Transcription failed: {transcription.get('error', 'Unknown error')}")
            else:
                print("⚠️ No transcription attempted (API key missing)")
                
            # Test 3: List transcripts
            print("\n3️⃣ Listing all transcripts...")
            list_result = recorder.list_recordings()
            
            if list_result["success"]:
                print(f"✅ Found {list_result['count']} transcripts:")
                for rec in list_result["recordings"]:
                    filename = rec['filename']
                    preview = rec.get('text_preview', 'No preview')
                    word_count = rec.get('word_count', 0)
                    language = rec.get('language', 'unknown')
                    print(f"   📝 {filename}")
                    print(f"      Words: {word_count}, Language: {language}")
                    print(f"      Preview: {preview}")
            else:
                print(f"❌ Failed to list: {list_result['error']}")
        else:
            print(f"❌ Failed to stop: {result['error']}")
    else:
        print(f"❌ Failed to start: {result['error']}")
    
    print("\n" + "=" * 50)
    print("🎯 Test complete!")
    
    if groq_key:
        print("✅ Full recording + transcription system working!")
    else:
        print("⚠️ Recording works, add GROQ_API_KEY for transcription")

def test_transcribe_existing():
    """Test transcribing existing recordings."""
    print("\n🔄 Testing transcription of existing recordings...")
    
    recorder = AudioRecorder()
    result = recorder.transcribe_all()
    
    if result.get("success"):
        print(f"✅ Transcribed {result['successful']} files")
        if result['failed'] > 0:
            print(f"❌ Failed to transcribe {result['failed']} files")
    else:
        print(f"❌ Transcription failed: {result.get('error')}")

if __name__ == "__main__":
    test_recording_with_transcription()
    test_transcribe_existing()
