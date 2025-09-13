import React, { useState, useCallback, useEffect } from 'react';
import { 
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Play,
  X,
  Edit3,
  Check,
  AlertTriangle,
  RotateCcw,
  Terminal,
  Activity,
  FileText,
  Bell,
  Cloud,
  Settings,
  HardDrive,
  Save,
  BookOpen, // For Notion icon
  Clock
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';

const TaskQueue = ({ activeWorkflow }) => {
  const [executing, setExecuting] = useState(false);
  const [localConfig, setLocalConfig] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Get data and actions from context
  const {
    workflows,
    getActiveWorkflow,
    executeTask,
    updateTaskConfig,
    updateTaskStatus,
    getPendingTasks,
    getCompletedTasks,
    getFailedTasks
  } = useWorkflow();

  // Try to get active workflow, fallback to first available workflow
  let workflowData = getActiveWorkflow();
  if (!workflowData) {
    const allWorkflows = Object.values(workflows || {});
    workflowData = allWorkflows.length > 0 ? allWorkflows[0] : null;
  }

  const completedTasks = workflowData ? getCompletedTasks(workflowData.id) : [];
  const failedTasks = workflowData ? getFailedTasks(workflowData.id) : [];
  const pendingTasks = workflowData ? getPendingTasks(workflowData.id) : [];
  const currentTask = pendingTasks[0];

  // Load config when task changes
  useEffect(() => {
    if (currentTask?.config) {
      setLocalConfig(currentTask.config);
      setHasUnsavedChanges(false);
    }
  }, [currentTask?.id]);

  // Handle input changes (local only)
  const handleInputChange = useCallback((field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Save changes to context
  const handleSave = useCallback(() => {
    if (!currentTask || !workflowData || !hasUnsavedChanges) return;
    
    updateTaskConfig(workflowData.id, currentTask.id, localConfig);
    setHasUnsavedChanges(false);
  }, [currentTask?.id, workflowData?.id, localConfig, hasUnsavedChanges, updateTaskConfig]);

  // Reset changes
  const handleReset = useCallback(() => {
    if (currentTask?.config) {
      setLocalConfig(currentTask.config);
      setHasUnsavedChanges(false);
    }
  }, [currentTask?.config]);

  // Auto-save on blur for better UX
  const handleBlur = useCallback(() => {
    if (hasUnsavedChanges) {
      handleSave();
    }
  }, [hasUnsavedChanges, handleSave]);

  // Execute task
  const handleExecute = useCallback(async (taskToExecute = currentTask) => {
    if (!taskToExecute || !workflowData) return;
    
    // Auto-save before execution
    if (hasUnsavedChanges && taskToExecute.id === currentTask?.id) {
      handleSave();
    }
    
    setExecuting(true);
    try {
      const configToUse = taskToExecute.id === currentTask?.id ? localConfig : taskToExecute.config;
      await executeTask(workflowData.id, taskToExecute.id, taskToExecute.type, configToUse);
    } catch (error) {
      console.error('Task execution failed:', error);
    } finally {
      setExecuting(false);
    }
  }, [currentTask?.id, executeTask, workflowData?.id, localConfig, hasUnsavedChanges, handleSave]);

  // Handle task retry
  const handleRetry = useCallback((task) => {
    if (!workflowData) return;
    updateTaskStatus(workflowData.id, task.id, 'pending');
    setTimeout(() => handleExecute(task), 100);
  }, [updateTaskStatus, workflowData?.id, handleExecute]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        handleReset();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleReset]);

  if (!workflowData) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Terminal className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 text-lg">No Workflow Selected</h3>
          <p className="text-sm text-gray-600">Select a workflow to view tasks</p>
        </div>
      </div>
    );
  }

  // Get icon for task type
  const getTaskIcon = (type, className = "w-5 h-5") => {
    switch (type) {
      case 'email': 
        return <img src="/icons/gmail.png" className={className} alt="Email" />;
      case 'phone': 
        return <Phone className={className} />;
      case 'calendar': 
        return <img src="/icons/gcal.png" className={className} alt="Calendar" />;
      case 'slack': 
        return <img src="/icons/slack.png" className={className} alt="Slack" />;
      case 'notion':
        return <BookOpen className={className} />; // Using BookOpen as Notion icon
      case 'document': 
        return <FileText className={className} />;
      case 'notification': 
        return <Bell className={className} />;
      case 'api': 
        return <Cloud className={className} />;
      case 'automation': 
        return <Settings className={className} />;
      case 'drive': 
        return <HardDrive className={className} />;
      default: 
        return <div className={`${className} bg-gray-400 rounded`}></div>;
    }
  };

  // Task component
  const TaskCard = ({ task, type, onExecute, onRetry }) => {
    const isCompleted = type === 'completed';
    const isFailed = type === 'failed';
    const isCurrent = type === 'current';

    return (
      <div className={`group relative cursor-pointer transition-all duration-150 hover:bg-gray-50 border-b border-gray-100 ${
        isCompleted ? '' :
        isFailed ? '' :
        isCurrent ? 'bg-blue-50' :
        'opacity-70 hover:opacity-90'
      }`}>
        <div className="px-3 py-2">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-green-100' :
                isFailed ? 'bg-red-100' :
                isCurrent ? 'bg-blue-100' :
                'bg-gray-100'
              }`}>
                {isCompleted ? <Check className="w-4 h-4 text-green-600" /> :
                 isFailed ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
                 getTaskIcon(task.type, "w-4 h-4")}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-medium text-gray-900 text-sm leading-tight truncate">
                  {task.title}
                </h3>
                {isFailed && (
                  <button
                    onClick={() => onRetry(task)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-all duration-150 ml-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-tight mb-1 truncate">
                {task.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                    isCompleted ? 'bg-green-100 text-green-800 border-green-200' :
                    isFailed ? 'bg-red-100 text-red-800 border-red-200' :
                    isCurrent ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {isCompleted ? 'Completed' : isFailed ? 'Failed' : isCurrent ? 'Current' : 'Pending'}
                  </span>
                  {isCompleted && task.completedAt && (
                    <span className="text-xs text-gray-400">
                      {new Date(task.completedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
              {isFailed && task.error && (
                <p className="text-xs text-red-600 mt-1">
                  {task.error}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Show config for current task only */}
        {isCurrent && (
          <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
            {/* Save/Reset Controls */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex-1 text-sm text-amber-800">
                  <span className="font-semibold">Unsaved Changes</span>
                  <span className="text-xs block mt-1 text-amber-700">Press Cmd+S to save or Esc to reset</span>
                </div>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Reset
                </button>
              </div>
            )}

            <div className="space-y-3 mb-4">
              {Object.entries(localConfig || {}).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                  </label>
                  {key === 'message' || key === 'notes' || key === 'project' || key === 'content' ? (
                    <textarea
                      value={value || ''}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      onBlur={handleBlur}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                      rows={key === 'project' ? 4 : 3}
                      placeholder={
                        key === 'project' ? 'Enter your project idea or description...' :
                        key === 'content' ? 'Enter page content...' :
                        `Enter ${key}...`
                      }
                    />
                  ) : (
                    <input
                      type="text"
                      value={value || ''}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      onBlur={handleBlur}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder={
                        key === 'title' ? 'Enter page title...' :
                        `Enter ${key}...`
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => onExecute(task)}
                disabled={executing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-3 h-3" />
                {executing ? 'Executing...' : 'Execute Task'}
              </button>
              
              {hasUnsavedChanges && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Save Changes
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active indicator */}
        {isCurrent && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500"></div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - cleaner design matching sidebar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              <Activity className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-base">Task Queue</h3>
              {workflowData && (
                <p className="text-sm text-gray-500 truncate max-w-60">
                  {workflowData.name}
                </p>
              )}
            </div>
            {hasUnsavedChanges && (
              <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium rounded-full">
                Unsaved Changes
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-green-100 rounded">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">
                Completed Tasks ({completedTasks.length})
              </h4>
            </div>
            <div className="space-y-2">
              {completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  type="completed"
                />
              ))}
            </div>
          </div>
        )}

        {/* Failed Tasks */}
        {failedTasks.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-red-100 rounded">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">
                Failed Tasks ({failedTasks.length})
              </h4>
            </div>
            <div className="space-y-2">
              {failedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  type="failed"
                  onRetry={handleRetry}
                />
              ))}
            </div>
          </div>
        )}

        {/* Current Task */}
        {currentTask ? (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-blue-100 rounded">
                <Play className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">
                Current Task
              </h4>
            </div>
            <TaskCard
              task={currentTask}
              type="current"
              onExecute={handleExecute}
            />
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="w-24 h-24 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">All Tasks Completed</h3>
            <p className="text-sm text-gray-600">Workflow execution finished successfully</p>
          </div>
        )}

        {/* Upcoming Tasks */}
        {pendingTasks.length > 1 && (
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-gray-100 rounded">
                <Clock className="w-4 h-4 text-gray-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">
                Up Next ({pendingTasks.length - 1})
              </h4>
            </div>
            <div className="space-y-2">
              {pendingTasks.slice(1).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  type="pending"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskQueue;