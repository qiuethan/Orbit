// Data adapter to transform mock_data.json into our app's format
import mockData from './mock_data.json';

// Transform mock data into people format
export function transformMockDataToPeople() {
  const people = {};
  
  mockData.forEach((entry, index) => {
    const llmData = entry.llm_analysis?.structured_data;
    const personalInfo = llmData?.personal_info || {};
    const professionalInfo = llmData?.professional_info || {};
    
    // Generate person ID from request_id or fallback to index
    const personId = entry.request_id || `person-${index + 1}`;
    
    // Extract name from full_name or use request_id
    const fullName = personalInfo.full_name || entry.request_id?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const nameParts = fullName?.split(' ') || ['Unknown', 'Person'];
    
    people[personId] = {
      id: personId,
      name: fullName || 'Unknown Person',
      firstName: nameParts[0] || 'Unknown',
      lastName: nameParts.slice(1).join(' ') || 'Person',
      title: professionalInfo.current_position || 'Professional',
      company: extractCompanyFromPosition(professionalInfo.current_position),
      email: generateEmail(fullName, professionalInfo.current_position),
      phone: '+1 (555) 123-4567', // Mock phone
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName || personId)}`,
      status: 'active',
      priority: determinePriority(llmData?.public_presence_score),
      stage: 'prospect',
      location: personalInfo.location || 'Unknown',
      
      // Enhanced data from LLM analysis
      llmDescription: llmData?.executive_summary || `${professionalInfo.current_position || 'Professional'} with expertise in ${professionalInfo.industry || 'their field'}.`,
      
      // Timestamps
      lastContact: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextFollowUp: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
      addedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      
      // Tags from analysis
      tags: generateTagsFromData(llmData, professionalInfo),
      
      // Comprehensive scraped data
      scrapedData: {
        location: personalInfo.location || 'Unknown',
        industry: professionalInfo.industry || 'Technology',
        publicPresenceScore: llmData?.public_presence_score || 'Medium',
        confidenceLevel: llmData?.confidence_level || 'Medium',
        sourcesQuality: llmData?.sources_quality || 'Medium',
        keyInsights: llmData?.key_insights || [],
        credibilityIndicators: llmData?.credibility_indicators || [],
        
        // Talking points from LLM analysis
        talkingPoints: llmData?.talking_points || {},
        recentAchievements: llmData?.talking_points?.recent_achievements || [],
        commonInterests: llmData?.talking_points?.common_interests || [],
        
        // Education from structured data
        education: professionalInfo.current_institution ? [{
          school: professionalInfo.current_institution,
          degree: 'Alumni',
          year: 'Graduate',
          details: `Graduated from ${professionalInfo.current_institution}`
        }] : [],
        
        // Previous positions from analysis
        previousPositions: professionalInfo.previous_positions || [],
        
        // Social media from the data
        socialMedia: {
          linkedin: findLinkedInUrl(entry),
          twitter: findTwitterUrl(entry),
          website: findWebsiteUrl(entry),
          all: personalInfo.social_media || []
        },
        
        // Work history with more detail
        workHistory: generateWorkHistory(professionalInfo),
        
        // Languages (if available)
        languages: personalInfo.languages || ['English'],
        
        // Interests from personal info and insights
        interests: [
          ...(personalInfo.interests || []),
          ...(llmData?.key_insights || []),
          professionalInfo.industry || 'Technology'
        ].slice(0, 8), // More interests
        
        // Web presence and mentions
        webMentions: entry.serp_results ? Object.values(entry.serp_results).flat().map(result => ({
          title: result.title,
          snippet: result.snippet,
          url: result.link,
          source: result.displayed_link,
          rank: result.rank
        })) : [],
        
        // Scraped content insights
        scrapedContent: entry.scraped_results ? Object.values(entry.scraped_results).flat().map(content => ({
          url: content.scraped_content?.url,
          title: content.scraped_content?.content?.title,
          summary: content.scraped_content?.content?.summary,
          publishDate: content.scraped_content?.content?.publish_date,
          method: content.scraped_content?.content?.method
        })) : [],
        
        // Summary statistics
        summary: entry.summary || {},
        
        // Request metadata
        requestId: entry.request_id
      },
      
      // Connections (mock for now, could be enhanced with actual relationship data)
      connections: generateMockConnections(personId, index)
    };
  });
  
  return people;
}

// Helper functions
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

function findLinkedInUrl(entry) {
  const allResults = Object.values(entry.serp_results || {}).flat();
  const linkedInResult = allResults.find(result => 
    result.link?.includes('linkedin.com') || result.displayed_link?.includes('linkedin.com')
  );
  return linkedInResult?.link || null;
}

function findTwitterUrl(entry) {
  const allResults = Object.values(entry.serp_results || {}).flat();
  const twitterResult = allResults.find(result => 
    result.link?.includes('x.com') || result.link?.includes('twitter.com') ||
    result.displayed_link?.includes('x.com') || result.displayed_link?.includes('twitter.com')
  );
  return twitterResult?.link || null;
}

function findWebsiteUrl(entry) {
  const allResults = Object.values(entry.serp_results || {}).flat();
  // Find a result that's not social media
  const websiteResult = allResults.find(result => 
    result.link && 
    !result.link.includes('linkedin.com') && 
    !result.link.includes('x.com') && 
    !result.link.includes('twitter.com') &&
    !result.link.includes('facebook.com')
  );
  return websiteResult?.link || null;
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
      company: extractCompanyFromPosition(professionalInfo.current_position),
      title: professionalInfo.current_position,
      period: 'Present',
      description: `Current role at ${extractCompanyFromPosition(professionalInfo.current_position)}`
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

function generateMockConnections(personId, index) {
  // Generate 2-4 mock connections per person
  const connectionCount = 2 + (index % 3); // 2-4 connections
  const connections = [];
  
  for (let i = 0; i < connectionCount; i++) {
    connections.push({
      name: `Connection ${i + 1}`,
      relationship: ['colleague', 'former coworker', 'industry contact', 'mutual connection'][i % 4],
      company: `Company ${i + 1}`,
      howTheyMet: ['LinkedIn', 'Conference', 'Mutual friend', 'Previous job'][i % 4],
      strength: ['strong', 'medium', 'weak'][i % 3],
      lastContact: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }
  
  console.log(`Generated ${connections.length} connections for ${personId}:`, connections);
  return connections;
}

// Transform people data into workflows
export function generateWorkflowsFromPeople(people) {
  const workflows = {};
  
  Object.values(people).forEach((person, index) => {
    const workflowId = `workflow-${person.id}`;
    
    workflows[person.id] = {
      id: workflowId,
      personId: person.id,
      name: `${person.name} - ${getWorkflowType(person, index)}`,
      description: `${getWorkflowDescription(person, index)}`,
      status: 'active',
      priority: person.priority,
      generatedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
      tasks: generateTasksForPerson(person, index)
    };
  });
  
  return workflows;
}

function getWorkflowType(person, index) {
  const types = [
    'Enterprise Onboarding',
    'Partnership Development', 
    'Technical Integration',
    'Strategic Consultation',
    'Product Demo',
    'Market Research',
    'Collaboration Setup',
    'Investment Discussion'
  ];
  return types[index % types.length];
}

function getWorkflowDescription(person, index) {
  const company = person.scrapedData?.workHistory?.[0]?.company || person.company;
  const industry = person.scrapedData?.industry || 'their industry';
  
  const descriptions = [
    `Strategic ${industry} partnership with ${person.name} at ${company}`,
    `Enterprise integration process for ${company}'s technical team`,
    `Product demonstration and evaluation for ${person.name}`,
    `Market research collaboration with ${company}`,
    `Investment opportunity discussion with ${person.name}`,
    `Partnership development initiative with ${company}`,
    `Technical consultation for ${company}'s platform`,
    `Strategic advisory relationship with ${person.name}`
  ];
  
  return descriptions[index % descriptions.length];
}

function generateTasksForPerson(person, index) {
  const company = person.scrapedData?.workHistory?.[0]?.company || person.company;
  
  const taskTemplates = [
    // Email tasks
    {
      type: 'email',
      title: 'Send initial outreach email',
      description: `Personalized introduction email to ${person.name}`,
      priority: 'high',
      status: index % 3 === 0 ? 'completed' : 'pending',
      config: {
        recipient: person.email,
        subject: `Partnership opportunity with ${company}`,
        message: `Hi ${person.firstName},\n\nI came across your work at ${company} and would love to discuss a potential partnership opportunity.\n\nBest regards`
      }
    },
    // Calendar task  
    {
      type: 'calendar',
      title: 'Schedule discovery call',
      description: `Initial 30-minute discovery call with ${person.name}`,
      priority: 'high',
      status: 'pending',
      config: {
        title: `Discovery Call - ${person.name}`,
        duration: 30,
        attendees: [person.email],
        description: `Initial discussion about partnership opportunities with ${company}`
      }
    },
    // Slack task
    {
      type: 'slack',
      title: 'Update team on progress',
      description: `Share update about ${person.name} outreach`,
      priority: 'medium',
      status: 'pending',
      config: {
        channel: '#partnerships',
        message: `📝 Reached out to ${person.name} (${person.title}) at ${company} for partnership discussion. ${index % 2 === 0 ? 'Positive initial response!' : 'Awaiting response.'}`
      }
    }
  ];
  
  return taskTemplates.map((template, taskIndex) => ({
    ...template,
    id: `task-${person.id}-${taskIndex + 1}`,
    order: taskIndex + 1,
    position: { x: 100 + taskIndex * 150, y: 100 }
  }));
}

// Export the transformed data
export const PEOPLE_FROM_MOCK_DATA = transformMockDataToPeople();
export const WORKFLOWS_FROM_MOCK_DATA = generateWorkflowsFromPeople(PEOPLE_FROM_MOCK_DATA);

// For backward compatibility
export const MOCK_PEOPLE = PEOPLE_FROM_MOCK_DATA;
export const PERSON_WORKFLOWS = WORKFLOWS_FROM_MOCK_DATA;
