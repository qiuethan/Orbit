import React, { useState } from 'react';
import { 
  CalendarIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const CalendarTask = ({ task, onUpdate, onExecute, onReject, isExecuting }) => {
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
          <div className="p-1.5 bg-purple-50 rounded-md">
            <CalendarIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
            <p className="text-xs text-gray-600">{task.description}</p>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 text-xs rounded-full shrink-0 ${
          task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
          task.priority === 'medium' ? 'bg-purple-100 text-purple-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {task.priority}
        </span>
      </div>

      {/* Calendar Form */}
      <div className="bg-gray-50 rounded-md p-2 mb-3">
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Title:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
              placeholder="Meeting title"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={!isEditing}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Time:</label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                disabled={!isEditing}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
                placeholder="2:00 PM"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Duration:</label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
              placeholder="30 minutes"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Attendees:</label>
            <input
              type="text"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
              placeholder="email1@company.com, email2@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes:</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={!isEditing}
              rows={4}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100 resize-none"
              placeholder="Meeting agenda or notes..."
            />
          </div>
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
              onClick={() => onExecute(task.id, 'calendar', formData)}
              disabled={isExecuting}
              className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CalendarIcon className="w-3 h-3" />
              {isExecuting ? 'Scheduling...' : 'Schedule'}
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
              className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
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

      {/* Estimated Time */}
      {task.estimatedTime && (
        <div className="mt-2 text-xs text-gray-500">
          Estimated time: {task.estimatedTime}
        </div>
      )}
    </div>
  );
};

export default CalendarTask;