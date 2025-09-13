#!/usr/bin/env python3
"""
Simple test server for WebSocket functionality
Run this if the main server has dependency issues
"""

import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Test WebSocket Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Test server running"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/test-broadcast")
async def test_broadcast():
    """Test endpoint to send a sample person via WebSocket"""
    sample_person = {
        "is_new": True,
        "result": {
            "request_id": "test-person-123",
            "thumbnail_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA...",
            "llm_analysis": {
                "structured_data": {
                    "personal_info": {
                        "full_name": "John Test",
                        "location": "San Francisco, CA"
                    },
                    "professional_info": {
                        "current_position": "Software Engineer at TestCorp",
                        "industry": "Technology"
                    },
                    "executive_summary": "Test person for WebSocket integration",
                    "public_presence_score": "High",
                    "confidence_level": "High",
                    "key_insights": ["Tech professional", "San Francisco based"],
                    "talking_points": {
                        "recent_achievements": ["Successfully implemented WebSocket"],
                        "common_interests": ["Technology", "Software Development"]
                    }
                }
            }
        }
    }
    
    await manager.broadcast(sample_person)
    return {"message": "Test person broadcasted", "connections": len(manager.active_connections)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
