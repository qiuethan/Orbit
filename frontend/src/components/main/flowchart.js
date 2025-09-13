'use client'
import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflow } from '../../context/WorkflowContext';
import { ACTION_TYPES } from './ActionTypes';
import ActionPalette from './ActionPalette';
import TaskNode from './TaskNode';

// Node types
const nodeTypes = {
  taskNode: TaskNode,
};

const WorkflowFlowContent = () => {
  const {
    getActiveWorkflow,
    executeTask,
    updateTaskConfig,
    updateTaskStatus,
    updateTaskPosition,
    addNote,
    // We need to add these methods to the context
    addTaskToWorkflow,
    removeTaskFromWorkflow,
  } = useWorkflow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [executing, setExecuting] = useState(false);
  const [draggedActionType, setDraggedActionType] = useState(null);
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();

  const workflowData = getActiveWorkflow();

  // Convert tasks to nodes
  useEffect(() => {
    if (!workflowData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes = workflowData.tasks.map((task, index) => ({
      id: task.id,
      type: 'taskNode',
      position: task.position || { x: index * 280, y: 50 },
      data: {
        ...task,
        onExecute: handleExecuteTask,
        onRetry: handleRetryTask,
        onConfigUpdate: (config) => handleConfigUpdate(task.id, config),
        onDelete: handleDeleteTask,
      },
    }));

    // Create edges between sequential tasks
    const newEdges = workflowData.tasks
      .sort((a, b) => a.order - b.order)
      .slice(0, -1)
      .map((task, index) => {
        const nextTask = workflowData.tasks.find(t => t.order === task.order + 1);
        if (nextTask) {
          return {
            id: `edge-${task.id}-${nextTask.id}`,
            source: task.id,
            target: nextTask.id,
            type: 'smoothstep',
            animated: task.status === 'completed',
          };
        }
        return null;
      })
      .filter(Boolean);

    setNodes(newNodes);
    setEdges(newEdges);
  }, [workflowData]);

  // Handle dragging actions from palette
  const handleDragStart = (event, actionType) => {
    setDraggedActionType(actionType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle dropping actions onto canvas - NOW PROPERLY UPDATES CONTEXT
  const handleDrop = useCallback((event) => {
    event.preventDefault();

    if (!draggedActionType || !workflowData) return;

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    // Create new task with proper structure
    const newTaskId = `task-${Date.now()}`;
    const newTask = {
      id: newTaskId,
      type: draggedActionType.type,
      title: `${draggedActionType.label} Task`,
      description: `New ${draggedActionType.label.toLowerCase()} task`,
      priority: 'medium',
      estimatedTime: '1 minute',
      status: 'pending',
      order: workflowData.tasks.length + 1,
      position,
      config: draggedActionType.defaultConfig || {},
    };

    // Add to workflow context - THIS WILL UPDATE EVERYTHING
    addTaskToWorkflow(workflowData.id, newTask);

    setDraggedActionType(null);
  }, [draggedActionType, workflowData, project, addTaskToWorkflow]);

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  // Handle task execution
  const handleExecuteTask = useCallback(async (task) => {
    if (!workflowData || executing) return;

    setExecuting(true);
    try {
      await executeTask(workflowData.id, task.id, task.type, task.config);
    } catch (error) {
      console.error('Task execution failed:', error);
    } finally {
      setExecuting(false);
    }
  }, [workflowData, executeTask, executing]);

  // Handle task retry
  const handleRetryTask = useCallback((task) => {
    if (!workflowData) return;
    
    updateTaskStatus(workflowData.id, task.id, 'pending');
    setTimeout(() => handleExecuteTask(task), 100);
  }, [workflowData, updateTaskStatus, handleExecuteTask]);

  // Handle config updates
  const handleConfigUpdate = useCallback((taskId, config) => {
    if (!workflowData) return;
    updateTaskConfig(workflowData.id, taskId, config);
  }, [workflowData, updateTaskConfig]);

  // Handle task deletion - NOW REMOVES FROM CONTEXT
  const handleDeleteTask = useCallback((taskId) => {
    if (!workflowData) return;
    removeTaskFromWorkflow(workflowData.id, taskId);
  }, [workflowData, removeTaskFromWorkflow]);

  // Handle node position changes
  const handleNodeDragStop = useCallback((event, node) => {
    if (!workflowData) return;
    updateTaskPosition(workflowData.id, node.id, node.position);
  }, [workflowData, updateTaskPosition]);

  // Handle edge connections
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  if (!workflowData) {
    return (
      <div className="h-full flex">
        <ActionPalette onDragStart={handleDragStart} />
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
              ⚡
            </div>
            <h3 className="font-medium text-gray-900 mb-1">No workflow selected</h3>
            <p className="text-sm text-gray-500">Select a workflow to view the flow diagram</p>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = workflowData.tasks.filter(t => t.status === 'completed').length;
  const pendingCount = workflowData.tasks.filter(t => t.status === 'pending').length;
  const failedCount = workflowData.tasks.filter(t => t.status === 'failed').length;

  return (
    <div className="h-full flex">
      {/* Action Palette */}
      <ActionPalette onDragStart={handleDragStart} />
      
      {/* React Flow Canvas */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={handleNodeDragStop}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
        >
          <Background variant="dots" gap={20} size={1} />
          <Controls position="bottom-left" />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.data.status) {
                case 'completed': return '#10b981';
                case 'failed': return '#ef4444';
                case 'executing': return '#f59e0b';
                default: return '#6b7280';
              }
            }}
            pannable
            zoomable
            position="bottom-right"
          />
          
          {/* Control Panel - Slightly solarized */}
          <Panel position="top-right" className="bg-gray-200 border border-gray-300 p-3 rounded shadow-sm max-w-sm font-mono">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="font-medium text-xs text-gray-800 truncate">
                  {workflowData.name}
                </h3>
              </div>
            </div>
            
            <div className="flex gap-1 text-xs mb-2">
              <span className="px-2 py-0.5 bg-green-100 border border-green-200 text-green-700 rounded font-medium">
                {completedCount}✓
              </span>
              <span className="px-2 py-0.5 bg-blue-100 border border-blue-200 text-blue-700 rounded font-medium">
                {pendingCount}⏳
              </span>
              {failedCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 border border-red-200 text-red-700 rounded font-medium">
                  {failedCount}✗
                </span>
              )}
            </div>
            
            <div className="text-xs text-gray-600 border-t border-gray-300 pt-2">
              <span className="text-gray-500">$</span> drag actions from sidebar
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

// Enhanced Context with ADD_TASK and REMOVE_TASK actions
// ADD THESE TO YOUR WORKFLOWCONTEXT.JS:

/*
// Add to WORKFLOW_ACTIONS:
ADD_TASK: 'ADD_TASK',
REMOVE_TASK: 'REMOVE_TASK',

// Add to reducer:
case WORKFLOW_ACTIONS.ADD_TASK:
  const { workflowId: addWId, task: newTask } = action.payload;
  newState = {
    ...state,
    workflows: {
      ...state.workflows,
      [addWId]: {
        ...state.workflows[addWId],
        tasks: [...state.workflows[addWId].tasks, newTask]
      }
    }
  };
  break;

case WORKFLOW_ACTIONS.REMOVE_TASK:
  const { workflowId: removeWId, taskId: removeTaskId } = action.payload;
  newState = {
    ...state,
    workflows: {
      ...state.workflows,
      [removeWId]: {
        ...state.workflows[removeWId],
        tasks: state.workflows[removeWId].tasks.filter(task => task.id !== removeTaskId)
      }
    }
  };
  break;

// Add to actions:
addTaskToWorkflow: (workflowId, task) => {
  dispatch({
    type: WORKFLOW_ACTIONS.ADD_TASK,
    payload: { workflowId, task }
  });
},

removeTaskFromWorkflow: (workflowId, taskId) => {
  dispatch({
    type: WORKFLOW_ACTIONS.REMOVE_TASK,
    payload: { workflowId, taskId }
  });
},
*/

// Main component with ReactFlow provider
const WorkflowFlowchart = () => {
  return (
    <ReactFlowProvider>
      <WorkflowFlowContent />
    </ReactFlowProvider>
  );
};

export default WorkflowFlowchart;