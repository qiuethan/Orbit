'use client';

import { useState } from 'react';
import { 
  Plus,
  Mail,
  Phone,
  Calendar,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Edit3,
  Send
} from 'lucide-react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const formatDate = (dateString) => {
  if (!dateString) return 'No date set';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays}d`;
  if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function OutreachQueue({ activePerson }) {
  const [newTaskType, setNewTaskType] = useState('email');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledFor: '',
    priority: 'medium'
  });

  // Mock outreach tasks for the active person
  const outreachTasks = activePerson ? [
    {
      id: 1,
      type: 'email',
      title: 'Follow-up on demo request',
      description: 'Send personalized follow-up email after demo discussion',
      priority: 'high',
      status: 'pending',
      scheduledFor: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // tomorrow
      personId: activePerson.id
    },
    {
      id: 2,
      type: 'phone',
      title: 'Discovery call',
      description: 'Schedule 30-min discovery call to understand needs',
      priority: 'medium',
      status: 'pending',
      scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // in 3 days
      personId: activePerson.id
    },
    {
      id: 3,
      type: 'email',
      title: 'Send proposal',
      description: 'Prepare and send detailed proposal based on requirements',
      priority: 'high',
      status: 'completed',
      scheduledFor: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // yesterday
      personId: activePerson.id
    }
  ] : [];

  const getTaskIcon = (type) => {
    const icons = {
      email: Mail,
      phone: Phone,
      calendar: Calendar,
      message: MessageCircle
    };
    const Icon = icons[type] || MessageCircle;
    return <Icon className="w-4 h-4" />;
  };

  const getTaskColor = (type) => {
    const colors = {
      email: 'bg-blue-100 text-blue-700 border-blue-200',
      phone: 'bg-green-100 text-green-700 border-green-200',
      calendar: 'bg-purple-100 text-purple-700 border-purple-200',
      message: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  const handleNewTask = () => {
    if (!activePerson) return;
    
    // In a real app, this would create a new task via API
    console.log('Creating new task:', {
      ...formData,
      type: newTaskType,
      personId: activePerson.id,
      status: 'pending'
    });
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      scheduledFor: '',
      priority: 'medium'
    });
    setShowNewTaskForm(false);
  };

  const handleExecuteTask = (taskId) => {
    // In a real app, this would execute the task
    console.log('Executing task:', taskId);
  };

  if (!activePerson) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Outreach Queue</h2>
          <p className="text-sm text-gray-500 mt-1">Select a contact to manage outreach tasks</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No contact selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Outreach Queue</h2>
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
        <div className="flex items-center gap-2">
          <img 
            src={activePerson.avatar} 
            alt={activePerson.name}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <p className="font-medium text-gray-900">{activePerson.name}</p>
            <p className="text-sm text-gray-500">{activePerson.company}</p>
          </div>
        </div>
      </div>

      {/* New Task Form */}
      {showNewTaskForm && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-3">New Outreach Task</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">Email</option>
                <option value="phone">Phone Call</option>
                <option value="calendar">Meeting</option>
                <option value="message">Message</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="2"
                placeholder="Task description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule For</label>
                <input
                  type="date"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleNewTask}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Task
              </button>
              <button
                onClick={() => setShowNewTaskForm(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {outreachTasks.length === 0 ? (
          <div className="p-6 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No outreach tasks</p>
            <p className="text-sm text-gray-400">Create your first task to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {outreachTasks.map((task) => (
              <div
                key={task.id}
                className={classNames(
                  'p-4 rounded-lg border transition-all',
                  task.status === 'completed' 
                    ? 'bg-green-50 border-green-200' 
                    : task.priority === 'high'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={classNames(
                      'flex items-center justify-center w-8 h-8 rounded-lg border',
                      getTaskColor(task.type)
                    )}>
                      {getTaskIcon(task.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      <p className="text-xs text-gray-500">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {task.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <button
                        onClick={() => handleExecuteTask(task.id)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className={classNames(
                      'font-medium',
                      getPriorityColor(task.priority)
                    )}>
                      {task.priority} priority
                    </span>
                    <span className={classNames(
                      'inline-flex items-center gap-1',
                      task.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                    )}>
                      <Clock className="w-3 h-3" />
                      {formatDate(task.scheduledFor)}
                    </span>
                  </div>
                  <span className={classNames(
                    'px-2 py-1 rounded text-xs font-medium',
                    task.status === 'completed' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  )}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
