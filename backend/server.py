import os
import sys
import asyncio
import time
import logging
from typing import Any, Dict, Optional
import uuid
import json
import base64
import io
import cv2
import numpy as np
import time
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image

# Ensure the backend directory is on sys.path so imports like `pipeline`, `search`, `llm` work
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

# Cache directory for per-request files
CACHE_DIR = os.path.join(BACKEND_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Static directory for serving sample HTML (e.g., camera viewer)
STATIC_DIR = os.path.join(BACKEND_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)

from pipeline import complete_face_analysis  # noqa: E402
from output_schema import OutputSchemaManager  # noqa: E402
from facial_recognition.local_face_recognition import recognize  # noqa: E402
from analysis_pipeline.main_pipeline import run_on_server_startup  # noqa: E402
from facial_recognition.webcam_recognition import get_webcam_instance, start_webcam_recognition, stop_webcam_recognition  # noqa: E402
from recording.recorder import AudioRecorder  # noqa: E402

app = FastAPI(title="Orbit Face Analysis Server")

# Global variable to store startup analysis result
_startup_analysis_result = None

# Global voice recorder instance
_voice_recorder = None

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Global lock to ensure only one request is processed at a time
_request_lock = asyncio.Lock()


class ConnectionManager:
    """Manages WebSocket connections for publishing analysis results."""
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self._connections:
                self._connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        async with self._lock:
            dead: list[WebSocket] = []
            for ws in list(self._connections):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                try:
                    await ws.close()
                except Exception:
                    pass
                if ws in self._connections:
                    self._connections.remove(ws)


manager = ConnectionManager()
 
# is_new_person heuristic removed; is_new is determined by early local match in analyze()


@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    """
    Upload a JPG image of a person's face, save it under /cache/<request_id>.jpg,
    run analysis, save results to /cache/<request_id>.json, and return the results as JSON.
    Processes concurrently; this endpoint no longer uses a global lock.
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

    # Process request concurrently (no global lock)
    if True:
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

        # Attempt fast local match against existing cache; if found, return existing JSON
        candidates: list[str] = []
        try:
            for name in os.listdir(CACHE_DIR):
                if name.endswith(".jpg"):
                    p = os.path.join(CACHE_DIR, name)
                    if p != image_path:  # avoid matching the just-saved image
                        candidates.append(p)
        except Exception:
            candidates = []

        try:
            best_match_path = await asyncio.to_thread(recognize, image_path, candidates)
        except Exception:
            best_match_path = None

        if isinstance(best_match_path, str) and os.path.exists(best_match_path):
            matched_id = os.path.splitext(os.path.basename(best_match_path))[0]
            matched_json_path = os.path.join(CACHE_DIR, f"{matched_id}.json")
            try:
                with open(matched_json_path, "r", encoding="utf-8") as jf:
                    existing_obj = json.load(jf)
            except Exception:
                existing_obj = None

            if isinstance(existing_obj, dict):
                # Ensure no base64 payloads are present in face_results
                try:
                    face_results = existing_obj.get("face_results")
                    if isinstance(face_results, list):
                        for fr in face_results:
                            if isinstance(fr, dict) and "base64" in fr:
                                fr.pop("base64", None)
                except Exception:
                    pass

                # Remove uploaded image since a match was found and we won't use it further
                try:
                    if os.path.exists(image_path):
                        os.remove(image_path)
                except Exception:
                    pass

                # Notify subscribers (is_new = False) and return existing JSON immediately
                try:
                    await manager.broadcast({
                        "is_new": False,
                        "result": existing_obj,
                    })
                except Exception:
                    pass

                return JSONResponse(content=existing_obj)

        # Run the analysis pipeline (structured output like example.py)
        try:
            results: Dict[str, Any] = await asyncio.to_thread(
                complete_face_analysis,
                image_path,
                use_structured_output=True,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

        # Format output to match example.py structure
        try:
            if results.get("success"):
                analysis = results.get("llm_analysis", {})
                if analysis.get("structured_data"):
                    # Create structured output like example.py
                    schema_manager = OutputSchemaManager()
                    structured_output = {
                        "person_analysis": json.loads(schema_manager.to_json(analysis["structured_data"])),
                        "best_match_photo": results.get("best_match_photo"),
                        "metadata": {
                            "llm_provider": analysis.get("provider"),
                            "llm_model": analysis.get("model"),
                            "face_matches": results.get("summary", {}).get("face_matches", 0),
                            "total_mentions": results.get("summary", {}).get("total_mentions", 0)
                        }
                    }
                    # Replace the results with the structured format
                    results["structured_analysis"] = structured_output
                    # Keep original results for compatibility but remove large base64 data
                    if "llm_analysis" in results and "structured_data" in results["llm_analysis"]:
                        # Remove the dataclass object and keep only serializable data
                        results["llm_analysis"]["structured_data"] = "See structured_analysis field"
        except Exception as e:
            # If conversion fails, add error note
            results["structured_analysis_error"] = str(e)

        # Remove large base64 payloads from face_results before caching/returning
        try:
            face_results = results.get("face_results")
            if isinstance(face_results, list):
                for fr in face_results:
                    if isinstance(fr, dict) and "base64" in fr:
                        fr.pop("base64", None)
        except Exception:
            pass

        # STEP 1: Save structured analysis to cache FIRST
        cache_saved = False
        try:
            # Only cache the structured analysis part
            cache_data = results.get("structured_analysis", {})
            if cache_data:
                # Add essential metadata for the cache
                cache_data["request_id"] = request_id
                cache_data["cached_at"] = results.get("timestamp", "unknown")
                
                with open(results_path, "w", encoding="utf-8") as f:
                    json.dump(cache_data, f, indent=2, ensure_ascii=False)
                cache_saved = True
            else:
                # Fallback: save minimal info if no structured analysis
                fallback_data = {
                    "request_id": request_id,
                    "success": results.get("success", False),
                    "error": results.get("error", "No structured analysis available"),
                    "summary": results.get("summary", {}),
                    "cached_at": results.get("timestamp", "unknown")
                }
                with open(results_path, "w", encoding="utf-8") as f:
                    json.dump(fallback_data, f, indent=2, ensure_ascii=False)
                cache_saved = True
        except Exception:
            # Do not fail the request if caching fails
            pass

        # STEP 2: Now run local face recognition on the complete cache (including newly created item)
        try:
            if cache_saved:
                # Now that cache is complete, run facial recognition
                best_match = recognize(image_path, [])
            else:
                best_match = None
        except Exception:
            best_match = None
        results["local_face_recognition"] = {"best_match": best_match}

        # Include request ID and timestamp in response
        results["request_id"] = request_id
        results["timestamp"] = datetime.now().isoformat()

        # Mark as new (no local match was found earlier) and broadcast
        results["is_new_person"] = True

        try:
            await manager.broadcast({
                "is_new": True,
                "result": results,
            })
        except Exception:
            # Do not fail the request if broadcast fails
            pass

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


@app.get("/health")
async def health():
    return {"status": "ok"}


# Global camera object
# camera = None

# @app.get("/video/start")
# async def start_video():
#     """Start the video stream from webcam"""
#     global camera
#     try:
#         if camera is not None:
#             camera.release()
#         
#         camera = cv2.VideoCapture(0)  # Use default camera
#         
#         if not camera.isOpened():
#             raise HTTPException(status_code=500, detail="Could not open camera")
#             
#         # Set camera properties for maximum frame rate
#         camera.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
#         camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
#         camera.set(cv2.CAP_PROP_FPS, 30)
#         camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer lag
#         
#         return {"status": "started", "message": "Video stream started"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to start camera: {str(e)}")


# @app.get("/video/stop")
# async def stop_video():
#     """Stop the video stream"""
#     global camera
#     try:
#         if camera is not None:
#             camera.release()
#             camera = None
#         return {"status": "stopped", "message": "Video stream stopped"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to stop camera: {str(e)}")


# def generate_frames():
#     """Generate video frames for streaming"""
#     global camera
#     while camera is not None and camera.isOpened():
#         success, frame = camera.read()
#         if not success:
#             break
#         else:
#             # Encode frame as JPEG optimized for maximum speed
#             ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 30])
#             if ret:
#                 frame_bytes = buffer.tobytes()
#                 yield (b'--frame\r\n'
#                        b'Content-Type: image/jpeg\r\n'
#                        b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n' + 
#                        frame_bytes + b'\r\n')


# @app.get("/video/stream")
# async def video_stream():
#     """Stream video frames"""
#     global camera
#     if camera is None or not camera.isOpened():
#         raise HTTPException(status_code=400, detail="Camera not started. Call /video/start first")
#     
#     return StreamingResponse(
#         generate_frames(),
#         media_type="multipart/x-mixed-replace; boundary=frame",
#         headers={
#             "Cache-Control": "no-cache, no-store, must-revalidate",
#             "Pragma": "no-cache",
#             "Expires": "0",
#             "Connection": "close"
#         }
#     )


# @app.post("/video/capture")
# async def capture_frame():
#     """Capture a single frame and analyze it"""
#     global camera
#     if camera is None or not camera.isOpened():
#         raise HTTPException(status_code=400, detail="Camera not started. Call /video/start first")
#     
#     # Capture frame
#     success, frame = camera.read()
#     if not success:
#         raise HTTPException(status_code=500, detail="Failed to capture frame")
#     
#     # Save frame to temporary file
#     request_id = uuid.uuid4().hex
#     image_path = os.path.join(CACHE_DIR, f"{request_id}.jpg")
#     
#     try:
#         cv2.imwrite(image_path, frame)
#         
#         # Run analysis
#         async with _request_lock:
#             results: Dict[str, Any] = complete_face_analysis(
#                 image_path,
#                 use_structured_output=True,
#             )
#             
#             # Process results same as /analyze endpoint
#             try:
#                 llm_analysis = results.get("llm_analysis")
#                 if isinstance(llm_analysis, dict) and "structured_data" in llm_analysis:
#                     sd = llm_analysis.get("structured_data")
#                     if sd is not None and not isinstance(sd, dict):
#                         results["llm_analysis"]["structured_data"] = OutputSchemaManager.to_dict(sd)
#             except Exception as e:
#                 try:
#                     if isinstance(results.get("llm_analysis"), dict):
#                         results["llm_analysis"].pop("structured_data", None)
#                         results["llm_analysis"]["serialization_error"] = str(e)
#                 except Exception:
#                     pass
#             
#             # Remove large base64 payloads
#             try:
#                 face_results = results.get("face_results")
#                 if isinstance(face_results, list):
#                     for fr in face_results:
#                         if isinstance(fr, dict) and "base64" in fr:
#                             fr.pop("base64", None)
#             except Exception:
#                 pass
#             
#             # Add thumbnail
#             try:
#                 with Image.open(image_path) as img:
#                     img = img.convert("RGB")
#                     if img.width > 0:
#                         ratio = 100.0 / float(img.width)
#                         new_size = (100, max(1, int(img.height * ratio)))
#                         img = img.resize(new_size, Image.LANCZOS)
#                     buf = io.BytesIO()
#                     img.save(buf, format="JPEG", quality=85)
#                     results["thumbnail_base64"] = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
#             except Exception:
#                 results["thumbnail_base64"] = None
#             
#             results["request_id"] = request_id
#             
#             # Save results
#             results_path = os.path.join(CACHE_DIR, f"{request_id}.json")
#             try:
#                 with open(results_path, "w", encoding="utf-8") as f:
#                     json.dump(results, f, indent=2, ensure_ascii=False)
#             except Exception:
#                 pass
#             
#             return JSONResponse(content=results)
#             
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# @app.get("/video/status")
# async def video_status():
#     """Get current video stream status"""
#     global camera
#     is_active = camera is not None and camera.isOpened()
#     return {
#         "active": is_active,
#         "message": "Camera is active" if is_active else "Camera is not active"
#     }


# @app.get("/video/frame")
# async def video_frame():
#     """Get a single frame from the video stream"""
#     global camera
#     if camera is None or not camera.isOpened():
#         raise HTTPException(status_code=400, detail="Camera not started. Call /video/start first")
#     
#     success, frame = camera.read()
#     if not success:
#         raise HTTPException(status_code=500, detail="Failed to capture frame")
#     
#     # Encode frame as JPEG optimized for maximum speed
#     ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 30])
#     if not ret:
#         raise HTTPException(status_code=500, detail="Failed to encode frame")
#     
#     return StreamingResponse(
#         io.BytesIO(buffer.tobytes()),
#         media_type="image/jpeg",
#         headers={
#             "Cache-Control": "no-cache, no-store, must-revalidate",
#             "Pragma": "no-cache",
#             "Expires": "0"
#         }
#     )


# def _mjpeg_generator(cap):
#     try:
#         import cv2  # type: ignore
#         while True:
#             ok, frame = cap.read()
#             if not ok:
#                 break
#             ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
#             if not ok:
#                 continue
#             frame_bytes = encoded.tobytes()
#             yield (
#                 b"--frame\r\n"
#                 b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
#             )
#             time.sleep(0.033)
#     except GeneratorExit:
#         pass
#     except Exception:
#         pass
#     finally:
#         try:
#             cap.release()
#         except Exception:
#             pass

# @app.get("/camera/stream")
# async def camera_stream(index: int = 0, width: Optional[int] = None, height: Optional[int] = None):
#     """
#     MJPEG camera stream. Open http://127.0.0.1:8000/static/camera.html to view.
#     Query params:
#       - index: camera index (default 0)
#       - width: desired frame width (optional)
#       - height: desired frame height (optional)
#     """
#     try:
#         import cv2  # type: ignore
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"OpenCV not installed. Please install 'opencv-python'. {e}")
#     cap = cv2.VideoCapture(int(index))
#     if width is not None:
#         cap.set(cv2.CAP_PROP_FRAME_WIDTH, int(width))
#     if height is not None:
#         cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(height))
#     if not cap.isOpened():
#         try:
#             cap.release()
#         except Exception:
#             pass
#         raise HTTPException(status_code=500, detail=f"Could not open camera at index {index}")
#     headers = {
#         "Cache-Control": "no-cache, no-store, must-revalidate",
#         "Pragma": "no-cache",
#         "Expires": "0",
#     }
#     return StreamingResponse(
#         _mjpeg_generator(cap),
#         media_type="multipart/x-mixed-replace; boundary=frame",
#         headers=headers,
#     )

@app.post("/webcam/start")
async def start_webcam(camera_index: int = 0):
    """
    Start webcam facial recognition and voice recording.
    
    Args:
        camera_index: Camera index (default: 0)
        
    Returns:
        JSON response with status
    """
    global _voice_recorder
    try:
        success = start_webcam_recognition(camera_index)
        if success:
            # Start voice recording when webcam starts
            if _voice_recorder is None:
                _voice_recorder = AudioRecorder(auto_transcribe=True, keep_audio=False)
            
            # Start recording with timestamp-based title
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            recording_result = _voice_recorder.start(title=f"Webcam_Session_{timestamp}")
            
            voice_status = "started" if recording_result.get("success") else "failed"
            voice_message = recording_result.get("message", "Voice recording status unknown")
            
            return {
                "status": "success", 
                "message": f"Webcam started on camera {camera_index}",
                "voice_recording": {
                    "status": voice_status,
                    "message": voice_message
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to start webcam")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting webcam: {e}")


@app.post("/webcam/stop")
async def stop_webcam():
    """
    Stop webcam facial recognition and voice recording.
    
    Returns:
        JSON response with status
    """
    global _voice_recorder
    try:
        stop_webcam_recognition()
        
        # Stop voice recording when webcam stops
        voice_result = {"status": "not_started", "message": "No voice recording was active"}
        if _voice_recorder is not None:
            try:
                stop_result = _voice_recorder.stop()
                if stop_result.get("success"):
                    voice_result = {
                        "status": "stopped",
                        "message": "Voice recording stopped and transcribed",
                        "transcription": stop_result.get("transcription", {})
                    }
                else:
                    voice_result = {
                        "status": "error",
                        "message": f"Failed to stop voice recording: {stop_result.get('error', 'Unknown error')}"
                    }
            except Exception as e:
                voice_result = {
                    "status": "error", 
                    "message": f"Error stopping voice recording: {e}"
                }
        
        return {
            "status": "success", 
            "message": "Webcam stopped",
            "voice_recording": voice_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping webcam: {e}")


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
    }
    
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
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting live frame: {e}")


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    """WebSocket publisher endpoint for analysis results.

    Clients can connect here to receive a JSON message when an analysis completes:
    {
      "event": "analysis_complete",
      "is_new": bool,
      "request_id": str,
      "result": { ... full analysis JSON ... }
    }
    """
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect incoming messages; keep the connection alive
            # by reading and ignoring ping/pong/text frames.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)


@app.websocket("/overlay_ws")
async def overlay_ws(websocket: WebSocket):
    """WebSocket endpoint that streams a constant overlay [x1, y1, x2, y2].

    Sends the JSON list [100, 100, 200, 200] every 0.1 seconds until the client disconnects.
    """
    await websocket.accept()
    try:
        while True:
            await websocket.send_json([100, 100, 200, 200])
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        pass
    except Exception:
        # Swallow any send/connection errors on disconnect
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@app.on_event("startup")
async def startup_event():
    """Run analysis pipeline automatically when server starts."""
    global _startup_analysis_result
    try:
        print("🚀 Running automatic analysis pipeline on startup...")
        _startup_analysis_result = run_on_server_startup()
        if _startup_analysis_result:
            print(f"✅ Startup analysis completed: {_startup_analysis_result}")
        else:
            print("❌ Startup analysis failed")
    except Exception as e:
        print(f"❌ Error in startup analysis: {e}")


# Note: To keep the server single-threaded and process only one request at a time,
# run uvicorn with a single worker:
#   uvicorn server:app --host 127.0.0.1 --port 8000 --workers 1
# (Run from the `backend/` directory so imports like `pipeline` resolve correctly.)