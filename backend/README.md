# 🔍 Complete Face Search + AI Analysis

A simple, powerful pipeline that analyzes faces: **Image → Face Search → Web Search → Content Scraping → AI Analysis**

Uses Cerebras (ultra-fast) or OpenAI for AI analysis with your own custom prompts.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure API Keys
Copy `env.example` to `.env` and add your API keys:

```env
# Required for face recognition
FACECHECK_API_TOKEN=your_facecheck_token

# Required for web search  
SERPAPI_KEY=your_serpapi_key

# Required for AI analysis (choose one)
CEREBRAS_KEY=your_cerebras_key        # Recommended: 10x faster
OPENAI_API_KEY=your_openai_key        # Alternative: High quality
```

### 3. Run Complete Analysis
```python
from pipeline import complete_face_analysis

# Complete analysis with default AI prompt
results = complete_face_analysis("your_image.jpg")

# Custom analysis with your own prompt
results = complete_face_analysis("your_image.jpg", 
    custom_prompt="Who is this person and what are they known for?")
```

## 📸 What It Does

**Input:** Your image file  
**Output:** Complete AI analysis of who the person is

### The Pipeline Steps:
1. **🔍 Face Recognition** - Finds matching faces using FaceCheck.id
2. **🌐 Web Search** - Searches for web mentions of found faces  
3. **📄 Content Scraping** - Extracts full content from relevant websites
4. **🤖 AI Analysis** - Analyzes everything with Cerebras/OpenAI using your prompt

## 💡 Usage Examples

### Basic Usage
```python
from pipeline import complete_face_analysis

results = complete_face_analysis("photo.jpg")

if results["success"]:
    analysis = results["llm_analysis"]["analysis"]
    print(analysis)
```

### Custom Prompts
```python
# Professional summary
results = complete_face_analysis("photo.jpg", 
    custom_prompt="Provide a professional summary of this person including their role, expertise, and recent activities.")

# Quick facts
results = complete_face_analysis("photo.jpg",
    custom_prompt="Give me 3 key facts about this person in bullet points.")

# Industry focus
results = complete_face_analysis("photo.jpg",
    custom_prompt="What industry is this person in and what are they known for?")
```

### Using the Class Interface
```python
from pipeline import SearchAnalysisPipeline

pipeline = SearchAnalysisPipeline()
results = pipeline.complete_face_search(
    image_input="photo.jpg",
    min_score=90,          # Higher confidence threshold
    max_face_results=3,    # Fewer face matches
    custom_prompt="Your analysis instructions"
)
```

## 🤖 Simple LLM Interface

You can also use the LLM interface directly:

```python
from llm import call_llm, SimpleLLM, analyze_with_llm

# Quick question
response = call_llm("What is facial recognition?")

# Analyze any text data
analysis = analyze_with_llm(
    context="Your text data here",
    instruction="Summarize the key points"
)

# Use class for more control
llm = SimpleLLM()  # Auto-detects Cerebras or OpenAI
response = llm.chat("Your question")
```

## 🔧 Configuration

### LLM Providers

**Cerebras (Recommended)**
- ⚡ 10x faster inference
- 💰 Competitive pricing  
- 🤖 Models: llama3.1-8b, llama3.1-70b

**OpenAI (Alternative)**
- 🎯 Highest quality
- 🧠 Models: gpt-3.5-turbo, gpt-4
- 💳 Higher cost per token

The system automatically uses Cerebras if available, with OpenAI as fallback.

### Search Configuration

You can adjust search parameters:

```python
results = pipeline.complete_face_search(
    image_input="photo.jpg",
    min_score=85,           # Minimum face match confidence
    max_face_results=5,     # Max face matches to process
    max_serp_per_url=5,     # Max web results per face match
    custom_prompt="..."     # Your analysis prompt
)
```

## 📊 Output Format

```python
{
    "success": True,
    "face_results": [...],          # Face recognition matches
    "serp_results": {...},          # Web search results
    "scraped_results": {...},       # Scraped content
    "llm_analysis": {
        "analysis": "AI analysis text",
        "provider": "cerebras",
        "model": "llama3.1-8b",
        "prompt_used": "..."
    },
    "summary": {
        "face_matches": 2,
        "total_mentions": 15,
        "scraped_pages": 8
    }
}
```

## 🧪 Testing

### Run the Demo
```bash
python demo.py
```

### Test Individual Components
```bash
# Test LLM interface
python llm/simple_llm.py

# Test complete pipeline
python complete_pipeline_example.py
```

## 📁 Project Structure

```
backend/
├── search/                    # Search functionality
│   ├── modules/               # Face, SERP, scraping modules
│   └── search_engine.py       # Search orchestrator
├── llm/                       # AI analysis
│   └── simple_llm.py          # Cerebras/OpenAI interface
├── pipeline.py                # Complete pipeline
├── demo.py                    # Simple demo
└── requirements.txt           # Dependencies
```

## 🚨 Error Handling

The system handles errors gracefully:
- Missing API keys → Clear error messages
- No face matches → Continues with available data
- LLM failures → Search results still returned
- Network issues → Automatic retries

## 🔒 Privacy & Security

- API keys stored in environment variables
- No data persistence - results not stored
- Rate limiting to respect API limits
- Error messages sanitized

## 💡 Tips

✅ **Use Cerebras** for fastest results  
✅ **Custom prompts** for specific analysis needs  
✅ **Test with demo.py** to verify setup  
✅ **Start with TESTING_MODE=true** to save credits  

## 🆘 Common Issues

**"No API key found"** → Set CEREBRAS_KEY or OPENAI_API_KEY in .env  
**"Search failed"** → Check FACECHECK_API_TOKEN and SERPAPI_KEY  
**"No face matches"** → Try lower min_score or different image  
**"LLM analysis failed"** → Check your API key quota

## 📞 Quick Reference

```bash
# Install
pip install -r requirements.txt

# Configure
cp env.example .env
# Edit .env with your API keys

# Run
python demo.py
```

**Main function:** `complete_face_analysis(image, custom_prompt=None)`

That's it! Your complete face search and AI analysis pipeline is ready to go! 🚀