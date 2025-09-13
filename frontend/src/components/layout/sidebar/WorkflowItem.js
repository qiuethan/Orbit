'use client';

import { MoreVertical, Terminal, Clock } from 'lucide-react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function WorkflowItem({ 
  workflow, 
  isActive, 
  showActionMenu, 
  onSelect, 
  onActionMenuToggle 
}) {
  const person = workflow.person;

  // Clean priority and status styles - Notion style
  const getPriorityStyle = (priority) => {
    const styles = {
      'high': 'bg-red-100 text-red-800 border-red-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'low': 'bg-green-100 text-green-800 border-green-200'
    };
    return styles[priority] || styles['medium'];
  };

  const getStatusStyle = (status) => {
    const styles = {
      'active': 'bg-green-100 text-green-800 border-green-200',
      'paused': 'bg-gray-100 text-gray-600 border-gray-200',
      'completed': 'bg-blue-100 text-blue-800 border-blue-200',
      'draft': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return styles[status] || styles['active'];
  };

  return (
    <div
      onClick={() => onSelect(workflow)}
      className={classNames(
        'group relative cursor-pointer transition-all duration-150',
        'hover:bg-gray-50 border-b border-gray-100',
        isActive ? 'bg-blue-50' : ''
      )}
    >
      <div className="px-3 py-2">
        {/* Main content row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img 
              src={person.avatar} 
              alt={person.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name and action button row */}
            <div className="flex items-start justify-between mb-1">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 text-sm leading-tight truncate">
                  {workflow.name}
                </h3>
              </div>

              {/* Action menu trigger */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onActionMenuToggle(workflow.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-all duration-150 ml-2"
              >
                <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Person and company */}
            <p className="text-xs text-gray-500 leading-tight mb-1 truncate">
              {person.name} · {person.company}
            </p>

            {/* Description */}
            {workflow.description && (
              <p className="text-xs text-gray-600 leading-relaxed mb-2 overflow-hidden"
                 style={{ 
                   display: '-webkit-box',
                   WebkitLineClamp: 2,
                   WebkitBoxOrient: 'vertical'
                 }}>
                {workflow.description}
              </p>
            )}

            {/* Priority, status and metadata row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={classNames(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                  getPriorityStyle(workflow.priority)
                )}>
                  {workflow.priority}
                </span>
                
                <span className={classNames(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                  getStatusStyle(workflow.status)
                )}>
                  {workflow.status}
                </span>

                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Terminal className="w-3 h-3" />
                  {workflow.tasks?.length || 0}
                </span>
              </div>

              {/* Quick action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`View workflow details for ${workflow.name}`);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all duration-150"
                title="View workflow"
              >
                <Terminal className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500"></div>
      )}
    </div>
  );
}
