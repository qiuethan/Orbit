'use client';

import { useState, useEffect } from 'react';
import { peopleApi } from '../../data/people';

const PersonOverlay = ({ isVisible, personData, position, onClose, isLoading }) => {
  const [animationClass, setAnimationClass] = useState('');
  const [displayedPerson, setDisplayedPerson] = useState(null);

  useEffect(() => {
    if (isVisible) {
      setAnimationClass('animate-overlay-in');
    } else {
      setAnimationClass('animate-overlay-out');
    }
  }, [isVisible]);

  useEffect(() => {
    if (personData && !isLoading) {
      setDisplayedPerson(personData);
    }
  }, [personData, isLoading]);

  const getStatusBadgeColor = (status) => {
    const colors = {
      cold_lead: 'bg-blue-500/20 text-blue-300 border-blue-300/30',
      warm_lead: 'bg-yellow-500/20 text-yellow-300 border-yellow-300/30',
      hot_lead: 'bg-red-500/20 text-red-300 border-red-300/30',
      client: 'bg-green-500/20 text-green-300 border-green-300/30',
      archived: 'bg-gray-500/20 text-gray-300 border-gray-300/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300 border-gray-300/30';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-green-300',
      medium: 'text-yellow-300', 
      high: 'text-red-300'
    };
    return colors[priority] || 'text-gray-300';
  };

  if (!isVisible && animationClass !== 'animate-overlay-out') return null;

  const overlayPosition = position || { x: 50, y: 50 };

  return (
    <div
      className={`fixed z-50 ${animationClass}`}
      style={{
        left: `${overlayPosition.x}px`,
        bottom: `${window.innerHeight - overlayPosition.y + 10}px`, // Position above the clicked point
        transform: 'translateX(-50%)'
      }}
    >
      {/* Apple Liquid Glass Overlay - Compact Card */}
      <div className="relative">
        {/* Main Glass Container - Much smaller */}
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-3 min-w-[200px] max-w-[250px] shadow-2xl">
          
          {/* Glass Reflection Effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
          
          {/* Close Button - Smaller */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm hover:bg-white/30 transition-all duration-200 flex items-center justify-center group"
          >
            <svg className="w-3 h-3 text-white/80 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Loading State - Compact */}
          {isLoading && (
            <div className="flex items-center space-x-3 py-2">
              <div className="relative w-8 h-8">
                {/* Animated Loading Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-white/20"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/60 animate-spin"></div>
              </div>
              
              <div>
                <h3 className="text-white/90 text-sm font-medium">Analyzing...</h3>
                <div className="flex space-x-1 mt-1">
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Person Information - Compact */}
          {!isLoading && displayedPerson && (
            <div className="flex items-center space-x-3">
              {/* Avatar - Smaller */}
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 overflow-hidden">
                  {displayedPerson.avatar ? (
                    <img 
                      src={displayedPerson.avatar} 
                      alt={displayedPerson.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-semibold">
                      {displayedPerson.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                
                {/* Status Indicator - Smaller */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 border border-white/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
              </div>

              {/* Basic Info Only */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white/95 text-sm font-semibold truncate">
                  {displayedPerson.name || 'Unknown'}
                </h3>
                <p className="text-white/70 text-xs truncate">
                  {displayedPerson.title || displayedPerson.company || 'No details'}
                </p>
                {/* Status Badge - Small */}
                {displayedPerson.status && (
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${getStatusBadgeColor(displayedPerson.status)}`}>
                    {displayedPerson.status.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* No Person Found State - Compact */}
          {!isLoading && !displayedPerson && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white/80 text-sm font-medium">Unknown</h3>
                <p className="text-white/60 text-xs">Not in database</p>
              </div>
            </div>
          )}
        </div>

        {/* Glow Effect - Smaller */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-pink-400/10 blur-lg -z-10 animate-pulse"></div>
        
        {/* Pointer Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
          <div className="w-3 h-3 bg-white/10 border-r border-b border-white/20 rotate-45 backdrop-blur-xl"></div>
        </div>
      </div>
    </div>
  );
};

export default PersonOverlay;
