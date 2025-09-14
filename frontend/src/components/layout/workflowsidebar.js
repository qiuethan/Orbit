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
  const { getDetectedPersonNames, sidebarLoading } = useDetection();
  
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
  
  // Get data based on current page
  let displayItems = isWorkflowPage ? personWorkflows : people;
  
  // Filter by detected people when on vision page
  const isVisionPage = typeof window !== 'undefined' && window.location.pathname === '/vision';
  if (isVisionPage && !isWorkflowPage) {
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
      // If no people detected, show empty list
      displayItems = [];
    }
  }

  // Use custom hook for filtering
  const filteredItems = useSidebarFiltering(displayItems, searchQuery, filterStatus, isWorkflowPage);

  const handleNewPerson = () => {
    createNewPerson(setActivePerson);
  };

  const handlePersonActionWithContext = (action, person, event) => {
    handlePersonAction(action, person, event, activePerson, setActivePerson);
    setShowActionMenu(null);
  };

  const handlePersonSelect = (person) => {
    setActivePerson(person);
    
    // Auto-select person's workflow if it exists
    const personWorkflow = getWorkflowForPerson(person.id);
    if (personWorkflow) {
      setActiveWorkflow(personWorkflow);
      setContextActiveWorkflow(personWorkflow.id);
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
        isWorkflowPage={isWorkflowPage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onNewPerson={handleNewPerson}
        isVisionPage={isVisionPage}
        detectedCount={isVisionPage ? getDetectedPersonNames().length : null}
      />

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : isVisionPage && sidebarLoading ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <div className="text-sm text-gray-500">Loading detected people...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            isWorkflowPage={isWorkflowPage}
            searchQuery={searchQuery}
            onNewPerson={handleNewPerson}
          />
        ) : (
          <div>
            {filteredItems.map((item, index) => {
              if (isWorkflowPage) {
                const workflow = item;
                const isActive = activeWorkflow && activeWorkflow.id === workflow.id;
              
              return (
                  <WorkflowItem
                  key={workflow.id || `workflow-${index}`}
                    workflow={workflow}
                    isActive={isActive}
                    showActionMenu={showActionMenu === workflow.id}
                    onSelect={handleItemSelect}
                    onActionMenuToggle={handleActionMenuToggle}
                  />
                );
              } else {
                const person = item;
                const isActive = activePerson && activePerson.id === person.id;
              
                return (
                  <PersonItem
                    key={person.id || `person-${index}`}
                    person={person}
                    isActive={isActive}
                    showActionMenu={showActionMenu === person.id}
                    onSelect={handleItemSelect}
                    onActionMenuToggle={handleActionMenuToggle}
                    onPersonAction={handlePersonActionWithContext}
                  />
                );
              }
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