// Mock workflow data API - shared between TaskQueue and Flowchart components
// Note: This is now consolidated with personWorkflows.js

// Import async workflow fetcher
import { getPersonWorkflowsAsync } from './personWorkflows';

export const MOCK_WORKFLOWS = {
    'workflow-sarah-onboarding': {
      id: 'workflow-sarah-onboarding',
      personId: 'person-sarah-johnson',
      name: 'Sarah Johnson - Enterprise Onboarding',
      description: 'VP of Engineering onboarding workflow for TechCorp enterprise deal',
      generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      priority: 'high',
      tasks: [
        {
          id: 'task-1',
          type: 'email',
          title: 'Send welcome email',
          description: 'AI detected new client signup - send personalized welcome',
          priority: 'high',
          estimatedTime: '30 seconds',
          status: 'pending',
          dependencies: [],
          position: { x: 100, y: 100 },
          config: {
            recipient: 'sarah.johnson@company.com',
            subject: 'Welcome to our platform, Sarah!',
            message: 'Hi Sarah,\n\nWelcome to our platform! We\'re excited to have you on board. Your account has been set up and you can start using our services immediately.\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\nThe Team'
          }
        },
        {
          id: 'task-2',
          type: 'phone',
          title: 'Schedule onboarding call',
          description: 'AI suggests personal call within 24 hours of signup',
          priority: 'medium',
          estimatedTime: '5 minutes',
          status: 'pending',
          dependencies: ['task-1'],
          position: { x: 100, y: 250 },
          config: {
            recipient: '+1-555-987-6543',
            message: 'Hi Sarah! This is calling to schedule your onboarding session. We\'d love to walk you through our platform and answer any questions you might have. When would be a good time for a 30-minute call this week?'
          }
        },
        {
          id: 'task-3',
          type: 'calendar',
          title: 'Book onboarding meeting',
          description: 'AI recommends scheduling based on client availability',
          priority: 'medium',
          estimatedTime: '1 minute',
          status: 'pending',
          dependencies: ['task-2'],
          position: { x: 100, y: 400 },
          config: {
            title: 'Client Onboarding - Sarah Johnson',
            attendees: 'sarah.johnson@company.com, team@ourcompany.com',
            duration: '30 minutes',
            date: '2025-06-25',
            time: '2:00 PM',
            notes: 'Platform walkthrough and Q&A session'
          }
        },
        {
          id: 'task-4',
          type: 'slack',
          title: 'Notify team about new client',
          description: 'AI suggests updating team channel',
          priority: 'low',
          estimatedTime: '10 seconds',
          status: 'pending',
          dependencies: [],
          position: { x: 400, y: 100 },
          config: {
            channel: '#client-updates',
            message: '🎉 New client alert! Sarah Johnson from TechCorp just signed up. Onboarding process has been initiated. Welcome email sent, follow-up call scheduled.'
          }
        }
      ]
    },
    'workflow-followup': {
      id: 'workflow-followup',
      name: 'Follow-up Sequence',
      description: 'AI-generated follow-up for prospect John Smith',
      generatedAt: new Date().toISOString(),
      status: 'draft',
      tasks: [
        {
          id: 'task-5',
          type: 'email',
          title: 'Send proposal follow-up',
          description: 'AI detected no response to proposal after 3 days',
          priority: 'high',
          estimatedTime: '45 seconds',
          status: 'pending',
          dependencies: [],
          position: { x: 100, y: 100 },
          config: {
            recipient: 'john.smith@prospect.com',
            subject: 'Quick follow-up on our proposal',
            message: 'Hi John,\n\nI wanted to follow up on the proposal we sent last week. Do you have any questions or need clarification on anything?\n\nI\'m happy to set up a quick call to discuss.\n\nBest regards'
          }
        },
        {
          id: 'task-6',
          type: 'phone',
          title: 'Make follow-up call',
          description: 'AI suggests call if no email response in 2 days',
          priority: 'medium',
          estimatedTime: '10 minutes',
          status: 'pending',
          dependencies: ['task-5'],
          position: { x: 100, y: 250 },
          config: {
            recipient: '+1-555-123-7890',
            message: 'Hi John, I sent an email about our proposal but wanted to reach out directly. Do you have a few minutes to discuss any questions about our offering?'
          }
        },
        {
          id: 'task-7',
          type: 'slack',
          title: 'Update sales team',
          description: 'AI suggests notifying team about follow-up',
          priority: 'low',
          estimatedTime: '5 seconds',
          status: 'pending',
          dependencies: [],
          position: { x: 400, y: 100 },
          config: {
            channel: '#sales-updates',
            message: '📞 Following up with John Smith on proposal. Email sent, call scheduled if no response.'
          }
        }
      ]
    }
  };
  
  // API functions to simulate real backend calls
  export const workflowApi = {
    // Get all workflows (now async to support backend fetching)
    getWorkflows: async () => {
      try {
        const workflows = await getPersonWorkflowsAsync();
        return Object.values(workflows);
      } catch (error) {
        console.error('Error fetching workflows:', error);
        return Object.values(MOCK_WORKFLOWS);
      }
    },
  
    // Get specific workflow by ID (now async to support backend fetching)
    getWorkflow: async (workflowId) => {
      try {
        const workflows = await getPersonWorkflowsAsync();
        return workflows[workflowId] || null;
      } catch (error) {
        console.error('Error fetching workflow:', error);
        return MOCK_WORKFLOWS[workflowId] || null;
      }
    },
  
    // Get active workflow (for task queue) (now async to support backend fetching)
    getActiveWorkflow: async () => {
      try {
        const workflows = await getPersonWorkflowsAsync();
        const activeWorkflow = Object.values(workflows).find(w => w.status === 'active');
        return activeWorkflow || Object.values(workflows)[0] || null;
      } catch (error) {
        console.error('Error fetching active workflow:', error);
        const activeWorkflow = Object.values(MOCK_WORKFLOWS).find(w => w.status === 'active');
        return activeWorkflow || Object.values(MOCK_WORKFLOWS)[0];
      }
    },
  
    // Update task status
    updateTaskStatus: (workflowId, taskId, status, error = null) => {
      if (MOCK_WORKFLOWS[workflowId]) {
        const task = MOCK_WORKFLOWS[workflowId].tasks.find(t => t.id === taskId);
        if (task) {
          task.status = status;
          if (error) task.error = error;
        }
      }
      return Promise.resolve(true);
    },
  
    // Update task config
    updateTaskConfig: (workflowId, taskId, newConfig) => {
      if (MOCK_WORKFLOWS[workflowId]) {
        const task = MOCK_WORKFLOWS[workflowId].tasks.find(t => t.id === taskId);
        if (task) {
          task.config = { ...task.config, ...newConfig };
        }
      }
      return Promise.resolve(true);
    },
  
    // Generate new workflow (simulate AI generation)
    generateWorkflow: (prompt) => {
      const newWorkflowId = `workflow-${Date.now()}`;
      const newWorkflow = {
        id: newWorkflowId,
        name: 'AI Generated Workflow',
        description: `Generated from prompt: "${prompt}"`,
        generatedAt: new Date().toISOString(),
        status: 'active',
        tasks: [
          {
            id: `task-${Date.now()}-1`,
            type: 'email',
            title: 'Send initial outreach',
            description: 'AI-generated initial contact email',
            priority: 'high',
            estimatedTime: '30 seconds',
            status: 'pending',
            dependencies: [],
            position: { x: 100, y: 100 },
            config: {
              recipient: 'contact@example.com',
              subject: 'Reaching out about partnership opportunity',
              message: 'Hi there,\n\nI hope this email finds you well. I wanted to reach out about a potential partnership opportunity that could benefit both our companies.\n\nWould you be open to a brief call to discuss?\n\nBest regards'
            }
          },
          {
            id: `task-${Date.now()}-2`,
            type: 'slack',
            title: 'Notify team about outreach',
            description: 'AI suggests updating team channel',
            priority: 'low',
            estimatedTime: '5 seconds',
            status: 'pending',
            dependencies: [],
            position: { x: 400, y: 100 },
            config: {
              channel: '#outreach-updates',
              message: '📧 New outreach campaign initiated. Initial email sent to potential partner.'
            }
          }
        ]
      };
  
      // Set previous active workflows to draft
      Object.values(MOCK_WORKFLOWS).forEach(workflow => {
        if (workflow.status === 'active') {
          workflow.status = 'draft';
        }
      });
  
      MOCK_WORKFLOWS[newWorkflowId] = newWorkflow;
      return Promise.resolve(newWorkflow);
    },
  
    // Execute task (call backend)
    executeTask: async (taskId, taskType, config) => {
        try {
          const response = await fetch('/api/execute-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, taskType, config })
          });
      
          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Task execution failed');
          }
          
          return result;
        } catch (error) {
          console.error(`${taskType} task failed:`, error);
          throw error;
        }
      }
  };
  
  // Task type metadata for UI components
  export const TASK_TYPES = {
    email: {
      name: 'Email',
      icon: 'EnvelopeIcon',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-600'
    },
    phone: {
      name: 'Phone Call',
      icon: 'PhoneIcon',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-600'
    },
    calendar: {
      name: 'Calendar',
      icon: 'CalendarIcon',
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-600'
    },
    slack: {
      name: 'Slack Message',
      icon: 'ChatBubbleLeftIcon',
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-600'
    }
  };
  
  export default workflowApi;