import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("OPENROUTER_API_KEY")
base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
model = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")

headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://scope3track.demo",
    "X-Title": "Scope3Track Demo"
}

print(f"Testing direct call to {base_url}/chat/completions with model {model}...")
try:
    res = httpx.post(
        f"{base_url}/chat/completions",
        headers=headers,
        json={
            "model": model,
            "messages": [{"role": "user", "content": 'Respond in valid JSON only: {"ping": "pong"}'}],
            "temperature": 0.1
        },
        timeout=45.0
    )
    print("Status Code:", res.status_code)
    print("Response Headers:", dict(res.headers))
    print("Response Body:", res.text[:500])
except Exception as e:
    print("Exception:", type(e), e)
