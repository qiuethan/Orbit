'use client';

import { useState, useEffect } from 'react';
import useWebSocket from '../../hooks/useWebSocket';

const WebSocketFeed = () => {
  const [messages, setMessages] = useState([]);
  const [isPaused, setIsPaused] = useState(false);

  const {
    data,
    readyState,
    connectionError,
    reconnectCount,
    sendMessage,
    connect,
    disconnect,
    reconnect,
    isConnecting,
    isOpen,
    isClosed
  } = useWebSocket('ws://127.0.0.1:8000/ws', {
    onMessage: (data, event) => {
      if (!isPaused) {
        setMessages(prev => [
          ...prev.slice(-99), // Keep only last 100 messages
          {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            data: data,
            raw: event.data
          }
        ]);
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
    onOpen: () => {
      console.log('WebSocket connection established');
    },
    onClose: (event) => {
      console.log('WebSocket connection closed');
    },
    reconnectInterval: 3000,
    maxReconnectAttempts: 5
  });

  const clearMessages = () => {
    setMessages([]);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleSendTestMessage = () => {
    const testMessage = {
      type: 'ping',
      timestamp: new Date().toISOString(),
      message: 'Hello from frontend'
    };
    sendMessage(testMessage);
  };

  const getStatusColor = () => {
    if (isConnecting) return 'bg-yellow-500';
    if (isOpen) return 'bg-green-500';
    if (isClosed || connectionError) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isOpen) return 'Connected';
    if (isClosed) return 'Disconnected';
    if (connectionError) return 'Error';
    return 'Unknown';
  };

  const formatData = (data) => {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return data;
  };

  return (
    <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">WebSocket Feed</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm text-gray-600">{getStatusText()}</span>
            {reconnectCount > 0 && (
              <span className="text-xs text-yellow-600">
                (Reconnect attempts: {reconnectCount})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={togglePause}
            className={`px-3 py-1 rounded text-sm font-medium ${
              isPaused 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          
          <button
            onClick={clearMessages}
            className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Clear
          </button>

          {isOpen && (
            <button
              onClick={handleSendTestMessage}
              className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              Test Send
            </button>
          )}

          {isClosed && (
            <button
              onClick={reconnect}
              className="px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700">
            Connection Error: {connectionError.message || 'Unknown error'}
          </p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages received yet</p>
            {!isOpen && (
              <p className="text-sm mt-2">
                {isConnecting ? 'Connecting to WebSocket...' : 'WebSocket not connected'}
              </p>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="border border-gray-200 rounded-lg p-3 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-xs text-gray-400">
                  ID: {message.id.toString().slice(-8)}
                </span>
              </div>
              
              <div className="space-y-2">
                {/* Formatted Data */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Parsed Data:
                  </label>
                  <pre className="text-sm bg-white p-2 rounded border overflow-auto max-h-40">
                    {formatData(message.data)}
                  </pre>
                </div>

                {/* Raw Data (if different) */}
                {message.raw !== JSON.stringify(message.data) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Raw Data:
                    </label>
                    <pre className="text-sm bg-gray-100 p-2 rounded border overflow-auto max-h-20">
                      {message.raw}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Messages: {messages.length}</span>
          <span>
            Status: {isPaused ? 'Paused' : 'Active'} | 
            WebSocket: ws://127.0.0.1:8000/ws
          </span>
        </div>
      </div>
    </div>
  );
};

export default WebSocketFeed;
