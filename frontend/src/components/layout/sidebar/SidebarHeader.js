'use client';

import { Plus, Search, Terminal, Users } from 'lucide-react';

export default function SidebarHeader({ 
  isWorkflowPage, 
  searchQuery, 
  setSearchQuery, 
  filterStatus, 
  setFilterStatus, 
  onNewPerson 
}) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {isWorkflowPage ? (
            <Terminal className="w-5 h-5 text-gray-700" />
          ) : (
            <Users className="w-5 h-5 text-gray-700" />
          )}
          <span className="text-lg font-semibold text-gray-900">
            {isWorkflowPage ? 'Workflows' : 'Contacts'}
          </span>
        </div>
        <button
          onClick={onNewPerson}
          className="inline-flex items-center gap-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {isWorkflowPage ? 'New' : 'Add Contact'}
        </button>
      </div>

      {/* Status Filter - only on dashboard page */}
      {!isWorkflowPage && (
        <div className="mb-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
          >
            <option value="all">All Contacts</option>
            <option value="cold_lead">Cold Leads</option>
            <option value="warm_lead">Warm Leads</option>
            <option value="hot_lead">Hot Leads</option>
            <option value="client">Clients</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="search"
          placeholder={isWorkflowPage ? "Search workflows..." : "Search contacts..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
        />
      </div>
    </div>
  );
}
