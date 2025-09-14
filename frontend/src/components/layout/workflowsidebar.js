'use client';

import { useState, useEffect } from 'react';
import { peopleApi } from '../../data/people';
import { getAllPersonWorkflows, getWorkflowForPerson, updateWorkflowsCache, setPeopleDataCache } from '../../data/personWorkflows';
import { useApp, usePageContext } from '../../context/AppContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { useDetection } from '../../context/DetectionContext';
import { useSidebarFiltering } from '../../hooks/useSidebarFiltering';
import { handlePersonAction, createNewPerson } from '../../utils/personUtils';

// Components
import {
  SidebarHeader,
  PersonItem,
  WorkflowItem,
  EmptyState,
  SidebarFooter
} from './sidebar';

export default function PeopleSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [people, setPeople] = useState([]);
  const [personWorkflows, setPersonWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Get state from context
  const { activePerson, setActivePerson, activeWorkflow, setActiveWorkflow } = useApp();
  const { setActiveWorkflow: setContextActiveWorkflow } = useWorkflow();
  const { isWorkflowPage } = usePageContext();
  const { getDetectedPersonNames, sidebarLoading, isVisionPage: contextIsVisionPage } = useDetection();
  
  // Also check current path directly for reliability
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isVisionPageDirect = currentPath === '/vision';
  
  // Reset detection state when switching away from vision page
  useEffect(() => {
    const isVisionPage = typeof window !== 'undefined' && window.location.pathname === '/vision';
    if (!isVisionPage && sidebarLoading) {
      // This will trigger the detection context to reset loading state
      // The detection context already handles this, but this ensures immediate reset
    }
  }, [typeof window !== 'undefined' ? window.location.pathname : '', sidebarLoading]);
  
  // Load people and workflows data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load both people and workflows in parallel
        const [fetchedPeople, fetchedWorkflows] = await Promise.all([
          peopleApi.getPeople(),
          getAllPersonWorkflows(),
          updateWorkflowsCache() // This updates the workflows cache
        ]);
        
        // Convert array to object for easier lookup
        const peopleObject = Array.isArray(fetchedPeople) 
          ? fetchedPeople.reduce((acc, person) => {
              acc[person.id] = person;
              return acc;
            }, {})
          : fetchedPeople;
        
        // Set the people cache for workflows to use
        setPeopleDataCache(peopleObject);
        
        setPeople(fetchedPeople);
        setPersonWorkflows(fetchedWorkflows);
        console.log('✅ Loaded real data from backend:', fetchedPeople.length, 'people', fetchedWorkflows.length, 'workflows');
      } catch (error) {
        console.error('Failed to load data from backend:', error);
        setPeople([]);
        setPersonWorkflows([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Reload people data if it's empty (in case of state issues)
  useEffect(() => {
    if (people.length === 0 && !loading) {
      console.log('People data is empty, reloading...');
      const reloadData = async () => {
        try {
          const peopleData = await peopleApi.getAll();
          console.log('Reloaded people data:', peopleData.length, 'people');
          setPeople(peopleData);
        } catch (error) {
          console.error('Error reloading people data:', error);
        }
      };
      reloadData();
    }
  }, [people.length, loading]);
  
  // Get data based on current page
  let displayItems = people; // Always show people, workflows are shown in right sidebar
  
  // Debug logging
  console.log('Sidebar state:', { 
    peopleCount: people.length, 
    isVisionPage: isVisionPageDirect,
    contextIsVisionPage,
    isWorkflowPage,
    sidebarLoading,
    currentPath
  });
  
  // Filter by detected people ONLY when on vision page AND it's not a workflow page
  if (isVisionPageDirect && !isWorkflowPage) {
    const detectedNames = getDetectedPersonNames();
    if (detectedNames.length > 0) {
      if (sidebarLoading) {
        // Show loading state - filter but don't show results yet
        displayItems = [];
      } else {
        // Use a more stable filtering approach
        const filteredPeople = people.filter(person => 
          detectedNames.some(name => 
            person.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(person.name.toLowerCase())
          )
        );
        displayItems = filteredPeople;
      }
    } else {
      // If no people detected, show all people (don't filter)
      displayItems = people;
    }
  }
  // For workflow page or other pages, displayItems remains as set above (personWorkflows or people)

  // Use custom hook for filtering
  const filteredItems = useSidebarFiltering(displayItems, searchQuery, filterStatus, false);

  const handleNewPerson = () => {
    createNewPerson(setActivePerson);
  };

  const handlePersonActionWithContext = (action, person, event) => {
    handlePersonAction(action, person, event, activePerson, setActivePerson);
    setShowActionMenu(null);
  };

  const handlePersonSelect = async (person) => {
    setActivePerson(person);
    
    // Auto-select person's workflow if it exists
    try {
      const personWorkflow = await getWorkflowForPerson(person.id);
      if (personWorkflow) {
        setActiveWorkflow(personWorkflow);
        setContextActiveWorkflow(personWorkflow.id);
      } else {
        // If no specific workflow for this person, clear active workflow
        setActiveWorkflow(null);
        setContextActiveWorkflow(null);
      }
    } catch (error) {
      console.error('Error loading workflow for person:', error);
      // Clear active workflow on error
      setActiveWorkflow(null);
      setContextActiveWorkflow(null);
    }
  };

  const handleWorkflowSelect = (workflow) => {
    setActiveWorkflow(workflow);
    setContextActiveWorkflow(workflow.id);
  };

  const handleItemSelect = (item) => {
    if (isWorkflowPage) {
      handleWorkflowSelect(item);
      setActivePerson(item.person);
    } else {
      handlePersonSelect(item);
    }
  };

  const handleActionMenuToggle = (itemId) => {
    setShowActionMenu(showActionMenu === itemId ? null : itemId);
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <SidebarHeader
        isWorkflowPage={false}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onNewPerson={handleNewPerson}
        isVisionPage={isVisionPageDirect && !isWorkflowPage}
        detectedCount={isVisionPageDirect && !isWorkflowPage ? getDetectedPersonNames().length : null}
      />

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : isVisionPageDirect && !isWorkflowPage && sidebarLoading ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <div className="text-sm text-gray-500">Loading detected people...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            isWorkflowPage={false}
            searchQuery={searchQuery}
            onNewPerson={handleNewPerson}
          />
        ) : (
          <div>
            {filteredItems.map((item, index) => {
              const person = item;
              const isActive = activePerson && activePerson.id === person.id;
            
              return (
                <PersonItem
                  key={person.id || `person-${index}`}
                  person={person}
                  isActive={isActive}
                  showActionMenu={showActionMenu === person.id}
                  onSelect={handlePersonSelect}
                  onActionMenuToggle={handleActionMenuToggle}
                  onPersonAction={handlePersonActionWithContext}
                />
              );
            })}
          </div>
        )}
      </div>

      <SidebarFooter
        isWorkflowPage={isWorkflowPage}
        people={people}
        personWorkflows={personWorkflows}
      />

      {/* Click outside to close menu */}
      {showActionMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActionMenu(null)}
        />
      )}
    </div>
  );
}