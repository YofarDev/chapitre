import logging
import time

from models.llm_api import LLM_API
from openai import OpenAI

logger = logging.getLogger(__name__)

last_used: float = 0.0


def prompt_llm(
    system_prompt: str, conversation_history: list, api: LLM_API
) -> str:
    """Main entry point for LLM prompting with rate limiting and conversation history.

    Args:
        system_prompt: System instructions/context for the LLM
        conversation_history: List of message objects representing the conversation
        api: Configured LLM_API instance

    Returns:
        str: Raw LLM response (expected to be JSON)

    Note:
        Implements rate limiting based on api.delay_ms
        Routes to appropriate provider (Gemini/OpenAI)
    """
    global last_used
    current_time = time.time() * 1000
    if last_used > 0 and api.delay_ms > 0:
        time_since_last_call = current_time - last_used
        if time_since_last_call < api.delay_ms:
            time.sleep((api.delay_ms - time_since_last_call) / 1000)
    last_used = current_time
    return prompt_llm_openai_structure(system_prompt, conversation_history, api)


def prompt_llm_openai_structure(system_prompt: str, conversation_history: list, api: LLM_API) -> str:
    """Execute prompt using OpenAI-compatible API with conversation history.

    Args:
        system_prompt: System instructions/context
        conversation_history: List of message objects
        api: Configured LLM_API instance

    Returns:
        str: Raw response from OpenAI API

    Note:
        Supports any OpenAI-compatible API endpoint
    """
    try:
        logger.debug(f"Calling OpenAI API with model: {api.model}")
        client = OpenAI(api_key=api.api_key, base_url=api.url)

        messages = [{"role": "system", "content": system_prompt}] + conversation_history
        response = client.chat.completions.create(
            model=api.model,
            messages=messages,
            stream=True,
            max_tokens=8192,
        )
        full_response = ""
        for chunk in response:
            if chunk.choices[0].delta.content:
                full_response += chunk.choices[0].delta.content
        logger.debug(f"OpenAI response received (length: {len(full_response)})")
        return full_response
    except Exception as e:
        logger.error(f"OpenAI API call failed: {str(e)}")
        raise Exception(f"OpenAI API error: {str(e)}")
