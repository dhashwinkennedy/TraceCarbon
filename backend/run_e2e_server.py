"""Server runner dedicated to isolated E2E testing against scope3track_e2e_test."""
import os
import sys
from pathlib import Path

# Force database name to scope3track_e2e_test
os.environ["MONGODB_DB"] = "scope3track_e2e_test"

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn
from app.main import app, settings

if __name__ == "__main__":
    print(f"Starting E2E server on port 8000 connected to DB: {settings.mongodb_db}...")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
