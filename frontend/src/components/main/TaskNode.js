import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import {
  PlayIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { getActionType } from './ActionTypes';

const TaskNode = memo(({ data, selected }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState(data.config || {});

  const getTaskIcon = (type) => {
    const actionType = getActionType(type);
    if (actionType) {
      const IconComponent = actionType.icon;
      return <IconComponent className="w-4 h-4" />;
    }
    return <div className="w-4 h-4 bg-gray-300 rounded"></div>;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'border-green-500 bg-green-50';
      case 'failed': return 'border-red-500 bg-red-50';
      case 'executing': return 'border-yellow-500 bg-yellow-50 animate-pulse';
      case 'pending': return 'border-gray-300 bg-white';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckIcon className="w-3 h-3 text-green-600" />;
      case 'failed': return <ExclamationTriangleIcon className="w-3 h-3 text-red-600" />;
      case 'executing': return <div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />;
      default: return null;
    }
  };

  const handleConfigSave = () => {
    data.onConfigUpdate?.(tempConfig);
    setShowConfig(false);
  };

  const handleConfigCancel = () => {
    setTempConfig(data.config || {});
    setShowConfig(false);
  };

  return (
    <div className={`relative min-w-48 max-w-56 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 !bg-gray-400 border border-white"
      />

      <div className={`border-2 rounded-lg p-3 shadow-sm ${getStatusColor(data.status)}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1 rounded ${
              data.status === 'completed' ? 'bg-green-100 text-green-600' :
              data.status === 'failed' ? 'bg-red-100 text-red-600' :
              data.status === 'executing' ? 'bg-yellow-100 text-yellow-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {getTaskIcon(data.type)}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-xs text-gray-900 truncate">{data.title}</h3>
              <p className="text-xs text-gray-500 truncate">{data.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5">
            {getStatusIcon(data.status)}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Cog6ToothIcon className="w-3 h-3" />
            </button>
            {data.isNew && (
              <button
                onClick={() => data.onDelete?.(data.id)}
                className="p-0.5 text-red-400 hover:text-red-600 transition-colors text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Priority and Time */}
        <div className="flex gap-1 mb-2">
          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
            data.priority === 'high' ? 'bg-red-100 text-red-800' :
            data.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {data.priority || 'med'}
          </span>
          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
            {data.estimatedTime || '1m'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          {data.status === 'pending' && (
            <button
              onClick={() => data.onExecute?.(data)}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              <PlayIcon className="w-2 h-2" />
              Run
            </button>
          )}
          
          {data.status === 'failed' && (
            <button
              onClick={() => data.onRetry?.(data)}
              className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              <ArrowPathIcon className="w-2 h-2" />
              Retry
            </button>
          )}

          {data.status === 'completed' && data.completedAt && (
            <div className="text-xs text-green-600">
              ✓ {new Date(data.completedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Error Message */}
        {data.status === 'failed' && data.error && (
          <div className="mt-2 p-1.5 bg-red-100 border border-red-200 rounded text-xs text-red-800">
            {data.error}
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Task Configuration</h4>
            <button
              onClick={handleConfigCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            {Object.entries(tempConfig).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                </label>
                {key === 'message' || key === 'notes' ? (
                  <textarea
                    value={value}
                    onChange={(e) => setTempConfig(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setTempConfig(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleConfigSave}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleConfigCancel}
              className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 !bg-gray-400 border border-white"
      />
    </div>
  );
});

export default TaskNode;