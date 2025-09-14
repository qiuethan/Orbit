'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const WebcamFaceRecognition = () => {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState(null);
  const [frameData, setFrameData] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [presence, setPresence] = useState({ inFrame: new Set(), events: [] });
  const [connectionMethod, setConnectionMethod] = useState('sse'); // 'sse' or 'polling'
  const [trackLabels, setTrackLabels] = useState({}); // { [trackId]: { label: string, recognized: boolean } }
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const eventSourceRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryAttempts = useRef(0);
  const maxRetryAttempts = 5;

  // Polling fallback for when SSE fails
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log('🔄 Starting polling mode...');
    setIsConnecting(false);
    
    const pollFrame = async () => {
      try {
        const response = await fetch('http://localhost:8000/webcam/live-frame');
        if (response.ok) {
          const data = await response.json();
          setFrameData(data.frame);
          const dets = data.detections || [];
          setDetections(dets);
          setTrackLabels((prev) => {
            const next = { ...prev };
            const seen = new Set();
            dets.forEach((d) => {
              const tid = d.track_id ?? `idx_${Math.random().toString(36).slice(2)}`;
              seen.add(tid);
              if (d.recognized && d.name) {
                if (!next[tid] || next[tid]?.label !== d.name) {
                  next[tid] = { label: d.name, recognized: true };
                } else if (next[tid] && next[tid].recognized !== true) {
                  next[tid] = { ...next[tid], recognized: true };
                }
              } else if (!next[tid]) {
                next[tid] = { label: 'Unknown', recognized: false };
              }
            });
            Object.keys(next).forEach((key) => {
              if (!seen.has(isNaN(Number(key)) ? key : Number(key))) {
                delete next[key];
              }
            });
            return next;
          });
          if (Array.isArray(data.presence_events)) {
            setPresence(prev => {
              const nextInFrame = new Set(prev.inFrame);
              const evts = [];
              data.presence_events.forEach(evt => {
                if (evt.event === 'entered') nextInFrame.add(evt.track_id);
                if (evt.event === 'left') nextInFrame.delete(evt.track_id);
                evts.push(evt);
              });
              return { inFrame: nextInFrame, events: evts };
            });
          }
          setError(null);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        console.error('Polling error:', err);
        setError(`Polling failed: ${err.message}`);
      }
    };

    // Initial frame
    pollFrame();
    
    // Poll every 100ms (10 FPS)
    pollingIntervalRef.current = setInterval(pollFrame, 100);
  }, []);

  // Server-Sent Events connection for reliable streaming
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnecting(true);
    console.log('🔌 Connecting to webcam SSE stream...');

    try {
      const eventSource = new EventSource('http://localhost:8000/webcam/stream');
      
      eventSource.onopen = () => {
        console.log('✅ SSE connected');
        setIsConnecting(false);
        setError(null);
        retryAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'frame') {
            setFrameData(data.frame);
            const dets = data.detections || [];
            setDetections(dets);
            setTrackLabels((prev) => {
              const next = { ...prev };
              const seen = new Set();
              dets.forEach((d) => {
                const tid = d.track_id ?? `idx_${Math.random().toString(36).slice(2)}`;
                seen.add(tid);
                if (d.recognized && d.name) {
                  if (!next[tid] || next[tid]?.label !== d.name) {
                    next[tid] = { label: d.name, recognized: true };
                  } else if (next[tid] && next[tid].recognized !== true) {
                    next[tid] = { ...next[tid], recognized: true };
                  }
                } else if (!next[tid]) {
                  next[tid] = { label: 'Unknown', recognized: false };
                }
              });
              Object.keys(next).forEach((key) => {
                if (!seen.has(isNaN(Number(key)) ? key : Number(key))) {
                  delete next[key];
                }
              });
              return next;
            });
            setFrameCount(data.frame_count || 0);
            if (Array.isArray(data.presence_events)) {
              setPresence(prev => {
                const nextInFrame = new Set(prev.inFrame);
                const evts = [];
                data.presence_events.forEach(evt => {
                  if (evt.event === 'entered') nextInFrame.add(evt.track_id);
                  if (evt.event === 'left') nextInFrame.delete(evt.track_id);
                  evts.push(evt);
                });
                return { inFrame: nextInFrame, events: evts };
              });
            }
            setError(null);
          } else if (data.type === 'status') {
            console.log('SSE status:', data.message);
          } else if (data.type === 'error') {
            console.error('SSE error:', data.message);
            setError(data.message);
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
          setError('Failed to parse video data');
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error);
        setIsConnecting(false);
        
        // Attempt to reconnect
        if (retryAttempts.current < maxRetryAttempts) {
          retryAttempts.current++;
          console.log(`🔄 Reconnecting SSE... (attempt ${retryAttempts.current}/${maxRetryAttempts})`);
          
          retryTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, Math.min(1000 * Math.pow(2, retryAttempts.current), 5000)); // Exponential backoff, max 5s
        } else {
          setError('Connection failed - switching to polling');
          setConnectionMethod('polling');
          startPolling();
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error('Failed to create SSE:', err);
      setError('SSE failed - using polling');
      setConnectionMethod('polling');
      startPolling();
    }
  }, [startPolling]);

  // Disconnect all streams
  const disconnectStream = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setFrameData(null);
    setDetections([]);
    setPresence({ inFrame: new Set(), events: [] });
    setTrackLabels({});
    setFrameCount(0);
    retryAttempts.current = 0;
  }, []);

  // Start webcam stream
  const startWebcam = useCallback(() => {
    setError(null);
    console.log('🎥 Starting live webcam stream...');
    
    setIsStreamActive(true);
    
    // Try SSE first, fall back to polling if needed
    if (connectionMethod === 'sse') {
      connectSSE();
    } else {
      startPolling();
    }
  }, [connectionMethod, connectSSE, startPolling]);

  // Stop webcam stream
  const stopWebcam = useCallback(async () => {
    console.log('🛑 Stopping webcam stream...');
    
    // Disconnect stream
    disconnectStream();
    
    // Stop backend webcam
    try {
      await fetch('http://localhost:8000/webcam/stop', {
        method: 'POST'
      });
    } catch (err) {
      console.warn('Error stopping backend webcam:', err);
    }
    
    setIsStreamActive(false);
    setFrameData(null);
    setDetections([]);
  }, [disconnectStream]);

  // Draw bounding boxes and labels on canvas
  const drawDetections = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image || !detections.length) return;
    
    const ctx = canvas.getContext('2d');
    const { naturalWidth, naturalHeight, offsetWidth, offsetHeight } = image;
    
    // Set canvas size to match displayed image
    canvas.width = offsetWidth;
    canvas.height = offsetHeight;
    
    // Calculate scale factors
    const scaleX = offsetWidth / naturalWidth;
    const scaleY = offsetHeight / naturalHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw detections
    detections.forEach((detection) => {
      const [x1, y1, x2, y2] = detection.bbox;
      
      // Scale coordinates to canvas size
      const scaledX1 = x1 * scaleX;
      const scaledY1 = y1 * scaleY;
      const scaledX2 = x2 * scaleX;
      const scaledY2 = y2 * scaleY;
      
      const width = scaledX2 - scaledX1;
      const height = scaledY2 - scaledY1;
      
      // Determine color based on status and confidence
      const tid = detection.track_id ?? null;
      const tracked = tid != null ? trackLabels[tid] : null;
      const recognizedNow = Boolean(detection.recognized || (tracked && tracked.recognized));
      const label = (tracked && tracked.label) || (detection.recognized ? detection.name : 'Unknown');
      const color = recognizedNow ? '#00FF00' : '#FF0000';
      
      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(scaledX1, scaledY1, width, height);
      
      // Draw label background
      ctx.font = '16px Arial';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 20;
      
      ctx.fillStyle = color;
      ctx.fillRect(scaledX1, scaledY1 - textHeight - 5, textWidth + 10, textHeight + 5);
      
      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.fillText(label, scaledX1 + 5, scaledY1 - 8);
      
      // Draw confidence score if available
      if (detection.confidence && detection.confidence > 0) {
        const confLabel = `Conf: ${(detection.confidence * 100).toFixed(0)}%`;
        ctx.font = '12px Arial';
        ctx.fillStyle = color;
        ctx.fillRect(scaledX1, scaledY2 + 2, ctx.measureText(confLabel).width + 6, 16);
        ctx.fillStyle = '#000000';
        ctx.fillText(confLabel, scaledX1 + 3, scaledY2 + 14);
      }
    });
  }, [detections]);

  // Redraw detections when frame or detections change
  useEffect(() => {
    if (frameData && detections.length > 0) {
      // Wait for image to load before drawing
      const timer = setTimeout(drawDetections, 100);
      return () => clearTimeout(timer);
    }
  }, [frameData, detections, drawDetections]);

  // Handle image load to redraw detections
  const handleImageLoad = () => {
    if (detections.length > 0) {
      setTimeout(drawDetections, 50);
    }
  };

  // Auto-start webcam when component mounts
  useEffect(() => {
    console.log('🚀 Vision page loaded - auto-starting webcam...');
    startWebcam();
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up webcam connections...');
      disconnectStream();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [startWebcam, disconnectStream]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video Container */}
      <div className="relative w-full h-full">
        {frameData ? (
          <div className="relative w-full h-full">
            <img
              ref={imageRef}
              src={frameData}
              alt="Webcam feed"
              className="w-full h-full object-contain"
              onLoad={handleImageLoad}
              onError={() => setError('Failed to load video frame')}
            />
            
            {/* Overlay canvas for bounding boxes */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {!isStreamActive ? (
                <button
                  onClick={startWebcam}
                  disabled={isConnecting}
                  className="px-8 py-4 bg-white bg-opacity-20 text-white text-xl rounded-lg hover:bg-opacity-30 transition-colors backdrop-blur-sm disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Start Webcam'}
                </button>
              ) : (
                <div className="text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Connecting to webcam...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isStreamActive && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={stopWebcam}
            className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-white rounded-lg hover:bg-red-500/30 transition-colors backdrop-blur-sm"
          >
            Stop Camera
          </button>
        </div>
      )}

      {/* Status Information */}
      {isStreamActive && (
        <div className="absolute top-4 left-4">
          <div className="bg-black/60 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
            <p className="text-white/90 text-sm font-medium">
              🎥 Live Face Recognition Active
            </p>
            <p className="text-white/70 text-xs mt-1">
              Method: {connectionMethod.toUpperCase()} | Frame: {frameCount}
            </p>
            {detections.length > 0 && (
              <p className="text-green-400 text-xs mt-1">
                ✅ {detections.length} face(s) detected
              </p>
            )}
            {presence.inFrame && (
              <p className="text-white/70 text-xs mt-1">
                In frame: {[...presence.inFrame].length}
              </p>
            )}
            {isConnecting && (
              <p className="text-yellow-400 text-xs mt-1">
                🔄 Connecting...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 right-4">
          <div className="bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-lg backdrop-blur-sm">
            <p className="text-red-200 text-sm">⚠️ {error}</p>
          </div>
        </div>
      )}

      {/* Detection Info Panel */}
      {detections.length > 0 && (
        <div className="absolute bottom-4 left-4 max-w-sm">
          <div className="bg-black/60 p-4 rounded-lg backdrop-blur-sm border border-white/10">
            <h3 className="text-white font-medium mb-2">Detected Faces:</h3>
            {detections.map((detection, index) => {
              const tid = detection.track_id ?? `idx_${index}`;
              const tracked = trackLabels[tid];
              const recognizedNow = Boolean(detection.recognized || (tracked && tracked.recognized));
              const label = (tracked && tracked.label) || (detection.recognized ? detection.name : 'Unknown Person');
              return (
                <div key={tid} className="mb-2 last:mb-0">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: recognizedNow ? '#00FF00' : '#FF0000' }}
                    />
                    <span className="text-white text-sm">{label}</span>
                  </div>
                  {detection.similarity && detection.similarity > 0 && (
                    <div className="text-white/60 text-xs ml-5">
                      Confidence: {(detection.similarity * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
            {presence.events && presence.events.length > 0 && (
              <div className="mt-2 text-white/60 text-xs">
                Last events: {presence.events.map((e) => `${e.event}#${e.track_id}`).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebcamFaceRecognition;
