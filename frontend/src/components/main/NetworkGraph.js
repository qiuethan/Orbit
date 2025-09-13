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

        // Color schemes for different node types
        const COLORS = {
          person: '#3B82F6', // Blue
          high: '#EF4444', // Red for high priority
          medium: '#F59E0B', // Amber for medium priority
          low: '#6B7280', // Gray for low priority
          active: '#10B981', // Green for active status
          prospect: '#3B82F6', // Blue for prospects
          client: '#10B981', // Green for clients
          archived: '#9CA3AF' // Light gray
        };

        // Add nodes for each person
        const people = Object.values(MOCK_PEOPLE);
        people.forEach((person, index) => {
          // Use priority for color coding since that's what we have in the transformed data
          const color = COLORS[person.priority] || COLORS[person.status] || COLORS.person;
          
          graph.addNode(person.id, {
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
            size: 12,
            label: person.name,
            color,
            type: 'circle',
            // Store person data for interactions
            personData: person
          });
        });

        // Add edges based on connections and create a network effect
        people.forEach((person, personIndex) => {
          // Connect to a few other people to create a network
          const connectionTargets = people
            .filter((_, index) => index !== personIndex)
            .slice(0, Math.min(3, Math.floor(Math.random() * 4) + 1)); // 1-3 connections per person

          connectionTargets.forEach((target, connectionIndex) => {
            if (!graph.hasEdge(person.id, target.id)) {
              // Determine connection strength based on some criteria
              const isStrongConnection = personIndex % 3 === connectionIndex % 3;
              const strength = isStrongConnection ? 'strong' : connectionIndex === 0 ? 'medium' : 'weak';
              const strokeWidth = strength === 'strong' ? 3 : strength === 'medium' ? 2 : 1;
              const alpha = strength === 'strong' ? 0.8 : strength === 'medium' ? 0.6 : 0.4;
              
              // Create meaningful relationship labels
              const relationships = [
                'Former colleague',
                'Industry contact', 
                'University connection',
                'Business partner',
                'Mutual connection',
                'Conference contact'
              ];
              const relationship = relationships[connectionIndex % relationships.length];
              
              graph.addEdge(person.id, target.id, {
                size: strokeWidth,
                color: `rgba(156, 163, 175, ${alpha})`,
                type: 'line',
                label: relationship,
                // Store metadata for tooltips/interactions
                relationship,
                strength
              });
            }
          });
        });

        // Create sigma instance
        sigma = new Sigma(graph, containerRef.current, {
          renderEdgeLabels: false, // Disable edge labels for cleaner look
          defaultNodeColor: COLORS.person,
          defaultEdgeColor: '#E5E7EB',
          nodeReducer: (node, data) => {
            // Highlight logic can be added here
            return { ...data };
          },
          edgeReducer: (edge, data) => {
            return { ...data };
          }
        });

        // Add click event listener
        sigma.on('clickNode', ({ node }) => {
          const nodeData = graph.getNodeAttribute(node, 'personData');
          if (onNodeClick && nodeData) {
            onNodeClick(nodeData);
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
        <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-200" style={{ minHeight: '500px' }} />
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
        className="w-full h-full bg-gray-50 rounded-lg border border-gray-200"
        style={{ minHeight: '500px' }}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Priority Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>High Priority</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Medium Priority</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Low Priority</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Active/Client</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md border border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div>• Click nodes to view profiles</div>
          <div>• Drag to pan, scroll to zoom</div>
          <div>• Lines show connections</div>
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;