'use client';

import { useState } from 'react';
import { MOCK_PEOPLE } from '../../data/people';
import { getAllPersonWorkflows, getWorkflowForPerson } from '../../data/personWorkflows';
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
  
  // Get state from context
  const { activePerson, setActivePerson, activeWorkflow, setActiveWorkflow } = useApp();
  const { setActiveWorkflow: setContextActiveWorkflow } = useWorkflow();
  const { isWorkflowPage } = usePageContext();
  
  // Get data based on current page
  const people = Object.values(MOCK_PEOPLE);
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
        {filteredItems.length === 0 ? (
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