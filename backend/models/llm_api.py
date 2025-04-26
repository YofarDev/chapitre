import logging

logger = logging.getLogger(__name__)


class LLM_API:
    """Wrapper class for LLM API configuration.

    Attributes:
        model: Name of the LLM model to use
        api_key: API key for the service
        url: Base URL for API (for non-Gemini providers)
        is_gemini: Whether this is a Google Gemini API
        delay_ms: Minimum delay between API calls in milliseconds
    """

    def __init__(
        self,
        model: str,
        api_key: str,
        url: str = "",
        delay_ms: float = 0,
    ):
        """Initialize LLM API configuration.

        Args:
            model: Name of the LLM model
            api_key: Valid API key for the service
            url: Base URL for API
            delay_ms: Minimum delay between API calls in milliseconds

        Raises:
            ValueError: If required parameters are missing or invalid
        """
        if not model:
            raise ValueError("Model name is required")
        if not api_key:
            raise ValueError("API key is required")
        # URL is now always required as it determines the endpoint
        if not url:
            raise ValueError("URL is required for all LLM APIs")

        self.model = model
        self.api_key = api_key
        self.url = url
        self.delay_ms = max(0, delay_ms)  # Ensure non-negative

        logger.debug(
            f"Initialized LLM_API: model={model[:10]}..., "
            f"url={url}, delay_ms={delay_ms}"
        )
