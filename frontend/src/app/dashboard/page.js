'use client';

import PersonProfile from '../../components/profile/PersonProfile';
import { useApp } from '../../context/AppContext';

export default function DashboardPage() {
  const { activePerson } = useApp();
  
  return (
    <div className="h-full">
      <PersonProfile person={activePerson} />
    </div>
  );
}
