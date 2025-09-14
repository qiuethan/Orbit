'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DetectionContext = createContext();

export const useDetection = () => {
  const context = useContext(DetectionContext);
  if (!context) {
    throw new Error('useDetection must be used within a DetectionProvider');
  }
  return context;
};

export function DetectionProvider({ children }) {
  const [detectedPeople, setDetectedPeople] = useState([]);
  const [trackLabels, setTrackLabels] = useState({});
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [lastDetectedCount, setLastDetectedCount] = useState(0);
  const [isVisionPage, setIsVisionPage] = useState(false);

  // Track page changes and reset detection state when leaving vision page
  useEffect(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const currentlyOnVisionPage = currentPath === '/vision';
    
    if (currentlyOnVisionPage !== isVisionPage) {
      setIsVisionPage(currentlyOnVisionPage);
      
      // If leaving vision page, reset detection state
      if (!currentlyOnVisionPage) {
        setDetectedPeople([]);
        setTrackLabels({});
        setSidebarLoading(false);
        setLastDetectedCount(0);
        console.log('Left vision page - reset detection state');
      } else {
        console.log('Entered vision page');
      }
    }
  }, [typeof window !== 'undefined' ? window.location.pathname : '', isVisionPage]);

  const updateDetections = (detections, labels) => {
    const now = Date.now();
    
    // Debounce updates to prevent flashing - only update every 500ms
    if (now - lastUpdateTime < 500) {
      return;
    }
    
    setLastUpdateTime(now);
    
    // Always update the detection data (for overlay display)
    setDetectedPeople(detections);
    setTrackLabels(labels);
    
    // Only process sidebar filtering if we're on the vision page
    const currentlyOnVisionPage = typeof window !== 'undefined' && window.location.pathname === '/vision';
    if (currentlyOnVisionPage) {
      // Only show loading if the number of detected people actually changed
      const currentDetectedCount = detections.filter(d => d.recognized && d.name).length;
      
      // Only trigger sidebar loading on vision page
      if (currentDetectedCount !== lastDetectedCount && currentDetectedCount > 0) {
        setSidebarLoading(true);
        setTimeout(() => {
          setSidebarLoading(false);
        }, 2000 + Math.random() * 2000); // 2-4 second random delay
      }
      
      setLastDetectedCount(currentDetectedCount);
    }
  };

  // Extract unique person names from detections with memoization
  const getDetectedPersonNames = useCallback(() => {
    const names = new Set();
    detectedPeople.forEach(detection => {
      const tid = detection.track_id;
      const tracked = trackLabels[tid];
      if (tracked && tracked.label && tracked.recognized) {
        names.add(tracked.label);
      } else if (detection.recognized && detection.name) {
        names.add(detection.name);
      }
    });
    return Array.from(names).sort(); // Sort for consistent ordering
  }, [detectedPeople, trackLabels]);

  return (
    <DetectionContext.Provider value={{
      detectedPeople,
      trackLabels,
      sidebarLoading,
      updateDetections,
      getDetectedPersonNames
    }}>
      {children}
    </DetectionContext.Provider>
  );
}
