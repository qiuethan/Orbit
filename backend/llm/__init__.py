"""
LLM Package

Interface for Cerebras and OpenAI LLMs.
Users provide their own prompts and get responses back.
Now includes structured output support with schema validation.
"""

from .llm import LLM, call_llm, analyze_with_llm, structured_analyze_person

__all__ = ['LLM', 'call_llm', 'analyze_with_llm', 'structured_analyze_person']
