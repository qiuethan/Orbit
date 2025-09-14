# 🌌 Orbit: AI-Powered Conversation Intelligence Platform

> Real-time facial recognition, conversation tracking, and intelligent networking for the modern world.

Orbit is a comprehensive AI platform that bridges physical conversations with digital intelligence. It uses computer vision, natural language processing, and web search to automatically identify people in real-time, track conversation topics, and build rich professional profiles.

---

## 🎯 **What Orbit Does**

### **Real-Time Intelligence**
- **👁️ Live Facial Recognition**: Identify people in your camera feed instantly
- **🎙️ Conversation Recording**: Automatic audio capture and transcription  
- **🤖 Topic Extraction**: AI-powered analysis of what you discussed
- **💾 Smart Caching**: Automatic profile building and conversation history

### **Conversation-Driven Networking**
- **📝 Automatic Logging**: Every person who appears in frame gets logged
- **🔗 Topic Linking**: Conversation topics automatically added to participant profiles
- **📊 Rich Profiles**: Professional info, education, achievements, and social media
- **🌐 Web Search Integration**: Automatic research on unknown individuals

---

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Services   │
│                 │    │                 │    │                 │
│ • React UI      │◄──►│ • Face Recognition │◄──►│ • Cerebras LLM  │
│ • Real-time Feed│    │ • Audio Recording │    │ • Face Search   │
│ • Profile Views │    │ • Web Search      │    │ • Web Scraping  │
│ • Conversation  │    │ • Cache System    │    │ • Topic Analysis│
│   Management    │    │ • Integration     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Core Components**

#### **🖥️ Frontend (Next.js)**
- **Live Video Feed**: Real-time webcam with face detection overlays
- **Person Profiles**: Rich detailed views with professional info and conversation history
- **Conversation Management**: Track topics and link to participants
- **Network Visualization**: Interactive graph of connections and relationships

#### **⚙️ Backend (Python)**
- **Facial Recognition**: InsightFace + DeepFace for accurate identification
- **Audio Pipeline**: Groq Whisper for transcription + LLM topic extraction
- **Web Intelligence**: Face search + content scraping + AI analysis
- **Cache System**: Persistent storage of profiles and conversation data

#### **🧠 AI Layer**
- **LLM Integration**: Cerebras GPT-OSS-120B for fast, accurate analysis
- **Topic Extraction**: Automatic identification of 3-5 conversation topics
- **Profile Building**: Structured data extraction from web sources
- **Smart Matching**: Confidence scoring and verification

---

## 🚀 **Quick Start**

### **Prerequisites**
- Python 3.8+ and Node.js 18+
- Webcam and microphone
- API keys (see setup below)

### **1. Clone and Setup**
```bash
git clone <repository-url>
cd Orbit

# Backend setup
cd backend
pip install -r requirements.txt
cp env.example .env
# Edit .env with your API keys

# Frontend setup  
cd ../frontend
npm install
```

### **2. Configure API Keys**
Edit `backend/.env`:
```env
# Required for facial recognition
FACECHECK_API_TOKEN=your_token

# Required for web search  
SERPAPI_KEY=your_key

# Required for AI analysis
CEREBRAS_KEY=your_key

# Optional for audio transcription
GROQ_API_KEY=your_key
```

### **3. Start the System**
```bash
# Terminal 1: Backend
cd backend
python server.py

# Terminal 2: Frontend  
cd frontend
npm run dev
```

### **4. Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

---

## 🎬 **How It Works**

### **The Conversation Flow**

1. **🎥 Start Camera Session**
   ```
   Camera starts → Frame presence tracking begins
   Audio recording starts → Real-time transcription
   ```

2. **👤 Person Detection**  
   ```
   Face detected → Recognition attempt → Profile lookup
   Unknown person → Web search → Profile creation
   Known person → Load existing profile → Update presence
   ```

3. **🗣️ Conversation Capture**
   ```
   Audio captured → Groq Whisper transcription
   Text analyzed → LLM topic extraction (3-5 topics)
   ```

4. **🔗 Automatic Integration**
   ```
   Session ends → Find all participants in frame
   Extract topics → Update each participant's cache
   Link conversation data → Build conversation history
   ```

### **Example Workflow**

```
📹 Camera Session: "Discussion about AI and startups"

👥 Participants Detected:
   • John Smith (recognized from cache)
   • Jane Doe (unknown → web search → profile created)

🎙️ Audio Transcribed:
   "We talked about the future of AI startups and funding trends..."

🤖 Topics Extracted:
   • AI Startups
   • Funding Trends  
   • Future Technology

💾 Cache Updated:
   • John Smith's profile ← conversation topics added
   • Jane Doe's profile ← conversation topics added
```

---

## 📁 **Project Structure**

```
Orbit/
├── backend/                    # Python backend services
│   ├── facial_recognition/     # Face detection & recognition
│   ├── recording/             # Audio capture & transcription  
│   ├── search/                # Web search & content scraping
│   ├── llm/                   # AI analysis & topic extraction
│   ├── cache/                 # Person profiles & images
│   ├── logs/                  # Session & integration logs
│   ├── conversation_integration.py # Core integration logic
│   └── server.py              # FastAPI backend server
│
├── frontend/                  # Next.js React frontend
│   ├── src/components/        # UI components
│   │   ├── main/             # Camera feed & detection
│   │   ├── profile/          # Person profiles & details
│   │   └── layout/           # Navigation & layout
│   ├── src/data/             # Data adapters & utilities
│   └── src/utils/            # Helper functions
│
└── README.md                  # This file
```

---

## 🎛️ **Key Features**

### **🔍 Advanced Recognition**
- **Multi-Modal Matching**: Face vectors + photo comparison + DeepFace verification
- **Confidence Scoring**: Multiple similarity metrics for accurate identification  
- **Unknown Person Handling**: Automatic web search and profile creation
- **Cache Learning**: System improves recognition over time

### **🎙️ Intelligent Audio**
- **Real-Time Transcription**: Groq Whisper Large Turbo for accuracy
- **Topic Extraction**: LLM analysis of conversation content
- **Multi-Language Support**: Automatic language detection
- **Conversation Linking**: Topics automatically linked to all participants

### **🌐 Web Intelligence**
- **Face Search**: FaceCheck.id integration for photo matching
- **Content Scraping**: Comprehensive web data extraction
- **Profile Building**: Structured data with professional info, education, achievements
- **Source Verification**: Quality scoring and credibility indicators

### **💾 Smart Caching**
- **Persistent Profiles**: Rich JSON profiles with conversation history
- **Incremental Updates**: Profiles grow with each conversation
- **Frame Presence Tracking**: Detailed logs of who appeared when
- **Integration Logs**: Complete audit trail of all processing

---

## 🛠️ **Configuration**

### **Recognition Settings**
```python
# In facial_recognition/webcam_recognition.py
recognition_threshold = 0.7        # Face matching confidence
track_timeout = 1.5               # Seconds before "left" event
unknown_person_timeout = 5.0      # Delay before unknown person search
```

### **Audio Settings**  
```python
# In recording/transcriber.py
model = "whisper-large-v3-turbo"  # Transcription model
auto_summarize = True             # Enable topic extraction
temperature = 0.3                 # LLM creativity setting
```

### **Search Settings**
```python
# In search/modules/
min_score = 85                    # Face search confidence threshold
max_face_results = 3              # Number of face matches to process
max_serp_per_url = 2             # Web search results per URL
```

---

## 📊 **Data Flow**

### **Cache File Structure**
```json
{
  "person_analysis": {
    "personal_info": {
      "full_name": "John Smith",
      "location": "San Francisco, CA",
      "interests": ["AI", "Technology"]
    },
    "professional_info": {
      "current_position": "Senior Engineer",
      "company": "TechCorp",
      "previous_positions": [...]
    },
    "conversation_history": [
      {
        "date": "2025-09-14T03:55:47",
        "topics": ["AI Startups", "Funding", "Technology"],
        "duration": 120,
        "presence_time": 95
      }
    ]
  }
}
```

### **Session Logs**
```json
{
  "session_metadata": {
    "session_id": "20250914_035534",
    "total_unique_participants": 2,
    "duration_seconds": 120
  },
  "participants_summary": {
    "1": {
      "name": "John Smith",
      "recognition_status": "recognized",
      "total_presence_time": 95.2
    }
  }
}
```

---

## 🔧 **Development**

### **Adding New Features**
1. **Backend**: Add endpoints in `server.py`, implement logic in modules
2. **Frontend**: Create components in `src/components/`, add routes in `app/`
3. **Integration**: Update `conversation_integration.py` for new data flows

### **Testing**
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests  
cd frontend
npm test

# Integration testing
python conversation_integration.py
```

### **API Documentation**
- Backend API docs: http://localhost:8000/docs (FastAPI auto-generated)
- Key endpoints: `/webcam/start`, `/webcam/stop`, `/cache/list`, `/voice/summarize`

---

## 🚨 **Troubleshooting**

| Issue | Solution |
|-------|----------|
| Camera not detected | Check permissions, try different camera index |
| Face recognition failing | Verify lighting, face angle, update recognition threshold |
| Audio not recording | Check microphone permissions, verify audio device |
| LLM errors | Verify API keys, check rate limits |
| Frontend not loading | Ensure backend is running, check CORS settings |

---

## 🎯 **Use Cases**

### **Professional Networking**
- **Conferences & Events**: Automatically track who you meet and what you discuss
- **Business Meetings**: Build conversation history with clients and partners  
- **Networking Events**: Never forget a name or conversation topic again

### **Personal Memory**
- **Social Gatherings**: Remember conversations with friends and family
- **Learning Sessions**: Track discussion topics in study groups or workshops
- **Community Building**: Build rich profiles of community members

### **Research & Analysis**
- **Interview Studies**: Systematic tracking of research conversations
- **Market Research**: Capture insights from customer conversations
- **Content Creation**: Track topics and sources for content development

---

## 🤝 **Contributing**

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

Key areas for contribution:
- New recognition algorithms
- Additional LLM providers  
- Frontend UI improvements
- Mobile app development
- Integration with CRM systems

---

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 **Acknowledgments**

- **InsightFace**: Face recognition models
- **Groq**: Fast audio transcription
- **Cerebras**: Ultra-fast LLM inference
- **FaceCheck.id**: Face search capabilities
- **Next.js & React**: Frontend framework
- **FastAPI**: Backend API framework

---

**🌌 Orbit: Where conversations become intelligence.**

*Built with ❤️ for the future of human connection.*
