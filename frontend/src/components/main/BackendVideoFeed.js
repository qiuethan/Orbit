'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import PersonOverlay from './PersonOverlay';
import { peopleApi } from '../../data/people';

const BackendVideoFeed = () => {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState(null);
  const [frameUrl, setFrameUrl] = useState('');
  const videoRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const isRequestingFrame = useRef(false);

  // Person overlay state
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayPerson, setOverlayPerson] = useState(null);
  const [overlayPosition, setOverlayPosition] = useState({ x: 300, y: 200 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);
  const analysisIntervalRef = useRef(null);

  // API functions for video control
  const videoAPI = {
    async start() {
      const response = await fetch('http://localhost:8000/video/start');
      return response.json();
    },
    
    async stop() {
      const response = await fetch('http://localhost:8000/video/stop');
      return response.json();
    },
    
    async status() {
      const response = await fetch('http://localhost:8000/video/status');
      return response.json();
    },

    async captureAndAnalyze() {
      const response = await fetch('http://localhost:8000/video/capture', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
  };

  // Function to find person in database based on analysis results
  const findPersonFromAnalysis = async (analysisResults) => {
    try {
      // Get all people from the database
      const allPeople = await peopleApi.getPeople();
      
      // Check if we have LLM analysis with structured data
      const llmAnalysis = analysisResults?.llm_analysis;
      const structuredData = llmAnalysis?.structured_data;
      
      if (structuredData && structuredData.name) {
        // Try to find person by name
        const foundPerson = allPeople.find(person => 
          person.name.toLowerCase().includes(structuredData.name.toLowerCase()) ||
          structuredData.name.toLowerCase().includes(person.name.toLowerCase())
        );
        
        if (foundPerson) {
          return foundPerson;
        }
      }

      // If no structured data or name match, try to match by company or email
      if (structuredData) {
        const foundByCompany = allPeople.find(person => {
          if (structuredData.company && person.company) {
            return person.company.toLowerCase().includes(structuredData.company.toLowerCase()) ||
                   structuredData.company.toLowerCase().includes(person.company.toLowerCase());
          }
          return false;
        });

        if (foundByCompany) {
          return foundByCompany;
        }
      }

      // Fallback: return first person for demo purposes
      return allPeople[0] || null;
    } catch (error) {
      console.error('Error finding person:', error);
      return null;
    }
  };

  // Function to trigger face analysis
  const triggerFaceAnalysis = useCallback(async () => {
    if (isAnalyzing || !isStreamActive) return;
    
    const now = Date.now();
    // Limit analysis to once every 3 seconds to avoid spam
    if (now - lastAnalysisTime < 3000) return;

    try {
      setIsAnalyzing(true);
      setLastAnalysisTime(now);
      
      // Show loading overlay
      setShowOverlay(true);
      setOverlayPerson(null);
      
      console.log('🔍 Triggering face analysis...');
      const results = await videoAPI.captureAndAnalyze();
      
      console.log('📊 Analysis results:', results);
      
      // Try to find matching person in our database
      const matchedPerson = await findPersonFromAnalysis(results);
      
      if (matchedPerson) {
        console.log('✅ Found matching person:', matchedPerson.name);
        setOverlayPerson(matchedPerson);
        
        // Auto-hide overlay after 8 seconds
        setTimeout(() => {
          setShowOverlay(false);
        }, 8000);
      } else {
        console.log('❌ No matching person found');
        // Show "no match" state briefly
        setTimeout(() => {
          setShowOverlay(false);
        }, 3000);
      }
      
    } catch (error) {
      console.error('Face analysis failed:', error);
      setShowOverlay(false);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, isStreamActive, lastAnalysisTime]);

  // Function to refresh frame with proper rate limiting
  const refreshFrame = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isRequestingFrame.current || !isStreamActive) {
      return;
    }
    
    isRequestingFrame.current = true;
    
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `http://localhost:8000/video/frame?t=${timestamp}`;
      
      // Add timeout and abort controller to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // Direct fetch approach - simpler and more reliable
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Create blob URL for the image
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        
        // Update frame URL
        setFrameUrl(imageUrl);
        setError(null);
        
        // Clean up previous blob URL to prevent memory leaks
        setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
      } else if (response.status === 400) {
        // Camera stopped - try to restart it (with rate limiting)
        console.log('Camera stopped, attempting restart...');
        setError('Camera disconnected, restarting...');
        
        // Clear current interval
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
        }
        
        // Try to restart video after a longer delay to prevent spam
        setTimeout(async () => {
          try {
            const startResult = await videoAPI.start();
            if (startResult.status === 'started') {
              setIsStreamActive(true);
              frameIntervalRef.current = setInterval(refreshFrame, 200); // 5 FPS
              setError(null);
            }
          } catch (restartErr) {
            setError('Failed to restart camera');
            // Stop trying if restart fails
            setIsStreamActive(false);
          }
        }, 5000); // Wait 5 seconds before restart attempt
      } else {
        setError('Failed to fetch video frame');
        // If we get too many errors, stop the stream
        if (response.status >= 500) {
          console.warn('Server error, stopping video stream');
          setIsStreamActive(false);
        }
      }
      
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('Frame request timed out');
      } else {
        console.error('Frame request failed:', err);
      }
      setError('Frame request failed');
    } finally {
      // Always release the lock
      isRequestingFrame.current = false;
    }
  }, [isStreamActive]);

  // Start video stream
  const startVideo = async () => {
    try {
      setError(null);
      
      // Clear any existing interval first
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      
      const result = await videoAPI.start();
      
      if (result.status === 'started') {
        setIsStreamActive(true);
        
        // Start refreshing frames at 5 FPS to reduce server load
        frameIntervalRef.current = setInterval(refreshFrame, 200); // 5 FPS
        refreshFrame(); // Initial frame
      } else {
        setError('Failed to start video stream');
      }
    } catch (err) {
      console.error('Error starting video:', err);
      setError(`Failed to start video: ${err.message}`);
    }
  };

  // Stop video stream
  const stopVideo = async () => {
    try {
      const result = await videoAPI.stop();
      setIsStreamActive(false);
      setFrameUrl('');
      
      // Clear the frame refresh interval
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }

      // Clear analysis interval and hide overlay
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
      setShowOverlay(false);
    } catch (err) {
      console.error('Error stopping video:', err);
      setError(`Failed to stop video: ${err.message}`);
    }
  };

  // Handle click on video to trigger analysis
  const handleVideoClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Update overlay position to click location
    setOverlayPosition({ 
      x: rect.left + x, 
      y: rect.top + y 
    });
    
    // Trigger face analysis
    triggerFaceAnalysis();
  };

  // Close overlay handler
  const handleCloseOverlay = () => {
    setShowOverlay(false);
    setOverlayPerson(null);
  };


  // Auto-start camera on mount
  useEffect(() => {
    const autoStartCamera = async () => {
      try {
        const status = await videoAPI.status();
        if (status.active) {
          // Already active, just start frame refresh
          setIsStreamActive(true);
          
          // Clear any existing interval first
          if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
          }
          
          frameIntervalRef.current = setInterval(refreshFrame, 200); // 5 FPS
          refreshFrame(); // Initial frame
        } else {
          // Not active, start it automatically
          console.log('Auto-starting camera...');
          await startVideo();
        }
      } catch (err) {
        console.log('Backend not available, trying to start camera...');
        // Try to start even if status check failed
        try {
          await startVideo();
        } catch (startErr) {
          console.log('Failed to auto-start camera');
        }
      }
    };
    
    autoStartCamera();

    // Cleanup on unmount
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
      // Don't auto-stop video on unmount - keep it running
    };
  }, [refreshFrame, startVideo]);

  return (
    <div className="relative w-full h-full bg-black">
      <img
        ref={videoRef}
        src={frameUrl}
        alt="Video stream"
        className="w-full h-full object-cover cursor-crosshair"
        style={{ display: isStreamActive && frameUrl ? 'block' : 'none' }}
        onError={() => setError('Failed to load video stream')}
        onLoad={() => setError(null)}
        onClick={handleVideoClick}
      />
      
      {(!isStreamActive || !frameUrl) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <button
              onClick={startVideo}
              className="px-8 py-4 bg-white bg-opacity-20 text-white text-xl rounded-lg hover:bg-opacity-30 transition-colors backdrop-blur-sm"
            >
              Start Camera
            </button>
            {isStreamActive && (
              <p className="text-white/60 text-sm mt-4">
                Click anywhere on the video to analyze faces
              </p>
            )}
          </div>
        </div>
      )}

      {/* Analysis Button - Fixed Position */}
      {isStreamActive && frameUrl && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={triggerFaceAnalysis}
            disabled={isAnalyzing}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm border ${
              isAnalyzing 
                ? 'bg-gray-500/20 border-gray-500/30 cursor-not-allowed' 
                : 'bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Face'}
          </button>
        </div>
      )}

      {/* Instruction Text */}
      {isStreamActive && frameUrl && !showOverlay && (
        <div className="absolute top-4 left-4">
          <p className="text-white/80 text-sm bg-black/40 px-3 py-2 rounded-lg backdrop-blur-sm">
            💡 Click on a face to identify the person
          </p>
        </div>
      )}

      {/* Person Overlay */}
      <PersonOverlay
        isVisible={showOverlay}
        personData={overlayPerson}
        position={overlayPosition}
        onClose={handleCloseOverlay}
        isLoading={isAnalyzing}
      />
    </div>
  );
};

export default BackendVideoFeed;
