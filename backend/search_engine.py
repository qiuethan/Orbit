#!/usr/bin/env python3
"""
Combined Search Engine

This is the main search engine that combines all modules: face search, SERP search, and web scraping.
It provides a simple interface to perform comprehensive searches.
"""

import os
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Import our modules
from modules.face_search import FaceSearchModule
from modules.serp_search import SerpSearchModule
from modules.web_scraper import WebScraperModule

# Load environment variables
load_dotenv()


class SearchEngine:
    """
    Main search engine that combines face search, SERP search, and web scraping.
    """
    
    def __init__(self, face_api_token: Optional[str] = None, 
                 serp_api_key: Optional[str] = None,
                 testing_mode: bool = True):
        """
        Initialize the Search Engine with all modules.
        
        Args:
            face_api_token: FaceCheck.id API token
            serp_api_key: SERP API key
            testing_mode: Use testing mode for face search
        """
        # Initialize modules
        self.face_module = FaceSearchModule(face_api_token, testing_mode)
        self.serp_module = SerpSearchModule(serp_api_key)
        self.scraper_module = WebScraperModule(delay=1.5)
        
        self.testing_mode = testing_mode
    
    def search_face_with_serp(self, image_input, min_score: int = 85, 
                             max_face_results: int = 5, max_serp_per_url: int = 5,
                             scrape_content: bool = False) -> Dict:
        """
        Perform face search followed by SERP search for found URLs.
        
        Args:
            image_input: Image to search (file path, URL, base64, or bytes)
            min_score: Minimum face match score
            max_face_results: Maximum face search results to process
            max_serp_per_url: Maximum SERP results per face match URL
            scrape_content: Whether to scrape full content from SERP results
            
        Returns:
            Dictionary containing all search results
        """
        try:
            print("🚀 Starting Face + SERP Search")
            print("=" * 50)
            
            # Validate inputs
            if not image_input:
                return {"error": "No image input provided", "step": "validation"}
            
            # Step 1: Face Search
            print("🔍 Step 1: Face recognition search...")
            error, face_results = self.face_module.search(
                image_input, 
                min_score=min_score, 
                max_results=max_face_results
            )
            
            if error:
                return {"error": error, "step": "face_search"}
            
            # Handle empty face results
            if not face_results or len(face_results) == 0:
                return {
                    "success": True,
                    "face_results": [],
                    "serp_results": {},
                    "scraped_results": {} if scrape_content else None,
                    "summary": {
                        "face_matches": 0,
                        "total_mentions": 0,
                        "urls_with_mentions": 0,
                        "scraped_pages": 0
                    }
                }
            
            print(f"✅ Found {len(face_results)} face matches with score >= {min_score}")
            
            # Step 2: SERP Search for each face match URL
            print("🔍 Step 2: Searching for mentions of face match URLs...")
            face_urls = [result.get('url', '') for result in face_results if result.get('url')]
            
            # Handle case where no valid URLs are found
            if not face_urls:
                return {
                    "success": True,
                    "face_results": face_results,
                    "serp_results": {},
                    "scraped_results": {} if scrape_content else None,
                    "summary": {
                        "face_matches": len(face_results),
                        "total_mentions": 0,
                        "urls_with_mentions": 0,
                        "scraped_pages": 0
                    }
                }
            
            serp_results = self.serp_module.search_urls(face_urls, max_serp_per_url)
            
            # Safely calculate total mentions
            total_mentions = 0
            if isinstance(serp_results, dict):
                for mentions in serp_results.values():
                    if isinstance(mentions, list):
                        total_mentions += len(mentions)
            
            print(f"✅ Found {total_mentions} total mentions across all URLs")
            
            # Step 3: Web Scraping (optional)
            scraped_results = {}
            if scrape_content and total_mentions > 0:
                print("🕷️  Step 3: Scraping full content from mention pages...")
                
                for i, (face_url, mentions) in enumerate(serp_results.items(), 1):
                    if mentions and isinstance(mentions, list) and len(mentions) > 0:
                        print(f"  Scraping mentions for URL {i}/{len(serp_results)}")
                        scraped_pages = self.scraper_module.scrape_serp_results(mentions)
                        scraped_results[face_url] = scraped_pages
            
            # Safely count scraped pages
            scraped_pages_count = 0
            if scrape_content and isinstance(scraped_results, dict):
                for pages in scraped_results.values():
                    if isinstance(pages, list):
                        scraped_pages_count += len(pages)
            
            # Compile results
            return {
                "success": True,
                "face_results": face_results,
                "serp_results": serp_results,
                "scraped_results": scraped_results if scrape_content else None,
                "summary": {
                    "face_matches": len(face_results),
                    "total_mentions": total_mentions,
                    "urls_with_mentions": len([urls for urls in serp_results.values() if urls]) if isinstance(serp_results, dict) else 0,
                    "scraped_pages": scraped_pages_count
                }
            }
            
        except Exception as e:
            return {"error": f"Unexpected error in face+SERP search: {str(e)}", "step": "unexpected_error"}
    
    def search_terms_only(self, terms: List[str], search_types: List[str] = None,
                         scrape_content: bool = False) -> Dict:
        """
        Search for terms without face recognition (fallback when no face found).
        
        Args:
            terms: List of terms to search for
            search_types: Types of searches to perform
            scrape_content: Whether to scrape content from results
            
        Returns:
            Dictionary containing search results
        """
        print(f"🔍 Searching for terms: {', '.join(terms)}")
        print("=" * 50)
        
        # SERP search for terms
        serp_results = self.serp_module.search_terms(terms, search_types)
        
        # Count total results
        total_results = sum(sum(len(type_results) for type_results in term_data.values()) 
                          for term_data in serp_results.values())
        
        print(f"✅ Found {total_results} total results")
        
        # Web scraping (optional)
        scraped_results = {}
        if scrape_content and total_results > 0:
            print("🕷️  Scraping content from search results...")
            
            for term, term_data in serp_results.items():
                term_scraped = {}
                for search_type, results in term_data.items():
                    if results:
                        scraped_pages = self.scraper_module.scrape_serp_results(results)
                        term_scraped[search_type] = scraped_pages
                
                if term_scraped:
                    scraped_results[term] = term_scraped
        
        return {
            "success": True,
            "serp_results": serp_results,
            "scraped_results": scraped_results if scrape_content else None,
            "summary": {
                "terms_searched": len(terms),
                "total_results": total_results,
                "scraped_pages": sum(sum(len(pages) for pages in term_data.values()) 
                                   for term_data in scraped_results.values()) if scrape_content else 0
            }
        }
    
    def comprehensive_search(self, image_input=None, fallback_terms: List[str] = None,
                           min_score: int = 85, scrape_content: bool = True) -> Dict:
        """
        Perform comprehensive search: try face search first, fallback to term search.
        
        Args:
            image_input: Image for face search (optional)
            fallback_terms: Terms to search if face search fails
            min_score: Minimum face match score
            scrape_content: Whether to scrape content
            
        Returns:
            Dictionary containing all search results
        """
        if image_input:
            # Try face search first
            face_results = self.search_face_with_serp(
                image_input, 
                min_score=min_score, 
                scrape_content=scrape_content
            )
            
            if face_results.get("success"):
                return {**face_results, "search_method": "face_search"}
            else:
                print(f"Face search failed: {face_results.get('error', 'Unknown error')}")
        
        # Fallback to term search
        if fallback_terms:
            print("\n🔄 Falling back to term search...")
            term_results = self.search_terms_only(fallback_terms, scrape_content=scrape_content)
            return {**term_results, "search_method": "term_search"}
        
        return {"error": "No valid search method available", "search_method": "none"}


def display_results(results: Dict):
    """Display search results in a readable format."""
    try:
        if not results or not isinstance(results, dict):
            print("❌ No results to display")
            return
        
        if not results.get("success"):
            print(f"❌ Search failed: {results.get('error', 'Unknown error')}")
            return
        
        search_method = results.get("search_method", "unknown")
        summary = results.get("summary", {})
        
        if not isinstance(summary, dict):
            print("❌ Invalid summary format")
            return
        
        print(f"\n📊 SEARCH RESULTS SUMMARY ({search_method})")
        print("=" * 60)
        
        if "face_matches" in summary:
            print(f"🎯 Face matches: {summary.get('face_matches', 0)}")
            print(f"🔍 Total mentions: {summary.get('total_mentions', 0)}")
        
        if "terms_searched" in summary:
            print(f"🔍 Terms searched: {summary.get('terms_searched', 0)}")
            print(f"📄 Total results: {summary.get('total_results', 0)}")
        
        if summary.get("scraped_pages", 0) > 0:
            print(f"🕷️  Pages scraped: {summary['scraped_pages']}")
        
        # Show sample results safely
        face_results = results.get("face_results", [])
        if isinstance(face_results, list) and face_results:
            print(f"\n🎯 Top Face Matches:")
            for i, result in enumerate(face_results[:3], 1):
                if isinstance(result, dict):
                    score = result.get('score', 'N/A')
                    url = result.get('url', 'N/A')
                    print(f"  {i}. Score: {score} - {url}")
        
        serp_results = results.get("serp_results", {})
        if isinstance(serp_results, dict) and serp_results:
            print(f"\n🔍 Sample SERP Results:")
            count = 0
            for url, mentions in serp_results.items():
                if isinstance(mentions, list) and mentions and count < 3:
                    first_mention = mentions[0]
                    if isinstance(first_mention, dict):
                        title = first_mention.get('title', 'No title')[:60]
                        link = first_mention.get('link', 'No link')
                        print(f"  📄 {title}...")
                        print(f"      {link}")
                        count += 1
                        
    except Exception as e:
        print(f"❌ Error displaying results: {str(e)}")


def main():
    """Main function for testing the search engine."""
    print("🚀 Comprehensive Search Engine")
    print("=" * 40)
    
    # Check for image file
    image_file = 'image.jpg'

    TESTING_MODE = False
    
    try:
        # Initialize search engine
        engine = SearchEngine(testing_mode=TESTING_MODE)
        
        if os.path.exists(image_file):
            print(f"Found image file: {image_file}")
            
            # Comprehensive search with face + fallback
            results = engine.comprehensive_search(
                image_input=image_file,
                fallback_terms=["Edward Kim"],  # Fallback if face search fails
                scrape_content=False  # Set to True for deep content
            )
        else:
            print(f"No image file found, using term search only")
            
            # Term search only
            results = engine.search_terms_only(
                terms=["Alvina Yang"],
                search_types=["general"],
                scrape_content=False
            )
        
        # Display results
        display_results(results)
        
        print(f"\n✅ Search completed!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
