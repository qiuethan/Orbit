import {
    EnvelopeIcon,
    PhoneIcon,
    CalendarIcon,
    ChatBubbleLeftIcon,
    DocumentTextIcon,
    BellIcon,
    CloudIcon,
    CogIcon,
  } from '@heroicons/react/24/outline';
  
  export const ACTION_TYPES = [
    {
      type: 'email',
      label: 'Email',
      icon: EnvelopeIcon,
      category: 'Communication',
      defaultConfig: {
        recipient: 'user@example.com',
        subject: 'New Message',
        message: 'Hello,\n\nThis is a new email message.\n\nBest regards'
      }
    },
    {
      type: 'phone',
      label: 'Phone Call',
      icon: PhoneIcon,
      category: 'Communication',
      defaultConfig: {
        recipient: '+1-555-123-4567',
        message: 'Hello, this is a follow-up call regarding our previous conversation.'
      }
    },
    {
      type: 'calendar',
      label: 'Calendar',
      icon: CalendarIcon,
      category: 'Scheduling',
      defaultConfig: {
        title: 'Meeting',
        attendees: 'user@example.com',
        duration: '30 minutes',
        date: new Date().toISOString().split('T')[0],
        time: '2:00 PM',
        notes: 'Meeting agenda to be discussed'
      }
    },
    {
      type: 'slack',
      label: 'Slack',
      icon: ChatBubbleLeftIcon,
      category: 'Communication',
      defaultConfig: {
        channel: '#general',
        message: 'New update from the workflow system.'
      }
    },
    {
      type: 'document',
      label: 'Document',
      icon: DocumentTextIcon,
      category: 'Files',
      defaultConfig: {
        title: 'New Document',
        content: 'Document content here...',
        format: 'pdf'
      }
    },
    {
      type: 'notification',
      label: 'Notification',
      icon: BellIcon,
      category: 'Alerts',
      defaultConfig: {
        title: 'Alert',
        message: 'This is a notification message',
        priority: 'medium'
      }
    },
    {
      type: 'api',
      label: 'API Call',
      icon: CloudIcon,
      category: 'Integration',
      defaultConfig: {
        url: 'https://api.example.com/endpoint',
        method: 'GET',
        headers: '{}',
        body: '{}'
      }
    },
    {
      type: 'automation',
      label: 'Automation',
      icon: CogIcon,
      category: 'Logic',
      defaultConfig: {
        trigger: 'manual',
        conditions: '{}',
        actions: '{}'
      }
    },
  ];
  
  // Helper function to get action type by type string
  export const getActionType = (type) => {
    return ACTION_TYPES.find(actionType => actionType.type === type);
  };
  
  // Helper function to get actions by category
  export const getActionsByCategory = () => {
    return ACTION_TYPES.reduce((acc, action) => {
      if (!acc[action.category]) {
        acc[action.category] = [];
      }
      acc[action.category].push(action);
      return acc;
    }, {});
  };