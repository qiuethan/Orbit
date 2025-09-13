"""
Output schema definitions for LLM analysis results.

This module defines the structured format for LLM outputs to ensure
consistent and parseable results across the application.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import json


@dataclass
class SocialMediaLink:
    """Represents a social media profile or link."""
    platform: str  # e.g., "LinkedIn", "Twitter", "Instagram", "Facebook"
    username: Optional[str] = None
    url: Optional[str] = None
    verified: Optional[bool] = None
    followers_count: Optional[str] = None  # Using string to handle "1.2M" format


@dataclass
class ProfessionalInfo:
    """Represents professional/work information."""
    current_position: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    previous_positions: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    achievements: Optional[List[str]] = None


@dataclass
class EducationInfo:
    """Represents educational background."""
    current_institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_year: Optional[str] = None
    previous_education: Optional[List[str]] = None


@dataclass
class PersonalInfo:
    """Represents personal information."""
    full_name: Optional[str] = None
    age: Optional[str] = None
    location: Optional[str] = None
    nationality: Optional[str] = None
    languages: Optional[List[str]] = None
    interests: Optional[List[str]] = None


@dataclass
class TalkingPoints:
    """Key talking points and conversation starters."""
    recent_achievements: Optional[List[str]] = None
    shared_connections: Optional[List[str]] = None
    common_interests: Optional[List[str]] = None
    conversation_starters: Optional[List[str]] = None
    notable_projects: Optional[List[str]] = None


@dataclass
class PersonAnalysis:
    """Complete structured analysis of a person."""
    # Core Information
    personal_info: PersonalInfo
    professional_info: ProfessionalInfo
    education_info: EducationInfo
    
    # Social Presence
    social_media: List[SocialMediaLink]
    
    # Analysis
    talking_points: TalkingPoints
    
    # Additional Context
    public_presence_score: Optional[str] = None  # "High", "Medium", "Low"
    credibility_indicators: Optional[List[str]] = None
    potential_red_flags: Optional[List[str]] = None
    
    # Summary
    executive_summary: Optional[str] = None
    key_insights: Optional[List[str]] = None
    
    # Metadata
    confidence_level: Optional[str] = None  # "High", "Medium", "Low"
    sources_quality: Optional[str] = None   # "Excellent", "Good", "Fair", "Poor"
    last_updated: Optional[str] = None


class OutputSchemaManager:
    """Manages output schema generation and parsing."""
    
    @staticmethod
    def get_schema_prompt() -> str:
        """
        Returns a detailed prompt that instructs the LLM to output
        data in the structured schema format.
        """
        return """
You must ANALYZE and VERIFY the provided search results, then return a JSON response with only the information you can confidently confirm about the target person.

REQUIRED JSON STRUCTURE (use null for unverified/unavailable data):
{
  "personal_info": {
    "full_name": "string or null",
    "age": "string or null", 
    "location": "string or null",
    "nationality": "string or null",
    "languages": ["string"] or null,
    "interests": ["string"] or null
  },
  "professional_info": {
    "current_position": "string or null",
    "company": "string or null",
    "industry": "string or null", 
    "previous_positions": ["string"] or null,
    "skills": ["string"] or null,
    "achievements": ["string"] or null
  },
  "education_info": {
    "current_institution": "string or null",
    "degree": "string or null",
    "field_of_study": "string or null",
    "graduation_year": "string or null",
    "previous_education": ["string"] or null
  },
  "social_media": [
    {
      "platform": "string",
      "username": "string or null",
      "url": "string or null", 
      "verified": boolean or null,
      "followers_count": "string or null"
    }
  ],
  "talking_points": {
    "recent_achievements": ["string"] or null,
    "shared_connections": ["string"] or null,
    "common_interests": ["string"] or null,
    "conversation_starters": ["string"] or null,
    "notable_projects": ["string"] or null
  },
  "public_presence_score": "High/Medium/Low or null",
  "credibility_indicators": ["string"] or null,
  "potential_red_flags": ["string"] or null,
  "executive_summary": "string or null",
  "key_insights": ["string"] or null,
  "confidence_level": "High/Medium/Low or null",
  "sources_quality": "Excellent/Good/Fair/Poor or null",
  "last_updated": "string or null"
}

CRITICAL INSTRUCTIONS - READ CAREFULLY:

🔍 ANALYSIS & VERIFICATION REQUIREMENTS:
1. You are an ANALYST, not just a data extractor
2. ANALYZE the search results to determine what information is ACTUALLY ABOUT THE PERSON in the image
3. FILTER OUT information that is clearly about different people, places, or unrelated topics
4. CROSS-REFERENCE information across multiple sources before including it
5. ONLY include information you can reasonably verify relates to the target person

📋 DATA QUALITY STANDARDS:
- Use null for any fields where you cannot find VERIFIED information
- If multiple sources contradict, use null or note the discrepancy in confidence_level
- Be conservative - it's better to return null than incorrect information
- Focus on consistent, corroborated information across sources

🎯 FIELD-SPECIFIC GUIDANCE:
- personal_info: Only include if clearly refers to the target person
- professional_info: Verify job titles and companies are current/accurate
- social_media: Only include verified social profiles that match the person
- talking_points: Base on actual achievements and interests, not generic topics
- confidence_level: 
  * "High": Multiple independent sources confirm the same information
  * "Medium": Some sources support the information, minor inconsistencies
  * "Low": Limited sources, potential confusion with other people, or conflicting data

🚫 WHAT TO EXCLUDE:
- Information about people with similar names but different identities
- Generic company information not specific to the person
- Outdated information that has been superseded
- Speculation or assumptions not backed by evidence
- Social media profiles that might belong to different people

✅ VERIFICATION CHECKLIST:
- Does this information consistently appear across multiple sources?
- Is this information specifically about the person in the image?
- Can I reasonably confirm this is accurate and current?
- Am I being conservative enough with uncertain information?

🔥 CRITICAL OUTPUT REQUIREMENT:
- Return ONLY the JSON object - no explanations, no markdown formatting, no additional text
- Start your response directly with { and end with }
- Do not wrap in ```json``` blocks or any other formatting

Return your ANALYZED and VERIFIED findings as pure JSON:
"""

    @staticmethod
    def parse_llm_response(response: str) -> Optional[PersonAnalysis]:
        """
        Parse LLM response into a PersonAnalysis object.
        
        Args:
            response: Raw LLM response string
            
        Returns:
            PersonAnalysis object or None if parsing fails
        """
        try:
            # Clean the response - handle various markdown and text wrapping
            cleaned_response = response.strip()
            
            # Look for JSON within markdown blocks
            if "```json" in cleaned_response:
                start_idx = cleaned_response.find("```json") + 7
                end_idx = cleaned_response.find("```", start_idx)
                if end_idx != -1:
                    cleaned_response = cleaned_response[start_idx:end_idx]
                else:
                    cleaned_response = cleaned_response[start_idx:]
            
            # Look for JSON within regular code blocks
            elif "```" in cleaned_response:
                start_idx = cleaned_response.find("```") + 3
                end_idx = cleaned_response.find("```", start_idx)
                if end_idx != -1:
                    cleaned_response = cleaned_response[start_idx:end_idx]
                else:
                    cleaned_response = cleaned_response[start_idx:]
            
            # Look for JSON object starting with {
            elif "{" in cleaned_response:
                start_idx = cleaned_response.find("{")
                # Find the last } to get the complete JSON
                end_idx = cleaned_response.rfind("}")
                if end_idx != -1 and end_idx > start_idx:
                    cleaned_response = cleaned_response[start_idx:end_idx + 1]
                else:
                    cleaned_response = cleaned_response[start_idx:]
            
            cleaned_response = cleaned_response.strip()
            
            # Parse JSON
            data = json.loads(cleaned_response)
            
            # Convert to dataclass instances
            personal_info = PersonalInfo(**data.get('personal_info', {}))
            professional_info = ProfessionalInfo(**data.get('professional_info', {}))
            education_info = EducationInfo(**data.get('education_info', {}))
            talking_points = TalkingPoints(**data.get('talking_points', {}))
            
            # Handle social media list
            social_media = []
            for sm_data in data.get('social_media', []):
                if sm_data:  # Skip empty entries
                    social_media.append(SocialMediaLink(**sm_data))
            
            # Create main analysis object
            analysis = PersonAnalysis(
                personal_info=personal_info,
                professional_info=professional_info,
                education_info=education_info,
                social_media=social_media,
                talking_points=talking_points,
                public_presence_score=data.get('public_presence_score'),
                credibility_indicators=data.get('credibility_indicators'),
                potential_red_flags=data.get('potential_red_flags'),
                executive_summary=data.get('executive_summary'),
                key_insights=data.get('key_insights'),
                confidence_level=data.get('confidence_level'),
                sources_quality=data.get('sources_quality'),
                last_updated=data.get('last_updated')
            )
            
            return analysis
            
        except (json.JSONDecodeError, TypeError, KeyError) as e:
            print(f"Error parsing LLM response: {e}")
            return None
    
    @staticmethod
    def to_dict(analysis: PersonAnalysis) -> Dict[str, Any]:
        """Convert PersonAnalysis to dictionary."""
        return asdict(analysis)
    
    @staticmethod
    def to_json(analysis: PersonAnalysis, indent: int = 2) -> str:
        """Convert PersonAnalysis to JSON string."""
        return json.dumps(asdict(analysis), indent=indent, ensure_ascii=False)


# Example usage and testing
if __name__ == "__main__":
    # Test schema generation
    schema_manager = OutputSchemaManager()
    
    print("=== SCHEMA PROMPT ===")
    print(schema_manager.get_schema_prompt())
    print("\n" + "="*50 + "\n")
    
    # Test with sample data
    sample_analysis = PersonAnalysis(
        personal_info=PersonalInfo(
            full_name="John Doe",
            age="28",
            location="San Francisco, CA",
            nationality="American",
            languages=["English", "Spanish"],
            interests=["Technology", "Photography", "Travel"]
        ),
        professional_info=ProfessionalInfo(
            current_position="Senior Software Engineer",
            company="Tech Corp",
            industry="Technology",
            previous_positions=["Software Engineer at StartupCo"],
            skills=["Python", "React", "AWS"],
            achievements=["Led migration to microservices", "Reduced latency by 40%"]
        ),
        education_info=EducationInfo(
            current_institution=None,
            degree="Bachelor of Science",
            field_of_study="Computer Science",
            graduation_year="2018",
            previous_education=["High School Diploma"]
        ),
        social_media=[
            SocialMediaLink(
                platform="LinkedIn",
                username="johndoe",
                url="https://linkedin.com/in/johndoe",
                verified=True,
                followers_count="500+"
            ),
            SocialMediaLink(
                platform="Twitter",
                username="@johndoe_dev",
                url="https://twitter.com/johndoe_dev",
                verified=False,
                followers_count="1.2K"
            )
        ],
        talking_points=TalkingPoints(
            recent_achievements=["Promoted to Senior Engineer", "Spoke at Tech Conference 2024"],
            shared_connections=["Alice Smith from Tech Corp"],
            common_interests=["Python development", "Cloud architecture"],
            conversation_starters=[
                "How did you transition to microservices?",
                "What's your experience with AWS Lambda?"
            ],
            notable_projects=["Open source library with 1K+ stars"]
        ),
        public_presence_score="Medium",
        credibility_indicators=["Verified LinkedIn", "Active GitHub contributions"],
        potential_red_flags=None,
        executive_summary="Experienced software engineer with strong technical background and growing leadership experience.",
        key_insights=["Strong technical expertise", "Active in tech community", "Career progression"],
        confidence_level="High",
        sources_quality="Good",
        last_updated="2024-01-15"
    )
    
    print("=== SAMPLE ANALYSIS (JSON) ===")
    print(schema_manager.to_json(sample_analysis))
