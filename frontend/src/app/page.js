// app/page.js - Workflow page with React Flow and original functionality
import WorkflowFlowchart from '../components/main/flowchart';
import NotesSection from '../components/main/NotesSection';

export default function HomePage() {
  return (
    <div className="h-full flex flex-col">
      {/* Flowchart Section - Smaller top section */}
      <div className="h-156 border-b border-gray-200">
        <WorkflowFlowchart />
      </div>
      
      {/* Notes Section - Takes up most of the space like a document */}
      <div className="flex-1 min-h-0">
        <NotesSection />
      </div>
    </div>
  );
}