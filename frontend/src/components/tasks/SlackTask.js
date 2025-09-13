import React, { useState } from 'react';
import { 
  ChatBubbleLeftIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const SlackTask = ({ task, onUpdate, onExecute, onReject, isExecuting }) => {
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
          <div className="p-1.5 bg-yellow-50 rounded-md">
            <ChatBubbleLeftIcon className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
            <p className="text-xs text-gray-600">{task.description}</p>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 text-xs rounded-full shrink-0 ${
          task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {task.priority}
        </span>
      </div>

      {/* Slack Form */}
      <div className="bg-gray-50 rounded-md p-2 mb-3">
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Channel:</label>
            <input
              type="text"
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-yellow-500 disabled:bg-gray-100"
              placeholder="#general"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message:</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              disabled={!isEditing}
              rows={6}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-yellow-500 disabled:bg-gray-100 resize-none"
              placeholder="Message to send to the channel..."
            />
          </div>
          {/* Message Preview */}
          <div className="bg-white border rounded-md p-2">
            <div className="text-xs text-gray-600 mb-1">Preview:</div>
            <div className="text-xs bg-gray-50 p-2 rounded border-l-2 border-yellow-400 min-h-[60px]">
              <span className="font-medium text-yellow-600">{formData.channel}</span>
              <div className="mt-1 text-gray-700 whitespace-pre-wrap">{formData.message}</div>
            </div>
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
              onClick={() => onExecute(task.id, 'slack', formData)}
              disabled={isExecuting}
              className="flex items-center gap-1 px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChatBubbleLeftIcon className="w-3 h-3" />
              {isExecuting ? 'Sending...' : 'Send Message'}
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
              className="flex items-center gap-1 px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
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

// Demo with sample data
const App = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Team Standup Reminder",
      description: "Send daily standup reminder to the development team",
      priority: "medium",
      estimatedTime: "1 min",
      config: {
        channel: "#dev-team",
        message: "Good morning team! 🌅\n\nDaily standup starts in 15 minutes. Please prepare your updates:\n• What did you work on yesterday?\n• What are you working on today?\n• Any blockers or impediments?\n\nSee you all in the meeting room!"
      }
    }
  ]);

  const [executingTasks, setExecutingTasks] = useState(new Set());

  const handleUpdate = (taskId, newConfig) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, config: newConfig } : task
    ));
  };

  const handleExecute = async (taskId, type, config) => {
    setExecutingTasks(prev => new Set([...prev, taskId]));
    
    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setExecutingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    
    alert(`Task executed successfully!\nChannel: ${config.channel}\nMessage: ${config.message}`);
  };

  const handleReject = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Slack Task Manager</h1>
      <div className="space-y-4">
        {tasks.map(task => (
          <SlackTask
            key={task.id}
            task={task}
            onUpdate={handleUpdate}
            onExecute={handleExecute}
            onReject={handleReject}
            isExecuting={executingTasks.has(task.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default App;