#!/usr/bin/env python3
"""
Combined Face Search and SERP Search

This script combines face search results with SERP API to get detailed metadata
and snippets for the found URLs.
"""

import os
import urllib.request
from dotenv import load_dotenv
from face_search_api import FaceSearchAPI
from serp_search import SerpSearchAPI

# Load environment variables
load_dotenv()


def combined_face_and_serp_search(image_file: str) -> dict:
    """
    Perform face search and then enhance results with SERP API search.
    
    Args:
        image_file (str): Path to the image file to search
    
    Returns:
        dict: Combined results from both face search and SERP search
    """
    # Load API keys
    FACECHECK_TOKEN = os.getenv('FACECHECK_API_TOKEN')
    SERPAPI_KEY = os.getenv('SERPAPI_KEY')
    TESTING_MODE = os.getenv('TESTING_MODE', 'true').lower() == 'true'
    
    if not FACECHECK_TOKEN:
        raise ValueError("FACECHECK_API_TOKEN not found in environment variables")
    
    if not SERPAPI_KEY:
        raise ValueError("SERPAPI_KEY not found in environment variables")
    
    # Initialize APIs
    face_api = FaceSearchAPI(FACECHECK_TOKEN, testing_mode=TESTING_MODE)
    serp_api = SerpSearchAPI(SERPAPI_KEY)
    
    print("🔍 Step 1: Performing face search...")
    
    # Perform face search
    error, face_results = face_api.search_by_image(image_file)
    
    if error:
        return {"error": error, "face_results": None, "serp_results": None}
    
    if not face_results:
        return {"error": "No face search results found", "face_results": None, "serp_results": None}
    
    # Filter face results: top 5 with score >= 85
    filtered_face_results = []
    for result in face_results[:5]:
        if result['score'] >= 85:
            filtered_face_results.append(result)
    
    if not filtered_face_results:
        return {
            "error": "No high-quality face matches found (score >= 85 in top 5)",
            "face_results": face_results[:5],
            "serp_results": None
        }
    
    print(f"✅ Found {len(filtered_face_results)} high-quality face matches")
    print("🔍 Step 2: Searching for web pages that mention these URLs...")
    
    # Perform SERP search to find pages that mention each face match URL
    enhanced_results = serp_api.search_face_match_urls(filtered_face_results, max_results_per_url=5)
    
    return {
        "error": None,
        "face_results": filtered_face_results,
        "serp_results": enhanced_results,
        "summary": {
            "total_face_matches": len(filtered_face_results),
            "urls_with_serp_data": len(enhanced_results),
            "urls_with_snippets": sum(1 for data in enhanced_results.values() 
                                    if data["metadata"]["has_snippets"])
        }
    }


def display_combined_results(results: dict):
    """Display the combined search results in a readable format."""
    
    if results.get("error"):
        print(f"❌ Error: {results['error']}")
        return
    
    face_results = results["face_results"]
    serp_results = results["serp_results"]
    summary = results["summary"]
    
    print("\n" + "=" * 80)
    print("📊 COMBINED SEARCH RESULTS SUMMARY")
    print("=" * 80)
    print(f"Face matches found: {summary['total_face_matches']}")
    print(f"URLs with SERP data: {summary['urls_with_serp_data']}")
    print(f"URLs with snippets: {summary['urls_with_snippets']}")
    
    print("\n" + "=" * 80)
    print("🔍 DETAILED RESULTS")
    print("=" * 80)
    
    for i, (url, data) in enumerate(serp_results.items(), 1):
        face_data = data["face_search_data"]
        serp_data = data["serp_search_results"]
        metadata = data["metadata"]
        
        print(f"\n📄 Result #{i}")
        print("-" * 50)
        print(f"🎯 Face Match Score: {face_data['score']}")
        print(f"🔗 Original URL: {url}")
        print(f"📊 Pages Mentioning URL: {metadata['pages_mentioning_url']}")
        print(f"📝 Has Snippets: {'Yes' if metadata['has_snippets'] else 'No'}")
        
        if serp_data:
            print(f"\n📑 Top 5 Web Pages That Mention This URL:")
            for j, serp_result in enumerate(serp_data, 1):
                print(f"  {j}. {serp_result['title']}")
                print(f"     🔗 Page URL: {serp_result['link']}")
                if serp_result['snippet'] != 'No snippet available':
                    print(f"     📝 Snippet: {serp_result['snippet']}")
                if serp_result.get('date'):
                    print(f"     📅 Date: {serp_result['date']}")
                print()
        else:
            print("   No web pages found that mention this URL")
        
        # Display any additional face search metadata
        print(f"🖼️  Face Search Metadata:")
        for key, value in face_data.items():
            if key not in ['score', 'url', 'base64']:
                print(f"     {key.capitalize()}: {value}")


def main():
    """Main function to run the combined search."""
    
    print("🚀 Combined Face Search + SERP API Search")
    print("=" * 50)
    
    # Use the same image file as the face search
    image_file = 'image.jpg'
    
    if not os.path.exists(image_file):
        print(f"❌ Image file '{image_file}' not found.")
        print("Please make sure the image file exists in the current directory.")
        return
    
    try:
        # Perform combined search
        results = combined_face_and_serp_search(image_file)
        
        # Display results
        display_combined_results(results)
        
        print("\n✅ Combined search completed!")
        
    except Exception as e:
        print(f"❌ Error during search: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
