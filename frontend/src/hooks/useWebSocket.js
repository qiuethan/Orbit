'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, options = {}) => {
  const {
    reconnectInterval = 10000, // Increase interval to reduce noise
    maxReconnectAttempts = 3, // Reduce attempts to fail faster
    onMessage = null,
    onError = null,
    onOpen = null,
    onClose = null,
    autoConnect = true
  } = options;

  const [data, setData] = useState(null);
  const [readyState, setReadyState] = useState(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        return;
      }

      console.log(`Connecting to WebSocket: ${url}`);
      ws.current = new WebSocket(url);

      ws.current.onopen = (event) => {
        console.log('WebSocket connected');
        setReadyState(WebSocket.OPEN);
        setConnectionError(null);
        setReconnectCount(0);
        onOpen?.(event);
      };

      ws.current.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
          setLastMessage(event);
          onMessage?.(parsedData, event);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setData(event.data);
          setLastMessage(event);
          onMessage?.(event.data, event);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError(error);
        onError?.(error);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setReadyState(WebSocket.CLOSED);
        onClose?.(event);

        if (shouldReconnect.current && 
            event.code !== 1000 && 
            reconnectCount < maxReconnectAttempts) {
          
          console.log(`Attempting to reconnect in ${reconnectInterval}ms... (attempt ${reconnectCount + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeout.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      setReadyState(WebSocket.CONNECTING);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError(error);
      setReadyState(WebSocket.CLOSED);
    }
  }, [url, reconnectInterval, maxReconnectAttempts, onMessage, onError, onOpen, onClose, reconnectCount]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
      ws.current.send(messageToSend);
      return true;
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
      return false;
    }
  }, []);

  const reconnect = useCallback(() => {
    shouldReconnect.current = true;
    setReconnectCount(0);
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  useEffect(() => {
    if (autoConnect) {
      shouldReconnect.current = true;
      connect();
    }

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url, autoConnect, connect]);

  return {
    data,
    lastMessage,
    readyState,
    connectionError,
    reconnectCount,
    sendMessage,
    connect,
    disconnect,
    reconnect,
    isConnecting: readyState === WebSocket.CONNECTING,
    isOpen: readyState === WebSocket.OPEN,
    isClosing: readyState === WebSocket.CLOSING,
    isClosed: readyState === WebSocket.CLOSED
  };
};

export default useWebSocket;