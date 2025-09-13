'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NetworkGraph from '../../components/main/NetworkGraph';

export default function GraphPage() {
  const router = useRouter();
  const [selectedPerson, setSelectedPerson] = useState(null);

  const handleNodeClick = (personData) => {
    setSelectedPerson(personData);
    // Navigate to person profile
    router.push(`/dashboard?person=${personData.id}`);
  };


  return (
    <div className="h-full w-full">
      <NetworkGraph onNodeClick={handleNodeClick} />
    </div>
  );
}
