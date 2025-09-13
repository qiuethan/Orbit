'use client';

import { isOverdue } from '../../../utils/personUtils';

export default function SidebarFooter({ 
  isWorkflowPage, 
  people, 
  personWorkflows 
}) {
  if (isWorkflowPage) {
    return (
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-semibold text-gray-900 text-xl">{personWorkflows.length}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div>
            <div className="font-semibold text-green-600 text-xl">
              {personWorkflows.filter(w => w.status === 'active').length}
            </div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div>
            <div className="font-semibold text-red-600 text-xl">
              {personWorkflows.filter(w => w.priority === 'high').length}
            </div>
            <div className="text-sm text-gray-500">High Priority</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="font-semibold text-gray-900 text-xl">{people.length}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div>
          <div className="font-semibold text-red-600 text-xl">
            {people.filter(p => p.status === 'hot_lead').length}
          </div>
          <div className="text-sm text-gray-500">Hot Leads</div>
        </div>
        <div>
          <div className="font-semibold text-orange-600 text-xl">
            {people.filter(p => isOverdue(p.nextFollowUp)).length}
          </div>
          <div className="text-sm text-gray-500">Overdue</div>
        </div>
      </div>
    </div>
  );
}
