import React from 'react';
import { ACTION_TYPES, getActionsByCategory } from './ActionTypes';

// Compact Action Block Component
const DraggableActionBlock = ({ actionType, onDragStart }) => {
  const IconComponent = actionType.icon;
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, actionType)}
      className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-md cursor-grab hover:border-blue-300 hover:shadow-sm transition-all group mb-1"
      title={actionType.label}
    >
      <div className="p-1 bg-gray-100 rounded group-hover:bg-blue-100 transition-colors">
        <IconComponent className="w-3 h-3 text-gray-600 group-hover:text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-medium text-gray-900 truncate">{actionType.label}</h4>
      </div>
    </div>
  );
};

const ActionPalette = ({ onDragStart }) => {
  const actionsByCategory = getActionsByCategory();

  return (
    <div className="w-44 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
        <p className="text-xs text-gray-500 mt-1">Drag to canvas</p>
      </div>
      
      {/* Action Categories */}
      <div className="p-2">
        {Object.entries(actionsByCategory).map(([category, actions]) => (
          <div key={category} className="mb-3">
            <h4 className="text-xs font-medium text-gray-700 mb-1 px-1">{category}</h4>
            <div className="space-y-1">
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