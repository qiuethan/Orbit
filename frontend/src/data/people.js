// People data powered by backend cache only
import { getPeopleFromBackendAsync } from './dataAdapter';

// No mock data - only real data from backend

// No legacy mock data - only real data from backend

// Helper functions
export const getStatusColor = (status) => {
  const colors = {
    cold_lead: 'text-gray-500',
    warm_lead: 'text-yellow-600',
    hot_lead: 'text-red-600',
    client: 'text-green-600',
    archived: 'text-gray-400'
  };
  return colors[status] || 'text-gray-500';
};

export const getStatusBadgeColor = (status) => {
  const colors = {
    cold_lead: 'bg-gray-100 text-gray-700',
    warm_lead: 'bg-yellow-100 text-yellow-700',
    hot_lead: 'bg-red-100 text-red-700',
    client: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-500'
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export const getPriorityColor = (priority) => {
  const colors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  };
  return colors[priority] || 'text-gray-500';
};

export const getStageColor = (stage) => {
  const colors = {
    prospecting: 'text-blue-600',
    contacted: 'text-cyan-600',
    responding: 'text-purple-600',
    meeting_scheduled: 'text-orange-600',
    negotiation: 'text-red-600',
    closed_won: 'text-green-600',
    closed_lost: 'text-gray-500'
  };
  return colors[stage] || 'text-gray-500';
};

// People API functions - only backend data
export const peopleApi = {
  // Get all people from backend
  getPeople: async () => {
    const people = await getPeopleFromBackendAsync();
    return Object.values(people);
  },

  // Get specific person by ID from backend
  getPerson: async (personId) => {
    const people = await getPeopleFromBackendAsync();
    return people[personId] || null;
  },

  // Add new person (placeholder - should be implemented in backend)
  addPerson: async (personData) => {
    throw new Error('Add person not implemented - requires backend API');
  },

  // Update person (placeholder - should be implemented in backend)
  updatePerson: async (personId, updates) => {
    throw new Error('Update person not implemented - requires backend API');
  },

  // Add note to person (placeholder - should be implemented in backend)
  addNote: async (personId, noteContent, noteType = 'user') => {
    throw new Error('Add note not implemented - requires backend API');
  },

  // Add interaction to person (placeholder - should be implemented in backend)
  addInteraction: async (personId, interaction) => {
    throw new Error('Add interaction not implemented - requires backend API');
  }
};

export default peopleApi;
