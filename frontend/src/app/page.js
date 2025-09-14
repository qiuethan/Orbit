// app/page.js - Workflow page with React Flow and original functionality
import WorkflowFlowchart from '../components/main/flowchart';
import NotesSection from '../components/main/NotesSection';

export default function HomePage() {
  return (
    <div className="h-full flex flex-col">
      {/* Flowchart Section - Takes up most of the space */}
      <div className="flex-1 min-h-0 border-b border-gray-200">
        <WorkflowFlowchart />
      </div>
      
      {/* Notes Section - Smaller fixed height */}
      <div className="h-32 border-b border-gray-200">
        <NotesSection />
      </div>
    </div>
  );
}