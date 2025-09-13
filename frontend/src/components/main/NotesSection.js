'use client';

import { useState, useEffect, useRef } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';

export default function WorkflowNotesTerminal() {
  const { getActiveWorkflow, getNotes, activeWorkflowId } = useWorkflow();
  const notesEndRef = useRef(null);
  const containerRef = useRef(null);

  const activeWorkflow = getActiveWorkflow();
  const notes = activeWorkflowId ? getNotes(activeWorkflowId) : [];

  // Auto-scroll to bottom when new notes are added
  useEffect(() => {
    if (notesEndRef.current) {
      notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getTypePrefix = (type) => {
    switch (type) {
      case 'system':
        return '[SYSTEM]';
      case 'user':
        return '[USER]';
      case 'success':
        return '[SUCCESS]';
      case 'error':
        return '[ERROR]';
      case 'warning':
        return '[WARN]';
      case 'info':
        return '[INFO]';
      default:
        return '[LOG]';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'system':
        return 'text-violet-600';
      case 'user':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
      case 'info':
        return 'text-cyan-600';
      default:
        return 'text-gray-600';
    }
  };

  // Simulate the original's workflow selection state
  if (!activeWorkflow) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center font-mono">
        <div className="text-center text-green-600">
          <div className="text-4xl mb-4">█</div>
          <p className="text-lg">$ select workflow to view logs</p>
          <div className="mt-2 text-gray-500">
            <span className="animate-pulse">_</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 font-mono text-sm">
      {/* Terminal Header */}
      <div className="bg-gray-200 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
          <span className="text-gray-700 text-xs">
            workflow@execution: ~/{activeWorkflow.name.toLowerCase().replace(/\s+/g, '-')}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>LIVE</span>
          </div>
          <span>{notes.length} lines</span>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50 leading-relaxed"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#9ca3af #f9fafb'
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 8px;
          }
          div::-webkit-scrollbar-track {
            background: #f9fafb;
          }
          div::-webkit-scrollbar-thumb {
            background: #9ca3af;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `}</style>

        {/* Welcome Message */}
        <div className="text-gray-500 mb-4 text-xs">
          <div>Workflow Execution Terminal v1.0.0</div>
          <div>Starting execution log for: {activeWorkflow.name}</div>
          <div className="border-b border-gray-300 my-2"></div>
        </div>

        {notes.length === 0 ? (
          <div className="text-gray-500 text-xs">
            <div>$ waiting for workflow execution...</div>
            <div className="flex items-center mt-2">
              <span>$ </span>
              <span className="animate-pulse ml-1">█</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
{notes.map((note, index) => (
  <div key={note.id ? `${note.id}-${index}` : `note-${index}-${Date.now()}`} className="group">
                <div className="flex items-start space-x-3">
                  {/* Timestamp */}
                  <span className="text-gray-400 text-xs flex-shrink-0 w-24">
                    {formatTimestamp(note.timestamp)}
                  </span>
                  
                  {/* Prefix */}
                  <span className={`${getTypeColor(note.type)} flex-shrink-0 text-xs font-bold min-w-0`}>
                    {getTypePrefix(note.type)}
                  </span>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 text-gray-700">
                    <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                      {note.content}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Current line with cursor - only show when waiting */}
            <div className="flex items-center mt-4 text-gray-500">
              <span className="w-24 text-xs"></span>
              <span className="text-xs">$ </span>
              <span className="animate-pulse ml-1">█</span>
            </div>
          </div>
        )}
        
        <div ref={notesEndRef} />
      </div>

      {/* Terminal Footer */}
      <div className="bg-gray-200 border-t border-gray-300 px-4 py-2 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>ESC: Menu</span>
            <span>CTRL+C: Stop</span>
            <span>CTRL+L: Clear</span>
          </div>
          <div>
            Lines: {notes.length} | Auto-scroll: ON
          </div>
        </div>
      </div>
    </div>
  );
}