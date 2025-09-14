import os
import sys
import asyncio
import time
from typing import Any, Dict
import uuid
import json
import base64
import io
import cv2
import numpy as np

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Ensure the backend directory is on sys.path so imports like `pipeline`, `search`, `llm` work
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

# Cache directory for per-request files
CACHE_DIR = os.path.join(BACKEND_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

from pipeline import complete_face_analysis  # noqa: E402
from output_schema import OutputSchemaManager  # noqa: E402
from facial_recognition.local_face_recognition import recognize  # noqa: E402

app = FastAPI(title="Orbit Face Analysis Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global lock to ensure only one request is processed at a time
_request_lock = asyncio.Lock()


@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    """
    Upload a JPG image of a person's face, save it under /cache/<request_id>.jpg,
    run analysis, save results to /cache/<request_id>.json, and return the results as JSON.
    Only one request is processed at a time.
    """
    filename = (image.filename or "").lower()
    content_type = (image.content_type or "").lower()

    # Validate JPG
    if not (
        filename.endswith(".jpg")
        or filename.endswith(".jpeg")
        or content_type in ("image/jpeg", "image/jpg")
    ):
        raise HTTPException(status_code=400, detail="Only JPG images (.jpg, .jpeg) are accepted")

    # Enforce single-request processing
    async with _request_lock:
        # Generate unique request ID and file paths
        request_id = uuid.uuid4().hex
        image_path = os.path.join(CACHE_DIR, f"{request_id}.jpg")
        results_path = os.path.join(CACHE_DIR, f"{request_id}.json")

        # Read file
        try:
            data = await image.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {e}")

        if not data:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        # Save image to cache
        try:
            with open(image_path, "wb") as f:
                f.write(data)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save image: {e}")

        # Run the analysis pipeline (structured output like example.py)
        try:
            results: Dict[str, Any] = complete_face_analysis(
                image_path,
                use_structured_output=True,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

        # Ensure any dataclass-based structured data is JSON-serializable
        try:
            llm_analysis = results.get("llm_analysis")
            if isinstance(llm_analysis, dict) and "structured_data" in llm_analysis:
                sd = llm_analysis.get("structured_data")
                if sd is not None and not isinstance(sd, dict):
                    # Convert dataclass PersonAnalysis -> dict
                    results["llm_analysis"]["structured_data"] = OutputSchemaManager.to_dict(sd)
        except Exception as e:
            # If conversion fails, remove non-serializable field and include an error note
            try:
                if isinstance(results.get("llm_analysis"), dict):
                    results["llm_analysis"].pop("structured_data", None)
                    results["llm_analysis"]["serialization_error"] = str(e)
            except Exception:
                pass

        # Remove large base64 payloads from face_results before caching/returning
        try:
            face_results = results.get("face_results")
            if isinstance(face_results, list):
                for fr in face_results:
                    if isinstance(fr, dict) and "base64" in fr:
                        fr.pop("base64", None)
        except Exception:
            pass

        # Call local face recognition (stubbed; returns None for now)
        try:
            best_match = recognize(image_path, [])
        except Exception:
            best_match = None
        results["local_face_recognition"] = {"best_match": best_match}

        # Save results JSON to cache (best-effort)
        try:
            with open(results_path, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
        except Exception:
            # Do not fail the request if caching fails
            pass

        # Include request ID in response
        results["request_id"] = request_id

        return JSONResponse(content=results)


@app.get("/list")
async def list_cache():
    """
    Iterate over cached (image, json) pairs and return a list of JSON objects.
    For each object, add a base64-encoded JPEG thumbnail of the corresponding
    image, scaled to width=100px (keeps aspect ratio) as `thumbnail_base64`.
    """
    # Ensure single request processing across endpoints
    async with _request_lock:
        results_with_thumbs = []
        try:
            for name in os.listdir(CACHE_DIR):
                if not name.endswith(".json"):
                    continue
                base = name[:-5]  # strip .json
                json_path = os.path.join(CACHE_DIR, name)
                img_path = os.path.join(CACHE_DIR, f"{base}.jpg")

                # Load JSON object
                try:
                    with open(json_path, "r", encoding="utf-8") as jf:
                        obj = json.load(jf)
                except Exception:
                    continue  # skip unreadable json

                # Generate 100px-wide thumbnail base64 if image exists
                thumb_b64 = None
                if os.path.exists(img_path):
                    try:
                        with Image.open(img_path) as img:
                            img = img.convert("RGB")
                            if img.width > 0:
                                ratio = 100.0 / float(img.width)
                                new_size = (100, max(1, int(img.height * ratio)))
                                img = img.resize(new_size, Image.LANCZOS)
                            buf = io.BytesIO()
                            img.save(buf, format="JPEG", quality=85)
                            thumb_b64 = "data:image/jpeg;base64, " + base64.b64encode(buf.getvalue()).decode("ascii")
                    except Exception:
                        thumb_b64 = None

                # Attach thumbnail and cache_id
                obj["thumbnail_base64"] = thumb_b64
                obj.setdefault("request_id", base)
                results_with_thumbs.append(obj)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read cache: {e}")

        return JSONResponse(content=results_with_thumbs)


@app.get("/people")
async def get_people():
    """
    Get all people from cache in frontend-compatible format.
    Transforms cache data into the format expected by the frontend.
    """
    # Ensure single request processing across endpoints
    async with _request_lock:
        people = {}
        try:
            for name in os.listdir(CACHE_DIR):
                if not name.endswith(".json"):
                    continue
                base = name[:-5]  # strip .json
                json_path = os.path.join(CACHE_DIR, name)
                img_path = os.path.join(CACHE_DIR, f"{base}.jpg")

                # Load JSON object
                try:
                    with open(json_path, "r", encoding="utf-8") as jf:
                        obj = json.load(jf)
                except Exception:
                    continue  # skip unreadable json

                # Skip entries without person_analysis or that failed
                person_analysis = obj.get("person_analysis")
                if not person_analysis or not obj.get("success", True):
                    continue

                # Extract data based on new format structure
                personal_info = person_analysis.get("personal_info", {})
                professional_info = person_analysis.get("professional_info", {})
                education_info = person_analysis.get("education_info", {})
                social_media = person_analysis.get("social_media", [])
                talking_points = person_analysis.get("talking_points", {})

                # Generate person ID from name
                full_name = personal_info.get("full_name", "Unknown")
                if not full_name or full_name == "Unknown":
                    continue
                
                person_id = f"person-{full_name.lower().replace(' ', '-').replace('.', '')}-{base[:8]}"

                # Generate thumbnail
                thumbnail = None
                if os.path.exists(img_path):
                    try:
                        with Image.open(img_path) as img:
                            img = img.convert("RGB")
                            if img.width > 0:
                                ratio = 100.0 / float(img.width)
                                new_size = (100, max(1, int(img.height * ratio)))
                                img = img.resize(new_size, Image.LANCZOS)
                            buf = io.BytesIO()
                            img.save(buf, format="JPEG", quality=85)
                            thumbnail = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
                    except Exception:
                        thumbnail = None

                # Transform to frontend format
                person_data = {
                    "id": person_id,
                    "name": full_name,
                    "title": professional_info.get("current_position", ""),
                    "company": professional_info.get("company", ""),
                    "avatar": thumbnail,
                    "email": "",  # Not available in current data
                    "phone": "",  # Not available in current data
                    "location": personal_info.get("location", ""),
                    "lastContact": obj.get("metadata", {}).get("last_updated", ""),
                    "addedAt": obj.get("metadata", {}).get("last_updated", ""),
                    "stage": "discovered",  # Default stage
                    "confidence": person_analysis.get("confidence_level", "Medium"),
                    "source": "facial_recognition",
                    "tags": personal_info.get("interests", [])[:3] if personal_info.get("interests") else [],
                    "notes": [
                        {
                            "id": f"note-{base}-overview",
                            "type": "analysis",
                            "content": person_analysis.get("overview", ""),
                            "timestamp": obj.get("metadata", {}).get("last_updated", "")
                        },
                        {
                            "id": f"note-{base}-summary",
                            "type": "analysis", 
                            "content": person_analysis.get("executive_summary", ""),
                            "timestamp": obj.get("metadata", {}).get("last_updated", "")
                        }
                    ] if person_analysis.get("overview") else [],
                    "interactions": [],
                    "connections": [],  # No mock connections for real data
                    "conversationNotes": [],  # No mock conversation notes for real data
                    "socialMedia": [
                        {
                            "platform": sm.get("platform", "").lower(),
                            "url": sm.get("url", ""),
                            "username": sm.get("username", "")
                        } for sm in social_media if sm.get("platform")
                    ],
                    "professional": {
                        "currentRole": professional_info.get("current_position", ""),
                        "company": professional_info.get("company", ""),
                        "industry": professional_info.get("industry", ""),
                        "skills": professional_info.get("skills", []),
                        "achievements": professional_info.get("achievements", []),
                        "previousPositions": professional_info.get("previous_positions", [])
                    },
                    "education": {
                        "institution": education_info.get("current_institution", ""),
                        "degree": education_info.get("degree", ""),
                        "field": education_info.get("field_of_study", ""),
                        "graduationYear": education_info.get("graduation_year", "")
                    },
                    "talkingPoints": {
                        "recentAchievements": talking_points.get("recent_achievements", []),
                        "sharedConnections": talking_points.get("shared_connections", []),
                        "commonInterests": talking_points.get("common_interests", []),
                        "conversationStarters": talking_points.get("conversation_starters", []),
                        "notableProjects": talking_points.get("notable_projects", [])
                    },
                    "analysis": {
                        "publicPresenceScore": person_analysis.get("public_presence_score", "Low"),
                        "credibilityIndicators": person_analysis.get("credibility_indicators", []),
                        "potentialRedFlags": person_analysis.get("potential_red_flags", []),
                        "keyInsights": person_analysis.get("key_insights", []),
                        "confidenceLevel": person_analysis.get("confidence_level", "Medium"),
                        "sourcesQuality": person_analysis.get("sources_quality", "Good")
                    },
                    "rawData": {
                        "cacheId": base,
                        "requestId": obj.get("request_id", base),
                        "originalAnalysis": person_analysis
                    }
                }

                people[person_id] = person_data

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process cache data: {e}")

        return JSONResponse(content=people)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Global camera object
camera = None

@app.get("/video/start")
async def start_video():
    """Start the video stream from webcam"""
    global camera
    try:
        if camera is not None:
            camera.release()
        
        camera = cv2.VideoCapture(0)  # Use default camera
        
        if not camera.isOpened():
            raise HTTPException(status_code=500, detail="Could not open camera")
            
        # Set camera properties for maximum frame rate
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
        camera.set(cv2.CAP_PROP_FPS, 30)
        camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer lag
        
        return {"status": "started", "message": "Video stream started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start camera: {str(e)}")


@app.get("/video/stop")
async def stop_video():
    """Stop the video stream"""
    global camera
    try:
        if camera is not None:
            camera.release()
            camera = None
        return {"status": "stopped", "message": "Video stream stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop camera: {str(e)}")


def generate_frames():
    """Generate video frames for streaming"""
    global camera
    while camera is not None and camera.isOpened():
        success, frame = camera.read()
        if not success:
            break
        else:
            # Encode frame as JPEG optimized for maximum speed
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 30])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n'
                       b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n' + 
                       frame_bytes + b'\r\n')


@app.get("/video/stream")
async def video_stream():
    """Stream video frames"""
    global camera
    if camera is None or not camera.isOpened():
        raise HTTPException(status_code=400, detail="Camera not started. Call /video/start first")
    
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "close"
        }
    )


@app.post("/video/capture")
async def capture_frame():
    """Capture a single frame and analyze it"""
    global camera
    if camera is None or not camera.isOpened():
        raise HTTPException(status_code=400, detail="Camera not started. Call /video/start first")
    
    # Capture frame
    success, frame = camera.read()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to capture frame")
    
    # Save frame to temporary file
    request_id = uuid.uuid4().hex
    image_path = os.path.join(CACHE_DIR, f"{request_id}.jpg")
    
    try:
        cv2.imwrite(image_path, frame)
        
        # Run analysis
        async with _request_lock:
            results: Dict[str, Any] = complete_face_analysis(
                image_path,
                use_structured_output=True,
            )
            
            # Process results same as /analyze endpoint
            try:
                llm_analysis = results.get("llm_analysis")
                if isinstance(llm_analysis, dict) and "structured_data" in llm_analysis:
                    sd = llm_analysis.get("structured_data")
                    if sd is not None and not isinstance(sd, dict):
                        results["llm_analysis"]["structured_data"] = OutputSchemaManager.to_dict(sd)
            except Exception as e:
                try:
                    if isinstance(results.get("llm_analysis"), dict):
                        results["llm_analysis"].pop("structured_data", None)
                        results["llm_analysis"]["serialization_error"] = str(e)
                except Exception:
                    pass
            
            # Remove large base64 payloads
            try:
                face_results = results.get("face_results")
                if isinstance(face_results, list):
                    for fr in face_results:
                        if isinstance(fr, dict) and "base64" in fr:
                            fr.pop("base64", None)
            except Exception:
                pass
            
            # Add thumbnail
            try:
                with Image.open(image_path) as img:
                    img = img.convert("RGB")
                    if img.width > 0:
                        ratio = 100.0 / float(img.width)
                        new_size = (100, max(1, int(img.height * ratio)))
                        img = img.resize(new_size, Image.LANCZOS)
                    buf = io.BytesIO()
                    img.save(buf, format="JPEG", quality=85)
                    results["thumbnail_base64"] = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
            except Exception:
                results["thumbnail_base64"] = None
            
            results["request_id"] = request_id
            
            # Save results
            results_path = os.path.join(CACHE_DIR, f"{request_id}.json")
            try:
                with open(results_path, "w", encoding="utf-8") as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)
            except Exception:
                pass
            
            return JSONResponse(content=results)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


<<<<<<< HEAD
@app.post("/voice/start")
async def start_voice_recording(title: str = None):
    """
    Start voice recording manually.
    
    Args:
        title: Optional title for the recording session
        
    Returns:
        JSON response with recording status
    """
    global _voice_recorder
    try:
        if _voice_recorder is None:
            _voice_recorder = AudioRecorder(auto_transcribe=True, keep_audio=False)
        
        # Generate title if not provided
        if not title:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            title = f"Manual_Recording_{timestamp}"
        
        result = _voice_recorder.start(title=title)
        return {
            "status": "success" if result.get("success") else "error",
            "message": result.get("message", "Voice recording started"),
            "session": result.get("session", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting voice recording: {e}")


@app.post("/voice/stop")
async def stop_voice_recording():
    """
    Stop voice recording manually.
    
    Returns:
        JSON response with transcription results
    """
    global _voice_recorder
    try:
        if _voice_recorder is None:
            return {"status": "error", "message": "No voice recording active"}
        
        result = _voice_recorder.stop()
        if result.get("success"):
            return {
                "status": "success",
                "message": "Voice recording stopped and transcribed",
                "transcription": result.get("transcription", {}),
                "session": result.get("session", {})
            }
        else:
            return {
                "status": "error",
                "message": f"Failed to stop recording: {result.get('error', 'Unknown error')}"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping voice recording: {e}")


@app.get("/voice/status")
async def get_voice_recording_status():
    """
    Get current voice recording status.
    
    Returns:
        JSON response with recording status
    """
    global _voice_recorder
    try:
        if _voice_recorder is None:
            return {"status": "inactive", "message": "No voice recorder initialized"}
        
        status = _voice_recorder.status()
        return {
            "status": "active" if status.get("is_recording") else "inactive",
            "is_recording": status.get("is_recording", False),
            "session": status.get("session"),
            "current_duration": status.get("current_duration", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting voice status: {e}")


@app.get("/voice/transcripts")
async def list_voice_transcripts():
    """
    List all voice transcripts in recorded_conversations.
    
    Returns:
        JSON response with list of transcripts
    """
    global _voice_recorder
    try:
        if _voice_recorder is None:
            _voice_recorder = AudioRecorder(auto_transcribe=True, keep_audio=False)
        
        result = _voice_recorder.list_recordings()
        return {
            "status": "success",
            "recordings": result.get("recordings", []),
            "count": result.get("count", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing transcripts: {e}")


@app.get("/webcam/frame")
async def get_webcam_frame():
    """
    Get current webcam frame with face detections.
    
    Returns:
        JSON response with frame data and detections
    """
    try:
        webcam = get_webcam_instance()
        success, frame, detections = webcam.get_frame_with_detections()
        
        if not success or frame is None:
            raise HTTPException(status_code=404, detail="No frame available")
        
        # Encode frame to base64
        _, buffer = cv2.imencode('.jpg', frame)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "status": "success",
            "frame": f"data:image/jpeg;base64,{frame_base64}",
            "detections": detections,
            "timestamp": time.time(),
            "presence_events": webcam.get_presence_events()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting webcam frame: {e}")


@app.get("/webcam/stream")
async def webcam_stream_sse():
    """
    Server-Sent Events endpoint for reliable real-time webcam streaming.
    """
    async def generate_stream():
        # Start webcam if not already started
        webcam = get_webcam_instance()
        logger.info(f"SSE: Webcam running status: {webcam.is_running}")
        
        if not webcam.is_running:
            logger.info("SSE: Starting webcam...")
            success = webcam.start_webcam(0)
            if not success:
                logger.error("SSE: Failed to start webcam")
                yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to start webcam'})}\n\n"
                return
            logger.info("SSE: Webcam started successfully")
        
        frame_count = 0
        try:
            while True:
                success, frame, detections = webcam.get_frame_with_detections()
                
                if success and frame is not None:
                    # Encode frame to base64 with good quality
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
                    _, buffer = cv2.imencode('.jpg', frame, encode_param)
                    frame_base64 = base64.b64encode(buffer).decode('utf-8')
                    
                    # Send frame and detection data
                    data = {
                        "type": "frame",
                        "frame": f"data:image/jpeg;base64,{frame_base64}",
                        "detections": detections,
                        "timestamp": time.time(),
                        "frame_count": frame_count,
                        "presence_events": webcam.get_presence_events()
                    }
                    
                    # Debug detection data to ensure JSON serialization works
                    if detections:
                        logger.debug(f"SSE: Sending {len(detections)} detections: {[d.get('name', 'analyzing/unknown') for d in detections]}")
                    
                    yield f"data: {json.dumps(data)}\n\n"
                    frame_count += 1
                    
                    if frame_count % 30 == 0:  # Log every 30 frames
                        logger.info(f"SSE: Sent frame {frame_count}, detections: {len(detections)}")
                else:
                    # Send status update if no frame available
                    yield f"data: {json.dumps({'type': 'status', 'message': 'No frame available'})}\n\n"
                
                # Control frame rate (10 FPS for reliable streaming)
                await asyncio.sleep(0.1)
                
        except Exception as e:
            logger.error(f"SSE Error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control"
=======
@app.get("/video/status")
async def video_status():
    """Get current video stream status"""
    global camera
    is_active = camera is not None and camera.isOpened()
    return {
        "active": is_active,
        "message": "Camera is active" if is_active else "Camera is not active"
>>>>>>> bf9852b (backend changes)
    }


@app.get("/video/frame")
async def video_frame():
    """Get a single frame from the video stream"""
    global camera
    if camera is None or not camera.isOpened():
        raise HTTPException(status_code=400, detail="Camera not started. Call /video/start first")
    
<<<<<<< HEAD
    return StreamingResponse(generate_stream(), media_type="text/event-stream", headers=headers)


@app.get("/webcam/live-frame")
async def get_live_frame_with_detections():
    """
    Get current webcam frame with face detections as JSON.
    This provides a fallback for polling-based updates.
    """
    try:
        webcam = get_webcam_instance()
        
        # Start webcam if not running
        if not webcam.is_running:
            success = webcam.start_webcam(0)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to start webcam")
        
        success, frame, detections = webcam.get_frame_with_detections()
        
        if not success or frame is None:
            raise HTTPException(status_code=404, detail="No frame available")
        
        # Encode frame to base64
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
        _, buffer = cv2.imencode('.jpg', frame, encode_param)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "status": "success",
            "frame": f"data:image/jpeg;base64,{frame_base64}",
            "detections": detections,
            "timestamp": time.time(),
            "presence_events": webcam.get_presence_events()
=======
    success, frame = camera.read()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to capture frame")
    
    # Encode frame as JPEG optimized for maximum speed
    ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 30])
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to encode frame")
    
    return StreamingResponse(
        io.BytesIO(buffer.tobytes()),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
>>>>>>> bf9852b (backend changes)
        }
    )


# Note: To keep the server single-threaded and process only one request at a time,
# run uvicorn with a single worker:
#   uvicorn server:app --host 127.0.0.1 --port 8000 --workers 1
# (Run from the `backend/` directory so imports like `pipeline` resolve correctly.)
