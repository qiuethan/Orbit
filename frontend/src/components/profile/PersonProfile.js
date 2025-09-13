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
  TrendingUp,
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

  const recentInteractions = person.interactions?.slice(-2).reverse() || [];
  const recentNotes = person.notes?.slice(-2).reverse() || [];
  const scrapedData = person.scrapedData || {};
  const connections = person.connections || [];
  const webMentions = scrapedData.webMentions?.slice(0, 3) || []; // Show top 3
  const topInsights = [...(scrapedData.keyInsights || []), ...(scrapedData.recentAchievements || [])].slice(0, 6);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Compact Header */}
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
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  {scrapedData.location && (
                    <span className="flex items-center gap-1">
                      <Location className="w-3 h-3" />
                      {scrapedData.location}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    scrapedData.publicPresenceScore === 'High' ? 'bg-green-100 text-green-700' :
                    scrapedData.publicPresenceScore === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {scrapedData.publicPresenceScore} Presence
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    scrapedData.confidenceLevel === 'High' ? 'bg-green-100 text-green-700' :
                    scrapedData.confidenceLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {scrapedData.confidenceLevel} Confidence
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={classNames(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  getStatusBadgeColor(person.status)
                )}>
                  {person.status.replace('_', ' ')}
                </span>
                <span className={classNames(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  getPriorityColor(person.priority)
                )}>
                  {person.priority}
                </span>
              </div>
            </div>
            
            {/* Quick Actions - Compact */}
            <div className="flex gap-2 mt-3">
              <button 
                onClick={() => window.open(`mailto:${person.email}`, '_blank')}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                <Mail className="w-3 h-3" />
                Email
              </button>
              {person.phone && (
                <button 
                  onClick={() => window.open(`tel:${person.phone}`, '_blank')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  Call
                </button>
              )}
              {(person.linkedIn || scrapedData.socialMedia?.linkedin) && (
                <button 
                  onClick={() => window.open(person.linkedIn || scrapedData.socialMedia?.linkedin, '_blank')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-800 text-white rounded text-sm hover:bg-blue-900 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  LinkedIn
                </button>
              )}
              {scrapedData.socialMedia?.twitter && (
                <button 
                  onClick={() => window.open(scrapedData.socialMedia.twitter, '_blank')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors"
                >
                  <Twitter className="w-3 h-3" />
                  X
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Single Page Layout */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Single Page Content */}
        <div className="grid grid-cols-12 gap-4 max-w-7xl">
          
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            
            {/* Executive Summary & Description */}
            {person.llmDescription && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Executive Summary
                </h3>
                <p className="text-sm text-gray-700">{person.llmDescription}</p>
              </div>
            )}

            {/* Key Insights & Achievements - Horizontal */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Key Insights & Achievements
              </h3>
              <div className="flex flex-wrap gap-2">
                {topInsights.map((insight, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                    {insight}
                  </span>
                ))}
              </div>
            </div>

            {/* Professional Background */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Work History */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Experience
                </h3>
                <div className="space-y-2">
                  {scrapedData.workHistory?.slice(0, 2).map((work, index) => (
                    <div key={index} className="text-sm">
                      <p className="font-medium text-gray-900">{work.title}</p>
                      <p className="text-gray-600">{work.company}</p>
                    </div>
                  ))}
                  {scrapedData.previousPositions?.slice(0, 2).map((position, index) => (
                    <div key={index} className="text-sm">
                      <p className="font-medium text-gray-900">{position}</p>
                      <p className="text-gray-600">Previous Role</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education & Background */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Background
                </h3>
                <div className="space-y-2 text-sm">
                  {scrapedData.education?.map((edu, index) => (
                    <div key={index}>
                      <p className="font-medium text-gray-900">{edu.degree}</p>
                      <p className="text-gray-600">{edu.school}</p>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {scrapedData.languages?.map((lang) => (
                      <span key={lang} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Web Mentions - Top 3 */}
            {webMentions.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Recent Web Mentions ({webMentions.length})
                </h3>
                <div className="space-y-3">
                  {webMentions.map((mention, index) => (
                    <div key={index} className="border-l-4 border-blue-200 pl-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{mention.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{mention.snippet}</p>
                          <span className="text-xs text-gray-500">{mention.source}</span>
                        </div>
                        <button
                          onClick={() => window.open(mention.url, '_blank')}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interactions */}
              {recentInteractions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Recent Interactions
                  </h3>
                  <div className="space-y-2">
                    {recentInteractions.map((interaction) => (
                      <div key={interaction.id} className="text-sm">
                        <p className="font-medium text-gray-900">{interaction.title}</p>
                        <p className="text-gray-600 text-xs">{formatDate(interaction.date)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {recentNotes.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Recent Notes
                  </h3>
                  <div className="space-y-2">
                    {recentNotes.map((note) => (
                      <div key={note.id} className="text-sm">
                        <p className="text-gray-700">{note.content}</p>
                        <span className="text-xs text-gray-500">{formatDate(note.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            
            {/* Contact Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600 truncate">{person.email}</span>
                </div>
                {person.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">{person.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">Added {formatDate(person.addedAt)}</span>
                </div>
              </div>
            </div>

            {/* Pipeline Status */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Pipeline
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">Stage</label>
                  <p className={classNames('text-sm font-semibold mt-1', getStageColor(person.stage))}>
                    {person.stage?.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Next Follow-up</label>
                  <p className={classNames(
                    'text-sm font-semibold mt-1',
                    new Date(person.nextFollowUp) < new Date() ? 'text-red-600' : 'text-gray-900'
                  )}>
                    {formatDate(person.nextFollowUp)}
                  </p>
                </div>
              </div>
            </div>

            {/* Data Quality Metrics */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Data Quality
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Presence</span>
                  <span className={`text-xs font-semibold ${
                    scrapedData.publicPresenceScore === 'High' ? 'text-green-600' :
                    scrapedData.publicPresenceScore === 'Medium' ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {scrapedData.publicPresenceScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Confidence</span>
                  <span className={`text-xs font-semibold ${
                    scrapedData.confidenceLevel === 'High' ? 'text-green-600' :
                    scrapedData.confidenceLevel === 'Medium' ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {scrapedData.confidenceLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Sources</span>
                  <span className="text-xs font-semibold text-gray-900">{scrapedData.sourcesQuality}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Stats
              </h3>
              <div className="space-y-2 text-sm">
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
                  <span className="text-gray-600">Web Mentions</span>
                  <span className="font-semibold">{scrapedData.webMentions?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Tags & Interests - Compact */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1">
                {person.tags?.slice(0, 6).map((tag) => (
                  <span key={tag} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                    {tag.replace('_', ' ')}
                  </span>
                ))}
                {scrapedData.interests?.slice(0, 4).map((interest) => (
                  <span key={interest} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Credibility Indicators */}
            {scrapedData.credibilityIndicators && scrapedData.credibilityIndicators.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Verified
                </h3>
                <div className="space-y-1">
                  {scrapedData.credibilityIndicators.slice(0, 3).map((indicator, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-gray-700">{indicator}</span>
                    </div>
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
             