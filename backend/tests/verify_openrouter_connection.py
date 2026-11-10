"""Verify OpenRouter Connection and Model Availability."""
import json
import os
import sys
from pathlib import Path
import httpx
from dotenv import load_dotenv

# Load root .env securely
ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
API_KEY = os.getenv("OPENROUTER_API_KEY", "")
CONFIGURED_MODEL = os.getenv("OPENROUTER_MODEL", "")

if not API_KEY:
    print("[ERROR] OPENROUTER_API_KEY is missing from .env", file=sys.stderr)
    sys.exit(1)

print(f"[CONFIG] OpenRouter Base URL: {BASE_URL}")
print(f"[CONFIG] Configured Model: {CONFIGURED_MODEL}")
print(f"[CONFIG] API Key Available: {'YES' if API_KEY else 'NO'} (Length: {len(API_KEY)})")

# Test A: Model Listing
print("\n--- Test A: Model Listing ---")
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

with httpx.Client(timeout=30) as client:
    list_url = f"{BASE_URL}/models"
    print(f"Requesting: GET {list_url} ...")
    resp_list = client.get(list_url, headers=headers)
    print(f"HTTP Status: {resp_list.status_code}")
    
    if resp_list.status_code == 200:
        models_data = resp_list.json().get("data", [])
        model_ids = [m.get("id") for m in models_data if isinstance(m, dict)]
        print(f"Total models returned by OpenRouter: {len(model_ids)}")
        
        # Check exact model
        matched_exact = CONFIGURED_MODEL in model_ids
        print(f"Configured model '{CONFIGURED_MODEL}' listed exactly: {matched_exact}")
        
        # If not exact match, check prefix / base model
        base_id = CONFIGURED_MODEL.split(":")[0]
        matching_variants = [m for m in model_ids if base_id in m]
        print(f"Matching variants for '{base_id}': {matching_variants[:5]}")
    else:
        print(f"Model listing failed: {resp_list.text[:300]}")

# Test B: Live Chat Completion
print("\n--- Test B: Live Chat Completion ---")
chat_payload = {
    "model": CONFIGURED_MODEL,
    "messages": [
        {"role": "system", "content": "You are a test agent. Return valid JSON only."},
        {"role": "user", "content": "Return JSON with a single key 'status' set to 'ok' and 'synthetic_timestamp' set to '2026-11-08'."}
    ],
    "response_format": {"type": "json_object"},
    "max_tokens": 1000
}

with httpx.Client(timeout=45) as client:
    chat_url = f"{BASE_URL}/chat/completions"
    print(f"Requesting: POST {chat_url} with model '{CONFIGURED_MODEL}' ...")
    resp_chat = client.post(chat_url, headers=headers, json=chat_payload)
    print(f"HTTP Status: {resp_chat.status_code}")
    
    if resp_chat.status_code == 200:
        chat_data = resp_chat.json()
        returned_model = chat_data.get("model")
        choices = chat_data.get("choices", [])
        usage = chat_data.get("usage", {})
        
        finish_reason = choices[0].get("finish_reason") if choices else None
        content = choices[0].get("message", {}).get("content") if choices else None
        
        print(f"Returned Model Identifier: {returned_model}")
        print(f"Finish Reason: {finish_reason}")
        print(f"Token Usage: {usage}")
        print(f"Raw Content: {content}")
        
        try:
            parsed = json.loads(content)
            print(f"JSON Parsed Successfully: {parsed}")
            print("\n[SUCCESS] Live OpenRouter connection and chat completion verified!")
        except Exception as e:
            print(f"[WARNING] Content was not valid JSON: {e}")
    else:
        print(f"[ERROR] Chat completion failed with status {resp_chat.status_code}: {resp_chat.text[:400]}")
