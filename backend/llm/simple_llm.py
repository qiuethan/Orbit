"""
Simple LLM Interface

A lightweight interface for Cerebras and OpenAI that lets users provide their own prompts.
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import Cerebras SDK
try:
    from cerebras.cloud.sdk import Cerebras
    CEREBRAS_AVAILABLE = True
except ImportError:
    CEREBRAS_AVAILABLE = False

# Try to import OpenAI
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class SimpleLLM:
    """
    Simple LLM interface supporting Cerebras and OpenAI.
    Users provide their own prompts and get responses back.
    """
    
    def __init__(self, 
                 provider: Optional[str] = None,
                 api_key: Optional[str] = None,
                 model: Optional[str] = None,
                 temperature: float = 0.3):
        """
        Initialize the Simple LLM interface.
        
        Args:
            provider: 'cerebras', 'openai', or None for auto-detection
            api_key: API key (will use env var if not provided)
            model: Model name (will use default if not provided)
            temperature: Temperature for response randomness (0.0 = deterministic, 1.0 = creative)
        """
        self.temperature = temperature
        
        # Auto-detect provider if not specified
        if provider is None:
            cerebras_key = os.getenv('CEREBRAS_KEY')
            openai_key = os.getenv('OPENAI_API_KEY')
            
            if cerebras_key and CEREBRAS_AVAILABLE:
                provider = 'cerebras'
            elif openai_key and OPENAI_AVAILABLE:
                provider = 'openai'
            else:
                raise ValueError("No LLM provider available. Set CEREBRAS_KEY or OPENAI_API_KEY in environment.")
        
        self.provider = provider
        
        # Initialize based on provider
        if self.provider == 'cerebras':
            self._init_cerebras(api_key, model)
        elif self.provider == 'openai':
            self._init_openai(api_key, model)
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    def _init_cerebras(self, api_key: Optional[str], model: Optional[str]):
        """Initialize Cerebras client."""
        if not CEREBRAS_AVAILABLE:
            raise ValueError("Cerebras SDK not available. Install with: pip install cerebras-cloud-sdk")
        
        self.api_key = api_key or os.getenv('CEREBRAS_KEY')
        if not self.api_key:
            raise ValueError("Cerebras API key required. Set CEREBRAS_KEY or pass api_key parameter.")
        
        self.model = model or "llama3.1-8b"
        self.client = Cerebras(api_key=self.api_key)
    
    def _init_openai(self, api_key: Optional[str], model: Optional[str]):
        """Initialize OpenAI client."""
        if not OPENAI_AVAILABLE:
            raise ValueError("OpenAI SDK not available. Install with: pip install openai")
        
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY or pass api_key parameter.")
        
        self.model = model or "gpt-3.5-turbo"
        self.client = OpenAI(api_key=self.api_key)
    
    def chat(self, prompt: str, max_tokens: int = 2048) -> str:
        """
        Send a prompt to the LLM and get a response.
        
        Args:
            prompt: The prompt to send to the LLM
            max_tokens: Maximum tokens in response
            
        Returns:
            LLM response as string
        """
        try:
            if self.provider == 'cerebras':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=self.temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
            
            elif self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=self.temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
            
        except Exception as e:
            raise ValueError(f"{self.provider.title()} API error: {str(e)}")
    
    def analyze(self, context: str, instruction: str, max_tokens: int = 2048) -> str:
        """
        Analyze context with custom instructions.
        
        Args:
            context: The data/content to analyze
            instruction: What you want the LLM to do with the context
            max_tokens: Maximum tokens in response
            
        Returns:
            Analysis result as string
        """
        prompt = f"""
{instruction}

Context:
{context}

Analysis:
"""
        return self.chat(prompt, max_tokens)
    
    def get_info(self) -> dict:
        """Get information about the current LLM configuration."""
        return {
            "provider": self.provider,
            "model": self.model,
            "temperature": self.temperature,
            "available": True
        }


# Simple function interface
def call_llm(prompt: str, 
             provider: Optional[str] = None, 
             model: Optional[str] = None, 
             temperature: float = 0.3,
             max_tokens: int = 2048) -> str:
    """
    Simple function to call LLM with a prompt.
    
    Args:
        prompt: The prompt to send
        provider: LLM provider ('cerebras', 'openai', or None for auto)
        model: Model name (optional)
        temperature: Response randomness
        max_tokens: Maximum response length
        
    Returns:
        LLM response as string
    """
    llm = SimpleLLM(provider=provider, model=model, temperature=temperature)
    return llm.chat(prompt, max_tokens)


def analyze_with_llm(context: str, 
                     instruction: str,
                     provider: Optional[str] = None,
                     model: Optional[str] = None,
                     temperature: float = 0.3,
                     max_tokens: int = 2048) -> str:
    """
    Simple function to analyze context with custom instructions.
    
    Args:
        context: Data to analyze
        instruction: What to do with the data
        provider: LLM provider ('cerebras', 'openai', or None for auto)
        model: Model name (optional)
        temperature: Response randomness
        max_tokens: Maximum response length
        
    Returns:
        Analysis result as string
    """
    llm = SimpleLLM(provider=provider, model=model, temperature=temperature)
    return llm.analyze(context, instruction, max_tokens)


# Example usage
if __name__ == "__main__":
    print("🤖 Testing Simple LLM Interface")
    print("=" * 40)
    
    try:
        # Test initialization
        llm = SimpleLLM()
        info = llm.get_info()
        print(f"✅ LLM initialized: {info['provider'].title()} ({info['model']})")
        
        # Test simple chat
        print("\n💬 Testing chat...")
        response = llm.chat("What is artificial intelligence in one sentence?")
        print(f"Response: {response}")
        
        # Test analysis
        print("\n📊 Testing analysis...")
        sample_data = """
        Search Results:
        - Article: "Tech CEO announces AI breakthrough"
        - Snippet: "Revolutionary advances in machine learning announced"
        - Source: TechNews.com
        """
        
        analysis = llm.analyze(
            context=sample_data,
            instruction="Summarize the key findings from these search results in 2-3 sentences."
        )
        print(f"Analysis: {analysis}")
        
        # Test function interface
        print("\n🔧 Testing function interface...")
        quick_response = call_llm("List 3 benefits of AI in one line each.")
        print(f"Quick response: {quick_response}")
        
        print("\n✅ All tests passed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure you have CEREBRAS_KEY or OPENAI_API_KEY set in your .env file")
