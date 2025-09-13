'use client';

import { useMemo } from 'react';

export function useSidebarFiltering(displayItems, searchQuery, filterStatus, isWorkflowPage) {
  const filteredItems = useMemo(() => {
    let filtered = displayItems;
    
    if (isWorkflowPage) {
      // For workflow page, filter by workflow properties
      if (searchQuery.trim()) {
        filtered = filtered.filter(workflow =>
          workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          workflow.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          workflow.person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          workflow.person.company.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Sort by priority and recent activity
      return filtered.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(b.generatedAt) - new Date(a.generatedAt);
      });
    } else {
      // For dashboard page, filter by person properties
      if (filterStatus !== 'all') {
        filtered = filtered.filter(person => person.status === filterStatus);
      }
      
      if (searchQuery.trim()) {
        filtered = filtered.filter(person =>
          person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      
      // Sort by priority and follow-up date
      return filtered.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        const aDate = new Date(a.nextFollowUp || '9999-12-31');
        const bDate = new Date(b.nextFollowUp || '9999-12-31');
        return aDate - bDate;
      });
    }
  }, [displayItems, searchQuery, filterStatus, isWorkflowPage]);

  return filteredItems;
}
