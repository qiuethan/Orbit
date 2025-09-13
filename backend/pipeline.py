"""
Search + LLM Analysis Pipeline

This module orchestrates the complete search and analysis pipeline.
"""

import os
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

# Import search engine
from search import SearchEngine

# Import simple LLM interface
from llm import SimpleLLM

# Load environment variables
load_dotenv()


class SearchAnalysisPipeline:
    """
    Complete pipeline that combines search functionality with LLM analysis.
    """
    
    def __init__(self, 
                 face_api_token: Optional[str] = None,
                 serp_api_key: Optional[str] = None,
                 openai_api_key: Optional[str] = None,
                 testing_mode: Optional[bool] = None):
        """
        Initialize the search and analysis pipeline.
        """
        # Determine testing mode from environment if not specified
        if testing_mode is None:
            testing_mode_env = os.getenv('TESTING_MODE', 'true').lower()
            testing_mode = testing_mode_env in ('true', '1', 'yes', 'on')
        
        # Initialize search engine
        self.search_engine = SearchEngine(
            face_api_token=face_api_token,
            serp_api_key=serp_api_key,
            testing_mode=testing_mode
        )
        
        # Initialize simple LLM interface
        self.llm = None
        self.llm_available = False
        
        try:
            self.llm = SimpleLLM(api_key=openai_api_key)
            self.llm_available = True
            info = self.llm.get_info()
            print(f"✅ LLM initialized with {info['provider'].title()} ({info['model']})")
        except Exception as e:
            print(f"⚠️  LLM not available: {e}")
            print("   Pipeline will work without AI analysis")
    
    def analyze_results_with_llm(self, search_results: Dict, custom_prompt: str) -> str:
        """
        Analyze search results with a custom prompt.
        """
        if not self.llm_available:
            return "LLM not available for analysis"
        
        try:
            context = self._format_results_for_llm(search_results)
            return self.llm.analyze(context, custom_prompt)
        except Exception as e:
            return f"LLM analysis error: {str(e)}"
    
    def _format_results_for_llm(self, search_results: Dict) -> str:
        """Convert search results to a readable format for LLM analysis."""
        context_parts = []
        
        # Add face search results
        face_results = search_results.get("face_results", [])
        if face_results:
            context_parts.append("FACE RECOGNITION RESULTS:")
            for i, result in enumerate(face_results[:5], 1):
                if isinstance(result, dict):
                    score = result.get('score', 'N/A')
                    url = result.get('url', 'N/A')
                    context_parts.append(f"{i}. Match: {score}% confidence - {url}")
            context_parts.append("")
        
        # Add SERP results
        serp_results = search_results.get("serp_results", {})
        if serp_results:
            context_parts.append("WEB SEARCH RESULTS:")
            for url, mentions in serp_results.items():
                if isinstance(mentions, list) and mentions:
                    context_parts.append(f"\nFor: {url}")
                    for mention in mentions[:3]:
                        if isinstance(mention, dict):
                            title = mention.get('title', 'No title')
                            snippet = mention.get('snippet', 'No snippet')
                            link = mention.get('link', 'No link')
                            context_parts.append(f"- {title}")
                            context_parts.append(f"  {snippet}")
                            context_parts.append(f"  Source: {link}")
            context_parts.append("")
        
        # Add scraped content
        scraped_results = search_results.get("scraped_results", {})
        if scraped_results:
            context_parts.append("DETAILED CONTENT:")
            for url, pages in scraped_results.items():
                if isinstance(pages, list):
                    for page in pages[:2]:
                        if isinstance(page, dict):
                            scraped_content = page.get("scraped_content", {})
                            if scraped_content.get("success"):
                                content = scraped_content.get("content", {})
                                if isinstance(content, dict):
                                    title = content.get("title", "No title")
                                    text = content.get("text", "")
                                    context_parts.append(f"\nArticle: {title}")
                                    if text:
                                        preview = text[:500] + "..." if len(text) > 500 else text
                                        context_parts.append(f"Content: {preview}")
        
        # Add summary
        summary = search_results.get("summary", {})
        if summary:
            context_parts.append("\nSUMMARY STATISTICS:")
            for key, value in summary.items():
                context_parts.append(f"- {key.replace('_', ' ').title()}: {value}")
        
        return "\n".join(context_parts)
    
    def complete_face_search(self, 
                            image_input,
                            min_score: int = 85,
                            max_face_results: int = 5,
                            max_serp_per_url: int = 5,
                            custom_prompt: str = None) -> Dict[str, Any]:
        """
        Complete face search pipeline: Image → Face Search → URL Search → Web Scraping → LLM Analysis.
        """
        print("🚀 COMPLETE FACE SEARCH PIPELINE")
        print("📸 Image → 🔍 Face Search → 🌐 URL Search → 📄 Web Scraping → 🤖 LLM Analysis")
        print("=" * 80)
        
        try:
            # Phase 1: Search Operations
            print("🔍 Phase 1: Running complete search operations...")
            search_results = self.search_engine.search_face_with_serp(
                image_input=image_input,
                min_score=min_score,
                max_face_results=max_face_results,
                max_serp_per_url=max_serp_per_url,
                scrape_content=True
            )
            
            if not search_results.get("success"):
                return {
                    "success": False,
                    "error": f"Search operations failed: {search_results.get('error', 'Unknown error')}",
                }
            
            print("✅ Search operations completed successfully")
            summary = search_results.get("summary", {})
            print(f"   📊 Results: {summary.get('face_matches', 0)} faces, {summary.get('total_mentions', 0)} mentions, {summary.get('scraped_pages', 0)} pages")
            
            # Phase 2: LLM Analysis
            if self.llm_available and self._has_meaningful_results(search_results):
                print("🤖 Phase 2: Analyzing results with LLM...")
                
                if custom_prompt:
                    analysis_prompt = custom_prompt
                    print(f"   Using custom prompt: {custom_prompt[:60]}...")
                else:
                    analysis_prompt = """Analyze the following search results and provide a comprehensive profile including:

1. IDENTITY: Who is this person based on the facial recognition and web search results?
2. PROFESSIONAL BACKGROUND: What are their notable achievements, roles, or current position?
3. EXPERTISE & ACTIVITIES: What can we determine about their areas of expertise or recent activities?
4. PUBLIC PRESENCE: What is their overall reputation and how are they known publicly?
5. RECENT DEVELOPMENTS: Are there any recent news, announcements, or developments?

Please provide a detailed but well-structured analysis based on the available search data."""
                    print("   Using default comprehensive analysis prompt")
                
                try:
                    analysis_result = self.analyze_results_with_llm(search_results, analysis_prompt)
                    search_results["llm_analysis"] = {
                        "analysis": analysis_result,
                        "prompt_used": analysis_prompt,
                        "provider": self.llm.get_info()["provider"] if self.llm else "unknown",
                        "model": self.llm.get_info()["model"] if self.llm else "unknown"
                    }
                    print("✅ LLM analysis completed successfully")
                except Exception as e:
                    search_results["llm_analysis"] = {
                        "error": f"LLM analysis failed: {str(e)}"
                    }
                    print(f"⚠️  LLM analysis failed: {str(e)}")
            
            elif not self.llm_available:
                search_results["llm_analysis"] = {
                    "error": "LLM not available - missing API key (set CEREBRAS_KEY or OPENAI_API_KEY)"
                }
                print("⚠️  LLM analysis skipped - no API key available")
            else:
                search_results["llm_analysis"] = {
                    "error": "Insufficient search results for meaningful analysis"
                }
                print("⚠️  LLM analysis skipped - insufficient data found")
            
            print("🎉 COMPLETE PIPELINE FINISHED SUCCESSFULLY!")
            print(f"   🧠 LLM Analysis: {'✅ Completed' if 'analysis' in search_results.get('llm_analysis', {}) else '❌ Failed/Skipped'}")
            
            return search_results
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Pipeline error: {str(e)}"
            }
    
    def _has_meaningful_results(self, search_results: Dict) -> bool:
        """Check if search results contain meaningful data for analysis."""
        summary = search_results.get("summary", {})
        return (summary.get("face_matches", 0) > 0 and 
               summary.get("total_mentions", 0) > 0)


# Simple function interface
def complete_face_analysis(image_input, custom_prompt: str = None) -> Dict[str, Any]:
    """
    Complete face analysis: Image → Face Search → URL Search → Web Scraping → LLM Analysis.
    
    Args:
        image_input: Image to search (file path, URL, base64, or bytes)
        custom_prompt: Custom prompt for LLM analysis (optional)
        
    Returns:
        Complete pipeline results with LLM analysis
    """
    pipeline = SearchAnalysisPipeline()
    return pipeline.complete_face_search(
        image_input=image_input,
        custom_prompt=custom_prompt
    )


if __name__ == "__main__":
    print("🚀 Testing Complete Face Analysis Pipeline")
    print("Use: from pipeline import complete_face_analysis")
    print("     results = complete_face_analysis('image.jpg')")