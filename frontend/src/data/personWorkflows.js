// Consolidated workflows - all workflows for all people powered by backend cache only
import { getWorkflowsFromBackendAsync, getPeopleFromBackendAsync } from './dataAdapter';

// No mock data - only real data from backend

// Async function to get workflows from backend only
export async function getPersonWorkflowsAsync() {
  return await getWorkflowsFromBackendAsync();
}

// Cache to store workflows data
let workflowsCache = null;

// Get all person workflows (async only - no sync fallback)
export async function getAllPersonWorkflows() {
  const workflows = await getPersonWorkflowsAsync();
  const people = await getPeopleFromBackendAsync();
  
  return Object.values(workflows).map(workflow => {
    const person = Object.values(people).find(p => p.id === workflow.personId);
    return {
      ...workflow,
      person: person || {
        id: workflow.personId,
        name: 'Unknown Person',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${workflow.personId}`,
        title: 'Unknown'
      }
    };
  });
}

// Get workflow for specific person (async only - no sync fallback)
export async function getWorkflowForPerson(personId) {
  // First try to get from localStorage
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('workflow_app_data');
      if (stored) {
        const data = JSON.parse(stored);
        const workflow = Object.values(data.workflows || {}).find(w => w.personId === personId);
        if (workflow) {
          return workflow;
        }
      }
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
  }
  
  // Fallback to generating workflows
  const workflows = await getPersonWorkflowsAsync();
  return workflows[personId] || null;
}

// Update cache when async data is loaded
export async function updateWorkflowsCache() {
  const workflows = await getPersonWorkflowsAsync();
  workflowsCache = workflows;
  return workflows;
}

// Get people data cache for workflow person lookup
let peopleDataCache = null;

export function setPeopleDataCache(people) {
  peopleDataCache = people;
}

// No legacy workflow data - only real data from backend
