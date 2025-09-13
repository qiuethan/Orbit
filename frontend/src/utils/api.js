// API utilities for connecting to the backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API client with error handling
class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async postFormData(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  }
}

const api = new ApiClient();

// Face analysis API endpoints
export const faceAnalysisAPI = {
  // Analyze a face image
  async analyze(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.postFormData('/analyze', formData);
  },

  // Get list of cached analyses with thumbnails
  async list() {
    return api.get('/list');
  },

  // Health check
  async health() {
    return api.get('/health');
  }
};

// Mock people/workflow endpoints that could connect to backend later
export const workflowAPI = {
  // Get all workflows
  async getWorkflows() {
    // For now, return mock data - could be replaced with backend call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          {
            id: 'workflow-1',
            name: 'Sample Workflow',
            status: 'active',
            tasks: []
          }
        ]);
      }, 100);
    });
  },

  // Execute a task
  async executeTask(taskId, config) {
    // Mock implementation - replace with actual backend call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          taskId,
          result: 'Task executed successfully'
        });
      }, 1000);
    });
  }
};

// People data API (could be extended to use backend)
export const peopleAPI = {
  // In the future, this could fetch people data from backend
  async getPeople() {
    const { MOCK_PEOPLE } = await import('../data/people');
    return Object.values(MOCK_PEOPLE);
  },

  async getPerson(personId) {
    const { MOCK_PEOPLE } = await import('../data/people');
    return MOCK_PEOPLE[personId] || null;
  },

  // Add a person from face analysis results
  async addPersonFromAnalysis(analysisResult) {
    try {
      const structuredData = analysisResult.llm_analysis?.structured_data;
      if (!structuredData) {
        throw new Error('No structured data in analysis result');
      }

      const newPerson = {
        id: analysisResult.request_id || `person-${Date.now()}`,
        name: structuredData.personal_info?.full_name || 'Unknown Person',
        title: structuredData.professional_info?.current_position || 'Professional',
        company: structuredData.professional_info?.company || 'Unknown Company',
        email: this.generateEmailFromAnalysis(structuredData),
        avatar: analysisResult.thumbnail_base64 || null,
        status: 'prospect',
        priority: 'medium',
        stage: 'prospecting',
        location: structuredData.personal_info?.location || 'Unknown',
        llmDescription: structuredData.executive_summary || 'No description available',
        lastContact: new Date().toISOString(),
        addedAt: new Date().toISOString(),
        tags: this.generateTagsFromAnalysis(structuredData),
        analysisData: analysisResult // Store the full analysis
      };

      // In a real app, this would save to backend
      // For now, we'll just return the person object
      return newPerson;
    } catch (error) {
      console.error('Error creating person from analysis:', error);
      throw error;
    }
  },

  generateEmailFromAnalysis(structuredData) {
    const name = structuredData.personal_info?.full_name || 'contact';
    const company = structuredData.professional_info?.company || 'company';
    
    const firstName = name.split(' ')[0].toLowerCase();
    const companyDomain = company.toLowerCase().replace(/\s+/g, '');
    
    return `${firstName}@${companyDomain}.com`;
  },

  generateTagsFromAnalysis(structuredData) {
    const tags = [];
    
    if (structuredData.professional_info?.industry) {
      tags.push(structuredData.professional_info.industry.toLowerCase());
    }
    
    if (structuredData.professional_info?.current_position?.toLowerCase().includes('ceo')) {
      tags.push('executive');
    }
    
    if (structuredData.professional_info?.current_position?.toLowerCase().includes('founder')) {
      tags.push('founder');
    }
    
    if (structuredData.confidence_level === 'High') {
      tags.push('high-confidence');
    }
    
    return tags.slice(0, 5);
  }
};

export default api;
