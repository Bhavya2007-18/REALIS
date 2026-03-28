

import sys
import os


root = os.path.dirname(os.path.abspath(__file__))
if root not in sys.path:
    sys.path.insert(0, root)

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("  REALIS Physics + Sketch-AI API Server")
    print("  Listening on http://localhost:8000")
    print("  API docs:  http://localhost:8000/docs")
    print("  Sketch AI: http://localhost:8000/api/sketch/process")
    print("=" * 60)
    uvicorn.run("tools.server:app", host="0.0.0.0", port=8000, reload=True)