'use client';

import { 
  Users, 
  Linkedin, 
  ExternalLink, 
  Calendar,
  MapPin,
  Building,
  MessageCircle
} from 'lucide-react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const getConnectionTypeColor = (type) => {
  const colors = {
    'worked_together': 'bg-blue-100 text-blue-800',
    'university': 'bg-purple-100 text-purple-800', 
    'industry_event': 'bg-green-100 text-green-800',
    'investor_network': 'bg-yellow-100 text-yellow-800',
    'mutual_connection': 'bg-gray-100 text-gray-800',
    'family': 'bg-pink-100 text-pink-800'
  };
  return colors[type] || colors['mutual_connection'];
};

const getStrengthIndicator = (strength) => {
  const indicators = {
    'strong': { color: 'bg-green-500', width: 'w-full' },
    'medium': { color: 'bg-yellow-500', width: 'w-2/3' },
    'weak': { color: 'bg-red-500', width: 'w-1/3' }
  };
  return indicators[strength] || indicators['medium'];
};

export default function ConnectionsTable({ connections = [] }) {
  console.log('ConnectionsTable received connections:', connections);
  
  if (!connections || connections.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Connections
        </h3>
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No connections found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Connections ({connections.length})
        </h3>
      </div>
      
      <div className="overflow-hidden">
        <div className="divide-y divide-gray-100">
          {connections.map((connection) => {
            const strengthIndicator = getStrengthIndicator(connection.strength);
            
            return (
              <div key={connection.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <img 
                    src={connection.avatar} 
                    alt={connection.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  
                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {connection.name}
                        </h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {connection.title} at {connection.company}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {connection.linkedInConnection && (
                          <button 
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="LinkedIn Connection"
                          >
                            <Linkedin className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="View Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Relationship info */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={classNames(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        getConnectionTypeColor(connection.connectionType)
                      )}>
                        {connection.relationship}
                      </span>
                      
                      {/* Connection strength */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Strength:</span>
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={classNames(
                              'h-full rounded-full transition-all',
                              strengthIndicator.color,
                              strengthIndicator.width
                            )}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Context */}
                    <p className="text-xs text-gray-600 mb-2">
                      {connection.context}
                    </p>
                    
                    {/* Metadata row */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Last: {formatDate(connection.lastInteraction)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {connection.mutualConnections} mutual
                        </span>
                      </div>
                      
                      {connection.notes && (
                        <button 
                          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title={connection.notes}
                        >
                          <MessageCircle className="w-3 h-3" />
                          Note
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
