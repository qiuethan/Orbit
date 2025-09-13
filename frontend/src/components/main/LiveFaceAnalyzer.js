'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { faceAnalysisAPI, peopleAPI } from '../../utils/api';

const LiveFaceAnalyzer = ({ onPersonAdded }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);

  // Start webcam stream
  const startCamera = useCallback(async () => {
    setError(null);
    
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access not supported in this browser. Please use Chrome, Firefox, or Safari.');
      return;
    }

    try {
      console.log('Requesting camera access...');
      
      // Check for existing permissions first
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' });
          console.log('Camera permission status:', permission.state);
          
          if (permission.state === 'denied') {
            setError('Camera access denied. Please enable camera permissions in your browser settings.');
            return;
          }
        } catch (permErr) {
          console.log('Permission query not supported, proceeding with request...');
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      });
      
      console.log('Camera stream obtained:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load metadata
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          setIsStreamActive(true);
          setError(null);
        };
        
        // Handle play promise
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(playErr => {
            console.error('Video play error:', playErr);
            setError('Failed to start video playback. Please try again.');
          });
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        constraint: err.constraint
      });
      
      let errorMessage = 'Unable to access camera. ';
      
      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          errorMessage += 'Please allow camera access when prompted, or enable it in browser settings.';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          errorMessage += 'No camera found. Please connect a camera and try again.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          errorMessage += 'Camera is already in use by another application.';
          break;
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
          errorMessage += 'Camera does not support the required settings.';
          break;
        case 'NotSupportedError':
          errorMessage += 'Camera access not supported in this browser.';
          break;
        case 'SecurityError':
          errorMessage += 'Camera access blocked due to security settings. Make sure you\'re using HTTPS or localhost.';
          break;
        default:
          errorMessage += `${err.message || 'Unknown error occurred.'}`;
      }
      
      setError(errorMessage);
    }
  }, []);

  // Stop webcam stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreamActive(false);
  }, []);

  // Capture frame from video
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  }, []);

  // Capture and analyze face
  const captureAndAnalyze = useCallback(async () => {
    if (!isStreamActive || isAnalyzing) return;

    // Start countdown
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Wait for countdown to finish
    setTimeout(async () => {
      try {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        // Capture frame
        const blob = await captureFrame();
        if (!blob) {
          throw new Error('Failed to capture image from camera');
        }

        // Create file object
        const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
        setCapturedImage(URL.createObjectURL(blob));

        // Analyze with backend
        const analysisResult = await faceAnalysisAPI.analyze(file);
        setResult(analysisResult);

        // If analysis successful, create person
        if (analysisResult.success && analysisResult.llm_analysis?.structured_data) {
          try {
            const newPerson = await peopleAPI.addPersonFromAnalysis(analysisResult);
            if (onPersonAdded) {
              onPersonAdded(newPerson);
            }
          } catch (personError) {
            console.error('Error creating person from analysis:', personError);
          }
        }

      } catch (err) {
        console.error('Face analysis error:', err);
        setError(err.message || 'Analysis failed. Please try again.');
      } finally {
        setIsAnalyzing(false);
      }
    }, 3000);
  }, [isStreamActive, isAnalyzing, captureFrame, onPersonAdded]);

  // Reset analysis
  const resetAnalysis = useCallback(() => {
    setResult(null);
    setError(null);
    setCapturedImage(null);
    setCountdown(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [stopCamera, capturedImage]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Live Face Analysis</h3>
      <p className="text-sm text-gray-600 mb-6">
        Use your webcam to capture and analyze faces in real-time.
      </p>

      <div className="space-y-6">
        {/* Camera Controls */}
        <div className="space-y-4">
          <div className="flex space-x-3">
            {!isStreamActive ? (
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Start Camera
              </button>
            ) : (
            <>
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop Camera
              </button>
              <button
                onClick={captureAndAnalyze}
                disabled={isAnalyzing || countdown > 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `Capturing in ${countdown}...` : isAnalyzing ? 'Analyzing...' : 'Capture & Analyze'}
              </button>
              {result && (
                <button
                  onClick={resetAnalysis}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              )}
            </>
          )}
          </div>
          
          {/* Camera Debug Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <div><strong>Browser Support:</strong> {navigator.mediaDevices ? '✅ Supported' : '❌ Not Supported'}</div>
            <div><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
            <div><strong>Protocol:</strong> {typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</div>
            <div><strong>Stream Active:</strong> {isStreamActive ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>

        {/* Video Feed */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Live Video */}
            <div className="relative">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Live Feed</h4>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-6xl font-bold animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}
                {isAnalyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <div>Analyzing...</div>
                    </div>
                  </div>
                )}
                {!isStreamActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <div>Camera off</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Captured Image */}
            <div className="relative">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Captured Frame</h4>
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Captured frame"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>No capture yet</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hidden canvas for capturing frames */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            {result.success && result.llm_analysis?.structured_data ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-green-800">Person Identified!</h4>
                    <div className="mt-2 text-sm text-green-700">
                      <p><strong>Name:</strong> {result.llm_analysis.structured_data.personal_info?.full_name || 'Unknown'}</p>
                      <p><strong>Position:</strong> {result.llm_analysis.structured_data.professional_info?.current_position || 'Unknown'}</p>
                      <p><strong>Company:</strong> {result.llm_analysis.structured_data.professional_info?.company || 'Unknown'}</p>
                      <p><strong>Confidence:</strong> {result.llm_analysis.structured_data.confidence_level || 'Unknown'}</p>
                    </div>
                    <p className="mt-2 text-xs text-green-600">Person has been added to your network!</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">Analysis Incomplete</h4>
                    <p className="mt-1 text-sm text-yellow-700">
                      The image was captured but no person was identified.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            {result.summary && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Analysis Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Face matches:</span>
                    <span className="ml-2 font-medium">{result.summary.face_matches || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Web mentions:</span>
                    <span className="ml-2 font-medium">{result.summary.total_mentions || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">URLs found:</span>
                    <span className="ml-2 font-medium">{result.summary.urls_with_mentions || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pages scraped:</span>
                    <span className="ml-2 font-medium">{result.summary.scraped_pages || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Click "Start Camera" to begin video feed</li>
            <li>2. Position yourself clearly in the camera view</li>
            <li>3. Click "Capture & Analyze" to take a photo and analyze</li>
            <li>4. Wait for AI analysis and automatic person addition</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default LiveFaceAnalyzer;
