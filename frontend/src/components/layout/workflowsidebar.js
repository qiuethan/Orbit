'use client';

import { useState, useEffect } from 'react';
import { peopleApi } from '../../data/people';
import { getAllPersonWorkflows, getWorkflowForPerson, updateWorkflowsCache, setPeopleDataCache } from '../../data/personWorkflows';
import { useApp, usePageContext } from '../../context/AppContext';
import { useWorkflow } from '../../context/WorkflowContext';
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
  const [loading, setLoading] = useState(true);
  
  // Get state from context
  const { activePerson, setActivePerson, activeWorkflow, setActiveWorkflow } = useApp();
  const { setActiveWorkflow: setContextActiveWorkflow } = useWorkflow();
  const { isWorkflowPage } = usePageContext();
  
  // Load people and workflows data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load both people and workflows in parallel
        const [fetchedPeople] = await Promise.all([
          peopleApi.getPeople(),
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
        console.log('✅ Loaded real data from backend:', fetchedPeople.length, 'people');
      } catch (error) {
        console.error('Failed to load data from backend:', error);
        setPeople([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Get data based on current page
  const personWorkflows = getAllPersonWorkflows();
  const displayItems = isWorkflowPage ? personWorkflows : people;

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
      />

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            isWorkflowPage={isWorkflowPage}
            searchQuery={searchQuery}
            onNewPerson={handleNewPerson}
          />
        ) : (
          <div>
            {filteredItems.map((item) => {
              if (isWorkflowPage) {
                const workflow = item;
                const isActive = activeWorkflow && activeWorkflow.id === workflow.id;
              
              return (
                  <WorkflowItem
                  key={workflow.id}
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
                    key={person.id}
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