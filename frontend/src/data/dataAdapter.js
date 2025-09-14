// Data adapter to fetch and transform backend cache data into our app's format

// Backend API base URL
const BACKEND_API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Cache for API data to avoid repeated requests
let cachedPeopleData = null;
let workflowDataCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30000; // 30 seconds

// Function to clear all caches
export function clearAllCaches() {
  cachedPeopleData = null;
  workflowDataCache = null;
  cacheTimestamp = null;
  
  // Clear localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('workflow_app_data');
    localStorage.removeItem('workflows');
    localStorage.removeItem('activeWorkflowId');
    console.log('🧹 All caches and localStorage cleared');
  }
}

// Fetch people data from backend API
async function fetchPeopleFromBackend() {
  console.log('🔄 Fetching people from backend API...');
  const response = await fetch(`${BACKEND_API_BASE}/list`);
  if (!response.ok) {
    throw new Error(`Backend API error: ${response.status}`);
  }
  const data = await response.json();
  console.log('✅ Successfully fetched real data from backend:', Array.isArray(data) ? data.length : 0, 'people');
  
  // Transform the array data into the expected object format
  const peopleObject = {};
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      const personId = item.request_id || `person-${index}`;
      const personAnalysis = item.person_analysis || {};
      const personalInfo = personAnalysis.personal_info || {};
      const professionalInfo = personAnalysis.professional_info || {};
      
      // Extract additional data
      const educationInfo = personAnalysis.education_info || {};
      const talkingPoints = personAnalysis.talking_points || {};
      const socialMedia = personAnalysis.social_media || [];
      
      // Transform to frontend format with ALL the rich data
      peopleObject[personId] = {
        id: personId,
        name: personalInfo.full_name || 'Unknown Person',
        title: professionalInfo.current_position || 'Professional',
        company: professionalInfo.company || extractCompanyFromPosition(professionalInfo.current_position),
        email: generateEmail(personalInfo.full_name, professionalInfo.current_position),
        phone: personalInfo.phone || '',
        avatar: item.thumbnail_base64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(personalInfo.full_name || personId)}`,
        status: 'active',
        priority: determinePriority(personAnalysis.public_presence_score),
        stage: 'prospect',
        location: personalInfo.location || 'Unknown',
        llmDescription: personAnalysis.executive_summary || personAnalysis.overview || 'Professional in their field.',
        lastContact: item.metadata?.last_updated || new Date().toISOString(),
        nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        addedAt: item.metadata?.last_updated || new Date().toISOString(),
        tags: generateTagsFromData(personAnalysis, professionalInfo),
        
        // Rich data from analysis
        scrapedData: {
          location: personalInfo.location || 'Unknown',
          industry: professionalInfo.industry || 'Technology',
          publicPresenceScore: personAnalysis.public_presence_score || 'Medium',
          confidenceLevel: personAnalysis.confidence_level || 'Medium',
          sourcesQuality: personAnalysis.sources_quality || 'Medium',
          keyInsights: personAnalysis.key_insights || [],
          credibilityIndicators: personAnalysis.credibility_indicators || [],
          
          // Work history with previous positions
          workHistory: generateWorkHistory(professionalInfo),
          previousPositions: professionalInfo.previous_positions || [],
          
          // Education
          education: educationInfo.current_institution ? [{
            school: educationInfo.current_institution,
            degree: educationInfo.degree || 'Alumni',
            year: educationInfo.graduation_year || 'Graduate',
            field: educationInfo.field_of_study || null,
            details: `${educationInfo.degree || 'Graduate'} from ${educationInfo.current_institution}${educationInfo.field_of_study ? ` in ${educationInfo.field_of_study}` : ''}`
          }] : [],
          
          // Social media
          socialMedia: {
            linkedin: findLinkedInFromSocialMedia(socialMedia),
            twitter: findTwitterFromSocialMedia(socialMedia),
            youtube: findYouTubeFromSocialMedia(socialMedia),
            all: Array.isArray(socialMedia) ? socialMedia : []
          },
          
          // Interests and achievements
          interests: [
            ...(personalInfo.interests || []),
            ...(professionalInfo.skills || []).slice(0, 5)
          ].slice(0, 8),
          
          achievements: talkingPoints.recent_achievements || [],
          
          // Languages
          languages: personalInfo.languages || ['English'],
          
          // Best match photo info
          bestMatchPhoto: item.best_match_photo ? {
            sourceUrl: item.best_match_photo.source_url,
            confidenceScore: item.best_match_photo.confidence_score,
            description: item.best_match_photo.description
          } : null
        },
        
        // Talking points for conversation starters
        talkingPoints: {
          recentAchievements: talkingPoints.recent_achievements || [],
          sharedConnections: talkingPoints.shared_connections || [],
          commonInterests: talkingPoints.common_interests || [],
          conversationStarters: talkingPoints.conversation_starters || [],
          notableProjects: talkingPoints.notable_projects || []
        },
        
        // Connections (using shared connections from talking points)
        connections: (talkingPoints.shared_connections || []).map(connection => ({
          name: connection,
          relationship: 'Shared connection',
          connectionType: 'mutual',
          strength: 'medium',
          lastInteraction: new Date().toISOString()
        })),
        
        // Mutual connections count
        mutualConnections: talkingPoints.shared_connections?.length || 0,
        
        // Notes and interactions (empty for now, could be populated from other sources)
        notes: [],
        interactions: [],
        conversationNotes: [],
        
        // Conversation history from cache if available
        conversationHistory: personAnalysis.conversation_history || [],
        previousConversationTopics: personAnalysis.previous_conversation_topics || [],
        totalConversations: personAnalysis.total_conversations || 0,
        
        // LinkedIn URL for profile
        linkedIn: findLinkedInFromSocialMedia(socialMedia),
        
        // Include raw data for detailed views
        rawData: item
      };
    });
  }
  
  return peopleObject;
}

// Get cached data or fetch fresh data
async function getCachedPeopleData() {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (cachedPeopleData && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPeopleData;
  }
  
  // Fetch fresh data with error handling
  try {
  const freshData = await fetchPeopleFromBackend();
  cachedPeopleData = freshData;
  cacheTimestamp = now;
  return freshData;
  } catch (error) {
    console.error('Failed to fetch people data:', error);
    // Return empty object if fetch fails
    return {};
  }
}

// Main export function for getting people data (now from backend)
export async function getPeopleFromBackend() {
  return await getCachedPeopleData();
}

// No mock data fallback - only real data from backend

// Helper functions for data transformation
function extractCompanyFromPosition(position) {
  if (!position) return 'Unknown Company';
  
  // Look for common patterns: "CEO at Company", "Engineer @ Company", etc.
  const atMatch = position.match(/(?:at|@)\s+(.+?)(?:\s*[;,]|$)/i);
  if (atMatch) return atMatch[1].trim();
  
  // Fallback: extract last word or use a default
  const words = position.split(' ');
  return words.length > 2 ? words.slice(-1)[0] : 'Startup';
}

function generateEmail(fullName, position) {
  if (!fullName) return 'contact@example.com';
  
  const [firstName, lastName] = fullName.toLowerCase().split(' ');
  const company = extractCompanyFromPosition(position).toLowerCase().replace(/\s+/g, '');
  
  return `${firstName || 'contact'}${lastName ? '.' + lastName : ''}@${company || 'company'}.com`;
}

function determinePriority(publicPresenceScore) {
  switch (publicPresenceScore?.toLowerCase()) {
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
    default: return 'medium';
  }
}

function generateTagsFromData(llmData, professionalInfo) {
  const tags = [];
  
  // Add industry tag
  if (professionalInfo.industry) {
    tags.push(professionalInfo.industry.toLowerCase().replace(/\s+/g, '_'));
  }
  
  // Add role-based tags
  const position = professionalInfo.current_position || '';
  if (position.toLowerCase().includes('ceo') || position.toLowerCase().includes('founder')) {
    tags.push('founder');
  }
  if (position.toLowerCase().includes('engineer') || position.toLowerCase().includes('developer')) {
    tags.push('technical');
  }
  if (position.toLowerCase().includes('vp') || position.toLowerCase().includes('director')) {
    tags.push('executive');
  }
  
  // Add presence-based tags
  const presenceScore = llmData?.public_presence_score?.toLowerCase();
  if (presenceScore === 'high') {
    tags.push('influencer');
  }
  
  // Add insight-based tags
  const insights = llmData?.key_insights || [];
  insights.forEach(insight => {
    if (insight.toLowerCase().includes('startup')) tags.push('startup');
    if (insight.toLowerCase().includes('ai')) tags.push('ai');
    if (insight.toLowerCase().includes('enterprise')) tags.push('enterprise');
  });
  
  return tags.slice(0, 5); // Limit to 5 tags
}

function generateWorkHistory(professionalInfo) {
  const history = [];
  
  // Current position
  if (professionalInfo.current_position) {
    history.push({
      company: professionalInfo.company || extractCompanyFromPosition(professionalInfo.current_position),
      title: professionalInfo.current_position,
      period: 'Present',
      description: `Current role at ${professionalInfo.company || extractCompanyFromPosition(professionalInfo.current_position)}`
    });
  }
  
  // Previous positions
  if (professionalInfo.previous_positions) {
    professionalInfo.previous_positions.forEach((position, index) => {
      history.push({
        company: extractCompanyFromPosition(position),
        title: position,
        period: `Previous Role ${index + 1}`,
        description: `Former position at ${extractCompanyFromPosition(position)}`
      });
    });
  }
  
  return history;
}

function findLinkedInFromSocialMedia(socialMedia) {
  if (Array.isArray(socialMedia)) {
    const linkedInEntry = socialMedia.find(entry => 
      entry.platform?.toLowerCase() === 'linkedin' || 
      entry.url?.includes('linkedin.com')
    );
    return linkedInEntry?.url || null;
  }
  return null;
}

function findTwitterFromSocialMedia(socialMedia) {
  if (Array.isArray(socialMedia)) {
    const twitterEntry = socialMedia.find(entry => 
      entry.platform?.toLowerCase() === 'twitter' ||
      entry.platform?.toLowerCase() === 'x' ||
      entry.url?.includes('twitter.com') ||
      entry.url?.includes('x.com')
    );
    return twitterEntry?.url || null;
  }
  return null;
}

function findYouTubeFromSocialMedia(socialMedia) {
  if (Array.isArray(socialMedia)) {
    const youtubeEntry = socialMedia.find(entry => 
      entry.platform?.toLowerCase() === 'youtube' ||
      entry.url?.includes('youtube.com')
    );
    return youtubeEntry?.url || null;
  }
  return null;
}

// Generate relevant tasks based on person data
function generateRelevantTasks(person, workflowId) {
  const tasks = [];
  const firstName = person.name.split(' ')[0];
  const company = person.company || 'their company';
  const title = person.title || 'their role';
  const industry = person.scrapedData?.industry || 'technology';
  
  // Task 1: LinkedIn Connection
  tasks.push({
    id: `${workflowId}-task-1`,
    type: 'linkedin_connect',
    title: `LinkedIn Connect`,
    description: `Connect with ${firstName} on LinkedIn`,
    priority: 'high',
    estimatedTime: '2 min',
    status: 'pending',
    order: 1,
    position: { x: 100, y: 100 },
    config: {
      action: 'connect',
      message: `Hi ${firstName}, I noticed your work at ${company} and would love to connect. I'm particularly interested in your experience in ${industry}.`,
      profile: person.linkedIn || `https://linkedin.com/in/${firstName.toLowerCase()}`
    }
  });

  // Task 2: Email Outreach
  const emailSubject = person.scrapedData?.keyInsights?.length > 0 
    ? `Quick question about ${person.scrapedData.keyInsights[0].toLowerCase()}`
    : `Hi ${firstName}, let's connect`;
    
  const emailMessage = person.scrapedData?.talkingPoints?.conversationStarters?.length > 0
    ? `Hi ${firstName},\n\n${person.scrapedData.talkingPoints.conversationStarters[0]}\n\nI'd love to learn more about your work at ${company}.\n\nBest regards`
    : `Hi ${firstName},\n\nI came across your profile and was impressed by your work at ${company} in ${industry}.\n\nI'd love to connect and learn more about your experience.\n\nBest regards`;

  tasks.push({
    id: `${workflowId}-task-2`,
    type: 'email',
    title: `Send Email`,
    description: `Send personalized email to ${firstName}`,
    priority: 'high',
    estimatedTime: '3 min',
    status: 'pending',
    order: 2,
    position: { x: 400, y: 100 },
    config: {
      recipient: person.email,
      subject: emailSubject,
      message: emailMessage
    }
  });

  // Task 3: LinkedIn Follow-up
  tasks.push({
    id: `${workflowId}-task-3`,
    type: 'linkedin_connect',
    title: `LinkedIn Follow-up`,
    description: `Send follow-up message on LinkedIn`,
    priority: 'medium',
    estimatedTime: '1 min',
    status: 'pending',
    order: 3,
    position: { x: 100, y: 250 },
    config: {
      action: 'message',
      message: `Hi ${firstName}, following up on my connection request. I'd love to discuss ${industry} opportunities with you.`,
      profile: person.linkedIn || `https://linkedin.com/in/${firstName.toLowerCase()}`
    }
  });

  // Task 4: Coffee Chat (if high priority or executive)
  if (person.priority === 'high' || person.scrapedData?.workHistory?.some(role => 
    role.title.toLowerCase().includes('ceo') || 
    role.title.toLowerCase().includes('founder') ||
    role.title.toLowerCase().includes('vp')
  )) {
    tasks.push({
      id: `${workflowId}-task-4`,
      type: 'coffee_chat',
      title: `Coffee Chat`,
      description: `Schedule coffee chat with ${firstName}`,
      priority: 'medium',
      estimatedTime: '1 min',
      status: 'pending',
      order: 4,
      position: { x: 400, y: 250 },
      config: {
        recipient: person.name,
        message: `Hi ${firstName}, interested in a coffee chat to discuss ${industry} trends?`,
        meetingType: 'Coffee Chat',
        duration: '30 min',
        platform: 'Zoom'
      }
    });
  }

  return tasks;
}

// No workflow generation - workflows come from backend

// Export the transformed data - now async to support backend fetching
let peopleDataCache = null;

export async function getPeopleFromBackendAsync() {
  if (!peopleDataCache) {
    try {
      peopleDataCache = await getPeopleFromBackend();
    } catch (error) {
      console.error('Failed to load people data:', error);
      peopleDataCache = {};
    }
  }
  return peopleDataCache;
}

export async function getWorkflowsFromBackendAsync() {
  if (!workflowDataCache) {
    // Create workflows for each person from the people data
    const people = await getPeopleFromBackendAsync();
    workflowDataCache = {};
    
    // Create a default workflow for each person
    Object.values(people).forEach(person => {
      const workflowId = `workflow-${person.id}`;
      workflowDataCache[person.id] = {
        id: workflowId,
        personId: person.id,
        name: `${person.name} - Outreach Workflow`,
        description: `Automated outreach workflow for ${person.name}`,
        generatedAt: new Date().toISOString(),
        status: 'active',
        notes: [
          {
            id: `note-${Date.now()}`,
            type: 'system',
            content: `Workflow created`,
            timestamp: new Date().toISOString()
          }
        ],
        tasks: generateRelevantTasks(person, workflowId)
      };
    });
  }
  return workflowDataCache;
}

// No mock data exports - only real data from backend