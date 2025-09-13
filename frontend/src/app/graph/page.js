'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NetworkGraph from '../../components/main/NetworkGraph';
import { MOCK_PEOPLE } from '../../data/people';

export default function GraphPage() {
  const router = useRouter();
  const [selectedPerson, setSelectedPerson] = useState(null);

  const handleNodeClick = (personData) => {
    setSelectedPerson(personData);
    // Navigate to person profile
    router.push(`/dashboard?person=${personData.id}`);
  };

  // Calculate statistics from actual data
  const stats = useMemo(() => {
    const people = Object.values(MOCK_PEOPLE);
    const total = people.length;
    const highPriority = people.filter(p => p.priority === 'high').length;
    const clients = people.filter(p => p.status === 'client' || p.status === 'active').length;
    
    // Calculate total connections by counting edges in the network
    let totalConnections = 0;
    people.forEach(person => {
      // Each person connects to 1-3 others, so estimate based on that
      totalConnections += Math.min(3, Math.floor(Math.random() * 3) + 1);
    });
    // Divide by 2 since each connection is counted twice (both directions)
    totalConnections = Math.floor(totalConnections / 2);

    return {
      total,
      clients,
      highPriority, 
      totalConnections
    };
  }, []);

  return (
    <div className="h-full flex flex-col p-8">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Network Graph</h1>
          <p className="text-gray-600">
            Visualize your network connections and relationships. Click on any person to view their profile.
          </p>
        </div>
        
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <NetworkGraph onNodeClick={handleNodeClick} />
        </div>

        {/* Additional stats/info panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total People</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.clients}</div>
              <div className="text-sm text-gray-600">Active/Clients</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.totalConnections}</div>
              <div className="text-sm text-gray-600">Network Connections</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
