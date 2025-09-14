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
    <div className="h-full flex flex-col bg-gray-50 font-mono text-xs">
      {/* Minimal Header */}
      <div className="bg-gray-200 border-b border-gray-200 px-2 py-0.5 flex items-center justify-between">
        <span className="text-gray-700 text-xs font-medium truncate">
          {activeWorkflow.name}
        </span>
        <div className="flex items-center space-x-1 text-xs text-gray-600">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          <span>{notes.length}</span>
        </div>
      </div>

      {/* Notes Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-1 bg-gray-50">
        {notes.length === 0 ? (
          <div className="text-gray-500 text-xs">$ waiting...</div>
        ) : (
          <div className="space-y-0.5">
            {notes.map((note, index) => (
              <div key={note.id ? `${note.id}-${index}` : `note-${index}-${Date.now()}`} className="flex items-start space-x-2">
                <span className="text-gray-500 text-xs flex-shrink-0 w-16">
                  {formatTimestamp(note.timestamp)}
                </span>
                <span className={`${getTypeColor(note.type)} text-xs flex-shrink-0`}>
                  {getTypePrefix(note.type)}
                </span>
                <span className="text-gray-700 text-xs">
                  {note.content}
                </span>
              </div>
            ))}
          </div>
        )}
        <div ref={notesEndRef} />
      </div>
    </div>
  );
}