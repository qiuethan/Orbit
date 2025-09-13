'use client';

import { useApp } from '../../context/AppContext';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const NewPersonNotification = () => {
  const { newPersonNotification, clearNewPersonNotification, setActivePerson } = useApp();

  if (!newPersonNotification) return null;

  const { person } = newPersonNotification;

  const handleViewPerson = () => {
    setActivePerson(person);
    clearNewPersonNotification();
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                New Person Added
              </p>
              <button
                onClick={clearNewPersonNotification}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mt-2 flex items-center space-x-3">
              {person.avatar && (
                <img
                  src={person.avatar}
                  alt={person.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium">{person.name}</p>
                <p className="text-xs text-gray-500">{person.title}</p>
                {person.company && (
                  <p className="text-xs text-gray-500">at {person.company}</p>
                )}
              </div>
            </div>
            
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleViewPerson}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                View Profile
              </button>
              <button
                onClick={clearNewPersonNotification}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPersonNotification;
