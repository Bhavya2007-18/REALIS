
import sys
import os


root = os.path.dirname(os.path.abspath(__file__))
if root not in sys.path:
    sys.path.insert(0, root)


def check_dependencies():
    missing = []
    try:
        import fastapi
    except ImportError:
        missing.append("fastapi")
    try:
        import uvicorn
    except ImportError:
        missing.append("uvicorn")
    try:
        import cv2
    except ImportError:
        missing.append("opencv-python")
    try:
        import numpy
    except ImportError:
        missing.append("numpy")
    try:
        import pydantic
    except ImportError:
        missing.append("pydantic")
    try:
        import multipart
    except ImportError:
        missing.append("python-multipart")

    if missing:
        print("=" * 60)
        print("  Missing Python dependencies")
        print("  Run:  pip install -r requirements.txt")
        print("=" * 60)
        sys.exit(1)


check_dependencies()

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("  REALIS Physics + Sketch-AI API Server")
    print("  Listening on http://localhost:8000")
    print("  API docs:  http://localhost:8000/docs")
    print("  Health:    http://localhost:8000/health")
    print("  Sketch AI: http://localhost:8000/api/sketch/process")
    print("=" * 60)
    uvicorn.run("tools.server:app", host="0.0.0.0", port=8000, reload=True)
