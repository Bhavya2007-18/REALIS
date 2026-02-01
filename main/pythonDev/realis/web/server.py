from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import glob
import json
import sys
# Add parent directory to path to allow importing from root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from pydantic import BaseModel
from typing import Dict, List, Any
from interface.runner import run_simulation

app = FastAPI()

# Enable CORS for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Export Directory
EXPORT_DIR = os.path.join(os.getcwd(), "exports")

@app.get("/api/runs")
def list_runs():
    """List all available JSON export files"""
    files = glob.glob(os.path.join(EXPORT_DIR, "*.json"))
    # Sort by modification time (newest first)
    files.sort(key=os.path.getmtime, reverse=True)
    
    runs = []
    for f in files:
        basename = os.path.basename(f)
        try:
           with open(f, 'r') as file_handle:
               content = json.load(file_handle)
               runs.append({
                   "id": basename,
                   "metadata": content.get("metadata", {})
               })
        except Exception as e:
            print(f"Failed to read {basename}: {e}")
            
    return runs

@app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    """Serve specific run data"""
    path = os.path.join(EXPORT_DIR, run_id)
    if not os.path.exists(path):
        return {"error": "Run not found"}
        
    with open(path, 'r') as f:
        return json.load(f)

# API Extension
class SimulationConfig(BaseModel):
    model: str
    params: Dict[str, float]
    state0: List[float]
    dt: float = 0.01
    steps: int = 1000

@app.post("/api/simulate")
def trigger_simulation(config: SimulationConfig):
    """Run a new simulation and return the file ID."""
    print(f"Running simulation: {config.model}")
    try:
        filepath = run_simulation(config.dict())
        basename = os.path.basename(filepath)
        return {"id": basename, "status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e), "status": "failed"}

# Mount static files (Frontend)
static_dir = os.path.join(os.getcwd(), "web", "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
