import os
import sys
import asyncio
from typing import Any, Dict, Optional
import uuid
import json
import base64
import io
import time

from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
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

app = FastAPI(title="Orbit Face Analysis Server")
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
            best_match_path = recognize(image_path, candidates)
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

        # Save results JSON to cache (best-effort)
        try:
            with open(results_path, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
        except Exception:
            # Do not fail the request if caching fails
            pass

        # Include request ID in response
        results["request_id"] = request_id

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


def _mjpeg_generator(cap):
    try:
        import cv2  # type: ignore
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if not ok:
                continue
            frame_bytes = encoded.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
            time.sleep(0.033)
    except GeneratorExit:
        pass
    except Exception:
        pass
    finally:
        try:
            cap.release()
        except Exception:
            pass

@app.get("/camera/stream")
async def camera_stream(index: int = 0, width: Optional[int] = None, height: Optional[int] = None):
    """
    MJPEG camera stream. Open http://127.0.0.1:8000/static/camera.html to view.
    Query params:
      - index: camera index (default 0)
      - width: desired frame width (optional)
      - height: desired frame height (optional)
    """
    try:
        import cv2  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenCV not installed. Please install 'opencv-python'. {e}")
    cap = cv2.VideoCapture(int(index))
    if width is not None:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, int(width))
    if height is not None:
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(height))
    if not cap.isOpened():
        try:
            cap.release()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Could not open camera at index {index}")
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    return StreamingResponse(
        _mjpeg_generator(cap),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers=headers,
    )

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

# Note: To keep the server single-threaded and process only one request at a time,
# run uvicorn with a single worker:
#   uvicorn server:app --host 127.0.0.1 --port 8000 --workers 1
# (Run from the `backend/` directory so imports like `pipeline` resolve correctly.)
