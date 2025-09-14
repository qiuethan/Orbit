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
      {/* Terminal Header - Clean without Mac buttons */}
      <div className="bg-gray-200 border-b border-gray-200 px-4 py-1 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-gray-700 text-sm font-medium">
            {activeWorkflow.name}
          </span>
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-600">
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
        className="flex-1 overflow-y-auto p-2 bg-gray-50 leading-tight"
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

        {/* Welcome Message - Simplified */}
        <div className="text-gray-500 mb-1 text-xs">
          <div>$ {activeWorkflow.name.toLowerCase().replace(/\s+/g, '-')}</div>
          <div className="border-b border-gray-300 my-0.5"></div>
        </div>

        {notes.length === 0 ? (
          <div className="text-gray-500 text-xs">
            <div>$ waiting for workflow execution...</div>
            <div className="flex items-center mt-2">
              <span className="text-green-600">$ </span>
              <span className="animate-pulse ml-1">█</span>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
{notes.map((note, index) => (
  <div key={note.id ? `${note.id}-${index}` : `note-${index}-${Date.now()}`} className="group">
                <div className="flex items-start space-x-3">
                  {/* Timestamp */}
                  <span className="text-gray-500 text-xs flex-shrink-0 w-20">
                    {formatTimestamp(note.timestamp)}
                  </span>
                  
                  {/* Prefix */}
                  <span className={`${getTypeColor(note.type)} flex-shrink-0 text-xs font-medium min-w-0`}>
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
            <div className="flex items-center mt-1 text-gray-500">
              <span className="w-20 text-xs"></span>
              <span className="text-xs text-green-600">$ </span>
              <span className="animate-pulse ml-1">█</span>
            </div>
          </div>
        )}
        
        <div ref={notesEndRef} />
      </div>

      {/* Terminal Footer - Minimal */}
      <div className="bg-gray-200 border-t border-gray-200 px-4 py-0.5 text-xs text-gray-600">
        <div className="flex items-center justify-end">
          <div>
            {notes.length} lines
          </div>
        </div>
      </div>
    </div>
  );
}