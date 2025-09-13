"""
Search Modules Package

This package contains modular search components for face recognition,
SERP API searches, and web scraping functionality.
"""

from .face_search import FaceSearchModule
from .serp_search import SerpSearchModule  
from .web_scraper import WebScraperModule

__all__ = ['FaceSearchModule', 'SerpSearchModule', 'WebScraperModule']
