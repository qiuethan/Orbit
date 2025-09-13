'use client';

import { useApp } from '../../context/AppContext';

const WebSocketStatus = () => {
  const { wsStatus, isWebSocketConnected } = useApp();

  const getStatusColor = () => {
    switch (wsStatus) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-red-500';
      case 'disabled': return 'bg-gray-400';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = () => {
    switch (wsStatus) {
      case 'connected': return 'WebSocket Connected';
      case 'disconnected': return 'WebSocket Disconnected';
      case 'error': return 'WebSocket Error';
      case 'disabled': return 'WebSocket Disabled';
      default: return 'WebSocket Connecting...';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
      <span>{getStatusText()}</span>
    </div>
  );
};

export default WebSocketStatus;
