'use client';

import { MOCK_PEOPLE } from '../data/people';

export const getStatusColor = (status) => {
  switch (status) {
    case 'hot_lead':
      return 'text-red-600';
    case 'warm_lead':
      return 'text-orange-600';
    case 'client':
      return 'text-green-600';
    case 'archived':
      return 'text-gray-400';
    default: // cold_lead
      return 'text-blue-600';
  }
};

export const getStatusBadgeColor = (status) => {
  const colors = {
    hot_lead: 'bg-red-50 text-red-700 border-red-200',
    warm_lead: 'bg-orange-50 text-orange-700 border-orange-200',
    client: 'bg-green-50 text-green-700 border-green-200',
    archived: 'bg-gray-50 text-gray-700 border-gray-200',
    cold_lead: 'bg-blue-50 text-blue-700 border-blue-200'
  };
  return colors[status] || colors.cold_lead;
};

export const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date - now; // Future dates positive, past dates negative
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays}d`;
  if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const isOverdue = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
};

export const handlePersonAction = (action, person, event, activePerson, setActivePerson) => {
  event?.stopPropagation();
  
  switch (action) {
    case 'edit':
      alert(`Edit person: ${person.name} (Feature coming soon)`);
      break;
      
    case 'email':
      window.open(`mailto:${person.email}`, '_blank');
      break;
      
    case 'call':
      if (person.phone) {
        window.open(`tel:${person.phone}`, '_blank');
      } else {
        alert('No phone number available');
      }
      break;
      
    case 'linkedin':
      if (person.linkedIn) {
        window.open(person.linkedIn, '_blank');
      } else {
        alert('No LinkedIn profile available');
      }
      break;
      
    case 'github':
      if (person.github) {
        window.open(person.github, '_blank');
      } else {
        alert('No GitHub profile available');
      }
      break;
      
    case 'website':
      if (person.website) {
        window.open(person.website, '_blank');
      } else {
        alert('No website available');
      }
      break;
      
    case 'archive':
      MOCK_PEOPLE[person.id].status = 'archived';
      // In real app, this would be an API call
      break;
      
    case 'delete':
      if (confirm(`Delete contact "${person.name}"? This action cannot be undone.`)) {
        delete MOCK_PEOPLE[person.id];
        if (activePerson && activePerson.id === person.id) {
          if (setActivePerson) {
            setActivePerson(null);
          }
        }
      }
      break;
      
    default:
      break;
  }
};

export const createNewPerson = (setActivePerson) => {
  const name = window.prompt('Enter person\'s name:');
  if (name) {
    const company = window.prompt('Enter their company:') || '';
    const email = window.prompt('Enter their email:') || '';
    const title = window.prompt('Enter their title:') || '';
    
    const newPerson = {
      id: `person-${Date.now()}`,
      name,
      title,
      company,
      email,
      phone: '',
      linkedIn: '',
      github: '',
      website: '',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: 'cold_lead',
      priority: 'medium',
      lastContact: null,
      nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      addedAt: new Date().toISOString(),
      tags: [],
      stage: 'prospecting',
      notes: [],
      interactions: [],
      mutualConnections: Math.floor(Math.random() * 20) // Mock mutual connections
    };
    
    // Add to mock data (in real app, this would be an API call)
    MOCK_PEOPLE[newPerson.id] = newPerson;
    
    // Set as active person
    if (setActivePerson) {
      setActivePerson(newPerson);
    }
  }
};
