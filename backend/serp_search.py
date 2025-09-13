"""
SERP API Search Module

This module provides functionality to search URLs using SERP API and extract metadata
with snippets from search results.
"""

import os
import time
from typing import List, Dict, Optional
from dotenv import load_dotenv
from serpapi import GoogleSearch
from urllib.parse import urlparse, quote

# Load environment variables
load_dotenv()


class SerpSearchAPI:
    """
    A class to handle SERP API searches and metadata extraction.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the SerpSearchAPI with your SERP API key.
        
        Args:
            api_key (str, optional): Your SERP API key. If not provided, 
                                   will try to load from SERPAPI_KEY environment variable.
        """
        self.api_key = api_key or os.getenv('SERPAPI_KEY')
        if not self.api_key:
            raise ValueError("SERP API key is required. Set SERPAPI_KEY environment variable or pass api_key parameter.")
    
    def extract_domain_from_url(self, url: str) -> str:
        """Extract domain from URL for search query."""
        try:
            parsed = urlparse(url)
            return parsed.netloc.replace('www.', '')
        except:
            return url
    
    def search_url_mentions(self, url: str, max_results: int = 5) -> List[Dict]:
        """
        Search for web pages that mention or reference a specific URL.
        
        Args:
            url (str): The URL to search for
            max_results (int): Maximum number of results to return (default: 5)
        
        Returns:
            List of dictionaries containing search results with snippets
        """
        try:
            # Create search query to find pages that mention this URL
            # We'll search for the URL in quotes to find exact mentions
            search_query = f'"{url}"'
            
            # Perform search
            search = GoogleSearch({
                "q": search_query,
                "api_key": self.api_key,
                "num": max_results,
                "hl": "en"  # English results
            })
            
            results = search.get_dict()
            
            # Extract relevant information
            search_results = []
            
            if "organic_results" in results:
                for i, result in enumerate(results["organic_results"][:max_results]):
                    search_result = {
                        "rank": i + 1,
                        "title": result.get("title", "No title"),
                        "link": result.get("link", ""),
                        "snippet": result.get("snippet", "No snippet available"),
                        "displayed_link": result.get("displayed_link", ""),
                        "position": result.get("position", i + 1),
                        "source_url": url  # The original URL that was searched for
                    }
                    
                    # Add additional metadata if available
                    if "rich_snippet" in result:
                        search_result["rich_snippet"] = result["rich_snippet"]
                    
                    if "sitelinks" in result:
                        search_result["sitelinks"] = result["sitelinks"]
                    
                    if "date" in result:
                        search_result["date"] = result["date"]
                    
                    if "cached_page_link" in result:
                        search_result["cached_page_link"] = result["cached_page_link"]
                    
                    if "related_pages_link" in result:
                        search_result["related_pages_link"] = result["related_pages_link"]
                    
                    search_results.append(search_result)
            
            return search_results
            
        except Exception as e:
            print(f"Error searching for mentions of URL {url}: {str(e)}")
            return []
    
    def search_multiple_urls(self, urls: List[str], max_results_per_url: int = 5) -> Dict[str, List[Dict]]:
        """
        Search for web pages that mention multiple URLs.
        
        Args:
            urls (List[str]): List of URLs to search for mentions
            max_results_per_url (int): Maximum results per URL (default: 5)
        
        Returns:
            Dictionary mapping URLs to their search results
        """
        all_results = {}
        
        for i, url in enumerate(urls):
            print(f"Searching for mentions of URL {i+1}/{len(urls)}: {url}")
            
            results = self.search_url_mentions(url, max_results_per_url)
            all_results[url] = results
            
            # Add delay to avoid rate limiting
            if i < len(urls) - 1:
                time.sleep(1)
        
        return all_results
    
    def search_face_match_urls(self, face_search_results: List[Dict], max_results_per_url: int = 5) -> Dict[str, Dict]:
        """
        Search for web pages that mention URLs from face search results.
        
        Args:
            face_search_results (List[Dict]): Results from face search API
            max_results_per_url (int): Maximum results per URL (default: 5)
        
        Returns:
            Dictionary containing both face search data and SERP search results
        """
        enhanced_results = {}
        
        for i, face_result in enumerate(face_search_results):
            url = face_result.get('url', '')
            if not url:
                continue
            
            print(f"Searching for mentions of face match URL {i+1}/{len(face_search_results)}: {url}")
            
            # Get SERP search results for mentions of this URL
            serp_results = self.search_url_mentions(url, max_results_per_url)
            
            # Combine face search data with SERP results
            enhanced_results[url] = {
                "face_search_data": face_result,
                "serp_search_results": serp_results,
                "metadata": {
                    "face_score": face_result.get('score', 0),
                    "serp_results_count": len(serp_results),
                    "has_snippets": any(result.get('snippet', '') != 'No snippet available' for result in serp_results),
                    "pages_mentioning_url": len(serp_results)
                }
            }
            
            # Add delay to avoid rate limiting
            if i < len(face_search_results) - 1:
                time.sleep(1)
        
        return enhanced_results


def search_urls_with_serp(urls: List[str], serp_api_key: Optional[str] = None) -> Dict[str, List[Dict]]:
    """
    Simple function to search multiple URLs using SERP API.
    
    Args:
        urls (List[str]): List of URLs to search
        serp_api_key (str, optional): SERP API key (will use env var if not provided)
    
    Returns:
        Dictionary mapping URLs to their search results
    """
    api = SerpSearchAPI(serp_api_key)
    return api.search_multiple_urls(urls)


# Example usage
if __name__ == "__main__":
    # Load SERP API key from environment
    SERPAPI_KEY = os.getenv('SERPAPI_KEY')
    
    if not SERPAPI_KEY:
        print("Error: SERPAPI_KEY not found in environment variables.")
        print("Please add your SERP API key to your .env file:")
        print("SERPAPI_KEY=your_serpapi_key_here")
        exit(1)
    
    # Example URLs to search (you would get these from face search results)
    test_urls = [
        "https://www.imdb.com/name/nm0185819/",
        "https://en.wikipedia.org/wiki/Daniel_Craig"
    ]
    
    print("🔍 Testing SERP API Search for URL Mentions")
    print("=" * 50)
    
    # Initialize SERP search API
    serp_api = SerpSearchAPI(SERPAPI_KEY)
    
    # Search for web pages that mention these URLs
    results = serp_api.search_multiple_urls(test_urls, max_results_per_url=5)
    
    # Display results
    for original_url, search_results in results.items():
        print(f"\n📄 Pages mentioning: {original_url}")
        print("-" * 60)
        
        if search_results:
            print(f"Found {len(search_results)} pages that mention this URL:")
            for result in search_results:
                print(f"\n{result['rank']}. {result['title']}")
                print(f"   🔗 Page URL: {result['link']}")
                print(f"   📝 Snippet: {result['snippet']}")
                if result.get('date'):
                    print(f"   📅 Date: {result['date']}")
        else:
            print("No pages found that mention this URL")
    
    print("\n✅ SERP search test completed!")
