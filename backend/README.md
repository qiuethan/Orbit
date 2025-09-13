# Search Engine Backend

A modular search engine that combines face recognition, SERP API searches, and web scraping.

## 🏗️ Structure

```
backend/
├── modules/                    # Modular search components
│   ├── __init__.py            # Package initialization
│   ├── face_search.py         # Face recognition module
│   ├── serp_search.py         # SERP API search module
│   └── web_scraper.py         # Web scraping module
├── search_engine.py           # Main search engine (RECOMMENDED)
├── requirements.txt           # Python dependencies
├── env.example               # Environment variables template
└── image.jpg                 # Test image file
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Up Environment
```bash
cp env.example .env
# Edit .env with your API keys
```

### 3. Run Search Engine
```bash
python search_engine.py
```

## 📖 Usage

### Main Search Engine (Recommended)
```python
from search_engine import SearchEngine

# Initialize
engine = SearchEngine(testing_mode=True)

# Face search + SERP + optional scraping
results = engine.search_face_with_serp('image.jpg', scrape_content=True)

# Term search (fallback when no face found)
results = engine.search_terms_only(['Daniel Craig'], scrape_content=False)

# Comprehensive search (face + fallback)
results = engine.comprehensive_search('image.jpg', fallback_terms=['Daniel Craig'])
```

### Individual Modules
```python
# Face search
from modules.face_search import FaceSearchModule, search_face
face_module = FaceSearchModule()
error, results = face_module.search('image.jpg', min_score=85)

# SERP search
from modules.serp_search import SerpSearchModule, search_url_mentions, search_terms
serp_module = SerpSearchModule()
url_mentions = serp_module.search_urls(['url1', 'url2'])
term_results = serp_module.search_terms(['Daniel Craig'], ['news', 'biography'])

# Web scraping
from modules.web_scraper import WebScraperModule, scrape_urls
scraper = WebScraperModule()
results = scraper.scrape_urls(['url1', 'url2'])
```

## 🔧 Configuration

### Required Environment Variables
```env
# FaceCheck.id API Token
FACECHECK_API_TOKEN=your_facecheck_token

# SERP API Key  
SERPAPI_KEY=your_serpapi_key

# Testing mode (optional)
TESTING_MODE=true
```

### API Keys
- **FaceCheck.id**: Get your token from [facecheck.id/Face-Search/API](https://facecheck.id/Face-Search/API)
- **SERP API**: Get your key from [serpapi.com](https://serpapi.com/)

## 🎯 Features

### Face Search Module
- Multiple input types: file paths, URLs, base64, bytes
- Configurable minimum score filtering
- Testing mode support (no credits deducted)

### SERP Search Module
- **URL mentions**: Find pages that mention specific URLs
- **Term search**: Search by any term with multiple types:
  - `general`: Basic search
  - `news`: News articles
  - `biography`: Biographical information
  - `social`: Social media profiles
  - `company`: Company information
  - `academic`: Academic/research content
  - `videos`: Video content

### Web Scraper Module
- Dual extraction methods (newspaper3k + BeautifulSoup)
- Respectful scraping with delays
- Rich content extraction (title, text, authors, dates, keywords)
- Error handling and fallback methods

## 🎲 Examples

### Test Individual Modules
```bash
python modules/face_search.py     # Test face search
python modules/serp_search.py     # Test SERP search
python modules/web_scraper.py     # Test web scraping
```

### Search Types
```python
# Search for a person
results = engine.search_terms_only(['Daniel Craig'], ['general', 'news', 'biography'])

# Search for a company
results = engine.search_terms_only(['Tesla Inc'], ['general', 'news', 'company'])

# Search for any topic
results = engine.search_terms_only(['Climate Change'], ['general', 'news', 'academic'])
```

## 🔄 Migration from Old Files

The following files have been replaced by the modular structure:
- `face_search_api.py` → `modules/face_search.py`
- `serp_search.py` → `modules/serp_search.py`
- `web_scraper.py` → `modules/web_scraper.py`
- `combined_search.py` → `search_engine.py`
- `deep_search.py` → `search_engine.py`
- `name_search.py` → `search_engine.py` + `modules/serp_search.py`

Use `search_engine.py` for all combined functionality!
