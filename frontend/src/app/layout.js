'use client';

import { useState } from 'react';
import './globals.css';

// Import your main components
import Header from '../components/layout/header';
import PeopleSidebar from '../components/layout/workflowsidebar';
import TaskQueue from '../components/layout/TaskQueue';
import { WorkflowProvider } from '../context/WorkflowContext';
import { AppProvider } from '../context/AppContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AppProvider>
          <WorkflowProvider>
            <LayoutContent>{children}</LayoutContent>
          </WorkflowProvider>
        </AppProvider>
      </body>
    </html>
  );
}

function LayoutContent({ children }) {
  return (
    <>
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
        <div className="w-96 bg-white border-l border-gray-200">
          <TaskQueue />
        </div>
        
      </div>
    </>
  );
}