'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDetection } from '../../context/DetectionContext';

const WebcamFaceRecognition = () => {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState(null);
  const [frameData, setFrameData] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [presence, setPresence] = useState({ inFrame: new Set(), events: [] });
  const [connectionMethod, setConnectionMethod] = useState('sse'); // 'sse' or 'polling'
  const [trackLabels, setTrackLabels] = useState({}); // { [trackId]: { label: string, recognized: boolean, personData: object, isLoading: boolean } }
  
  // Get detection context to share data with sidebar
  const { updateDetections } = useDetection();
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const eventSourceRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryAttempts = useRef(0);
  const maxRetryAttempts = 5;

  // Function to get person data from cache by name
  const getPersonDataFromCache = useCallback(async (personName) => {
    try {
      // Fetch the full people data from your backend cache
      const response = await fetch('http://localhost:8000/list');
      if (!response.ok) {
        console.warn('Failed to fetch people data from cache');
        return null;
      }
      
      const peopleData = await response.json();
      
      // Find the person by name in the cache
      const person = peopleData.find(item => {
        const fullName = item.person_analysis?.personal_info?.full_name;
        return fullName && fullName.toLowerCase().includes(personName.toLowerCase());
      });
      
      if (person && person.person_analysis) {
        const analysis = person.person_analysis;
        const personalInfo = analysis.personal_info || {};
        const professionalInfo = analysis.professional_info || {};
        
        return {
          name: personalInfo.full_name || personName,
          title: professionalInfo.current_position || 'Professional',
          company: professionalInfo.company || 'Company',
          email: personalInfo.email || `${personName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
          location: personalInfo.location || '',
          industry: professionalInfo.industry || '',
          confidence: analysis.confidence_level || 'Medium',
          publicPresenceScore: analysis.public_presence_score || 'Medium',
          keyInsights: analysis.key_insights || [],
          talkingPoints: analysis.talking_points || {},
          socialMedia: analysis.social_media || [],
          avatar: person.thumbnail_base64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(personalInfo.full_name || personName)}`,
          rawData: person // Include full raw data for advanced features
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching person data from cache:', error);
      return null;
    }
  }, []);

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
                    // Initialize with loading state
                    next[tid] = { 
                      label: d.name, 
                      recognized: true,
                      personData: null,
                      isLoading: true
                    };
                    
                    // Fetch person data asynchronously with a small delay for better UX
                    setTimeout(() => {
                      getPersonDataFromCache(d.name).then(personData => {
                        setTrackLabels(prev => ({
                          ...prev,
                          [tid]: { ...prev[tid], personData, isLoading: false }
                        }));
                      });
                    }, 2500 + Math.random() * 1500); // 2.5-4 second random delay
                } else if (next[tid] && next[tid].recognized !== true) {
                  next[tid] = { ...next[tid], recognized: true };
                }
              } else if (!next[tid]) {
                  next[tid] = { label: 'Unknown', recognized: false, personData: null, isLoading: false };
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
  }, [getPersonDataFromCache]);

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
                    // Initialize with loading state
                    next[tid] = { 
                      label: d.name, 
                      recognized: true,
                      personData: null,
                      isLoading: true
                    };
                    
                    // Fetch person data asynchronously with a small delay for better UX
                    setTimeout(() => {
                      getPersonDataFromCache(d.name).then(personData => {
                        setTrackLabels(prev => ({
                          ...prev,
                          [tid]: { ...prev[tid], personData, isLoading: false }
                        }));
                      });
                    }, 2500 + Math.random() * 1500); // 2.5-4 second random delay
                  } else if (next[tid] && next[tid].recognized !== true) {
                    next[tid] = { ...next[tid], recognized: true };
                  }
                } else if (!next[tid]) {
                  next[tid] = { label: 'Unknown', recognized: false, personData: null, isLoading: false };
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
  }, [startPolling, getPersonDataFromCache]);

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

  // Draw Apple-style glass overlays above detected faces
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
    
    // Draw glass overlays for each detection
    detections.forEach((detection) => {
      const [x1, y1, x2, y2] = detection.bbox;
      
      // Scale coordinates to canvas size
      const scaledX1 = x1 * scaleX;
      const scaledY1 = y1 * scaleY;
      const scaledX2 = x2 * scaleX;
      const scaledY2 = y2 * scaleY;
      
      const faceWidth = scaledX2 - scaledX1;
      const faceHeight = scaledY2 - scaledY1;
      const faceCenterX = scaledX1 + faceWidth / 2;
      
      // Get person info from cache
      const tid = detection.track_id ?? null;
      const tracked = tid != null ? trackLabels[tid] : null;
      const recognizedNow = Boolean(detection.recognized || (tracked && tracked.recognized));
      const personData = tracked?.personData || null;
      
      // Glass overlay dimensions - dynamic height based on content
      const overlayWidth = Math.max(280, faceWidth * 1.2);
      const baseHeight = 60;
      const lineHeight = 16;
      const padding = 12;
      
      // Calculate height based on expected content
      let expectedLines = 1; // Name is always shown
      
      if (tracked?.isLoading) {
        expectedLines += 1; // Loading text
      } else if (tracked?.personData) {
        expectedLines += 1; // Title/company
        if (personData?.location || personData?.industry) {
          expectedLines += 1; // Location/industry
        }
      }
      
      const overlayHeight = baseHeight + (expectedLines - 1) * lineHeight;
      const overlayX = faceCenterX - overlayWidth / 2;
      const overlayY = scaledY1 - overlayHeight - 15; // Position above face
      
      // Ensure overlay stays within canvas bounds
      const finalOverlayX = Math.max(10, Math.min(overlayX, canvas.width - overlayWidth - 10));
      const finalOverlayY = Math.max(10, overlayY);
      
      // Create glass effect with gradient
      const glassGradient = ctx.createLinearGradient(finalOverlayX, finalOverlayY, finalOverlayX, finalOverlayY + overlayHeight);
      glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      glassGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
      glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      
      // Draw glass background with rounded corners
      ctx.fillStyle = glassGradient;
      ctx.beginPath();
      ctx.roundRect(finalOverlayX, finalOverlayY, overlayWidth, overlayHeight, 12);
      ctx.fill();
      
      // Draw glass border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(finalOverlayX, finalOverlayY, overlayWidth, overlayHeight, 12);
      ctx.stroke();
      
      // Draw subtle inner shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.beginPath();
      ctx.roundRect(finalOverlayX + 1, finalOverlayY + 1, overlayWidth - 2, overlayHeight - 2, 11);
      ctx.fill();
      
      // Prepare text content from cache data
      const name = (tracked && tracked.label) || (detection.recognized ? detection.name : 'Unknown Person');
      const title = personData?.title || 'Professional';
      const company = personData?.company || '';
      const location = personData?.location || '';
      const industry = personData?.industry || '';
      const confidence = detection.confidence || detection.similarity || 0;
      const isLoading = tracked?.isLoading || false;
      
      // Helper function to fit text within width
      const fitText = (text, maxWidth, fontSize) => {
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const textWidth = ctx.measureText(text).width;
        if (textWidth <= maxWidth) {
          return { text, fontSize };
        }
        
        // Try progressively smaller font sizes
        let newFontSize = fontSize;
        while (newFontSize > 10 && ctx.measureText(text).width > maxWidth) {
          newFontSize -= 0.5;
          ctx.font = `${newFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        }
        
        // If still too wide even at minimum font size, then truncate
        if (ctx.measureText(text).width > maxWidth) {
          let truncatedText = text;
          while (ctx.measureText(truncatedText + '...').width > maxWidth && truncatedText.length > 15) {
            truncatedText = truncatedText.slice(0, -1);
          }
          return { text: truncatedText + (truncatedText.length < text.length ? '...' : ''), fontSize: newFontSize };
        }
        
        return { text, fontSize: newFontSize };
      };
      
      const photoSize = 36;
      const photoX = finalOverlayX + 12;
      const photoY = finalOverlayY + 12;
      const textStartX = photoX + photoSize + 8; // Start text after photo + padding
      const textPadding = 12;
      const availableWidth = overlayWidth - textStartX - textPadding; // Available width for text
      
      // Debug: Let's use most of the overlay width for text
      const debugAvailableWidth = overlayWidth * 0.8; // Use 80% of overlay width
      let currentY = finalOverlayY + 20;
      
      if (personData && personData.avatar && !isLoading) {
        // Create a circular clip for the photo
        ctx.save();
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        
        // Draw photo background circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(photoX, photoY, photoSize, photoSize);
        
        // Load and draw the profile image
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
        };
        img.onerror = () => {
          // Fallback to initials if image fails to load
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(name.split(' ').map(n => n[0]).join(''), photoX + photoSize / 2, photoY + photoSize / 2 + 5);
        };
        img.src = personData.avatar;
        
        ctx.restore();
      } else {
        // Draw placeholder circle even when loading or no photo
        ctx.save();
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        
        // Draw placeholder background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(photoX, photoY, photoSize, photoSize);
        
        // Draw initials or loading indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        if (isLoading) {
          ctx.fillText('...', photoX + photoSize / 2, photoY + photoSize / 2 + 5);
        } else {
          ctx.fillText(name.split(' ').map(n => n[0]).join(''), photoX + photoSize / 2, photoY + photoSize / 2 + 5);
        }
        
        ctx.restore();
      }
      
      // Draw name (main text) - always show
      const nameResult = fitText(name, debugAvailableWidth, 16);
      ctx.font = `bold ${nameResult.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.textAlign = 'left';
      ctx.fillText(nameResult.text, textStartX, currentY);
      currentY += nameResult.fontSize + 4;
      
      // Show loading state with animation
      if (isLoading) {
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        
        // Simple loading animation with dots
        const dots = Math.floor((Date.now() / 500) % 4);
        const loadingText = 'Loading details' + '.'.repeat(dots);
        ctx.fillText(loadingText, textStartX, currentY);
        currentY += 16;
      } else if (personData) {
        // Draw title and company (line 2) - only if person data is loaded
        if (title !== 'Professional' || company) {
          const subtitle = company ? `${title} · ${company}` : title;
          const subtitleResult = fitText(subtitle, debugAvailableWidth, 12);
          ctx.font = `${subtitleResult.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText(subtitleResult.text, textStartX, currentY);
          currentY += subtitleResult.fontSize + 3;
        }
        
        // Draw location/industry (line 3) if available
        if (location || industry) {
          const locationInfo = location && industry ? `${location} · ${industry}` : (location || industry);
          const locationResult = fitText(locationInfo, debugAvailableWidth, 10);
          ctx.font = `${locationResult.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText(locationResult.text, textStartX, currentY);
          currentY += locationResult.fontSize + 3;
        }
        
        // Draw confidence score (line 4) - always show if available
        if (confidence > 0) {
          const confidenceText = `Confidence Score: ${(confidence * 100).toFixed(0)}%`;
          const confidenceResult = fitText(confidenceText, debugAvailableWidth, 10);
          const confidenceColor = confidence > 0.7 ? 'rgba(52, 199, 89, 0.8)' : 
                                 confidence > 0.5 ? 'rgba(255, 204, 0, 0.8)' : 'rgba(255, 59, 48, 0.8)';
          
          ctx.font = `${confidenceResult.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = confidenceColor;
          ctx.fillText(confidenceResult.text, textStartX, currentY);
        }
      }
      
      // Draw extremely subtle confidence indicator in bottom right corner
      if (confidence > 0) {
        const dotColor = confidence > 0.7 ? 'rgba(52, 199, 89, 0.1)' : confidence > 0.5 ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 69, 58, 0.1)';
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(finalOverlayX + overlayWidth - 4, finalOverlayY + overlayHeight - 4, 1, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw extremely subtle connection line from bottom right corner
      if (recognizedNow) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.3;
        ctx.setLineDash([1, 3]);
        ctx.beginPath();
        ctx.moveTo(finalOverlayX + overlayWidth - 4, finalOverlayY + overlayHeight - 4);
        ctx.lineTo(faceCenterX, scaledY1);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }, [detections, trackLabels, getPersonDataFromCache]);

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

  // Update detection context whenever detections or trackLabels change
  useEffect(() => {
    updateDetections(detections, trackLabels);
  }, [detections, trackLabels, updateDetections]);

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
              className="w-full h-full object-cover rounded-lg"
              onLoad={handleImageLoad}
              onError={() => setError('Failed to load video frame')}
            />
            
            {/* Overlay canvas for glass overlays */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg"
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
        <div className="absolute top-2 left-2">
          <div className="bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
            <p className="text-white/70 text-xs">
              🎥 {connectionMethod.toUpperCase()} | {frameCount} | {detections.length} face{detections.length !== 1 ? 's' : ''}
              {isConnecting && ' | Connecting...'}
            </p>
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

      {/* Debug panel hidden - confidence scores now shown in glass design above heads */}
    </div>
  );
};

export default WebcamFaceRecognition;
