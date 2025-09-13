import React from 'react';
import { ACTION_TYPES, getActionsByCategory } from './ActionTypes';

// Compact Action Block Component
const DraggableActionBlock = ({ actionType, onDragStart }) => {
  const IconComponent = actionType.icon;
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, actionType)}
      className="group relative cursor-grab transition-all duration-150 hover:bg-gray-50 border-b border-gray-100"
      title={actionType.label}
    >
      <div className="px-3 py-2">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="p-1.5 bg-gray-100 rounded-full flex-shrink-0 group-hover:bg-blue-100 transition-colors">
            <IconComponent className="w-3 h-3 text-gray-600 group-hover:text-blue-600" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 leading-tight truncate">
              {actionType.label}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {actionType.category}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionPalette = ({ onDragStart }) => {
  const actionsByCategory = getActionsByCategory();

  return (
    <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-semibold text-gray-900">Actions</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">Drag actions to create workflow</p>
      </div>
      
      {/* Action Categories */}
      <div className="flex-1 overflow-y-auto bg-white">
        {Object.entries(actionsByCategory).map(([category, actions]) => (
          <div key={category}>
            <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">{category}</h4>
            </div>
            <div>
              {actions.map((actionType) => (
                <DraggableActionBlock
                  key={actionType.type}
                  actionType={actionType}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionPalette;