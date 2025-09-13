"""
LLM Package

Simple interface for Cerebras and OpenAI LLMs.
Users provide their own prompts and get responses back.
"""

from .simple_llm import SimpleLLM, call_llm, analyze_with_llm

__all__ = ['SimpleLLM', 'call_llm', 'analyze_with_llm']
