'use client';

import { useEffect, useRef, useState } from 'react';
import { MOCK_PEOPLE } from '../../data/people';

const NetworkGraph = ({ onNodeClick }) => {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);
  const layoutRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  // Only mount on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !containerRef.current) return;

    let sigma, layout, graph;

    const initializeGraph = async () => {
      try {
        // Dynamic imports to avoid SSR issues
        const [
          { default: Graph },
          { default: Sigma },
          { default: ForceSupervisor }
        ] = await Promise.all([
          import('graphology'),
          import('sigma'),
          import('graphology-layout-force/worker')
        ]);

        // Create graph instance
        graph = new Graph();

        // Define colors for different node types
        const STUDENT_COLOR = "#3B82F6";      // Blue
        const COMPANY_COLOR = "#10B981";      // Green
        const SKILL_COLOR = "#8B5CF6";        // Purple
        const UNIVERSITY_COLOR = "#F59E0B";   // Amber
        const EVENT_COLOR = "#EF4444";        // Red

        // Mock student networking data
        const students = [
          { id: "alice", name: "Alice Chen", year: "Senior", major: "Computer Science" },
          { id: "bob", name: "Bob Smith", year: "Junior", major: "Engineering" },
          { id: "carol", name: "Carol Davis", year: "Senior", major: "Business" },
          { id: "david", name: "David Kim", year: "Graduate", major: "Data Science" },
          { id: "emma", name: "Emma Wilson", year: "Sophomore", major: "Design" },
          { id: "frank", name: "Frank Johnson", year: "Senior", major: "Computer Science" }
        ];

        const companies = [
          { id: "google", name: "Google", type: "Tech" },
          { id: "microsoft", name: "Microsoft", type: "Tech" },
          { id: "goldman", name: "Goldman Sachs", type: "Finance" },
          { id: "mckinsey", name: "McKinsey", type: "Consulting" },
          { id: "apple", name: "Apple", type: "Tech" }
        ];

        const skills = [
          { id: "react", name: "React" },
          { id: "python", name: "Python" },
          { id: "machine-learning", name: "Machine Learning" },
          { id: "design", name: "UI/UX Design" },
          { id: "finance", name: "Finance" },
          { id: "consulting", name: "Consulting" }
        ];

        const universities = [
          { id: "stanford", name: "Stanford University" },
          { id: "mit", name: "MIT" },
          { id: "berkeley", name: "UC Berkeley" }
        ];

        const events = [
          { id: "career-fair", name: "Career Fair 2024" },
          { id: "tech-talk", name: "Google Tech Talk" },
          { id: "hackathon", name: "HackMIT" }
        ];

        // Add student nodes (larger, with distinct styling)
        students.forEach((student, index) => {
          const angle = (index * 2 * Math.PI) / students.length;
          graph.addNode(student.id, {
            label: student.name,
            size: 18,
            color: STUDENT_COLOR,
            borderColor: "#1D4ED8",
            borderSize: 2,
            x: 120 * Math.cos(angle),
            y: 120 * Math.sin(angle),
            studentData: student,
            nodeType: "student"
          });
        });

        // Add company nodes (use circle with distinct color and size)
        companies.forEach((company, index) => {
          const angle = (index * 2 * Math.PI) / companies.length + Math.PI/4;
          graph.addNode(company.id, {
            label: company.name,
            size: 15,
            color: COMPANY_COLOR,
            borderColor: "#059669",
            borderSize: 2,
            x: 200 * Math.cos(angle),
            y: 200 * Math.sin(angle),
            nodeType: "company"
          });
        });

        // Add skill nodes (smaller circles with distinct color)
        skills.forEach((skill, index) => {
          const angle = (index * 2 * Math.PI) / skills.length + Math.PI/6;
          graph.addNode(skill.id, {
            label: skill.name,
            size: 8,
            color: SKILL_COLOR,
            x: 280 * Math.cos(angle),
            y: 280 * Math.sin(angle),
            nodeType: "skill"
          });
        });

        // Add university nodes (larger circles)
        universities.forEach((uni, index) => {
          const angle = (index * 2 * Math.PI) / universities.length;
          graph.addNode(uni.id, {
            label: uni.name,
            size: 22,
            color: UNIVERSITY_COLOR,
            borderColor: "#D97706",
            borderSize: 3,
            x: 60 * Math.cos(angle),
            y: 60 * Math.sin(angle),
            nodeType: "university"
          });
        });

        // Add event nodes (medium circles with distinct color)
        events.forEach((event, index) => {
          const angle = (index * 2 * Math.PI) / events.length + Math.PI/3;
          graph.addNode(event.id, {
            label: event.name,
            size: 12,
            color: EVENT_COLOR,
            x: 160 * Math.cos(angle),
            y: 160 * Math.sin(angle),
            nodeType: "event"
          });
        });

        // Add meaningful connections with labels
        const connections = [
          // Students to universities
          { from: "alice", to: "stanford", label: "studies at", type: "arrow" },
          { from: "bob", to: "mit", label: "studies at", type: "arrow" },
          { from: "carol", to: "berkeley", label: "studies at", type: "arrow" },
          { from: "david", to: "mit", label: "grad student", type: "arrow" },
          { from: "emma", to: "stanford", label: "studies at", type: "arrow" },
          { from: "frank", to: "berkeley", label: "studies at", type: "arrow" },
          
          // Student connections (networking)
          { from: "alice", to: "bob", label: "friends", type: "line" },
          { from: "bob", to: "frank", label: "CS study group", type: "line" },
          { from: "carol", to: "david", label: "project partners", type: "line" },
          { from: "alice", to: "emma", label: "hackathon team", type: "line" },
          { from: "david", to: "frank", label: "research collaborators", type: "line" },
          { from: "carol", to: "alice", label: "business club", type: "line" },
          
          // Students to companies (internships/applications)
          { from: "alice", to: "google", label: "interned at", type: "arrow" },
          { from: "bob", to: "microsoft", label: "applied to", type: "arrow" },
          { from: "carol", to: "goldman", label: "summer analyst", type: "arrow" },
          { from: "david", to: "google", label: "research intern", type: "arrow" },
          { from: "emma", to: "apple", label: "design intern", type: "arrow" },
          { from: "frank", to: "microsoft", label: "SWE intern", type: "arrow" },
          
          // Students to skills
          { from: "alice", to: "react", label: "proficient", type: "arrow" },
          { from: "alice", to: "python", label: "expert", type: "arrow" },
          { from: "bob", to: "python", label: "knows", type: "arrow" },
          { from: "david", to: "machine-learning", label: "specialist", type: "arrow" },
          { from: "emma", to: "design", label: "expert", type: "arrow" },
          { from: "carol", to: "finance", label: "studies", type: "arrow" },
          { from: "carol", to: "consulting", label: "interested in", type: "arrow" },
          { from: "frank", to: "python", label: "proficient", type: "arrow" },
          
          // Students to events
          { from: "alice", to: "career-fair", label: "attended", type: "arrow" },
          { from: "bob", to: "tech-talk", label: "attended", type: "arrow" },
          { from: "david", to: "hackathon", label: "winner", type: "arrow" },
          { from: "emma", to: "hackathon", label: "participant", type: "arrow" },
          { from: "frank", to: "career-fair", label: "networked at", type: "arrow" },
          { from: "carol", to: "career-fair", label: "recruited at", type: "arrow" }
        ];

        connections.forEach((connection, index) => {
          if (graph.hasNode(connection.from) && graph.hasNode(connection.to)) {
            // Check if edge already exists to avoid duplicates
            if (!graph.hasEdge(connection.from, connection.to)) {
              // Use the correct sigma.js/graphology syntax
              graph.addEdge(connection.from, connection.to, {
                label: connection.label,
                type: connection.type || "line",
                size: 2,
                color: "#94A3B8"
              });
            }
          }
        });

        // Create sigma instance with enhanced settings
        sigma = new Sigma(graph, containerRef.current, {
          renderLabels: true,
          renderEdgeLabels: true,
          enableEdgeEvents: true,
          labelFont: "Arial, sans-serif",
          labelSize: 12,
          labelWeight: "normal",
          edgeLabelFont: "Arial, sans-serif", 
          edgeLabelSize: 9,
          edgeLabelWeight: "normal",
          defaultNodeColor: STUDENT_COLOR,
          defaultEdgeColor: '#94A3B8'
        });

        // Add click event listener
        sigma.on('clickNode', ({ node }) => {
          const nodeData = graph.getNodeAttributes(node);
          
          // If it's a student node, call the click handler
          if (nodeData.nodeType === 'student' && nodeData.studentData && onNodeClick) {
            // Create a mock person object that matches the expected structure
            const mockPerson = {
              id: node,
              name: nodeData.label,
              ...nodeData.studentData
            };
            onNodeClick(mockPerson);
          }
        });

        // Setup force layout
        layout = new ForceSupervisor(graph, {
          attraction: 0.0005,
          repulsion: 0.1,
          gravity: 0.0001,
          inertia: 0.6,
          maxMove: 200
        });
        
        layout.start();

        // Store refs
        sigmaRef.current = sigma;
        layoutRef.current = layout;
        
        // Stop loading after a short delay
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);

      } catch (err) {
        console.error('Error initializing graph:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initializeGraph();

    // Cleanup function
    return () => {
      if (layoutRef.current) {
        layoutRef.current.kill();
      }
      if (sigmaRef.current) {
        sigmaRef.current.kill();
      }
    };
  }, [onNodeClick, isMounted]);

  // Don't render anything on server side
  if (!isMounted) {
    return (
      <div className="relative w-full h-full">
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Initializing...</span>
          </div>
        </div>
        <div className="w-full h-full" style={{ minHeight: '500px' }} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading network...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-center p-6">
            <div className="text-red-600 mb-2">⚠️ Error loading network graph</div>
            <div className="text-sm text-gray-600">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Network Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-700"></div>
            <span>Students (Large)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-700"></div>
            <span>Companies (Medium)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>Skills (Small)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-amber-700"></div>
            <span>Universities (Largest)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Events (Medium)</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md border border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div>• Click students to view profiles</div>
          <div>• Drag to pan, scroll to zoom</div>
          <div>• Lines show relationships</div>
          <div>• Explore your network connections</div>
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;