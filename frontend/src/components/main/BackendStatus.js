'use client';

import { useState, useEffect } from 'react';
import { faceAnalysisAPI } from '../../utils/api';

const BackendStatus = () => {
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);

  const checkBackendStatus = async () => {
    setStatus('checking');
    setError(null);
    
    try {
      const health = await faceAnalysisAPI.health();
      if (health.status === 'ok') {
        setStatus('connected');
      } else {
        setStatus('error');
        setError('Backend returned unexpected status');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Backend connection failed');
    }
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'checking': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'checking':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Backend Connected';
      case 'error': return 'Backend Error';
      case 'checking': return 'Checking...';
      default: return 'Unknown Status';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Backend Status</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {status === 'connected' && (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
            ✅ Backend is running on localhost:8000
            <br />
            ✅ Face analysis API is available
          </div>
        )}

        {status === 'error' && (
          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
            <strong>Troubleshooting:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Ensure backend server is running on port 8000</li>
              <li>Check that all Python dependencies are installed</li>
              <li>Verify API keys are configured in backend/.env</li>
              <li>Check browser console for CORS errors</li>
            </ul>
          </div>
        )}

        <button
          onClick={checkBackendStatus}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Test Connection
        </button>

        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>Backend URL:</strong> http://localhost:8000</div>
          <div><strong>Health Endpoint:</strong> GET /health</div>
          <div><strong>Analysis Endpoint:</strong> POST /analyze</div>
        </div>
      </div>
    </div>
  );
};

export default BackendStatus;
