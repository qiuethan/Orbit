# 🔍 Complete Face Search + AI Analysis Pipeline

A powerful system that analyzes faces through the complete pipeline: **Image → Face Search → Web Search → Content Scraping → AI Analysis**

Uses Cerebras (ultra-fast) or OpenAI for AI analysis with structured output or custom prompts.

## 🚀 Quick Start

### 1. Install & Configure
```bash
pip install -r requirements.txt
cp env.example .env
# Edit .env with your API keys
```

### 2. Run Analysis
```python
from pipeline import complete_face_analysis

# Structured JSON output (recommended)
results = complete_face_analysis("image.jpg", use_structured_output=True)

# Custom text analysis
results = complete_face_analysis("image.jpg", 
    custom_prompt="Who is this person and what are they known for?")
```

### 3. Get Results
```python
if results["success"]:
    if results["llm_analysis"].get("structured_data"):
        # Structured output
        person = results["llm_analysis"]["structured_data"]
        print(f"Name: {person.personal_info.full_name}")
        print(f"Job: {person.professional_info.current_position}")
    else:
        # Text output
        print(results["llm_analysis"]["analysis"])
```

## 📋 What You Get

### Structured Output (JSON Schema)
- **Personal Info**: Name, location, interests
- **Professional Info**: Current position, company, skills, previous roles
- **Education**: Degree, institution, field of study
- **Social Media**: Verified profiles with URLs
- **Talking Points**: Recent achievements, conversation starters
- **Confidence Metrics**: Quality assessment of sources

### Pipeline Steps
1. **🔍 Face Recognition** - FaceCheck.id finds matching faces (top 5, 85+ score)
2. **🌐 Web Search** - Google searches each face-matched URL for mentions
3. **📄 Content Scraping** - Extracts full content from web pages
4. **🤖 AI Analysis** - GPT-OSS-120B analyzes and structures all data

## ⚙️ Configuration

### Required API Keys (.env)
```env
# Face recognition (required)
FACECHECK_API_TOKEN=your_token

# Web search (required)
SERPAPI_KEY=your_key

# AI analysis (choose one)
CEREBRAS_KEY=your_key        # Recommended: GPT-OSS-120B
OPENAI_API_KEY=your_key      # Alternative: GPT-4o

# Optional settings
TESTING_MODE=false           # true=demo data, false=real API calls
LLM_PROVIDER=cerebras        # cerebras or openai
CEREBRAS_MODEL=gpt-oss-120b  # llama3.1-8b, llama3.1-70b, gpt-oss-120b
OPENAI_MODEL=gpt-4o          # gpt-4o, gpt-4o-mini
```

### Advanced Usage
```python
from pipeline import SearchAnalysisPipeline

pipeline = SearchAnalysisPipeline(testing_mode=False)
results = pipeline.complete_face_search(
    image_input="photo.jpg",
    min_score=90,                    # Higher confidence threshold
    max_face_results=3,              # Fewer face matches
    max_serp_per_url=5,             # Web results per URL
    use_structured_output=True,      # JSON schema output
    custom_instructions="Focus on professional background"
)
```

## 📊 Output Structure

### Success Response
```python
{
    "success": True,
    "face_results": [...],           # Face matches with scores
    "serp_results": {...},           # Web search results per URL
    "scraped_results": {...},        # Full content from web pages
    "llm_analysis": {
        "structured_data": {...},    # PersonAnalysis object (if structured)
        "analysis": "...",           # Text analysis (if not structured)
        "provider": "cerebras",
        "model": "gpt-oss-120b"
    },
    "summary": {
        "face_matches": 2,
        "total_mentions": 15,
        "urls_with_mentions": 3,
        "scraped_pages": 8
    }
}
```

### Structured Data Schema
```python
{
    "personal_info": {
        "full_name": "John Smith",
        "location": "San Francisco, CA",
        "interests": ["AI", "Machine Learning"]
    },
    "professional_info": {
        "current_position": "Senior Engineer",
        "company": "TechCorp",
        "industry": "Technology",
        "previous_positions": [...]
    },
    "social_media": [
        {
            "platform": "GitHub",
            "url": "https://github.com/username",
            "verified": true
        }
    ],
    "confidence_level": "High",
    "sources_quality": "Excellent"
}
```

## 🧪 Testing & Examples

### Simple Example
```bash
python example.py  # Edit settings in the file
```

### Save Results to Files
The system automatically saves detailed logs to `logs/` folder and can save structured output to JSON files for analysis.

## 📁 Project Structure

```
backend/
├── search/                    # Search functionality
│   ├── modules/               # Face, SERP, web scraping
│   └── search_engine.py       # Search orchestrator
├── llm/                       # AI analysis
│   └── llm.py                 # Cerebras/OpenAI interface
├── pipeline.py                # Main pipeline orchestrator
├── output_schema.py           # JSON schema definitions
├── example.py                 # Simple usage example
├── logs/                      # Pipeline execution logs
└── requirements.txt           # Dependencies
```

## 🔧 Advanced Features

### Direct LLM Usage
```python
from llm import LLM, structured_analyze_person

# Direct LLM chat
llm = LLM()
response = llm.chat("Your question")

# Structured analysis of any search data
result = structured_analyze_person(search_data, 
    custom_instructions="Focus on technical background")
```

### Schema Customization
Edit `output_schema.py` to modify the structured output format and validation rules.

### Logging & Debugging
Pipeline logs every step to timestamped files in `logs/` folder:
- `01_search_results.json` - Face and web search data
- `02_llm_input.json` - Context sent to AI
- `03_llm_output.json` - Raw AI response
- `04_final_results.json` - Final processed output

## 🚨 Error Handling

The system handles errors gracefully:
- **Missing API keys** → Clear setup instructions
- **No face matches** → Returns empty but valid structure
- **LLM failures** → Search results still available
- **Network issues** → Automatic retries with backoff

## 💡 Tips

✅ **Use structured output** for programmatic access  
✅ **Start with TESTING_MODE=true** to verify setup  
✅ **Check logs folder** for debugging issues  
✅ **Customize schema** in output_schema.py for your needs  
✅ **Use Cerebras GPT-OSS-120B** for best balance of speed/quality  

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Module not found" | Run `pip install -r requirements.txt` |
| "No API key" | Set required keys in `.env` file |
| "Stuck on testing mode" | Set `TESTING_MODE=false` in `.env` |
| "LLM hallucinating" | Using GPT-OSS-120B with strict schema validation |
| "Empty search results" | Check face image quality, try lower min_score |

## 📞 Quick Reference

```bash
# Setup
pip install -r requirements.txt && cp env.example .env

# Run
python example.py
```

**Main function:** `complete_face_analysis(image, use_structured_output=True, custom_prompt=None)`

That's it! Complete face analysis with structured AI output! 🚀