"""
Conversation Summarizer Module

Analyzes conversation transcripts and extracts key topics and summaries using LLM.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

# Import the LLM interface
import sys
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from llm.llm import LLM

class ConversationSummarizer:
    """Summarizes conversations and extracts key topics using LLM."""
    
    def __init__(self, temperature: float = 0.3, provider: str = None):
        """
        Initialize the conversation summarizer.
        
        Args:
            temperature: LLM temperature for response creativity
            provider: LLM provider ('cerebras' or 'openai')
        """
        self.logger = logging.getLogger("conversation_summarizer")
        self.temperature = temperature
        
        try:
            self.llm = LLM(provider=provider, temperature=temperature)
            self.logger.info(f"Conversation summarizer initialized with {self.llm.provider}")
        except Exception as e:
            self.logger.error(f"Failed to initialize LLM: {e}")
            self.llm = None
    
    def summarize_transcript(self, transcript_text: str, custom_instructions: str = None) -> Dict[str, Any]:
        """
        Summarize a conversation transcript and extract topics.
        
        Args:
            transcript_text: The conversation transcript text
            custom_instructions: Optional custom instructions for summarization
            
        Returns:
            Dict with summary, topics, and metadata
        """
        if not self.llm:
            return {"success": False, "error": "LLM not available"}
        
        try:
            # Create simple prompt for topic extraction
            base_prompt = f"""
Analyze this conversation transcript and extract 3-5 main topics that were discussed.

Keep each topic short (2-4 words) and focus on what they actually talked about.

Transcript:
{transcript_text}

Please format your response as JSON with this structure:
{{
    "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]
}}

{f"Additional instructions: {custom_instructions}" if custom_instructions else ""}
"""
            
            response = self.llm.chat(base_prompt, max_tokens=1024)
            
            # Try to parse JSON response
            try:
                analysis = json.loads(response)
                
                # Validate topics field
                if "topics" not in analysis or not isinstance(analysis["topics"], list):
                    analysis["topics"] = ["General Discussion", "Main Topic", "Follow Up"]
                
                # Ensure we have 3-5 topics
                topics = analysis["topics"]
                if len(topics) < 3:
                    while len(topics) < 3:
                        topics.append(f"Discussion Point {len(topics) + 1}")
                elif len(topics) > 5:
                    topics = topics[:5]
                
                analysis["topics"] = topics
                
                return {
                    "success": True,
                    "summary_data": {
                        "topics": topics,
                        "summary": "Conversation topics extracted"
                    },
                    "topics": topics,
                    "model_info": {
                        "provider": self.llm.provider,
                        "model": self.llm.model,
                        "temperature": self.temperature
                    }
                }
                
            except json.JSONDecodeError:
                # Fallback: extract topics from text response
                self.logger.warning("Failed to parse JSON response, using fallback extraction")
                return self._fallback_topic_extraction(response)
                
        except Exception as e:
            self.logger.error(f"Error summarizing transcript: {e}")
            return {"success": False, "error": str(e)}
    
    def _fallback_topic_extraction(self, response_text: str) -> Dict[str, Any]:
        """
        Fallback method to extract topics from unstructured response.
        
        Args:
            response_text: Raw LLM response
            
        Returns:
            Dict with extracted topics and basic analysis
        """
        try:
            # Simple topic extraction from response
            lines = response_text.split('\n')
            topics = []
            summary = "Conversation analysis completed"
            
            # Look for numbered lists or bullet points
            for line in lines:
                line = line.strip()
                if any(marker in line.lower() for marker in ['topic', '1.', '2.', '3.', '4.', '5.', '-', '*']):
                    # Clean up the topic
                    clean_topic = line
                    for marker in ['1.', '2.', '3.', '4.', '5.', '-', '*', 'topic:', 'topic']:
                        clean_topic = clean_topic.replace(marker, '').strip()
                    
                    if len(clean_topic) > 3 and len(clean_topic) < 50:
                        topics.append(clean_topic)
                
                # Look for summary
                if 'summary' in line.lower() and len(line) > 20:
                    summary = line.replace('summary:', '').replace('Summary:', '').strip()
            
            # Ensure we have 3-5 topics
            if len(topics) < 3:
                while len(topics) < 3:
                    topics.append(f"Discussion Point {len(topics) + 1}")
            elif len(topics) > 5:
                topics = topics[:5]
            
            return {
                "success": True,
                "summary_data": {
                    "topics": topics,
                    "summary": "Topics extracted from conversation"
                },
                "topics": topics,
                "model_info": {
                    "provider": self.llm.provider,
                    "model": self.llm.model,
                    "temperature": self.temperature
                }
            }
            
        except Exception as e:
            self.logger.error(f"Fallback extraction failed: {e}")
            return {
                "success": False,
                "error": f"Both primary and fallback analysis failed: {e}"
            }


def summarize_conversation(transcript_path: str, 
                         custom_instructions: str = None,
                         temperature: float = 0.3,
                         max_tokens: int = 1024) -> Dict[str, Any]:
    """
    Function interface to summarize a conversation transcript file.
    
    Args:
        transcript_path: Path to the transcript JSON file
        custom_instructions: Optional custom instructions
        temperature: LLM temperature
        max_tokens: Maximum tokens for response
        
    Returns:
        Dict with summary results
    """
    try:
        # Load transcript
        if not os.path.exists(transcript_path):
            return {"success": False, "error": f"Transcript file not found: {transcript_path}"}
        
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        # Extract text from transcript
        transcript_text = transcript_data.get("transcription", {}).get("text", "")
        
        if not transcript_text or transcript_text.strip() == "":
            return {"success": False, "error": "No transcript text found in file"}
        
        # Initialize summarizer and analyze
        summarizer = ConversationSummarizer(temperature=temperature)
        result = summarizer.summarize_transcript(transcript_text, custom_instructions)
        
        if result["success"]:
            # Save summary to file
            summary_path = transcript_path.replace('_transcript.json', '_summary.json')
            
            # Create comprehensive summary data
            summary_data = {
                "transcript_file": os.path.basename(transcript_path),
                "analyzed_at": datetime.now().isoformat(),
                "summary": result["summary_data"],
                "model_info": result["model_info"],
                "original_duration": transcript_data.get("summary", {}).get("total_duration", 0),
                "word_count": transcript_data.get("summary", {}).get("word_count", 0)
            }
            
            with open(summary_path, 'w', encoding='utf-8') as f:
                json.dump(summary_data, f, indent=2, ensure_ascii=False)
            
            result["summary_file"] = summary_path
            
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def summarize_all_conversations(conversations_dir: str,
                               custom_instructions: str = None,
                               temperature: float = 0.3,
                               max_tokens: int = 1024) -> Dict[str, Any]:
    """
    Summarize all conversation transcripts in a directory.
    
    Args:
        conversations_dir: Directory containing transcript files
        custom_instructions: Optional custom instructions
        temperature: LLM temperature
        max_tokens: Maximum tokens for response
        
    Returns:
        Dict with batch processing results
    """
    try:
        if not os.path.exists(conversations_dir):
            return {"success": False, "error": f"Directory not found: {conversations_dir}"}
        
        # Find all transcript files
        transcript_files = [f for f in os.listdir(conversations_dir) 
                          if f.endswith('_transcript.json')]
        
        if not transcript_files:
            return {"success": False, "error": "No transcript files found"}
        
        processed = []
        failed = []
        
        for transcript_file in transcript_files:
            transcript_path = os.path.join(conversations_dir, transcript_file)
            
            try:
                result = summarize_conversation(
                    transcript_path, 
                    custom_instructions=custom_instructions,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                
                if result["success"]:
                    processed.append({
                        "file": transcript_file,
                        "summary_file": os.path.basename(result.get("summary_file", "")),
                        "topics": result.get("topics", [])
                    })
                else:
                    failed.append({
                        "file": transcript_file,
                        "error": result["error"]
                    })
                    
            except Exception as e:
                failed.append({
                    "file": transcript_file,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "folder": conversations_dir,
            "processed": processed,
            "failed": failed,
            "summary_count": len(processed),
            "error_count": len(failed)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


# Example usage
if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    
    # Test with a sample transcript
    sample_transcript = "Hello, how are you today? I wanted to discuss the new project timeline and deliverables. We need to finish the frontend by next week."
    
    summarizer = ConversationSummarizer()
    result = summarizer.summarize_transcript(sample_transcript)
    
    if result["success"]:
        print("Summary:", result["summary_data"]["summary"])
        print("Topics:", result["topics"])
    else:
        print("Error:", result["error"])
