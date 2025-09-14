// Data adapter to fetch and transform backend cache data into our app's format

// Backend API base URL
const BACKEND_API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Cache for API data to avoid repeated requests
let cachedPeopleData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30000; // 30 seconds

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

// No workflow generation - workflows come from backend

// Export the transformed data - now async to support backend fetching
let peopleDataCache = null;
let workflowDataCache = null;

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
    // For now, return empty workflows - they should come from backend
    workflowDataCache = {};
  }
  return workflowDataCache;
}

// No mock data exports - only real data from backend