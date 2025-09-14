import React, { useEffect, useRef, useState } from 'react';

const HackTheNorthNetworkGraph = () => {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const loadSigma = async () => {
      try {
        const [{ default: Graph }, { default: Sigma }] = await Promise.all([
          import('graphology'),
          import('sigma')
        ]);

        // Load network data from JSON file
        const response = await fetch('./htn-network-data.json');
        const networkData = await response.json();

        const graph = new Graph();

        // Create nodes from JSON data
        networkData.nodes.forEach(node => {
          graph.addNode(node.id, {
            label: node.label,
            size: node.size,
            color: node.color,
            type: "circle", // Force all nodes to use circle type
            x: 0,
            y: 0
          });
        });

        // Add edges from JSON data
        networkData.edges.forEach(edge => {
          if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
            graph.addEdge(edge.source, edge.target, {
              type: edge.type,
              label: edge.label,
              size: edge.size
            });
          }
        });

        // Position nodes in a circle (exactly like original)
        graph.nodes().forEach((node, i) => {
          const angle = (i * 2 * Math.PI) / graph.order;
          graph.setNodeAttribute(node, "x", 100 * Math.cos(angle));
          graph.setNodeAttribute(node, "y", 100 * Math.sin(angle));
        });

        // Create Sigma instance (same structure as original)
        const renderer = new Sigma(graph, containerRef.current, {
          // We don't have to declare edgeProgramClasses here, because we only use the default ones ("line" and "arrow")
          renderEdgeLabels: true,
        });

        // State for hover highlighting
        let hoveredNode = null;
        let hoveredNeighbors = new Set();

        // Update node and edge appearance based on hover state
        const updateHoverState = () => {
          graph.nodes().forEach(node => {
            if (hoveredNode) {
              // If we're hovering, dim nodes that aren't the hovered node or its neighbors
              const isRelevant = node === hoveredNode || hoveredNeighbors.has(node);
              graph.setNodeAttribute(node, 'highlighted', isRelevant);
              // Make non-relevant nodes more transparent
              const originalColor = graph.getNodeAttribute(node, 'color');
              if (isRelevant) {
                graph.setNodeAttribute(node, 'color', originalColor);
              } else {
                // Make it more transparent by adjusting the color
                graph.setNodeAttribute(node, 'color', originalColor + '40'); // Add alpha
              }
            } else {
              // Not hovering, show all nodes normally
              graph.setNodeAttribute(node, 'highlighted', true);
              // Restore original colors (remove any alpha)
              const color = graph.getNodeAttribute(node, 'color');
              if (color.length > 7) { // Has alpha channel
                graph.setNodeAttribute(node, 'color', color.substring(0, 7));
              }
            }
          });

          graph.edges().forEach(edge => {
            if (hoveredNode) {
              // Only show edges connected to the hovered node
              const [source, target] = graph.extremities(edge);
              const isRelevant = source === hoveredNode || target === hoveredNode;
              graph.setEdgeAttribute(edge, 'hidden', !isRelevant);
            } else {
              // Show all edges when not hovering
              graph.setEdgeAttribute(edge, 'hidden', false);
            }
          });

          renderer.refresh();
        };

        // Add hover event listeners
        renderer.on('enterNode', ({ node }) => {
          hoveredNode = node;
          hoveredNeighbors = new Set(graph.neighbors(node));
          updateHoverState();
        });

        renderer.on('leaveNode', () => {
          hoveredNode = null;
          hoveredNeighbors.clear();
          updateHoverState();
        });

        // Create the spring layout and start it (same as original)
        const simulateLayout = () => {
          const nodes = graph.nodes();
          let iterations = 0;
          const maxIterations = 300;
          
          const animate = () => {
            if (iterations >= maxIterations) return;
            
            nodes.forEach(node => {
              let fx = 0, fy = 0;
              const nodePos = { 
                x: graph.getNodeAttribute(node, "x"), 
                y: graph.getNodeAttribute(node, "y") 
              };
              
              // Repulsion from other nodes
              nodes.forEach(otherNode => {
                if (node === otherNode) return;
                
                const otherPos = {
                  x: graph.getNodeAttribute(otherNode, "x"),
                  y: graph.getNodeAttribute(otherNode, "y")
                };
                
                const dx = nodePos.x - otherPos.x;
                const dy = nodePos.y - otherPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                const repulsion = 2000 / (distance * distance);
                fx += (dx / distance) * repulsion;
                fy += (dy / distance) * repulsion;
              });
              
              // Attraction to connected nodes
              graph.neighbors(node).forEach(neighbor => {
                const neighborPos = {
                  x: graph.getNodeAttribute(neighbor, "x"),
                  y: graph.getNodeAttribute(neighbor, "y")
                };
                
                const dx = neighborPos.x - nodePos.x;
                const dy = neighborPos.y - nodePos.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                const attraction = distance * 0.01;
                fx += dx * attraction;
                fy += dy * attraction;
              });
              
              // Apply forces with damping
              const damping = 0.9;
              const newX = nodePos.x + fx * 0.1 * damping;
              const newY = nodePos.y + fy * 0.1 * damping;
              
              graph.setNodeAttribute(node, "x", newX);
              graph.setNodeAttribute(node, "y", newY);
            });
            
            renderer.refresh();
            iterations++;
            
            if (iterations < maxIterations) {
              setTimeout(animate, 50);
            }
          };
          
          setTimeout(animate, 100);
        };

        // Start the layout
        simulateLayout();

        sigmaRef.current = renderer;

        // Add click handlers
        renderer.on("clickNode", ({ node }) => {
          console.log(`Clicked on: ${node}`);
        });

        renderer.on("clickEdge", ({ edge }) => {
          const label = graph.getEdgeAttribute(edge, "label");
          console.log(`Clicked on edge: ${label}`);
        });

      } catch (error) {
        console.error('Error loading Sigma.js or JSON data:', error);
      }
    };

    loadSigma();

    // Cleanup function (same as original)
    return () => {
      if (sigmaRef.current) {
        sigmaRef.current.kill();
      }
    };
  }, [isClient]);

  if (!isClient) {
    return <div className="w-full h-screen bg-white"></div>;
  }

  return (
    <div className="w-full h-screen bg-white relative">
      {/* Minimal Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200">
        <div className="text-xs font-medium text-gray-700 mb-2">Network</div>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Person" className="w-4 h-4" />
            <span>People</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="https://cdn-icons-png.flaticon.com/512/854/854901.png" alt="Location" className="w-4 h-4" />
            <span>Locations</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="https://cdn-icons-png.flaticon.com/512/3079/3079410.png" alt="Company" className="w-4 h-4" />
            <span>Companies</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="https://cdn-icons-png.flaticon.com/512/2103/2103633.png" alt="Skill" className="w-4 h-4" />
            <span>Skills</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="https://cdn-icons-png.flaticon.com/512/2103/2103665.png" alt="Interest" className="w-4 h-4" />
            <span>Interests</span>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
          Hover to explore connections
        </div>
      </div>
      
      <div
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
};

export default HackTheNorthNetworkGraph;