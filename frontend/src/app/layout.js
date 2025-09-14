'use client';

import { useState, createContext, useContext } from 'react';
import './globals.css';

// Import your main components
import Header from '../components/layout/header';
import PeopleSidebar from '../components/layout/workflowsidebar';
import TaskQueue from '../components/layout/TaskQueue';
import { WorkflowProvider } from '../context/WorkflowContext';
import { AppProvider } from '../context/AppContext';
import { DetectionProvider } from '../context/DetectionContext';

// Create a context for sidebar collapse state
const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AppProvider>
          <WorkflowProvider>
            <DetectionProvider>
              <LayoutContent>{children}</LayoutContent>
            </DetectionProvider>
          </WorkflowProvider>
        </AppProvider>
      </body>
    </html>
  );
}

function LayoutContent({ children }) {
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ isRightSidebarCollapsed, setIsRightSidebarCollapsed }}>
      {/* Header */}
      <Header />
      
      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-4rem)]">
        
        {/* Left Sidebar - People List */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <PeopleSidebar />
        </div>

        {/* Center Panel - This is where children (page.js) renders */}
        <div className="flex-1 bg-gray-50">
          {children}
        </div>

        {/* Right Panel - Task Queue */}
        <div className={`bg-white border-l border-gray-200 transition-all duration-300 ${
          isRightSidebarCollapsed ? 'w-16' : 'w-96'
        }`}>
          <TaskQueue />
        </div>
        
      </div>
    </SidebarContext.Provider>
  );
}