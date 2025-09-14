'use client';

import { useState } from 'react';
import { 
  Mail, 
  Phone, 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Clock, 
  MessageCircle, 
  Star,
  Building,
  User,
  Tag,
  Activity,
  Users,
  FileText,
  GraduationCap,
  Briefcase,
  Code,
  Award,
  BookOpen,
  Heart,
  Twitter,
  Github,
  Globe,
  Languages,
  MapPin as Location,
  Shield,
  Zap,
  Eye,
  Link,
  Search,
  Newspaper,
  BarChart3
} from 'lucide-react';
import ConnectionsTable from './ConnectionsTable';

// Conversation Notes Component
function ConversationNotes({ person }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');
  
  // Get conversation data from the person data
  const conversationNotes = person.conversationNotes || [];
  const conversationHistory = person.conversationHistory || [];
  const previousTopics = person.previousConversationTopics || [];
  const totalConversations = person.totalConversations || 0;
  
  // Use conversation history if available, otherwise fall back to conversation notes
  const hasConversationHistory = conversationHistory.length > 0;
  const latestConversation = hasConversationHistory ? conversationHistory[0] : conversationNotes[0];
  
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    // This would typically call an API to save the note
    console.log('Adding conversation note:', newNote);
    setNewNote('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
          <MessageCircle className="w-3 h-3" />
          {hasConversationHistory ? `Conversation History (${totalConversations})` : 'Latest Conversation'}
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      </div>
      
      {/* Latest Conversation Summary */}
      {latestConversation ? (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-800">
                {latestConversation.date ? formatDate(latestConversation.date) : 'Recent'}
              </span>
              <span className="text-xs text-blue-600">
                {hasConversationHistory ? `Session ${latestConversation.session_id || 'Unknown'}` : (latestConversation.type || 'Conversation')}
              </span>
            </div>
            <p className="text-xs text-blue-700 leading-relaxed">
              {hasConversationHistory 
                ? (latestConversation.summary || `Duration: ${Math.round(latestConversation.duration || 0)}s | Presence: ${Math.round(latestConversation.presence_time || 0)}s`)
                : (latestConversation.summary || latestConversation.notes)
              }
            </p>
            {/* Show topics for conversation history */}
            {hasConversationHistory && latestConversation.topics && latestConversation.topics.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-blue-800 mb-1">Topics discussed:</div>
                <div className="flex flex-wrap gap-1">
                  {latestConversation.topics.slice(0, 4).map((topic, index) => (
                    <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-200 text-blue-800">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Show key points for regular conversation notes */}
            {!hasConversationHistory && latestConversation.keyPoints && latestConversation.keyPoints.length > 0 && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {latestConversation.keyPoints.slice(0, 3).map((point, index) => (
                    <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-200 text-blue-800">
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Show previous conversation topics if available */}
          {hasConversationHistory && previousTopics.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded p-2">
              <h4 className="text-xs font-medium text-gray-800 mb-1">Previous conversation topics:</h4>
              <div className="flex flex-wrap gap-1">
                {previousTopics.slice(0, 6).map((topic, index) => (
                  <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                    {topic}
                  </span>
                ))}
                {previousTopics.length > 6 && (
                  <span className="text-xs text-gray-500">+{previousTopics.length - 6} more</span>
                )}
              </div>
            </div>
          )}
          
          {/* Next Steps for regular conversation notes */}
          {!hasConversationHistory && latestConversation.nextSteps && (
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <h4 className="text-xs font-medium text-green-800 mb-1">Next Steps:</h4>
              <p className="text-xs text-green-700">{latestConversation.nextSteps}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">No recent conversations recorded</div>
      )}
      
      {/* Expanded view showing more conversation history */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2">
            {hasConversationHistory ? 'All Conversations' : 'Conversation History'}
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {hasConversationHistory ? (
              // Show conversation history from cache
              conversationHistory.slice(1).map((conversation, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      {formatDate(conversation.date)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(conversation.duration || 0)}s
                    </span>
                  </div>
                  {conversation.summary && (
                    <p className="text-xs text-gray-600 leading-relaxed mb-2">
                      {conversation.summary}
                    </p>
                  )}
                  {conversation.topics && conversation.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {conversation.topics.map((topic, topicIndex) => (
                        <span key={topicIndex} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Show regular conversation notes
              conversationNotes.slice(1, 4).map((conversation, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {conversation.date ? formatDate(conversation.date) : `Conversation ${index + 2}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {conversation.type || 'Call'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-2">
                    {conversation.summary || conversation.notes}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Quick add note */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add quick conversation note..."
            className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <button
            onClick={handleAddNote}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility functions for badges and colors
const getStatusBadgeColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStageColor = (stage) => {
  switch (stage?.toLowerCase()) {
    case 'prospect': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'qualified': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'client': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays}d`;
  if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PersonProfile({ person }) {
  if (!person) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Contact Selected</h3>
          <p className="text-gray-500">Select a contact from the sidebar to view their profile</p>
        </div>
      </div>
    );
  }

  const scrapedData = person.scrapedData || {};
  const connections = person.connections || [];
  const webMentions = scrapedData.webMentions?.slice(0, 3) || []; // Show top 3
  
  // Use rich data from backend cache
  const talkingPoints = person.talkingPoints || {};
  const analysis = person.analysis || {};
  const professional = person.professional || {};
  
  // Combine insights from multiple sources
  const topInsights = [
    ...(analysis.keyInsights || []),
    ...(talkingPoints.recentAchievements || []),
    ...(scrapedData.keyInsights || []),
    ...(scrapedData.recentAchievements || [])
  ].slice(0, 6);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Enhanced Header with Background */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start gap-4">
          <img 
            src={person.avatar} 
            alt={person.name}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900 mb-1">{person.name}</h1>
                <p className="text-base text-gray-600 mb-2">{person.title} at {person.company}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                  {scrapedData.location && (
                    <span className="flex items-center gap-1">
                      <Location className="w-3 h-3" />
                      {scrapedData.location}
                    </span>
                  )}
                  {scrapedData.education?.[0] && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {scrapedData.education[0].degree} - {scrapedData.education[0].school}
                    </span>
                  )}
                </div>
                {/* Languages */}
                {scrapedData.languages && scrapedData.languages.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {scrapedData.languages.slice(0, 3).map((lang) => (
                      <span key={lang} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Condensed Layout */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Condensed Content */}
        <div className="grid grid-cols-12 gap-2 max-w-7xl">
          
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-8 space-y-2">
            
            {/* Executive Summary & Key Insights - Combined */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              {person.llmDescription && (
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                    <FileText className="w-3 h-3" />
                    Executive Summary
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed">{person.llmDescription}</p>
                </div>
              )}
              
              {topInsights.length > 0 && (
                <div className="mt-1">
                  <h3 className="font-medium text-gray-900 mb-1.5 text-sm">Key Insights</h3>
                  <ul className="space-y-1">
                    {topInsights.slice(0, 6).map((insight, index) => (
                      <li key={index} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Latest Conversation Notes */}
            <ConversationNotes person={person} />

            {/* Web Mentions - Left Column */}
            {webMentions.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                  <Search className="w-3 h-3" />
                  Web Mentions ({webMentions.length})
                </h3>
                <div className="space-y-2">
                  {webMentions.slice(0, 3).map((mention, index) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-xs line-clamp-1">{mention.title}</h4>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{mention.snippet}</p>
                          <span className="text-xs text-gray-500">{mention.source}</span>
                        </div>
                        <button
                          onClick={() => window.open(mention.url, '_blank')}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-1 flex-shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Work Experience & Connections - Two Cards Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Professional Experience - Left Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                  <Briefcase className="w-3 h-3" />
                  Professional Experience
                </h3>
                <div className="space-y-2">
                  {/* Current Position */}
                  {professional.currentRole && (
                    <div className="border-l-2 border-blue-500 pl-2">
                      <p className="font-medium text-gray-900 text-xs">{professional.currentRole}</p>
                      <p className="text-gray-600 text-xs">{professional.company}</p>
                      <span className="inline-block bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs mt-1">Current</span>
                    </div>
                  )}
                  
                  {/* Previous Positions */}
                  {professional.previousPositions?.slice(0, 2).map((position, index) => {
                    // Parse the position string to extract role, company, and duration
                    const parts = position.split(' — ');
                    const role = parts[0] || position;
                    const details = parts[1] || '';
                    
                    return (
                      <div key={index} className="border-l-2 border-gray-200 pl-2">
                        <p className="font-medium text-gray-900 text-xs">{role}</p>
                        <p className="text-gray-600 text-xs">{details}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shared Connections - Right Card */}
              {talkingPoints.sharedConnections && talkingPoints.sharedConnections.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                    <Users className="w-3 h-3" />
                    Shared Connections ({talkingPoints.sharedConnections.length})
                  </h3>
                  <div className="space-y-2">
                    {talkingPoints.sharedConnections.slice(0, 3).map((connection, index) => {
                      // Generate mock avatar based on name
                      const initials = connection.split(' ').map(n => n[0]).join('').toUpperCase();
                      const avatarBg = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'][index % 3];
                      
                      // Generate mock relationship context
                      const relationships = [
                        'Former colleague',
                        'Entrepreneur network',
                        'Investor relations'
                      ];
                      const relationship = relationships[index % relationships.length];
                      
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`w-5 h-5 ${avatarBg} rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0`}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-xs truncate">{connection}</p>
                            <p className="text-gray-500 text-xs">{relationship}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>


            {/* Conversation Starters */}
            {talkingPoints.conversationStarters && talkingPoints.conversationStarters.length > 0 && (
              <div className="col-span-12 bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-2 text-sm">Conversation Starters</h3>
                <div className="space-y-1.5">
                  {talkingPoints.conversationStarters.slice(0, 3).map((starter, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="text-gray-400 text-xs font-medium flex-shrink-0 mt-0.5 w-3">
                        {index + 1}.
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{starter}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Achievements */}
            {talkingPoints.recentAchievements && talkingPoints.recentAchievements.length > 0 && (
              <div className="col-span-12 bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-2 text-sm">Recent Achievements</h3>
                <div className="space-y-1.5">
                  {talkingPoints.recentAchievements.slice(0, 3).map((achievement, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>
                      <p className="text-xs text-gray-700 leading-relaxed">{achievement}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Sidebar - Condensed */}
          <div className="col-span-12 lg:col-span-4 space-y-2">
            
            {/* Social Links & Stats - Combined */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                <Globe className="w-3 h-3" />
                Links & Stats
              </h3>
              
              {/* Social Links */}
              <div className="space-y-1 text-xs mb-3">
                {(person.linkedIn || scrapedData.socialMedia?.linkedin) && (
                  <a
                    href={person.linkedIn || scrapedData.socialMedia?.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">LinkedIn</span>
                  </a>
                )}
                {scrapedData.socialMedia?.twitter && (
                  <a
                    href={scrapedData.socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-gray-900 hover:text-gray-700 transition-colors"
                  >
                    <Twitter className="w-3 h-3" />
                    <span className="truncate">X/Twitter</span>
                  </a>
                )}
                {scrapedData.socialMedia?.youtube && (
                  <a
                    href={scrapedData.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">YouTube</span>
                  </a>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Interactions</span>
                  <span className="font-semibold">{person.interactions?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Notes</span>
                  <span className="font-semibold">{person.notes?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Connections</span>
                  <span className="font-semibold">{connections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mentions</span>
                  <span className="font-semibold">{scrapedData.webMentions?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Tags & Interests */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                <Tag className="w-3 h-3" />
                Tags & Interests
              </h3>
              <div className="flex flex-wrap gap-1">
                {person.tags?.slice(0, 4).map((tag) => (
                  <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                    {tag.replace('_', ' ')}
                  </span>
                ))}
                {scrapedData.interests?.slice(0, 3).map((interest) => (
                  <span key={interest} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Credibility & Trust Indicators */}
            {scrapedData.credibilityIndicators && scrapedData.credibilityIndicators.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                  <Shield className="w-3 h-3" />
                  Verified
                </h3>
                <div className="space-y-1">
                  {scrapedData.credibilityIndicators.slice(0, 2).map((indicator, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-gray-700">{indicator}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Professional Skills */}
            {professional.skills && professional.skills.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-1.5 text-sm">Skills</h3>
                <div className="flex flex-wrap gap-1">
                  {professional.skills.slice(0, 8).map((skill, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}


            {/* Professional Summary */}
            {analysis.keyInsights && analysis.keyInsights.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-2 text-sm">Professional Summary</h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {analysis.keyInsights.join(' ').replace(/Strong entrepreneurial background/g, '**Strong entrepreneurial background**')
                    .replace(/Deeply networked/g, '**Deeply networked**')
                    .replace(/Well-recognized thought leader/g, '**Well-recognized thought leader**')
                    .replace(/leading AI agent platform/g, '**leading AI agent platform**')
                    .replace(/Forbes 30 under 30/g, '**Forbes 30 under 30**')
                    .replace(/angel investor/g, '**angel investor**')
                    .replace(/cutting-edge automation/g, '**cutting-edge automation**')
                    .split('**').map((part, index) => 
                      index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                    )}
                </p>
              </div>
            )}

            {/* Common Interests */}
            {talkingPoints.commonInterests && talkingPoints.commonInterests.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-1.5 text-sm">Common Interests</h3>
                <div className="flex flex-wrap gap-1">
                  {talkingPoints.commonInterests.map((interest, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
             