"""
SERP Search Module

This module provides clean SERP API search functionality for URLs and terms.
"""

import os
import time
from typing import List, Dict, Optional
from dotenv import load_dotenv
from serpapi import GoogleSearch
from urllib.parse import urlparse

# Load environment variables
load_dotenv()


class SerpSearchModule:
    """
    A clean module for SERP API searches supporting both URL mentions and term searches.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the SERP Search Module.
        
        Args:
            api_key (str, optional): SERP API key. If None, loads from env.
        """
        self.api_key = api_key or os.getenv('SERPAPI_KEY')
        if not self.api_key:
            raise ValueError("SERP API key is required. Set SERPAPI_KEY environment variable or pass api_key parameter.")
    
    def search_urls(self, urls: List[str], max_results_per_url: int = 5) -> Dict[str, List[Dict]]:
        """
        Search for web pages that mention specific URLs.
        
        Args:
            urls: List of URLs to search for mentions
            max_results_per_url: Maximum results per URL
            
        Returns:
            Dictionary mapping URLs to their search results
        """
        # Validate inputs
        if not urls or not isinstance(urls, list):
            return {}
        
        if max_results_per_url <= 0:
            max_results_per_url = 5
        
        all_results = {}
        
        # Filter out invalid URLs
        valid_urls = [url for url in urls if url and isinstance(url, str) and url.strip()]
        if not valid_urls:
            return {}
        
        for i, url in enumerate(valid_urls, 1):
            print(f"🔍 Searching for mentions of URL {i}/{len(valid_urls)}: {url}")
            
            try:
                # Simple Google search with the URL (like typing it in Google search bar)
                search_query = url
                search = GoogleSearch({
                    "q": search_query,
                    "api_key": self.api_key,
                    "num": max_results_per_url,
                    "hl": "en"
                })
                
                results = search.get_dict()
                search_results = []
                
                # Handle missing or empty results
                if not results or not isinstance(results, dict):
                    all_results[url] = []
                    continue
                
                if "organic_results" in results and isinstance(results["organic_results"], list):
                    for j, result in enumerate(results["organic_results"][:max_results_per_url]):
                        if not isinstance(result, dict):
                            continue
                            
                        search_result = {
                            "rank": j + 1,
                            "title": result.get("title", "No title") or "No title",
                            "link": result.get("link", "") or "",
                            "snippet": result.get("snippet", "No snippet available") or "No snippet available",
                            "displayed_link": result.get("displayed_link", "") or "",
                            "source_url": url
                        }
                        
                        # Add additional metadata safely
                        for field in ["date", "cached_page_link", "related_pages_link"]:
                            if field in result and result[field]:
                                search_result[field] = result[field]
                        
                        search_results.append(search_result)
                
                all_results[url] = search_results
                
            except Exception as e:
                print(f"Error searching URL {url}: {str(e)}")
                all_results[url] = []
            
            # Be respectful with API calls
            if i < len(valid_urls):
                time.sleep(1)
        
        return all_results
    
    def search_terms(self, terms: List[str], search_types: List[str] = None, 
                    max_results_per_term: int = 5) -> Dict[str, Dict[str, List[Dict]]]:
        """
        Search for information about terms with different search types.
        
        Args:
            terms: List of terms to search for
            search_types: Types of searches to perform
            max_results_per_term: Maximum results per term per type
            
        Returns:
            Dictionary mapping terms to search type results
        """
        # Validate inputs
        if not terms or not isinstance(terms, list):
            return {}
        
        if search_types is None:
            search_types = ["general", "news"]
        
        if not isinstance(search_types, list) or not search_types:
            search_types = ["general"]
        
        if max_results_per_term <= 0:
            max_results_per_term = 5
        
        all_results = {}
        
        # Filter out invalid terms
        valid_terms = [term for term in terms if term and isinstance(term, str) and term.strip()]
        if not valid_terms:
            return {}
        
        for term in valid_terms:
            print(f"🔍 Searching for term: {term}")
            term_results = {}
            
            for search_type in search_types:
                print(f"  📊 {search_type.capitalize()} search...")
                
                try:
                    results = self._search_single_term(term, search_type, max_results_per_term)
                    term_results[search_type] = results if isinstance(results, list) else []
                except Exception as e:
                    print(f"  Error in {search_type} search: {str(e)}")
                    term_results[search_type] = []
                
                time.sleep(0.5)  # Small delay between search types
            
            all_results[term] = term_results
            time.sleep(1)  # Delay between terms
        
        return all_results
    
    def _search_single_term(self, term: str, search_type: str, max_results: int) -> List[Dict]:
        """Search for a single term with specific search type."""
        try:
            # Validate inputs
            if not term or not isinstance(term, str):
                return []
            
            if not search_type or not isinstance(search_type, str):
                search_type = "general"
            
            if max_results <= 0:
                max_results = 5
            
            # Build search query based on type
            if search_type == "news":
                search_query = f'"{term}" news'
            elif search_type == "images":
                search_query = f'"{term}" photos images'
            elif search_type == "social":
                search_query = f'"{term}" site:twitter.com OR site:instagram.com OR site:facebook.com OR site:linkedin.com'
            elif search_type == "biography":
                search_query = f'"{term}" biography OR bio OR profile OR about'
            elif search_type == "videos":
                search_query = f'"{term}" videos'
            elif search_type == "academic":
                search_query = f'"{term}" site:scholar.google.com OR site:researchgate.net OR site:academia.edu'
            elif search_type == "company":
                search_query = f'"{term}" company OR corporation OR business OR founded'
            else:  # general
                search_query = f'"{term}"'
            
            # Set up search parameters
            search_params = {
                "q": search_query,
                "api_key": self.api_key,
                "num": max_results,
                "hl": "en"
            }
            
            # Add type-specific parameters
            if search_type == "news":
                search_params["tbm"] = "nws"
            elif search_type == "images":
                search_params["tbm"] = "isch"
            elif search_type == "videos":
                search_params["tbm"] = "vid"
            
            search = GoogleSearch(search_params)
            results = search.get_dict()
            
            # Handle missing or invalid results
            if not results or not isinstance(results, dict):
                return []
            
            # Determine results key based on search type
            results_key = "organic_results"
            if search_type == "news" and "news_results" in results:
                results_key = "news_results"
            elif search_type == "images" and "images_results" in results:
                results_key = "images_results"
            elif search_type == "videos" and "video_results" in results:
                results_key = "video_results"
            
            # Extract results safely
            search_results = []
            if results_key in results and isinstance(results[results_key], list):
                for i, result in enumerate(results[results_key][:max_results]):
                    if not isinstance(result, dict):
                        continue
                        
                    search_result = {
                        "rank": i + 1,
                        "title": result.get("title", "No title") or "No title",
                        "link": result.get("link", "") or "",
                        "snippet": result.get("snippet", "No snippet available") or "No snippet available",
                        "displayed_link": result.get("displayed_link", "") or "",
                        "search_query": search_query,
                        "search_type": search_type
                    }
                    
                    # Add type-specific fields safely
                    if search_type == "news":
                        search_result.update({
                            "date": result.get("date", "") or "",
                            "source": result.get("source", "") or ""
                        })
                    elif search_type == "images":
                        search_result.update({
                            "thumbnail": result.get("thumbnail", "") or "",
                            "original": result.get("original", "") or ""
                        })
                    elif search_type == "videos":
                        search_result.update({
                            "duration": result.get("duration", "") or "",
                            "channel": result.get("channel", "") or "",
                            "views": result.get("views", "") or ""
                        })
                    
                    search_results.append(search_result)
            
            return search_results
            
        except Exception as e:
            print(f"Error in _search_single_term for '{term}' ({search_type}): {str(e)}")
            return []
    
    def get_summary(self, results: Dict) -> Dict:
        """Get a summary of search results."""
        if isinstance(results, dict) and all(isinstance(v, list) for v in results.values()):
            # URL search results
            total_urls = len(results)
            total_mentions = sum(len(mentions) for mentions in results.values())
            return {
                "total_urls_searched": total_urls,
                "total_mentions_found": total_mentions,
                "avg_mentions_per_url": total_mentions / total_urls if total_urls > 0 else 0
            }
        else:
            # Term search results
            total_terms = len(results)
            total_results = sum(sum(len(type_results) for type_results in term_data.values()) 
                              for term_data in results.values())
            return {
                "total_terms_searched": total_terms,
                "total_results_found": total_results
            }


# Simple function interfaces
def search_url_mentions(urls: List[str], api_key: Optional[str] = None, 
                       max_results: int = 5) -> Dict[str, List[Dict]]:
    """
    Simple function to search for URL mentions.
    
    Args:
        urls: List of URLs to search for
        api_key: SERP API key
        max_results: Maximum results per URL
        
    Returns:
        Dictionary mapping URLs to search results
    """
    module = SerpSearchModule(api_key)
    return module.search_urls(urls, max_results)


def search_terms(terms: List[str], search_types: List[str] = None, 
                api_key: Optional[str] = None) -> Dict[str, Dict[str, List[Dict]]]:
    """
    Simple function to search for terms.
    
    Args:
        terms: List of terms to search
        search_types: Types of searches to perform
        api_key: SERP API key
        
    Returns:
        Dictionary mapping terms to search type results
    """
    module = SerpSearchModule(api_key)
    return module.search_terms(terms, search_types)


# Example usage
if __name__ == "__main__":
    print("🔍 SERP Search Module")
    print("=" * 40)
    
    module = SerpSearchModule()
    
    # Example URL search
    print("\n📄 URL search example:")
    test_urls = ["https://www.imdb.com/name/nm0185819/"]
    url_results = module.search_urls(test_urls, max_results_per_url=3)
    
    for url, mentions in url_results.items():
        print(f"Found {len(mentions)} mentions for {url}")
    
    # Example term search
    print("\n🔍 Term search example:")
    test_terms = ["Daniel Craig"]
    term_results = module.search_terms(test_terms, ["general", "news"], max_results_per_term=2)
    
    for term, types in term_results.items():
        total = sum(len(results) for results in types.values())
        print(f"Found {total} results for '{term}'")
