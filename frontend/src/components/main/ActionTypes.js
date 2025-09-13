import {
    EnvelopeIcon,
    PhoneIcon,
    CalendarIcon,
    UserGroupIcon,
    CameraIcon,
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
      label: 'Schedule Meeting',
      icon: CalendarIcon,
      category: 'Scheduling',
      defaultConfig: {
        title: 'Business Meeting',
        attendees: 'user@example.com',
        duration: '30 minutes',
        date: new Date().toISOString().split('T')[0],
        time: '2:00 PM',
        notes: 'Discussion about partnership opportunities'
      }
    },
    {
      type: 'linkedin',
      label: 'LinkedIn Outreach',
      icon: UserGroupIcon,
      category: 'Social Networking',
      defaultConfig: {
        action: 'connect',
        message: 'Hi [Name], I would like to connect and explore potential collaboration opportunities.',
        profile: 'https://linkedin.com/in/username'
      }
    },
    {
      type: 'instagram',
      label: 'Instagram Engagement',
      icon: CameraIcon,
      category: 'Social Media',
      defaultConfig: {
        action: 'follow',
        message: 'Great content! Looking forward to your updates.',
        profile: 'https://instagram.com/username'
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