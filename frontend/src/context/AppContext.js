'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [activePerson, setActivePerson] = useState(null);
  const [activeWorkflow, setActiveWorkflow] = useState(null);

  return (
    <AppContext.Provider 
      value={{
        activePerson,
        setActivePerson,
        activeWorkflow,
        setActiveWorkflow
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Helper hook to determine current page context
export function usePageContext() {
  const pathname = usePathname();
  
  return {
    isWorkflowPage: pathname === '/',
    isDashboardPage: pathname === '/dashboard',
    isGraphPage: pathname === '/graph',
    isVisionPage: pathname === '/vision'
  };
}
