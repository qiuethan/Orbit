import React, { useState } from 'react';
import { 
  PhoneIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const PhoneTask = ({ task, onUpdate, onExecute, onReject, isExecuting }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(task.config);

  const handleSave = () => {
    onUpdate(task.id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(task.config);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      {/* Task Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-50 rounded-md">
            <PhoneIcon className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
            <p className="text-xs text-gray-600">{task.description}</p>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 text-xs rounded-full shrink-0 ${
          task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
          task.priority === 'medium' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {task.priority}
        </span>
      </div>

      {/* Phone Form */}
      <div className="bg-gray-50 rounded-md p-2 mb-3">
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number:</label>
            <input
              type="tel"
              value={formData.recipient}
              onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 disabled:bg-gray-100"
              placeholder="+1-555-123-4567"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Call Script / Message:</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              disabled={!isEditing}
              rows={6}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 disabled:bg-gray-100 resize-none"
              placeholder="What to say during the call..."
            />
          </div>
          {/* Estimated Call Duration */}
          {task.estimatedTime && (
            <div className="text-xs text-gray-600 bg-white rounded-md p-2 border">
              <span className="font-medium">Estimated Duration:</span> {task.estimatedTime}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1">
        {!isEditing ? (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
            >
              <PencilIcon className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => onExecute(task.id, 'phone', formData)}
              disabled={isExecuting}
              className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PhoneIcon className="w-3 h-3" />
              {isExecuting ? 'Calling...' : 'Make Call'}
            </button>
            <button
              onClick={() => onReject(task.id)}
              className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              <XMarkIcon className="w-3 h-3" />
              Reject
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
            >
              <CheckIcon className="w-3 h-3" />
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
            >
              <XMarkIcon className="w-3 h-3" />
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PhoneTask;