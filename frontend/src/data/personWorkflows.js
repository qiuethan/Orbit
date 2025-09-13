// Consolidated workflows - all workflows for all people powered by mock_data.json
import { WORKFLOWS_FROM_MOCK_DATA, PEOPLE_FROM_MOCK_DATA } from './dataAdapter';

// Use the workflows generated from mock_data.json
export const PERSON_WORKFLOWS = WORKFLOWS_FROM_MOCK_DATA;

// Legacy workflows (kept for reference, but replaced by real data)
const LEGACY_PERSON_WORKFLOWS = {
  'person-sarah-johnson': {
    id: 'workflow-sarah-onboarding',
    personId: 'person-sarah-johnson',
    name: 'Sarah Johnson - Enterprise Onboarding',
    description: 'VP of Engineering onboarding workflow for TechCorp enterprise deal',
    status: 'active',
    priority: 'high',
    generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      {
        id: 'task-sarah-1',
        type: 'email',
        title: 'Send enterprise demo invite',
        description: 'Custom demo focusing on engineering team workflow',
        priority: 'high',
        status: 'completed',
        order: 1,
        position: { x: 100, y: 100 },
        config: {
          recipient: 'sarah.johnson@techcorp.com',
          subject: 'Enterprise Demo - Engineering Workflow Solutions',
          message: 'Hi Sarah,\n\nThank you for your interest in our enterprise solution. I\'d love to show you how our platform can streamline your engineering team\'s workflow processes.\n\nBest regards'
        }
      },
      {
        id: 'task-sarah-2',
        type: 'calendar',
        title: 'Schedule technical deep-dive',
        description: 'Technical meeting with engineering stakeholders',
        priority: 'high',
        status: 'pending',
        order: 2,
        position: { x: 400, y: 100 },
        config: {
          title: 'Technical Deep-dive - TechCorp Engineering',
          attendees: 'sarah.johnson@techcorp.com, engineering-team@techcorp.com',
          duration: '60 minutes',
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Focus on scalability, security, and integration capabilities'
        }
      },
      {
        id: 'task-sarah-3',
        type: 'notion',
        title: 'Prepare enterprise proposal',
        description: 'Detailed proposal with custom pricing and features',
        priority: 'medium',
        status: 'pending',
        order: 3,
        position: { x: 100, y: 250 },
        config: {
          project: 'TechCorp Enterprise Proposal',
          content: 'Custom enterprise package including advanced security, priority support, and engineering integrations'
        }
      }
    ],
    notes: [
      {
        id: 'note-sarah-1',
        type: 'system',
        content: '🚀 High-value enterprise opportunity identified - VP of Engineering at major tech company',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },

  'person-john-smith': {
    id: 'workflow-john-nurture',
    personId: 'person-john-smith',
    name: 'John Smith - Startup Nurture Campaign',
    description: 'Marketing Director nurture sequence for growing startup',
    status: 'active',
    priority: 'medium',
    generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      {
        id: 'task-john-1',
        type: 'email',
        title: 'Share marketing automation guide',
        description: 'Send valuable content to build relationship',
        priority: 'medium',
        status: 'completed',
        order: 1,
        position: { x: 100, y: 100 },
        config: {
          recipient: 'john.smith@startupco.com',
          subject: 'Free Guide: Marketing Automation for Growing Startups',
          message: 'Hi John,\n\nI thought you might find this helpful - our guide on marketing automation specifically for growing startups like yours.\n\nNo strings attached, just valuable insights from working with 100+ startups.\n\nBest regards'
        }
      },
      {
        id: 'task-john-2',
        type: 'phone',
        title: 'Follow-up call',
        description: 'Casual check-in call to understand their growth challenges',
        priority: 'medium',
        status: 'pending',
        order: 2,
        position: { x: 400, y: 100 },
        config: {
          recipient: '+1-555-123-7890',
          message: 'Hi John, just wanted to check in and see how the marketing automation guide landed. Any questions about implementing some of those strategies?'
        }
      }
    ],
    notes: [
      {
        id: 'note-john-1',
        type: 'user',
        content: 'Startup showing good growth trajectory - worth nurturing for future expansion',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },

  'person-mike-chen': {
    id: 'workflow-mike-outreach',
    personId: 'person-mike-chen',
    name: 'Mike Chen - Founder Cold Outreach',
    description: 'CEO/Founder initial outreach sequence for InnovateLab',
    status: 'active',
    priority: 'high',
    generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      {
        id: 'task-mike-1',
        type: 'email',
        title: 'Founder-to-founder outreach',
        description: 'Personal outreach highlighting founder journey',
        priority: 'high',
        status: 'pending',
        order: 1,
        position: { x: 100, y: 100 },
        config: {
          recipient: 'mike@innovatelab.io',
          subject: 'Fellow founder - quick question about scaling innovation',
          message: 'Hi Mike,\n\nSaw your work at InnovateLab and really impressed by what you\'re building in the AI space.\n\nAs a fellow founder, I\'d love to share something that\'s been game-changing for scaling innovation processes. Worth a quick 15-min chat?\n\nBest regards'
        }
      },
      {
        id: 'task-mike-2',
        type: 'slack',
        title: 'Add to founder network',
        description: 'Invite to exclusive founder community',
        priority: 'low',
        status: 'pending',
        order: 2,
        position: { x: 400, y: 100 },
        config: {
          channel: '#founder-network',
          message: '🚀 New potential member: Mike Chen from InnovateLab - AI/innovation focus, perfect fit for our community'
        }
      }
    ],
    notes: [
      {
        id: 'note-mike-1',
        type: 'user',
        content: 'Identified through LinkedIn - founder of AI innovation lab, perfect ICP match',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },

  'person-lisa-wang': {
    id: 'workflow-lisa-expansion',
    personId: 'person-lisa-wang',
    name: 'Lisa Wang - Client Expansion',
    description: 'Existing client expansion and upsell workflow',
    status: 'active',
    priority: 'medium',
    generatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      {
        id: 'task-lisa-1',
        type: 'email',
        title: 'Quarterly success review',
        description: 'Review achievements and identify expansion opportunities',
        priority: 'medium',
        status: 'completed',
        order: 1,
        position: { x: 100, y: 100 },
        config: {
          recipient: 'lisa.wang@globaldynamics.com',
          subject: 'Q3 Success Review - Amazing Results!',
          message: 'Hi Lisa,\n\nYour team has achieved incredible results this quarter! I\'d love to schedule a review call to celebrate these wins and explore how we can amplify this success across other departments.\n\nBest regards'
        }
      },
      {
        id: 'task-lisa-2',
        type: 'calendar',
        title: 'Expansion strategy meeting',
        description: 'Discuss expanding to other business units',
        priority: 'medium',
        status: 'pending',
        order: 2,
        position: { x: 400, y: 100 },
        config: {
          title: 'Expansion Strategy - Global Dynamics',
          attendees: 'lisa.wang@globaldynamics.com, account-team@ourcompany.com',
          duration: '45 minutes',
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Focus on additional departments that could benefit from our solution'
        }
      }
    ],
    notes: [
      {
        id: 'note-lisa-1',
        type: 'system',
        content: '💰 High-value client showing strong ROI - prime for expansion discussion',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },

  'person-alex-rodriguez': {
    id: 'workflow-alex-demo-followup',
    personId: 'person-alex-rodriguez',
    name: 'Alex Rodriguez - Demo Follow-up',
    description: 'Post-demo follow-up and decision support workflow',
    status: 'active',
    priority: 'low',
    generatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      {
        id: 'task-alex-1',
        type: 'email',
        title: 'Demo follow-up with resources',
        description: 'Send relevant case studies and technical documentation',
        priority: 'medium',
        status: 'completed',
        order: 1,
        position: { x: 100, y: 100 },
        config: {
          recipient: 'alex.rodriguez@nextgen.com',
          subject: 'Demo Follow-up: Resources for Your Evaluation',
          message: 'Hi Alex,\n\nGreat meeting you at the demo! As promised, here are some resources that align with what we discussed:\n\n- Case study from similar SaaS company\n- Technical integration guide\n- ROI calculator\n\nLet me know when you\'re ready for the next step!\n\nBest regards'
        }
      },
      {
        id: 'task-alex-2',
        type: 'calendar',
        title: 'Decision support call',
        description: 'Help with final evaluation and address any concerns',
        priority: 'medium',
        status: 'pending',
        order: 2,
        position: { x: 400, y: 100 },
        config: {
          title: 'Decision Support Call - NextGen Solutions',
          attendees: 'alex.rodriguez@nextgen.com, sales-team@ourcompany.com',
          duration: '30 minutes',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Address final concerns and provide decision support'
        }
      }
    ],
    notes: [
      {
        id: 'note-alex-1',
        type: 'user',
        content: 'Demo went well, mentioned timeline uncertainty but showed genuine interest',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },

  'person-john-smith': {
    id: 'workflow-john-marketing',
    personId: 'person-john-smith',
    name: 'John Smith - Marketing Automation Setup',
    description: 'Setting up marketing automation workflow for StartupCo growth initiatives',
    status: 'active',
    priority: 'medium',
    generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      {
        id: 'task-john-1',
        type: 'email',
        title: 'Send marketing automation proposal',
        description: 'Detailed proposal for marketing funnel optimization',
        priority: 'medium',
        status: 'pending',
        order: 1,
        position: { x: 100, y: 100 },
        config: {
          recipient: 'john.smith@startupco.com',
          subject: 'Marketing Automation Proposal - StartupCo Growth',
          message: 'Hi John,\n\nBased on our discussion about scaling your marketing efforts, I\'ve prepared a comprehensive proposal for marketing automation.\n\nThis includes lead scoring, email sequences, and conversion optimization strategies.\n\nBest regards'
        }
      },
      {
        id: 'task-john-2',
        type: 'calendar',
        title: 'Marketing strategy review call',
        description: 'Review current marketing performance and automation opportunities',
        priority: 'medium',
        status: 'pending',
        order: 2,
        position: { x: 400, y: 100 },
        config: {
          title: 'Marketing Strategy Review - StartupCo',
          attendees: 'john.smith@startupco.com',
          duration: '45 minutes',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Review current funnel metrics, identify automation opportunities, discuss budget'
        }
      },
      {
        id: 'task-john-3',
        type: 'slack',
        title: 'Share marketing resources',
        description: 'Share relevant case studies and templates',
        priority: 'low',
        status: 'pending',
        order: 3,
        position: { x: 700, y: 100 },
        config: {
          channel: '#marketing-automation',
          message: 'Hi John! Sharing some resources for your marketing automation project:\n\n• Case study: How SaaS startups increase conversions by 150%\n• Email template library\n• Lead scoring framework\n\nLet me know if you need any clarification!',
          recipientName: 'John Smith'
        }
      }
    ]
  }
};

// Helper function to get workflow for a person
export function getWorkflowForPerson(personId) {
  return PERSON_WORKFLOWS[personId] || null;
}

// Helper function to get all person-workflows for display in sidebar
export function getAllPersonWorkflows() {
  return Object.values(PERSON_WORKFLOWS).map(workflow => {
    const person = PEOPLE_FROM_MOCK_DATA[workflow.personId];
    return {
      ...workflow,
      person: person
    };
  });
}

// Alias for backward compatibility - workflows and person workflows are the same now
export const WORKFLOWS = PERSON_WORKFLOWS;
export const getAllWorkflows = getAllPersonWorkflows;
