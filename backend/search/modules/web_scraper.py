"""
Web Scraper Module

This module provides clean web content scraping functionality.
"""

import requests
import time
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import newspaper
from newspaper import Article
import warnings

# Suppress newspaper warnings
warnings.filterwarnings('ignore')


class WebScraperModule:
    """
    A clean module for web content scraping and extraction.
    """
    
    def __init__(self, timeout: int = 10, delay: float = 1.0):
        """
        Initialize the Web Scraper Module.
        
        Args:
            timeout: Request timeout in seconds
            delay: Delay between requests to be respectful
        """
        self.timeout = timeout
        self.delay = delay
        self.session = requests.Session()
        
        # Set user agent to avoid blocking
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def scrape_urls(self, urls: List[str]) -> List[Dict]:
        """
        Scrape content from multiple URLs.
        
        Args:
            urls: List of URLs to scrape
            
        Returns:
            List of scraping results
        """
        # Validate inputs
        if not urls or not isinstance(urls, list):
            return []
        
        # Filter out invalid URLs
        valid_urls = []
        for url in urls:
            if url and isinstance(url, str) and url.strip():
                url = url.strip()
                if url.startswith(('http://', 'https://')):
                    valid_urls.append(url)
        
        if not valid_urls:
            return []
        
        results = []
        
        for i, url in enumerate(valid_urls, 1):
            print(f"🕷️  Scraping URL {i}/{len(valid_urls)}: {url}")
            
            try:
                result = self.scrape_single_url(url)
                results.append(result)
                
                # Show progress
                if result.get("success"):
                    word_count = result.get("content", {}).get("word_count", 0)
                    print(f"   ✅ Success: {word_count} words extracted")
                else:
                    print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"   ❌ Exception: {str(e)}")
                results.append({
                    "url": url,
                    "success": False,
                    "error": f"Unexpected error: {str(e)}",
                    "content": {}
                })
            
            # Add delay between requests
            if i < len(valid_urls):
                time.sleep(self.delay)
        
        return results
    
    def scrape_single_url(self, url: str) -> Dict:
        """
        Scrape content from a single URL.
        
        Args:
            url: URL to scrape
            
        Returns:
            Dictionary containing scraped content and metadata
        """
        if not url or not url.startswith(('http://', 'https://')):
            return {
                "url": url,
                "success": False,
                "error": "Invalid URL format",
                "content": {}
            }
        
        # Try newspaper3k first (best for articles)
        content = self._extract_with_newspaper(url)
        
        # If newspaper fails or gives poor results, try BeautifulSoup
        if "error" in content or len(content.get("text", "")) < 100:
            bs_content = self._extract_with_beautifulsoup(url)
            
            # Use the better result
            if len(bs_content.get("text", "")) > len(content.get("text", "")):
                content = bs_content
        
        # Build result
        result = {
            "url": url,
            "success": not ("error" in content),
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "content": content
        }
        
        if "error" in content:
            result["error"] = content["error"]
        
        return result
    
    def _extract_with_newspaper(self, url: str) -> Dict:
        """Extract content using newspaper3k library."""
        try:
            article = Article(url)
            article.download()
            article.parse()
            
            return {
                "method": "newspaper3k",
                "title": article.title or "No title found",
                "text": article.text or "No content extracted",
                "summary": article.summary or "No summary available",
                "authors": article.authors or [],
                "publish_date": str(article.publish_date) if article.publish_date else "Unknown",
                "top_image": article.top_image or "",
                "keywords": article.keywords or [],
                "meta_description": article.meta_description or "",
                "word_count": len(article.text.split()) if article.text else 0
            }
        except Exception as e:
            return {
                "method": "newspaper3k",
                "error": f"Newspaper extraction failed: {str(e)}",
                "title": "Extraction failed",
                "text": "",
                "word_count": 0
            }
    
    def _extract_with_beautifulsoup(self, url: str) -> Dict:
        """Extract content using BeautifulSoup as fallback."""
        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Remove unwanted elements
            for element in soup(["script", "style", "nav", "footer", "aside"]):
                element.decompose()
            
            # Extract title
            title = ""
            if soup.title:
                title = soup.title.string.strip()
            elif soup.find('h1'):
                title = soup.find('h1').get_text().strip()
            
            # Extract meta description
            meta_desc = ""
            meta_tag = soup.find('meta', attrs={'name': 'description'})
            if meta_tag:
                meta_desc = meta_tag.get('content', '')
            
            # Extract main content
            content_selectors = [
                'article', 'main', '.content', '.post', '.entry-content',
                '.article-content', '.story-body', '.post-content'
            ]
            
            content_text = ""
            for selector in content_selectors:
                content_elem = soup.select_one(selector)
                if content_elem:
                    content_text = content_elem.get_text(separator=' ', strip=True)
                    break
            
            # Fallback to body
            if not content_text:
                body = soup.find('body')
                if body:
                    content_text = body.get_text(separator=' ', strip=True)
            
            # Clean up text
            content_text = re.sub(r'\s+', ' ', content_text).strip()
            
            return {
                "method": "beautifulsoup",
                "title": title or "No title found",
                "text": content_text[:5000] if content_text else "No content extracted",
                "meta_description": meta_desc,
                "word_count": len(content_text.split()) if content_text else 0,
                "status_code": response.status_code
            }
            
        except Exception as e:
            return {
                "method": "beautifulsoup",
                "error": f"BeautifulSoup extraction failed: {str(e)}",
                "title": "Extraction failed",
                "text": "",
                "word_count": 0
            }
    
    def scrape_serp_results(self, serp_results: List[Dict]) -> List[Dict]:
        """
        Scrape content from SERP search results.
        
        Args:
            serp_results: SERP search results with 'link' field
            
        Returns:
            List of enhanced results with scraped content
        """
        # Validate inputs
        if not serp_results or not isinstance(serp_results, list):
            return []
        
        enhanced_results = []
        
        # Filter valid SERP results
        valid_serp_results = []
        for serp_result in serp_results:
            if isinstance(serp_result, dict) and serp_result.get('link'):
                url = serp_result.get('link', '').strip()
                if url and url.startswith(('http://', 'https://')):
                    valid_serp_results.append(serp_result)
        
        if not valid_serp_results:
            return []
        
        for i, serp_result in enumerate(valid_serp_results, 1):
            url = serp_result.get('link', '')
            
            print(f"🕷️  Scraping SERP result {i}/{len(valid_serp_results)}")
            
            try:
                # Scrape the URL
                scraped_content = self.scrape_single_url(url)
                
                # Safely extract content information
                content = scraped_content.get("content", {})
                content_text = content.get("text", "") if isinstance(content, dict) else ""
                
                # Combine SERP data with scraped content
                enhanced_result = {
                    "serp_data": serp_result,
                    "scraped_content": scraped_content,
                    "enhanced_info": {
                        "has_deep_content": scraped_content.get("success", False),
                        "content_length": len(content_text) if isinstance(content_text, str) else 0,
                        "extraction_method": content.get("method", "unknown") if isinstance(content, dict) else "unknown"
                    }
                }
                
                enhanced_results.append(enhanced_result)
                
            except Exception as e:
                print(f"   ❌ Error scraping SERP result: {str(e)}")
                # Add a failed result to maintain consistency
                enhanced_result = {
                    "serp_data": serp_result,
                    "scraped_content": {
                        "url": url,
                        "success": False,
                        "error": f"Scraping failed: {str(e)}",
                        "content": {}
                    },
                    "enhanced_info": {
                        "has_deep_content": False,
                        "content_length": 0,
                        "extraction_method": "failed"
                    }
                }
                enhanced_results.append(enhanced_result)
        
        return enhanced_results
    
    def get_summary(self, results: List[Dict]) -> Dict:
        """Get a summary of scraping results."""
        if not results:
            return {"total": 0, "successful": 0, "failed": 0}
        
        successful = sum(1 for r in results if r.get("success", False))
        total_words = sum(r.get("content", {}).get("word_count", 0) for r in results if r.get("success", False))
        
        return {
            "total": len(results),
            "successful": successful,
            "failed": len(results) - successful,
            "success_rate": successful / len(results) * 100,
            "total_words_extracted": total_words,
            "avg_words_per_page": total_words / successful if successful > 0 else 0
        }


# Simple function interface
def scrape_urls(urls: List[str], delay: float = 1.0) -> List[Dict]:
    """
    Simple function to scrape multiple URLs.
    
    Args:
        urls: List of URLs to scrape
        delay: Delay between requests
        
    Returns:
        List of scraping results
    """
    module = WebScraperModule(delay=delay)
    return module.scrape_urls(urls)


# Example usage
if __name__ == "__main__":
    print("🕷️  Web Scraper Module")
    print("=" * 40)
    
    # Test URLs
    test_urls = [
        "https://www.bbc.com/news",
        "https://en.wikipedia.org/wiki/Web_scraping"
    ]
    
    module = WebScraperModule(delay=0.5)
    results = module.scrape_urls(test_urls)
    
    print(f"\n📊 Scraping Results:")
    summary = module.get_summary(results)
    print(f"Success rate: {summary['success_rate']:.1f}%")
    print(f"Total words extracted: {summary['total_words_extracted']}")
    
    for result in results:
        if result["success"]:
            content = result["content"]
            print(f"\n✅ {result['url']}")
            print(f"   Title: {content.get('title', 'N/A')[:60]}...")
            print(f"   Words: {content.get('word_count', 0)}")
        else:
            print(f"\n❌ {result['url']}: {result.get('error', 'Unknown error')}")
