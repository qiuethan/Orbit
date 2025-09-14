'use client';

import { 
  MoreVertical, 
  Mail, 
  Phone, 
  Linkedin, 
  Edit3, 
  Archive,
  Users
} from 'lucide-react';
import { getStatusBadgeColor, isOverdue } from '../../../utils/personUtils';
import ActionMenu from './ActionMenu';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function PersonItem({ 
  person, 
  isActive, 
  showActionMenu, 
  onSelect, 
  onActionMenuToggle, 
  onPersonAction 
}) {
  const isOverdueFollowUp = isOverdue(person.nextFollowUp);

  const actionMenuItems = [
    { id: 'email', label: 'Send Email', icon: Mail },
    { id: 'call', label: 'Call', icon: Phone },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { id: 'edit', label: 'Edit Contact', icon: Edit3 },
    { id: 'archive', label: 'Archive', icon: Archive, className: 'text-orange-600 hover:bg-orange-50' }
  ];


  return (
    <div
      onClick={() => onSelect(person)}
      className={classNames(
        'group relative cursor-pointer transition-all duration-150',
        'hover:bg-gray-50 border-b border-gray-100',
        isActive ? 'bg-blue-50' : ''
      )}
    >
      <div className="px-3 py-1.5">
        {/* Main content row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img 
              src={person.avatar} 
              alt={person.name}
              className="w-7 h-7 rounded-full object-cover"
            />
            {isOverdueFollowUp && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name and action button row */}
            <div className="flex items-start justify-between mb-0.5">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 text-sm leading-tight truncate">
                  {person.name}
                </h3>
              </div>

              {/* Action menu trigger */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onActionMenuToggle(person.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-all duration-150 ml-2"
              >
                <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Title and company */}
            <p className="text-xs text-gray-500 leading-tight mb-0.5 truncate">
              {person.title} · {person.company}
            </p>

            {/* LLM Description */}
            {person.llmDescription && (
              <p className="text-xs text-gray-600 leading-tight mb-1 overflow-hidden"
                 style={{ 
                   display: '-webkit-box',
                   WebkitLineClamp: 1,
                   WebkitBoxOrient: 'vertical'
                 }}>
                {person.llmDescription}
              </p>
            )}

            {/* Metadata row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {person.mutualConnections > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Users className="w-3 h-3" />
                    {person.mutualConnections}
                  </span>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {person.email && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPersonAction('email', person, e);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors duration-150"
                    title="Email"
                  >
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
                {person.phone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPersonAction('call', person, e);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors duration-150"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
                {person.linkedIn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPersonAction('linkedin', person, e);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors duration-150"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500"></div>
      )}

      {/* Action menu */}
      {showActionMenu && (
        <div className="absolute top-2 right-3 z-50">
          <ActionMenu 
            items={actionMenuItems}
            onAction={(actionId, e) => onPersonAction(actionId, person, e)}
          />
        </div>
      )}
    </div>
  );
}