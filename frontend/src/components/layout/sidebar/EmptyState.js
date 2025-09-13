'use client';

import { Plus, Terminal, Users } from 'lucide-react';

export default function EmptyState({ 
  isWorkflowPage, 
  searchQuery, 
  onNewPerson 
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        {isWorkflowPage ? (
          <Terminal className="w-8 h-8 text-gray-400" />
        ) : (
          <Users className="w-8 h-8 text-gray-400" />
        )}
      </div>
      <div className="text-lg font-medium text-gray-900 mb-2">
        {searchQuery 
          ? `No ${isWorkflowPage ? 'workflows' : 'contacts'} found`
          : `No ${isWorkflowPage ? 'workflows' : 'contacts'} yet`
        }
      </div>
      <div className="text-sm text-gray-500 mb-6">
        {searchQuery 
          ? 'Try different search terms' 
          : `${isWorkflowPage ? 'Create your first workflow to get started' : 'Add your first contact to get started'}`
        }
      </div>
      {!searchQuery && (
        <button
          onClick={onNewPerson}
          className="inline-flex items-center gap-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {isWorkflowPage ? 'Create Workflow' : 'Add Contact'}
        </button>
      )}
    </div>
  );
}
