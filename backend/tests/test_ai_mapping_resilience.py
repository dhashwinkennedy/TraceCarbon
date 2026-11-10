import pytest
import httpx
import json
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException

from backend.app.main import (
    extract_json_from_text,
    openrouter_json,
    ai_map,
)

# -----------------------------------------------------------------------------
# Unit Tests for JSON Extraction
# -----------------------------------------------------------------------------
def test_extract_json_direct():
    data = {"mappings": [{"activity_id": "electricity", "column": "Electricity_kWh"}]}
    assert extract_json_from_text(json.dumps(data)) == data

def test_extract_json_markdown_code_fence():
    raw = """Here is the mapping you requested:
```json
{
  "mappings": [
    {"activity_id": "electricity", "column": "Electricity_Consumption_kWh", "confidence": 0.95, "reason": "exact match"}
  ]
}
```
Hope this is helpful!"""
    res = extract_json_from_text(raw)
    assert "mappings" in res
    assert res["mappings"][0]["activity_id"] == "electricity"
    assert res["mappings"][0]["column"] == "Electricity_Consumption_kWh"

def test_extract_json_outermost_object_with_preamble():
    raw = """Thinking Process:
1. Examine columns
2. Map to required activities
{"mappings": [{"activity_id": "diesel", "column": "Diesel_Litres"}]}
Note: Unmapped columns are left null."""
    res = extract_json_from_text(raw)
    assert res["mappings"][0]["activity_id"] == "diesel"

def test_extract_json_empty_raises_value_error():
    with pytest.raises(ValueError, match="empty"):
        extract_json_from_text("")

def test_extract_json_malformed_raises_value_error():
    with pytest.raises(ValueError, match="Could not extract valid JSON"):
        extract_json_from_text("This is plain text with no json inside.")

# -----------------------------------------------------------------------------
# Simulated OpenRouter HTTP Status Code Tests (429, 400, 401, 402, 503, 504)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_simulated_429_rate_limit_with_retries():
    """Verify 429 triggers bounded retries with backoff and raises HTTP 429 with descriptive error."""
    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_resp.headers = {"retry-after": "0.01", "x-request-id": "req-429-test"}
    mock_resp.json.return_value = {"error": {"message": "Rate limit exceeded: 10 requests per minute", "code": 429}}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            with pytest.raises(HTTPException) as exc_info:
                await openrouter_json("test prompt")
            
            assert exc_info.value.status_code == 429
            assert "rate limit" in exc_info.value.detail.lower()
            assert "10 requests per minute" in exc_info.value.detail
            # Should have retried up to max_retries (3 calls total)
            assert mock_post.call_count == 3
            assert mock_sleep.call_count == 2

@pytest.mark.asyncio
async def test_simulated_400_invalid_parameter_no_retries():
    """Verify 400 fails immediately without retrying client error."""
    mock_resp = MagicMock()
    mock_resp.status_code = 400
    mock_resp.headers = {}
    mock_resp.json.return_value = {"error": {"message": "Provider does not support response_format", "code": 400}}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        with pytest.raises(HTTPException) as exc_info:
            await openrouter_json("test prompt")

        assert exc_info.value.status_code == 400
        assert "rejected request parameters" in exc_info.value.detail.lower()
        assert "does not support response_format" in exc_info.value.detail
        # Non-retryable: exactly 1 call
        assert mock_post.call_count == 1

@pytest.mark.asyncio
async def test_simulated_401_authentication_failure_no_retries():
    """Verify 401 fails immediately with authentication guidance."""
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.headers = {}
    mock_resp.json.return_value = {"error": {"message": "Invalid API key", "code": 401}}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        with pytest.raises(HTTPException) as exc_info:
            await openrouter_json("test prompt")

        assert exc_info.value.status_code == 401
        assert "authentication failed" in exc_info.value.detail.lower()
        assert mock_post.call_count == 1

@pytest.mark.asyncio
async def test_simulated_402_payment_required_no_retries():
    """Verify 402 fails immediately with credit/payment guidance."""
    mock_resp = MagicMock()
    mock_resp.status_code = 402
    mock_resp.headers = {}
    mock_resp.json.return_value = {"error": {"message": "Insufficient credits", "code": 402}}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        with pytest.raises(HTTPException) as exc_info:
            await openrouter_json("test prompt")

        assert exc_info.value.status_code == 402
        assert "credits or payment required" in exc_info.value.detail.lower()
        assert mock_post.call_count == 1

@pytest.mark.asyncio
async def test_simulated_503_provider_unavailable_with_retries():
    """Verify 503 triggers retries with exponential backoff and returns 503."""
    mock_resp = MagicMock()
    mock_resp.status_code = 503
    mock_resp.headers = {}
    mock_resp.json.return_value = {"error": {"message": "Upstream provider overloaded", "code": 503, "metadata": {"provider_name": "Nvidia"}}}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            with pytest.raises(HTTPException) as exc_info:
                await openrouter_json("test prompt")

            assert exc_info.value.status_code == 503
            assert "temporarily unavailable" in exc_info.value.detail.lower()
            assert "Nvidia" in exc_info.value.detail
            assert mock_post.call_count == 3
            assert mock_sleep.call_count == 2

@pytest.mark.asyncio
async def test_simulated_timeout_with_retries():
    """Verify timeout triggers retries before raising HTTP 504."""
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.TimeoutException("Connection timed out")
        with patch("asyncio.sleep", new_callable=AsyncMock):
            with pytest.raises(HTTPException) as exc_info:
                await openrouter_json("test prompt")

            assert exc_info.value.status_code == 504
            assert "timed out" in exc_info.value.detail.lower()
            assert mock_post.call_count == 3
