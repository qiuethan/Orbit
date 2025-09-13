// People data powered by mock_data.json
import { PEOPLE_FROM_MOCK_DATA } from './dataAdapter';

// Use the transformed data from mock_data.json
export const MOCK_PEOPLE = PEOPLE_FROM_MOCK_DATA;

// Legacy mock data (kept for reference, but replaced by real data)
const LEGACY_MOCK_PEOPLE = {
  'person-sarah-johnson': {
    id: 'person-sarah-johnson',
    name: 'Sarah Johnson',
    title: 'VP of Engineering',
    company: 'TechCorp',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1-555-987-6543',
    linkedIn: 'https://linkedin.com/in/sarahjohnson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
    status: 'hot_lead', // cold_lead, warm_lead, hot_lead, client, archived
    priority: 'high',
    llmDescription: 'Senior engineering executive with 12+ years experience scaling technical teams. Known for driving innovation in cloud infrastructure and leading digital transformation initiatives. Strong advocate for DevOps practices and engineering excellence.',
    lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    nextFollowUp: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // tomorrow
    addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    tags: ['enterprise', 'engineering', 'decision_maker'],
    stage: 'negotiation', // prospecting, contacted, responding, meeting_scheduled, negotiation, closed_won, closed_lost
    notes: [
      {
        id: 'note-1',
        type: 'user',
        content: 'Very interested in our enterprise solution. Mentioned they\'re evaluating 3 vendors.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'note-2', 
        type: 'system',
        content: '📧 Follow-up email sent about demo scheduling',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    interactions: [
      {
        id: 'interaction-1',
        type: 'email',
        title: 'Demo request follow-up',
        description: 'Sent email about scheduling product demo',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        outcome: 'Positive response - demo scheduled for next week'
      },
      {
        id: 'interaction-2',
        type: 'phone',
        title: 'Initial discovery call',
        description: '30min call to understand their requirements',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        outcome: 'Qualified as enterprise opportunity, budget confirmed'
      }
    ],
    mutualConnections: 18,
    
    // Extensive scraped data
    scrapedData: {
      location: 'San Francisco, CA',
      timezone: 'PST',
      languages: ['English', 'Spanish'],
      education: [
        {
          school: 'Stanford University',
          degree: 'MS Computer Science',
          year: '2012',
          details: 'Specialized in Distributed Systems and Machine Learning'
        },
        {
          school: 'UC Berkeley',
          degree: 'BS Electrical Engineering',
          year: '2010',
          details: 'Summa Cum Laude, Phi Beta Kappa'
        }
      ],
      workHistory: [
        {
          company: 'TechCorp',
          title: 'VP of Engineering',
          period: '2020 - Present',
          description: 'Leading 120+ engineers across 8 teams. Scaled infrastructure to handle 10M+ users.'
        },
        {
          company: 'CloudScale Inc',
          title: 'Senior Engineering Manager',
          period: '2018 - 2020',
          description: 'Built cloud platform team from 5 to 35 engineers. Led migration to microservices.'
        },
        {
          company: 'StartupXYZ',
          title: 'Lead Software Engineer',
          period: '2015 - 2018',
          description: 'Early employee #8. Built core platform that processed $50M+ in transactions.'
        }
      ],
      techStack: ['Python', 'Go', 'Kubernetes', 'AWS', 'PostgreSQL', 'Redis', 'React'],
      certifications: ['AWS Solutions Architect', 'Kubernetes Certified Administrator'],
      publications: [
        'Scaling Microservices at TechCorp - Tech Blog (2023)',
        'Building Resilient Distributed Systems - InfoQ (2022)'
      ],
      socialMedia: {
        twitter: '@sarahjtech',
        github: 'sarah-johnson-dev',
        medium: '@sarahjohnson'
      },
      interests: ['Rock climbing', 'Photography', 'Sustainable tech', 'Mentoring'],
      achievements: [
        'Led team to 99.99% uptime for 18 months straight',
        'Reduced infrastructure costs by 40% while scaling 3x',
        'Mentor at Girls Who Code (2019-Present)'
      ]
    },
    
    // Connections - people they know and how
    connections: [
      {
        id: 'person-john-smith',
        name: 'John Smith',
        company: 'StartupCo',
        title: 'Marketing Director',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        relationship: 'Former colleague',
        connectionType: 'worked_together',
        context: 'Worked together at StartupXYZ (2015-2017)',
        strength: 'strong',
        lastInteraction: '2024-01-15',
        mutualConnections: 12,
        linkedInConnection: true,
        notes: 'Great marketing partner, understands technical products well'
      },
      {
        id: 'person-mike-chen',
        name: 'Mike Chen',
        company: 'InnovateLab',
        title: 'Founder & CEO',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        relationship: 'Industry contact',
        connectionType: 'industry_event',
        context: 'Met at TechCrunch Disrupt 2023',
        strength: 'medium',
        lastInteraction: '2023-12-08',
        mutualConnections: 8,
        linkedInConnection: true,
        notes: 'Innovative CEO, potential partnership opportunity'
      },
      {
        id: 'person-david-kim',
        name: 'David Kim',
        company: 'Google',
        title: 'Staff Software Engineer',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        relationship: 'University friend',
        connectionType: 'university',
        context: 'Stanford CS classmates (2010-2012)',
        strength: 'strong',
        lastInteraction: '2024-02-01',
        mutualConnections: 25,
        linkedInConnection: true,
        notes: 'Close friend, great technical advisor'
      },
      {
        id: 'person-emily-chen',
        name: 'Emily Chen',
        company: 'Venture Capital Partners',
        title: 'Partner',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        relationship: 'Investor network',
        connectionType: 'investor_network',
        context: 'TechCorp Series B investor',
        strength: 'medium',
        lastInteraction: '2024-01-28',
        mutualConnections: 15,
        linkedInConnection: true,
        notes: 'Key investor, valuable strategic advisor'
      }
    ]
  },
  'person-john-smith': {
    id: 'person-john-smith', 
    name: 'John Smith',
    title: 'Marketing Director',
    company: 'StartupCo',
    email: 'john.smith@startupco.com',
    phone: '+1-555-123-7890',
    linkedIn: 'https://linkedin.com/in/johnsmith',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    status: 'warm_lead',
    priority: 'medium',
    llmDescription: 'Creative marketing leader specializing in growth marketing and brand strategy for early-stage startups. Expert in digital campaigns, content marketing, and building scalable marketing operations from the ground up.',
    lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // day after tomorrow
    addedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['startup', 'marketing', 'small_business'],
    stage: 'responding',
    notes: [
      {
        id: 'note-3',
        type: 'user',
        content: 'Startup looking for growth tools. Budget is limited but growing fast.',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    interactions: [
      {
        id: 'interaction-3',
        type: 'email',
        title: 'Initial outreach',
        description: 'Cold email about marketing automation solutions',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        outcome: 'Opened email, clicked links, no response yet'
      }
    ],
    mutualConnections: 8,
    
    scrapedData: {
      location: 'Austin, TX',
      timezone: 'CST',
      languages: ['English'],
      education: [
        {
          school: 'University of Texas at Austin',
          degree: 'BBA Marketing',
          year: '2018',
          details: 'Focus on Digital Marketing and Consumer Psychology'
        }
      ],
      workHistory: [
        {
          company: 'StartupCo',
          title: 'Marketing Director',
          period: '2022 - Present',
          description: 'Leading growth marketing for B2B SaaS startup. Achieved 300% increase in qualified leads.'
        },
        {
          company: 'GrowthAgency',
          title: 'Senior Marketing Manager',
          period: '2020 - 2022',
          description: 'Managed marketing campaigns for 15+ B2B clients with $2M+ combined ad spend.'
        }
      ],
      techStack: ['HubSpot', 'Google Analytics', 'Facebook Ads', 'LinkedIn Ads', 'Figma'],
      achievements: [
        'Grew MRR from $50K to $200K in 18 months',
        'Built marketing team from 2 to 8 people',
        'Speaker at 3 marketing conferences'
      ],
      interests: ['Content creation', 'Podcasting', 'Travel', 'Fitness']
    },
    
    connections: [
      {
        id: 'person-sarah-johnson',
        name: 'Sarah Johnson',
        company: 'TechCorp',
        title: 'VP of Engineering',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        relationship: 'Former colleague',
        connectionType: 'worked_together',
        context: 'Worked together at StartupXYZ (2015-2017)',
        strength: 'strong',
        lastInteraction: '2024-01-15',
        mutualConnections: 12,
        linkedInConnection: true,
        notes: 'Great technical partner for product launches'
      }
    ]
  },
  'person-mike-chen': {
    id: 'person-mike-chen',
    name: 'Mike Chen',
    title: 'Founder & CEO',
    company: 'InnovateLab',
    email: 'mike@innovatelab.io',
    phone: '+1-555-456-1234',
    linkedIn: 'https://linkedin.com/in/mikechen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    llmDescription: 'Serial entrepreneur and technology visionary building cutting-edge AI solutions. Founded InnovateLab to democratize machine learning for SMBs. Previously exited two successful startups and holds multiple patents in ML algorithms.',
    status: 'cold_lead',
    priority: 'high',
    lastContact: null,
    nextFollowUp: new Date(Date.now() + 0 * 24 * 60 * 60 * 1000).toISOString(), // today
    addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // yesterday
    tags: ['founder', 'tech', 'innovator'],
    stage: 'prospecting',
    notes: [
      {
        id: 'note-4',
        type: 'user',
        content: 'Found through LinkedIn. Company is developing AI tools, could be good fit for our platform.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    interactions: []
  },
  'person-lisa-wang': {
    id: 'person-lisa-wang',
    name: 'Lisa Wang',
    title: 'Head of Operations',
    company: 'Global Dynamics',
    email: 'lisa.wang@globaldynamics.com',
    phone: '+1-555-789-0123',
    linkedIn: 'https://linkedin.com/in/lisawang',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    status: 'client',
    priority: 'medium',
    llmDescription: 'Operations excellence expert specializing in process optimization and global supply chain management. Led digital transformation initiatives across 15+ countries and consistently delivered 20%+ efficiency improvements.',
    lastContact: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    nextFollowUp: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // in 30 days
    addedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
    tags: ['existing_client', 'operations', 'enterprise'],
    stage: 'closed_won',
    notes: [
      {
        id: 'note-5',
        type: 'user',
        content: 'Successfully onboarded 6 months ago. Happy with the service, potential for expansion.',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    interactions: [
      {
        id: 'interaction-4',
        type: 'email',
        title: 'Quarterly check-in',
        description: 'Regular client check-in and satisfaction survey',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        outcome: 'Very satisfied, interested in additional features'
      }
    ]
  },
  'person-alex-rodriguez': {
    id: 'person-alex-rodriguez',
    name: 'Alex Rodriguez',
    title: 'Product Manager',
    company: 'NextGen Solutions',
    email: 'alex.rodriguez@nextgen.com',
    phone: '+1-555-321-6789',
    linkedIn: 'https://linkedin.com/in/alexrodriguez',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    status: 'warm_lead',
    priority: 'low',
    llmDescription: 'Strategic product manager with deep expertise in fintech and blockchain solutions. Leading product development for next-generation payment platforms and has successfully launched 3 products that achieved 1M+ users.',
    lastContact: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // next week
    addedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks ago
    tags: ['product', 'saas', 'mid_market'],
    stage: 'meeting_scheduled',
    notes: [
      {
        id: 'note-6',
        type: 'user',
        content: 'Interested but timeline is uncertain. Said to follow up in Q2.',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    interactions: [
      {
        id: 'interaction-5',
        type: 'calendar',
        title: 'Product demo scheduled',
        description: 'Demo meeting scheduled for next week',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        outcome: null
      }
    ]
  }
};

// Helper functions
export const getStatusColor = (status) => {
  const colors = {
    cold_lead: 'text-gray-500',
    warm_lead: 'text-yellow-600',
    hot_lead: 'text-red-600',
    client: 'text-green-600',
    archived: 'text-gray-400'
  };
  return colors[status] || 'text-gray-500';
};

export const getStatusBadgeColor = (status) => {
  const colors = {
    cold_lead: 'bg-gray-100 text-gray-700',
    warm_lead: 'bg-yellow-100 text-yellow-700',
    hot_lead: 'bg-red-100 text-red-700',
    client: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-500'
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export const getPriorityColor = (priority) => {
  const colors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  };
  return colors[priority] || 'text-gray-500';
};

export const getStageColor = (stage) => {
  const colors = {
    prospecting: 'text-blue-600',
    contacted: 'text-cyan-600',
    responding: 'text-purple-600',
    meeting_scheduled: 'text-orange-600',
    negotiation: 'text-red-600',
    closed_won: 'text-green-600',
    closed_lost: 'text-gray-500'
  };
  return colors[stage] || 'text-gray-500';
};

// People API functions
export const peopleApi = {
  // Get all people
  getPeople: () => {
    return Promise.resolve(Object.values(MOCK_PEOPLE));
  },

  // Get specific person by ID
  getPerson: (personId) => {
    return Promise.resolve(MOCK_PEOPLE[personId] || null);
  },

  // Add new person
  addPerson: (personData) => {
    const newPersonId = `person-${Date.now()}`;
    const newPerson = {
      id: newPersonId,
      ...personData,
      addedAt: new Date().toISOString(),
      notes: [],
      interactions: []
    };
    MOCK_PEOPLE[newPersonId] = newPerson;
    return Promise.resolve(newPerson);
  },

  // Update person
  updatePerson: (personId, updates) => {
    if (MOCK_PEOPLE[personId]) {
      MOCK_PEOPLE[personId] = { ...MOCK_PEOPLE[personId], ...updates };
      return Promise.resolve(MOCK_PEOPLE[personId]);
    }
    return Promise.resolve(null);
  },

  // Add note to person
  addNote: (personId, noteContent, noteType = 'user') => {
    if (MOCK_PEOPLE[personId]) {
      const newNote = {
        id: `note-${Date.now()}`,
        type: noteType,
        content: noteContent,
        timestamp: new Date().toISOString()
      };
      MOCK_PEOPLE[personId].notes.push(newNote);
      return Promise.resolve(newNote);
    }
    return Promise.resolve(null);
  },

  // Add interaction to person
  addInteraction: (personId, interaction) => {
    if (MOCK_PEOPLE[personId]) {
      const newInteraction = {
        id: `interaction-${Date.now()}`,
        ...interaction,
        date: new Date().toISOString()
      };
      MOCK_PEOPLE[personId].interactions.push(newInteraction);
      MOCK_PEOPLE[personId].lastContact = new Date().toISOString();
      return Promise.resolve(newInteraction);
    }
    return Promise.resolve(null);
  }
};

export default peopleApi;
